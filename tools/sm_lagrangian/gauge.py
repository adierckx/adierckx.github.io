"""Gauge-field expansions for the fixed Standard Model catalogue."""

from __future__ import annotations

from fractions import Fraction
from .result import LatexTerm
from .symbolic import (
    ONE,
    Coefficient,
    LinearForm,
    Monomial,
    linear_form_latex,
    product_terms,
)


def _coefficient(
    rational: Fraction | int = 1,
    *,
    i_power: int = 0,
    sqrt_three_power: int = 0,
    symbols: tuple[tuple[str, int], ...] = (),
) -> Coefficient:
    return Coefficient.make(
        rational,
        i_power=i_power,
        sqrt_three_power=sqrt_three_power,
        symbols=symbols,
    )


def _factorized_product(
    left: LinearForm,
    right: LinearForm,
    *,
    prefactor: Coefficient,
    sector: str,
    tag: str,
) -> LatexTerm:
    sign, factor = prefactor.split_sign()
    product = (
        rf"\left({linear_form_latex(left)}\right)"
        rf"\left({linear_form_latex(right)}\right)"
    )
    body = product if not factor else factor + r"\," + product
    return LatexTerm(sign=sign, body=body, sector=sector, tag=tag)


def _emit_product(
    left: LinearForm,
    right: LinearForm,
    *,
    prefactor: Coefficient,
    sector: str,
    tag: str,
    distribute: bool,
) -> list[LatexTerm]:
    if distribute:
        return product_terms(
            left,
            right,
            prefactor=prefactor,
            sector=sector,
            tag=tag,
        )
    return [
        _factorized_product(
            left,
            right,
            prefactor=prefactor,
            sector=sector,
            tag=tag,
        )
    ]


def _abelian_form(potential: str, *, raised: bool) -> LinearForm:
    if raised:
        return (
            Monomial(ONE, rf"\partial^\mu {potential}^\nu"),
            Monomial(_coefficient(-1), rf"\partial^\nu {potential}^\mu"),
        )
    return (
        Monomial(ONE, rf"\partial_\mu {potential}_\nu"),
        Monomial(_coefficient(-1), rf"\partial_\nu {potential}_\mu"),
    )


def abelian_gauge_terms(
    *,
    field_strength: str,
    potential: str,
    sector: str,
    tag: str,
    expanded: bool,
    distribute: bool,
) -> list[LatexTerm]:
    """Return ``-F_{mu nu} F^{mu nu}/4`` at the selected depth."""

    if not expanded:
        return [
            LatexTerm(
                -1,
                rf"\frac14 {field_strength}_{{\mu\nu}}{field_strength}^{{\mu\nu}}",
                sector,
                tag,
            )
        ]
    return _emit_product(
        _abelian_form(potential, raised=False),
        _abelian_form(potential, raised=True),
        prefactor=_coefficient(Fraction(-1, 4)),
        sector=sector,
        tag=f"{tag}-field-strength-expanded",
        distribute=distribute,
    )


_SU3_BASE_CONSTANTS: dict[tuple[int, int, int], Coefficient] = {
    (1, 2, 3): _coefficient(1),
    (1, 4, 7): _coefficient(Fraction(1, 2)),
    (2, 4, 6): _coefficient(Fraction(1, 2)),
    (2, 5, 7): _coefficient(Fraction(1, 2)),
    (3, 4, 5): _coefficient(Fraction(1, 2)),
    (1, 5, 6): _coefficient(Fraction(-1, 2)),
    (3, 6, 7): _coefficient(Fraction(-1, 2)),
    (4, 5, 8): _coefficient(Fraction(1, 2), sqrt_three_power=1),
    (6, 7, 8): _coefficient(Fraction(1, 2), sqrt_three_power=1),
}


def _permutation_sign(values: tuple[int, int, int]) -> int:
    inversions = sum(
        values[left] > values[right]
        for left in range(3)
        for right in range(left + 1, 3)
    )
    return -1 if inversions % 2 else 1


def su3_structure_constant(a: int, b: int, c: int) -> Coefficient:
    """Return the exact Gell-Mann convention value of ``f^{abc}``."""

    if len({a, b, c}) != 3:
        return _coefficient(0)
    key = tuple(sorted((a, b, c)))
    base = _SU3_BASE_CONSTANTS.get(key)
    if base is None:
        return _coefficient(0)
    return base if _permutation_sign((a, b, c)) > 0 else -base


def su2_structure_constant(a: int, b: int, c: int) -> Coefficient:
    """Return ``epsilon^{abc}`` for indices 1, 2, 3."""

    if set((a, b, c)) != {1, 2, 3}:
        return _coefficient(0)
    return _coefficient(_permutation_sign((a, b, c)))


