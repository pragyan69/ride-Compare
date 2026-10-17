import { rankedOffers, type Product } from "@/lib/catalog";

export const pieces = ["Helmet", "Jacket", "Gloves", "Pants", "Boots"] as const;
export type Piece = (typeof pieces)[number];

export const ridingStyles = [
  { id: "city", label: "City" },
  { id: "touring", label: "Touring" },
  { id: "track", label: "Track / sport" },
  { id: "offroad", label: "Off-road" },
] as const;
export type RidingStyle = (typeof ridingStyles)[number]["id"];

export const kitVariants = [
  { id: "balance", label: "Best balance" },
  { id: "safety", label: "Safety first" },
  { id: "lowest", label: "Lowest total" },
] as const;
export type KitVariant = (typeof kitVariants)[number]["id"];

/** What the browser gets for one product. `mentions` are safety words found verbatim in the listing text. */
export type KitItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  variant: string;
  image: string;
  price: number;
  storeName: string;
  inStock: boolean | null;
  mentions: string[];
};
export type Alternative = KitItem & { relation: "cheaper" | "similar" | "pricier" };
export type KitPick = { piece: Piece; allocation: number; item: KitItem; overSlice: boolean; alternatives: Alternative[] };
export type Kit = { id: KitVariant; label: string; total: number; overBy: number; picks: KitPick[] };
export type BuildResult = {
  budget: number;
  style: RidingStyle;
  minimum: number;
  tooLow: boolean;
  cheapest: { piece: Piece; price: number }[];
  kits: Kit[];
};

type Candidate = KitItem & { text: string; model: string; styles: RidingStyle[] };
export type Pools = Record<Piece, Candidate[]>;

const categoryOf: Record<Piece, string> = { Helmet: "Helmets", Jacket: "Jackets", Gloves: "Gloves", Pants: "Pants", Boots: "Boots" };

// Spares, care products, rain shells and bike parts that stores file under gear categories.
const notGear =
  /\b(spare|cheek ?pads?|cleaner|sanitizer|detailer|care|hanger|organi[sz]er|visors?|pinlock|covers?|pockets?|rain\w*|over ?boots?|keyfob|key ?fob|bar boot|boot guards?|knob|replacement|liners?|spoiler|bags?|lens|stickers?|decals?|mounts?|chin ?mount|clamp|intercom|bluetooth|communication|communicator|headset|winter jacket|bomber|lacing|insoles?|sliders?|buckles?|straps?|kit|clips?|vents?|padding|pads?|balaclava|socks?|wax|polish|spray|hooks?|stand|lock|camera|hump|tear.?offs?|mirror|ratchet|zippers?|hydration|bladder|inserts?|underwear|base ?layer|mid.?layer|fleece|puffer|warm|thermo\w*|thermal|dryarn|x body|armou?r set|anti.?fog|fog.?free|kids?|junior|youth)\b/i;

// "... for Shockwave/Neo Helmets" style names are parts sold for a helmet, not helmets.
const partFor = /\bfor\b.*\b(helmets?|jackets?|boots?)\b/i;

const styleWords: Record<RidingStyle, RegExp> = {
  touring: /touring|adventure|waterproof|\bwp\b|all.?season|textile/i,
  track: /race|track|sport|leather|racing/i,
  city: /urban|city|mesh|street|commuter/i,
  offroad: /off.?road|motocross|\bmx\b|enduro|dirt|adventure/i,
};

// Matched literally against name + variant. Case-sensitive where the short form is also a common word.
const safetyWords: [string, RegExp][] = [
  ["ECE 22.06", /\bECE\s*(?:R\s*)?22[.\s]?06\b/i],
  ["ECE", /\bECE\b/i],
  ["22.06", /\b22\.06\b/],
  ["DOT", /\bDOT\b/],
  ["ISI", /\bISI\b/],
  ["SHARP", /\bSHARP\b/],
  ["CE", /\bCE\b/],
  ["Level 2", /\blevel[\s-]?2\b/i],
];

