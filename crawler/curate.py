"""Mark the products RideCompare stocks and publish them as public/data/curated.json.

The rules live in data/curated/catalogue.json (built offline by the catalogue tools and the owner's
edits on the offline catalogue page). export.py calls apply() on every nightly snapshot; run this
file by hand to re-mark an existing public/data/catalog.json without re-crawling.
"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
RULES = ROOT / 'data/curated/catalogue.json'

def load_rules():
    if not RULES.exists(): return None
    r = json.loads(RULES.read_text())
    ch = r.get('changes', {})
    return {'short': set(r.get('shortlist', [])), 'aside': set(r.get('setAside', [])),
            'brands': {k.lower(): v for k, v in ch.get('brands', {}).items()}, 'products': ch.get('products', {})}

def is_curated(p, rules):
    po = rules['products'].get(p['id'])
    if po == 1: return True
    if po == -1: return False
    bo = rules['brands'].get(p['brand'].lower())
    if bo == 1: return p['id'] not in rules['aside']
    if bo == -1: return False
    return p['id'] in rules['short']

def apply(products):
    """Set p['curated'] = True on stocked products, drop the key elsewhere; returns how many are curated."""
    rules = load_rules(); n = 0
    for p in products:
        if rules and is_curated(p, rules): p['curated'] = True; n += 1
        else: p.pop('curated', None)
    return n

def curated_payload(payload):
    cur = [p for p in payload['products'] if p.get('curated')]
    names = {p['brand'] for p in cur}
    summary = dict(payload.get('summary', {}))
    summary.update(curated=True, catalogProductCount=len(payload['products']), productCount=len(cur),
                   offerCount=sum(len(p['offers']) for p in cur), brandCount=len(names - {'Unspecified'}),
                   matchedProducts=sum(len(p['offers']) > 1 for p in cur))
    cats = {}
    for p in cur: cats[p['category']] = cats.get(p['category'], 0) + 1
    summary['categories'] = cats
    return {'products': cur, 'stores': payload['stores'], 'brands': [b for b in payload.get('brands', []) if b['name'] in names], 'summary': summary}

def write_curated(payload, dest=ROOT / 'public/data/curated.json'):
    tmp = dest.with_suffix('.tmp'); tmp.write_text(json.dumps(curated_payload(payload), ensure_ascii=False, separators=(',', ':'))); tmp.replace(dest)
    return dest

def main():
    dest = ROOT / 'public/data/catalog.json'
    payload = json.loads(dest.read_text())
    n = apply(payload['products']); payload.setdefault('summary', {})['curatedCount'] = n
    tmp = dest.with_suffix('.tmp'); tmp.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':'))); tmp.replace(dest)
    out = write_curated(payload)
    print(f'curated {n} of {len(payload["products"])} products; wrote {out} ({out.stat().st_size} bytes)')

if __name__ == '__main__':
    main()
