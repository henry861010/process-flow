"""Tests for geometry schema normalization and polygon validation."""

import unittest

from data.container import Container
from data.geometry import PolygonGeometry
from utils.polygon import classify_polygon_loops


class GeometrySchemaTest(unittest.TestCase):
    def test_container_json_has_schema_unit_and_stable_ids(self):
        root = Container(key="package-root")
        root.add_body_box("mold", [0, 0, 0], [10, 10, 0], 1)

        child = Container(key="die")
        child.add_body_box("silicon", [2, 2, 0.2], [8, 8, 0.2], 0.2)
        root.add_child(child)

        first = root.json()
        second = root.json()

        self.assertEqual(first["schemaVersion"], "1.0.0")
        self.assertEqual(first["unitSystem"], "um")
        self.assertEqual(first, second)
        self.assertIn("id", first["root"])
        self.assertIn("id", first["root"]["bodies"][0])
        self.assertIn("id", first["root"]["children"][0]["bodies"][0])

    def test_polygon_geometry_rejects_self_intersection(self):
        with self.assertRaisesRegex(ValueError, "self-intersects"):
            PolygonGeometry(
                [[[0, 0, 0], [2, 2, 0], [0, 2, 0], [2, 0, 0]]],
                1,
            )

    def test_polygon_loop_odd_even_classification(self):
        regions = classify_polygon_loops(
            [
                [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]],
                [[2, 2, 0], [8, 2, 0], [8, 8, 0], [2, 8, 0]],
                [[3, 3, 0], [4, 3, 0], [4, 4, 0], [3, 4, 0]],
            ]
        )

        self.assertEqual(len(regions), 2)
        self.assertEqual([len(region.holes) for region in regions], [1, 0])


if __name__ == "__main__":
    unittest.main()
