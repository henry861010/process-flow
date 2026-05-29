"""Generate example geometry JSON and export it through the CAD converter."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"
SCRIPT_DIR = ROOT_DIR / "script"

for import_dir in (SRC_DIR, SCRIPT_DIR):
    if str(import_dir) not in sys.path:
        sys.path.insert(0, str(import_dir))

from exporters.cad import CadExportError, export_cad
from generate_json import build_example_json


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Build the example geometry document and export STEP/GLB files "
            "when cadquery is available."
        )
    )
    parser.add_argument(
        "-o",
        "--output-base",
        type=Path,
        default=ROOT_DIR / "script" / "example_package",
        help=(
            "Output base path without extension. The exporter writes files "
            "such as .step, .glb, and .manifest.json."
        ),
    )
    parser.add_argument(
        "--json-only",
        action="store_true",
        help="Only print the generated schema JSON without exporting CAD.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payload = build_example_json()

    print(json.dumps(payload, ensure_ascii=False, indent=2))

    if args.json_only:
        return

    try:
        result = export_cad(payload, args.output_base)
    except CadExportError as exc:
        print(
            "\nCAD export skipped: "
            f"{exc}\n"
            "Install cadquery in this Python environment to write STEP/GLB.",
            file=sys.stderr,
        )
        return

    print("\nCAD export outputs:")
    for export_format, path in result.output_paths.items():
        print(f"- {export_format}: {path}")


if __name__ == "__main__":
    main()
