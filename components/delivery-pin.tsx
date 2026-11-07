"use client";
import { useState, useSyncExternalStore } from "react";
import { ChevronDown, Crosshair, MapPin, X } from "lucide-react";
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
          <DialogTitle className="pin-title">
            <MapPin size={24} aria-hidden /> Select delivery location
          </DialogTitle>
          <DialogDescription className="sr-only">Enter the pincode we should deliver to</DialogDescription>
          <div className="pin-country">
            <span aria-hidden>🇮🇳</span> India
            <small>We deliver free anywhere in India</small>
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
                onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="Enter pincode"
                autoFocus
              />
              {draft && (
                <button type="button" aria-label="Clear pincode" onClick={() => setDraft("")}>
                  <X size={20} aria-hidden />
                </button>
              )}
            </label>
            <button type="submit" className="pin-confirm">
              Confirm
            </button>
          </form>
          {note && <p className="pin-note">{note}</p>}
          <button type="button" className="pin-locate" onClick={locate} disabled={locating}>
            <Crosshair size={22} aria-hidden /> {locating ? "Finding you…" : "Use my current location"}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
