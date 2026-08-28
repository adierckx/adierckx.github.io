"""Fixed, convention-aware catalogue of Standard Model terms.

This module deliberately generates LaTeX from structured field metadata rather
than parsing arbitrary LaTeX supplied by a user.  The first version focuses on
tree-level, gauge-invariant terms and keeps all Lorentz contractions covariant.
"""

from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
from typing import Iterable

from .config import Expansion, StandardModelConfig
from .gauge import (
    abelian_gauge_terms,
    broken_electroweak_gauge_terms,
    nonabelian_gauge_terms,
)
from .result import LatexTerm


def _term(sign: int, body: str, sector: str, tag: str) -> LatexTerm:
    return LatexTerm(sign=sign, body=body, sector=sector, tag=tag)


def _fraction_latex(value: Fraction, symbol: str) -> tuple[int, str]:
    """Return an external sign and the absolute LaTeX coefficient times symbol."""

    sign = 1 if value >= 0 else -1
    value = abs(value)
    if value == 1:
        return sign, symbol
    if value.denominator == 1:
        return sign, rf"{value.numerator}{symbol}"
    numerator = symbol if value.numerator == 1 else rf"{value.numerator}{symbol}"
    return sign, rf"\frac{{{numerator}}}{{{value.denominator}}}"


@dataclass(frozen=True, slots=True)
class Multiplet:
    base: str
    chirality: str
    components: tuple[str, ...]
    hypercharge: Fraction
    colour: bool
    weak_doublet: bool

    @property
    def latex_name(self) -> str:
        return rf"{self.base}_{self.chirality}"


UNBROKEN_MULTIPLETS = (
    Multiplet("Q", "L", ("u", "d"), Fraction(1, 6), True, True),
    Multiplet("u", "R", ("u",), Fraction(2, 3), True, False),
    Multiplet("d", "R", ("d",), Fraction(-1, 3), True, False),
    Multiplet("L", "L", (r"\nu", "e"), Fraction(-1, 2), False, True),
    Multiplet("e", "R", ("e",), Fraction(-1, 1), False, False),
)


def _field(base: str, chirality: str, generation: str, colour: str | None = None) -> str:
    subscripts = [part for part in (chirality, colour) if part]
    joined_subscripts = r"\,".join(subscripts)
    subscript = rf"_{{{joined_subscripts}}}" if subscripts else ""
    superscript = rf"^{{{generation}}}" if generation else ""
    return rf"{base}{subscript}{superscript}"


def _bar_field(
    base: str,
    chirality: str,
    generation: str,
    colour: str | None = None,
) -> str:
    subscripts = [part for part in (chirality, generation) if part]
    joined_subscripts = r"\,".join(subscripts)
    subscript = rf"_{{{joined_subscripts}}}" if subscripts else ""
    superscript = rf"^{{{colour}}}" if colour is not None else ""
    return rf"\overline{{{base}}}{subscript}{superscript}"


def _generations(expand: bool) -> tuple[str, ...]:
    return ("1", "2", "3") if expand else ("p",)


def _generation_prefix(expand: bool) -> str:
    return "" if expand else r"\sum_{p=1}^{3} "


def _colour_values(expand: bool) -> tuple[str, ...]:
    return ("1", "2", "3") if expand else ("a",)


def _bilinear(
    base_left: str,
    chirality_left: str,
    base_right: str,
    chirality_right: str,
    generation: str,
    colour_left: str | None = None,
    colour_right: str | None = None,
) -> str:
    left = _bar_field(base_left, chirality_left, generation, colour_left)
    right = _field(base_right, chirality_right, generation, colour_right)
    return rf"{left}\gamma^\mu {right}"


def _gell_mann_current_terms(
    *,
    base: str,
    chirality: str,
    generation: str,
    generation_prefix: str,
    sector: str,
    tag_prefix: str,
) -> list[LatexTerm]:
    """Expand \bar q gamma^mu T^A q G^A_mu using T^A=lambda^A/2."""

    def current(left: str, right: str) -> str:
        return _bilinear(
            base,
            chirality,
            base,
            chirality,
            generation,
            left,
            right,
        )

    bodies = (
        rf"\frac{{g_s}}{{2}}G_\mu^1\left[{current('1', '2')}+{current('2', '1')}\right]",
        rf"\frac{{\mathrm{{i}}g_s}}{{2}}G_\mu^2\left[-{current('1', '2')}+{current('2', '1')}\right]",
        rf"\frac{{g_s}}{{2}}G_\mu^3\left[{current('1', '1')}-{current('2', '2')}\right]",
        rf"\frac{{g_s}}{{2}}G_\mu^4\left[{current('1', '3')}+{current('3', '1')}\right]",
        rf"\frac{{\mathrm{{i}}g_s}}{{2}}G_\mu^5\left[-{current('1', '3')}+{current('3', '1')}\right]",
        rf"\frac{{g_s}}{{2}}G_\mu^6\left[{current('2', '3')}+{current('3', '2')}\right]",
        rf"\frac{{\mathrm{{i}}g_s}}{{2}}G_\mu^7\left[-{current('2', '3')}+{current('3', '2')}\right]",
        rf"\frac{{g_s}}{{2\sqrt{{3}}}}G_\mu^8\left[{current('1', '1')}+{current('2', '2')}-2{current('3', '3')}\right]",
    )
    return [
        _term(1, generation_prefix + body, sector, f"{tag_prefix}-G{index}")
        for index, body in enumerate(bodies, start=1)
    ]


