"""Build the LQG atlas from the reviewed, numbered LaTeX catalogue.

No network access or third-party dependencies. Scientific annotations live here;
the equations retain the stable review IDs from catalogue-source.tex.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'tools/lqg/catalogue-source.tex'
DEST = ROOT / 'assets/lqg/catalogue.json'

SOURCES = {
 'primer': {'title': 'Martin-Dussaud · A Primer of Group Theory for LQG and Spin-foams', 'url': 'https://arxiv.org/abs/1902.08439', 'locator': 'SU(2), SL(2,C), and graphical-calculus sections'},
 'rv': {'title': 'Rovelli & Vidotto · Covariant Loop Quantum Gravity', 'url': 'https://www.cpt.univ-mrs.fr/~rovelli/IntroductionLQG.pdf', 'locator': 'Classical theory, quantum geometry, and transition amplitudes'},
 'boost': {'title': "Speziale · Boosting Wigner’s nj-symbols", 'url': 'https://arxiv.org/abs/1609.01632', 'locator': 'Eqs. (11)–(13), (21)–(25)'},
 'howto': {'title': 'Donà & Frisoni · How-To compute EPRL spin foam amplitudes', 'url': 'https://arxiv.org/abs/2202.04360', 'locator': 'Vertex decomposition and Appendix A'},
 'toller': {'title': 'Bianchi, Chen & Gamonal · Toller matrices and the Feynman iε in spinfoams', 'url': 'https://arxiv.org/abs/2604.24945v1', 'locator': 'Sections II–IV and Appendix A'},
 'causal': {'title': 'Bianchi, Chen & Gamonal · Causal spinfoam vertex for 4d Lorentzian quantum gravity', 'url': 'https://arxiv.org/abs/2601.23162', 'locator': 'Causal vertex and wedge-orientation prescription'},
}
# prefix: title, level, route, source, concise interpretation/domain
GROUPS = {
 'C': ('Conventions', 0, 'both', 'primer', 'Keep ℏ explicit; c = 1, γ > 0. Haar measure on SU(2) has unit total mass. Condon–Shortley phases and normalized intertwiners fix the compact-group basis.'),
 'T': ('Three starting equations', 0, 'both', 'rv', 'A fixed graph carries quantum geometry. The covariant amplitude acts on the same boundary data. This bridge does not establish equivalence with a unique canonical quantum dynamics.'),
 'A': ('Classical gravity', 1, 'both', 'rv', 'Vacuum, nondegenerate tetrads and a fixed orientation. The cosmological term belongs to the classical action; the undeformed EPRL vertex in this atlas has Λ = 0.'),
 'K': ('Canonical variables', 2, 'canonical', 'rv', 'The Ashtekar–Barbero connection uses a 3+1 splitting and time gauge. These are classical constraints, before a choice of quantum Hamiltonian regularization.'),
 'H': ('Holonomy–flux algebra', 3, 'canonical', 'rv', 'Continuum fluxes and gauge-covariant graph fluxes are distinct. Endpoint generators are outgoing at each node. The source acts on the left of the holonomy.'),
 'S': ('Boundary Hilbert space', 4, 'both', 'primer', 'Fixed-graph, Gauss-invariant kinematics. This space has not yet imposed the diffeomorphism and Hamiltonian constraints. Node tensors are normalized.'),
 'I': ('Intertwiners', 5, 'both', 'primer', 'The four-valent basis couples ordered ports (1,2) and (3,4). A permutation can require a phase or recoupling; it is not just a graphical relabelling.'),
 'G': ('Quantum geometry', 5, 'canonical', 'rv', 'Areas are in units of ℓ₀² and tetrahedral volumes in units of ℓ₀³. The angle is between outward face normals; the interior dihedral angle is its supplement.'),
 'L': ('Low-spin examples', 5, 'both', 'primer', 'These examples use the normalized Clebsch–Gordan basis (I4). Oriented triple products can have either sign; volume is positive and can be degenerate.'),
 'Y': ('Lorentz representations & simplicity', 6, 'covariant', 'primer', 'The default EPRL map uses (ρ,k) = (γj,j). Simplicity is weak/projected. The alternative ρ = γ(j+1) is a different finite-spin prescription.'),
 'D': ('The EPRL vertex', 6, 'covariant', 'howto', 'Fix g₁ = 1 to remove the redundant noncompact group integral. Contractions include duality tensors and ordered node legs; boundary normalization is part of the amplitude definition.'),
 'F': ('Foams & gluing', 6, 'covariant', 'rv', 'Face, edge and boundary normalization conventions must be used together. The boundary being glued is dualized according to orientation.'),
 'B': ('Cartan decomposition & boosters', 7, 'covariant', 'boost', 'Four boosters remain after fixing one tetrahedron. There are six independent auxiliary face spins. Normalized boosters differ from the literature’s unnormalized 4jm convention.'),
 'R': ('Recoupling to factorials', 7, 'both', 'howto', 'Only sum over admissible spins and nonnegative denominator factorials. The named first-kind 15j is a reference convention, not an automatic identification with every K₅ port ordering.'),
 'M': ('Reduced Lorentz matrices', 7, 'covariant', 'boost', 'Real ρ, the Speziale phase convention, and r ≥ 0. The hypergeometric power series is used inside |z| < 1; analytic continuation is a separate operation.'),
 'Q': ('Toller matrices', 7, 'covariant', 'toller', 'T⁺ + T⁻ = D, but neither branch obeys the Wigner composition law. Use r > 0 for separate branches; coincident boosts and spectral poles need the stated limiting prescription.'),
 'CV': ('Causal vertex', 6, 'covariant', 'causal', 'A separate causal-model branch. Induced signs obey every cycle constraint: 16 assignments on K₅, versus 1024 unrestricted wedge assignments. A common regulator is needed before interchanging singular integrals.'),
 'CO': ('Coherent states & spinors', 5, 'both', 'rv', 'A separate representation of boundary data, not another development level. Coherent-state phases and boundary dualizations must match the spin/intertwiner amplitude.'),
}
TITLES = {
 'C': ['Units and metric signature','Generators and dimensions','Matrix elements and Haar measure','Duality tensor'],
 'T': ['States on a graph','Quantum geometry algebra','The vertex amplitude'],
 'A': ['Metric from a tetrad','Einstein–Hilbert action','Curvature and internal dual','Palatini–Holst action','Oriented four-volume','Torsion-free sector','Topological densities','Smooth non-null boundary term'],
 'K': ['ADM line element','Densitized triad','Ashtekar–Barbero connection','Spin connection','Canonical Poisson bracket','Gauss constraint','Spatial diffeomorphisms','Hamiltonian constraint'],
 'H': ['Smeared variables','Endpoint derivatives','Endpoint Lie algebra','Action on a holonomy','Closure at a node','Source–target relation'],
 'S': ['Before and after Gauss averaging','Peter–Weyl theorem','Wigner orthogonality','Fourier coefficients','Link representation spaces','Gauge averaging','Spin-network decomposition','Normalized spin-network functions'],
 'I': ['Trivalent invariant','Clebsch–Gordan and 3j','Trivalent admissibility','Normalized four-valent tensor','Allowed virtual spins','Invariant projector','6j change of coupling','General port-order change'],
 'G': ['Area spectrum','Area of a surface','Outward-normal angle operator','Angle in a coupling basis','Quantum tetrahedron volume','Volume from a commutator','AL and RS regularizations'],
 'L': ['Normalized one-loop state','SU(2) character','First three characters','A trivalent example','Four spins one-half','Singlet and triplet basis','Oriented volume: spin one-half','Opposite orientations, equal volume','Oriented volume: spin one','Spin-one spectrum','Spin-one zero-volume state'],
 'Y': ['Lorentz Lie algebra','Principal-series decomposition','Lorentz Casimirs','The EPRL embedding','Minimal-spin projector','Projected boost generator','Default weak simplicity','Alternative finite-spin map','Constrained BF action'],
 'D': ['Projected Lorentz kernel','Formal Lorentz averaging','Relative group elements','Holonomy vertex kernel','Trace as magnetic sums','Fixed-label vertex','All-outgoing tensor convention','Kernel and duality tensor','Resolve the auxiliary spins'],
 'F': ['A fixed-complex amplitude','Face and edge weights','Boundary-state evaluation','Wedge-variable structure','Delta distribution','Gluing in an orthonormal basis'],
 'B': ['Cartan decomposition','Lorentz Haar measure','Rotations and a reduced boost','Normalized four-valent booster','Normalization conversion','Four-booster tensor structure','Gauge-fixed auxiliary spins'],
 'R': ['First-kind 15j reference convention','Triangle factor','Racah formula for 6j','Factorial formula for 3j'],
 'M': ['Gamma-function phase','General reduced matrix','Minimal-to-auxiliary block','Minimal reduced block','Hypergeometric series'],
 'Q': ['Toller decomposition','Cartan form of Toller matrices','Common-basis conversion','Rühl-to-Speziale phase','Spectral polynomial','Feynman iε representation','Minimal Toller block','Terminating-polynomial form','Scalar principal-series example','Spin-one-half Toller branches','Failure of composition'],
 'CV': ['Node signs induce wedge signs','Causal vertex amplitude','Independent wedge expansion','Cycle constraint','The induced sum is a different model'],
 'CO': ['Spin coherent state','Coherent intertwiner','Semiclassical closure','Spinor flux vector','Spinor direction and state','Change to intertwiner coefficients','Coherent boundary amplitude','Regge asymptotics'],
}
CHILDREN = {
 'T1':['S1','S7'], 'T2':['H3','G1','G5'], 'T3':['Y4','D2','D6','F1'],
 'A2':['A1','A4','A8'], 'A4':['A3','A5','A6','A7','Y9'],
 'K3':['K2','K4','K5'], 'K5':['H1','K6','K7','K8'],
 'H1':['H2','H4'], 'H3':['H2','H5','H6'],
 'S1':['S2','S6'], 'S2':['S3','S4','S5'], 'S7':['S8','I1','I4','L1'],
 'S8':['C4','I6'], 'I1':['I2','I3','R4'], 'I4':['I2','I5','I6','I7','I8'],
 'I7':['R3'], 'G1':['G2','L2'], 'G3':['G4'], 'G5':['G6','G7','L7','L9'],
 'L1':['L2','L3'], 'L4':['I1'], 'L5':['L6','L7'], 'L7':['L8'], 'L9':['L10','L11'],
 'Y4':['Y1','Y2','Y3','Y5','Y6','Y7','Y8','Y9'],
 'D2':['D3','D4'], 'D4':['D5','D1'], 'D6':['D7','D9','B6','CV2'], 'D7':['D8','I4','C4'],
 'D1':['M4'], 'D9':['B1','B3'], 'F1':['F2','F3','F4','F6'], 'F4':['F5','D4'],
 'B1':['B2'], 'B3':['M2'], 'B6':['B7','B4','R1'], 'B4':['B5','I4','M3'],
 'R1':['I8','R3'], 'R3':['R2'], 'M2':['M1','M3','M5'], 'M3':['M4'], 'M4':['M5'],
 'Q1':['Q2','Q6','Q7','Q11'], 'Q2':['Q3','Q4'], 'Q6':['Q3','Q5'], 'Q3':['Q4'],
 'Q7':['Q8','Q9','Q10'], 'Q8':['M5'], 'CV2':['CV1','Q1','CV3','CV5'],
 'CV1':['CV4'], 'CV3':['CV4'], 'CO1':['CO4','CO5'], 'CO2':['CO1','CO3','CO6'],
 'CO7':['CO2','D6','CO8'],
}
NOTES = {
 'T3': 'P denotes formal noncompact averaging with the redundant vertex integration removed; it is not a bounded orthogonal L² projector.',
 'A4': 'Take ε₀₁₂₃ = +1 and an oriented tetrad with positive volume form. The Holst coefficient is +1/γ in this convention. Removing it does not preserve a γ-dependent canonical quantization automatically.',
 'A8': 'Smooth non-null metric boundary with fixed induced metric. Null faces and joints require their own boundary terms.',
 'H1': 'Fix right path ordering: ∂ₜh(0,t) = h(0,t) A(ė(t)), h(0,0) = 1, with A = Aₐⁱτᵢ dxᵃ. Under A ↦ uAu⁻¹ − du u⁻¹ this gives hₑ ↦ uₛhₑuₜ⁻¹, consistent with (H2)–(H6).',
 'G3': 'Undefined on a zero-area face. The interactive angle calculator excludes j = 0.',
 'G7': 'Structural comparison with explicit C_AL and C_RS regularization constants. No numerical identification with the tetrahedral operator is assumed without an embedding and a normalization choice.',
 'L1': 'The normalized character has no extra √dⱼ factor.',
 'L7': 'Derived by evaluating the triple product in the Clebsch–Gordan basis (I4).',
 'L9': 'Derived in the same ordered basis (I4), k = 0,1,2.',
 'Y8': 'For j > 0. This is a projected matrix-element identity, not a strong Lorentz-representation constraint.',
 'D7': 'Definition of the all-outgoing contraction used here: order legs as in the Diagram Lab and use (D8) on each oriented pair. A comparison with the holonomy kernel (D4) additionally requires the dual boundary-state convention; no equality of their boundary prefactors is inferred.',
 'B6': 'Tensor structure in a compatible normalized recoupling basis. J_K₅ includes the leg permutations and duality phases. The supplied port ordering is retained; the reference first-kind 15j (R1) is not substituted for J_K₅ without the basis changes (I8).',
 'B5': 'This conversion assumes qᵢ = iᵢ/√dᵢ. Dimension factors cannot be copied between normalized and unnormalized 4jm conventions.',
 'R1': 'Reference first-kind 15j convention, Appendix A of Donà–Frisoni. Reaching this ordering from the supplied wiring may require recoupling through (I8).',
 'M5': 'Power series for |z| < 1 and c outside the nonpositive integers. For a terminating polynomial use the finite product definition of (a)ₙ, including when a is a negative integer.',
 'Q4': 'Unit modulus for real ρ; Φⱼⱼ = 1. Analyticity claims apply in the Rühl basis, before this rephasing.',
 'Q6': 'Adapted from the Rühl-basis spectral transform by inserting Φ(ρ)/Φ(ρ̃). Keep the Feynman limit and all spectral-pole prescriptions. The ratio cancels in diagonal spin blocks.',
 'Q8': 'Derived by Euler transformation of (Q7); j − sm is a nonnegative integer. Use finite-product Pochhammer symbols.',
 'Q9': 'ρ ≠ 0, r > 0. This scalar principal-series block is not the trivial Lorentz representation. The separate branches have no naive ρ = 0 substitution.',
 'Q10': 'j = k = m = 1/2, r > 0; set ρ = γ/2 for EPRL. Separate poles cancel in their sum as r → 0.',
 'Q11': 'Consequently a causal booster is not obtained by replacing each d with t in (B4).',
 'CV5': 'The 16 induced sectors and the 1024 independent wedge choices are different sums. Cancellation in a summed integrand does not establish finiteness of each sector.',
 'CO8': 'Nondegenerate Lorentzian Regge coherent boundary data, scaled spins and appropriate boundary phases. This is not the asymptotic formula for arbitrary spin networks.',
}
LOCATORS = {'M2':'Eq. (21), with (22) phase choice','M1':'Eq. (22)','M3':'Eq. (25), ρ left explicit','Q4':'Eq. (4)','Q5':'Eq. (16)','Q6':'Eq. (20), rephased using (4)','Q7':'Eq. (46)','Q9':'Scalar examples following Eq. (46)','B4':'Eqs. (11)–(13), normalized using (B5)','R1':'Appendix A, first-kind 15j convention'}

def braced(text, start):
    assert text[start] == '{'
    depth = 1
    pos = start + 1
    while depth:
        if text[pos] == '{' and text[pos-1] != '\\': depth += 1
        if text[pos] == '}' and text[pos-1] != '\\': depth -= 1
        pos += 1
    return text[start+1:pos-1], pos

def build():
    text = SOURCE.read_text()
    equations = []
    for match in re.finditer(r'\\eq\{([A-Z]+\d+)\}', text):
        ident = match.group(1)
        prefix, num = re.fullmatch(r'([A-Z]+)(\d+)', ident).groups()
        latex, _ = braced(text, match.end())
        group, level, route, source, note = GROUPS[prefix]
        equations.append(dict(id=ident, title=TITLES[prefix][int(num)-1], group=prefix,
          level=level, route=route, representation='coherent' if prefix=='CO' else 'spin',
          latex=latex.strip(), note=NOTES.get(ident,note), children=CHILDREN.get(ident,[]),
          source=source, locator=LOCATORS.get(ident,SOURCES[source]['locator']),
          provenance='derived' if ident in ['G6','L7','L8','L9','L10','L11','Q8','CV4'] else 'convention-adapted',
          review=ident in ['D7','B6','R1']))
    data = dict(version=1, conventions={'phase':'Speziale; Toller matrices rephased from Rühl on real ρ','intertwiners':'orthonormal','signature':'−+++','eprl':'ρ = γj, k = j','holonomy':'source-left, right path ordering'},
      sources=SOURCES, groups={k:{'title':v[0],'level':v[1],'route':v[2]} for k,v in GROUPS.items()}, equations=equations)
    DEST.parent.mkdir(parents=True,exist_ok=True)
    DEST.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    # Portable export is available even if JavaScript or MathJax cannot load.
    macros = text[text.index(r'\newcommand{\ket}'):text.index(r'\newcommand{\eq}')]
    export = '\\documentclass{article}\n\\usepackage[margin=20mm]{geometry}\n\\usepackage{amsmath,amssymb,hyperref}\n'+macros+'\\allowdisplaybreaks\n\\begin{document}\n'
    for e in equations:
        export += f"% {e['title']}\n% {SOURCES[e['source']]['title']} — {e['locator']}\n% {SOURCES[e['source']]['url']}\n"
        export += '\\begin{equation}\n'+e['latex']+'\n\\tag{'+e['id']+'}\n\\end{equation}\n'
    (DEST.parent/'equations.tex').write_text(export+'\\end{document}\n')
    print(f'LQG catalogue: {len(equations)} equations → {DEST.relative_to(ROOT)}')

if __name__ == '__main__': build()
