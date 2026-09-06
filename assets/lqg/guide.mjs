const root=document.querySelector('#lqg-app');
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const macros=String.raw`\def\ket#1{\lvert#1\rangle}\def\bra#1{\langle#1\rvert}\def\Inv{\operatorname{Inv}}\def\Contr{\operatorname{Contr}}\def\Tr{\operatorname{Tr}}\def\Vol{\operatorname{vol}}`;
let data,byId,mathQueue=Promise.resolve();

function clear(el){
  if(window.MathJax?.typesetClear)window.MathJax.typesetClear([el]);
  el.replaceChildren();
}
function announce(text){const el=$('lqg-load-status');if(el)el.textContent=text;}
function math(el){
  mathQueue=mathQueue.catch(()=>{}).then(async()=>{
    for(let n=0;n<100&&!window.MathJax?.typesetPromise;n++)await new Promise(resolve=>setTimeout(resolve,100));
    if(!el.isConnected)return;
    if(!window.MathJax?.typesetPromise){announce('Math rendering could not load.');return;}
    await window.MathJax.startup.promise;
    await window.MathJax.typesetPromise([el]);
  }).catch(()=>announce('A formula could not be typeset.'));
  return mathQueue;
}
function eq(id){return byId.get(id);}
function unbox(tex){return tex.startsWith('\\boxed{')&&tex.endsWith('}.')?tex.slice(7,-2):tex;}
function sourceLine(id){
  const e=eq(id),s=data.sources[e.source];
  return `<a href="${s.url}" target="_blank" rel="noopener">${escape(s.title)}</a> · ${escape(e.locator)}`;
}
function displayTex(tex,small=false){
  const div=document.createElement('div');
  div.className=small?'lqg-guide-mini-equation':'lqg-guide-main-equation';
  div.textContent=`\\[${macros}${tex}\\]`;
  return div;
}
function lambdaTex(tex){
  if($('lqg-lambda').value==='nonzero')return tex;
  return tex
    .replace('(R-2\\Lambda)','R')
    .replace('-\\frac{\\Lambda}{\\kappa}\\int_M\\Vol_e,','')
    .replace('&+\\frac\\Lambda\\kappa\\int_\\Sigma d^3x\\,N\\sqrt q\\approx0.','&\\approx0.');
}
function holstIndexed(){
  let tex=eq('A4').latex;
  if($('lqg-action').value==='ec')tex=tex.replace('+\\gamma^{-1}(e\\wedge e)_{IJ}','');
  return lambdaTex(tex);
}
function compactTetradAction(){
  const cosm=$('lqg-lambda').value==='nonzero'
    ? String.raw`-\frac{\Lambda}{\kappa}\int_M\Vol_e`
    : '';
  if($('lqg-action').value==='ec'){
    return String.raw`S_{\rm EC}[e,\omega]=\frac1{2\kappa}\int_M \star(e\wedge e)\wedge F[\omega]${cosm}.`;
  }
  return String.raw`S_{\rm ECH}[e,\omega]=\frac1{2\kappa}\int_M P_\gamma(e\wedge e)\wedge F[\omega]${cosm},\qquad P_\gamma=\star+\gamma^{-1}.`;
}
function actionDescription(){
  return `Classical general relativity can be written in different variables. With the metric, the Levi-Civita connection is determined by the metric and the formulation is second order. With a tetrad, the tetrad and Lorentz connection can be varied independently, giving the first-order Einstein–Cartan formulation; the Holst term adds the Barbero–Immirzi parameter.`;
}
const FORMULAS={
  componentsTetrad:String.raw`\begin{aligned}
(e\wedge e)^{IJ}_{\mu\nu}&=2e^{[I}_{\mu}e^{J]}_{\nu},\\
F^{IJ}_{\mu\nu}[\omega]&=2\partial_{[\mu}\omega_{\nu]}^{IJ}
+2\omega_{[\mu}{}^{I}{}_{K}\omega_{\nu]}{}^{KJ}.
\end{aligned}`,
  christoffel:String.raw`\Gamma^\rho{}_{\mu\nu}[g]=\frac12g^{\rho\sigma}
\left(\partial_\mu g_{\nu\sigma}+\partial_\nu g_{\mu\sigma}-\partial_\sigma g_{\mu\nu}\right).`,
  riemann:String.raw`\begin{aligned}
R^\rho{}_{\sigma\mu\nu}&=
\partial_\mu\Gamma^\rho{}_{\nu\sigma}-\partial_\nu\Gamma^\rho{}_{\mu\sigma}
+\Gamma^\rho{}_{\mu\lambda}\Gamma^\lambda{}_{\nu\sigma}
-\Gamma^\rho{}_{\nu\lambda}\Gamma^\lambda{}_{\mu\sigma},\\
R_{\mu\nu}&=R^\rho{}_{\mu\rho\nu},\qquad R=g^{\mu\nu}R_{\mu\nu}.
\end{aligned}`,
  curvature3:String.raw`F_{ab}^{i}[A]=2\partial_{[a}A_{b]}^{i}
+\epsilon^{i}{}_{jk}A_a^jA_b^k.`,
  holonomySeries:String.raw`h_e[A]=\mathbb 1+\int_eA+\int_{0<s_2<s_1<1}A(s_1)A(s_2)\,ds_1ds_2+\cdots.`
};

