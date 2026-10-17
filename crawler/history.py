"""Record each store's price for every product in Postgres, one row per change.
Run after export.py: DATABASE_URL=... python crawler/history.py
"""
import json, os
from pathlib import Path
import psycopg

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = """
CREATE TABLE IF NOT EXISTS price_history (
  product_id text NOT NULL,
  store_id text NOT NULL,
  price numeric(12,2) NOT NULL,
  mrp numeric(12,2),
  in_stock boolean,
  checked_at timestamptz NOT NULL,
  PRIMARY KEY (product_id, store_id, checked_at)
);
"""

def main():
    catalog = json.loads((ROOT / 'public/data/catalog.json').read_text())
    rows = [(p['id'], o['storeId'], o['price'], o.get('mrp'), o.get('inStock'), o['checkedAt'])
            for p in catalog['products'] for o in p['offers'] if o.get('source') == 'crawl']
    with psycopg.connect(os.environ['DATABASE_URL']) as db:
        db.execute(SCHEMA)
        db.execute('CREATE TEMP TABLE seen (LIKE price_history) ON COMMIT DROP')
        with db.cursor().copy('COPY seen FROM STDIN') as copy:
            for row in rows:
                copy.write_row(row)
        # Keep a row only when price, MRP or stock differs from the store's last recorded one.
        added = db.execute("""
          INSERT INTO price_history
          SELECT s.* FROM seen s
          LEFT JOIN LATERAL (
            SELECT price, mrp, in_stock FROM price_history h
            WHERE h.product_id = s.product_id AND h.store_id = s.store_id
            ORDER BY checked_at DESC LIMIT 1
          ) last ON true
          WHERE last.price IS NULL OR (last.price, last.mrp, last.in_stock) IS DISTINCT FROM (s.price, s.mrp, s.in_stock)
          ON CONFLICT DO NOTHING
        """).rowcount
    print(f'price history: {len(rows)} offers checked, {added} changes recorded', flush=True)

if __name__ == '__main__':
    main()
