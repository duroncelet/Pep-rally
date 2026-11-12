import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformWithEsbuild} from 'vite';

const source=readFileSync(new URL('../app/format-price.ts',import.meta.url),'utf8');
const transformed=await transformWithEsbuild(source,'format-price.ts',{loader:'ts'});
const {formatPrice}=await import('data:text/javascript;base64,'+Buffer.from(transformed.code).toString('base64'));

test('one formatter shows cents and exactly one dollar sign',()=>{
 for(const [cents,expected] of [[0,'$0.00'],[1400,'$14.00'],[1499,'$14.99'],[123456,'$1,234.56']]) assert.equal(formatPrice(cents),expected);
 assert.throws(()=>formatPrice(-1));
 assert.throws(()=>formatPrice(14.5));
});

test('listing and checkout displays call shared formatter',()=>{
 for(const path of ['../app/page.tsx','../app/discover/[slug]/page.tsx','../app/discover/[slug]/PurchaseButton.tsx','../app/build/page.tsx']) {
  const text=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.match(text,/formatPrice\(/,path);
  assert.doesNotMatch(text,/\$\$|\$\{\(.*priceCents\s*\/\s*100\)/,path);
 }
});
