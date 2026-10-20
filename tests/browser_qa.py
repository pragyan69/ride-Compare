"""Browser checks against a running preview with a populated catalog.
BASE_URL=http://127.0.0.1:5173 .venv/bin/python tests/browser_qa.py"""
import asyncio,os,re
from playwright.async_api import async_playwright

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path=os.environ.get('BROWSER_EXECUTABLE'))
  page=await browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.add_init_script("window.registeredTools={}; document.modelContext={registerTool:(tool,options)=>{window.registeredTools[tool.name]=tool;options.signal.addEventListener('abort',()=>delete window.registeredTools[tool.name])}}")
  base=os.environ.get('BASE_URL','http://127.0.0.1:5173')
  await page.goto(base,wait_until='domcontentloaded',timeout=60000)
  await page.get_by_role('heading',level=1).first.wait_for()
  await page.wait_for_load_state('networkidle')
  stats=await page.locator('.stat-row').inner_text()
  print('Home stats',stats.replace('\n',' | '))
  assert 'listings' in stats
  await page.screenshot(path='/tmp/ridecompare-home.png',full_page=False)
  # Search with typeahead
  box=page.get_by_role('textbox',name='Search motorcycle gear').first
  await box.click(); await box.type('helmet',delay=30)
  await page.locator('.suggest').wait_for(timeout=10000)
  print('Suggestions',await page.locator('.suggest a').count())
  await box.press('Enter')
  await page.wait_for_url(re.compile(r'/gear\?q=helmet'))
  await page.locator('.card').first.wait_for(); await page.wait_for_load_state('networkidle')
  print('Search cards',await page.locator('.card').count(),'|',await page.locator('.results-head p').inner_text())
  # Filters: in stock + sort
  await page.get_by_label('In stock only').check()
  await page.wait_for_url(re.compile(r'inStock=1'))
  await page.locator('.card').first.wait_for()
  print('Filtered URL',page.url)
  # Product page
  await page.locator('.card .card-name').first.click()
  await page.wait_for_url(re.compile(r'/product/'))
  await page.locator('.price-box .big').wait_for(); await page.wait_for_load_state('networkidle')
  print('Product',(await page.locator('h1').inner_text())[:60],'|',await page.locator('.price-box .big').inner_text(),'| offers',await page.locator('.offer').count())
  print('Kit slots',await page.locator('.kit .slot').count())
  await page.screenshot(path='/tmp/ridecompare-product.png',full_page=False)
  # Compare tray
  await page.get_by_role('button',name='+ Compare').first.click()
  assert 'Compare (1)' in await page.locator('.header-actions').inner_text()
  await page.goto(base+'/compare',wait_until='domcontentloaded')
  await page.locator('.compare-table').wait_for(timeout=15000)
  print('Compare columns',await page.locator('.compare-table tr').first.locator('td').count())
  # Deals, brands, bikes
  for path,sel in [('/deals','.card, .gap-row'),('/brands','.brand-tile'),('/bikes','.chip')]:
   await page.goto(base+path,wait_until='domcontentloaded');await page.locator(sel).first.wait_for(timeout=20000)
   print(path,await page.locator(sel).count())
  # WebMCP
  await page.goto(base,wait_until='domcontentloaded')
  await page.wait_for_function("window.registeredTools && window.registeredTools.search_ridecompare_catalog",timeout=15000)
  print('WebMCP',await page.evaluate("async()=>{const t=window.registeredTools.search_ridecompare_catalog;const r=await t.execute({query:'gloves'});return {names:Object.keys(window.registeredTools),total:r.total}}"))
  # Mobile
  await page.set_viewport_size({'width':390,'height':844})
  await page.goto(base+'/gear',wait_until='domcontentloaded')
  await page.locator('.card').first.wait_for()
  assert not await page.evaluate('document.documentElement.scrollWidth > window.innerWidth')
  print('Mobile overflow',False)
  await page.screenshot(path='/tmp/ridecompare-mobile.png',full_page=False)
  # Kit builder: full sets, single piece, tiny budget never blank
  await page.set_viewport_size({'width':1440,'height':1000})
  await page.goto(base+'/build',wait_until='domcontentloaded')
  await page.fill('#budget','20000'); await page.locator('input[name=style][value=track]').check()
  await page.get_by_role('button',name=re.compile('Show my sets')).click()
  await page.wait_for_url(re.compile(r'/build\?budget=20000')); await page.locator('.kitset').first.wait_for(timeout=30000)
  sets=await page.locator('.kitset').count(); brands=await page.locator('.kitset').first.locator('.kitset-foot span').inner_text()
  print('Builder sets',sets,'|',brands); assert sets>=3 and not brands.startswith('1 brands')
  await page.locator('.kitset').first.get_by_role('button',name=re.compile('Compare this set')).click()
  assert 'Compare (5)' in await page.locator('.header-actions').inner_text()
  await page.screenshot(path='/tmp/ridecompare-build.png',full_page=False)
  await page.goto(base+'/build?budget=800&style=urban&piece=Gloves',wait_until='domcontentloaded'); await page.locator('#results .card').first.wait_for(timeout=30000)
  print('Single piece cards',await page.locator('#results .card').count())
  await page.goto(base+'/build?budget=600&style=track',wait_until='domcontentloaded'); await page.locator('.kitset').first.wait_for(timeout=30000)
  print('Tiny budget',await page.locator('.kitset').count(),'sets |',(await page.locator('.notice-warn').first.inner_text())[:70])
  # Fit check: 3D canvas, verdict, size suggestion
  await page.goto(base+'/fit?type=jacket&size=M',wait_until='domcontentloaded')
  await page.locator('.fit-stage canvas').wait_for(timeout=30000)
  for k,v in [('Height','180'),('Weight','85'),('Chest','106')]:
   await page.get_by_label(re.compile('^'+k)).fill(v)
  verdict=await page.locator('.fit-verdict h2').inner_text(); print('Fit verdict',verdict)
  assert 'tight' in verdict.lower()
  await page.get_by_role('button',name=re.compile('^Try ')).click()
  print('After size change',await page.locator('.fit-verdict h2').inner_text(),'| zones',await page.locator('.fit-zones li').count())
  await page.screenshot(path='/tmp/ridecompare-fit.png',full_page=False)
  # Product page: brand-mixed sets and fit link on a jacket
  await page.goto(base+'/gear?category=Jackets&sort=stores',wait_until='domcontentloaded'); await page.locator('.card .card-name').first.click()
  await page.wait_for_url(re.compile(r'/product/')); await page.locator('.kitset').first.wait_for(timeout=30000)
  foot=await page.locator('.kitset').first.locator('.kitset-foot span').inner_text()
  print('Product sets',await page.locator('.kitset').count(),'|',foot,'| fit link',await page.get_by_role('link',name='Check the fit').count())
  assert not foot.startswith('1 brands')
  # Mobile: builder and fit pages do not overflow
  await page.set_viewport_size({'width':390,'height':844})
  for path in ['/build?budget=20000&style=touring','/fit']:
   await page.goto(base+path,wait_until='domcontentloaded'); await page.wait_for_load_state('networkidle')
   assert not await page.evaluate('document.documentElement.scrollWidth > window.innerWidth'), path
  print('Mobile overflow (build, fit)',False)
  # No public store/coverage page
  r=await page.goto(base+'/api/status');print('Status without sign-in',r.status)
  assert r.status==400
  print('Errors',errors)
  assert not errors
  await browser.close()
asyncio.run(main())
