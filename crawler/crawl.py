"""Public motorcycle catalog crawler, using Python Playwright only for networking.
No sign-in, CAPTCHA solving, stealth, proxy rotation or rate-limit bypass.
Run python crawler/crawl.py --max-feed-pages 40 --max-html-pages 120
Every retailer is checkpointed; --resume preserves completed source results.
"""
import argparse, asyncio, hashlib, json, re, time
from html import unescape
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote
from urllib.robotparser import RobotFileParser
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/crawl/raw'
BOT='RideCompareBot'
CATEGORIES=['Helmets','Helmet Accessories','Jackets','Gloves','Pants','Boots','Luggage','Riding Apparel','Protection','Electronics','Bike Accessories','Maintenance & Parts']
BRAND_ALIASES={'rynox gears':'Rynox','rynox gear':'Rynox','rynox':'Rynox','axor helmets':'Axor','axor':'Axor','viaterra gear':'ViaTerra','viaterra':'ViaTerra','via terra':'ViaTerra','mt helmets':'MT Helmets','mt':'MT Helmets','smk helmets':'SMK','smk':'SMK','ls2 helmets':'LS2','ls2':'LS2','dsg':'DSG','dream sporting gear':'DSG','motul':'Motul','vega':'Vega','raida':'Raida','solace':'Solace','solace riding gear':'Solace','clan':'Clan','agv helmets':'AGV','agv':'AGV','steelbird':'Steelbird','royal enfield':'Royal Enfield','royalenfield':'Royal Enfield','jb racing':'JB Racing','legundary custom':'Legundary Custom','reisemoto':'Reise','reise':'Reise'}
KNOWN=['Alpinestars','Dainese','Rynox','ViaTerra','Axor','Vega','Steelbird','SMK','LS2','MT Helmets','KYT','AGV','Bell','Shoei','Arai','Shark','HJC','Richa','Rev\'it','Revit','Racer','Spidi','Solace','Raida','DSG','Cramster','Clan','Reise','Motul','Muc-Off','Liqui Moly','Putoline','Motorex','BBG','BBGears','Korda','Klim','Rukka','Ixon','Furygan','Barkbusters','SW-Motech','Givi','Shad','BMC','K&N','NGK','Bobo','Maddog','HJG','Zana','Legundary','JB Racing','Sena','Cardo','Bluarmor','Carbonado','DirtSack','Dirtsack','Rage','Rynox','Bikeratti','Ridetek','Scoyco','Tarmac','Mototech','Royal Enfield','Fego','Grand Pitstop','Grandpitstop','Acerbis','Leatt','Forma','TCX','R&G','Evotech','RAM Mounts','Quad Lock','Kriega','Lone Ranger','Tiivra','Scala','Bolt','Enduristan','Wurth','Stalwart','Studds','Ignyte','Royal Enfield X Alpinestars']

def now():return datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
def clean(v):return re.sub(r'\s+',' ',str(v or '')).strip()
def slug(v):return re.sub(r'[^a-z0-9]+','-',v.lower()).strip('-')
def brand(value,title='',default=''):
 value=clean(value)
 if value.lower() in BRAND_ALIASES:return BRAND_ALIASES[value.lower()]
 for b in sorted(KNOWN,key=len,reverse=True):
  if re.match(r'^'+re.escape(b)+r'\b',title,re.I):return BRAND_ALIASES.get(b.lower(),b)
 if default:return default
 if not value or value.lower() in ['default','generic','unbranded','others','other','motocentral','moto central','bandidos pitstop','lrl motors','powersports','planetdsg.com','reisemoto','bikester global','custom elements','store4riders','accessories']:return 'Unspecified'
 return value if len(value)<65 else 'Unspecified'
