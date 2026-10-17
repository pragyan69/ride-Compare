import type { Product } from "./catalog";

export type Bike = { slug: string; make: string; model: string };
type Rule = Bike & { re: RegExp; loose?: RegExp; unless?: RegExp };

// Separators used in fitment lists: "Meteor/Classic 350", "Duke 390 Gen 3/250", "FZ15 | FZ25".
const SEP = String.raw`\s*(?:\/|&|,|\+|\||\band\b|\bor\b)\s*`;
const NUMTOK = String.raw`\d{3}[a-z]*(?:[\s-]*gen[\s-]*\d)?`;
const WORD = String.raw`[a-z]+(?:\s[a-z]+)?`;

/**
 * "<name> <num>" with the fitment-list shapes stores use, plus "<num> <name>".
 * Matches "Duke 390", "Duke-390", "Duke390", "390 Duke", "Duke 200/250/390" (for 250),
 * "Duke/RC 390" (for Duke), "Himalayan/Guerrilla 450" (for Himalayan).
 * Does not match "Duke 200 and RC 390" for Duke 390.
 */
function seq(name: string, num: string) {
  const forward = String.raw`\b(?:${name})(?:[\s-]*${NUMTOK}(?:${SEP}${NUMTOK})*${SEP}|(?:${SEP}${WORD})*[\s-]*)(?:${num})(?!\d)`;
  const reverse = String.raw`\b(?:${num})[\s-]*(?:${name})\b`;
  return `${forward}|${reverse}`;
}
const RE = String.raw`(?:\broyal\s*enfi\w*|\bre)\b`;
const rx = (...parts: string[]) => new RegExp(parts.join("|"), "i");