def _weak_doublet_current_terms(
    *,
    upper: str,
    lower: str,
    chirality: str,
    generation: str,
    colour: bool,
    expand_colour: bool,
    generation_prefix: str,
    sector: str,
    tag_prefix: str,
) -> list[LatexTerm]:
    terms: list[LatexTerm] = []
    colours: Iterable[str | None] = _colour_values(expand_colour) if colour else (None,)
    for colour_index in colours:
        uu = _bilinear(upper, chirality, upper, chirality, generation, colour_index, colour_index)
        ul = _bilinear(upper, chirality, lower, chirality, generation, colour_index, colour_index)
        lu = _bilinear(lower, chirality, upper, chirality, generation, colour_index, colour_index)
        ll = _bilinear(lower, chirality, lower, chirality, generation, colour_index, colour_index)
        prefix = generation_prefix
        label = "" if colour_index is None else f"-c{colour_index}"
        terms.extend(
            [
                _term(1, prefix + rf"\frac g2 W_\mu^1\left[{ul}+{lu}\right]", sector, tag_prefix + "-W1" + label),
                _term(1, prefix + rf"\frac{{\mathrm{{i}}g}}2 W_\mu^2\left[-{ul}+{lu}\right]", sector, tag_prefix + "-W2" + label),
                _term(1, prefix + rf"\frac g2 W_\mu^3\left[{uu}-{ll}\right]", sector, tag_prefix + "-W3" + label),
            ]
        )
    return terms


def unbroken_gauge_terms(config: StandardModelConfig, sector: str) -> list[LatexTerm]:
    expanded = (
        config.expansion is Expansion.EXPANDED and config.expand_field_strengths
    )
    if sector == "qcd":
        return nonabelian_gauge_terms(
            group="su3",
            field="G",
            adjoint="A",
            structure="f",
            coupling="g_s",
            sector=sector,
            tag="gluon-kinetic",
            expanded=expanded,
            expand_adjoint=config.expand_colour,
            distribute=config.distribute_field_strength_products,
        )
    if sector == "electroweak":
        terms = nonabelian_gauge_terms(
            group="su2",
            field="W",
            adjoint="I",
            structure=r"\epsilon",
            coupling="g",
            sector=sector,
            tag="weak-kinetic",
            expanded=expanded,
            expand_adjoint=config.expand_weak_isospin,
            distribute=config.distribute_field_strength_products,
        )
        terms.extend(
            abelian_gauge_terms(
                field_strength="B",
                potential="B",
                sector=sector,
                tag="hypercharge-kinetic",
                expanded=expanded,
                distribute=config.distribute_field_strength_products,
            )
        )
        return terms
    raise ValueError(f"Not an unbroken gauge sector: {sector}")