const STEPS=[
  {
    title:'Action',
    copy:actionDescription,
    primary:()=>{
      if($('lqg-variables').value==='metric')return {id:'A2',title:'Einstein–Hilbert action',tex:lambdaTex(eq('A2').latex)};
      return {id:'A4',title:$('lqg-action').value==='holst'?'Einstein–Cartan–Holst action':'Einstein–Cartan action',tex:compactTetradAction()};
    },
    expansions:()=>{
      if($('lqg-variables').value==='metric'){
        const x=[
          {title:'Metric and tetrad variables',text:'A tetrad determines the spacetime metric.',id:'A1'},
          {title:'Levi-Civita connection',text:'In the metric formulation the connection is not an independent variable.',tex:FORMULAS.christoffel},
          {title:'Curvature in components',text:'Expanding the Ricci scalar gives the Riemann tensor, Ricci tensor and their contraction.',tex:FORMULAS.riemann}
        ];
        if($('lqg-boundary').checked)x.push({title:'Smooth non-null boundary',text:'For Dirichlet metric data on a smooth non-null boundary, add the Gibbons–Hawking–York term.',id:'A8'});
        if($('lqg-topological').checked)x.push({title:'Topological densities',text:'Euler and Pontryagin densities are independent of the local Einstein equations; the listed first-order set also includes Nieh–Yan.',id:'A7'});
        return x;
      }
      const x=[
        {title:'Restore the internal indices',text:'The compact form above suppresses the Lorentz-index contraction.',tex:holstIndexed(),id:'A4',sourceOnly:true},
        {title:'Write the differential forms in components',text:'The tetrad two-form and Lorentz curvature can be expanded explicitly in spacetime indices.',tex:FORMULAS.componentsTetrad},
        {title:'Curvature and internal Hodge dual',text:'The curvature is the field strength of the Lorentz connection; the Hodge dual acts on internal bivector indices.',id:'A3'},
        {title:'Metric and oriented four-volume',text:'The tetrad reconstructs the metric and fixes the oriented volume form.',ids:['A1','A5']},
        {title:'Vary the independent connection',text:'For a nondegenerate tetrad in vacuum, the connection equation gives the torsion-free sector.',id:'A6'}
      ];
      if($('lqg-topological').checked)x.push({title:'Independent topological densities',text:'Nieh–Yan, Pontryagin and Euler densities can be displayed separately from the Einstein–Cartan–Holst action.',id:'A7'});
      if($('lqg-boundary').checked)x.push({title:'Metric GHY boundary term',text:'The displayed boundary formula is the standard metric GHY term; first-order boundary terms depend on the chosen variational principle.',id:'A8'});
      return x;
    }
  },
  {
    title:'3+1 split',
    copy:()=>`A 3+1 decomposition isolates the spatial geometry. After time gauge, the real Ashtekar–Barbero connection combines the spin connection with extrinsic curvature.`,
    primary:()=>({id:'K3',title:'Ashtekar–Barbero connection',tex:eq('K3').latex}),
    expansions:()=>[
      {title:'ADM decomposition',text:'Lapse and shift separate the normal and tangential parts of the spacetime evolution.',id:'K1'},
      {title:'Densitized triad',text:'The triad is repackaged into the momentum variable conjugate to the connection.',id:'K2'},
      {title:'Spin connection',text:'The torsion-free spatial spin connection is fixed by compatibility with the triad.',id:'K4'}
    ]
  },
  {
    title:'Canonical algebra',
    copy:()=>`The Ashtekar–Barbero connection and densitized triad form a canonical pair. Gauge invariance and spacetime diffeomorphism symmetry are encoded in the Gauss, spatial-diffeomorphism and Hamiltonian constraints.`,
    primary:()=>({id:'K5',title:'Canonical Poisson bracket',tex:eq('K5').latex}),
    expansions:()=>[
      {title:'Curvature of the SU(2) connection',text:'The curvature entering the constraints is the field strength of A.',tex:FORMULAS.curvature3},
      {title:'Gauss constraint',text:'Generates internal SU(2) gauge transformations.',id:'K6'},
      {title:'Spatial diffeomorphism constraint',text:'Generates diffeomorphisms tangent to the spatial slice, up to the Gauss term.',id:'K7'},
      {title:'Hamiltonian constraint',text:'Encodes the remaining normal deformation of the slice.',id:'K8',transform:lambdaTex}
    ]
  },
  {
    title:'Smear & quantize',
    copy:()=>`The connection is integrated along edges and the triad across surfaces. These nonlocal variables define the holonomy–flux algebra used in the quantum theory.`,
    primary:()=>({id:'H1',title:'Holonomy and flux',tex:eq('H1').latex}),
    expansions:()=>[
      {title:'Expand the path ordering',text:'The holonomy is the path-ordered exponential of the connection along the edge.',tex:FORMULAS.holonomySeries},
      {title:'Endpoint derivatives',text:'Left- and right-invariant vector fields act at the source and target of a holonomy.',id:'H2'},
      {title:'Endpoint Lie algebra',text:'The quantized fluxes reproduce the su(2) algebra.',id:'H3'},
      {title:'Action on a holonomy',text:'The endpoint generators insert SU(2) generators on the corresponding side of the holonomy.',id:'H4'},
      {title:'Closure at a node',text:'Gauge invariance imposes the quantum Gauss law at every node.',id:'H5'},
      {title:'Source–target relation',text:'Fluxes at the two ends of a link are related by parallel transport.',id:'H6'}
    ]
  },
  {
    title:'Hilbert space',
    copy:()=>`For a fixed graph Γ with L links and N nodes, cylindrical states are square-integrable functions of SU(2) holonomies, invariant under the SU(2) gauge action at the nodes.`,
    primary:()=>({id:'T1',title:'Hilbert space on a graph',tex:unbox(eq('T1').latex)}),
    expansions:()=>[
      {title:'Before and after Gauss averaging',text:'Start from one SU(2) copy per link, then project to the gauge-invariant subspace.',id:'S1'},
      {title:'Peter–Weyl decomposition',text:'Each link Hilbert space decomposes into irreducible SU(2) representation spaces.',id:'S2'},
      {title:'Spin-network basis',text:'Representation labels on links and intertwiners at nodes provide an orthonormal basis.',id:'S7'},
      {title:'Inner product',text:'The Haar measure fixes the orthogonality of the spin-network basis.',id:'S8'}
    ]
  },
  {
    title:'Geometry',
    copy:()=>`Geometric observables are built from the flux generators. Their noncommutative algebra underlies discrete spectra for areas, angles and volumes.`,
    primary:()=>({id:'T2',title:'Algebra of observables',tex:unbox(eq('T2').latex)}),
    expansions:()=>[
      {title:'Intertwiner space',text:'At a node, gauge invariance restricts tensor products of link representations to their invariant subspace.',id:'I4'},
      {title:'Area spectrum',text:'The SU(2) Casimir fixes the area carried by a link puncturing a surface.',id:'G1'},
      {title:'Angle operator',text:'Scalar products of fluxes give angles between faces of a quantum polyhedron.',id:'G3'},
      {title:'Volume operator',text:'Triple products of fluxes define the oriented volume; the positive operator takes its absolute value.',id:'G5'}
    ]
  },
  {
    title:'Dynamics',
    copy:()=>`The covariant dynamics maps SU(2) boundary data into simple SL(2,C) representations and evaluates the gauge-projected state at the identity. This defines the elementary EPRL vertex.`,
    primary:()=>({id:'T3',title:'EPRL vertex amplitude',tex:unbox(eq('T3').latex)}),
    expansions:()=>[
      {title:'EPRL embedding',text:'The Yγ map selects the γ-simple Lorentz representations associated with each SU(2) spin.',id:'Y4'},
      {title:'Gauge-fixed vertex integral',text:'The group averaging can be written as an explicit SL(2,C) integral with one redundant integration removed.',id:'D6'},
      {title:'Fixed-complex amplitude',text:'A spin-foam amplitude on a fixed two-complex combines face, edge and vertex data.',id:'F1'}
    ]
  },
  {
    title:'Unfold the vertex',
    copy:()=>`The Lorentzian vertex can be unfolded into SU(2) recoupling data and one-dimensional boost integrals. Further expansion exposes magnetic indices, booster functions and, in the causal formulation, Toller matrices.`,
    primary:()=>({id:'D9',title:eq('D9').title,tex:eq('D9').latex}),
    expansions:()=>[
      {title:'Separate compact recoupling and boosts',text:'The vertex factorization isolates a central SU(2) recoupling object from the boost integrations.',id:'B6'},
      {title:'Booster function',text:'Each booster is a one-dimensional rapidity integral over SL(2,C) boost matrix elements.',id:'B4'},
      {title:'Magnetic-index expansion',text:'The projected Lorentz kernels can be written explicitly in magnetic indices.',id:'M4'},
      {title:'Causal/Toller branch',text:'Toller matrices provide the causal decomposition used by the causal vertex.',id:'Q1'}
    ]
  }
];

