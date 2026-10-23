/** Catalog rules shared by the collection engine and the UI: categories,
 * brand normalisation, bike-model detection and identity helpers. Mirrors the
 * Python crawler rules so product keys stay comparable. */
import aliasFile from "../crawler/brand-aliases.json";
import sitesFile from "../crawler/sites.json";

export const CATEGORIES = [
  "Helmets", "Jackets", "Gloves", "Pants", "Boots", "Luggage", "Riding Apparel",
  "Protection", "Electronics", "Helmet Accessories", "Bike Accessories", "Maintenance & Parts",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Gear categories a rider wears; the rest are bike parts and accessories. */
export const RIDING_GEAR: Category[] = ["Helmets", "Jackets", "Gloves", "Pants", "Boots", "Protection", "Riding Apparel", "Helmet Accessories"];

export const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
export const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const CAR = /\b(car|mercedes|benz|toyota|lexus|volkswagen|vw|skoda|audi|isuzu|hyundai|kia|mahindra|land rover|range rover|bmw\s*(?:[1-8][ -]?series|x[1-7])|xuv\w*|polo|innova|swift|fortuner|hilux|jimny|kushaq|taigun|slavia|virtus|thar|scorpio|bolero)\b/;
const MOTO = /motorcycle|motorbike|riding|helmet|bike/;

/** Returns a category, or null when the item should be excluded from the catalog. */
export function categorize(title: string, kind = "", tags = ""): Category | null {
  const t = `${title} ${kind}`.toLowerCase();
  const k = `${kind} ${tags}`.toLowerCase();
  if (CAR.test(t) && !MOTO.test(t)) return null;
  if (/die.?cast|scale model|\b1:(12|18|24|32|43|64)\b|gift card|gift voucher|test item|do not buy|shipping charge|warranty extension|membership/.test(t)) return null;
  if (/windscreen|windshield|(?:db|bubble|touring) visor/.test(t) || (t.includes("visor") && /\br15|pulsar|x.?pulse|duke|himalayan|dominar|interceptor|continental gt/.test(t))) return "Bike Accessories";
  if (/visor|pinlock|helmet (liner|padding|pad|bag|spoiler|lock|cover)|cheek pad|chin (curtain|strap)|tear.?off|helmet intercom mount/.test(t)) return "Helmet Accessories";
  if (/helmet/.test(t) || /\bhelmets?\b/.test(k)) return "Helmets";
  if (/glove/.test(t)) return "Gloves";
  if (/jacket|riding suit|race suit|rain suit/.test(t)) return "Jackets";
  if (/riding (pant|jean)|trouser|\bpants?\b|\bjeans\b|\bdenims?\b/.test(t)) return "Pants";
  if (/boot|riding shoe|riding sneaker|\bshoes\b/.test(t)) return "Boots";
  if (/saddlebag|saddle bag|tailbag|tail bag|tank bag|pannier|top (box|case)|backpack|rucksack|duffel|luggage|dry.?bag|waist bag|crash bar bag|leg bag|sissy bar bag|roll bag/.test(t)) return "Luggage";
  if (/balaclava|t.shirt|tee\b|base.?layer|shirt|jersey|hoodie|sweatshirt|rain (coat|suit)|thermal|neck gaiter|neck warmer|arm sleeve|socks|\bcap\b|bandana|buff\b|vest\b/.test(t)) return "Riding Apparel";
  if (/knee|elbow|armou?r|chest protect|back protect|kidney belt|hip protect|shoulder protect|limb protect/.test(t)) return "Protection";
  if (/intercom|bluetooth|cardo|sena|bluarmor|camera|gps|mobile|phone|charger|usb|navigation|dash ?cam|tpms|tyre pressure monitor/.test(t)) return "Electronics";
  if (/\boil\b|lube|lubricant|cleaner|cleaning|chain|sprocket|brake|filter|spark|tyre|tire|battery|clutch|exhaust|polish|coolant|bushing|bearing|radiator hose|gasket|piston|lever|cable|wax\b|degreaser|shampoo|fork seal|wheel bearing/.test(t)) return "Maintenance & Parts";
  return "Bike Accessories";
}

const ALIASES: Record<string, string> = {
  "rynox gears": "Rynox", "rynox gear": "Rynox", "rynox": "Rynox", "axor helmets": "Axor", "axor": "Axor", "viaterra gear": "ViaTerra", "viaterra": "ViaTerra", "via terra": "ViaTerra",
  "mt helmets": "MT Helmets", "mt": "MT Helmets", "smk helmets": "SMK", "smk": "SMK", "ls2 helmets": "LS2", "ls2": "LS2", "dsg": "DSG", "dream sporting gear": "DSG", "motul": "Motul", "vega": "Vega", "raida": "Raida",
  "solace": "Solace", "solace riding gear": "Solace", "clan": "Clan", "agv helmets": "AGV", "agv": "AGV", "steelbird": "Steelbird", "royal enfield": "Royal Enfield", "royalenfield": "Royal Enfield", "jb racing": "JB Racing",
  "legundary custom": "Legundary Custom", "reisemoto": "Reise", "reise": "Reise", "kyt helmets": "KYT", "kyt": "KYT", "studds": "Studds", "tiivra": "Tiivra", "grandpitstop": "Grand Pitstop",
  ...(aliasFile as Record<string, string>),
};
const KNOWN = ["Alpinestars", "Dainese", "Rynox", "ViaTerra", "Axor", "Vega", "Steelbird", "SMK", "LS2", "MT Helmets", "KYT", "AGV", "Bell", "Shoei", "Arai", "Shark", "HJC", "Richa", "Rev'it", "Revit", "Racer", "Spidi", "Solace", "Raida", "DSG", "Cramster", "Clan", "Reise", "Motul", "Muc-Off", "Liqui Moly", "Putoline", "Motorex", "BBG", "BBGears", "Korda", "Klim", "Rukka", "Ixon", "Furygan", "Barkbusters", "SW-Motech", "Givi", "Shad", "BMC", "K&N", "NGK", "Bobo", "Maddog", "HJG", "Zana", "Legundary", "JB Racing", "Sena", "Cardo", "Bluarmor", "Carbonado", "DirtSack", "Dirtsack", "Rage", "Bikeratti", "Ridetek", "Scoyco", "Tarmac", "Mototech", "Royal Enfield", "Fego", "Grand Pitstop", "Grandpitstop", "Acerbis", "Leatt", "Forma", "TCX", "R&G", "Evotech", "RAM Mounts", "Quad Lock", "Kriega", "Lone Ranger", "Tiivra", "Scala", "Bolt", "Enduristan", "Wurth", "Stalwart", "Studds", "Ignyte", "Airoh", "Gaerne", "Hepco Becker", "Wunderlich", "Denali", "EBC", "Brembo", "Akrapovic", "Öhlins", "Pirelli", "Michelin", "Metzeler", "Ilmberger", "Rizoma", "Puig", "Oxford", "Nolan", "X-Lite", "Scorpion Exo", "Schuberth", "Icon", "Fox", "Thor", "Oneal", "O'Neal", "Troy Lee", "Sidi", "Daytona", "Held", "Macna", "Bering", "Segura", "Alpine", "Lluvia", "Shiro", "Steelbird Hi-Tech"];
const KNOWN_SORTED = [...KNOWN].sort((a, b) => b.length - a.length);
const RETAILER_NAMES = new Set((sitesFile as { name: string }[]).map((s) => norm(s.name)));
const GENERIC = new Set(["default", "generic", "unbranded", "others", "other", "accessories", "na", "n/a", "none", "brand", "no brand", "unassigned", "other brands", "imported", "universal"]);

/** Normalise a vendor string, falling back to a leading brand in the title. */
export function brand(value: string, title = "", fallback = ""): string {
  const v = clean(value);
  const key = v.toLowerCase();
  if (key && ALIASES[key]) return ALIASES[key];
  for (const b of KNOWN_SORTED) {
    if (new RegExp("^" + b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(title)) return ALIASES[b.toLowerCase()] || b;
  }
  if (fallback) return fallback;
  if (!v || GENERIC.has(key) || RETAILER_NAMES.has(norm(v)) || v.length > 60) return "Unspecified";
  return v;
}

/** Bike models that commonly appear in Indian accessory listings. Order matters:
 * more specific patterns first. Each entry: [regex, label, make]. */
const BIKES: [RegExp, string, string][] = [
  [/\b(?:super ?meteor)\s*650\b/i, "Super Meteor 650", "Royal Enfield"],
  [/\bmeteor\s*350\b/i, "Meteor 350", "Royal Enfield"],
  [/\bclassic\s*(?:350|500)\b/i, "Classic 350", "Royal Enfield"],
  [/\bbullet\s*(?:350|500)\b/i, "Bullet 350", "Royal Enfield"],
  [/\bhunter\s*350\b/i, "Hunter 350", "Royal Enfield"],
  [/\bhimalayan\b/i, "Himalayan", "Royal Enfield"],
  [/\binterceptor\s*650\b|\binterceptor\b/i, "Interceptor 650", "Royal Enfield"],
  [/\bcontinental\s*gt\b|\bgt\s*650\b/i, "Continental GT 650", "Royal Enfield"],
  [/\bshotgun\s*650\b/i, "Shotgun 650", "Royal Enfield"],
  [/\bguerrilla\s*450\b/i, "Guerrilla 450", "Royal Enfield"],
  [/\bscram\s*(?:411|440)\b|\bscram\b/i, "Scram 411", "Royal Enfield"],
  [/\bthunderbird\b/i, "Thunderbird", "Royal Enfield"],
  [/\b(?:ktm\s*)?(?:390|250)\s*adventure\b|\badventure\s*(?:390|250)\b/i, "390 Adventure", "KTM"],
  [/\bduke\s*(?:125|200|250|390|790|890)\b|\b(?:125|200|250|390)\s*duke\b/i, "Duke", "KTM"],
  [/\brc\s*(?:125|200|390)\b/i, "RC 390", "KTM"],
  [/\bdominar\s*(?:250|400)?\b/i, "Dominar 400", "Bajaj"],
  [/\bpulsar\b/i, "Pulsar", "Bajaj"],
  [/\bavenger\b/i, "Avenger", "Bajaj"],
  [/\bx-?pulse\s*(?:200|210)?\b/i, "Xpulse 200", "Hero"],
  [/\bxtreme\s*(?:160|125|200)\s*r?\b/i, "Xtreme 160R", "Hero"],
  [/\bkarizma\b/i, "Karizma XMR", "Hero"],
  [/\bmavrick\s*440\b/i, "Mavrick 440", "Hero"],
  [/\bsplendor\b/i, "Splendor", "Hero"],
  [/\bcb\s*350\b|\bh'?ness\b|\bhness\b/i, "CB350", "Honda"],
  [/\bcb\s*300\s*[rf]\b/i, "CB300R", "Honda"],
  [/\bhornet\s*2\.0\b|\bhornet\b/i, "Hornet 2.0", "Honda"],
  [/\bcb\s*200x\b/i, "CB200X", "Honda"],
  [/\bnx\s*500\b/i, "NX500", "Honda"],
  [/\btransalp\b|\bxl\s*750\b/i, "Transalp XL750", "Honda"],
  [/\bafrica twin\b/i, "Africa Twin", "Honda"],
  [/\bunicorn\b/i, "Unicorn", "Honda"],
  [/\bactiva\b/i, "Activa", "Honda"],
  [/\br15\b/i, "R15", "Yamaha"],
  [/\bmt[- ]?15\b/i, "MT-15", "Yamaha"],
  [/\bfz[- ]?(?:s|x|v\d|25|\d{2,3})?\b/i, "FZ", "Yamaha"],
  [/\br3\b|\bmt[- ]?03\b/i, "R3", "Yamaha"],
  [/\baerox\b/i, "Aerox 155", "Yamaha"],
  [/\bapache\s*(?:rtr|rr)?\s*(?:160|180|200|310)?\b|\brr\s*310\b/i, "Apache", "TVS"],
  [/\bronin\b/i, "Ronin", "TVS"],
  [/\bntorq\b/i, "Ntorq", "TVS"],
  [/\braider\s*125\b/i, "Raider 125", "TVS"],
  [/\bgixxer\b/i, "Gixxer", "Suzuki"],
  [/\bv-?strom\b/i, "V-Strom", "Suzuki"],
  [/\bhayabusa\b/i, "Hayabusa", "Suzuki"],
  [/\bninja\s*(?:300|400|500|650|1000|zx)?\b/i, "Ninja", "Kawasaki"],
  [/\bz\s*(?:900|650|400|1000)\b/i, "Z900", "Kawasaki"],
  [/\bversys\b/i, "Versys 650", "Kawasaki"],
  [/\bspeed\s*400\b/i, "Speed 400", "Triumph"],
  [/\bscrambler\s*400\s*x?\b/i, "Scrambler 400X", "Triumph"],
  [/\btrident\s*660\b/i, "Trident 660", "Triumph"],
  [/\btiger\s*(?:900|850|800|1200|sport)?\b/i, "Tiger", "Triumph"],
  [/\bstreet triple\b/i, "Street Triple", "Triumph"],
  [/\bbonneville\b|\bt120\b|\bt100\b/i, "Bonneville", "Triumph"],
  [/\bspeed twin\b/i, "Speed Twin", "Triumph"],
  [/\bdaytona\s*660\b/i, "Daytona 660", "Triumph"],
  [/\bx\s*440\b/i, "X440", "Harley-Davidson"],
  [/\bsportster\b|\biron\s*883\b/i, "Sportster", "Harley-Davidson"],
  [/\bg\s*310\s*(?:r|gs)\b/i, "G 310", "BMW"],
  [/\bf\s*(?:750|850|900)\s*(?:gs|r|xr)\b/i, "F 900", "BMW"],
  [/\br\s*12[05]0\s*gs\b|\br\s*1300\s*gs\b/i, "R 1250 GS", "BMW"],
  [/\bs\s*1000\s*(?:rr|r|xr)\b/i, "S 1000", "BMW"],
  [/\bjawa\s*42\b|\bjawa\b/i, "Jawa", "Jawa"],
  [/\bperak\b/i, "Perak", "Jawa"],
  [/\byezdi\b/i, "Yezdi", "Yezdi"],
  [/\bmultistrada\b/i, "Multistrada", "Ducati"],
  [/\bmonster\b/i, "Monster", "Ducati"],
  [/\bpanigale\b/i, "Panigale", "Ducati"],
  [/\bducati\s*scrambler\b/i, "Scrambler", "Ducati"],
  [/\btrk\s*(?:502|251)\b/i, "TRK 502", "Benelli"],
  [/\bimperiale\s*400\b/i, "Imperiale 400", "Benelli"],
  [/\bleoncino\b/i, "Leoncino", "Benelli"],
  [/\bsvartpilen\b|\bvitpilen\b/i, "Svartpilen / Vitpilen", "Husqvarna"],
  [/\brs\s*457\b/i, "RS 457", "Aprilia"],
  [/\bola\s*s1\b/i, "Ola S1", "Ola"],
  [/\bather\b/i, "Ather", "Ather"],
];

export type Bike = { label: string; make: string };
/** Detects the first bike model mentioned in a listing title. */
export function detectBike(title: string): Bike | null {
  for (const [re, label, make] of BIKES) if (re.test(title)) return { label, make };
  return null;
}
export const BIKE_LIST: Bike[] = Array.from(new Map(BIKES.map(([, label, make]) => [label, { label, make }])).values());

/** Validates a GTIN-8/12/13/14 and returns it zero-padded to 14 digits, or "". */
export function gtin(s: string): string {
  if (!/^\d+$/.test(s) || ![8, 12, 13, 14].includes(s.length) || new Set(s).size < 3) return "";
  const digits = s.slice(0, -1).split("").reverse();
  const total = digits.reduce((sum, n, i) => sum + Number(n) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (total % 10)) % 10 === Number(s[s.length - 1]) ? s.padStart(14, "0") : "";
}

export const GENERIC_VARIANTS = new Set(["standard", "default title", "check size / colour at store", ""]);

/** Product name without the brand prefix and retailer noise, for cross-store matching. */
export function matchName(name: string, brandName: string): string {
  let n = norm(name);
  const b = norm(brandName);
  if (b && b !== "unspecified" && n.startsWith(b + " ")) n = n.slice(b.length + 1);
  n = n.replace(/\b(original|genuine|new|latest|free shipping|india|imported|with free|combo offer)\b/g, " ");
  return n.replace(/\s+/g, " ").trim();
}

export const money = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: Number.isInteger(v) ? 0 : 2 }).format(v);
export const checkedLabel = (d: string | number | null | undefined) => {
  if (!d) return "unknown time";
  const t = typeof d === "number" ? d : Date.parse(d);
  if (!Number.isFinite(t)) return "unknown time";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(t)) + " IST";
};
export const ago = (t: number | null | undefined, now = Date.now()) => {
  if (!t) return "never";
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
};