def unbroken_fermion_terms(config: StandardModelConfig) -> list[LatexTerm]:
    sector = "fermions"
    if config.expansion is Expansion.COMPACT:
        return [
            _term(
                1,
                r"\sum_{p=1}^{3}\sum_{\psi\in\{Q_L,u_R,d_R,L_L,e_R\}}"
                r"\mathrm{i}\,\overline\psi_p\gamma^\mu D_\mu\psi^p",
                sector,
                "fermion-kinetic-compact",
            )
        ]

    if config.expansion is Expansion.INDEXED or not config.expand_covariant_derivatives:
        return [
            _term(
                1,
                rf"\sum_{{p=1}}^{{3}}\mathrm{{i}}\,\overline{{{multiplet.base}}}_{{{multiplet.chirality}p}}"
                rf"\gamma^\mu D_\mu {multiplet.base}_{{{multiplet.chirality}}}^p",
                sector,
                f"{multiplet.base}{multiplet.chirality}-kinetic",
            )
            for multiplet in UNBROKEN_MULTIPLETS
        ]

    terms: list[LatexTerm] = []
    qcd_active = "qcd" in config.sectors
    ew_active = "electroweak" in config.sectors
    generations = _generations(config.expand_generations)
    generation_prefix = _generation_prefix(config.expand_generations)

    for multiplet in UNBROKEN_MULTIPLETS:
        for generation in generations:
            fields = (
                multiplet.components
                if multiplet.weak_doublet and config.expand_weak_isospin
                else (multiplet.base,)
            )
            for base in fields:
                colours: Iterable[str | None]
                colours = _colour_values(config.expand_colour) if multiplet.colour else (None,)
                for colour_index in colours:
                    field = _field(base, multiplet.chirality, generation, colour_index)
                    bar = _bar_field(base, multiplet.chirality, generation, colour_index)
                    colour_tag = "" if colour_index is None else f"-c{colour_index}"
                    terms.append(
                        _term(
                            1,
                            generation_prefix + rf"\mathrm{{i}}\,{bar}\gamma^\mu\partial_\mu {field}",
                            sector,
                            f"{multiplet.base}{multiplet.chirality}-partial-{generation}{colour_tag}",
                        )
                    )

                    if ew_active:
                        sign, coefficient = _fraction_latex(multiplet.hypercharge, "g'")
                        current = rf"{bar}\gamma^\mu {field}B_\mu"
                        terms.append(
                            _term(
                                sign,
                                generation_prefix + coefficient + r"\," + current,
                                sector,
                                f"{multiplet.base}{multiplet.chirality}-hypercharge-{generation}{colour_tag}",
                            )
                        )

            if qcd_active and multiplet.colour:
                qcd_fields = (
                    multiplet.components
                    if multiplet.weak_doublet and config.expand_weak_isospin
                    else (multiplet.base,)
                )
                for base in qcd_fields:
                    if config.expand_colour:
                        terms.extend(
                            _gell_mann_current_terms(
                                base=base,
                                chirality=multiplet.chirality,
                                generation=generation,
                                generation_prefix=generation_prefix,
                                sector=sector,
                                tag_prefix=f"{base}{multiplet.chirality}-{generation}",
                            )
                        )
                    else:
                        bar = _bar_field(base, multiplet.chirality, generation, "a")
                        field = _field(base, multiplet.chirality, generation, "b")
                        terms.append(
                            _term(
                                1,
                                generation_prefix
                                + rf"g_s\,{bar}\gamma^\mu(T^A)_a{{}}^b{field}G_\mu^A",
                                sector,
                                f"{base}{multiplet.chirality}-qcd-{generation}",
                            )
                        )

            if ew_active and multiplet.weak_doublet:
                if config.expand_weak_isospin:
                    terms.extend(
                        _weak_doublet_current_terms(
                            upper=multiplet.components[0],
                            lower=multiplet.components[1],
                            chirality=multiplet.chirality,
                            generation=generation,
                            colour=multiplet.colour,
                            expand_colour=config.expand_colour,
                            generation_prefix=generation_prefix,
                            sector=sector,
                            tag_prefix=f"{multiplet.base}{multiplet.chirality}-{generation}",
                        )
                    )
                else:
                    weak_colours: Iterable[str | None]
                    weak_colours = (
                        _colour_values(True)
                        if multiplet.colour and config.expand_colour
                        else (("a",) if multiplet.colour else (None,))
                    )
                    for colour_index in weak_colours:
                        bar = _bar_field(
                            multiplet.base,
                            multiplet.chirality,
                            generation,
                            colour_index,
                        )
                        field = _field(
                            multiplet.base,
                            multiplet.chirality,
                            generation,
                            colour_index,
                        )
                        colour_tag = "" if colour_index is None else f"-c{colour_index}"
                        terms.append(
                            _term(
                                1,
                                generation_prefix
                                + rf"g\,{bar}\gamma^\mu(t^I){field}W_\mu^I",
                                sector,
                                f"{multiplet.base}{multiplet.chirality}-weak-{generation}{colour_tag}",
                            )
                        )
    return terms


