"""LaTeX output objects."""

from __future__ import annotations

from dataclasses import dataclass

from .config import Expansion, Phase


@dataclass(frozen=True, slots=True)
class LatexTerm:
    """One signed additive term in the generated Lagrangian."""

    sign: int
    body: str
    sector: str
    tag: str

    def __post_init__(self) -> None:
        if self.sign not in (-1, 1):
            raise ValueError("A term sign must be +1 or -1.")
        if not self.body.strip():
            raise ValueError("A LaTeX term cannot be empty.")

    def signed(self, *, first: bool = False) -> str:
        if first:
            return self.body if self.sign > 0 else rf"- {self.body}"
        operator = "+" if self.sign > 0 else "-"
        return rf"{operator} {self.body}"


@dataclass(frozen=True, slots=True)
class GeneratedLagrangian:
    """A generated formula together with its scope and caveats."""

    phase: Phase
    expansion: Expansion
    sectors: tuple[str, ...]
    terms: tuple[LatexTerm, ...]
    warnings: tuple[str, ...] = ()
    conventions: tuple[str, ...] = ()

    def to_latex(self, *, environment: str = "aligned") -> str:
        """Render a copy-pasteable display equation body."""

        if not self.terms:
            raise ValueError("Cannot render an empty Lagrangian.")
        if environment == "inline":
            joined = " ".join(
                term.signed(first=index == 0)
                for index, term in enumerate(self.terms)
            )
            return rf"\mathcal{{L}}_{{\mathrm{{selected}}}} = {joined}"
        if environment not in {"aligned", "align*"}:
            raise ValueError("environment must be 'aligned', 'align*', or 'inline'.")

        lines = [rf"\begin{{{environment}}}"]
        for index, term in enumerate(self.terms):
            if index == 0:
                prefix = r"\mathcal{L}_{\mathrm{selected}} ={}& "
                rendered = term.signed(first=True)
            else:
                prefix = r"&{} "
                rendered = term.signed()
            suffix = r" \\" if index < len(self.terms) - 1 else ""
            lines.append(prefix + rendered + suffix)
        lines.append(rf"\end{{{environment}}}")
        return "\n".join(lines)

    def to_standalone_document(self, *, multipage_threshold: int = 250) -> str:
        """Render a self-contained LaTeX document.

        Small selections use the tightly cropped ``standalone`` class.  A
        maximal expansion can exceed TeX's maximum box dimension, so long
        formulae automatically use a landscape multipage ``article`` with a
        breakable ``align*`` environment instead.
        """

        if multipage_threshold < 1:
            raise ValueError("multipage_threshold must be a positive integer.")

        warning_lines = "\n".join(f"% WARNING: {item}" for item in self.warnings)
        convention_lines = "\n".join(
            f"% CONVENTION: {item}" for item in self.conventions
        )
        metadata = "\n".join(part for part in (warning_lines, convention_lines) if part)
        if self.term_count <= multipage_threshold:
            return (
                "\\documentclass[border=8pt]{standalone}\n"
                "\\usepackage{amsmath,amssymb}\n"
                "\\begin{document}\n"
                f"{metadata}\n"
                "\\(\n"
                f"{self.to_latex()}\n"
                "\\)\n"
                "\\end{document}\n"
            )

        return (
            "\\documentclass[10pt]{article}\n"
            "\\usepackage{amsmath,amssymb}\n"
            "\\usepackage[a3paper,landscape,margin=8mm]{geometry}\n"
            "\\allowdisplaybreaks[4]\n"
            "\\pagestyle{empty}\n"
            "\\setlength{\\jot}{1pt}\n"
            "\\begin{document}\n"
            f"{metadata}\n"
            "\\scriptsize\n"
            f"{self.to_latex(environment='align*')}\n"
            "\\end{document}\n"
        )

    @property
    def term_count(self) -> int:
        return len(self.terms)

    def terms_for(self, sector: str) -> tuple[LatexTerm, ...]:
        return tuple(term for term in self.terms if term.sector == sector)
