"""Build an example process status and emit geometry JSON."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


ROOT_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from data.body import Body
from data.bump import Bump
from data.circuit import Circuit
from data.container import Container
from data.geometry import BoxGeometry
from data.vias import Vias
from process.status import Status


def create_logic_die() -> Container:
    """Create a small die container to place into the process status."""
    die = Container(key="logic-die")
    die.add_bump(
        Bump(
            BoxGeometry([-700.0, -700.0, 0.0], [700.0, 700.0, 0.0], 40.0),
            density=0.18,
            material="SnAg",
        )
    )
    die.add_body_box(
        "Si die",
        [-800.0, -800.0, 40.0],
        [800.0, 800.0, 40.0],
        200.0,
    )
    die.add_circuit(
        Circuit(
            BoxGeometry(
                [-750.0, -750.0, 240.0],
                [750.0, 750.0, 240.0],
                10.0,
            ),
            density=0.35,
            material="Cu",
        )
    )
    return die


def build_example_status() -> Status:
    """Use process.status.Status to build a simple package stack."""
    status = Status()

    base_body = Body(
        BoxGeometry([-2500.0, -2500.0, 0.0], [2500.0, 2500.0, 0.0], 100.0),
        material="footprint-template",
    )
    status.initial_body(base_body)

    status.fill("BT substrate", 300.0)
    status.container().add_via(
        Vias(
            BoxGeometry([-2200.0, -2200.0, 0.0], [2200.0, 2200.0, 0.0], 300.0),
            density=0.08,
            material="Cu",
        )
    )

    status.fill("RDL dielectric", 360.0)
    status.container().add_circuit(
        Circuit(
            BoxGeometry(
                [-2300.0, -2300.0, 300.0],
                [2300.0, 2300.0, 300.0],
                60.0,
            ),
            density=0.25,
            material="Cu",
        )
    )

    status.add_containers([create_logic_die()])
    status.fill("epoxy mold", 700.0)

    return status


def build_example_json() -> dict[str, Any]:
    """Return the JSON-serializable example payload."""
    return build_example_status().container().json()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate example geometry JSON from process.status.Status."
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Optional file path to write the generated JSON.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payload = build_example_json()
    json_text = json.dumps(payload, ensure_ascii=False, indent=2)

    if args.output is not None:
        args.output.write_text(json_text + "\n", encoding="utf-8")

    print(json_text)


if __name__ == "__main__":
    main()