def unbroken_higgs_terms(config: StandardModelConfig) -> list[LatexTerm]:
    sector = "higgs"
    ew_active = "electroweak" in config.sectors
    if config.expansion is not Expansion.EXPANDED or not config.expand_covariant_derivatives:
        return [
            _term(1, r"(D_\mu H)^\dagger(D^\mu H)", sector, "higgs-kinetic"),
            _term(-1, r"V(H)", sector, "higgs-potential"),
        ]

    norm = (
        r"H^-H^+ + H^{0*}H^0"
        if config.expand_weak_isospin
        else r"H^\dagger H"
    )
    potential_terms = [
        _term(1, rf"\mu_H^2\left({norm}\right)", sector, "higgs-quadratic"),
        _term(-1, rf"\lambda\left({norm}\right)^2", sector, "higgs-quartic"),
    ]

    if not config.expand_weak_isospin:
        if ew_active:
            raised_derivative = (
                r"\partial^\mu H-\mathrm{i}gW^{I\mu} t^I H"
                r"-\mathrm{i}\frac{g'}2B^\mu H"
            )
            conjugate = (
                r"\partial_\mu H^\dagger+\mathrm{i}gH^\dagger t^I W_\mu^I"
                r"+\mathrm{i}\frac{g'}2H^\dagger B_\mu"
            )
        else:
            raised_derivative = r"\partial^\mu H"
            conjugate = r"\partial_\mu H^\dagger"
        return [
            _term(
                1,
                rf"\left({conjugate}\right)\left({raised_derivative}\right)",
                sector,
                "higgs-kinetic-expanded",
            ),
            *potential_terms,
        ]

    if ew_active:
        charged_conjugate = (
            r"\partial_\mu H^-"
            r"+\mathrm{i}\frac g2H^{0*}W_\mu^1"
            r"-\frac g2H^{0*}W_\mu^2"
            r"+\mathrm{i}\frac g2H^-W_\mu^3"
            r"+\mathrm{i}\frac{g'}2H^-B_\mu"
        )
        charged_derivative = (
            r"\partial^\mu H^+"
            r"-\mathrm{i}\frac g2W^{1\mu}H^0"
            r"-\frac g2W^{2\mu}H^0"
            r"-\mathrm{i}\frac g2W^{3\mu}H^+"
            r"-\mathrm{i}\frac{g'}2B^\mu H^+"
        )
        neutral_conjugate = (
            r"\partial_\mu H^{0*}"
            r"+\mathrm{i}\frac g2H^-W_\mu^1"
            r"+\frac g2H^-W_\mu^2"
            r"-\mathrm{i}\frac g2H^{0*}W_\mu^3"
            r"+\mathrm{i}\frac{g'}2H^{0*}B_\mu"
        )
        neutral_derivative = (
            r"\partial^\mu H^0"
            r"-\mathrm{i}\frac g2W^{1\mu}H^+"
            r"+\frac g2W^{2\mu}H^+"
            r"+\mathrm{i}\frac g2W^{3\mu}H^0"
            r"-\mathrm{i}\frac{g'}2B^\mu H^0"
        )
    else:
        charged_conjugate = r"\partial_\mu H^-"
        charged_derivative = r"\partial^\mu H^+"
        neutral_conjugate = r"\partial_\mu H^{0*}"
        neutral_derivative = r"\partial^\mu H^0"

    return [
        _term(
            1,
            rf"\left({charged_conjugate}\right)\left({charged_derivative}\right)",
            sector,
            "higgs-charged-kinetic-expanded",
        ),
        _term(
            1,
            rf"\left({neutral_conjugate}\right)\left({neutral_derivative}\right)",
            sector,
            "higgs-neutral-kinetic-expanded",
        ),
        *potential_terms,
    ]


def _yukawa_generation_pairs(expand: bool) -> tuple[tuple[str, str], ...]:
    if not expand:
        return (("p", "r"),)
    return tuple((str(p), str(r)) for p in range(1, 4) for r in range(1, 4))


