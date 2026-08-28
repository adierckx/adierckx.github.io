"""Command-line interface."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .config import (
    BROKEN_SECTOR_ORDER,
    UNBROKEN_SECTOR_ORDER,
    Expansion,
    Phase,
    StandardModelConfig,
)
from .generator import generate_lagrangian


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="sm-lagrangian",
        description="Generate selected sectors of a fixed Standard Model Lagrangian.",
    )
    parser.add_argument(
        "--phase",
        choices=[phase.value for phase in Phase],
        default=Phase.UNBROKEN.value,
        help="Gauge basis before EWSB, or physical basis after EWSB.",
    )
    parser.add_argument(
        "--sectors",
        default="all",
        help="Comma-separated sector list, or 'all'.",
    )
    parser.add_argument(
        "--expansion",
        choices=[level.value for level in Expansion],
        default=Expansion.COMPACT.value,
    )
    parser.add_argument("--expand-generations", action="store_true")
    parser.add_argument("--expand-colour", action="store_true")
    parser.add_argument("--expand-weak-isospin", action="store_true")
    parser.add_argument(
        "--keep-field-strengths",
        action="store_true",
        help="Keep F_{mu nu}, G^A_{mu nu}, ... instead of inserting definitions.",
    )
    parser.add_argument(
        "--keep-covariant-derivatives",
        action="store_true",
        help="Keep D_mu instead of expanding the active gauge connections.",
    )
    parser.add_argument(
        "--distribute-field-strength-products",
        action="store_true",
        help="Write every quadratic, cubic, and quartic gauge monomial separately.",
    )
    parser.add_argument(
        "--expand-hermitian-conjugates",
        action="store_true",
        help="Replace every h.c. abbreviation by its explicit conjugate term.",
    )
    parser.add_argument(
        "--standalone",
        action="store_true",
        help="Emit a complete standalone LaTeX document.",
    )
    parser.add_argument("--output", type=Path, help="Write output to this file.")
    parser.add_argument(
        "--list-sectors",
        action="store_true",
        help="Print the valid sector names and exit.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.list_sectors:
        print("unbroken: " + ", ".join(UNBROKEN_SECTOR_ORDER))
        print("broken:   " + ", ".join(BROKEN_SECTOR_ORDER))
        return 0

    try:
        config = StandardModelConfig(
            phase=args.phase,
            sectors=args.sectors,
            expansion=args.expansion,
            expand_generations=args.expand_generations,
            expand_colour=args.expand_colour,
            expand_weak_isospin=args.expand_weak_isospin,
            expand_field_strengths=not args.keep_field_strengths,
            expand_covariant_derivatives=not args.keep_covariant_derivatives,
            distribute_field_strength_products=args.distribute_field_strength_products,
            expand_hermitian_conjugates=args.expand_hermitian_conjugates,
        )
    except ValueError as exc:
        parser.error(str(exc))

    result = generate_lagrangian(config)
    output = result.to_standalone_document() if args.standalone else result.to_latex()
    if args.output:
        args.output.write_text(output + ("" if output.endswith("\n") else "\n"), encoding="utf-8")
    else:
        print(output)
        if result.warnings:
            print("\n% Notes:")
            for warning in result.warnings:
                print(f"% - {warning}")
    return 0
