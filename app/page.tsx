"use client";
import { useEffect, useMemo, useState, useDeferredValue } from "react";
import { Search, SlidersHorizontal, X, Package, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { products as starters, stores as starterStores, money, rankedOffers, checkedLabel, categories, type Product, type Retailer } from "@/lib/catalog";

type Brand = { name: string; count: number };
type CatalogData = { products: Product[]; stores: Retailer[]; summary?: { generatedAt: string } };

const initial: CatalogData = { products: starters, stores: starterStores };
const pageSize = 24;

function adminToken() {
  try {
    return localStorage.getItem("rc-admin") || "";
  } catch {
    return "";
  }
}
function askAdminToken() {
  const t = window.prompt("Admin token");
  if (t === null) return;
  try {
    localStorage.setItem("rc-admin", t.trim());
  } catch {}
}
async function api<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json", Authorization: `Bearer ${adminToken()}` } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(d.error || "Could not complete this request.");
  return d;
}

function ProductImage({ p }: { p: Product }) {
  const [broken, setBroken] = useState(false);
  return p.image && !broken ? (
    <img src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
  ) : (
    <Package className="image-missing" size={40} strokeWidth={1} aria-hidden />
  );
}

function Dropdown({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: { value: string; label: string }[] }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as string)}>
      <SelectTrigger aria-label={label} className="dropdown">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem value={i.value} key={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 40 40" aria-hidden>
        <rect width="40" height="40" rx="10" />
        <path d="m9 15 11-6 11 6-11 6zm0 6 11 6 11-6M9 27l11 6 11-6" />
      </svg>
      <span>
        ride<b>compare</b>
      </span>
    </span>
  );
}