def unbroken_yukawa_terms(config: StandardModelConfig) -> list[LatexTerm]:
    sector = "yukawa"
    if config.expansion is not Expansion.EXPANDED:
        if config.expand_hermitian_conjugates:
            body = (
                r"\sum_{p,r=1}^{3}\left["
                r"\overline Q_{Lp}(Y_d)_{pr}H d_R^r"
                r"+\overline Q_{Lp}(Y_u)_{pr}\widetilde H u_R^r"
                r"+\overline L_{Lp}(Y_e)_{pr}H e_R^r"
                r"+\overline d_R^r(Y_d^\dagger)_{rp}H^\dagger Q_L^p"
                r"+\overline u_R^r(Y_u^\dagger)_{rp}\widetilde H^\dagger Q_L^p"
                r"+\overline e_R^r(Y_e^\dagger)_{rp}H^\dagger L_L^p"
                r"\right]"
            )
        else:
            body = (
                r"\sum_{p,r=1}^{3}\left["
                r"\overline Q_{Lp}(Y_d)_{pr}H d_R^r"
                r"+\overline Q_{Lp}(Y_u)_{pr}\widetilde H u_R^r"
                r"+\overline L_{Lp}(Y_e)_{pr}H e_R^r"
                r"+\mathrm{h.c.}\right]"
            )
        return [_term(-1, body, sector, "yukawa-compact")]

    terms: list[LatexTerm] = []

    def add_with_conjugate(
        sign: int,
        body: str,
        conjugate: str,
        tag: str,
    ) -> None:
        if config.expand_hermitian_conjugates:
            terms.append(_term(sign, body, sector, tag))
            terms.append(_term(sign, conjugate, sector, tag + "-dagger"))
        else:
            terms.append(_term(sign, body + r"+\mathrm{h.c.}", sector, tag))

    pairs = _yukawa_generation_pairs(config.expand_generations)
    pair_prefix = "" if config.expand_generations else r"\sum_{p,r=1}^{3} "
    colours = ("1", "2", "3") if config.expand_colour else ("a",)

    for p, r in pairs:
        matrix_d = rf"(Y_d)_{{{p}{r}}}"
        matrix_u = rf"(Y_u)_{{{p}{r}}}"
        matrix_e = rf"(Y_e)_{{{p}{r}}}"
        matrix_d_dagger = rf"(Y_d^\dagger)_{{{r}{p}}}"
        matrix_u_dagger = rf"(Y_u^\dagger)_{{{r}{p}}}"
        matrix_e_dagger = rf"(Y_e^\dagger)_{{{r}{p}}}"
        if config.expand_weak_isospin:
            for colour in colours:
                q_u_bar = _bar_field("u", "L", p, colour)
                q_d_bar = _bar_field("d", "L", p, colour)
                d_right = _field("d", "R", r, colour)
                u_right = _field("u", "R", r, colour)
                d_right_bar = _bar_field("d", "R", r, colour)
                u_right_bar = _bar_field("u", "R", r, colour)
                u_left = _field("u", "L", p, colour)
                d_left = _field("d", "L", p, colour)
                add_with_conjugate(
                    -1,
                    pair_prefix + rf"{q_u_bar}{matrix_d}H^+{d_right}",
                    pair_prefix + rf"{d_right_bar}{matrix_d_dagger}H^-{u_left}",
                    f"yukawa-d-up-{p}{r}-c{colour}",
                )
                add_with_conjugate(
                    -1,
                    pair_prefix + rf"{q_d_bar}{matrix_d}H^0{d_right}",
                    pair_prefix + rf"{d_right_bar}{matrix_d_dagger}H^{{0*}}{d_left}",
                    f"yukawa-d-down-{p}{r}-c{colour}",
                )
                add_with_conjugate(
                    -1,
                    pair_prefix + rf"{q_u_bar}{matrix_u}H^{{0*}}{u_right}",
                    pair_prefix + rf"{u_right_bar}{matrix_u_dagger}H^0{u_left}",
                    f"yukawa-u-up-{p}{r}-c{colour}",
                )
                add_with_conjugate(
                    1,
                    pair_prefix + rf"{q_d_bar}{matrix_u}H^-{u_right}",
                    pair_prefix + rf"{u_right_bar}{matrix_u_dagger}H^+{d_left}",
                    f"yukawa-u-down-{p}{r}-c{colour}",
                )
            nu_bar = _bar_field(r"\nu", "L", p)
            e_left_bar = _bar_field("e", "L", p)
            e_right = _field("e", "R", r)
            e_right_bar = _bar_field("e", "R", r)
            neutrino_left = _field(r"\nu", "L", p)
            e_left = _field("e", "L", p)
            add_with_conjugate(
                -1,
                pair_prefix + rf"{nu_bar}{matrix_e}H^+{e_right}",
                pair_prefix + rf"{e_right_bar}{matrix_e_dagger}H^-{neutrino_left}",
                f"yukawa-e-neutrino-{p}{r}",
            )
            add_with_conjugate(
                -1,
                pair_prefix + rf"{e_left_bar}{matrix_e}H^0{e_right}",
                pair_prefix + rf"{e_right_bar}{matrix_e_dagger}H^{{0*}}{e_left}",
                f"yukawa-e-charged-{p}{r}",
            )
        else:
            colour = "a"
            q_bar = _bar_field("Q", "L", p, colour)
            d_right = _field("d", "R", r, colour)
            u_right = _field("u", "R", r, colour)
            l_bar = _bar_field("L", "L", p)
            e_right = _field("e", "R", r)
            d_right_bar = _bar_field("d", "R", r, colour)
            u_right_bar = _bar_field("u", "R", r, colour)
            e_right_bar = _bar_field("e", "R", r)
            q_left = _field("Q", "L", p, colour)
            l_left = _field("L", "L", p)
            add_with_conjugate(
                -1,
                pair_prefix + rf"{q_bar}{matrix_d}H{d_right}",
                pair_prefix + rf"{d_right_bar}{matrix_d_dagger}H^\dagger {q_left}",
                f"yukawa-d-{p}{r}",
            )
            add_with_conjugate(
                -1,
                pair_prefix + rf"{q_bar}{matrix_u}\widetilde H{u_right}",
                pair_prefix + rf"{u_right_bar}{matrix_u_dagger}\widetilde H^\dagger {q_left}",
                f"yukawa-u-{p}{r}",
            )
            add_with_conjugate(
                -1,
                pair_prefix + rf"{l_bar}{matrix_e}H{e_right}",
                pair_prefix + rf"{e_right_bar}{matrix_e_dagger}H^\dagger {l_left}",
                f"yukawa-e-{p}{r}",
            )
    return terms


CHARGED_LEPTONS = ("e", r"\mu", r"\tau")
UP_QUARKS = ("u", "c", "t")
DOWN_QUARKS = ("d", "s", "b")
QUARKS = ("u", "d", "c", "s", "t", "b")
NEUTRINOS = (r"\nu_e", r"\nu_\mu", r"\nu_\tau")


