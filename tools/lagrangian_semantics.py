"""Semantic annotations for the browser Lagrangian catalogue.

The symbolic engine deliberately emits plain LaTeX.  This module adds a
separate, web-only layer: field symbols receive MathJax ``\\class`` wrappers
and every term receives a compact list of concepts that can be explained in
the interface.  The original LaTeX is never modified, so copy and download
remain suitable for an ordinary TeX document.
"""

from __future__ import annotations

import re
from collections.abc import Iterable


SYMBOL_DEFINITIONS: tuple[dict[str, str], ...] = (
    # Gauge and scalar fields.
    {
        "id": "gluon",
        "latex": r"G_\mu^A",
        "name": "Gluon field",
        "description": r"The SU(3)$_c$ gauge potential; $A=1,\ldots,8$ labels the adjoint colour component.",
        "group": "Fields",
    },
    {
        "id": "weak-boson",
        "latex": r"W_\mu^I",
        "name": "Weak gauge field",
        "description": r"The SU(2)$_L$ gauge potential before symmetry breaking, or $W^\pm$ in the physical basis.",
        "group": "Fields",
    },
    {
        "id": "hypercharge-boson",
        "latex": r"B_\mu",
        "name": "Hypercharge field",
        "description": r"The U(1)$_Y$ gauge potential before electroweak symmetry breaking.",
        "group": "Fields",
    },
    {
        "id": "photon",
        "latex": r"A_\mu",
        "name": "Photon field",
        "description": "The massless electromagnetic gauge field in the physical basis.",
        "group": "Fields",
    },
    {
        "id": "z-boson",
        "latex": r"Z_\mu",
        "name": "Z boson",
        "description": "The neutral massive weak gauge field after electroweak symmetry breaking.",
        "group": "Fields",
    },
    {
        "id": "higgs-doublet",
        "latex": r"H",
        "name": "Higgs doublet",
        "description": r"The complex SU(2)$_L$ scalar doublet with hypercharge $Y=1/2$.",
        "group": "Fields",
    },
    {
        "id": "higgs-boson",
        "latex": r"h",
        "name": "Higgs boson",
        "description": "The physical scalar fluctuation around the electroweak vacuum.",
        "group": "Fields",
    },
    # Fermion multiplets and weak-basis fields.
    {
        "id": "quark-doublet",
        "latex": r"Q_L",
        "name": "Left-handed quark doublet",
        "description": r"A weak-isospin doublet containing one up-type and one down-type quark.",
        "group": "Fermions",
    },
    {
        "id": "lepton-doublet",
        "latex": r"L_L",
        "name": "Left-handed lepton doublet",
        "description": "A weak-isospin doublet containing a neutrino and a charged lepton.",
        "group": "Fermions",
    },
    {
        "id": "up-type",
        "latex": r"u",
        "name": "Up-type weak-basis quark",
        "description": "An up-type quark field before a particular physical flavour is selected.",
        "group": "Fermions",
    },
    {
        "id": "down-type",
        "latex": r"d",
        "name": "Down-type weak-basis quark",
        "description": "A down-type quark field before a particular physical flavour is selected.",
        "group": "Fermions",
    },
    {
        "id": "charged-lepton",
        "latex": r"e",
        "name": "Charged-lepton field",
        "description": "A charged-lepton field in generation notation.",
        "group": "Fermions",
    },
    {
        "id": "neutrino",
        "latex": r"\nu_L",
        "name": "Neutrino field",
        "description": "A left-handed Standard Model neutrino field; no right-handed neutrino is included.",
        "group": "Fermions",
    },
    {
        "id": "generic-fermion",
        "latex": r"f",
        "name": "Generic fermion",
        "description": "A placeholder summed over the charged leptons and quark flavours displayed in the set beneath the sum.",
        "group": "Fermions",
    },
    # Physical flavours.  These share a palette but use distinct shades.
    {
        "id": "up-quark",
        "latex": r"u",
        "name": "Up quark",
        "description": "First-generation up-type quark.",
        "group": "Fermions",
    },
    {
        "id": "charm-quark",
        "latex": r"c",
        "name": "Charm quark",
        "description": "Second-generation up-type quark.",
        "group": "Fermions",
    },
    {
        "id": "top-quark",
        "latex": r"t",
        "name": "Top quark",
        "description": "Third-generation up-type quark.",
        "group": "Fermions",
    },
    {
        "id": "down-quark",
        "latex": r"d",
        "name": "Down quark",
        "description": "First-generation down-type quark.",
        "group": "Fermions",
    },
    {
        "id": "strange-quark",
        "latex": r"s",
        "name": "Strange quark",
        "description": "Second-generation down-type quark.",
        "group": "Fermions",
    },
    {
        "id": "bottom-quark",
        "latex": r"b",
        "name": "Bottom quark",
        "description": "Third-generation down-type quark.",
        "group": "Fermions",
    },
    {
        "id": "electron",
        "latex": r"e",
        "name": "Electron",
        "description": "First-generation charged lepton.",
        "group": "Fermions",
    },
    {
        "id": "muon",
        "latex": r"\mu",
        "name": "Muon",
        "description": "Second-generation charged lepton.",
        "group": "Fermions",
    },
    {
        "id": "tau-lepton",
        "latex": r"\tau",
        "name": "Tau lepton",
        "description": "Third-generation charged lepton.",
        "group": "Fermions",
    },
    {
        "id": "electron-neutrino",
        "latex": r"\nu_e",
        "name": "Electron neutrino",
        "description": "Neutrino paired with the electron in the first lepton generation.",
        "group": "Fermions",
    },
    {
        "id": "muon-neutrino",
        "latex": r"\nu_\mu",
        "name": "Muon neutrino",
        "description": "Neutrino paired with the muon in the second lepton generation.",
        "group": "Fermions",
    },
    {
        "id": "tau-neutrino",
        "latex": r"\nu_\tau",
        "name": "Tau neutrino",
        "description": "Neutrino paired with the tau in the third lepton generation.",
        "group": "Fermions",
    },
    # Differential and spinorial notation.
    {
        "id": "lagrangian-density",
        "latex": r"\mathcal L",
        "name": "Lagrangian density",
        "description": "The local density whose spacetime integral defines the action; here it contains the selected Standard Model sectors.",
        "group": "Operators",
    },
    {
        "id": "field-strength",
        "latex": r"F_{\mu\nu}",
        "name": "Field-strength tensor",
        "description": "The gauge curvature built from a gauge potential; it contains the kinetic and self-interaction terms.",
        "group": "Operators",
    },
    {
        "id": "partial-derivative",
        "latex": r"\partial_\mu",
        "name": "Partial derivative",
        "description": "Ordinary spacetime differentiation.",
        "group": "Operators",
    },
    {
        "id": "covariant-derivative",
        "latex": r"D_\mu",
        "name": "Covariant derivative",
        "description": "A derivative supplemented by the gauge connections appropriate to the field it acts on.",
        "group": "Operators",
    },
    {
        "id": "dirac-matrix",
        "latex": r"\gamma^\mu",
        "name": "Dirac matrix",
        "description": "Gamma matrix contracting a fermion current with a Lorentz vector index.",
        "group": "Operators",
    },
    {
        "id": "dirac-conjugate",
        "latex": r"\overline\psi",
        "name": "Dirac conjugate",
        "description": r"For a spinor $\psi$, $\overline\psi=\psi^\dagger\gamma^0$.",
        "group": "Operators",
    },
    {
        "id": "chirality",
        "latex": r"P_{L,R}",
        "name": "Chirality label or projector",
        "description": r"$L$ and $R$ select left- and right-handed fermionic components.",
        "group": "Operators",
    },
    {
        "id": "hermitian-conjugate",
        "latex": r"\mathrm{h.c.}",
        "name": "Hermitian conjugate",
        "description": "Add the complex-conjugate interaction required to make the Lagrangian Hermitian.",
        "group": "Operators",
    },
    {
        "id": "imaginary-unit",
        "latex": r"\mathrm i",
        "name": "Imaginary unit",
        "description": r"The number satisfying $\mathrm i^2=-1$; it appears in kinetic terms and quantum phase conventions.",
        "group": "Operators",
    },
    # Couplings and physical parameters.
    {
        "id": "strong-coupling",
        "latex": r"g_s",
        "name": "Strong coupling",
        "description": r"Gauge coupling of SU(3)$_c$.",
        "group": "Parameters",
    },
    {
        "id": "weak-coupling",
        "latex": r"g",
        "name": "Weak coupling",
        "description": r"Gauge coupling of SU(2)$_L$.",
        "group": "Parameters",
    },
    {
        "id": "hypercharge-coupling",
        "latex": r"g'",
        "name": "Hypercharge coupling",
        "description": r"Gauge coupling of U(1)$_Y$.",
        "group": "Parameters",
    },
    {
        "id": "electric-coupling",
        "latex": r"e",
        "name": "Electric coupling",
        "description": "Electromagnetic gauge coupling, related to the weak couplings by the Weinberg angle.",
        "group": "Parameters",
    },
    {
        "id": "electric-charge",
        "latex": r"Q_f",
        "name": "Electric charge",
        "description": "The electric charge of fermion flavour f, expressed in units of the electromagnetic coupling e.",
        "group": "Parameters",
    },
    {
        "id": "yukawa-matrix",
        "latex": r"Y_u,Y_d,Y_e",
        "name": "Yukawa matrix",
        "description": "A matrix in generation space coupling left-handed and right-handed fermions to the Higgs doublet.",
        "group": "Parameters",
    },
    {
        "id": "mass",
        "latex": r"m_f",
        "name": "Physical mass",
        "description": "A fermion or boson mass parameter in the broken-symmetry basis.",
        "group": "Parameters",
    },
    {
        "id": "higgs-vev",
        "latex": r"v",
        "name": "Higgs vacuum expectation value",
        "description": "The non-zero Higgs background that breaks electroweak symmetry.",
        "group": "Parameters",
    },
    {
        "id": "higgs-potential",
        "latex": r"\mu_H^2,\lambda",
        "name": "Higgs-potential parameters",
        "description": "Quadratic and quartic coefficients of the scalar potential.",
        "group": "Parameters",
    },
    {
        "id": "ckm-matrix",
        "latex": r"V_{ij}",
        "name": "CKM matrix",
        "description": "Quark-flavour mixing matrix appearing in the charged weak current.",
        "group": "Parameters",
    },
    {
        "id": "weinberg-angle",
        "latex": r"s_W,c_W",
        "name": "Weak-mixing angle",
        "description": r"Shorthand for $\sin\theta_W$ and $\cos\theta_W$.",
        "group": "Parameters",
    },
    # Indices and Lie-algebra data.
    {
        "id": "lorentz-index",
        "latex": r"\mu,\nu",
        "name": "Lorentz indices",
        "description": "Covariant spacetime indices; they are never decomposed into temporal and spatial components here.",
        "group": "Indices and algebra",
    },
    {
        "id": "colour-index",
        "latex": r"a,A",
        "name": "Colour indices",
        "description": r"Fundamental colour indices have three values; adjoint SU(3)$_c$ indices have eight.",
        "group": "Indices and algebra",
    },
    {
        "id": "weak-index",
        "latex": r"i,I",
        "name": "Weak-isospin indices",
        "description": r"Fundamental SU(2)$_L$ indices have two values; adjoint indices have three.",
        "group": "Indices and algebra",
    },
    {
        "id": "generation-index",
        "latex": r"p,q=1,2,3",
        "name": "Generation indices",
        "description": "Indices running over the three fermion generations.",
        "group": "Indices and algebra",
    },
    {
        "id": "summation",
        "latex": r"\sum",
        "name": "Explicit sum",
        "description": "A sum over the displayed internal, generation, colour, or flavour label.",
        "group": "Indices and algebra",
    },
    {
        "id": "generators",
        "latex": r"T^A,\tau^I",
        "name": "Gauge generators",
        "description": "Matrices representing the SU(3) or SU(2) Lie algebra on the field multiplet.",
        "group": "Indices and algebra",
    },
    {
        "id": "structure-constants",
        "latex": r"f^{ABC},\epsilon^{IJK}",
        "name": "Structure constants",
        "description": "Antisymmetric tensors encoding non-Abelian gauge-boson self-interactions.",
        "group": "Indices and algebra",
    },
)