def _indexed_nonabelian_form(
    *,
    field: str,
    adjoint: str,
    other_indices: tuple[str, str],
    structure: str,
    coupling: str,
    raised: bool,
) -> LinearForm:
    first, second = other_indices
    coupling_coefficient = _coefficient(symbols=((coupling, 1),))
    if raised:
        return (
            Monomial(ONE, rf"\partial^\mu {field}^{{{adjoint}\nu}}"),
            Monomial(_coefficient(-1), rf"\partial^\nu {field}^{{{adjoint}\mu}}"),
            Monomial(
                coupling_coefficient,
                rf"{structure}^{{{adjoint}{first}{second}}}"
                rf"{field}^{{{first}\mu}}{field}^{{{second}\nu}}",
            ),
        )
    return (
        Monomial(ONE, rf"\partial_\mu {field}_\nu^{{{adjoint}}}"),
        Monomial(_coefficient(-1), rf"\partial_\nu {field}_\mu^{{{adjoint}}}"),
        Monomial(
            coupling_coefficient,
            rf"{structure}^{{{adjoint}{first}{second}}}"
            rf"{field}_\mu^{{{first}}}{field}_\nu^{{{second}}}",
        ),
    )


def _component_nonabelian_form(
    *,
    group: str,
    field: str,
    adjoint: int,
    coupling: str,
    raised: bool,
) -> LinearForm:
    dimension = 8 if group == "su3" else 3
    structure_constant = (
        su3_structure_constant if group == "su3" else su2_structure_constant
    )
    terms: list[Monomial] = []
    if raised:
        terms.extend(
            (
                Monomial(ONE, rf"\partial^\mu {field}^{{{adjoint}\nu}}"),
                Monomial(
                    _coefficient(-1),
                    rf"\partial^\nu {field}^{{{adjoint}\mu}}",
                ),
            )
        )
    else:
        terms.extend(
            (
                Monomial(ONE, rf"\partial_\mu {field}_\nu^{{{adjoint}}}"),
                Monomial(
                    _coefficient(-1),
                    rf"\partial_\nu {field}_\mu^{{{adjoint}}}",
                ),
            )
        )

    coupling_coefficient = _coefficient(symbols=((coupling, 1),))
    for b in range(1, dimension + 1):
        for c in range(1, dimension + 1):
            value = structure_constant(adjoint, b, c)
            if value.is_zero:
                continue
            if raised:
                body = rf"{field}^{{{b}\mu}}{field}^{{{c}\nu}}"
            else:
                body = rf"{field}_\mu^{{{b}}}{field}_\nu^{{{c}}}"
            terms.append(Monomial(value * coupling_coefficient, body))
    return tuple(terms)


def nonabelian_gauge_terms(
    *,
    group: str,
    field: str,
    adjoint: str,
    structure: str,
    coupling: str,
    sector: str,
    tag: str,
    expanded: bool,
    expand_adjoint: bool,
    distribute: bool,
) -> list[LatexTerm]:
    """Return a Yang--Mills kinetic term, optionally fully unfolded."""

    if group not in {"su2", "su3"}:
        raise ValueError("group must be 'su2' or 'su3'.")
    if not expanded:
        return [
            LatexTerm(
                -1,
                rf"\frac14 {field}_{{\mu\nu}}^{{{adjoint}}}"
                rf"{field}^{{{adjoint}\mu\nu}}",
                sector,
                tag,
            )
        ]

    prefactor = _coefficient(Fraction(-1, 4))
    terms: list[LatexTerm] = []
    if not expand_adjoint:
        lower_indices = ("B", "C") if group == "su3" else ("J", "K")
        upper_indices = ("D", "E") if group == "su3" else ("L", "M")
        lower = _indexed_nonabelian_form(
            field=field,
            adjoint=adjoint,
            other_indices=lower_indices,
            structure=structure,
            coupling=coupling,
            raised=False,
        )
        upper = _indexed_nonabelian_form(
            field=field,
            adjoint=adjoint,
            other_indices=upper_indices,
            structure=structure,
            coupling=coupling,
            raised=True,
        )
        return _emit_product(
            lower,
            upper,
            prefactor=prefactor,
            sector=sector,
            tag=f"{tag}-field-strength-expanded",
            distribute=distribute,
        )

    dimension = 8 if group == "su3" else 3
    for component in range(1, dimension + 1):
        lower = _component_nonabelian_form(
            group=group,
            field=field,
            adjoint=component,
            coupling=coupling,
            raised=False,
        )
        upper = _component_nonabelian_form(
            group=group,
            field=field,
            adjoint=component,
            coupling=coupling,
            raised=True,
        )
        terms.extend(
            _emit_product(
                lower,
                upper,
                prefactor=prefactor,
                sector=sector,
                tag=f"{tag}-component-{component}",
                distribute=distribute,
            )
        )
    return terms