def _left_neutrino(field: str) -> tuple[str, str]:
    """Return (barred, unbarred) left-handed neutrino symbols."""

    flavour = field.removeprefix(r"\nu_")
    return (
        rf"\overline{{\nu}}_{{{flavour}\,L}}",
        rf"\nu_{{{flavour}\,L}}",
    )


def broken_qed_terms(config: StandardModelConfig) -> list[LatexTerm]:
    expanded_strength = (
        config.expansion is Expansion.EXPANDED and config.expand_field_strengths
    )
    terms = abelian_gauge_terms(
        field_strength="F",
        potential="A",
        sector="qed",
        tag="photon-kinetic",
        expanded=expanded_strength,
        distribute=config.distribute_field_strength_products,
    )
    if config.expansion is not Expansion.EXPANDED or not (
        config.expand_generations or config.expand_colour
    ):
        body = (
            r"eA_\mu\sum_{f\in\{e,\mu,\tau,u,d,c,s,t,b\}}"
            r"Q_f\,\overline f\gamma^\mu f"
        )
        terms.append(_term(1, body, "qed", "electromagnetic-current"))
        return terms

    charges = [(f, Fraction(-1)) for f in CHARGED_LEPTONS]
    charges += [(f, Fraction(2, 3)) for f in UP_QUARKS]
    charges += [(f, Fraction(-1, 3)) for f in DOWN_QUARKS]
    for field, charge in charges:
        colours: Iterable[str | None] = _colour_values(config.expand_colour) if field in QUARKS else (None,)
        for colour in colours:
            sign, coefficient = _fraction_latex(charge, "e")
            if colour is None:
                current = rf"\overline{{{field}}}\gamma^\mu {field}\,A_\mu"
                colour_tag = ""
            else:
                current = rf"\overline{{{field}}}^{{{colour}}}\gamma^\mu {field}_{{{colour}}}\,A_\mu"
                colour_tag = f"-c{colour}"
            terms.append(
                _term(sign, coefficient + r"\," + current, "qed", f"qed-{field}{colour_tag}")
            )
    return terms


def broken_qcd_terms(config: StandardModelConfig) -> list[LatexTerm]:
    terms = nonabelian_gauge_terms(
        group="su3",
        field="G",
        adjoint="A",
        structure="f",
        coupling="g_s",
        sector="qcd",
        tag="gluon-kinetic",
        expanded=config.expansion is Expansion.EXPANDED and config.expand_field_strengths,
        expand_adjoint=config.expand_colour,
        distribute=config.distribute_field_strength_products,
    )
    if config.expansion is not Expansion.EXPANDED or not (
        config.expand_generations or config.expand_colour
    ):
        terms.append(
            _term(
                1,
                r"g_sG_\mu^A\sum_{q\in\{u,d,c,s,t,b\}}"
                r"\overline q^{\,a}\gamma^\mu(T^A)_a{}^bq_b",
                "qcd",
                "quark-colour-current",
            )
        )
        return terms
    for quark in QUARKS:
        if config.expand_colour:
            terms.extend(
                _gell_mann_current_terms(
                    base=quark,
                    chirality="",
                    generation="",
                    generation_prefix="",
                    sector="qcd",
                    tag_prefix=f"qcd-{quark}",
                )
            )
        else:
            terms.append(
                _term(
                    1,
                    rf"g_sG_\mu^A\overline{{{quark}}}^{{\,a}}\gamma^\mu(T^A)_a{{}}^b{quark}_b",
                    "qcd",
                    f"qcd-{quark}",
                )
            )
    return terms


def broken_fermion_terms(config: StandardModelConfig) -> list[LatexTerm]:
    sector = "fermions"
    if config.expansion is not Expansion.EXPANDED or not (
        config.expand_generations or config.expand_colour
    ):
        return [
            _term(
                1,
                r"\sum_{f\in\{e,\mu,\tau,u,d,c,s,t,b\}}"
                r"\mathrm{i}\,\overline f\gamma^\mu\partial_\mu f",
                sector,
                "charged-fermion-kinetic",
            ),
            _term(
                1,
                r"\sum_{\alpha=e,\mu,\tau}\mathrm{i}\,"
                r"\overline\nu_{\alpha L}\gamma^\mu\partial_\mu\nu_{\alpha L}",
                sector,
                "neutrino-kinetic",
            ),
        ]
    terms = [
        _term(1, rf"\mathrm{{i}}\,\overline{{{field}}}\gamma^\mu\partial_\mu {field}", sector, f"kinetic-{field}")
        for field in CHARGED_LEPTONS
    ]
    for field in QUARKS:
        if config.expand_colour:
            for colour in _colour_values(True):
                terms.append(
                    _term(
                        1,
                        rf"\mathrm{{i}}\,\overline{{{field}}}^{{{colour}}}\gamma^\mu"
                        rf"\partial_\mu {field}_{{{colour}}}",
                        sector,
                        f"kinetic-{field}-c{colour}",
                    )
                )
        else:
            terms.append(
                _term(
                    1,
                    rf"\mathrm{{i}}\,\overline{{{field}}}^a\gamma^\mu\partial_\mu {field}_a",
                    sector,
                    f"kinetic-{field}",
                )
            )
    for field in NEUTRINOS:
        bar, neutrino = _left_neutrino(field)
        terms.append(
            _term(
                1,
                rf"\mathrm{{i}}\,{bar}\gamma^\mu\partial_\mu {neutrino}",
                sector,
                f"kinetic-{field}",
            )
        )
    return terms


