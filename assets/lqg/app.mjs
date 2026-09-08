import {admissible,trivalent,spin,area,normalAngle,character,WIRES,PORTS,ANGLES,wedgeSigns,cycleValid,LEVELS,visibleIds,validateCatalogue} from './core.mjs';
import {simplex,serializeSVG} from './diagram.mjs';
const root=document.querySelector('#lqg-app');
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const macros=String.raw`\def\ket#1{\lvert#1\rangle}\def\bra#1{\langle#1\rvert}\def\Inv{\operatorname{Inv}}\def\Contr{\operatorname{Contr}}\def\Tr{\operatorname{Tr}}\def\Vol{\operatorname{vol}}`;
let data,byId,mathQueue=Promise.resolve();
const state={level:0,route:'both',representation:'spin',group:'all',query:'',focus:null,trail:[],pins:[]};
function announce(text,id='lqg-status'){const e=$(id);if(e)e.textContent=text;}
function download(name,text,type='text/plain'){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function copy(text,button){try{await navigator.clipboard.writeText(text);const previous=button.textContent;button.textContent='Copied';setTimeout(()=>{button.textContent=previous;},1800);}catch{const details=button.closest('.lqg-card').querySelector('details');details.open=true;details.querySelector('code').focus();button.textContent='Select LaTeX below';}}
function math(el){
  mathQueue=mathQueue.catch(()=>{}).then(async()=>{
    // Quarto initializes MathJax asynchronously; the bootstrap ensures it is included.
    for(let n=0;n<100&&!window.MathJax?.typesetPromise;n++) await new Promise(resolve=>setTimeout(resolve,100));
    if(!el.isConnected)return;
    if(!window.MathJax?.typesetPromise){announce('Math rendering could not load. Each card still includes copyable LaTeX.','lqg-load-status');return;}
    await window.MathJax.startup.promise;
    await window.MathJax.typesetPromise([el]);
  }).catch(()=>announce('A formula could not be typeset; open its LaTeX source.','lqg-load-status'));
  return mathQueue;
}
function clear(el){if(window.MathJax?.typesetClear)window.MathJax.typesetClear([el]);el.replaceChildren();}
function sourceDocument(equations){return String.raw`\documentclass{article}
\usepackage[margin=20mm]{geometry}
\usepackage{amsmath,amssymb,hyperref}
\allowdisplaybreaks
`+macros+'\n\\begin{document}\n'+equations.map(e=>`% ${e.title}\n% ${data.sources[e.source].title}; ${e.locator}\n% ${data.sources[e.source].url}\n\\begin{equation}\n${e.latex}\n\\tag{${e.id}}\n\\end{equation}\n`).join('\n')+'\\end{document}\n';}
function openEquation(id){if(!byId.has(id))return;if(state.focus)state.trail.push(state.focus);state.focus=id;state.query='';state.group='all';syncControls();renderAtlas();const target=$('lqg-cards');target?.scrollIntoView({block:'start',behavior:'auto'});}
function card(id,{compact=false,latex=null,note=null}={}){
  const e=byId.get(id);const article=document.createElement('article');article.className='lqg-card';article.dataset.eq=id;article.dataset.route=e.route;
  article.innerHTML=`<header class="lqg-card-head"><div><small>${escape(data.groups[e.group].title)}</small><h2>${escape(e.title)}</h2></div><span class="lqg-card-id">(${id})</span></header><div class="lqg-equation" tabindex="0" aria-label="Equation ${id}"></div><p class="lqg-card-note">${escape(note??e.note)}</p><div class="lqg-card-actions"></div><details><summary>Source, convention &amp; LaTeX</summary><p><a href="${data.sources[e.source].url}" target="_blank" rel="noopener">${escape(data.sources[e.source].title)}</a><br>${escape(e.locator)} · ${e.provenance==='derived'?'Derived identity in the stated basis':'Adapted to the atlas convention'}</p><pre><code tabindex="0"></code></pre></details>`;
  const tex=latex??e.latex;
  article.querySelector('.lqg-equation').textContent=`\\[${macros}${tex}\\tag{${id}}\\]`;
  article.querySelector('code').textContent=tex;
  const actions=article.querySelector('.lqg-card-actions');
  const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);actions.append(b);return b;};
  if(compact){const a=document.createElement('a');a.href=`lqg-atlas.html?eq=${id}`;a.textContent='Explore this equation →';actions.append(a);}
  else if(e.children.length){
    const panel=document.createElement('div');panel.className='lqg-expansions';panel.hidden=true;
    const expand=button(`Expand · ${e.children.length} ingredients`,()=>{
      const opening=panel.hidden;panel.hidden=!opening;expand.setAttribute('aria-expanded',String(opening));expand.textContent=opening?'Collapse ingredients':`Expand · ${e.children.length} ingredients`;
      if(opening&&!panel.childElementCount){
        const p=document.createElement('p');p.className='muted';p.textContent='Choose an ingredient to follow, or read the expanded cards below.';panel.append(p);
        const links=document.createElement('div');links.className='lqg-child-links';
        e.children.forEach(child=>{const b=document.createElement('button');b.textContent=`(${child}) ${byId.get(child).title}`;b.addEventListener('click',()=>openEquation(child));links.append(b);});panel.append(links);
        e.children.forEach(child=>panel.append(card(child)));math(panel);
      }
    });expand.setAttribute('aria-expanded','false');article.append(panel);
  }
  if(!compact){
    const pin=button(state.pins.includes(id)?'Unpin':'Pin',()=>{state.pins=state.pins.includes(id)?state.pins.filter(x=>x!==id):[...state.pins,id];try{localStorage.setItem('lqg-pins',JSON.stringify(state.pins));}catch{}renderPins();pin.textContent=state.pins.includes(id)?'Unpin':'Pin';pin.setAttribute('aria-pressed',String(state.pins.includes(id)));});pin.setAttribute('aria-pressed',String(state.pins.includes(id)));
    button('Focus',()=>openEquation(id));
  }
  const copyButton=button('Copy LaTeX',()=>copy(tex,copyButton));
  return article;
}
function renderPins(){const container=$('lqg-pins');if(!container)return;container.replaceChildren();if(!state.pins.length)return;const details=document.createElement('details');details.className='lqg-card';const summary=document.createElement('summary');summary.textContent=`Pinned equations (${state.pins.length})`;details.append(summary);state.pins.forEach(id=>{const b=document.createElement('button');b.textContent=`(${id}) ${byId.get(id).title}`;b.addEventListener('click',()=>openEquation(id));details.append(b);});container.append(details);}
function syncControls(){[['lqg-level','level'],['lqg-route','route'],['lqg-representation','representation'],['lqg-group','group'],['lqg-search','query']].forEach(([id,key])=>{if($(id))$(id).value=state[key];});if($('lqg-level-name'))$('lqg-level-name').textContent=`${state.level} · ${LEVELS[state.level]}`;}
function renderAtlas(){
  const container=$('lqg-cards');if(!container)return;clear(container);
  const ids=visibleIds(data,state);ids.forEach(id=>container.append(card(id)));
  if(!ids.length)container.innerHTML='<p class="lqg-fallback">No equations match this selection. Try another route or clear the search.</p>';
  const trail=$('lqg-breadcrumbs');trail.replaceChildren();
  if(state.focus){const back=document.createElement('button');back.textContent='← Back';back.addEventListener('click',()=>{state.focus=state.trail.pop()??null;renderAtlas();});trail.append(back);for(const id of [...state.trail,state.focus]){const b=document.createElement('button');b.textContent=`(${id})`;b.addEventListener('click',()=>{state.focus=id;state.trail=[];renderAtlas();});trail.append(b);}}
  else trail.textContent=state.query?'Search across all 127 equations':state.group==='all'?`${LEVELS[state.level]} · starting equations`:data.groups[state.group].title;
  announce(`${ids.length} starting ${ids.length===1?'equation':'equations'} · expansions stay local to each card`);
  const url=new URL(location.href);if(state.focus)url.searchParams.set('eq',state.focus);else url.searchParams.delete('eq');history.replaceState(null,'',url);
  renderPins();math(container);
}
function atlas(){
  for(const [key,g] of Object.entries(data.groups)){const o=document.createElement('option');o.value=key;o.textContent=g.title;$('lqg-group').append(o);}
  try{const pins=JSON.parse(localStorage.getItem('lqg-pins')||'[]');if(Array.isArray(pins))state.pins=pins.filter(x=>byId.has(x));}catch{}
  const initial=new URLSearchParams(location.search).get('eq');if(byId.has(initial))state.focus=initial;
  [['lqg-level','level'],['lqg-route','route'],['lqg-representation','representation'],['lqg-group','group'],['lqg-search','query']].forEach(([id,key])=>$(id).addEventListener(id==='lqg-search'||id==='lqg-level'?'input':'change',()=>{
    state[key]=key==='level'?Number($(id).value):$(id).value;state.focus=null;state.trail=[];
    if(key==='level'||key==='representation'){state.group='all';state.query='';}
    syncControls();renderAtlas();
  }));
  $('lqg-reset').addEventListener('click',()=>{Object.assign(state,{level:0,route:'both',representation:'spin',group:'all',query:'',focus:null,trail:[]});syncControls();renderAtlas();});
  $('lqg-toller').addEventListener('click',()=>openEquation('Q1'));$('lqg-causal').addEventListener('click',()=>openEquation('CV2'));
  $('lqg-lowspin').addEventListener('click',()=>{examples();$('lqg-examples').scrollIntoView({block:'start'});});
  root.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openEquation(b.dataset.open)));
  $('lqg-colour').addEventListener('change',()=>{root.classList.toggle('colour',$('lqg-colour').checked);$('lqg-colour-key').hidden=!$('lqg-colour').checked;});
  $('lqg-show-diagram').addEventListener('change',()=>{$('lqg-atlas-diagram').hidden=!$('lqg-show-diagram').checked;drawAtlas();});
  $('lqg-export').addEventListener('click',()=>{const seen=new Set();containerVisible($('lqg-cards')).forEach(e=>seen.add(e.dataset.eq));download('lqg-selection.tex',sourceDocument([...seen].map(id=>byId.get(id))));});
  syncControls();renderAtlas();
}
function containerVisible(container){return [...container.querySelectorAll('[data-eq]')].filter(e=>!e.closest('[hidden]'));}
function drawAtlas(selected=''){
  const wrap=$('lqg-atlas-svg');if(!wrap)return;
  wrap.replaceChildren(simplex({selected,onSelect:id=>{
    drawAtlas(id);
    if(id[0]==='E'){const w=WIRES.find(w=>w.id===id);announce(`${id}: T${w.a} port ${w.pa} → T${w.b} port ${w.pb}. Projected kernel (D1); duality at the second endpoint (D8).`,'lqg-wire-info');openEquation('D1');}
    else{const n=Number(id.slice(1));announce(`${id}: ordered neighbours ${PORTS[n].join(', ')}. Ports 1–2 and 3–4 couple through k.`,'lqg-wire-info');openEquation('I4');}
  }}));
}
const STEPS=[
 ['Action','A2','A4','A3','A6'],['3+1 split','K1','K2','K3','K4'],['Canonical algebra','K5','K6','K7','K8'],['Smear & quantize','H1','H2','H3','H5'],['States','S1','S2','S7','S8'],['Geometry','I4','G1','G3','G5'],['Dynamics','Y4','D6','F1'],['Unfold the vertex','D9','B6','B4','M4','Q1']
];
const COPY=[
 'The metric and first-order descriptions organize classical gravity differently. For a nondegenerate tetrad in vacuum, varying the independent connection gives the torsion-free sector. Topological and boundary terms carry their own assumptions.',
 'A 3+1 decomposition separates spatial geometry from its evolution. Time gauge then selects the SU(2) variables used below. Changing from a metric to a tetrad is an explicit change of variables at this step.',
 'The connection and densitized triad form a canonical pair. Gauss, spatial diffeomorphism and Hamiltonian constraints remove gauge redundancy. Their classical form does not select a unique quantum Hamiltonian.',
 'Integrate the connection along an edge and the triad across a surface. The graph flux algebra is a Lie algebra; its dimensionful generators carry the area scale ℓ₀². Outgoing endpoint conventions fix the signs.',
 'Peter–Weyl expands link functions into irreducible representations. Averaging the node gauge transformations replaces magnetic data at each node by invariant tensors. This is a kinematical Hilbert space.',
 'Spins determine face areas. Intertwiners couple the face fluxes and carry shape information. The positive volume operator loses the sign of the oriented triple product; distinct orientations can have the same volume.',
 'The EPRL embedding places SU(2) boundary states in simple Lorentz representations. A gauge-fixed vertex integral assigns their elementary transition amplitude. The fixed-complex amplitude then sums internal labels.',
 'Resolve Lorentz matrix products, use the Cartan decomposition and integrate the compact rotations. Boosters leave a central recoupling tensor. Toller matrices introduce a separate causal branch; they do not inherit the Wigner composition law.'
];
function guide(){let step=0;
  const render=()=>{
    $('lqg-action').disabled=$('lqg-variables').value==='metric';
    const nav=$('lqg-steps');nav.replaceChildren();STEPS.forEach(([title],i)=>{const b=document.createElement('button');b.className='lqg-step';b.textContent=`${i+1}. ${title}`;b.setAttribute('aria-current',i===step?'step':'false');b.setAttribute('aria-pressed',String(i===step));b.addEventListener('click',()=>{step=i;render();});nav.append(b);});
    const copy=$('lqg-guide-copy');copy.innerHTML=`<h2>${step+1}. ${STEPS[step][0]}</h2><p>${COPY[step]}</p>`;
    if(step>0&&($('lqg-variables').value==='metric'||$('lqg-action').value==='palatini'))copy.innerHTML+='<p class="scope">For this canonical route we now introduce an oriented tetrad, time gauge, and the real Ashtekar–Barbero family A = Γ + γK. The parameter choice is additional to the metric or Palatini action selected above.</p>';
    if(step>=6&&$('lqg-lambda').value==='nonzero')copy.innerHTML+='<p class="scope">The classical action keeps Λ explicit. The undeformed EPRL model displayed in this step sets Λ = 0; it is not a quantization of a nonzero-Λ model selected by a switch.</p>';
    let ids=STEPS[step].slice(1);if(step===0){ids=$('lqg-variables').value==='metric'?['A2','A1']:['A4','A3','A5','A6'];if($('lqg-boundary').checked)ids.push('A8');if($('lqg-topological').checked)ids.push('A7');}
    const cards=$('lqg-guide-cards');clear(cards);ids.forEach(id=>{
      let tex=byId.get(id).latex;
      if($('lqg-lambda').value==='zero'){
        tex=tex.replace('(R-2\\Lambda)','R').replace('-\\frac{\\Lambda}{\\kappa}\\int_M\\Vol_e,','');
        if(id==='K8')tex=tex.replace('&+\\frac\\Lambda\\kappa\\int_\\Sigma d^3x\\,N\\sqrt q\\approx0.','&\\approx0.');
      }
      if(id==='A4'&&$('lqg-action').value==='palatini')tex=tex.replace('+\\gamma^{-1}(e\\wedge e)_{IJ}','');
      cards.append(card(id,{compact:true,latex:tex,note:step===0&&['A2','A4'].includes(id)?`${byId.get(id).note} Displayed specialization: ${$('lqg-lambda').value==='zero'?'Λ = 0':'Λ explicit'}${id==='A4'?`, ${$('lqg-action').value==='palatini'?'Holst term omitted':'Holst term included'}`:''}.`:null}));
    });math(cards);$('lqg-guide-prev').disabled=step===0;$('lqg-guide-next').disabled=step===7;$('lqg-guide-atlas').href=`lqg-atlas.html?eq=${ids[0]}`;
  };
  ['lqg-variables','lqg-action','lqg-lambda','lqg-boundary','lqg-topological'].forEach(id=>$(id).addEventListener('change',render));
  $('lqg-guide-prev').addEventListener('click',()=>{step=Math.max(0,step-1);render();});$('lqg-guide-next').addEventListener('click',()=>{step=Math.min(7,step+1);render();});render();
}
function examples(){const host=$('lqg-examples');if(!host||host.childElementCount)return;
  host.innerHTML=`<h2>Low-spin workbench</h2><div class="lqg-grid"><section class="lqg-card"><h3>Area &amp; one-loop character</h3><label>Spin j<select id="lqg-area-spin">${[0,1,2,3,4].map(j=>`<option value="${j}" ${j===1?'selected':''}>${spin(j)}</option>`).join('')}</select></label><div id="lqg-area-output" class="lqg-lab-output"></div><div id="lqg-area-bar" class="lqg-bar"></div><label>Class angle θ · <output id="lqg-theta-label"></output><input id="lqg-theta" type="range" min="0" max="720" value="90" step="1"></label><p id="lqg-character"></p><a href="lqg-atlas.html?eq=L1">Normalized characters (L1) →</a></section><section class="lqg-card"><h3>Four ordered face spins</h3><div class="lqg-wire-editor">${[1,2,3,4].map(a=>`<label>j${a}<select id="lqg-face-${a}">${[0,1,2,3,4].map(j=>`<option value="${j}" ${j===1?'selected':''}>${spin(j)}</option>`).join('')}</select></label>`).join('')}</div><p id="lqg-admissibility" class="lqg-lab-output"></p><label>Virtual spin k<select id="lqg-virtual"></select></label><p id="lqg-angle"></p><a href="lqg-atlas.html?eq=I4">The normalized coupling basis (I4) →</a></section><section class="lqg-card"><h3>Oriented and positive volume</h3><label>Equal face spins<select id="lqg-volume-spin"><option value="1">j = 1/2</option><option value="2">j = 1</option></select></label><label>Display basis<select id="lqg-volume-basis"><option value="coupling">Coupling basis: Q matrix</option><option value="oriented">Oriented-volume eigenbasis</option></select></label><div id="lqg-volume"></div><p class="muted">The matrix is Q. V = (√2/3) ℓ₀³ √|Q|; the two nonzero orientations have equal positive volume.</p></section></div><details class="lqg-card"><summary>Trivalent admissibility and zero volume</summary><div class="lqg-control-row">${[1,2,3].map(a=>`<label>j${a}<select id="lqg-tri-${a}">${[0,1,2,3,4].map(j=>`<option value="${j}" ${j===(a===3?2:1)?'selected':''}>${spin(j)}</option>`).join('')}</select></label>`).join('')}</div><p id="lqg-trivalent"></p><a href="lqg-atlas.html?eq=L4">Explicit invariant (L4) →</a></details>`;
  const areaUpdate=()=>{const j=Number($('lqg-area-spin').value),theta=Number($('lqg-theta').value);const exact=['0','√3/2','√2','√15/2','√6'][j];$('lqg-area-output').textContent=`A / ℓ₀² = ${exact} ≈ ${area(j).toFixed(5)}`;$('lqg-area-bar').style.width=`${100*area(j)/Math.sqrt(6)}%`;$('lqg-theta-label').textContent=`${theta}°`;$('lqg-character').textContent=`χ${spin(j)}(θ) = ${character(j,theta*Math.PI/180).toFixed(6)}. Haar-normalized state; no extra √dⱼ.`;};
  const angleUpdate=()=>{const a=Number($('lqg-face-1').value),b=Number($('lqg-face-2').value),k=Number($('lqg-virtual').value);const angle=$('lqg-virtual').disabled?null:normalAngle(a,b,k);$('lqg-angle').textContent=angle===null?'Outward-normal angle unavailable for a zero-area face or inadmissible coupling.':`Outward-normal angle: ${angle.toFixed(2)}°. Interior supplement: ${(180-angle).toFixed(2)}°.`;};
  const fourUpdate=()=>{const js=[1,2,3,4].map(a=>Number($(`lqg-face-${a}`).value));const ks=admissible(js);$('lqg-admissibility').textContent=ks.length?`dim Inv = ${ks.length}; k ∈ {${ks.map(spin).join(', ')}}`:'No invariant: these spins cannot close.';$('lqg-virtual').innerHTML=ks.map(k=>`<option value="${k}">${spin(k)}</option>`).join('');$('lqg-virtual').disabled=!ks.length;angleUpdate();};
  const volUpdate=()=>{const id=$('lqg-volume-spin').value==='1'?($('lqg-volume-basis').value==='coupling'?'L7':'L8'):($('lqg-volume-basis').value==='coupling'?'L9':'L10');const output=$('lqg-volume');clear(output);const eq=document.createElement('div');eq.className='lqg-equation';eq.textContent=`\\[${macros}${byId.get(id).latex}\\tag{${id}}\\]`;output.append(eq);if(id==='L10'){const p=document.createElement('p');p.textContent='The zero-volume eigenvector is (√5|0⟩ + 2|2⟩)/3. The nonzero volume has degeneracy two.';output.append(p);}math(output);};
  const triUpdate=()=>{$('lqg-trivalent').textContent=trivalent([1,2,3].map(a=>Number($(`lqg-tri-${a}`).value)))?'One normalized invariant; its gauge-invariant trivalent volume is zero.':'No invariant: triangle or integer-sum admissibility fails.';};
  ['lqg-area-spin','lqg-theta'].forEach(id=>$(id).addEventListener('input',areaUpdate));[1,2,3,4].forEach(a=>$(`lqg-face-${a}`).addEventListener('change',fourUpdate));$('lqg-virtual').addEventListener('change',angleUpdate);['lqg-volume-spin','lqg-volume-basis'].forEach(id=>$(id).addEventListener('change',volUpdate));[1,2,3].forEach(a=>$(`lqg-tri-${a}`).addEventListener('change',triUpdate));areaUpdate();fourUpdate();volUpdate();triUpdate();
}
function tikz(options){
  const {rotation,spins,bulk,mode,sigma,causal,orientations}=options;
  let out=String.raw`\documentclass[tikz,border=6pt]{standalone}
\usetikzlibrary{arrows.meta,decorations.markings}
\begin{document}
\begin{tikzpicture}[scale=1.15,every node/.style={font=\scriptsize}]
% Port assignments are the original foursimplex macro's E1--E10 ordering.
% Crossings are not vertices. Arrows are independent of causal signs.
`;
  for(let a=1;a<=5;a++){
    const angle=ANGLES[a]+rotation;
    out+=`\\begin{scope}[shift={(${angle}:3cm)},rotate=${angle}]\n\\draw[fill=cyan!10] (-.275,-.525) rectangle (.275,.525);\n\\node at (0,0) {$g_${a}$};\n`;
    for(let p=1;p<=4;p++){const y=(p-2.5)*.24;out+=`\\coordinate (T${a}in${p}) at (-.275,${y});\n\\fill (-.275,${y}) circle (.025);\n`;if(orientations[a-1]!=='none')out+=`\\draw[green!40!black] (.275,${y}) -- (.65,${p<=2?'-.24':'.24'});\n`;}
    if(orientations[a-1]!=='none'){out+=`\\draw[green!40!black${mode===2?',->':''}] (.65,${orientations[a-1]==='clockwise'?'.24':'-.24'}) -- (.65,${orientations[a-1]==='clockwise'?'-.24':'.24'});\n`;if(mode>0)out+=`\\node[green!40!black] at (1.05,0) {$\\iota_${a},k_${a}${causal?`,\\sigma_${a}=${sigma[a-1]}`:''}$};\n`;}
    out+='\\end{scope}\n';
  }
  const signs=wedgeSigns(sigma);
  WIRES.forEach((w,i)=>{const pos=w.perimeter?.5:.2;out+=`\\draw[${bulk.includes(i)?'magenta!80!black,thick':'black,thin'}${mode===2?`,postaction={decorate},decoration={markings,mark=at position ${pos} with {\\arrow{Stealth}}}`:''}] (T${w.a}in${w.pa}) to[out=${ANGLES[w.a]+rotation+180},in=${ANGLES[w.b]+rotation+180}] ${mode>0?`node[pos=${pos},fill=white,inner sep=1pt] {$j_{${Math.min(w.a,w.b)}${Math.max(w.a,w.b)}}=${spins[i]/2}${causal?`,\\kappa=${signs[i]}`:''}$}`:''} (T${w.b}in${w.pb}); % ${w.id}\n`;});
  return out+'\\end{tikzpicture}\n\\end{document}\n';
}
function diagram(){
  const options={rotation:0,mode:2,selected:'E1',spins:Array(10).fill(1),bulk:[],sigma:[1,1,1,1,1],causal:false,orientations:Array(5).fill('counterclockwise')};
  const draw=()=>{$('lqg-lab-svg').replaceChildren(simplex({...options,onSelect:id=>{options.selected=id;draw();inspect();}}));$('lqg-rotation-value').textContent=`${options.rotation}°`;$('lqg-cycle-info').textContent=options.causal?`κ in wire order: ${wedgeSigns(options.sigma).map(s=>s>0?'+':'−').join(' ')}. Every cycle has product +1; 16 distinct assignments modulo a global sign flip.`:'Enable causal labels to distinguish σ and κ from orientation arrows.';};
  const inspect=()=>{
    const target=$('lqg-selection');target.replaceChildren();
    if(options.selected[0]==='E'){
      const index=WIRES.findIndex(w=>w.id===options.selected),w=WIRES[index];
      target.innerHTML=`<p><strong>${w.id}</strong> · T${w.a} port ${w.pa} → T${w.b} port ${w.pb}</p><p>j<sub>${Math.min(w.a,w.b)}${Math.max(w.a,w.b)}</sub> = ${spin(options.spins[index])}; the wire carries the projected Lorentz kernel, with the endpoint duality from (D8).</p><label><input type="checkbox" id="lqg-selected-bulk" ${options.bulk.includes(index)?'checked':''}> Bulk wire (magenta)</label><p><a href="lqg-atlas.html?eq=D1">Projected kernel (D1) →</a> · <a href="lqg-atlas.html?eq=D8">Duality (D8) →</a></p>`;
      $('lqg-selected-bulk').addEventListener('change',()=>{options.bulk=options.bulk.includes(index)?options.bulk.filter(i=>i!==index):[...options.bulk,index];draw();});
    }else{
      const a=Number(options.selected.slice(1));const js=PORTS[a].map(b=>options.spins[WIRES.findIndex(w=>(w.a===a&&w.b===b)||(w.b===a&&w.a===b))]);const ks=admissible(js);
      target.innerHTML=`<p><strong>T${a}</strong> · group g${a}, intertwiner ι${a}</p><table><thead><tr><th>Port</th><th>Neighbour</th><th>Spin</th></tr></thead><tbody>${PORTS[a].map((b,p)=>`<tr><td>${p+1}</td><td>T${b}</td><td>${spin(js[p])}</td></tr>`).join('')}</tbody></table><p>Pairings (1,2) and (3,4). ${ks.length?`Allowed k: ${ks.map(spin).join(', ')}.`:'No invariant for these spins.'}</p><label>Intertwiner wire<select id="lqg-node-orientation"><option value="counterclockwise">Counterclockwise</option><option value="clockwise">Clockwise</option><option value="none">No intertwiner</option></select></label><p><a href="lqg-atlas.html?eq=I4">Normalized tensor (I4) →</a></p>`;
      $('lqg-node-orientation').value=options.orientations[a-1];$('lqg-node-orientation').addEventListener('change',()=>{options.orientations[a-1]=$('lqg-node-orientation').value;draw();});
    }
  };
  const controls=()=>{
    $('lqg-sigma').replaceChildren();for(let a=1;a<=5;a++){const b=document.createElement('button');b.textContent=`σ${a} ${options.sigma[a-1]>0?'+':'−'}`;b.setAttribute('aria-label',`Toggle causal sign of tetrahedron ${a}`);b.disabled=!options.causal;b.addEventListener('click',()=>{options.sigma[a-1]*=-1;controls();draw();});$('lqg-sigma').append(b);}
    $('lqg-spin-editor').innerHTML=WIRES.map((w,i)=>`<label>${w.id} · T${w.a}—T${w.b}<select data-spin="${i}">${[0,1,2,3,4].map(j=>`<option value="${j}" ${j===options.spins[i]?'selected':''}>j = ${spin(j)}</option>`).join('')}</select></label>`).join('');
    $('lqg-spin-editor').querySelectorAll('select').forEach(select=>select.addEventListener('change',()=>{options.spins[Number(select.dataset.spin)]=Number(select.value);draw();inspect();}));
  };
  $('lqg-annotations').addEventListener('change',()=>{options.mode=Number($('lqg-annotations').value);draw();});$('lqg-rotation').addEventListener('input',()=>{options.rotation=Number($('lqg-rotation').value);draw();});$('lqg-causal-signs').addEventListener('change',()=>{options.causal=$('lqg-causal-signs').checked;controls();draw();});
  $('lqg-save-svg').addEventListener('click',()=>download('four-simplex.svg',serializeSVG($('lqg-lab-svg').firstElementChild),'image/svg+xml'));
  $('lqg-save-tikz').addEventListener('click',()=>download('four-simplex.tex',tikz(options)));
  $('lqg-diagram-reset').addEventListener('click',()=>{Object.assign(options,{rotation:0,mode:2,selected:'E1',spins:Array(10).fill(1),bulk:[],sigma:[1,1,1,1,1],causal:false,orientations:Array(5).fill('counterclockwise')});$('lqg-annotations').value='2';$('lqg-rotation').value='0';$('lqg-causal-signs').checked=false;controls();draw();inspect();});
  const glue=()=>{
    const reverse=$('lqg-glue-map').value==='reverse';let paths='';for(let p=0;p<4;p++){const q=reverse?3-p:p;paths+=`<path d="M 180 ${45+p*35} C 270 ${45+p*35},330 ${45+q*35},420 ${45+q*35}"/><text x="150" y="${50+p*35}">${p+1}</text><text x="435" y="${50+p*35}">${p+1}</text>`;}
    $('lqg-glue-svg').innerHTML=`<svg class="lqg-glue" viewBox="0 0 600 200" role="img" aria-label="Four shared tetrahedron ports, ${reverse?'reversed':'identity'} pairing"><rect x="60" y="20" width="120" height="155" rx="8"/><rect x="420" y="20" width="120" height="155" rx="8"/><text x="80" y="102">Boundary 1</text><text x="453" y="102">Dual 2</text>${paths}</svg>`;
    const c=$('lqg-glue-formula');clear(c);c.append(card(reverse?'I8':'F6',{compact:true}));math(c);
  };
  $('lqg-glue-map').addEventListener('change',glue);controls();draw();inspect();glue();examples();
}
async function start(){
  try{
    const response=await fetch(root.dataset.catalogue);if(!response.ok)throw Error(`Catalogue HTTP ${response.status}`);data=await response.json();validateCatalogue(data);byId=new Map(data.equations.map(e=>[e.id,e]));
    switch(root.dataset.mode){case 'atlas':atlas();break;case 'guide':guide();break;case 'diagram':diagram();break;}
    $('lqg-load-status').textContent='';
  }catch(error){console.error('LQG atlas:',error);$('lqg-load-status').innerHTML='The catalogue could not load. <button id="lqg-retry">Retry</button> or <a href="../assets/lqg/equations.tex">download the LaTeX catalogue</a>.';$('lqg-retry').addEventListener('click',()=>location.reload());}
}
if(root)start();
