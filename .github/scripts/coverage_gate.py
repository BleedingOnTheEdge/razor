#!/usr/bin/env python3
"""Whole-solution line and branch coverage gate for the Razor CI build.

The Razor test projects reference `coverlet.collector`, so
`dotnet test Razor.sln --collect:"XPlat Code Coverage"` writes one Cobertura
report per test project (`<results-dir>/<run-guid>/coverage.cobertura.xml`).

Those reports overlap: every test project instruments the same assemblies, so
summing them would count the same source line more than once. This script
merges them per class and per line -- keeping the highest hit count seen for
each line, and the highest covered/valid branch pair seen for each branch
point -- and then sums the merged result. A line that one test project covers
and another does not counts as covered exactly once.

The merged numbers are compared against a line floor and a branch floor; a
shortfall exits non-zero so the CI step fails the job.

Caveat this script cannot fix: coverlet only instruments assemblies that a test
project actually loads. Source projects with no test project (Kernel and Engine
today -- issue #4) are absent from the reports altogether, so they neither add
to the numerator nor to the denominator. The reported rate therefore describes
the instrumented part of the solution, not every line committed to it.

Usage:
    coverage_gate.py --results-dir core/TestResults \\
        --min-line 90 --min-branch 85 \\
        --merged core/TestResults/coverage-merged.cobertura.xml \\
        --summary core/TestResults/coverage-summary.md
"""

from __future__ import annotations

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path

# coverlet writes "condition-coverage=\"50% (1/2)\"" on a branch line: the
# bracketed pair is covered/valid branch arms for that single source line.
_CONDITION_COVERAGE = re.compile(r"\((\d+)\s*/\s*(\d+)\)")


@dataclass
class ClassCoverage:
    """Merged coverage for one class, keyed by its Cobertura filename."""

    name: str
    filename: str
    # line number -> highest hit count seen across the merged reports
    lines: dict[int, int] = field(default_factory=dict)
    # line number -> highest (covered, valid) branch pair seen
    branches: dict[int, tuple[int, int]] = field(default_factory=dict)

    @property
    def line_valid(self) -> int:
        return len(self.lines)

    @property
    def line_covered(self) -> int:
        return sum(1 for hits in self.lines.values() if hits > 0)

    @property
    def branch_valid(self) -> int:
        return sum(valid for _, valid in self.branches.values())

    @property
    def branch_covered(self) -> int:
        return sum(covered for covered, _ in self.branches.values())

    @property
    def line_rate(self) -> float:
        # coverlet reports a rate of 1 for a class with no lines/branches to
        # measure, so mirror that instead of dividing by zero.
        return self.line_covered / self.line_valid if self.line_valid else 1.0

    @property
    def branch_rate(self) -> float:
        return self.branch_covered / self.branch_valid if self.branch_valid else 1.0

    def merge(self, other: "ClassCoverage") -> None:
        """Union another report's view of the same class into this one."""
        for number, hits in other.lines.items():
            self.lines[number] = max(self.lines.get(number, 0), hits)
        for number, (covered, valid) in other.branches.items():
            previous = self.branches.get(number)
            if previous is None:
                self.branches[number] = (covered, valid)
            else:
                self.branches[number] = (
                    max(previous[0], covered),
                    max(previous[1], valid),
                )


@dataclass
class Totals:
    """Line and branch totals for a set of classes."""

    line_covered: int = 0
    line_valid: int = 0
    branch_covered: int = 0
    branch_valid: int = 0

    @property
    def line_rate(self) -> float:
        return self.line_covered / self.line_valid if self.line_valid else 0.0

    @property
    def branch_rate(self) -> float:
        return self.branch_covered / self.branch_valid if self.branch_valid else 0.0


def percent(value: float) -> str:
    """Format a 0..1 rate as a percentage with two decimals."""
    return f"{value * 100:.2f}%"


def parse_report(path: Path) -> dict[str, ClassCoverage]:
    """Read one Cobertura report into {class name: ClassCoverage}."""
    root = ET.parse(path).getroot()
    if root.tag != "coverage":
        raise ValueError(f"{path}: expected a <coverage> root, found <{root.tag}>")

    classes: dict[str, ClassCoverage] = {}
    for element in root.findall("./packages/package/classes/class"):
        name = element.get("name")
        filename = element.get("filename")
        if name is None or filename is None:
            raise ValueError(f"{path}: <class> without name or filename")

        coverage = ClassCoverage(name=name, filename=filename)
        # Only <class>/<lines>/<line> -- <methods>/<method>/<lines> repeats the
        # same source lines and would double count them.
        for line in element.findall("./lines/line"):
            number = int(line.get("number", "0"))
            coverage.lines[number] = int(line.get("hits", "0"))

            # coverlet writes branch="True"; compare case-insensitively.
            if (line.get("branch") or "").lower() != "true":
                continue
            match = _CONDITION_COVERAGE.search(line.get("condition-coverage", ""))
            if match is None:
                continue
            covered, valid = int(match.group(1)), int(match.group(2))
            if valid > 0:
                coverage.branches[number] = (covered, valid)

        previous = classes.get(name)
        if previous is None:
            classes[name] = coverage
        else:
            previous.merge(coverage)

    return classes


