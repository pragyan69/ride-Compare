"""Normalize crawl checkpoints and atomically publish the catalog snapshot."""
import collections,hashlib,json,re,sys
from pathlib import Path
from datetime import datetime,timezone
from crawl import brand,slug,categorize
ROOT=Path(__file__).resolve().parents[1]
def norm(s):return re.sub(r'[^a-z0-9]+',' ',s.lower()).strip()
def gtin(s):
 if not s.isdigit() or len(s) not in [8,12,13,14] or len(set(s))<3:return ''
 total=sum(int(n)*(3 if i%2==0 else 1) for i,n in enumerate(reversed(s[:-1])))
 return s.zfill(14) if (10-total%10)%10==int(s[-1]) else ''
def product_key(site,row,bad,sourcekeys):
 b=row['brand'];variant=row['variant'];g=gtin(row.get('barcode',''));matched='retailer'
 if g and g not in bad and b!='Unspecified':key='gtin-'+slug(b)+'-'+g;matched='barcode'
 elif b!='Unspecified' and variant not in ['Standard','Check size / colour at store']:
  identity=norm(b)+'|'+norm(row['name'])+'|'+norm(variant)
  key='exact-'+hashlib.sha1(identity.encode()).hexdigest()[:20];matched='exact'
 else:key=site['id']+'-'+row['sourceId']
 if row.get('variantId') is not None:key=sourcekeys.get((site['id'],str(row['variantId'])),key)
 return key,matched
def main():
 sites=json.loads((ROOT/'crawler/sites.json').read_text());seed=json.loads((ROOT/'lib/catalog-data.json').read_text())
 data=[];reports=[]
 for site in sites:
  p=ROOT/'data/crawl/raw'/f"{site['id']}.json"
  if p.exists():
   d=json.loads(p.read_text());data.extend((site,row) for row in d['products']);reports.append(d['report'])
  else:reports.append({'id':site['id'],'name':site['name'],'website':site['url'],'status':'pending','productCount':0,'complete':False,'notes':['Crawl pending.'],'brands':[]})
 aliases=json.loads((ROOT/'crawler/brand-aliases.json').read_text())
 for site,row in data:row['brand']=aliases.get(row['brand'].lower(),row['brand'])
 # Canonicalize vendor spelling across retailers, retaining the most frequent readable name.
 spellings=collections.defaultdict(collections.Counter)
 for s,r in data:spellings[norm(r['brand'])][r['brand']]+=1
 canonical={k:v.most_common(1)[0][0] for k,v in spellings.items()}
 # Infer only explicit leading brand names already supplied elsewhere by a retailer.
 known=sorted((b for b in canonical.values() if b!='Unspecified'),key=len,reverse=True)
 for s,r in data:
  if r['brand']=='Unspecified':
   for b in known:
    if re.match('^'+re.escape(b)+r'(?=$|[\s\-:])',r['name'],re.I):r['brand']=b;break
 # A barcode repeated on different products at one store is unreliable for matching.
 barcode_usage=collections.defaultdict(set)
 for s,r in data:
  g=gtin(r.get('barcode',''))
  if g:barcode_usage[(s['id'],g)].add(r['sourceId'])
 bad={g for (sid,g),ids in barcode_usage.items() if len(ids)>1}
 products={};gallery={};sourcekeys={};stores={s['id']:{'id':s['id'],'name':s['name'],'website':s['url'],'builtin':True} for s in sites}
 for p in seed['products']:
  products[p['id']]=p
  for o in p['offers']:sourcekeys[(o['storeId'],str(o.get('variantId')))]=p['id']
 for s in seed['stores']:
  if s['id'] not in stores:stores[s['id']]=s
 for s,r in data:
  r['brand']=canonical[norm(r['brand'])]
  if r['brand'].lower() in ['maisto','bburago']:continue
  category=categorize(r['name'])
  if category is None:continue
  b=r['brand'];variant=r['variant'];key,matched=product_key(s,r,bad,sourcekeys)
  offer={'storeId':s['id'],'storeName':s['name'],'price':r['price'],'mrp':r.get('mrp'),'shipping':r.get('shipping'),'inStock':r['inStock'],'url':r['url'],'checkedAt':r['checkedAt'],'source':'crawl'}
  # Retain source endpoint provenance without putting remote prices into code.
  if r.get('fetchUrl'):offer.update(fetchUrl=r['fetchUrl'],variantId=r.get('variantId'))
  if key not in products:products[key]={'id':key,'name':r['name'],'brand':b,'category':category,'variant':variant,'image':r['image'],'offers':[],'variantCount':r.get('variantCount'),'matchType':matched}
  # Extra photos go to a separate file so the catalog the gear page downloads stays small.
  if len(r.get('images') or [])>1:gallery.setdefault(key,r['images'])
  p=products[key];p['offers']=[o for o in p['offers'] if o['storeId']!=s['id']]+[offer]
  if r.get('variantId') is not None:sourcekeys[(s['id'],str(r['variantId']))]=key
 # Keep exactly matched variants in curated comparisons and list all other source products independently.
 result=list(products.values());brands=collections.defaultdict(lambda:{'count':0,'stores':set(),'categories':set()});cats=collections.Counter()
 for p in result:
  cats[p['category']]+=1
  if p['brand']=='Unspecified':continue
  key=norm(p['brand']);canonical_name=canonical.get(key,p['brand']);p['brand']=canonical_name
  d=brands[canonical_name];d['count']+=1;d['stores'].update(o['storeName'] for o in p['offers']);d['categories'].add(p['category'])
 brandlist=[{'name':b,'count':v['count'],'stores':sorted(v['stores']),'categories':sorted(v['categories'])} for b,v in sorted(brands.items(),key=lambda x:x[0].lower())]
 summary={'generatedAt':max((r.get('finishedAt','') for r in reports),default='') or datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),'requestedStores':len(sites),'attemptedStores':sum(r['status']!='pending' for r in reports),'collectedStores':sum(r['productCount']>0 for r in reports),'productCount':len(result),'offerCount':sum(len(p['offers']) for p in result),'brandCount':len(brandlist),'categories':dict(cats),'method':'Python Playwright','scope':'Public catalog listings; each card shows one observed variant. Other sizes and colours remain on the retailer website.','matchedProducts':sum(len(p['offers'])>1 for p in result)}
 payload={'products':result,'stores':list(stores.values()),'brands':brandlist,'reports':reports,'summary':summary}
 dest=ROOT/'public/data/catalog.json';tmp=dest.with_suffix('.tmp');tmp.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')));tmp.replace(dest)
 (ROOT/'data/crawl/report.json').write_text(json.dumps({'summary':summary,'reports':reports},ensure_ascii=False,indent=2))
 (ROOT/'public/data/images.json').write_text(json.dumps({k:gallery[k] for k in products if k in gallery},ensure_ascii=False,separators=(',',':')))
 (ROOT/'public/data/brands.json').write_text(json.dumps(brandlist,ensure_ascii=False,indent=2))
 # Compact server-side identities keep imported offers from merging unrelated variants.
 (ROOT/'lib/crawl-index.json').write_text(json.dumps({'stores':list(stores.values()),'products':[{'id':p['id'],'name':p['name'],'brand':p['brand'],'variant':p['variant']} for p in result]},ensure_ascii=False,separators=(',',':')))
 print(json.dumps(summary,ensure_ascii=False,indent=2));print('Catalog bytes:',dest.stat().st_size)
if __name__=='__main__':main()
