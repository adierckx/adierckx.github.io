"""Configuration and validation for the Standard Model catalogue."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Iterable


class Phase(str, Enum):
    """Field basis used to write the Lagrangian."""

    UNBROKEN = "unbroken"
    BROKEN = "broken"


class Expansion(str, Enum):
    """Global amount of notation to unfold."""

    COMPACT = "compact"
    INDEXED = "indexed"
    EXPANDED = "expanded"


UNBROKEN_SECTOR_ORDER = (
    "qcd",
    "electroweak",
    "fermions",
    "higgs",
    "yukawa",
)

BROKEN_SECTOR_ORDER = (
    "qcd",
    "qed",
    "weak",
    "fermions",
    "higgs",
    "yukawa",
)

SECTOR_ALIASES = {
    "ew": "electroweak",
    "electro-weak": "electroweak",
    "electro_weak": "electroweak",
    "matter": "fermions",
    "fermion": "fermions",
    "yukawas": "yukawa",
}


def sector_order(phase: Phase) -> tuple[str, ...]:
    return UNBROKEN_SECTOR_ORDER if phase is Phase.UNBROKEN else BROKEN_SECTOR_ORDER


def _normalise_sector_name(name: str) -> str:
    cleaned = name.strip().lower().replace(" ", "_")
    return SECTOR_ALIASES.get(cleaned, cleaned)


def normalise_sectors(
    sectors: str | Iterable[str] | None,
    phase: Phase,
) -> frozenset[str]:
    allowed = sector_order(phase)
    if sectors is None:
        return frozenset(allowed)

    if isinstance(sectors, str):
        raw = [part for part in sectors.split(",") if part.strip()]
    else:
        raw = list(sectors)

    names = {_normalise_sector_name(name) for name in raw}
    if "all" in names:
        if len(names) != 1:
            raise ValueError("Use 'all' by itself, or list sectors explicitly.")
        return frozenset(allowed)

    unknown = names.difference(allowed)
    if unknown:
        valid = ", ".join(allowed)
        bad = ", ".join(sorted(unknown))
        if phase is Phase.UNBROKEN and "qed" in unknown:
            raise ValueError(
                "QED is not an independent sector before electroweak symmetry "
                "breaking. Use sector='electroweak', or phase='broken'."
            )
        raise ValueError(
            f"Unknown sector(s) for the {phase.value} phase: {bad}. "
            f"Valid sectors: {valid}."
        )
    if not names:
        raise ValueError("At least one sector must be selected.")
    return frozenset(names)


@dataclass(frozen=True, slots=True)
class StandardModelConfig:
    """Options controlling which fixed Standard Model formula is rendered.

    Lorentz contractions always remain covariant: no option ever replaces
    ``mu`` by the four numerical spacetime components.
    """

    phase: Phase | str = Phase.UNBROKEN
    sectors: str | Iterable[str] | None = None
    expansion: Expansion | str = Expansion.COMPACT
    expand_generations: bool = False
    expand_colour: bool = False
    expand_weak_isospin: bool = False
    expand_field_strengths: bool = True
    expand_covariant_derivatives: bool = True
    distribute_field_strength_products: bool = False
    expand_hermitian_conjugates: bool = False

    def __post_init__(self) -> None:
        phase = self.phase if isinstance(self.phase, Phase) else Phase(self.phase)
        expansion = (
            self.expansion
            if isinstance(self.expansion, Expansion)
            else Expansion(self.expansion)
        )
        sectors = normalise_sectors(self.sectors, phase)
        object.__setattr__(self, "phase", phase)
        object.__setattr__(self, "expansion", expansion)
        object.__setattr__(self, "sectors", sectors)

    @property
    def ordered_sectors(self) -> tuple[str, ...]:
        return tuple(name for name in sector_order(self.phase) if name in self.sectors)

    @classmethod
    def tshirt(
        cls,
        *,
        phase: Phase | str = Phase.UNBROKEN,
        sectors: str | Iterable[str] | None = None,
    ) -> "StandardModelConfig":
        """A deliberately verbose preset suitable for a long equation strip."""

        return cls(
            phase=phase,
            sectors=sectors,
            expansion=Expansion.EXPANDED,
            expand_generations=True,
            expand_colour=True,
            expand_weak_isospin=True,
            expand_field_strengths=True,
            expand_covariant_derivatives=True,
            distribute_field_strength_products=True,
            expand_hermitian_conjugates=True,
        )
