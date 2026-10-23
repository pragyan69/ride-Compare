"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ModelContext = { registerTool: (tool: unknown, options: { signal: AbortSignal }) => unknown };

/** Registers WebMCP tools so an in-browser assistant can drive the catalog. */
export function WebMcpTools() {
  const router = useRouter();
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context) return;
    const abort = new AbortController();
    const register = (tool: unknown) => { try { Promise.resolve(context.registerTool(tool, { signal: abort.signal })).catch(() => {}); } catch { /* unsupported */ } };
    register({
      name: "search_ridecompare_catalog",
      description: "Search the motorcycle gear catalog and open the matching results page. Filters: query, brand, category, bike.",
      inputSchema: { type: "object", properties: { query: { type: "string" }, brand: { type: "string" }, category: { type: "string" }, bike: { type: "string" } }, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input: unknown) => {
        if (!input || typeof input !== "object") throw Error("Expected search fields.");
        const i = input as Record<string, unknown>;
        if (Object.values(i).some((v) => typeof v !== "string")) throw Error("Search fields must be text.");
        const params = new URLSearchParams();
        for (const k of ["q", "brand", "category", "bike"]) { const v = i[k === "q" ? "query" : k]; if (typeof v === "string" && v.trim()) params.set(k, v.trim()); }
        const r = await fetch(`/api/search?${params.toString()}&size=10`);
        const data = (await r.json()) as { total?: number; rows?: { id: string; name: string; brand: string; min_price: number | null; store_count: number }[] };
        router.push(`/gear?${params.toString()}`);
        return { applied: true, total: data.total ?? 0, results: (data.rows || []).map((p) => ({ id: p.id, name: p.name, brand: p.brand, lowestPrice: p.min_price, stores: p.store_count, url: `${location.origin}/product/${p.id}` })) };
      },
    });
    register({
      name: "list_ridecompare_brands",
      description: "List brand names represented in the catalog with listing counts.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async () => { const r = await fetch("/api/brands"); return { brands: await r.json() }; },
    });
    return () => abort.abort();
  }, [router]);
  return null;
}