def categorize(title,kind='',tags=''):
 t=f'{title} {kind}'.lower();extra=str(tags).lower()
 if re.search(r'\b(car|mercedes|benz|toyota|lexus|volkswagen|vw|skoda|audi|isuzu|hyundai|kia|mahindra|land rover|range rover|bmw\s*(?:[1-8][ -]?series|x[1-7])|xuv\w*|polo|innova|swift|fortuner|hilux|jimny|kushaq|taigun|slavia|virtus|thar|scorpio|bolero)\b',t) and not re.search(r'motorcycle|motorbike|riding|helmet',t):return None
 if re.search(r'die.?cast|scale model|\b1:(12|18|24|32|43|64)\b|gift card',t):return None
 if re.search(r'windscreen|windshield|(?:db|bubble|touring) visor',t) or ('visor' in t and re.search(r'\br15|pulsar|x.?pulse|duke|himalayan|dominar|interceptor|continental gt',t)):return 'Bike Accessories'
 if re.search(r'visor|pinlock|helmet (liner|padding|pad|bag|spoiler)|cheek pad|chin (curtain|strap)|tear.?off',t):return 'Helmet Accessories'
 if re.search(r'helmet',t):return 'Helmets'
 if re.search(r'glove',t):return 'Gloves'
 if re.search(r'jacket|riding suit|race suit',t):return 'Jackets'
 if re.search(r'riding (pant|jean)|trouser|\bpants?\b|\bjeans\b',t):return 'Pants'
 if re.search(r'boot|riding shoe|riding sneaker|\bshoes\b',t):return 'Boots'
 if re.search(r'saddlebag|saddle bag|tailbag|tail bag|tank bag|pannier|top (box|case)|backpack|rucksack|duffel|luggage|dry.?bag|waist bag',t):return 'Luggage'
 if re.search(r'balaclava|t.shirt|base.?layer|shirt|jersey|hoodie|sweatshirt|rain (coat|suit)|thermal|neck gaiter|arm sleeve|socks|\bcap\b|bandana',t):return 'Riding Apparel'
 if re.search(r'knee|elbow|armou?r|chest protect|back protect|kidney belt',t):return 'Protection'
 if re.search(r'intercom|bluetooth|cardo|sena|bluarmor|camera|gps|mobile|phone|charger|usb|navigation',t):return 'Electronics'
 if re.search(r'oil|lube|lubricant|cleaner|cleaning|chain|sprocket|brake|filter|spark|tyre|tire|battery|clutch|exhaust|polish|coolant|bushing|bearing|radiator hose',t):return 'Maintenance & Parts'
 return 'Bike Accessories'
def money(value):
 try:return round(float(str(value).replace(',','').replace('₹','').strip()),2)
 except:return None

def shopify_products(items,site,checked):
 rows=[]
 for item in items:
  title=clean(item.get('title'));cat=categorize(title,item.get('product_type',''),item.get('tags',[]))
  if not title or not cat:continue
  variants=item.get('variants',[]);valid=[v for v in variants if money(v.get('price')) and money(v.get('price'))>0]
  if not valid:continue
  valid.sort(key=lambda v:(not bool(v.get('available')),money(v.get('price'))))
  v=valid[0];price=money(v['price']);variant=clean(v.get('title'))
  mrp=money(v.get('compare_at_price'));mrp=mrp if mrp and mrp>price else None
  if variant.lower()=='default title':variant='Standard'
  imgs=[i['src'] for i in item.get('images',[])[:6] if i.get('src')];img=imgs[0] if imgs else ''
  base=site['url']+'/products/'+item['handle'];url=base+'?variant='+str(v['id']);b=brand(item.get('vendor'),title,site.get('brand',''))
  rows.append({'sourceId':str(item['id']),'name':title,'brand':b,'category':cat,'variant':variant,'image':img,'images':imgs,'price':price,'mrp':mrp,'shipping':None,'inStock':bool(v.get('available')),'url':url,'checkedAt':checked,'variantId':v['id'],'fetchUrl':base+'.js','variantCount':len(valid),'options':[{'id':x['id'],'title':clean(x.get('title')),'price':money(x['price']),'inStock':bool(x.get('available')),'barcode':clean(x.get('barcode'))} for x in valid], 'barcode':clean(v.get('barcode'))})
 return rows

