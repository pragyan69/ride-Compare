/** Fit model for riding jackets and pants: body measurements in, a per-zone
 * verdict and a recommended size out. Charts follow the common European
 * motorcycle-apparel grading; brands differ by a size at most, which the fit
 * selector (race / regular / relaxed) absorbs. All lengths are centimetres. */

export type Body = { height: number; weight: number; chest: number; waist: number; hips: number; shoulder: number; sleeve: number; inseam: number; thigh: number };
export type GarmentType = "jacket" | "pants";
export type FitCut = "race" | "regular" | "relaxed";
export type Garment = { type: GarmentType; size: string; cut: FitCut; length: "short" | "regular" | "long" };

export type ZoneStatus = "tight" | "snug" | "good" | "loose" | "baggy";
export type Zone = { key: string; label: string; body: number; garment: number; status: ZoneStatus; note: string };
export type GarmentDims = { chest: number; waist: number; hips: number; shoulder: number; sleeve: number; inseam: number; thigh: number };
export type FitResult = { zones: Zone[]; score: number; verdict: string; recommended: string; recommendedWhy: string; dims: GarmentDims };

export const BODY_FIELDS: { key: keyof Body; label: string; hint: string; unit: string; forType: GarmentType | "both" }[] = [
  { key: "height", label: "Height", hint: "Without shoes", unit: "cm", forType: "both" },
  { key: "weight", label: "Weight", hint: "Used only to estimate the rest", unit: "kg", forType: "both" },
  { key: "chest", label: "Chest", hint: "Around the fullest part, arms relaxed", unit: "cm", forType: "jacket" },
  { key: "waist", label: "Waist", hint: "Around the navel for jackets, where the pants sit for pants", unit: "cm", forType: "both" },
  { key: "shoulder", label: "Shoulder width", hint: "Bone to bone across the back", unit: "cm", forType: "jacket" },
  { key: "sleeve", label: "Arm length", hint: "Shoulder bone to wrist, arm slightly bent", unit: "cm", forType: "jacket" },
  { key: "hips", label: "Hips", hint: "Around the widest part", unit: "cm", forType: "pants" },
  { key: "thigh", label: "Thigh", hint: "Around the top of the thigh", unit: "cm", forType: "pants" },
  { key: "inseam", label: "Inseam", hint: "Crotch to floor, standing", unit: "cm", forType: "pants" },
];

type JacketRow = { size: string; eu: number; chest: [number, number]; waist: [number, number]; shoulder: number; sleeve: number };
export const JACKET_SIZES: JacketRow[] = [
  { size: "XS", eu: 44, chest: [86, 90], waist: [74, 78], shoulder: 42, sleeve: 61 },
  { size: "S", eu: 46, chest: [90, 94], waist: [78, 82], shoulder: 44, sleeve: 62.5 },
  { size: "M", eu: 48, chest: [94, 98], waist: [82, 86], shoulder: 46, sleeve: 64 },
  { size: "L", eu: 50, chest: [98, 102], waist: [86, 90], shoulder: 48, sleeve: 65.5 },
  { size: "XL", eu: 52, chest: [102, 106], waist: [90, 94], shoulder: 50, sleeve: 67 },
  { size: "2XL", eu: 54, chest: [106, 112], waist: [94, 100], shoulder: 52, sleeve: 68 },
  { size: "3XL", eu: 56, chest: [112, 118], waist: [100, 106], shoulder: 54, sleeve: 69 },
  { size: "4XL", eu: 58, chest: [118, 124], waist: [106, 112], shoulder: 56, sleeve: 70 },
  { size: "5XL", eu: 60, chest: [124, 130], waist: [112, 118], shoulder: 58, sleeve: 71 },
];

type PantsRow = { size: string; alpha: string; waist: [number, number]; hips: [number, number]; thigh: number };
export const PANTS_SIZES: PantsRow[] = [
  { size: "28", alpha: "XS", waist: [71, 74], hips: [88, 91], thigh: 54 },
  { size: "30", alpha: "S", waist: [76, 79], hips: [93, 96], thigh: 57 },
  { size: "32", alpha: "M", waist: [81, 84], hips: [98, 101], thigh: 60 },
  { size: "34", alpha: "L", waist: [86, 89], hips: [103, 106], thigh: 63 },
  { size: "36", alpha: "XL", waist: [91, 94], hips: [108, 111], thigh: 66 },
  { size: "38", alpha: "2XL", waist: [96, 99], hips: [113, 116], thigh: 69 },
  { size: "40", alpha: "3XL", waist: [101, 104], hips: [118, 121], thigh: 72 },
  { size: "42", alpha: "4XL", waist: [106, 109], hips: [123, 126], thigh: 75 },
  { size: "44", alpha: "5XL", waist: [111, 114], hips: [128, 131], thigh: 78 },
];
export const INSEAM: Record<Garment["length"], number> = { short: 76, regular: 81, long: 86 };
/** How much a cut moves the chart: race cuts run small, touring cuts run roomy. */
const CUT_EASE: Record<FitCut, number> = { race: -3, regular: 0, relaxed: 4 };
export const CUT_LABEL: Record<FitCut, string> = { race: "Race / Euro slim", regular: "Regular", relaxed: "Relaxed / touring" };

