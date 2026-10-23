"use client";
import { Suspense, useEffect, useMemo, useState, useDeferredValue } from "react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { products as starters, stores as starterStores, rankedOffers, categories, type Product, type Retailer } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";

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

export default function GearPage() {
  return (
    <Suspense>
      <Gear />
    </Suspense>
  );
}

function Gear() {
  const search = useSearchParams();
  const [data, setData] = useState<CatalogData>(initial),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All gear"),
    [sort, setSort] = useState("featured"),
    [brands, setBrands] = useState<string[]>([]),
    [storeFilter, setStoreFilter] = useState("all"),
    [stockOnly, setStockOnly] = useState(false),
    [comparisonOnly, setComparisonOnly] = useState(false),
    [maxPrice, setMaxPrice] = useState(""),
    [brandSearch, setBrandSearch] = useState(""),
    [page, setPage] = useState(1),
    [filterOpen, setFilterOpen] = useState(false),
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

  // Follow the URL every time it changes, so the top menu (Helmets -> Jackets) switches category without a reload.
  useEffect(() => {
    const cat = search.get("category") ?? "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL is the source of truth for these filters
    setCategory(categories.includes(cat) ? cat : "All gear");
    setQuery(search.get("q") ?? "");
    setBrands(search.get("brand") ? [search.get("brand")!] : []);
    setStoreFilter(search.get("store") ?? "all");
  }, [search]);

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
        <Button variant="link" size="sm" onClick={reset}>
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Toaster position="bottom-right" />
      <main className="wrap">
            <section className="hero hero-small">
              <h1>All gear</h1>
              <p>
                {data.products.length.toLocaleString("en-IN")} products from {storesWithProducts.length} Indian stores, checked every night.
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
                  {shown.map((p) => (
                    <ProductCard key={p.id} p={p} />
                  ))}
                </div>

                {!loading && !visible.length && (
                  <div className="empty">
                    <h2>Nothing matches that</h2>
                    <p>Try a shorter search or remove a filter.</p>
                    <Button variant="outline" size="lg" onClick={reset}>
                      Clear search and filters
                    </Button>
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
      </main>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sheet">
          <DialogTitle>Filters</DialogTitle>
          <DialogDescription className="sr-only">Narrow products by store, budget and brand.</DialogDescription>
          {filters}
          <Button size="lg" onClick={() => setFilterOpen(false)}>
            Show {visible.length.toLocaleString("en-IN")} products
          </Button>
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
            <Button size="lg" className="w-full" disabled={busy}>
              Save retailer
            </Button>
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
            <Button size="lg" disabled={busy || !importStore || importStore === "choose" || !feedText.trim()} onClick={() => void importProducts()}>
              Import offers
            </Button>
            <Button variant="outline" size="lg" disabled={busy || !data.stores.find((s) => s.id === importStore)?.feedUrl} onClick={() => void syncFeed()}>
              Refresh connected feed
            </Button>
            <Button asChild variant="link" size="sm"><a href="/feed-example.json" download>
              Feed example
            </a></Button>
            <Button variant="link" size="sm" type="button" onClick={askAdminToken}>
              Admin token
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