_DEFINITION_ORDER = {item["id"]: index for index, item in enumerate(SYMBOL_DEFINITIONS)}
_SCRIPT = r"(?:[_^](?:\{[^{}]*\}|\\[A-Za-z]+|[A-Za-z0-9+\-*]))*"


def _atom(base: str) -> re.Pattern[str]:
    """Match a TeX atom plus its immediate scripts, outside command names."""

    return re.compile(rf"(?<![A-Za-z\\_^]){base}{_SCRIPT}")


def _command_atom(base: str) -> re.Pattern[str]:
    return re.compile(rf"(?<![A-Za-z_^]){base}{_SCRIPT}")


_PROTECTED_RULES: tuple[re.Pattern[str], ...] = (
    re.compile(r"\\mathrm\{[^{}]*\}"),
    re.compile(r"\(?Y_[ude](?:\^\\dagger)?\)?" + _SCRIPT),
    re.compile(r"m(?:_\{[^{}]*\}|_[A-Za-z0-9]|_\\[A-Za-z]+)"),
    re.compile(r"(?:s_W|c_W|Q_f|T_3|P_[LR]|g_s)"),
    re.compile(r"V(?:_\{[^{}]*\}|_[A-Za-z0-9]+)" + _SCRIPT),
    re.compile(r"(?:f|T)\^(?:\{[^{}]*\}|[A-Za-z])"),
    re.compile(r"\\(?:tau|sigma)\^(?:\{[^{}]*\}|[A-Za-z])"),
    re.compile(r"_\{(?:e|\\mu|\\tau)(?:\\,L)?\}"),
    re.compile(r"\\gamma" + _SCRIPT),
    re.compile(r"\\partial" + _SCRIPT),
    re.compile(r"(?<![A-Za-z\\])D" + _SCRIPT),
    re.compile(r"(?<![A-Za-z\\])e(?=\\,?\\overline)"),
)


