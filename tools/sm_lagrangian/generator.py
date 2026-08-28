"""Public generation API."""

from __future__ import annotations

from typing import Any

from .catalogue import (
    broken_fermion_terms,
    broken_higgs_terms,
    broken_qcd_terms,
    broken_qed_terms,
    broken_weak_terms,
    broken_yukawa_terms,
    unbroken_fermion_terms,
    unbroken_gauge_terms,
    unbroken_higgs_terms,
    unbroken_yukawa_terms,
)
from .config import Expansion, Phase, StandardModelConfig
from .result import GeneratedLagrangian, LatexTerm


CONVENTIONS = (
    r"Lorentz indices remain covariant and are summed with the Einstein convention.",
    r"D_mu = partial_mu - i g_s G_mu^A T^A - i g W_mu^I t^I - i g' Y B_mu.",
    r"T^A = lambda^A/2 and t^I = sigma^I/2.",
    r"V(H) = -mu_H^2 H^dagger H + lambda (H^dagger H)^2.",
    r"W^3_mu = s_W A_mu + c_W Z_mu and B_mu = c_W A_mu - s_W Z_mu.",
    r"e = g s_W = g' c_W.",
    r"The broken-basis W field strengths retain their full non-Abelian pieces.",
    r"The minimal Standard Model is used: no right-handed neutrino and no neutrino mass term.",
    r"This is the classical gauge-invariant Lagrangian; gauge-fixing and ghost terms are not included.",
)


def _unbroken_terms(config: StandardModelConfig) -> list[LatexTerm]:
    terms: list[LatexTerm] = []
    for sector in config.ordered_sectors:
        if sector in {"qcd", "electroweak"}:
            terms.extend(unbroken_gauge_terms(config, sector))
        elif sector == "fermions":
            terms.extend(unbroken_fermion_terms(config))
        elif sector == "higgs":
            terms.extend(unbroken_higgs_terms(config))
        elif sector == "yukawa":
            terms.extend(unbroken_yukawa_terms(config))
        else:  # pragma: no cover - guarded by StandardModelConfig
            raise AssertionError(f"Unhandled sector: {sector}")
    return terms


def _broken_terms(config: StandardModelConfig) -> list[LatexTerm]:
    generators = {
        "qcd": broken_qcd_terms,
        "qed": broken_qed_terms,
        "weak": broken_weak_terms,
        "fermions": broken_fermion_terms,
        "higgs": broken_higgs_terms,
        "yukawa": broken_yukawa_terms,
    }
    terms: list[LatexTerm] = []
    for sector in config.ordered_sectors:
        terms.extend(generators[sector](config))
    return terms


def _warnings(config: StandardModelConfig) -> tuple[str, ...]:
    warnings: list[str] = []
    if config.expansion is not Expansion.EXPANDED and any(
        (
            config.expand_generations,
            config.expand_colour,
            config.expand_weak_isospin,
            config.distribute_field_strength_products,
        )
    ):
        warnings.append(
            "Finite index expansion flags only affect expansion='expanded'."
        )
    if config.distribute_field_strength_products and not (
        config.expansion is Expansion.EXPANDED and config.expand_field_strengths
    ):
        warnings.append(
            "Field-strength products can only be distributed when field-strength "
            "definitions are inserted in expansion='expanded'."
        )
    if config.distribute_field_strength_products:
        warnings.append(
            "The distributed output preserves every raw product monomial and does "
            "not combine expressions related by dummy-index relabelling."
        )
    if config.phase is Phase.BROKEN:
        warnings.append(
            "The broken phase assumes a diagonal charged-fermion mass basis, CKM "
            "mixing in charged quark currents, and massless neutrinos (no PMNS matrix)."
        )
    return tuple(warnings)


def generate_lagrangian(
    config: StandardModelConfig | None = None,
    **options: Any,
) -> GeneratedLagrangian:
    """Generate selected Standard Model sectors.

    Pass either a :class:`StandardModelConfig` or keyword arguments accepted by
    that class.  The returned object provides raw LaTeX, a standalone document,
    term metadata, conventions, and warnings.
    """

    if config is not None and options:
        raise TypeError("Pass a config object or keyword options, not both.")
    if config is None:
        config = StandardModelConfig(**options)
    if not isinstance(config, StandardModelConfig):
        raise TypeError("config must be a StandardModelConfig instance.")

    terms = (
        _unbroken_terms(config)
        if config.phase is Phase.UNBROKEN
        else _broken_terms(config)
    )
    return GeneratedLagrangian(
        phase=config.phase,
        expansion=config.expansion,
        sectors=config.ordered_sectors,
        terms=tuple(terms),
        warnings=_warnings(config),
        conventions=CONVENTIONS,
    )


def sm_lagrangian(**options: Any) -> str:
    """Convenience function returning only the aligned LaTeX string."""

    return generate_lagrangian(**options).to_latex()