def broken_yukawa_terms(config: StandardModelConfig) -> list[LatexTerm]:
    sector = "yukawa"
    if config.expansion is not Expansion.EXPANDED or not (
        config.expand_generations or config.expand_colour
    ):
        return [
            _term(
                -1,
                r"\sum_{f\in\{e,\mu,\tau,u,d,c,s,t,b\}}"
                r"m_f\left(1+\frac hv\right)\overline f f",
                sector,
                "fermion-masses-and-higgs-yukawa",
            )
        ]
    terms: list[LatexTerm] = []
    for field in CHARGED_LEPTONS:
        terms.append(_term(-1, rf"m_{{{field}}}\overline{{{field}}}{field}", sector, f"mass-{field}"))
        terms.append(
            _term(-1, rf"\frac{{m_{{{field}}}}}v h\overline{{{field}}}{field}", sector, f"higgs-yukawa-{field}")
        )
    for field in QUARKS:
        colours = _colour_values(True) if config.expand_colour else ("a",)
        for colour in colours:
            terms.append(
                _term(
                    -1,
                    rf"m_{{{field}}}\overline{{{field}}}^{{{colour}}}{field}_{{{colour}}}",
                    sector,
                    f"mass-{field}-c{colour}",
                )
            )
            terms.append(
                _term(
                    -1,
                    rf"\frac{{m_{{{field}}}}}v h\overline{{{field}}}^{{{colour}}}{field}_{{{colour}}}",
                    sector,
                    f"higgs-yukawa-{field}-c{colour}",
                )
            )
    return terms