_STATIC_COLOUR_RULES: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("quark-doublet", re.compile(r"(?<=\\overline\{)Q(?=\})")),
    ("lepton-doublet", re.compile(r"(?<=\\overline\{)L(?=\})")),
    # TeX permits adjacent one-letter factors (``gH``, ``gW``, ``hW`` and
    # ``hZ``).  The generic atom matcher deliberately avoids command names,
    # so these physically meaningful products need explicit rules.
    ("higgs-doublet", re.compile(r"(?<=g)H" + _SCRIPT)),
    ("weak-boson", re.compile(r"(?<=[gh])W" + _SCRIPT)),
    ("z-boson", re.compile(r"(?<=h)Z" + _SCRIPT)),
    # Higgs-sector parameters belong to the same semantic family.  Matching
    # the complete TeX atom also prevents the H in ``\\mu_H`` from being
    # mistaken for the scalar doublet.
    ("higgs-potential", re.compile(r"\\mu_H" + _SCRIPT)),
    ("higgs-potential", _command_atom(r"\\lambda")),
    ("higgs-vev", re.compile(r"(?<![A-Za-z\\])v(?![A-Za-z])")),
    ("gluon", _atom("G")),
    ("gluon", re.compile(r"(?<=g_s)G" + _SCRIPT)),
    ("weak-boson", _atom("W")),
    ("hypercharge-boson", _atom("B")),
    ("photon", _atom("A")),
    ("photon", re.compile(r"(?<=e)A" + _SCRIPT)),
    ("photon", _atom("F")),
    ("z-boson", _atom("Z")),
    ("higgs-doublet", re.compile(r"(?<![A-Za-z\\])(?:\\widetilde\s*)?H" + _SCRIPT)),
    ("higgs-boson", _atom("h")),
    (
        "quark-doublet",
        re.compile(r"(?<![A-Za-z\\])Q(?:_L|_\{L[^{}]*\})" + _SCRIPT),
    ),
    (
        "lepton-doublet",
        re.compile(r"(?<![A-Za-z\\])L(?:_L|_\{L[^{}]*\})" + _SCRIPT),
    ),
)


