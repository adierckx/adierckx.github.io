# LQG section

Four Quarto pages share `assets/lqg/catalogue.json` and scoped browser modules:

- `outreach/loop-quantum-gravity.qmd`: three starting equations and entry points.
- `outreach/build-lqg.qmd`: eight construction steps and classical action choices.
- `outreach/lqg-atlas.qmd`: development frontiers, local expansion DAG, search,
  route/representation filters, pins, sources, LaTeX and wiring inspection.
- `outreach/lqg-diagrams.qmd`: the supplied ten-wire/20-port topology, node
  pairings, spins, causal signs, gluing and low-spin geometry controls.

## Editing

The reviewed formula source is `catalogue-source.tex`. Stable IDs (C1, T1, …)
remain feedback targets. Edit annotations, titles, source locators and expansion
edges in `../build_lqg_catalogue.py`, then run from the repository root:

```sh
python3 tools/build_lqg_catalogue.py
```

This generates both JSON and the portable `assets/lqg/equations.tex` fallback.
Quarto's pre-render hook runs it automatically. The original review prose in
`catalogue-source.tex` is historical context; website annotations come from the
generator. To edit the page skeletons, change `create_pages.py` and run:

```sh
python3 tools/lqg/create_pages.py
```

Browser code is native JavaScript modules, with no runtime npm dependencies.
MathJax is provided by Quarto. Every equation has its own source/LaTeX fallback.
SVG and TikZ downloads contain the current diagram configuration. The topology
and mathematical calculations are kept independently of the DOM in `core.mjs`.

## Conventions and review boundary

- SU(2): Condon–Shortley, unit Haar measure, orthonormal intertwiners.
- Holonomies: source-left gauge action and right path ordering, explained at H1.
- Lorentz: Speziale phases on real ρ; Toller phase conversion is explicit in Q3–Q6.
- EPRL: (ρ,k) = (γj,j), Λ = 0; classical Λ does not alter this amplitude.
- The first-order action retains the approved catalogue's sign choice. Its
  identification with the canonical symplectic convention needs a final
  check with curvature and extrinsic-curvature signs declared together.
- The all-outgoing contraction D7 defines its duality/port convention. Matching
  its boundary prefactors to the holonomy kernel D4 is not asserted implicitly.
- B6 displays the normalized booster/tensor structure. The central K₅ tensor
  retains permutations/duality phases. R1 is the reference first-kind 15j;
  this implementation does **not** claim that R1 is directly the user's port
  ordering. A direct magnetic-contraction/15j phase comparison remains a
  scientific review item. No numerical vertex evaluator is advertised.
- AL/RS constants remain explicit; the low-spin workbench uses the stated
  tetrahedral volume operator, not an unspecified regularization.
- Toller sectors are a separate causal model. No `d → t` booster substitution
  or unregulated finite-sector integral is implemented.

## Verification

The dependency-free gate runs in pull requests and never deploys:

```sh
node --test tools/lqg/test_core.mjs
node --check assets/lqg/app.mjs
node --check assets/lqg/diagram.mjs
```

Optional DOM/MathJax checks (no browser or server):

```sh
npm install --prefix /tmp/lqg-validation --no-audit --no-fund jsdom@26 mathjax-full@3
LQG_VALIDATION_MODULES=/tmp/lqg-validation/node_modules node tools/lqg/test_dom.mjs
```

They cover all 127 TeX formulas and the controls in all four pages. Set
`LQG_TIKZ_CHECK_OUTPUT` to save the tested TikZ download for compilation.

Optional independent scientific checks use numpy, sympy and mpmath:

```sh
python3 tools/lqg/verify_physics.py
```

These reconstruct the spin-1/2 and spin-1 Q matrices from the CG basis and check
60 cases of the minimal Toller sum and terminating-polynomial identities.

Render the four pages with the existing Quarto toolchain. Local validation used
Quarto 1.6.43/Pandoc 3.4: Quarto 1.10.18's bundled Pandoc executable segfaulted
even on `--version` in the authoring container. This is not a site dependency
change. The existing deployment workflow is unchanged and runs only on main.
No browser-based visual or end-to-end checks have been performed in this draft.
