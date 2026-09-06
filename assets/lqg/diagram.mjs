import {WIRES,PORTS,ANGLES,wedgeSigns,spin} from './core.mjs';
const NS='http://www.w3.org/2000/svg';
let serial=0;
const el=(name,attrs={},text)=>{const e=document.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text!==undefined)e.textContent=text;return e;};
const pt=(a,r,y=0,cx=350,cy=350)=>{const t=a*Math.PI/180;return [cx+r*Math.cos(t)-y*Math.sin(t),cy-r*Math.sin(t)-y*Math.cos(t)];};
const path=(p,q,a,b)=>`M ${p} C ${a}, ${b}, ${q}`;
export function simplex(options={}) {
  const {rotation=0,mode=2,selected='',sigma=[1,1,1,1,1],causal=false,spins=Array(10).fill(1),bulk=[],onSelect=()=>{},orientations=Array(5).fill('counterclockwise')}=options;
  const uid=`lqg-svg-${++serial}`;
  const svg=el('svg',{viewBox:'0 0 700 700',role:'img','aria-labelledby':`${uid}-title ${uid}-desc`,class:'lqg-simplex'});
  svg.append(el('title',{id:`${uid}-title`},'Four-simplex boundary wiring'));
  svg.append(el('desc',{id:`${uid}-desc`},'Five four-valent tetrahedra joined by ten wires. Port order follows the supplied TikZ macro. Crossings are not nodes. Focus a wire or node and press Enter to inspect it.'));
  const defs=el('defs');const marker=el('marker',{id:`${uid}-arrow`,viewBox:'0 0 10 10',refX:7,refY:5,markerWidth:6,markerHeight:6,orient:'auto-start-reverse'});marker.append(el('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'context-stroke'}));defs.append(marker);svg.append(defs);
  const signs=wedgeSigns(sigma);
  const activate=(g,id)=>{g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-pressed',String(selected===id));g.addEventListener('click',()=>onSelect(id));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(id);}});};
  WIRES.forEach((w,i)=>{
    const aa=ANGLES[w.a]+rotation, ab=ANGLES[w.b]+rotation;
    const p=pt(aa,214,(w.pa-2.5)*20),q=pt(ab,214,(w.pb-2.5)*20);
    const c=pt(aa,110,(w.pa-2.5)*20),d=pt(ab,110,(w.pb-2.5)*20);
    const g=el('g',{'data-wire':w.id,class:`lqg-wire ${bulk.includes(i)?'is-bulk':''} ${selected===w.id?'is-selected':''}`,'aria-label':`${w.id}: T${w.a} port ${w.pa} to T${w.b} port ${w.pb}, j ${spin(spins[i])}${causal?`, kappa ${signs[i]}`:''}`});
    const curve=path(p,q,c,d);g.append(el('path',{d:curve,class:'lqg-wire-hit'}));g.append(el('path',{d:curve,class:'lqg-wire-line'}));
    const t=w.perimeter?.5:.2,u=1-t;
    const point=[0,1].map(k=>u*u*u*p[k]+3*u*u*t*c[k]+3*u*t*t*d[k]+t*t*t*q[k]);
    if(mode===2){const derivative=[0,1].map(k=>3*u*u*(c[k]-p[k])+6*u*t*(d[k]-c[k])+3*t*t*(q[k]-d[k]));const norm=Math.hypot(...derivative);g.append(el('path',{d:`M ${point[0]-derivative[0]/norm*5} ${point[1]-derivative[1]/norm*5} L ${point}`,class:'lqg-wire-line','marker-end':`url(#${uid}-arrow)`}));}
    if(mode>0)g.append(el('text',{x:point[0]+6,y:point[1]-9,class:'lqg-wire-label'},`${w.id} · j=${spin(spins[i])}${causal?` · κ${signs[i]>0?'+':'−'}`:''}`));
    activate(g,w.id);svg.append(g);
  });
  for(let a=1;a<=5;a++){
    const angle=ANGLES[a]+rotation;
    const g=el('g',{'data-node':`T${a}`,class:`lqg-node ${selected===`T${a}`?'is-selected':''}`,'aria-label':`Tetrahedron ${a}; neighbours in port order ${PORTS[a].join(', ')}`});
    const center=pt(angle,234);
    g.append(el('rect',{x:center[0]-20,y:center[1]-46,width:40,height:92,rx:8,transform:`rotate(${-angle},${center})`}));
    g.append(el('text',{x:center[0],y:center[1]+5,'text-anchor':'middle'},`g${a}`));
    for(let p=1;p<=4;p++){
      const inside=pt(angle,214,(p-2.5)*20),outside=pt(angle,254,(p-2.5)*20);
      g.append(el('circle',{cx:inside[0],cy:inside[1],r:3}));g.append(el('circle',{cx:outside[0],cy:outside[1],r:3}));
      if(orientations[a-1]!=='none'){
        const junction=pt(angle,286,p<=2?-20:20);
        g.append(el('path',{d:`M ${outside} L ${junction}`,class:'lqg-intertwiner'}));
      }
    }
    if(orientations[a-1]!=='none'){
      let p=pt(angle,286,-20),q=pt(angle,286,20);
      if(orientations[a-1]==='clockwise')[p,q]=[q,p];
      g.append(el('path',{d:`M ${p} L ${q}`,class:'lqg-intertwiner',...(mode===2?{'marker-end':`url(#${uid}-arrow)`}:{})}));
      if(mode>0){const label=pt(angle,307);g.append(el('text',{x:label[0],y:label[1],'text-anchor':'middle',class:'lqg-intertwiner-label'},`ι${a} · k${a}${causal?` · σ${sigma[a-1]>0?'+':'−'}`:''}`));}
    }
    activate(g,`T${a}`);svg.append(g);
  }
  return svg;
}
export function serializeSVG(svg) {
  const clone=svg.cloneNode(true);clone.setAttribute('xmlns',NS);
  // Embed presentation rules so exports do not depend on the page stylesheet.
  const style=el('style',{},'.lqg-wire-line{fill:none;stroke:#222;stroke-width:1.6}.lqg-wire-hit{fill:none;stroke:transparent;stroke-width:16}.is-bulk .lqg-wire-line{stroke:#a21c79;stroke-width:2.5}.lqg-node rect{fill:#def4f5;stroke:#26747a}.lqg-node circle{fill:#222}.lqg-intertwiner{fill:none;stroke:#176635;stroke-width:2}.lqg-intertwiner-label{fill:#176635}text{font-family:serif;font-size:14px;fill:#222}.lqg-wire-label{paint-order:stroke;stroke:white;stroke-width:4px;stroke-linejoin:round}.is-selected .lqg-wire-line{stroke:#007e89;stroke-width:4}');clone.insertBefore(style,clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}