export function sizeOptions(type: GarmentType) {
  return type === "jacket" ? JACKET_SIZES.map((r) => ({ value: r.size, label: `${r.size} · EU ${r.eu}` })) : PANTS_SIZES.map((r) => ({ value: r.size, label: `${r.size} in · ${r.alpha}` }));
}

/** Accepts "L", "EU 52", "52", "34", "34W", "xl"; returns the chart size or null. */
export function parseSize(type: GarmentType, raw: string): string | null {
  const s = raw.trim().toUpperCase().replace(/^EU\s*/, "").replace(/\s*W$/, "").replace(/^XXL$/, "2XL").replace(/^XXXL$/, "3XL").replace(/^XXXXL$/, "4XL").replace(/^SMALL$/, "S").replace(/^MEDIUM$/, "M").replace(/^LARGE$/, "L").replace(/^EXTRA LARGE$/, "XL");
  if (type === "jacket") {
    const row = JACKET_SIZES.find((r) => r.size === s || String(r.eu) === s);
    return row ? row.size : null;
  }
  const row = PANTS_SIZES.find((r) => r.size === s || r.alpha === s);
  return row ? row.size : null;
}

/** Fills missing measurements from height and weight with population averages. */
export function estimateBody(b: Body): { body: Body; estimated: (keyof Body)[] } {
  const height = b.height || 172;
  const weight = b.weight || Math.round(22.5 * (height / 100) ** 2);
  const bmi = weight / (height / 100) ** 2;
  const girth = Math.sqrt(bmi / 22.5);
  const guess: Body = {
    height, weight,
    chest: Math.round(0.555 * height * girth),
    waist: Math.round(0.47 * height * girth * (bmi > 25 ? 1.04 : 1)),
    hips: Math.round(0.55 * height * girth),
    shoulder: Math.round(0.262 * height),
    sleeve: Math.round(0.355 * height),
    inseam: Math.round(0.455 * height),
    thigh: Math.round(0.33 * height * girth),
  };
  const estimated: (keyof Body)[] = [];
  const body = { ...guess };
  for (const k of Object.keys(guess) as (keyof Body)[]) { if (b[k] > 0) body[k] = b[k]; else estimated.push(k); }
  return { body, estimated };
}

export function garmentDims(g: Garment): GarmentDims {
  const ease = CUT_EASE[g.cut];
  if (g.type === "jacket") {
    const row = JACKET_SIZES.find((r) => r.size === g.size) || JACKET_SIZES[3];
    return { chest: row.chest[1] + ease, waist: row.waist[1] + ease, hips: row.waist[1] + ease + 8, shoulder: row.shoulder + ease / 3, sleeve: row.sleeve + (g.length === "long" ? 2.5 : g.length === "short" ? -2.5 : 0), inseam: 0, thigh: 0 };
  }
  const row = PANTS_SIZES.find((r) => r.size === g.size) || PANTS_SIZES[2];
  return { chest: 0, waist: row.waist[1] + ease, hips: row.hips[1] + ease, shoulder: 0, sleeve: 0, inseam: INSEAM[g.length], thigh: row.thigh + ease / 2 };
}

function girthStatus(body: number, garmentMax: number, span = 4): { status: ZoneStatus; note: string } {
  const over = body - garmentMax;
  if (over > 3) return { status: "tight", note: `About ${Math.round(over)} cm too tight` };
  if (over > 1) return { status: "snug", note: `Snug by ${Math.round(over)} cm; fine for a race cut` };
  if (over >= -span - 2) return { status: "good", note: "Comfortable with room for armour" };
  if (over >= -span - 7) return { status: "loose", note: `${Math.round(-over - span)} cm of extra room; armour may shift` };
  return { status: "baggy", note: `${Math.round(-over - span)} cm too big; protection will not stay in place` };
}
function lengthStatus(body: number, garment: number, what: string): { status: ZoneStatus; note: string } {
  const d = garment - body;
  if (d < -3) return { status: "tight", note: `${what} about ${Math.round(-d)} cm short` };
  if (d < -1) return { status: "snug", note: `${what} slightly short` };
  if (d <= 3) return { status: "good", note: `${what} right for the riding position` };
  if (d <= 6) return { status: "loose", note: `${what} ${Math.round(d)} cm long` };
  return { status: "baggy", note: `${what} ${Math.round(d)} cm too long` };
}
function widthStatus(body: number, garment: number): { status: ZoneStatus; note: string } {
  const over = body - garment;
  if (over > 2) return { status: "tight", note: `Shoulders ${Math.round(over)} cm too narrow for you` };
  if (over > 0.8) return { status: "snug", note: "Shoulder armour will sit tight" };
  if (over >= -2.5) return { status: "good", note: "Shoulder armour sits on the joint" };
  if (over >= -5) return { status: "loose", note: "Shoulder armour sits a little outboard" };
  return { status: "baggy", note: "Shoulder armour will hang off the joint" };
}