def json_products(html,page_url,site,checked):
 soup=BeautifulSoup(html,'html.parser');objects=[]
 def walk(x):
  if isinstance(x,list):
   for y in x:walk(y)
  elif isinstance(x,dict):
   typ=x.get('@type',[]);typ=[typ] if isinstance(typ,str) else typ
   if 'Product' in typ:objects.append(x)
   for k in ['@graph','itemListElement','item']: 
    if k in x:walk(x[k])
 for script in soup.select('script[type="application/ld+json"]'):
  try:walk(json.loads(script.string or script.get_text()))
  except (ValueError,TypeError):pass
 rows=[]
 for p in objects:
  offers=p.get('offers',[]);offers=offers if isinstance(offers,list) else [offers]
  offers=[o for o in offers if isinstance(o,dict) and o.get('priceCurrency')=='INR' and money(o.get('price')) and money(o.get('price'))>0]
  if not offers:continue
  o=min(offers,key=lambda o:money(o['price']));title=clean(p.get('name'));cat=categorize(title)
  if not title or not cat:continue
  bv=p.get('brand',{});bv=bv.get('name','') if isinstance(bv,dict) else bv
  img=p.get('image','');img=img[0] if isinstance(img,list) and img else img;img=img.get('url','') if isinstance(img,dict) else img
  url=urljoin(page_url,o.get('url') or p.get('url') or page_url)
  if urlparse(url).hostname!=urlparse(site['url']).hostname:continue
  avail=o.get('availability','');stock=True if 'InStock' in avail else False if ('OutOfStock' in avail or 'SoldOut' in avail) else None
  rows.append({'sourceId':clean(p.get('sku')) or hashlib.sha1(url.encode()).hexdigest()[:16],'name':title,'brand':brand(bv,title,site.get('brand','')),'category':cat,'variant':clean(p.get('size') or p.get('color')) or 'Check size / colour at store','image':urljoin(page_url,img) if img else '', 'price':money(o['price']),'shipping':None,'inStock':stock,'url':url,'checkedAt':checked,'variantCount':None,'options':[],'barcode':clean(p.get('gtin13') or p.get('gtin14') or p.get('gtin12') or p.get('gtin8'))})
 if site['id'] in ['steelbird','store4riders']:
  selectors='.product-item' if site['id']=='store4riders' else 'a[href*="productlisting/details"]'
  for card in soup.select(selectors):
   a=card.select_one('a.product-item-link') if site['id']=='store4riders' else card
   if not a:continue
   price_node=card.select_one('[data-price-type="finalPrice"] [data-price-amount], [data-price-type="finalPrice"], .price')
   price_text=price_node.get('data-price-amount') or price_node.get_text(' ',strip=True) if price_node else ''
   prices=re.findall(r'[0-9][0-9,]*(?:\.[0-9]{1,2})?',price_text)
   if not prices:continue
   price=money(prices[-1])
   if not price or price<=0:continue
   title_node=card.select_one('.product-item-link, h2, h3, h4, h5, h6')
   img=card.select_one('img')
   title=clean(title_node.get_text(' ',strip=True)) if title_node else clean(img.get('alt','') if img else '')
   if not title:continue
   cat=categorize(title)
   if not cat:continue
   url=urljoin(page_url,a.get('href',''))
   image=urljoin(page_url,img.get('data-src') or img.get('src','')) if img else ''
   rows.append({'sourceId':hashlib.sha1(url.encode()).hexdigest()[:16],'name':title,'brand':brand('',title,site.get('brand','')),'category':cat,'variant':'Check size / colour at store','image':image,'price':price,'shipping':None,'inStock':None,'url':url,'checkedAt':checked,'variantCount':None,'options':[],'barcode':''})
 return rows