_BASE_PATTERNS: dict[str, re.Pattern[str]] = {
    "up-type": _atom("u"),
    "down-type": _atom("d"),
    "charged-lepton": _atom("e"),
    "neutrino": re.compile(
        r"(?:(?<=\\partial_\\mu)|(?<=D_\\mu)|(?<![_^])(?<!\\mu))\\nu"
        + _SCRIPT
    ),
    "generic-fermion": re.compile(
        rf"(?:(?<![A-Za-z\\_^])[fq]{_SCRIPT}|(?<=\^b)q{_SCRIPT})"
    ),
    "up-quark": _atom("u"),
    "charm-quark": _atom("c"),
    "top-quark": _atom("t"),
    "down-quark": _atom("d"),
    "strange-quark": _atom("s"),
    "bottom-quark": _atom("b"),
    "electron": _atom("e"),
    "muon": _command_atom(r"\\mu"),
    "tau-lepton": _command_atom(r"\\tau"),
    "electron-neutrino": _command_atom(r"\\nu"),
    "muon-neutrino": _command_atom(r"\\nu"),
    "tau-neutrino": _command_atom(r"\\nu"),
}


_PHYSICAL_TAG_PREFIXES = (
    "qed-",
    "charged-current",
    "neutral-current",
    "kinetic-",
    "mass-",
    "higgs-yukawa-",
)