const SCORE: Record<ZoneStatus, number> = { tight: 0, snug: 0.7, good: 1, loose: 0.6, baggy: 0.15 };

export function recommendSize(type: GarmentType, body: Body, cut: FitCut): { size: string; why: string } {
  const ease = CUT_EASE[cut];
  if (type === "jacket") {
    const rows = JACKET_SIZES.filter((r) => body.chest <= r.chest[1] + ease + 1 && body.waist <= r.waist[1] + ease + 3 && body.shoulder <= r.shoulder + ease / 3 + 1.5);
    const row = rows[0] || JACKET_SIZES[JACKET_SIZES.length - 1];
    const driver = body.chest > row.chest[1] + ease - 4 ? "your chest" : body.shoulder > row.shoulder + ease / 3 - 2 ? "your shoulders" : "your waist";
    return { size: row.size, why: `The smallest size that clears ${driver} in a ${CUT_LABEL[cut].toLowerCase()} cut.` };
  }
  const rows = PANTS_SIZES.filter((r) => body.waist <= r.waist[1] + ease + 1 && body.hips <= r.hips[1] + ease + 2 && body.thigh <= r.thigh + ease / 2 + 2);
  const row = rows[0] || PANTS_SIZES[PANTS_SIZES.length - 1];
  const driver = body.thigh > row.thigh - 3 ? "your thighs" : body.hips > row.hips[1] + ease - 3 ? "your hips" : "your waist";
  return { size: row.size, why: `The smallest size that clears ${driver}; riding pants should sit close so knee armour stays put.` };
}

export function evaluateFit(rawBody: Body, g: Garment): FitResult {
  const { body } = estimateBody(rawBody);
  const dims = garmentDims(g);
  const zones: Zone[] = [];
  if (g.type === "jacket") {
    zones.push({ key: "chest", label: "Chest", body: body.chest, garment: dims.chest, ...girthStatus(body.chest, dims.chest) });
    zones.push({ key: "shoulder", label: "Shoulders", body: body.shoulder, garment: dims.shoulder, ...widthStatus(body.shoulder, dims.shoulder) });
    zones.push({ key: "waist", label: "Waist", body: body.waist, garment: dims.waist, ...girthStatus(body.waist, dims.waist, 5) });
    zones.push({ key: "sleeve", label: "Sleeves", body: body.sleeve, garment: dims.sleeve, ...lengthStatus(body.sleeve, dims.sleeve, "Sleeves") });
  } else {
    zones.push({ key: "waist", label: "Waist", body: body.waist, garment: dims.waist, ...girthStatus(body.waist, dims.waist, 3) });
    zones.push({ key: "hips", label: "Hips", body: body.hips, garment: dims.hips, ...girthStatus(body.hips, dims.hips, 4) });
    zones.push({ key: "thigh", label: "Thighs", body: body.thigh, garment: dims.thigh, ...girthStatus(body.thigh, dims.thigh, 3) });
    zones.push({ key: "inseam", label: "Leg length", body: body.inseam, garment: dims.inseam, ...lengthStatus(body.inseam, dims.inseam, "Legs") });
  }
  const score = Math.round((zones.reduce((s, z) => s + SCORE[z.status], 0) / zones.length) * 100);
  const tight = zones.filter((z) => z.status === "tight");
  const big = zones.filter((z) => z.status === "baggy");
  const rec = recommendSize(g.type, body, g.cut);
  const sizeName = g.type === "jacket" ? `${g.size} (EU ${JACKET_SIZES.find((r) => r.size === g.size)?.eu ?? ""})` : `${g.size} in`;
  let verdict: string;
  if (tight.length) verdict = `${sizeName} will be too tight at the ${tight.map((z) => z.label.toLowerCase()).join(" and ")}.`;
  else if (big.length) verdict = `${sizeName} is too big at the ${big.map((z) => z.label.toLowerCase()).join(" and ")}; armour will move in a slide.`;
  else if (zones.some((z) => z.status === "loose")) verdict = `${sizeName} fits, with extra room at the ${zones.filter((z) => z.status === "loose").map((z) => z.label.toLowerCase()).join(" and ")}.`;
  else if (zones.some((z) => z.status === "snug")) verdict = `${sizeName} fits snug, the way sport gear should.`;
  else verdict = `${sizeName} fits you well.`;
  return { zones, score, verdict, recommended: rec.size, recommendedWhy: rec.why, dims };
}
