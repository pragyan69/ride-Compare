"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, Crosshair, MapPin, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

const KEY = "gc_pin";
const VALID = /^[1-9]\d{5}$/;
const EVENT = "gc-pin";

/** The shopper's delivery pincode, kept in this browser only. Checkout uses it to prefill the address. */
export function readPin() {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
function savePin(pin: string) {
  try {
    localStorage.setItem(KEY, pin);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}
const subscribe = (fn: () => void) => {
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fn);
  };
};

/** "Delivering to 273001" under the logo, with a picker like Culture Circle's. India only: that's where we ship. */
export function DeliveryPin() {
  const pin = useSyncExternalStore(subscribe, readPin, () => "");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  // Town and state for the typed pincode, from India Post's public lookup. Keyed by pin so a stale answer never shows.
  const [place, setPlace] = useState<{ pin: string; text: string | null } | null>(null);
  useEffect(() => {
    if (!VALID.test(draft)) return;
    let live = true;
    fetch(`https://api.postalpincode.in/pincode/${draft}`)
      .then((r) => r.json())
      .then((data: unknown) => {
        const po = Array.isArray(data) ? (data[0] as { Status?: string; PostOffice?: { District?: string; State?: string }[] }) : undefined;
        const first = po?.Status === "Success" ? po.PostOffice?.[0] : undefined;
        if (live) setPlace({ pin: draft, text: first?.District && first.State ? `${first.District}, ${first.State}` : null });
      })
      .catch(() => live && setPlace({ pin: draft, text: null }));
    return () => {
      live = false;
    };
  }, [draft]);
  const found = place?.pin === draft ? place : null;
  const show = () => {
    setDraft(pin);
    setNote(null);
    setOpen(true);
  };

  const confirm = (value: string) => {
    if (!VALID.test(value)) {
      setNote("Enter a 6 digit Indian pincode.");
      return;
    }
    savePin(value);
    setOpen(false);
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setNote("This browser can't share your location. Type your pincode instead.");
      return;
    }
    setLocating(true);
    setNote(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`);
          const data: unknown = await r.json();
          const found = typeof data === "object" && data && "address" in data ? (data.address as { postcode?: unknown; country_code?: unknown }) : undefined;
          const code = typeof found?.postcode === "string" ? found.postcode.replace(/\s/g, "") : "";
          if (found?.country_code !== "in") setNote("Looks like you're outside India. We only deliver within India for now.");
          else if (VALID.test(code)) setDraft(code);
          else setNote("Couldn't find a pincode for your spot. Type it in instead.");
        } catch {
          setNote("Couldn't look up your location. Type your pincode instead.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setNote("Location access was blocked. Type your pincode instead.");
      },
      { timeout: 10000 },
    );
  };

  return (
    <>
      <button type="button" className="pin-btn" onClick={show}>
        <MapPin size={14} aria-hidden fill="currentColor" stroke="#fff" />
        {pin ? (
          <>
            <span>Delivering to</span> <b>{pin}</b>
          </>
        ) : (
          <span>Select delivery location</span>
        )}
        <ChevronDown size={14} aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="pin-dialog">
          <div className="pin-head">
            <span className="pin-icon" aria-hidden>
              <MapPin size={20} />
            </span>
            <div>
              <DialogTitle className="pin-title">Select delivery location</DialogTitle>
              <DialogDescription className="pin-sub">Free delivery anywhere in India</DialogDescription>
            </div>
          </div>
          <div className="pin-country" aria-label="Country: India">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <clipPath id="pin-flag"><circle cx="12" cy="12" r="12" /></clipPath>
              <g clipPath="url(#pin-flag)">
                <rect width="24" height="8" fill="#FF9933" />
                <rect y="8" width="24" height="8" fill="#fff" />
                <rect y="16" width="24" height="8" fill="#138808" />
                <circle cx="12" cy="12" r="2.6" fill="none" stroke="#000080" strokeWidth=".8" />
              </g>
            </svg>
            India
          </div>
          <form
            className="pin-form"
            onSubmit={(e) => {
              e.preventDefault();
              confirm(draft);
            }}
          >
            <label className="pin-input">
              <span className="sr-only">Pincode</span>
              <input
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setNote(null);
                }}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="6 digit pincode"
                autoFocus
              />
              {draft && (
                <button type="button" aria-label="Clear pincode" onClick={() => setDraft("")}>
                  <X size={18} aria-hidden />
                </button>
              )}
            </label>
            <button type="submit" className="pin-confirm" disabled={!VALID.test(draft)}>
              Confirm
            </button>
          </form>
          <p className="pin-place" aria-live="polite" data-tone={note ? "bad" : found?.text ? "ok" : undefined}>
            {note ??
              (VALID.test(draft) ? (
                found ? (
                  found.text ? (
                    <>
                      <Check size={15} aria-hidden /> {found.text}
                    </>
                  ) : (
                    "We couldn't find this pincode. Check the digits."
                  )
                ) : (
                  "Checking pincode…"
                )
              ) : (
                "We'll use this to show delivery details."
              ))}
          </p>
          <div className="pin-or" aria-hidden>
            <span>or</span>
          </div>
          <button type="button" className="pin-locate" onClick={locate} disabled={locating}>
            <Crosshair size={18} aria-hidden /> {locating ? "Finding you…" : "Use my current location"}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