const rules: Rule[] = [
  // Royal Enfield
  { slug: "royal-enfield-classic-350", make: "Royal Enfield", model: "Classic 350", re: rx(seq("classic", "350"), String.raw`\bclassic[\s-]*reborn\b|\breborn[\s-]*classic\b`), loose: rx(String.raw`${RE}[\s-]+(?:[a-z0-9]+[\s-]+){0,2}classic\b`), unless: rx(seq("classic", "500|650"), String.raw`\|\s*500\s*\|`) },
  { slug: "royal-enfield-classic-650", make: "Royal Enfield", model: "Classic 650", re: rx(seq("classic", "650")) },
  { slug: "royal-enfield-bullet-350", make: "Royal Enfield", model: "Bullet 350", re: rx(seq("bullet", "350|500"), String.raw`${RE}[\s-]+bullet\b`, String.raw`\bfor\s+bullet\b`) },
  { slug: "royal-enfield-hunter-350", make: "Royal Enfield", model: "Hunter 350", re: rx(seq("hunter", "350"), String.raw`${RE}[\s-]+hunter\b`) },
  { slug: "royal-enfield-meteor-350", make: "Royal Enfield", model: "Meteor 350", re: rx(seq("meteor", "350")), loose: /(?<!super[\s-]*)\bmeteor\b/i, unless: rx(seq("meteor", "650")) },
  { slug: "royal-enfield-himalayan-450", make: "Royal Enfield", model: "Himalayan 450", re: rx(seq("himalayan", "450|452")) },
  { slug: "royal-enfield-himalayan-411", make: "Royal Enfield", model: "Himalayan 411", re: rx(seq("himalayan", "411")), loose: /\bhimalayan\b/i, unless: rx(seq("himalayan", "450|452")) },
  { slug: "royal-enfield-scram-411", make: "Royal Enfield", model: "Scram 411", re: /\bscram\b/i },
  { slug: "royal-enfield-guerrilla-450", make: "Royal Enfield", model: "Guerrilla 450", re: /\bguerr?ill?a\b/i },
  { slug: "royal-enfield-interceptor-650", make: "Royal Enfield", model: "Interceptor 650", re: /\binterceptor\b/i },
  { slug: "royal-enfield-continental-gt-650", make: "Royal Enfield", model: "Continental GT 650", re: rx(String.raw`\bcontinental[\s-]*gt\b`, seq("gt", "650")) },
  { slug: "royal-enfield-super-meteor-650", make: "Royal Enfield", model: "Super Meteor 650", re: /\bsuper[\s-]*meteor\b/i },
  { slug: "royal-enfield-shotgun-650", make: "Royal Enfield", model: "Shotgun 650", re: /\bshotgun\b/i },
  // KTM
  { slug: "ktm-duke-200", make: "KTM", model: "Duke 200", re: rx(seq("duke", "200")) },
  { slug: "ktm-duke-250", make: "KTM", model: "Duke 250", re: rx(seq("duke", "250")) },
  { slug: "ktm-duke-390", make: "KTM", model: "Duke 390", re: rx(seq("duke", "390")) },
  { slug: "ktm-rc-200", make: "KTM", model: "RC 200", re: rx(seq("rc", "200")) },
  { slug: "ktm-rc-390", make: "KTM", model: "RC 390", re: rx(seq("rc", "390")) },
  { slug: "ktm-adventure-250", make: "KTM", model: "Adventure 250", re: rx(seq("adventure|adv", "250")) },
  { slug: "ktm-adventure-390", make: "KTM", model: "Adventure 390", re: rx(seq("adventure|adv", "390")) },
  // Bajaj
  { slug: "bajaj-pulsar", make: "Bajaj", model: "Pulsar", re: /\bpulsar\b/i },
  { slug: "bajaj-dominar", make: "Bajaj", model: "Dominar 250 / 400", re: /\bdominar\b/i },
  { slug: "bajaj-avenger", make: "Bajaj", model: "Avenger", re: /\bavenger\b/i },
  // Triumph
  { slug: "triumph-speed-400", make: "Triumph", model: "Speed 400", re: rx(seq("speed", "400"), String.raw`\bspeed[\s-]*t4\b`) },
  { slug: "triumph-scrambler-400-x", make: "Triumph", model: "Scrambler 400 X", re: rx(seq("scrambler", "400")) },
  // TVS
  { slug: "tvs-apache-rtr-310", make: "TVS", model: "Apache RTR 310", re: rx(seq("rtr", "310")) },
  { slug: "tvs-apache-rr-310", make: "TVS", model: "Apache RR 310", re: rx(seq("rr", "310")) },
  { slug: "tvs-apache-rtr-160-200", make: "TVS", model: "Apache RTR 160 / 200", re: rx(seq("rtr", "160|180|200")) },
  { slug: "tvs-ronin", make: "TVS", model: "Ronin", re: /\bronin\b/i },
  // Yamaha
  { slug: "yamaha-r15", make: "Yamaha", model: "R15", re: /\b(?:yzf[\s-]*)?r[\s-]?15(?!\d)/i },
  { slug: "yamaha-mt-15", make: "Yamaha", model: "MT-15", re: /\bmt[\s-]?15(?!\d)/i },
  { slug: "yamaha-fz", make: "Yamaha", model: "FZ", re: /\bfz(?![\s-]?0\d)(?:[\s-]?(?:s|x|n|fi|15|16|25|v[1-4]))*\b/i },
  { slug: "yamaha-r3", make: "Yamaha", model: "R3", re: /\byzf[\s-]*r3\b|\byamaha\b[^|]{0,20}?\br3\b|\br3\b[^|]{0,20}?\byamaha\b/i },
  { slug: "yamaha-mt-03", make: "Yamaha", model: "MT-03", re: /\bmt[\s-]?03\b/i },
  // Honda
  { slug: "honda-cb350", make: "Honda", model: "CB350 / H'ness / RS", re: /\bcb[\s-]?350(?!\d)|\bh['’]?\s?ness\b|\bhighness\b/i },
  { slug: "honda-cb300f", make: "Honda", model: "CB300F", re: /\bcb[\s-]?300[\s-]?f\b/i },
  { slug: "honda-cb200x", make: "Honda", model: "CB200X", re: /\bcb[\s-]?200[\s-]?x\b/i },
  { slug: "honda-hornet-2", make: "Honda", model: "Hornet 2.0", re: /\bhornet[\s-]*2(?:\.0)?\b|\bhonda[\s-]+hornet\b/i },
  { slug: "honda-nx500", make: "Honda", model: "NX500", re: /\bnx[\s-]?500(?!\d)/i },
  // Hero
  { slug: "hero-xpulse", make: "Hero", model: "Xpulse 200 / 210", re: /\bx[\s-]?pulse\b/i },
  { slug: "hero-xtreme-160r", make: "Hero", model: "Xtreme 160R", re: /\bxtreme[\s-]*160/i },
  { slug: "hero-mavrick-440", make: "Hero", model: "Mavrick 440", re: /\bmave?rick[\s-]*440(?!\d)|\bhero[\s-]+mave?rick\b/i },
  // Harley-Davidson
  { slug: "harley-davidson-x440", make: "Harley-Davidson", model: "X440", re: /\bx[\s-]?440(?!\d)/i },
  // BMW
  { slug: "bmw-g-310-r", make: "BMW", model: "G 310 R", re: /\bg[\s-]?310[\s-]?r\b/i },
  { slug: "bmw-g-310-gs", make: "BMW", model: "G 310 GS", re: /\b(?:g[\s-]?)?310[\s-]?gs\b/i },
  // Jawa and Yezdi
  { slug: "jawa", make: "Jawa", model: "42 / 350 / Perak", re: /\bjawa\b|\bperak\b/i },
  { slug: "yezdi", make: "Yezdi", model: "Adventure / Scrambler / Roadster", re: /\byezdi\b/i },
  // Kawasaki
  { slug: "kawasaki-ninja-300", make: "Kawasaki", model: "Ninja 300", re: rx(seq("ninja", "300")) },
  { slug: "kawasaki-ninja-400", make: "Kawasaki", model: "Ninja 400", re: rx(seq("ninja", "400")) },
  { slug: "kawasaki-ninja-650", make: "Kawasaki", model: "Ninja 650", re: rx(seq("ninja", "650")) },
  { slug: "kawasaki-z650", make: "Kawasaki", model: "Z650", re: /\bz[\s-]?650(?!\d)/i },
  { slug: "kawasaki-z900", make: "Kawasaki", model: "Z900", re: /\bz[\s-]?900(?!\d)/i },
  { slug: "kawasaki-versys-650", make: "Kawasaki", model: "Versys 650", re: rx(seq("versys", "650")), loose: /\bversys\b(?![\s-]*x)/i, unless: /\bversys\b[^|]{0,30}\b1000\b|\|\s*1000\s*\|/i },
  // Suzuki
  { slug: "suzuki-v-strom-sx", make: "Suzuki", model: "V-Strom SX", re: /\bv[\s-]?strom[\s-]*(?:250[\s-]*)?sx\b/i },
  { slug: "suzuki-v-strom-800de", make: "Suzuki", model: "V-Strom 800DE", re: /\bv[\s-]?strom[\s-]*800/i },
  { slug: "suzuki-gixxer", make: "Suzuki", model: "Gixxer", re: /\bgixxer\b/i },
  { slug: "suzuki-hayabusa", make: "Suzuki", model: "Hayabusa", re: /\b(?:haya)?busa\b/i },
];

export const bikes: Bike[] = rules.map(({ slug, make, model }) => ({ slug, make, model }));
export const findBike = (slug: string) => bikes.find((b) => b.slug === slug);

// Gear for the bike itself. Elsewhere (helmets, jackets) only an explicit model name in the product name counts.
const bikeCategories = new Set(["Bike Accessories", "Luggage", "Maintenance & Parts", "Electronics", "Protection"]);

/** Slugs of every bike this product names. */
export function bikesFor(p: Pick<Product, "name" | "variant" | "category">): string[] {
  if (p.category === "Helmets") return []; // "Avenger" and "Hunter" are helmet names, never fitments
  const gear = bikeCategories.has(p.category);
  const text = gear ? `${p.name} | ${p.variant}` : p.name;
  return rules.filter((r) => r.re.test(text) || (gear && r.loose?.test(text) && !r.unless?.test(text))).map((r) => r.slug);
}

const indexCache = new WeakMap<readonly Product[], Map<string, Product[]>>();

/** Products per bike slug, computed once per products array. Bikes with no products are absent. */
export function bikeIndex(products: readonly Product[]): Map<string, Product[]> {
  let index = indexCache.get(products);
  if (!index) {
    index = new Map();
    for (const p of products) {
      for (const slug of bikesFor(p)) {
        const list = index.get(slug);
        if (list) list.push(p);
        else index.set(slug, [p]);
      }
    }
    indexCache.set(products, index);
  }
  return index;
}
