// Doubled spins keep admissibility exact; no floating-point parity tests.
export function admissible(js) {
  if (js.length !== 4 || js.some(j => !Number.isInteger(j) || j < 0)) return [];
  const [a,b,c,d] = js;
  if ((a+b-c-d)%2) return [];
  const out=[];
  for (let k=Math.max(Math.abs(a-b),Math.abs(c-d)); k<=Math.min(a+b,c+d); k++)
    if ((a+b+k)%2===0 && (c+d+k)%2===0) out.push(k);
  return out;
}
export function trivalent([a,b,c]) {
  return [a,b,c].every(j=>Number.isInteger(j)&&j>=0) && Math.abs(a-b)<=c && c<=a+b && (a+b+c)%2===0;
}
export const spin = j => j%2 ? `${j}/2` : String(j/2);
export const area = j => Math.sqrt((j/2)*(j/2+1));
export function normalAngle(a,b,k) {
  if (!a || !b || !trivalent([a,b,k])) return null;
  return Math.acos(Math.max(-1,Math.min(1,((k/2)*(k/2+1)-(a/2)*(a/2+1)-(b/2)*(b/2+1))/(2*area(a)*area(b)))))*180/Math.PI;
}
export function character(twoJ,theta) {
  // Finite magnetic sum remains well conditioned at all removable singularities.
  let value=0;
  for(let m=-twoJ;m<=twoJ;m+=2) value+=Math.cos(m*theta/2);
  return value;
}
export const WIRES = [
  [4,1,5,4],[3,2,5,3],[2,4,5,1],[5,2,1,3],[4,4,3,1],
  [4,2,2,3],[1,2,4,3],[2,2,3,3],[3,4,1,1],[2,1,1,4]
].map(([a,pa,b,pb],i)=>({id:`E${i+1}`,a,pa,b,pb,perimeter:[0,2,4,8,9].includes(i)}));
export const PORTS = {1:[3,4,5,2],2:[1,3,4,5],3:[4,5,2,1],4:[5,2,1,3],5:[2,1,3,4]};
export const ANGLES = {1:306,2:18,3:234,4:162,5:90};
export const wedgeSigns = sigma => WIRES.map(w=>sigma[w.a-1]*sigma[w.b-1]);
export function cycleValid(signs) {
  const edge=(a,b)=>signs[WIRES.findIndex(w=>(w.a===a&&w.b===b)||(w.a===b&&w.b===a))];
  for(let a=1;a<=5;a++) for(let b=a+1;b<=5;b++) for(let c=b+1;c<=5;c++)
    if(edge(a,b)*edge(b,c)*edge(a,c)!==1) return false;
  return true;
}
export const LEVELS=['Compact','Classical action','Connection','Holonomy–flux','Hilbert space','Spin networks & geometry','Dynamics','Recoupling & boosts'];
export const FRONTIERS=[['T1','T2','T3'],['A2','A4','T1','T2','T3'],['K3','K5','K8','T1','T3'],['H1','H3','H5','T1','T3'],['S1','S4','S7','T2','T3'],['S8','I4','G1','G3','G5','L5','T3'],['Y4','D6','F1'],['B6','B4','R1','M2','Q1']];
export function visibleIds(data,state) {
  let candidates=state.focus?[state.focus] : state.query ? data.equations.map(e=>e.id) : state.group!=='all' ? data.equations.filter(e=>e.group===state.group).map(e=>e.id) : state.representation==='coherent' ? ['CO1','CO2','CO4','CO6','CO7'] : FRONTIERS[state.level];
  const q=state.query.toLowerCase().trim();
  return candidates.filter(id=>{
    const e=data.equations.find(e=>e.id===id);
    if(!e) return false;
    if(state.focus) return true;
    if(state.route!=='both'&&e.route!=='both'&&e.route!==state.route) return false;
    return !q || `${e.id} ${e.title} ${e.note} ${e.latex}`.toLowerCase().includes(q);
  });
}
export function validateCatalogue(data) {
  const ids=new Set(data.equations.map(e=>e.id));
  if(ids.size!==data.equations.length) throw Error('Duplicate equation IDs');
  const visiting=new Set(),done=new Set();
  const visit=id=>{if(visiting.has(id))throw Error(`Expansion cycle at ${id}`);if(done.has(id))return;
    const e=data.equations.find(e=>e.id===id);
    if(!e||!data.sources[e.source])throw Error(`Missing equation/source ${id}`);
    visiting.add(id);e.children.forEach(visit);visiting.delete(id);done.add(id);};
  ids.forEach(visit);return ids.size;
}