def broken_weak_terms(config: StandardModelConfig) -> list[LatexTerm]:
    sector = "weak"
    expanded_strength = (
        config.expansion is Expansion.EXPANDED and config.expand_field_strengths
    )
    terms = broken_electroweak_gauge_terms(
        expanded=expanded_strength,
        distribute=config.distribute_field_strength_products,
    )
    terms.extend(
        [
            _term(1, r"m_W^2W_\mu^+W^{-\mu}", sector, "w-mass"),
            _term(1, r"\frac12m_Z^2Z_\mu Z^\mu", sector, "z-mass"),
        ]
    )
    if config.expansion is not Expansion.EXPANDED or not (
        config.expand_generations or config.expand_colour
    ):
        if config.expand_hermitian_conjugates:
            terms.extend(
                [
                    _term(
                        1,
                        r"\frac g{\sqrt2}W_\mu^+\left["
                        r"\sum_{i,j=1}^3\overline u_{Li}\gamma^\mu V_{ij}d_{Lj}"
                        r"+\sum_{\alpha=e,\mu,\tau}\overline\nu_{\alpha L}\gamma^\mu e_{\alpha L}"
                        r"\right]",
                        sector,
                        "charged-current-plus",
                    ),
                    _term(
                        1,
                        r"\frac g{\sqrt2}W_\mu^-\left["
                        r"\sum_{i,j=1}^3\overline d_{Lj}\gamma^\mu"
                        r"(V^\dagger)_{ji}u_{Li}"
                        r"+\sum_{\alpha=e,\mu,\tau}\overline e_{\alpha L}\gamma^\mu\nu_{\alpha L}"
                        r"\right]",
                        sector,
                        "charged-current-minus",
                    ),
                ]
            )
        else:
            terms.append(
                _term(
                    1,
                    r"\frac g{\sqrt2}W_\mu^+\left["
                    r"\sum_{i,j=1}^3\overline u_{Li}\gamma^\mu V_{ij}d_{Lj}"
                    r"+\sum_{\alpha=e,\mu,\tau}\overline\nu_{\alpha L}\gamma^\mu e_{\alpha L}"
                    r"\right]+\mathrm{h.c.}",
                    sector,
                    "charged-current",
                )
            )
        terms.append(
            _term(
                1,
                r"\frac g{c_W}Z_\mu\sum_f\overline f\gamma^\mu"
                r"\left(T_3^fP_L-s_W^2Q_f\right)f",
                sector,
                "neutral-current",
            )
        )
        return terms

    for up in UP_QUARKS:
        for down in DOWN_QUARKS:
            colours = _colour_values(True) if config.expand_colour else ("a",)
            for colour in colours:
                plus_body = (
                    rf"\frac g{{\sqrt2}}V_{{{up}{down}}}W_\mu^+"
                    rf"\overline{{{up}}}_L^{{{colour}}}\gamma^\mu {down}_{{L\,{colour}}}"
                )
                if config.expand_hermitian_conjugates:
                    terms.extend(
                        [
                            _term(
                                1,
                                plus_body,
                                sector,
                                f"charged-current-plus-{up}-{down}-c{colour}",
                            ),
                            _term(
                                1,
                                rf"\frac g{{\sqrt2}}V_{{{up}{down}}}^*W_\mu^-"
                                rf"\overline{{{down}}}_L^{{{colour}}}\gamma^\mu {up}_{{L\,{colour}}}",
                                sector,
                                f"charged-current-minus-{up}-{down}-c{colour}",
                            ),
                        ]
                    )
                else:
                    terms.append(
                        _term(
                            1,
                            plus_body + r"+\mathrm{h.c.}",
                            sector,
                            f"charged-current-{up}-{down}-c{colour}",
                        )
                    )
    for neutrino, lepton in zip(NEUTRINOS, CHARGED_LEPTONS, strict=True):
        neutrino_bar, neutrino_field = _left_neutrino(neutrino)
        plus_body = rf"\frac g{{\sqrt2}}W_\mu^+{neutrino_bar}\gamma^\mu {lepton}_L"
        if config.expand_hermitian_conjugates:
            terms.extend(
                [
                    _term(1, plus_body, sector, f"charged-current-plus-{lepton}"),
                    _term(
                        1,
                        rf"\frac g{{\sqrt2}}W_\mu^-\overline{{{lepton}}}_L"
                        rf"\gamma^\mu {neutrino_field}",
                        sector,
                        f"charged-current-minus-{lepton}",
                    ),
                ]
            )
        else:
            terms.append(
                _term(
                    1,
                    plus_body + r"+\mathrm{h.c.}",
                    sector,
                    f"charged-current-{lepton}",
                )
            )
    neutral_fields = CHARGED_LEPTONS + UP_QUARKS + DOWN_QUARKS + NEUTRINOS
    for field in neutral_fields:
        if field in NEUTRINOS:
            charge, t3 = Fraction(0), Fraction(1, 2)
        elif field in UP_QUARKS:
            charge, t3 = Fraction(2, 3), Fraction(1, 2)
        elif field in DOWN_QUARKS:
            charge, t3 = Fraction(-1, 3), Fraction(-1, 2)
        else:
            charge, t3 = Fraction(-1), Fraction(-1, 2)
        q_latex = "0" if charge == 0 else (
            str(charge.numerator) if charge.denominator == 1 else rf"\frac{{{charge.numerator}}}{{{charge.denominator}}}"
        )
        t3_latex = str(t3.numerator) if t3.denominator == 1 else rf"\frac{{{t3.numerator}}}{{{t3.denominator}}}"
        colours: Iterable[str | None] = (
            _colour_values(True)
            if config.expand_colour and field in QUARKS
            else (("a",) if field in QUARKS else (None,))
        )
        for colour in colours:
            if field in NEUTRINOS:
                left, right = _left_neutrino(field)
                colour_tag = ""
            elif colour is None:
                left = rf"\overline{{{field}}}"
                right = field
                colour_tag = ""
            else:
                left = rf"\overline{{{field}}}^{{{colour}}}"
                right = rf"{field}_{{{colour}}}"
                colour_tag = f"-c{colour}"
            terms.append(
                _term(
                    1,
                    rf"\frac g{{c_W}}Z_\mu{left}\gamma^\mu"
                    rf"\left({t3_latex}P_L-s_W^2\left({q_latex}\right)\right){right}",
                    sector,
                    f"neutral-current-{field}{colour_tag}",
                )
            )
    return terms


def broken_higgs_terms(config: StandardModelConfig) -> list[LatexTerm]:
    sector = "higgs"
    terms = [
        _term(1, r"\frac12\partial_\mu h\,\partial^\mu h", sector, "higgs-kinetic"),
        _term(-1, r"\frac12m_h^2h^2", sector, "higgs-mass"),
        _term(-1, r"\frac{m_h^2}{2v}h^3", sector, "higgs-cubic"),
        _term(-1, r"\frac{m_h^2}{8v^2}h^4", sector, "higgs-quartic"),
    ]
    if "weak" in config.sectors:
        terms.extend(
            [
                _term(1, r"\frac{2m_W^2}{v}hW_\mu^+W^{-\mu}", sector, "hww"),
                _term(1, r"\frac{m_W^2}{v^2}h^2W_\mu^+W^{-\mu}", sector, "hhww"),
                _term(1, r"\frac{m_Z^2}{v}hZ_\mu Z^\mu", sector, "hzz"),
                _term(1, r"\frac{m_Z^2}{2v^2}h^2Z_\mu Z^\mu", sector, "hhzz"),
            ]
        )
    return terms