def slickshop_products(html,page_url,checked):
 soup=BeautifulSoup(html,'html.parser');rows={}
 for card in soup.select('li.ssx2-card, a.ssh-card, a.ssh-hero-tile'):
  a=card if card.name=='a' else card.select_one('a.ssx2-card-in')
  title=card.select_one('.ssx2-name, .ssh-card-name, .ssh-hero-tile-name')
  price_node=card.select_one('.ssx2-price-now, .ssh-now')
  vendor=card.select_one('.ssx2-brand, .ssh-card-brand');img=card.select_one('img')
  if not a or not title or not price_node:continue
  price_text=price_node.get_text(' ',strip=True)
  if '₹' not in price_text:continue
  amounts=re.findall(r'[0-9][0-9,]*(?:\.[0-9]{1,2})?',price_text)
  price=money(amounts[0]) if amounts else None;name=clean(title.get_text());category=categorize(name)
  if not price or not category:continue
  url=urljoin(page_url,a.get('href',''))
  if urlparse(url).hostname!='slickshop.in' or '/product/' not in url:continue
  classes=card.get('class',[]);stock=True if 'instock' in classes else False if 'outofstock' in classes else None
  # These cards expose product-level prices, not a selected size or colour.
  rows[url]={'sourceId':hashlib.sha1(url.encode()).hexdigest()[:16],'name':name,'brand':brand(vendor.get_text() if vendor else '',name),'category':category,'variant':'Check size / colour at store','image':urljoin(page_url,img.get('src','')) if img else '', 'price':price,'shipping':None,'inStock':stock,'url':url,'checkedAt':checked,'variantCount':None,'options':[],'barcode':''}
 return list(rows.values())

class RobotsRules(RobotFileParser):
 def can_fetch(self, agent, url):
  if self.disallow_all:return False
  if self.allow_all:return True
  matches=[e for e in self.entries if any(a.lower() in agent.lower() for a in e.useragents)]
  entry=max(matches,key=lambda e:max(len(a) for a in e.useragents)) if matches else self.default_entry
  if not entry:return True
  u=urlparse(url);path=u.path or '/' ;path+=('?' + u.query) if u.query else ''
  applicable=[]
  for rule in entry.rulelines:
   pattern=unquote(rule.path)
   if not pattern:continue
   end=pattern.endswith('$');pattern=pattern[:-1] if end else pattern
   regex='^'+re.escape(pattern).replace(r'\*','.*')+('$' if end else '')
   if re.search(regex,path):applicable.append((len(pattern.replace('*','')),rule.allowance))
  return max(applicable)[1] if applicable else True

