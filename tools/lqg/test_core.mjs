import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {admissible,trivalent,area,character,normalAngle,WIRES,PORTS,wedgeSigns,cycleValid,validateCatalogue,visibleIds} from '../../assets/lqg/core.mjs';
const catalogue=JSON.parse(readFileSync(new URL('../../assets/lqg/catalogue.json',import.meta.url)));
test('the catalogue has 127 sourced equations and an acyclic expansion graph',()=>assert.equal(validateCatalogue(catalogue),127));
test('TikZ topology has ten unique edges and uses all 20 ports exactly once',()=>{
  const ports=new Set(),pairs=new Set();for(const w of WIRES){assert.equal(PORTS[w.a][w.pa-1],w.b);assert.equal(PORTS[w.b][w.pb-1],w.a);ports.add(`${w.a}:${w.pa}`);ports.add(`${w.b}:${w.pb}`);pairs.add([w.a,w.b].sort().join(':'));}assert.equal(ports.size,20);assert.equal(pairs.size,10);
});
test('four-valent admissibility handles parity, trivial and empty spaces',()=>{
  assert.deepEqual(admissible([1,1,1,1]),[0,2]);assert.deepEqual(admissible([2,2,2,2]),[0,2,4]);assert.deepEqual(admissible([0,0,0,0]),[0]);assert.deepEqual(admissible([1,1,1,2]),[]);assert.deepEqual(admissible([0,0,1,3]),[]);assert.deepEqual(admissible([-1,1,1,1]),[]);
});
test('admissible four-valent channels agree with independent trivalent tests',()=>{
  for(let a=0;a<=4;a++)for(let b=0;b<=4;b++)for(let c=0;c<=4;c++)for(let d=0;d<=4;d++){
    const expected=Array.from({length:9},(_,k)=>k).filter(k=>trivalent([a,b,k])&&trivalent([c,d,k]));assert.deepEqual(admissible([a,b,c,d]),expected);
  }
});
test('area, angle and character limits are finite and correctly normalized',()=>{
  assert.equal(area(0),0);assert.equal(area(1),Math.sqrt(3)/2);assert.equal(normalAngle(1,1,0),180);assert.equal(normalAngle(0,1,1),null);
  for(let j=0;j<=4;j++){assert.equal(character(j,0),j+1);assert.ok(Math.abs(character(j,4*Math.PI)-(j+1))<1e-12);assert.ok(Math.abs(character(j,2*Math.PI)-(-1)**j*(j+1))<1e-12);}
});
test('32 node assignments yield 16 induced sectors, all satisfying cycle constraints',()=>{
  const patterns=new Set();for(let n=0;n<32;n++){const sigma=Array.from({length:5},(_,a)=>n&(1<<a)?-1:1);const signs=wedgeSigns(sigma);assert.ok(cycleValid(signs));assert.deepEqual(signs,wedgeSigns(sigma.map(s=>-s)));patterns.add(signs.join(','));}assert.equal(patterns.size,16);
  let valid=0;for(let n=0;n<1024;n++){if(cycleValid(Array.from({length:10},(_,i)=>n&(1<<i)?-1:1)))valid++;}assert.equal(valid,16);
});
test('search and focused equations are reachable independently of the default frontier',()=>{
  const state={level:0,route:'both',representation:'spin',group:'all',query:'',focus:null};assert.deepEqual(visibleIds(catalogue,state),['T1','T2','T3']);assert.ok(visibleIds(catalogue,{...state,query:'Toller'}).includes('Q1'));assert.deepEqual(visibleIds(catalogue,{...state,route:'canonical',focus:'Q1'}),['Q1']);assert.ok(visibleIds(catalogue,{...state,representation:'coherent'}).every(id=>id.startsWith('CO')));
});
