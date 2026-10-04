import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'crawler'))
from crawl import RobotsRules,categorize,shopify_products,json_products,slickshop_products
from export import gtin,product_key
class CrawlerTests(unittest.TestCase):
 def test_robots_specific_rule_beats_allow_root(self):
  r=RobotsRules();r.parse(['User-agent: *','Allow: /','Disallow: /cart','Disallow: /*?*sort_by=*','Allow: /cart/help'])
  self.assertFalse(r.can_fetch('RideCompareBot','https://store.in/cart.js'))
  self.assertFalse(r.can_fetch('RideCompareBot','https://store.in/collections/all?sort_by=price'))
  self.assertTrue(r.can_fetch('RideCompareBot','https://store.in/cart/help'))
  self.assertTrue(r.can_fetch('RideCompareBot','https://store.in/products.json?page=1'))
 def test_variant_price_and_stock_stay_together(self):
  p={'id':1,'title':'Axor Apex Helmet','vendor':'Axor','handle':'apex','images':[],'variants':[{'id':1,'title':'M','price':'4500','available':False},{'id':2,'title':'L','price':'5498','available':True}]}
  out=shopify_products([p],{'id':'a','url':'https://store.in'},'2026-10-04T17:00:00Z')[0]
  self.assertEqual((out['variant'],out['price'],out['variantId']),('L',5498,2))
 def test_foreign_currency_and_missing_prices_are_not_imported(self):
  html='<script type="application/ld+json">{"@type":"Product","name":"Helmet","offers":{"priceCurrency":"USD","price":150}}</script>'
  self.assertEqual(json_products(html,'https://store.in/p',{'id':'test','url':'https://store.in'},'now'),[])
 def test_helmet_spares_do_not_become_helmets(self):
  self.assertEqual(categorize('Axor helmet pinlock visor'),'Helmet Accessories')
  self.assertEqual(categorize('Rynox riding jeans'),'Pants')
  self.assertEqual(categorize('Motul C2 chain lube'),'Maintenance & Parts')
 def test_invalid_barcode_does_not_match(self):
  self.assertEqual(gtin('0000000000000'),'')
  self.assertEqual(gtin('1234567890123'),'')
  self.assertEqual(gtin('4006381333931'),'04006381333931')
 def test_unrelated_car_parts_and_models_are_excluded(self):
  for title in ['KONI BMW X5 Shocks','Toyota Hilux Suspension','BMW 5-Series Air Filter','Maisto 1:12 Motorcycle Scale Model']:
   self.assertIsNone(categorize(title))
  self.assertEqual(categorize('BMW R1250GS crash guard'),'Bike Accessories')
  self.assertEqual(categorize('Yamaha R15 V3 DB Visor'),'Bike Accessories')
 def test_products_without_variant_ids_remain_separate(self):
  row={'sourceId':'100','brand':'Raida','name':'Gloves','variant':'Check size / colour at store'}
  a,_=product_key({'id':'raida'},row,set(),{('raida','None'):'another-product'})
  b,_=product_key({'id':'raida'},{**row,'sourceId':'101'},set(),{})
  self.assertEqual(a,'raida-100');self.assertNotEqual(a,b)
 def test_slickshop_uses_sale_price_and_preserves_unknown_size(self):
  html='<li class="ssx2-card product instock"><a class="ssx2-card-in" href="/product/shoei-helmet/"><span class="ssx2-brand">Shoei</span><span class="ssx2-name">Shoei Helmet</span><span class="ssx2-price-now">₹47,300</span><span class="ssx2-price-was">₹69,758</span></a></li>'
  row=slickshop_products(html,'https://slickshop.in/shop/','2026-10-04T18:00:00Z')[0]
  self.assertEqual(row['price'],47300);self.assertTrue(row['inStock']);self.assertEqual(row['variant'],'Check size / colour at store')
 def test_slickshop_without_stock_signal_remains_unknown(self):
  html='<a class="ssh-card" href="https://slickshop.in/product/gloves/"><span class="ssh-card-brand">Spidi</span><span class="ssh-card-name">Gloves</span><span class="ssh-now">₹4,500</span></a>'
  row=slickshop_products(html,'https://slickshop.in/','now')[0]
  self.assertIsNone(row['inStock']);self.assertEqual(row['category'],'Gloves')
if __name__=='__main__':unittest.main()