def merge_reports(paths: list[Path]) -> dict[str, ClassCoverage]:
    """Merge every report into one {class name: ClassCoverage} map."""
    merged: dict[str, ClassCoverage] = {}
    for path in paths:
        for name, coverage in parse_report(path).items():
            previous = merged.get(name)
            if previous is None:
                merged[name] = coverage
            else:
                previous.merge(coverage)
    return merged


def totals(classes: dict[str, ClassCoverage]) -> Totals:
    """Sum line and branch coverage across classes."""
    result = Totals()
    for coverage in classes.values():
        result.line_covered += coverage.line_covered
        result.line_valid += coverage.line_valid
        result.branch_covered += coverage.branch_covered
        result.branch_valid += coverage.branch_valid
    return result


def write_merged_report(classes: dict[str, ClassCoverage], path: Path) -> None:
    """Write the merged coverage as a single Cobertura report.

    One `<class>` element per merged class, mirroring coverlet's own layout, so
    the file can be consumed by the usual Cobertura readers.
    """
    merged_totals = totals(classes)

    root = ET.Element(
        "coverage",
        {
            "version": "1.9",
            "line-rate": f"{merged_totals.line_rate:.4f}",
            "branch-rate": f"{merged_totals.branch_rate:.4f}",
            "lines-covered": str(merged_totals.line_covered),
            "lines-valid": str(merged_totals.line_valid),
            "branches-covered": str(merged_totals.branch_covered),
            "branches-valid": str(merged_totals.branch_valid),
        },
    )
    package = ET.SubElement(ET.SubElement(root, "packages"), "package", {"name": "merged"})
    classes_element = ET.SubElement(package, "classes")

    for name, coverage in sorted(classes.items()):
        class_element = ET.SubElement(
            classes_element,
            "class",
            {
                "name": name,
                "filename": coverage.filename,
                "line-rate": f"{coverage.line_rate:.4f}",
                "branch-rate": f"{coverage.branch_rate:.4f}",
            },
        )
        lines_element = ET.SubElement(class_element, "lines")
        for number in sorted(set(coverage.lines) | set(coverage.branches)):
            attributes = {"number": str(number), "hits": str(coverage.lines.get(number, 0))}
            branch = coverage.branches.get(number)
            if branch is not None:
                covered, valid = branch
                attributes["branch"] = "true"
                attributes["condition-coverage"] = (
                    f"{covered / valid * 100:.0f}% ({covered}/{valid})"
                )
            ET.SubElement(lines_element, "line", attributes)

    path.parent.mkdir(parents=True, exist_ok=True)
    ET.ElementTree(root).write(path, encoding="utf-8", xml_declaration=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--results-dir",
        action="append",
        required=True,
        type=Path,
        help="Directory to search for coverage.cobertura.xml (repeatable).",
    )
    parser.add_argument("--min-line", type=float, required=True, help="Line floor in percent.")
    parser.add_argument("--min-branch", type=float, required=True, help="Branch floor in percent.")
    parser.add_argument("--merged", type=Path, help="Write the merged report here.")
    parser.add_argument("--summary", type=Path, help="Write a Markdown summary here.")
    arguments = parser.parse_args(argv)

    reports = sorted(
        {
            path
            for directory in arguments.results_dir
            for path in directory.rglob("coverage.cobertura.xml")
        }
    )
    if not reports:
        print("No coverage.cobertura.xml found; coverlet produced no report.", file=sys.stderr)
        return 1

    per_report = [(path, totals(parse_report(path))) for path in reports]
    merged_classes = merge_reports([path for path, _ in per_report])
    merged = totals(merged_classes)

    summary: list[str] = ["## Coverage", ""]
    summary.append("| Report | Line | Branch |")
    summary.append("|---|---|---|")
    for path, report_totals in per_report:
        location = path.parent.name
        summary.append(
            f"| `{location}` | {percent(report_totals.line_rate)} "
            f"({report_totals.line_covered}/{report_totals.line_valid}) "
            f"| {percent(report_totals.branch_rate)} "
            f"({report_totals.branch_covered}/{report_totals.branch_valid}) |"
        )
    summary.append(
        f"| **Merged (instrumented solution)** | **{percent(merged.line_rate)}** "
        f"**({merged.line_covered}/{merged.line_valid})** "
        f"| **{percent(merged.branch_rate)}** "
        f"**({merged.branch_covered}/{merged.branch_valid})** |"
    )
    summary.append("")
    summary.append(
        f"Floor: line >= {arguments.min_line:.2f}% and branch >= {arguments.min_branch:.2f}%."
    )
    summary.append("")

    rendered = "\n".join(summary)
    print(rendered)
    if arguments.summary is not None:
        arguments.summary.parent.mkdir(parents=True, exist_ok=True)
        arguments.summary.write_text(rendered, encoding="utf-8")
    if arguments.merged is not None:
        write_merged_report(merged_classes, arguments.merged)

    failures: list[str] = []
    if round(merged.line_rate * 100, 2) < arguments.min_line:
        failures.append(
            f"line coverage {percent(merged.line_rate)} is below the "
            f"{arguments.min_line:.2f}% floor"
        )
    if round(merged.branch_rate * 100, 2) < arguments.min_branch:
        failures.append(
            f"branch coverage {percent(merged.branch_rate)} is below the "
            f"{arguments.min_branch:.2f}% floor"
        )
    for failure in failures:
        print(f"::error title=Coverage gate::{failure}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