def _physical_charged_form(*, charge: str, raised: bool) -> LinearForm:
    """Full W-plus or W-minus field strength in the A/Z basis."""

    if charge not in {"+", "-"}:
        raise ValueError("charge must be '+' or '-'.")
    # W+ has +i g and W- has -i g in the nonlinear piece.
    nonlinear_sign = 1 if charge == "+" else -1
    positive = _coefficient(
        nonlinear_sign,
        i_power=1,
        symbols=(("g", 1),),
    )
    negative = -positive
    if raised:
        return (
            Monomial(ONE, rf"\partial^\mu W^{{{charge}\nu}}"),
            Monomial(_coefficient(-1), rf"\partial^\nu W^{{{charge}\mu}}"),
            Monomial(positive * _coefficient(symbols=(("s_W", 1),)), rf"W^{{{charge}\mu}}A^\nu"),
            Monomial(positive * _coefficient(symbols=(("c_W", 1),)), rf"W^{{{charge}\mu}}Z^\nu"),
            Monomial(negative * _coefficient(symbols=(("s_W", 1),)), rf"W^{{{charge}\nu}}A^\mu"),
            Monomial(negative * _coefficient(symbols=(("c_W", 1),)), rf"W^{{{charge}\nu}}Z^\mu"),
        )
    return (
        Monomial(ONE, rf"\partial_\mu W^{charge}_\nu"),
        Monomial(_coefficient(-1), rf"\partial_\nu W^{charge}_\mu"),
        Monomial(positive * _coefficient(symbols=(("s_W", 1),)), rf"W^{charge}_\mu A_\nu"),
        Monomial(positive * _coefficient(symbols=(("c_W", 1),)), rf"W^{charge}_\mu Z_\nu"),
        Monomial(negative * _coefficient(symbols=(("s_W", 1),)), rf"W^{charge}_\nu A_\mu"),
        Monomial(negative * _coefficient(symbols=(("c_W", 1),)), rf"W^{charge}_\nu Z_\mu"),
    )


def _neutral_linear_form(*, raised: bool) -> LinearForm:
    if raised:
        return (
            Monomial(_coefficient(symbols=(("s_W", 1),)), r"\partial^\mu A^\nu"),
            Monomial(_coefficient(-1, symbols=(("s_W", 1),)), r"\partial^\nu A^\mu"),
            Monomial(_coefficient(symbols=(("c_W", 1),)), r"\partial^\mu Z^\nu"),
            Monomial(_coefficient(-1, symbols=(("c_W", 1),)), r"\partial^\nu Z^\mu"),
        )
    return (
        Monomial(_coefficient(symbols=(("s_W", 1),)), r"\partial_\mu A_\nu"),
        Monomial(_coefficient(-1, symbols=(("s_W", 1),)), r"\partial_\nu A_\mu"),
        Monomial(_coefficient(symbols=(("c_W", 1),)), r"\partial_\mu Z_\nu"),
        Monomial(_coefficient(-1, symbols=(("c_W", 1),)), r"\partial_\nu Z_\mu"),
    )


def _neutral_nonlinear_form(*, raised: bool) -> LinearForm:
    negative_i_g = _coefficient(-1, i_power=1, symbols=(("g", 1),))
    positive_i_g = -negative_i_g
    if raised:
        return (
            Monomial(negative_i_g, r"W^{+\mu}W^{-\nu}"),
            Monomial(positive_i_g, r"W^{+\nu}W^{-\mu}"),
        )
    return (
        Monomial(negative_i_g, r"W^+_\mu W^-_\nu"),
        Monomial(positive_i_g, r"W^+_\nu W^-_\mu"),
    )


def broken_electroweak_gauge_terms(
    *,
    expanded: bool,
    distribute: bool,
) -> list[LatexTerm]:
    """Physical-basis W/Z gauge terms, including every WWV and WWVV term.

    The free photon kinetic term is deliberately returned by the QED sector.
    This function returns the charged non-Abelian product, the free Z kinetic
    term, and the neutral non-Abelian cross/quartic pieces.
    """

    sector = "weak"
    if not expanded:
        return [
            LatexTerm(-1, r"\frac12 W^+_{\mu\nu}W^{-\mu\nu}", sector, "charged-weak-kinetic"),
            LatexTerm(-1, r"\frac14 Z_{\mu\nu}Z^{\mu\nu}", sector, "neutral-weak-kinetic"),
        ]

    terms = _emit_product(
        _physical_charged_form(charge="+", raised=False),
        _physical_charged_form(charge="-", raised=True),
        prefactor=_coefficient(Fraction(-1, 2)),
        sector=sector,
        tag="charged-weak-full",
        distribute=distribute,
    )
    terms.extend(
        abelian_gauge_terms(
            field_strength="Z",
            potential="Z",
            sector=sector,
            tag="neutral-weak-kinetic",
            expanded=True,
            distribute=distribute,
        )
    )

    linear_lower = _neutral_linear_form(raised=False)
    linear_upper = _neutral_linear_form(raised=True)
    nonlinear_lower = _neutral_nonlinear_form(raised=False)
    nonlinear_upper = _neutral_nonlinear_form(raised=True)
    neutral_prefactor = _coefficient(Fraction(-1, 4))
    for left, right, tag in (
        (linear_lower, nonlinear_upper, "neutral-weak-cubic-left"),
        (nonlinear_lower, linear_upper, "neutral-weak-cubic-right"),
        (nonlinear_lower, nonlinear_upper, "neutral-weak-quartic"),
    ):
        terms.extend(
            _emit_product(
                left,
                right,
                prefactor=neutral_prefactor,
                sector=sector,
                tag=tag,
                distribute=distribute,
            )
        )
    return terms
