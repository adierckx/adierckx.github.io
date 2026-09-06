"""Write the four Quarto entry points; formula content lives in the catalogue."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PAGES=[('loop-quantum-gravity','Overview','Loop quantum gravity, unfolded','overview'),('build-lqg','Build LQG','Build loop quantum gravity','guide'),('lqg-atlas','Equation Atlas','Equation Atlas · Loop quantum gravity','atlas'),('lqg-diagrams','Diagram Lab','Diagram Lab · Loop quantum gravity','diagram')]
CONTROLS='''<div class="lqg-controls" role="complementary" aria-label="Atlas controls">
<label class="wide">Find an equation<input id="lqg-search" type="search" placeholder="Toller, volume, D9…" autocomplete="off"></label>
<label>Route<select id="lqg-route"><option value="both">Canonical + covariant</option><option value="canonical">Canonical</option><option value="covariant">Covariant</option></select></label>
<label>Representation<select id="lqg-representation"><option value="spin">Spins &amp; intertwiners</option><option value="coherent">Coherent states &amp; spinors</option></select></label>
<div class="wide"><label for="lqg-level">Development</label><div class="lqg-level-label"><output id="lqg-level-name">0 · Compact</output><span>0—7</span></div><input id="lqg-level" type="range" min="0" max="7" value="0" step="1"><small>Sets the starting equations. Expand any card independently.</small></div>
<label class="wide">Browse a subject<select id="lqg-group"><option value="all">Current development level</option></select></label>
<div class="wide lqg-buttons"><button id="lqg-toller">Toller matrices</button><button id="lqg-causal">Causal vertex</button><button id="lqg-lowspin">Low spins</button></div>
<label><input id="lqg-colour" type="checkbox"> Semantic colour</label><label><input id="lqg-show-diagram" type="checkbox"> Wiring diagram</label>
<div class="wide lqg-buttons"><button id="lqg-reset">Reset view</button><button id="lqg-export">Export visible .tex</button></div>
<details class="wide"><summary>Notation &amp; common convention</summary><dl class="lqg-notation"><div><dt>j, m</dt><dd>SU(2) spin and magnetic index.</dd></div><div><dt>i, k</dt><dd>Intertwiner label and virtual spin; k in (ρ,k) is a Lorentz label.</dd></div><div><dt>ℓ, r</dt><dd>Auxiliary SU(2) spin and boost rapidity.</dd></div><div><dt>ℓ₀² = 8πγGℏ</dt><dd>Flux and area unit. γ &gt; 0.</dd></div><div><dt>σ, κ</dt><dd>Node and induced wedge signs; distinct from wire arrows.</dd></div></dl><p>Normalized intertwiners; source-left holonomies; Speziale phases. Toller matrices use the explicit Rühl-to-Speziale conversion.</p><button data-open="C1">Open conventions</button></details>
</div>'''
CONTENT={
'overview':'''<header><p class="eyebrow">Quantum geometry · states · amplitudes</p><h1>Loop quantum gravity,<br>unfolded.</h1><p class="lede">Start with three compact equations. Follow their ingredients through the classical action, quantum geometry and the Lorentzian vertex, down to magnetic indices, boosters and factorials.</p></header>
<div id="lqg-overview-equations" class="lqg-start-equations"></div>
<section class="lqg-grid lqg-section" aria-label="Choose an entry point"><a class="lqg-entry" href="build-lqg.html"><p class="eyebrow">01 · Guided construction</p><h2>Build LQG</h2><p>Move from the action to boundary states and dynamics, with the assumptions at each step.</p><span>Begin the chapter →</span></a><a class="lqg-entry" href="lqg-atlas.html"><p class="eyebrow">02 · Free exploration</p><h2>Equation Atlas</h2><p>127 numbered equations. Choose a route, expand locally, inspect a source and copy the LaTeX.</p><span>Explore the mathematics →</span></a><a class="lqg-entry" href="lqg-diagrams.html"><p class="eyebrow">03 · Annotated wiring</p><h2>Diagram Lab</h2><p>Inspect ordered ports, spins, intertwiners and causal signs on the four-simplex boundary.</p><span>Work with the diagrams →</span></a></section>
<section class="lqg-section"><h2>One boundary, two routes</h2><p class="lede">Canonical quantization describes states and geometric operators on a graph. The covariant route assigns amplitudes to transitions between those boundary states. Their shared boundary language is explicit here; identifying their full quantum dynamics requires further input.</p><div class="lqg-key"><span>Shared boundary data</span><span>Canonical geometry</span><span>Covariant amplitudes</span></div></section>''',
'atlas':'''<header class="lqg-header"><div><p class="eyebrow">Loop quantum gravity · free exploration</p><h1>Equation Atlas.</h1><p class="lede">Unfold the mathematics one ingredient at a time. Every equation retains its review number, assumptions and source.</p></div></header>
<div class="lqg-layout">'''+CONTROLS+'''<section class="lqg-stage" aria-label="Equations and diagrams"><div id="lqg-breadcrumbs" class="lqg-breadcrumbs" aria-label="Equation trail"></div><div id="lqg-colour-key" class="lqg-key" hidden><span>Shared data</span><span>Canonical</span><span>Covariant</span></div><div id="lqg-status" class="lqg-status" role="status" aria-live="polite"></div><div id="lqg-pins"></div><div id="lqg-cards"></div><section id="lqg-atlas-diagram" class="lqg-diagram-panel" hidden><h2>Formula ↔ wiring</h2><p>Select a wire for its projected kernel, or a node for its intertwiner.</p><div id="lqg-atlas-svg" class="lqg-svg-wrap"></div><p id="lqg-wire-info" class="lqg-status"></p><a href="lqg-diagrams.html">Full Diagram Lab →</a></section><section id="lqg-examples" class="lqg-section"></section></section></div>''',
'guide':'''<header><p class="eyebrow">Loop quantum gravity · guided construction</p><h1>From an action to an amplitude.</h1><p class="lede">Eight steps through the shared structure. Choose the classical variables first, then see where time gauge, quantization and model choices enter.</p></header>
<div class="lqg-card"><div class="lqg-control-row"><label>Classical variables<select id="lqg-variables"><option value="tetrad">Tetrad &amp; connection</option><option value="metric">Metric</option></select></label><label>Action<select id="lqg-action"><option value="holst">Palatini–Holst</option><option value="palatini">Palatini</option></select></label><label>Classical Λ<select id="lqg-lambda"><option value="zero">Λ = 0</option><option value="nonzero">Keep Λ explicit</option></select></label></div><details><summary>Boundary and topological terms</summary><label><input type="checkbox" id="lqg-boundary"> Smooth non-null metric boundary</label><label><input type="checkbox" id="lqg-topological"> Show independent topological densities</label><p class="muted">These choices expose the corresponding classical terms. They do not define a deformed spin-foam model.</p></details></div>
<nav id="lqg-steps" class="lqg-steps" aria-label="Construction steps"></nav><div id="lqg-guide-copy" class="lqg-guide-copy"></div><div id="lqg-guide-cards"></div><div class="lqg-buttons"><button id="lqg-guide-prev">← Previous</button><button id="lqg-guide-next" class="primary">Next →</button><a class="lqg-download" id="lqg-guide-atlas" href="lqg-atlas.html">Explore this step in the atlas</a></div>''',
'diagram':'''<header><p class="eyebrow">Loop quantum gravity · exact topology</p><h1>Diagram Lab.</h1><p class="lede">The five tetrahedra and ten wires of a four-simplex boundary. The port ordering follows the supplied TikZ macro; crossings carry no extra vertices.</p></header>
<div class="lqg-diagram-grid"><section class="lqg-diagram-panel"><div class="lqg-control-row"><label>Annotations<select id="lqg-annotations"><option value="2">Labels + arrows</option><option value="1">Labels</option><option value="0">Bare wiring</option></select></label><label>Rotate <output id="lqg-rotation-value">0°</output><input type="range" id="lqg-rotation" min="0" max="360" step="18" value="0"></label></div><div id="lqg-lab-svg" class="lqg-svg-wrap"></div><div class="lqg-buttons"><button id="lqg-save-svg">Download SVG</button><button id="lqg-save-tikz">Download TikZ</button><button id="lqg-diagram-reset">Reset diagram</button></div><p id="lqg-diagram-status" class="lqg-status" role="status" aria-live="polite"></p></section><section><div class="lqg-card"><h2>Inspect a wire or tetrahedron</h2><div id="lqg-selection"></div></div><div class="lqg-card"><h2>Causal assignments</h2><label><input id="lqg-causal-signs" type="checkbox"> Show induced causal signs</label><div id="lqg-sigma" class="lqg-buttons"></div><p id="lqg-cycle-info"></p><a href="lqg-atlas.html?eq=CV1">Open the sign equations →</a></div><details class="lqg-card"><summary>All ten spin labels and wire types</summary><div id="lqg-spin-editor" class="lqg-wire-editor"></div></details></section></div>
<section class="lqg-section"><h2>Gluing a shared tetrahedron</h2><p class="lede">The two boundary state spaces are dualized. Matching four external spins is necessary; the shared intertwiner is summed in an orthonormal basis. Reversing a port pairing can require a recoupling matrix.</p><div class="lqg-control-row"><label>Port map<select id="lqg-glue-map"><option value="identity">1→1, 2→2, 3→3, 4→4</option><option value="reverse">1→4, 2→3, 3→2, 4→1</option></select></label></div><div id="lqg-glue-svg"></div><div id="lqg-glue-formula"></div></section><section id="lqg-examples" class="lqg-section"></section>'''
}
for slug,label,title,mode in PAGES:
    nav=''.join(f'<a href="{s}.html"'+(' aria-current="page"' if s==slug else '')+f'>{l}</a>' for s,l,_,_ in PAGES)
    page=f'''---
title: "{title}"
description: "Explore loop quantum gravity through sourced equations, quantum geometry, EPRL boosters and annotated four-simplex diagrams."
page-layout: full
toc: false
format:
  html:
    css:
      - ../assets/lqg/lqg.css
---

::: {{.column-screen}}

::: {{.lqg-bootstrap aria-hidden="true"}}
$x$
:::

```{{=html}}
<div id="lqg-app" class="lqg" data-mode="{mode}" data-catalogue="../assets/lqg/catalogue.json">
<nav class="lqg-nav" aria-label="LQG project">{nav}</nav>
{CONTENT[mode]}
<p id="lqg-load-status" class="lqg-status" role="status">Loading the equation catalogue…</p>
<noscript><p>The interactive controls need JavaScript. <a href="../assets/lqg/equations.tex">Download all numbered equations as LaTeX</a>.</p></noscript>
</div>
<script type="module" src="../assets/lqg/app.mjs"></script>
```

:::
'''
    (ROOT/'outreach'/f'{slug}.qmd').write_text(page)