const knownBrands = new Set(
  [
    "Alpinestars", "Dainese", "AGV", "Shoei", "Arai", "HJC", "LS2", "Shark", "Airoh", "KYT", "MT Helmets", "SMK", "Axor", "Rynox",
    "ViaTerra", "Raida", "DSG", "RS Taichi", "Spidi", "Ixon", "Furygan", "Acerbis", "Rev'it", "Held", "Scorpion", "Bell", "Nolan",
    "X-Lite", "Tarmac", "Korda", "Solace", "Reise", "Reise x Spidi", "Steelbird", "Studds", "Vega", "TVS Racing",
  ].map((b) => b.toLowerCase()),
);

const weights: Record<RidingStyle, Record<Piece, number>> = {
  city: { Helmet: 0.4, Jacket: 0.3, Gloves: 0.1, Pants: 0.1, Boots: 0.1 },
  touring: { Helmet: 0.32, Jacket: 0.3, Gloves: 0.09, Pants: 0.17, Boots: 0.12 },
  track: { Helmet: 0.36, Jacket: 0.26, Gloves: 0.13, Pants: 0.1, Boots: 0.15 },
  offroad: { Helmet: 0.3, Jacket: 0.2, Gloves: 0.1, Pants: 0.15, Boots: 0.25 },
};

export function safetyMentions(text: string) {
  const found: string[] = [];
  for (const [label, re] of safetyWords) {
    if (!re.test(text)) continue;
    if ((label === "ECE" || label === "22.06") && found.includes("ECE 22.06")) continue;
    found.push(label);
  }
  return found;
}

/** Gear we can recommend, cheapest first, one entry per model (colour and size variants collapse to the cheapest). */
export function buildPools(products: Product[]): Pools {
  const pools = Object.fromEntries(pieces.map((p) => [p, [] as Candidate[]])) as Pools;
  const seen = new Map<string, Candidate>();
  for (const p of products) {
    const piece = pieces.find((x) => categoryOf[x] === p.category);
    if (!piece || p.brand === "Unspecified" || !p.image || notGear.test(p.name) || partFor.test(p.name)) continue;
    const offer = rankedOffers(p).find((o) => o.inStock !== false);
    if (!offer) continue;
    const text = `${p.name} ${p.variant}`;
    const model = `${piece}|${p.brand}|${p.name.replace(/\s*[([].*$/, "")}`.toLowerCase();
    const prev = seen.get(model);
    if (prev && prev.price <= offer.price) continue;
    seen.set(model, {
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      variant: p.variant,
      image: p.image,
      price: offer.price,
      storeName: offer.storeName,
      inStock: offer.inStock,
      mentions: safetyMentions(text),
      text,
      model,
      styles: ridingStyles.map((s) => s.id).filter((s) => styleWords[s].test(text)),
    });
  }
  for (const c of seen.values()) pools[pieces.find((x) => categoryOf[x] === c.category)!].push(c);
  for (const piece of pieces) pools[piece].sort((a, b) => a.price - b.price);
  return pools;
}

function bonus(c: Candidate, style: RidingStyle, safetyWeight: number) {
  return (
    (c.styles.includes(style) ? 2.5 : 0) +
    (c.mentions.length ? 2 * safetyWeight : 0) +
    (knownBrands.has(c.brand.toLowerCase()) ? 1.5 : 0) +
    (c.inStock === true ? 1 : 0)
  );
}

function score(c: Candidate, target: number, style: RidingStyle, variant: KitVariant, usedBrands: Set<string>) {
  // Use most of the slice: within a slice, better gear usually costs more.
  return 10 * (c.price / target) + bonus(c, style, variant === "safety" ? 1.5 : 1) - (usedBrands.has(c.brand) ? 3 : 0);
}