def _normalised_tag(tag: str) -> str:
    return tag.replace(r"\mu", "mu").replace(r"\tau", "tau").replace(r"\nu", "nu")


def _field_ids(tag: str, body: str) -> list[str]:
    """Return flavour classes appropriate to a generated term."""

    normal = _normalised_tag(tag)
    tokens = set(normal.split("-"))
    fields: list[str] = []
    physical = normal.startswith(_PHYSICAL_TAG_PREFIXES)

    physical_map = {
        "u": "up-quark",
        "c": "charm-quark",
        "t": "top-quark",
        "d": "down-quark",
        "s": "strange-quark",
        "b": "bottom-quark",
        "e": "electron",
        "mu": "muon",
        "tau": "tau-lepton",
    }
    if physical:
        for token, symbol_id in physical_map.items():
            if token in tokens:
                fields.append(symbol_id)

        for token, symbol_id in (
            ("nu_e", "electron-neutrino"),
            ("nu_mu", "muon-neutrino"),
            ("nu_tau", "tau-neutrino"),
        ):
            if token in tokens:
                fields.append(symbol_id)

        # Charged-current tags name the charged lepton; its neutrino partner is
        # implicit in the same term.
        if normal.startswith("charged-current"):
            if "e" in tokens:
                fields.append("electron-neutrino")
            if "mu" in tokens:
                fields.append("muon-neutrino")
            if "tau" in tokens:
                fields.append("tau-neutrino")

    # Weak-basis and compact notation.
    if not physical or not fields:
        if (
            "uR" in tag
            or re.search(r"(?:^|-)u(?:-|$)", tag)
            or "up" in tokens
            or re.search(r"(?<![A-Za-z])u(?=[}_^])", body)
        ):
            fields.append("up-type")
        if (
            "dR" in tag
            or re.search(r"(?:^|-)d(?:-|$)", tag)
            or "down" in tokens
            or re.search(r"(?<![A-Za-z])d(?=[}_^])", body)
        ):
            fields.append("down-type")
        if "eR" in tag or re.search(r"(?<![A-Za-z])e(?=[}_^])", body):
            fields.append("charged-lepton")
        if re.search(r"\\overline(?:\{)?\\nu|\\nu_\{?\w", body):
            fields.append("neutrino")
        if re.search(r"\\overline\s*(?:\{)?[fq]|\\partial_\\mu\s*[fq]", body):
            fields.append("generic-fermion")

    # Preserve order while removing duplicates.
    return list(dict.fromkeys(fields))


def _wrap(symbol_id: str, latex: str) -> str:
    # The outer group keeps the annotation a single TeX argument.  This is
    # essential for compact but valid input such as ``\overline f`` and
    # ``\frac hv``: replacing ``f`` or ``h`` with a bare macro would otherwise
    # change which token the surrounding command consumes.
    return rf"{{\class{{sm-symbol--{symbol_id}}}{{{latex}}}}}"


