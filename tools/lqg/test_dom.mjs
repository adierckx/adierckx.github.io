// Optional headless DOM and TeX validation. No browser or development server.
// npm install --prefix /tmp/lqg-validation jsdom@26 mathjax-full@3
// LQG_VALIDATION_MODULES=/tmp/lqg-validation/node_modules node tools/lqg/test_dom.mjs
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const base=process.env.LQG_VALIDATION_MODULES;
if(!base)throw Error('Set LQG_VALIDATION_MODULES to the optional validation node_modules directory.');
const require=createRequire(`${base}/package.json`);
const {JSDOM}=require('jsdom');
const {mathjax}=require('mathjax-full/js/mathjax.js');
const {TeX}=require('mathjax-full/js/input/tex.js');
const {SVG}=require('mathjax-full/js/output/svg.js');
const {liteAdaptor}=require('mathjax-full/js/adaptors/liteAdaptor.js');
const {RegisterHTMLHandler}=require('mathjax-full/js/handlers/html.js');
const {AllPackages}=require('mathjax-full/js/input/tex/AllPackages.js');
const repo=new URL('../../',import.meta.url);
const data=JSON.parse(readFileSync(new URL('assets/lqg/catalogue.json',repo)));
const macros=String.raw`\def\ket#1{\lvert#1\rangle}\def\bra#1{\langle#1\rvert}\def\Inv{\operatorname{Inv}}\def\Contr{\operatorname{Contr}}\def\Tr{\operatorname{Tr}}\def\Vol{\operatorname{vol}}`;
const adaptor=liteAdaptor();RegisterHTMLHandler(adaptor);
const errors=[];
const mathDocument=mathjax.document('',{InputJax:new TeX({packages:AllPackages,formatError:(jax,error)=>{errors.push(error.message);return jax.formatError(error);}}),OutputJax:new SVG({fontCache:'none'})});
for(const e of data.equations){const rendered=mathDocument.convert(`${macros}${e.latex}\\tag{${e.id}}`,{display:true});assert.ok(!adaptor.outerHTML(rendered).includes('data-mjx-error'),`${e.id} failed TeX conversion`);}
assert.deepEqual(errors,[]);console.log('All 127 formulas parse and render through MathJax.');
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
let dom,downloads=[];
const nativeFetch=globalThis.fetch;
async function load(slug){
  dom?.window.close();
  const qmd=readFileSync(new URL(`outreach/${slug}.qmd`,repo),'utf8');
  dom=new JSDOM(qmd.split('```{=html}')[1].split('```')[0],{url:`https://example.org/outreach/${slug}.html`,pretendToBeVisual:true});
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.location=dom.window.location;globalThis.history=dom.window.history;globalThis.localStorage=dom.window.localStorage;globalThis.XMLSerializer=dom.window.XMLSerializer;
  Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
  dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
  dom.window.HTMLAnchorElement.prototype.click=function(){downloads.push({name:this.download,href:this.href});};
  dom.window.MathJax={typesetPromise:async()=>{},typesetClear:()=>{},startup:{promise:Promise.resolve()}};
  globalThis.fetch=async()=>({ok:true,json:async()=>data});
  await import(new URL(`assets/lqg/app.mjs?dom=${slug}`,repo));await tick();
  assert.equal(document.querySelector('#lqg-load-status').textContent,'');
  return id=>document.getElementById(id);
}
let $=await load('lqg-atlas');
assert.equal($('lqg-cards').querySelectorAll('[data-eq]').length,3);
$('lqg-cards').querySelector('button').click();await tick();assert.ok($('lqg-cards').querySelector('[data-eq=S7]'));
$('lqg-search').value='Q10';$('lqg-search').dispatchEvent(new window.Event('input'));assert.equal($('lqg-cards').querySelector('[data-eq]').dataset.eq,'Q10');
$('lqg-toller').click();assert.equal($('lqg-cards').querySelector('[data-eq]').dataset.eq,'Q1');
$('lqg-reset').click();assert.equal($('lqg-cards').querySelectorAll('[data-eq]').length,3);
$('lqg-show-diagram').checked=true;$('lqg-show-diagram').dispatchEvent(new window.Event('change'));assert.equal($('lqg-atlas-svg').querySelectorAll('[data-wire]').length,10);
$('lqg-atlas-svg').querySelector('[data-node=T3]').dispatchEvent(new window.Event('click'));assert.equal($('lqg-cards').querySelector('[data-eq]').dataset.eq,'I4');
$('lqg-lowspin').click();assert.match($('lqg-admissibility').textContent,/dim Inv = 2/);
$('lqg-face-4').value='2';$('lqg-face-4').dispatchEvent(new window.Event('change'));assert.match($('lqg-admissibility').textContent,/No invariant/);assert.equal($('lqg-virtual').disabled,true);
$('lqg-export').click();assert.equal(downloads.at(-1).name,'lqg-selection.tex');
console.log('Atlas: load, local expansion, search, reset, diagram sync, spin inputs, and export pass.');
$=await load('build-lqg');
assert.equal($('lqg-guide-prev').disabled,true);
$('lqg-variables').value='metric';$('lqg-variables').dispatchEvent(new window.Event('change'));assert.equal($('lqg-action').disabled,true);assert.ok($('lqg-guide-cards').querySelector('[data-eq=A2]'));
assert.ok(!$('lqg-guide-cards').querySelector('[data-eq=A2] code').textContent.includes('Lambda'));
$('lqg-guide-next').click();assert.match($('lqg-guide-copy').textContent,/time gauge/);
$('lqg-guide-next').click();assert.ok(!$('lqg-guide-cards').querySelector('[data-eq=K8] code').textContent.includes('Lambda'));
for(let i=2;i<8;i++)$('lqg-guide-next').click();assert.equal($('lqg-guide-next').disabled,true);assert.ok($('lqg-guide-cards').querySelector('[data-eq=Q1]'));
console.log('Guide: action specialization, dependency explanation and all eight steps pass.');
$=await load('lqg-diagrams');
assert.equal($('lqg-lab-svg').querySelectorAll('[data-node]').length,5);
$('lqg-lab-svg').querySelector('[data-node=T1]').dispatchEvent(new window.Event('click'));assert.equal($('lqg-selection').querySelectorAll('tbody tr').length,4);
$('lqg-causal-signs').checked=true;$('lqg-causal-signs').dispatchEvent(new window.Event('change'));$('lqg-sigma').querySelector('button').click();assert.match($('lqg-sigma').textContent,/σ1 −/);
$('lqg-glue-map').value='reverse';$('lqg-glue-map').dispatchEvent(new window.Event('change'));assert.ok($('lqg-glue-formula').querySelector('[data-eq=I8]'));
$('lqg-save-svg').click();assert.equal(downloads.at(-1).name,'four-simplex.svg');
$('lqg-save-tikz').click();assert.equal(downloads.at(-1).name,'four-simplex.tex');
if(process.env.LQG_TIKZ_CHECK_OUTPUT){const text=await (await nativeFetch(downloads.at(-1).href)).text();writeFileSync(process.env.LQG_TIKZ_CHECK_OUTPUT,text);}
$('lqg-diagram-reset').click();assert.equal($('lqg-causal-signs').checked,false);assert.equal($('lqg-rotation').value,'0');
console.log('Diagram Lab: ordered ports, causal controls, gluing, reset and SVG/TikZ exports pass.');
dom.window.close();
