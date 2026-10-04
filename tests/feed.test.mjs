import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFeed,safeUrl} from '../lib/feed.ts';

const product={id:'test-helmet-l',name:'Example Helmet',brand:'Example Gear',variant:'Black / L'};
const row={productId:product.id,name:product.name,brand:product.brand,variant:product.variant,category:'Helmets',image:'',price:4999,shipping:null,inStock:true,url:'https://retailer.in/product/helmet',checkedAt:new Date().toISOString()};
const validate=(changes={},currency='INR')=>validateFeed({currency,offers:[{...row,...changes}]},'https://retailer.in',[product]);
test('exact variant and unknown shipping survive import validation',()=>assert.equal(validate().offers[0].shipping,null));
test('other currencies and negative prices cannot enter an INR comparison',()=>{assert.throws(()=>validate({},'USD'));assert.throws(()=>validate({price:-1}));});
test('a different size cannot replace an existing product identity',()=>assert.throws(()=>validate({variant:'Black / M'}),/different product or variant/));
test('product links must stay on the registered retailer domain',()=>assert.throws(()=>validate({url:'https://another-retailer.in/helmet'}),/retailer website domain/));
test('future timestamps cannot make stale prices look fresh',()=>assert.throws(()=>validate({checkedAt:new Date(Date.now()+86400000).toISOString()})));
test('local or credential-bearing feed URLs are rejected',()=>{for(const u of ['http://retailer.in/feed','https://127.0.0.1/feed','https://localhost/feed','https://user:pass@retailer.in/feed'])assert.throws(()=>safeUrl(u));});
