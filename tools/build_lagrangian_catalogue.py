"""Build the compact browser catalogue for the interactive Quarto page.

The web interface remains a static site: this script runs once before Quarto
renders the project and interns repeated terms across every sector selection.
"""

from __future__ import annotations

import json
from itertools import combinations
from pathlib import Path

from sm_lagrangian import StandardModelConfig, __version__, generate_lagrangian
from sm_lagrangian.config import BROKEN_SECTOR_ORDER, UNBROKEN_SECTOR_ORDER


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "lagrangian" / "catalogue.json"

LEVELS = (
    {
        "id": 0,
        "name": "Canonical",
        "short": "Compact",
        "description": "The usual compact Standard Model notation.",
    },
    {
        "id": 1,
        "name": "Multiplets",
        "short": "Indexed",
        "description": "Gauge and matter multiplets are written separately.",
    },
    {
        "id": 2,
        "name": "Connections",
        "short": "Expanded fields",
        "description": "Covariant derivatives and field strengths are exposed.",
    },
    {
        "id": 3,
        "name": "Components",
        "short": "Finite indices",
        "description": "Generations, colour, and weak components are unfolded.",
    },
    {
        "id": 4,
        "name": "Unfolded",
        "short": "Every monomial",
        "description": "Gauge products and Hermitian conjugates are explicit.",
    },
)

SECTOR_LABELS = {
    "qcd": "QCD",
    "electroweak": "Electroweak",
    "qed": "QED",
    "weak": "Weak",
    "fermions": "Fermions",
    "higgs": "Higgs",
    "yukawa": "Yukawa",
}


def sector_subsets(sectors: tuple[str, ...]):
    """Yield stable bit masks and sector tuples, including the empty set."""

    yield 0, ()
    for size in range(1, len(sectors) + 1):
        for chosen in combinations(range(len(sectors)), size):
            mask = sum(1 << index for index in chosen)
            yield mask, tuple(sectors[index] for index in chosen)


def config_for_level(
    phase: str,
    sectors: tuple[str, ...],
    level: int,
) -> StandardModelConfig:
    common = {"phase": phase, "sectors": sectors}
    if level == 0:
        return StandardModelConfig(**common, expansion="compact")
    if level == 1:
        return StandardModelConfig(**common, expansion="indexed")
    if level == 2:
        return StandardModelConfig(
            **common,
            expansion="expanded",
            expand_field_strengths=True,
            expand_covariant_derivatives=True,
        )
    if level == 3:
        return StandardModelConfig(
            **common,
            expansion="expanded",
            expand_generations=True,
            expand_colour=True,
            expand_weak_isospin=True,
            expand_field_strengths=True,
            expand_covariant_derivatives=True,
        )
    if level == 4:
        return StandardModelConfig.tshirt(phase=phase, sectors=sectors)
    raise ValueError(f"Unknown web expansion level: {level}")


def build_catalogue() -> dict[str, object]:
    term_pool: list[dict[str, object]] = []
    term_ids: dict[tuple[object, ...], int] = {}
    configurations: dict[str, list[int]] = {}
    configuration_counts: dict[str, int] = {}

    phases = {
        "unbroken": tuple(UNBROKEN_SECTOR_ORDER),
        "broken": tuple(BROKEN_SECTOR_ORDER),
    }

    for phase, available_sectors in phases.items():
        for level in range(len(LEVELS)):
            for mask, selected_sectors in sector_subsets(available_sectors):
                key = f"{phase}|{level}|{mask}"
                if not selected_sectors:
                    configurations[key] = []
                    configuration_counts[key] = 0
                    continue

                result = generate_lagrangian(
                    config_for_level(phase, selected_sectors, level)
                )
                ids: list[int] = []
                for term in result.terms:
                    identity = (term.sign, term.body, term.sector, term.tag)
                    term_id = term_ids.get(identity)
                    if term_id is None:
                        term_id = len(term_pool)
                        term_ids[identity] = term_id
                        term_pool.append(
                            {
                                "sign": term.sign,
                                "body": term.body,
                                "sector": term.sector,
                                "tag": term.tag,
                            }
                        )
                    ids.append(term_id)
                configurations[key] = ids
                configuration_counts[key] = len(ids)

    phase_data = {
        phase: {
            "sectors": list(sectors),
            "labels": {name: SECTOR_LABELS[name] for name in sectors},
            "allMask": (1 << len(sectors)) - 1,
        }
        for phase, sectors in phases.items()
    }

    return {
        "schemaVersion": 1,
        "engineVersion": __version__,
        "levels": list(LEVELS),
        "phases": phase_data,
        "terms": term_pool,
        "configurations": configurations,
        "counts": configuration_counts,
    }


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    catalogue = build_catalogue()
    OUTPUT.write_text(
        json.dumps(catalogue, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        + "\n",
        encoding="utf-8",
    )
    print(
        f"Built {OUTPUT.relative_to(ROOT)} with "
        f"{len(catalogue['terms'])} unique terms."
    )


if __name__ == "__main__":
    main()