class CrawlBlocked(Exception):pass
class Crawler:
 def __init__(self,context,site,args):
  self.ctx=context;self.site=site;self.args=args;self.robots=None;self.last=0;self.started=time.monotonic();self.delay=1.0;self.report={'id':site['id'],'name':site['name'],'website':site.get('start',site['url']),'startedAt':now(),'status':'running','method':'','pages':0,'productCount':0,'brands':[],'notes':[],'complete':False};self.rows=[]
 async def request(self,url,robots=False):
  if time.monotonic()-self.started>self.args.max_seconds:raise CrawlBlocked('Collection time limit reached; an additional crawl may find more listings.')
  if not robots and self.robots and not self.robots.can_fetch(BOT,url):raise CrawlBlocked('robots.txt disallows this URL')
  # Shopify answers 429 to the whole server IP for a while after heavy use; wait it out and slow down.
  for wait in [30,90,240,0]:
   await asyncio.sleep(max(0,self.delay-(time.monotonic()-self.last)));self.last=time.monotonic()
   response=await self.ctx.request.get(url,timeout=25000,max_redirects=4)
   status=response.status
   if status!=429 or not wait:break
   await response.dispose();retry=response.headers.get('retry-after','')
   self.delay=max(self.delay,3.0);await asyncio.sleep(int(retry) if retry.isdigit() and int(retry)<600 else wait)
  content_type=response.headers.get('content-type','')
  if any(content_type.startswith(t) for t in ['image/','video/','audio/','application/pdf']):
   await response.dispose();return 415,''
  body=await response.text();await response.dispose()
  if not robots:self.report['pages']+=1
  if status in [401,403,429]:raise CrawlBlocked(f'HTTP {status}: retailer access restriction')
  if status==202:raise CrawlBlocked('HTTP 202: retailer did not return a readable catalog page')
  if status>=500:raise CrawlBlocked(f'HTTP {status}: retailer temporarily unavailable')
  if len(body)>12*1024*1024:raise CrawlBlocked('Page exceeds the 12 MB response limit')
  return status,body
 async def run(self):
  path=OUT/(self.site['id']+'.json')
  try:
   try:
    status,robots=await self.request(self.site['url']+'/robots.txt',robots=True)
    if status==200:
     self.robots=RobotsRules();self.robots.parse(robots.splitlines());self.delay=max(1,self.robots.crawl_delay(BOT) or 1)
     self.report['robots']='checked';self.report['sitemaps']=self.robots.site_maps() or []
    elif status in [404,410]:self.report['robots']='not-published'
    else:raise CrawlBlocked(f'robots.txt unavailable (HTTP {status})')
   except CrawlBlocked:raise
   except Exception as e:raise CrawlBlocked('Could not verify robots.txt: '+str(e).split('\n')[0][:160])
   start=self.site.get('start',self.site['url'])
   if self.robots and not self.robots.can_fetch(BOT,start):raise CrawlBlocked('robots.txt disallows the relevant listing pages')
   status,home=await self.request(start)
   if re.search(r'<title>[^<]*(just a moment|access denied|robot check|captcha)',home,re.I):raise CrawlBlocked('The store requires a browser verification or CAPTCHA')
   if status>=400:raise CrawlBlocked(f'Listing page returned HTTP {status}')
   soup=BeautifulSoup(home,'html.parser');shopify='cdn.shopify.com' in home or 'Shopify.theme' in home or 'myshopify.com' in home
   if self.site['id']=='slickshop':
    self.report['method']='Public storefront HTML via Python Playwright'
    await self.slickshop(start,home)
   elif shopify:
    self.report['method']='Shopify public catalog via Playwright'
    await self.shopify(home)
   elif 'woocommerce' in home.lower():
    self.report['method']='WooCommerce public catalog via Playwright'
    await self.woocommerce(start,home)
   else:
    self.report['method']='Playwright rendered pages / JSON-LD'
    await self.html(start,home)
   self.report['status']=('collected' if self.report['complete'] else 'partial') if self.rows else 'no-readable-products'
   if not self.rows:self.report['notes'].append('No public INR product offers could be extracted. An approved feed or site-specific adapter is needed.')
  except CrawlBlocked as e:
   self.report['status']='partial' if self.rows else 'restricted';self.report['notes'].append(str(e))
  except Exception as e:
   self.report['status']='partial' if self.rows else 'failed';self.report['notes'].append(str(e).split('\n')[0][:200])
  self.report['finishedAt']=now();self.report['productCount']=len(self.rows);self.report['brands']=sorted(set([r['brand'] for r in self.rows if r['brand']!='Unspecified']+self.report.get('listedBrands',[])))
  payload={'report':self.report,'products':self.rows};path.write_text(json.dumps(payload,ensure_ascii=False),encoding='utf-8')
  print(json.dumps({k:self.report[k] for k in ['id','status','pages','productCount','notes']},ensure_ascii=False),flush=True)
  return payload
 async def slickshop(self,start,home):
  self.rows=slickshop_products(home,start,now());by_url={r['url']:r for r in self.rows}
  status,html=await self.request(self.site['url']+'/shop/')
  if status!=200:raise CrawlBlocked(f'Shop page returned HTTP {status}')
  by_url.update((r['url'],r) for r in slickshop_products(html,self.site['url']+'/shop/',now()))
  config_node=BeautifulSoup(html,'html.parser').select_one('#ssx-shop[data-config]')
  config=json.loads(config_node['data-config']) if config_node else {}
  self.report['retailerReportedProducts']=config.get('total')
  self.report['listedBrands']=[unescape(b['name']) for b in config.get('brandsAll',[])]
  self.rows=list(by_url.values());restricted=0;consecutive_restricted=0
  for i,b in enumerate(config.get('brandsAll',[])[:self.args.max_html_pages]):
   url=self.site['url']+'/brands/'+b['slug']+'/'
   try:status,html=await self.request(url)
   except CrawlBlocked as e:
    if time.monotonic()-self.started>self.args.max_seconds:raise
    restricted+=1;consecutive_restricted+=1
    if consecutive_restricted>=5:
     self.report['notes'].append('Stopped checking brand pages after five consecutive access restrictions.');break
    continue
   if status!=200:continue
   consecutive_restricted=0
   by_url.update((r['url'],r) for r in slickshop_products(html,url,now()));self.rows=list(by_url.values())
   if (i+1)%10==0:print(f"slickshop: {len(self.rows)} listings from {i+1} brand pages",flush=True)
  self.rows=list(by_url.values())
  self.report['complete']=False
  self.report['notes'].append('Only accessible homepage, shop and brand listings are included. Full catalog pagination is not included in this snapshot.')
  if restricted:self.report['notes'].append(f'{restricted} brand pages also restricted automated access.')
 async def shopify(self,home):
  # Verify the currency from the public storefront instead of a cart endpoint.
  match=re.search(r'Shopify\.currency\s*=\s*(\{[^;]+?\})',home)
  try:currency=json.loads(match.group(1)).get('active') if match else None
  except:currency=None
  if currency!='INR':raise CrawlBlocked('The public storefront currency could not be verified as INR')
  seen=set()
  for page in range(1,self.args.max_feed_pages+1):
   try:status,text=await self.request(self.site['url']+f'/products.json?limit=250&page={page}')
   except CrawlBlocked:
    if not self.rows:raise
    self.report['notes'].append(f'Catalog stopped on feed page {page}; previous pages retained.');return
   try:items=json.loads(text)['products']
   except:raise CrawlBlocked('Public catalog feed unavailable; approved retailer feed required')
   fresh=[p for p in items if p['id'] not in seen];seen.update(p['id'] for p in items)
   self.rows.extend(shopify_products(fresh,self.site,now()))
   if not fresh or len(items)<250:self.report['complete']=True;return
   if page%5==0:print(f"{self.site['id']}: {len(self.rows)} catalog listings",flush=True)
  self.report['notes'].append(f'Reached {self.args.max_feed_pages} feed pages. Increase --max-feed-pages to collect the remaining catalog.');self.report['status']='partial'
 async def woocommerce(self,start,home):
  for page in range(1,self.args.max_feed_pages+1):
   url=self.site['url']+f'/wp-json/wc/store/v1/products?per_page=100&page={page}'
   if self.robots and not self.robots.can_fetch(BOT,url):
    self.report['notes'].append('Public Store API is excluded by robots.txt; using permitted product pages.')
    return await self.html(start,home)
   status,text=await self.request(url)
   try:items=json.loads(text)
   except:items=None
   if status in [404,400] or not isinstance(items,list):
    if self.rows:self.report['complete']=True;return
    return await self.html(start,home)
   for item in items:
    if item.get('is_password_protected'):continue
    prices=item.get('prices',{})
    if prices.get('currency_code')!='INR':continue
    price=money(prices.get('price'))
    if not price:continue
    price=round(price/(10**int(prices.get('currency_minor_unit',2))),2)
    mrp=money(prices.get('regular_price'));mrp=round(mrp/(10**int(prices.get('currency_minor_unit',2))),2) if mrp else None;mrp=mrp if mrp and mrp>price else None
    title=BeautifulSoup(item.get('name',''),'html.parser').get_text();cat=categorize(title)
    if not cat:continue
    brands=item.get('brands',[]);b=brands[0].get('name','') if brands else ''
    imgs=[i['src'] for i in (item.get('images') or [])[:6] if i.get('src')];img=imgs[0] if imgs else ''
    self.rows.append({'sourceId':str(item['id']),'name':title,'brand':brand(b,title,self.site.get('brand','')),'category':cat,'variant':item.get('variation') or 'Check size / colour at store','image':img,'images':imgs,'price':price,'mrp':mrp,'shipping':None,'inStock':item.get('is_in_stock'),'url':item['permalink'],'checkedAt':now(),'variantCount':None,'options':[],'barcode':''})
   if len(items)<100:self.report['complete']=True;return
   if page%10==0:print(f"{self.site['id']}: {len(self.rows)} catalog listings",flush=True)
  self.report['notes'].append(f'Reached {self.args.max_feed_pages} public feed pages; more may remain.')

 async def html(self,start,home):
  seen=set();urls=[];source_pages=[]
  def links(html,url):
   soup=BeautifulSoup(html,'html.parser')
   for a in soup.select('a[href]'):
    link=urljoin(url,a['href']).split('#')[0]
    if urlparse(link).hostname!=urlparse(self.site['url']).hostname:continue
    if re.search(r'/(products?|productlisting|shop|collections|riding|helmets?|apparel|gear|accessories|motorcycle)[/-]',urlparse(link).path,re.I) or re.search(r'\.html$',urlparse(link).path):
     if not re.search(r'login|cart|checkout|account|wishlist|compare|add-to|\?filter|\?sort|\.(jpg|png|webp|jpeg|gif|pdf)(\?|$)',link,re.I):urls.append(link)
  self.rows.extend(json_products(home,start,self.site,now()));links(home,start);source_pages.append(start)
  # Sitemaps are discovery documents, not product offers.
  sitemaps=self.report.get('sitemaps',[])[:3] or [self.site['url']+'/sitemap.xml']
  for sm in sitemaps:
   if urlparse(sm).hostname!=urlparse(self.site['url']).hostname:continue
   try:
    status,xml=await self.request(sm)
    if status!=200:continue
    root=ET.fromstring(xml);locs=[x.text for x in root.iter() if x.tag.endswith('loc') and x.text]
    for loc in locs:
     if 'sitemap' in loc and ('product' in loc or 'shop' in loc):
      st,child=await self.request(loc)
      if st==200:
       sub=ET.fromstring(child);urls.extend(x.text for x in sub.iter() if x.tag.endswith('loc') and x.text and not re.search(r'\.(jpg|png|webp|jpeg|gif|pdf)(\?|$)',x.text,re.I))
     elif '/product' in loc or '.html' in loc:urls.append(loc)
   except CrawlBlocked:continue
   except Exception:continue
  page=await self.ctx.new_page()
  await page.route('**/*',lambda route:route.abort() if route.request.resource_type in ['image','font','media'] else route.continue_())
  # Use browser rendering to discover script-built product lists.
  try:
   resp=await page.goto(start,wait_until='domcontentloaded',timeout=25000)
   if resp and resp.status in [401,403,429]:raise CrawlBlocked(f'Browser returned HTTP {resp.status}')
   await page.wait_for_timeout(1200);rendered=await page.content();links(rendered,start);self.rows.extend(json_products(rendered,start,self.site,now()))
  except CrawlBlocked:raise
  except Exception as e:self.report['notes'].append('Some browser-rendered content was unavailable.')
  finally:await page.close()
  index=0
  while index<len(urls) and len(seen)<self.args.max_html_pages:
   url=urls[index];index+=1
   if url in seen or url in source_pages:continue
   if urlparse(url).hostname!=urlparse(self.site['url']).hostname:continue
   seen.add(url)
   if self.robots and not self.robots.can_fetch(BOT,url):continue
   status,html=await self.request(url)
   if status!=200:continue
   self.rows.extend(json_products(html,url,self.site,now()));links(html,url)
   unique={r['url']:r for r in self.rows};self.rows=list(unique.values())
  self.report['complete']=index>=len(urls)
  if not self.report['complete']:self.report['notes'].append(f'Collected {len(seen)} public pages; more discovered URLs remain. Rerun with a larger --max-html-pages limit.')

async def main(args):
 OUT.mkdir(parents=True,exist_ok=True);sites=json.loads((ROOT/'crawler/sites.json').read_text())
 if args.sites:sites=[s for s in sites if s['id'] in args.sites.split(',')]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path=args.browser or None)
  semaphore=asyncio.Semaphore(3)
  async def one(site):
   path=OUT/(site['id']+'.json')
   if args.resume and path.exists():return json.loads(path.read_text())
   async with semaphore:
    ctx=await browser.new_context(user_agent='Mozilla/5.0 (compatible; RideCompareBot/1.0; public product comparison)',locale='en-IN')
    try:return await Crawler(ctx,site,args).run()
    finally:await ctx.close()
  await asyncio.gather(*(one(s) for s in sites));await browser.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--max-feed-pages',type=int,default=40);a.add_argument('--max-html-pages',type=int,default=120);a.add_argument('--max-seconds',type=int,default=1200);a.add_argument('--browser');a.add_argument('--sites');a.add_argument('--resume',action='store_true');asyncio.run(main(a.parse_args()))