def annotate_fields(body: str, tag: str) -> tuple[str, list[str]]:
    """Add MathJax classes to field atoms without altering plain source LaTeX."""

    dynamic_rules = tuple((symbol_id, _BASE_PATTERNS[symbol_id]) for symbol_id in _field_ids(tag, body))
    rules = _STATIC_COLOUR_RULES + dynamic_rules
    symbols: list[str] = []
    output: list[str] = []
    cursor = 0

    while cursor < len(body):
        protected = next((pattern.match(body, cursor) for pattern in _PROTECTED_RULES if pattern.match(body, cursor)), None)
        if protected is not None:
            output.append(protected.group(0))
            cursor = protected.end()
            continue

        match_data: tuple[str, re.Match[str]] | None = None
        for symbol_id, pattern in rules:
            matched = pattern.match(body, cursor)
            if matched is not None:
                match_data = (symbol_id, matched)
                break

        if match_data is None:
            output.append(body[cursor])
            cursor += 1
            continue

        symbol_id, matched = match_data
        output.append(_wrap(symbol_id, matched.group(0)))
        symbols.append(symbol_id)
        cursor = matched.end()

    return "".join(output), list(dict.fromkeys(symbols))


_CONCEPT_RULES: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("field-strength", re.compile(r"[GWBFAZ](?:[_^]\{[^{}]*\\mu\\nu[^{}]*\})")),
    ("partial-derivative", re.compile(r"\\partial")),
    ("covariant-derivative", re.compile(r"(?<![A-Za-z\\])D_")),
    ("dirac-matrix", re.compile(r"\\gamma")),
    ("dirac-conjugate", re.compile(r"\\overline|\\bar")),
    ("chirality", re.compile(r"(?:P_[LR]|_[LR](?:[^A-Za-z]|$))")),
    ("hermitian-conjugate", re.compile(r"\\mathrm\{h\.c\.\}|\\dagger")),
    ("imaginary-unit", re.compile(r"\\mathrm\{i\}")),
    ("strong-coupling", re.compile(r"g_s")),
    ("hypercharge-coupling", re.compile(r"g'")),
    ("weak-coupling", re.compile(r"(?<![A-Za-z\\])g(?![_A-Za-z'])")),
    ("electric-coupling", re.compile(r"(?<![A-Za-z\\])e(?=A_|\\,?\\overline|Q_)")),
    ("electric-charge", re.compile(r"Q_f")),
    ("yukawa-matrix", re.compile(r"Y_[ude]")),
    ("mass", re.compile(r"(?<![A-Za-z\\])m(?:_|_[{])")),
    ("higgs-vev", re.compile(r"(?<![A-Za-z\\])v(?![A-Za-z])")),
    ("higgs-potential", re.compile(r"\\lambda|\\mu_H")),
    ("ckm-matrix", re.compile(r"V_(?:\{|[A-Za-z])")),
    ("weinberg-angle", re.compile(r"s_W|c_W")),
    ("summation", re.compile(r"\\sum")),
    ("generators", re.compile(r"T\^|\\tau\^I|\\sigma\^I")),
    ("structure-constants", re.compile(r"f\^\{|\\epsilon\^\{")),
)


def _extra_index_symbols(body: str, sector: str, tag: str) -> Iterable[str]:
    if re.search(r"\\gamma\^\\mu|\\partial_\\mu|[GWBFAZ]_\\mu|\\mu\\nu", body):
        yield "lorentz-index"
    if sector == "qcd" and (re.search(r"\b[ABC]\b|\^\{?[1-8]", body) or "-c" in tag):
        yield "colour-index"
    if sector in {"electroweak", "weak", "higgs"} and re.search(r"\b[IJK]\b|\\tau\^I", body):
        yield "weak-index"
    if re.search(r"\\sum_\{?[pqijg]|\\alpha|_[pqijg](?:[^A-Za-z]|$)|-[123]{1,2}(?:-|$)", body + " " + tag):
        yield "generation-index"


def annotate_term(body: str, sector: str, tag: str) -> tuple[str, list[str]]:
    semantic_body, field_symbols = annotate_fields(body, tag)
    concepts = [symbol_id for symbol_id, pattern in _CONCEPT_RULES if pattern.search(body)]
    concepts.extend(_extra_index_symbols(body, sector, tag))
    symbols = set(field_symbols + concepts)
    ordered = sorted(symbols, key=lambda symbol_id: _DEFINITION_ORDER[symbol_id])
    return semantic_body, ordered