function syncActionOptions(){
  const variable=$('lqg-variables').value;
  const select=$('lqg-action');
  const old=select.value;
  const options=variable==='metric'
    ? [['eh','Einstein–Hilbert (second order)']]
    : [['holst','Einstein–Cartan–Holst (first order)'],['ec','Einstein–Cartan (first order)']];
  select.replaceChildren(...options.map(([value,label])=>{
    const o=document.createElement('option');o.value=value;o.textContent=label;return o;
  }));
  select.value=options.some(([value])=>value===old)?old:options[0][0];
}

function primaryCard(step){
  const p=step.primary();
  const article=document.createElement('article');
  article.className='lqg-guide-primary';
  article.dataset.eq=p.id;
  article.innerHTML=`<div class="lqg-guide-primary-head"><div><small>${escape(data.groups[eq(p.id).group].title)}</small><h3>${escape(p.title)}</h3></div></div>`;
  article.append(displayTex(p.tex,false));
  const details=document.createElement('details');
  details.className='lqg-guide-source';
  details.innerHTML=`<summary>Source &amp; LaTeX</summary><p>${sourceLine(p.id)}</p><pre><code></code></pre>`;
  details.querySelector('code').textContent=p.tex;
  article.append(details);
  return article;
}

function expansionFormula(item){
  const wrap=document.createElement('div');
  if(item.ids){
    item.ids.forEach(id=>{
      const tex=item.transform?item.transform(eq(id).latex):eq(id).latex;
      wrap.append(displayTex(tex,true));
      const src=document.createElement('p');src.className='lqg-guide-mini-source';src.innerHTML=sourceLine(id);wrap.append(src);
    });
    return wrap;
  }
  const tex=item.tex??(item.id?eq(item.id).latex:'');
  const finalTex=item.transform?item.transform(tex):tex;
  if(finalTex)wrap.append(displayTex(finalTex,true));
  if(item.id){
    const src=document.createElement('p');src.className='lqg-guide-mini-source';src.innerHTML=sourceLine(item.id);wrap.append(src);
  }
  return wrap;
}