export default function Home() {
  const [data, setData] = useState<CatalogData>(initial),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const [view, setView] = useState<"gear" | "brands">("gear"),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All gear"),
    [sort, setSort] = useState("featured"),
    [brands, setBrands] = useState<string[]>([]),
    [storeFilter, setStoreFilter] = useState("all"),
    [stockOnly, setStockOnly] = useState(false),
    [comparisonOnly, setComparisonOnly] = useState(false),
    [maxPrice, setMaxPrice] = useState(""),
    [brandSearch, setBrandSearch] = useState(""),
    [directorySearch, setDirectorySearch] = useState(""),
    [page, setPage] = useState(1),
    [filterOpen, setFilterOpen] = useState(false),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [manage, setManage] = useState(false);
  const [retailerName, setRetailerName] = useState(""),
    [website, setWebsite] = useState(""),
    [feedUrl, setFeedUrl] = useState(""),
    [importStore, setImportStore] = useState(""),
    [feedText, setFeedText] = useState(""),
    [formError, setFormError] = useState("");
  const deferred = useDeferredValue(query);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const r = await fetch("/data/catalog.json");
      if (!r.ok) throw new Error("The catalog could not be loaded.");
      const snapshot: CatalogData = await r.json();
      try {
        const saved = await api<{ products: Product[]; stores: Retailer[] }>("/api/catalog");
        const map = new Map(snapshot.products.map((p) => [p.id, p]));
        for (const p of saved.products) {
          const current = map.get(p.id);
          if (current) {
            for (const o of p.offers) {
              const old = current.offers.findIndex((x) => x.storeId === o.storeId);
              if (old < 0) current.offers.push(o);
              else if (Date.parse(o.checkedAt) > Date.parse(current.offers[old].checkedAt)) current.offers[old] = o;
            }
          } else map.set(p.id, p);
        }
        snapshot.products = [...map.values()];
        const sm = new Map(snapshot.stores.map((s) => [s.id, s]));
        for (const s of saved.stores) sm.set(s.id, { ...sm.get(s.id), ...s });
        snapshot.stores = [...sm.values()];
      } catch {
        /* Imported offers are optional; the published catalog is enough to browse. */
      }
      setData(snapshot);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "The catalog could not be loaded.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the catalog once and follows the #admin hash
    void load();
    const openAdmin = () => setManage(location.hash === "#admin");
    openAdmin();
    window.addEventListener("hashchange", openAdmin);
    return () => window.removeEventListener("hashchange", openAdmin);
  }, []);

  const allBrands = useMemo(() => {
    const map = new Map<string, Brand>();
    for (const p of data.products) {
      if (p.brand === "Unspecified") continue;
      const b = map.get(p.brand) || { name: p.brand, count: 0 };
      b.count++;
      map.set(p.brand, b);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);
  const storesWithProducts = useMemo(() => {
    const ids = new Set(data.products.flatMap((p) => p.offers.map((o) => o.storeId)));
    return data.stores.filter((s) => ids.has(s.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);
  const visible = useMemo(() => {
    const q = deferred.toLowerCase().trim();
    const rows = data.products.filter(
      (p) =>
        (category === "All gear" || p.category === category) &&
        (!brands.length || brands.includes(p.brand)) &&
        (storeFilter === "all" || p.offers.some((o) => o.storeId === storeFilter)) &&
        (!stockOnly || p.offers.some((o) => o.inStock === true)) &&
        (!comparisonOnly || p.offers.length > 1) &&
        (!maxPrice || p.offers.some((o) => o.price <= Number(maxPrice))) &&
        (!q || `${p.name} ${p.brand} ${p.category} ${p.variant}`.toLowerCase().includes(q)),
    );
    if (sort === "low") rows.sort((a, b) => rankedOffers(a)[0].price - rankedOffers(b)[0].price);
    if (sort === "high") rows.sort((a, b) => rankedOffers(b)[0].price - rankedOffers(a)[0].price);
    if (sort === "stores") rows.sort((a, b) => b.offers.length - a.offers.length);
    return rows;
  }, [data, deferred, category, brands, storeFilter, stockOnly, comparisonOnly, maxPrice, sort]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- any filter change starts the results over
  useEffect(() => setPage(1), [deferred, category, brands, storeFilter, stockOnly, comparisonOnly, maxPrice, sort]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize)),
    currentPage = Math.min(page, totalPages),
    shown = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    selected = data.products.find((p) => p.id === selectedId),
    directory = allBrands.filter((b) => b.name.toLowerCase().includes(directorySearch.toLowerCase())),
    activeFilters = brands.length + (storeFilter !== "all" ? 1 : 0) + (stockOnly ? 1 : 0) + (comparisonOnly ? 1 : 0) + (maxPrice ? 1 : 0);

  function reset() {
    setQuery("");
    setBrands([]);
    setCategory("All gear");
    setStoreFilter("all");
    setStockOnly(false);
    setComparisonOnly(false);
    setMaxPrice("");
  }
  function selectBrand(b: string) {
    reset();
    setBrands([b]);
    setView("gear");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function movePage(p: number) {
    setPage(p);
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function closeManage(open: boolean) {
    setManage(open);
    if (!open && location.hash === "#admin") history.replaceState(null, "", location.pathname);
  }
  async function saveRetailer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const s = await api<Retailer>("/api/stores", { name: retailerName, website, feedUrl });
      setImportStore(s.id);
      setData((d) => ({ ...d, stores: [...d.stores, s] }));
      setRetailerName("");
      setWebsite("");
      setFeedUrl("");
      toast.success("Retailer saved. You can now import its product feed.");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save retailer.");
    } finally {
      setBusy(false);
    }
  }
  async function importProducts() {
    setBusy(true);
    setFormError("");
    try {
      const d = await api<{ imported: number }>("/api/import", { storeId: importStore, feed: JSON.parse(feedText) });
      toast.success(`${d.imported} offers imported.`);
      await load();
      setFeedText("");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not import offers.");
    } finally {
      setBusy(false);
    }
  }
  async function syncFeed() {
    setBusy(true);
    setFormError("");
    try {
      const d = await api<{ imported: number }>("/api/stores/sync", { storeId: importStore });
      toast.success(`${d.imported} offers updated.`);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Feed unavailable.");
    } finally {
      setBusy(false);
    }
  }

  const filters = (
    <div className="filters-body">
      <div className="filter-group">
        <h3>Store</h3>
        <Dropdown
          label="Filter by store"
          value={storeFilter}
          onChange={setStoreFilter}
          items={[{ value: "all", label: "All stores" }, ...storesWithProducts.map((s) => ({ value: s.id, label: s.name }))]}
        />
      </div>
      <div className="filter-group">
        <h3>Budget</h3>
        <label className="budget-input">
          <span>₹</span>
          <input
            aria-label="Maximum price in rupees"
            placeholder="Max price"
            inputMode="numeric"
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </label>
        <label className="check-row">
          <Checkbox checked={stockOnly} onCheckedChange={(v) => setStockOnly(v === true)} />
          In stock
        </label>
        <label className="check-row">
          <Checkbox checked={comparisonOnly} onCheckedChange={(v) => setComparisonOnly(v === true)} />
          Sold at 2+ stores
        </label>
      </div>
      <div className="filter-group">
        <h3>Brand</h3>
        <input className="brand-search" aria-label="Find a brand" placeholder="Find a brand" value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} />
        <div className="brand-list">
          {allBrands
            .filter((b) => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
            .map((b) => (
              <label className="check-row" key={b.name}>
                <Checkbox checked={brands.includes(b.name)} onCheckedChange={(v) => setBrands(v ? [...brands, b.name] : brands.filter((x) => x !== b.name))} />
                <span className="check-label">{b.name}</span>
                <span className="check-count">{b.count.toLocaleString("en-IN")}</span>
              </label>
            ))}
        </div>
      </div>
      {activeFilters > 0 && (
        <button className="link-button" onClick={reset}>
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <Toaster position="bottom-right" />
      <header className="site-header">
        <div className="wrap header-inner">
          <button
            className="logo-button"
            aria-label="RideCompare home"
            onClick={() => {
              reset();
              setView("gear");
            }}
          >
            <Logo />
          </button>
          <nav aria-label="Main">
            <button aria-current={view === "gear" ? "page" : undefined} onClick={() => setView("gear")}>
              Gear
            </button>
            <button aria-current={view === "brands" ? "page" : undefined} onClick={() => setView("brands")}>
              Brands
            </button>
          </nav>
        </div>
      </header>

      <main className="wrap">
        {view === "gear" ? (
          <>
            <section className="hero">
              <h1>Find motorcycle gear for less.</h1>
              <p>
                {data.products.length.toLocaleString("en-IN")} helmets, jackets, gloves and parts from {storesWithProducts.length} Indian stores, in one
                search.
              </p>
              <div className="search">
                <Search size={20} aria-hidden />
                <input aria-label="Search motorcycle gear" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a product, brand or category" />
                {query && (
                  <button aria-label="Clear search" onClick={() => setQuery("")}>
                    <X size={18} />
                  </button>
                )}
              </div>
            </section>

            <div className="categories" role="group" aria-label="Categories">
              {categories.map((c) => (
                <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </div>

            <div className="shop">
              <aside className="filters" aria-label="Filters">
                {filters}
              </aside>
              <section id="results" className="results" aria-busy={loading}>
                <div className="results-bar">
                  <p className="results-count">
                    <strong>{visible.length.toLocaleString("en-IN")}</strong> {visible.length === 1 ? "product" : "products"}
                    {category !== "All gear" && <> in {category}</>}
                  </p>
                  <button className="filters-toggle" onClick={() => setFilterOpen(true)}>
                    <SlidersHorizontal size={16} /> Filters{activeFilters > 0 && <span className="pill">{activeFilters}</span>}
                  </button>
                  <Dropdown
                    label="Sort products"
                    value={sort}
                    onChange={setSort}
                    items={[
                      { value: "featured", label: "Featured" },
                      { value: "low", label: "Price: low to high" },
                      { value: "high", label: "Price: high to low" },
                      { value: "stores", label: "Most stores" },
                    ]}
                  />
                </div>

                {brands.length > 0 && (
                  <div className="chips">
                    {brands.map((b) => (
                      <button key={b} onClick={() => setBrands(brands.filter((x) => x !== b))} aria-label={`Remove ${b}`}>
                        {b}
                        <X size={13} />
                      </button>
                    ))}
                  </div>
                )}

                {loadError && (
                  <div role="alert" className="notice">
                    {loadError} <button onClick={() => void load()}>Try again</button>
                  </div>
                )}

                <div className="grid">
                  {shown.map((p) => {
                    const offers = rankedOffers(p);
                    const o = offers[0];
                    return (
                      <button className="card" key={p.id} onClick={() => setSelectedId(p.id)}>
                        <span className="card-image">
                          <ProductImage p={p} />
                        </span>
                        <span className="card-body">
                          <span className="card-brand">{p.brand === "Unspecified" ? p.category : p.brand}</span>
                          <span className="card-name">{p.name}</span>
                          <span className="card-variant">{p.variant}</span>
                          <span className="card-price">
                            <strong>{money(o.price)}</strong>
                            {o.inStock === false && <em>Out of stock</em>}
                          </span>
                          <span className="card-store">{offers.length > 1 ? `Lowest of ${offers.length} stores` : o.storeName}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!loading && !visible.length && (
                  <div className="empty">
                    <h2>Nothing matches that</h2>
                    <p>Try a shorter search or remove a filter.</p>
                    <button className="secondary-button" onClick={reset}>
                      Clear search and filters
                    </button>
                  </div>
                )}

                {totalPages > 1 && (
                  <nav className="pager" aria-label="Pages">
                    <button aria-label="Previous page" disabled={currentPage === 1} onClick={() => movePage(currentPage - 1)}>
                      <ChevronLeft size={18} />
                    </button>
                    <span aria-live="polite">
                      Page {currentPage} of {totalPages.toLocaleString("en-IN")}
                    </span>
                    <button aria-label="Next page" disabled={currentPage === totalPages} onClick={() => movePage(currentPage + 1)}>
                      <ChevronRight size={18} />
                    </button>
                  </nav>
                )}
              </section>
            </div>
          </>
        ) : (
          <>
            <section className="hero hero-small">
              <h1>Brands</h1>
              <p>{allBrands.length.toLocaleString("en-IN")} brands across every store we cover.</p>
              <div className="search">
                <Search size={20} aria-hidden />
                <input aria-label="Search brands" value={directorySearch} onChange={(e) => setDirectorySearch(e.target.value)} placeholder="Search brands" />
              </div>
            </section>
            <ul className="brand-index">
              {directory.map((b) => (
                <li key={b.name}>
                  <button onClick={() => selectBrand(b.name)}>
                    <span>{b.name}</span>
                    <small>{b.count.toLocaleString("en-IN")}</small>
                  </button>
                </li>
              ))}
            </ul>
            {directory.length === 0 && (
              <div className="empty">
                <h2>No brand by that name</h2>
                <p>Check the spelling or try fewer letters.</p>
              </div>
            )}
          </>
        )}

        <footer className="site-footer">
          <Logo />
          <p>
            Prices are taken from each store&apos;s public listings{data.summary ? `, last updated ${checkedLabel(data.summary.generatedAt)}` : ""}. Shipping,
            coupons and bank offers aren&apos;t included, so confirm the final price at the store.
          </p>
        </footer>
      </main>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sheet">
          <DialogTitle>Filters</DialogTitle>
          <DialogDescription className="sr-only">Narrow products by store, budget and brand.</DialogDescription>
          {filters}
          <button className="primary-button" onClick={() => setFilterOpen(false)}>
            Show {visible.length.toLocaleString("en-IN")} products
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="product-dialog">
          {selected && (
            <>
              <div className="detail">
                <div className="detail-image">
                  <ProductImage p={selected} />
                </div>
                <div className="detail-text">
                  <span className="card-brand">{selected.brand === "Unspecified" ? selected.category : selected.brand}</span>
                  <DialogTitle className="detail-name">{selected.name}</DialogTitle>
                  <DialogDescription className="detail-variant">{selected.variant}</DialogDescription>
                </div>
              </div>
              <h3 className="offers-title">{selected.offers.length > 1 ? `${selected.offers.length} stores sell this` : "Where to buy"}</h3>
              <ol className="offers">
                {rankedOffers(selected).map((o, i) => (
                  <li key={o.storeId} className={i === 0 && selected.offers.length > 1 ? "lowest" : undefined}>
                    <div>
                      <strong>{o.storeName}</strong>
                      <span>
                        {o.inStock === true ? "In stock" : o.inStock === false ? "Out of stock" : "Check stock at store"}
                        {i === 0 && selected.offers.length > 1 && " · Lowest price"}
                      </span>
                    </div>
                    <b>{money(o.price)}</b>
                    <a className="primary-button" href={o.url} target="_blank" rel="noreferrer">
                      Go to store <ArrowUpRight size={16} />
                    </a>
                  </li>
                ))}
              </ol>
              <p className="fine-print">Price for the size and colour shown. Other sizes and colours can cost more or less.</p>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={manage} onOpenChange={closeManage}>
        <DialogContent className="admin-dialog">
          <DialogTitle>Connect a retailer</DialogTitle>
          <DialogDescription>Add a website, then import its product feed. Existing stores can receive more offers too.</DialogDescription>
          {formError && (
            <div className="notice" role="alert">
              {formError}
            </div>
          )}
          <form className="admin-form" onSubmit={saveRetailer}>
            <label>
              Store name
              <input required maxLength={60} value={retailerName} onChange={(e) => setRetailerName(e.target.value)} placeholder="Your retailer" />
            </label>
            <label>
              Website
              <input required type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://retailer.in" />
            </label>
            <label className="full">
              Public JSON feed URL (optional)
              <input type="url" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="https://retailer.in/ridecompare-feed.json" />
            </label>
            <button className="primary-button full" disabled={busy}>
              Save retailer
            </button>
          </form>
          <h3>Import product offers</h3>
          <Dropdown
            label="Retailer to import"
            value={importStore || "choose"}
            onChange={setImportStore}
            items={[{ value: "choose", label: "Choose a retailer" }, ...data.stores.map((s) => ({ value: s.id, label: s.name }))]}
          />
          <input
            type="file"
            aria-label="Upload a JSON feed"
            accept=".json,application/json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 1024 * 1024) {
                setFormError("Choose a file smaller than 1 MB.");
                return;
              }
              setFeedText(await f.text());
            }}
          />
          <textarea aria-label="Product feed JSON" value={feedText} onChange={(e) => setFeedText(e.target.value)} placeholder='{"currency":"INR","offers":[…]}' rows={6} />
          <div className="admin-actions">
            <button className="primary-button" disabled={busy || !importStore || importStore === "choose" || !feedText.trim()} onClick={() => void importProducts()}>
              Import offers
            </button>
            <button className="secondary-button" disabled={busy || !data.stores.find((s) => s.id === importStore)?.feedUrl} onClick={() => void syncFeed()}>
              Refresh connected feed
            </button>
            <a className="link-button" href="/feed-example.json" download>
              Feed example
            </a>
            <button type="button" className="link-button" onClick={askAdminToken}>
              Admin token
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
