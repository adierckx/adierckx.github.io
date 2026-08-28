"""Tiny exact algebra used while unfolding fixed Lagrangian expressions.

This is intentionally not a general computer-algebra system.  It only keeps
track of the exact coefficients needed by the Standard Model catalogue:
rational numbers, powers of ``i`` and ``sqrt(3)``, and named couplings.
"""

from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
from typing import Iterable

from .result import LatexTerm


@dataclass(frozen=True, slots=True)
class Coefficient:
    """An exact scalar coefficient with a deterministic LaTeX rendering."""

    rational: Fraction = Fraction(1)
    i_power: int = 0
    sqrt_three_power: int = 0
    symbols: tuple[tuple[str, int], ...] = ()

    @classmethod
    def make(
        cls,
        rational: Fraction | int = 1,
        *,
        i_power: int = 0,
        sqrt_three_power: int = 0,
        symbols: Iterable[tuple[str, int]] = (),
    ) -> "Coefficient":
        value = Fraction(rational)

        # Reduce powers of i to either 1 or i, moving the sign into the
        # rational factor.
        reduced_i = i_power % 4
        if reduced_i >= 2:
            value *= -1
            reduced_i -= 2

        # Every pair of sqrt(3) factors is exactly 3.
        if sqrt_three_power < 0:
            raise ValueError("Negative powers of sqrt(3) are not supported.")
        value *= 3 ** (sqrt_three_power // 2)
        reduced_sqrt = sqrt_three_power % 2

        collected: dict[str, int] = {}
        for symbol, power in symbols:
            if power < 0:
                raise ValueError("Negative symbolic powers are not supported.")
            if power:
                collected[symbol] = collected.get(symbol, 0) + power
        # Dict insertion order preserves the conventional order supplied by
        # the catalogue (for example g c_W rather than c_W g).
        ordered = tuple(collected.items())
        return cls(value, reduced_i, reduced_sqrt, ordered)

    def __mul__(self, other: "Coefficient") -> "Coefficient":
        return Coefficient.make(
            self.rational * other.rational,
            i_power=self.i_power + other.i_power,
            sqrt_three_power=self.sqrt_three_power + other.sqrt_three_power,
            symbols=self.symbols + other.symbols,
        )

    def __neg__(self) -> "Coefficient":
        return Coefficient.make(
            -self.rational,
            i_power=self.i_power,
            sqrt_three_power=self.sqrt_three_power,
            symbols=self.symbols,
        )

    @property
    def is_zero(self) -> bool:
        return self.rational == 0

    def split_sign(self) -> tuple[int, str]:
        """Return an external sign and the absolute coefficient in LaTeX."""

        if self.is_zero:
            return 1, "0"
        sign = 1 if self.rational > 0 else -1
        magnitude = abs(self.rational)

        factors: list[str] = []
        if self.i_power:
            factors.append(r"\mathrm{i}")
        if self.sqrt_three_power:
            factors.append(r"\sqrt{3}")
        for symbol, power in self.symbols:
            factors.append(symbol if power == 1 else rf"{symbol}^{{{power}}}")
        symbolic = "".join(factors)

        numerator = ""
        if magnitude.numerator != 1 or not symbolic:
            numerator += str(magnitude.numerator)
        numerator += symbolic
        if magnitude.denominator != 1:
            rendered = rf"\frac{{{numerator}}}{{{magnitude.denominator}}}"
        else:
            rendered = numerator
        return sign, "" if rendered == "1" else rendered


ONE = Coefficient.make()


@dataclass(frozen=True, slots=True)
class Monomial:
    """One coefficient times one non-committed LaTeX field expression."""

    coefficient: Coefficient
    body: str

    def __post_init__(self) -> None:
        if not self.body.strip():
            raise ValueError("A monomial body cannot be empty.")

    def unsigned_body(self) -> tuple[int, str]:
        sign, factor = self.coefficient.split_sign()
        body = self.body if not factor else factor + r"\," + self.body
        return sign, body


LinearForm = tuple[Monomial, ...]


def linear_form_latex(form: LinearForm) -> str:
    """Render a sum without changing its order or combining monomials."""

    parts: list[str] = []
    for monomial in form:
        if monomial.coefficient.is_zero:
            continue
        sign, body = monomial.unsigned_body()
        if not parts:
            parts.append(body if sign > 0 else "-" + body)
        else:
            parts.append(("+" if sign > 0 else "-") + body)
    if not parts:
        return "0"
    return "".join(parts)


def product_terms(
    left: LinearForm,
    right: LinearForm,
    *,
    prefactor: Coefficient,
    sector: str,
    tag: str,
) -> list[LatexTerm]:
    """Distribute a product of two linear forms into additive terms."""

    terms: list[LatexTerm] = []
    serial = 0
    for left_monomial in left:
        for right_monomial in right:
            coefficient = prefactor * left_monomial.coefficient * right_monomial.coefficient
            if coefficient.is_zero:
                continue
            serial += 1
            sign, factor = coefficient.split_sign()
            body = left_monomial.body + r"\," + right_monomial.body
            if factor:
                body = factor + r"\," + body
            terms.append(
                LatexTerm(
                    sign=sign,
                    body=body,
                    sector=sector,
                    tag=f"{tag}-{serial}",
                )
            )
    return terms