const strip = (c: Candidate): KitItem => ({
  id: c.id,
  name: c.name,
  brand: c.brand,
  category: c.category,
  variant: c.variant,
  image: c.image,
  price: c.price,
  storeName: c.storeName,
  inStock: c.inStock,
  mentions: c.mentions,
});

function pickBest(pool: Candidate[], target: number, style: RidingStyle, variant: KitVariant, usedBrands: Set<string>) {
  let best: Candidate | undefined;
  let bestScore = -Infinity;
  for (const c of pool) {
    if (c.price > target) break; // pool is sorted by price
    const s = score(c, target, style, variant, usedBrands);
    if (s > bestScore) [best, bestScore] = [c, s];
  }
  return best;
}

function alternatives(pool: Candidate[], chosen: Candidate, style: RidingStyle): Alternative[] {
  const rank = (list: Candidate[]) => list.sort((a, b) => bonus(b, style, 1) - bonus(a, style, 1) || a.price - b.price)[0];
  const others = pool.filter((c) => c.model !== chosen.model);
  const cheaper = rank(others.filter((c) => c.price < chosen.price * 0.9 && c.price >= chosen.price * 0.4));
  const pricier = rank(others.filter((c) => c.price > chosen.price * 1.1 && c.price <= chosen.price * 1.8));
  const similar = others
    .filter((c) => c !== cheaper && c !== pricier && c.brand !== chosen.brand)
    .sort((a, b) => Math.abs(a.price - chosen.price) - Math.abs(b.price - chosen.price))[0];
  const out: Alternative[] = [];
  if (cheaper) out.push({ ...strip(cheaper), relation: "cheaper" });
  if (similar) out.push({ ...strip(similar), relation: "similar" });
  if (pricier) out.push({ ...strip(pricier), relation: "pricier" });
  return out;
}

function buildKit(pools: Pools, budget: number, style: RidingStyle, wanted: Piece[], variant: KitVariant): Kit {
  const w = { ...weights[style] };
  if (variant === "safety") {
    w.Helmet *= 1.45;
    w.Jacket *= 1.35;
  }
  // Biggest slice first, and money a piece leaves unused rolls into the pieces after it.
  const order = wanted.filter((p) => pools[p].length).sort((a, b) => w[b] - w[a]);
  // Lowest total plans around a bit over half the budget instead of the absolute cheapest listings.
  let remaining = variant === "lowest" ? budget * 0.55 : budget;
  let weightLeft = order.reduce((s, p) => s + w[p], 0);
  const usedBrands = new Set<string>();
  const picks: KitPick[] = [];
  for (const piece of order) {
    const allocation = Math.max(0, Math.round((remaining * w[piece]) / weightLeft));
    const pool = pools[piece];
    const best = pickBest(pool, allocation, style, variant, usedBrands) ?? pool[0];
    picks.push({ piece, allocation, item: strip(best), overSlice: best.price > allocation, alternatives: alternatives(pool, best, style) });
    usedBrands.add(best.brand);
    remaining -= best.price;
    weightLeft -= w[piece];
  }
  picks.sort((a, b) => pieces.indexOf(a.piece) - pieces.indexOf(b.piece));
  const total = picks.reduce((s, p) => s + p.item.price, 0);
  return { id: variant, label: kitVariants.find((v) => v.id === variant)!.label, total, overBy: Math.max(0, total - budget), picks };
}

export function buildKits(pools: Pools, budget: number, style: RidingStyle, wanted: Piece[]): BuildResult {
  const cheapest = wanted.filter((p) => pools[p].length).map((piece) => ({ piece, price: pools[piece][0].price }));
  const minimum = cheapest.reduce((s, c) => s + c.price, 0);
  return {
    budget,
    style,
    minimum,
    tooLow: budget < minimum,
    cheapest,
    kits: kitVariants.map((v) => buildKit(pools, budget, style, wanted, v.id)),
  };
}