function expansionDetails(step){
  const section=document.createElement('section');
  section.className='lqg-guide-develop';
  const h=document.createElement('h3');h.textContent='Develop the formula';section.append(h);
  const p=document.createElement('p');p.className='muted';p.textContent='Open only the level of detail you need.';section.append(p);
  step.expansions().forEach(item=>{
    const details=document.createElement('details');
    details.className='lqg-guide-detail';
    const summary=document.createElement('summary');
    summary.innerHTML=`<span>${escape(item.title)}</span><small>${escape(item.text)}</small>`;
    details.append(summary);
    details.addEventListener('toggle',()=>{
      if(details.open&&!details.dataset.rendered){
        details.append(expansionFormula(item));
        details.dataset.rendered='true';
        math(details);
      }
    });
    section.append(details);
  });
  return section;
}

function guide(){
  let stepIndex=0;
  const render=()=>{
    const nav=$('lqg-steps');nav.replaceChildren();
    STEPS.forEach((step,i)=>{
      const b=document.createElement('button');b.className='lqg-step';b.textContent=`${i+1}. ${step.title}`;
      b.setAttribute('aria-current',i===stepIndex?'step':'false');b.setAttribute('aria-pressed',String(i===stepIndex));
      b.addEventListener('click',()=>{stepIndex=i;render();});nav.append(b);
    });
    const step=STEPS[stepIndex];
    const copy=$('lqg-guide-copy');
    copy.innerHTML=`<h2>${stepIndex+1}. ${escape(step.title)}</h2><p>${escape(step.copy())}</p>`;
    if(stepIndex>=6&&$('lqg-lambda').value==='nonzero'){
      copy.innerHTML+='<p class="scope">Λ is kept in the classical action and canonical constraint. The undeformed EPRL vertex displayed here is the Λ = 0 model.</p>';
    }
    const cards=$('lqg-guide-cards');clear(cards);
    cards.append(primaryCard(step),expansionDetails(step));
    math(cards);
    $('lqg-guide-prev').disabled=stepIndex===0;
    $('lqg-guide-next').disabled=stepIndex===STEPS.length-1;
    const primary=step.primary();
    $('lqg-guide-atlas').href=`lqg-atlas.html?eq=${primary.id}`;
  };
  $('lqg-variables').addEventListener('change',()=>{syncActionOptions();render();});
  $('lqg-action').addEventListener('change',render);
  $('lqg-lambda').addEventListener('change',render);
  $('lqg-boundary').addEventListener('change',render);
  $('lqg-topological').addEventListener('change',render);
  $('lqg-guide-prev').addEventListener('click',()=>{stepIndex=Math.max(0,stepIndex-1);render();});
  $('lqg-guide-next').addEventListener('click',()=>{stepIndex=Math.min(STEPS.length-1,stepIndex+1);render();});
  syncActionOptions();
  render();
}

async function init(){
  try{
    const res=await fetch(root.dataset.catalogue);
    if(!res.ok)throw Error(`HTTP ${res.status}`);
    data=await res.json();
    byId=new Map(data.equations.map(e=>[e.id,e]));
    guide();
    announce('');
  }catch(error){
    announce(`The LQG equation catalogue could not be loaded: ${error.message}`);
  }
}
init();
