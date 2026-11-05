"""Build public/data/shop-items.json, the store's product list, from the team's catalogue export.

Keeps every in-stock product: riding gear over Rs 10,000 and bike accessories at any price.
Each sells at the catalogue's best price. Sizes come from the in-stock variants other stores list;
when none can be read, gear gets its category's usual size run.

Usage: python3 scripts/build-shop-items.py ~/Downloads/final-catalogue.csv
"""
import csv, json, re, sys, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/data/shop-items.json"
GEAR_MIN = 10000

ALIASES = {"SMALL": "S", "SM": "S", "MEDIUM": "M", "MED": "M", "LARGE": "L", "XXL": "2XL", "XXXL": "3XL", "XXXXL": "4XL"}
LETTER_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"]
DEFAULT_SIZES = {
    "Helmets": ["XS", "S", "M", "L", "XL", "2XL"],
    "Jackets": ["S", "M", "L", "XL", "2XL", "3XL"],
    "Pants": ["S", "M", "L", "XL", "2XL", "3XL"],
    "Gloves": ["S", "M", "L", "XL", "2XL"],
    "Riding Apparel": ["S", "M", "L", "XL", "2XL"],
    "Boots": ["39", "40", "41", "42", "43", "44", "45", "46"],
}


def size_of(token: str) -> str | None:
    t = re.sub(r"\s*\(.*\)$", "", token.strip()).upper().replace("UK ", "UK")
    t = ALIASES.get(t, t)
    if t in LETTER_ORDER or re.fullmatch(r"UK\d{1,2}", t) or re.fullmatch(r"(2[6-9]|[3-4]\d|50)", t):
        return t
    return None


def order(s: str):
    return (0, LETTER_ORDER.index(s)) if s in LETTER_ORDER else (1, int(re.sub(r"\D", "", s) or 0))


def sizes_from(product: dict | None, category: str) -> list[str]:
    if category not in DEFAULT_SIZES:
        return []
    found = set()
    for o in (product or {}).get("offers", []):
        if o.get("inStock"):
            for tok in re.split(r"\s*/\s*|,\s*", o.get("variant") or ""):
                if s := size_of(tok):
                    found.add(s)
    return sorted(found, key=order) or DEFAULT_SIZES[category]


COLOURS = ["white", "black", "red", "blue", "yellow", "green", "orange", "grey", "gray", "silver", "pink", "purple"]


def colours(text: str) -> frozenset[str]:
    return frozenset(c for c in COLOURS if re.search(rf"\b{c}\b", text.lower()))


def file_colours(url: str) -> frozenset[str]:
    file = urllib.parse.unquote(url).lower().rsplit("/", 1)[-1]
    return frozenset(c for c in COLOURS if c in file)


def pick_photo(name: str, photos: list[str], contested: set[str]) -> str | None:
    """The product's own photo. Stores often reuse one colour's photo for every colour (a White spoiler
    shown in black), so skip a photo another colour also uses, or one whose filename names only other
    colours. Prefer a photo whose filename names the product's colour."""
    named = colours(name)
    ok = [u for u in photos if u not in contested and not (len(named) == 1 and file_colours(u) and not named & file_colours(u))]
    return next((u for u in ok if named & file_colours(u)), ok[0] if ok else None)


def main(csv_path: str) -> None:
    catalog = {p["id"]: p for p in json.loads((ROOT / "public/data/catalog.json").read_text())["products"]}
    extra = json.loads((ROOT / "public/data/images.json").read_text())

    rows = []
    for r in csv.DictReader(open(csv_path, encoding="utf-8-sig")):
        price = round(float(r["Best price (INR)"] or 0))
        if r["In stock"] != "Yes" or price <= 0:
            continue
        if r["Side"] == "Riding gear" and price <= GEAR_MIN:
            continue
        p = catalog.get(r["Catalog ID"])
        rows.append((r, p, price, (p or {}).get("image") or r["Image URL"]))

    # A photo is contested when products with different colours in their names all use it.
    used: dict[str, set[frozenset[str]]] = {}
    for r, _, _, main_photo in rows:
        used.setdefault(main_photo, set()).add(colours(r["Product"]))
    contested = {u for u, sets in used.items() if len(sets) > 1}
    # Galleries often hold every colour's photos, so two colours can pick the same one. Repeat until none do.
    gallery = {r["Catalog ID"]: list(dict.fromkeys(u for u in [m, *extra.get(r["Catalog ID"], [])] if u)) for r, _, _, m in rows}
    while True:
        picked: dict[str, set[frozenset[str]]] = {}
        for r, *_ in rows:
            if u := pick_photo(r["Product"], gallery[r["Catalog ID"]], contested):
                picked.setdefault(u, set()).add(colours(r["Product"]))
        clash = {u for u, sets in picked.items() if len(sets) > 1}
        if not clash:
            break
        contested |= clash

    items, fallback, default_sized, no_photo, rephotographed = [], 0, 0, 0, 0
    for r, p, price, main_photo in rows:
        pid = r["Catalog ID"]
        photo = pick_photo(r["Product"], gallery[pid], contested)
        if not photo:
            no_photo += 1
            continue
        sizes = sizes_from(p, r["Category"])
        guessed = bool(sizes) and sizes == DEFAULT_SIZES.get(r["Category"])
        default_sized += guessed
        e = {"id": pid, "price": price, "sizes": sizes}
        if guessed:
            e["sizesGuessed"] = True  # flagged in the admin for a check
        if bikes := [b.strip() for b in r["Fits bikes"].split(";") if b.strip()]:
            e["bikes"] = bikes
        if photo != main_photo:
            e["image"] = photo
            e["photoSwapped"] = True
            rephotographed += 1
        if not p:  # not in the site's nightly catalog: carry what the card and checkout need
            fallback += 1
            mrp = round(float(r["MRP (INR)"])) if r["MRP (INR)"] else None
            e.update(name=r["Product"], brand=r["Brand"], category=r["Category"], image=photo, mrp=mrp, store=r["Cheapest store"])
        items.append(e)

    OUT.write_text(json.dumps(items, ensure_ascii=False, separators=(",", ":")))
    print(f"{len(items)} items -> {OUT.relative_to(ROOT)} ({fallback} from the export only, {default_sized} with default sizes, "
          f"{rephotographed} given their own photo, {no_photo} hidden with no photo of their own)")


if __name__ == "__main__":
    main(sys.argv[1])
