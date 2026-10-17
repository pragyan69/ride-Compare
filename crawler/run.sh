#!/usr/bin/env bash
# Crawl every store, rebuild the catalog snapshot and push it; Vercel redeploys on push.
# Runs from cron on the server: see "Crawler on the server" in README.md.
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only -q
docker build -q -t ridecompare-crawler crawler >/dev/null
rm -rf data/crawl/raw
docker run --rm -v "$PWD":/repo -w /repo ridecompare-crawler sh -c 'python crawler/crawl.py && python crawler/export.py'

count() { python3 -c 'import json,sys;print(len(json.load(sys.stdin)["products"]))'; }
before=$(git show HEAD:public/data/catalog.json | count)
after=$(count < public/data/catalog.json)
echo "products: $before -> $after"
if [ "$after" -lt $((before / 2)) ]; then
  echo "Catalog shrank by more than half; not publishing." >&2
  git checkout -- public/data lib/crawl-index.json data/crawl/report.json
  exit 1
fi

# Price history lives in Postgres; the connection string is kept out of git in crawler/.env.
docker run --rm --network host --env-file crawler/.env -v "$PWD":/repo -w /repo ridecompare-crawler python crawler/history.py

git add public/data/catalog.json public/data/brands.json lib/crawl-index.json data/crawl/report.json
git diff --cached --quiet && exit 0
git commit -q -m "Refresh catalog snapshot $(date -u +%F)"
git pull --rebase -q
git push -q
