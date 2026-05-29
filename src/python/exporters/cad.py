"""CadQuery-based CAD exporter for geometry JSON documents."""

from dataclasses import dataclass, field
import json
from pathlib import Path

from data.schema import normalize_geometry_document, stable_id
from utils.polygon import classify_polygon_loops


try:
    import cadquery as cq
except ImportError:  # pragma: no cover - depends on optional CAD runtime.
    cq = None


class CadExportError(Exception):
    """Raised when geometry cannot be converted to CAD."""


@dataclass
class CadExportOptions:
    """Options for CAD export."""

    formats: tuple = ("step", "glb")
    write_manifest: bool = True
    include_feature_placeholders: bool = True
    volume_tolerance: float = 1e-6


@dataclass
class CadBody:
    """A CAD body generated from one or more source JSON bodies."""

    id: str
    source_ids: list
    container_id: str
    container_key: str
    material: str
    shape: object


@dataclass
class CadExportResult:
    """Paths and manifest produced by an export run."""

    output_paths: dict
    manifest: dict
    bodies: list = field(default_factory=list)


class CadQueryConverter:
    """Convert geometry JSON documents to CAD files through CadQuery."""

    def __init__(self, options=None):
        self.options = options or CadExportOptions()
        if cq is None:
            raise CadExportError(
                "cadquery is required for CAD export. Install cadquery in "
                "the Python environment used by this backend."
            )

    def export(self, payload, output_base):
        """Export a geometry document to the configured CAD formats."""
        document = normalize_geometry_document(payload)
        root = document["root"]
        bodies = self._convert_container(root)
        assembly = self._build_assembly(root, bodies)

        output_paths = {}
        output_base = Path(output_base)
        for export_format in self.options.formats:
            normalized_format = export_format.lower()
            path = output_base.with_suffix(f".{normalized_format}")
            self._export_assembly(assembly, path, normalized_format, document)
            output_paths[normalized_format] = str(path)

        manifest = self._build_manifest(document, bodies)
        if self.options.write_manifest:
            manifest_path = output_base.with_suffix(".manifest.json")
            manifest_path.write_text(
                json.dumps(manifest, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            output_paths["manifest"] = str(manifest_path)

        return CadExportResult(output_paths, manifest, bodies)

    def _convert_container(self, container):
        direct_bodies = [
            self._body_to_cad(container, body)
            for body in container.get("bodies", [])
        ]
        direct_bodies = self._resolve_sibling_bodies(
            container,
            direct_bodies,
        )

        descendant_bodies = []
        for child in container.get("children", []):
            descendant_bodies.extend(self._convert_container(child))

        cut_tool = self._union_shapes([body.shape for body in descendant_bodies])
        if cut_tool is not None:
            for body in direct_bodies:
                if self._has_overlap(body.shape, cut_tool):
                    body.shape = body.shape.cut(cut_tool)

        return direct_bodies + descendant_bodies

    def _body_to_cad(self, container, body):
        return CadBody(
            id=body["id"],
            source_ids=[body["id"]],
            container_id=container["id"],
            container_key=container.get("key", ""),
            material=body["material"],
            shape=self._geometry_to_shape(body["geometry"]),
        )

    def _resolve_sibling_bodies(self, container, bodies):
        if len(bodies) <= 1:
            return bodies

        self._raise_on_cross_material_overlap(bodies)
        components = self._same_material_overlap_components(bodies)
        resolved = []

        for component in components:
            if len(component) == 1:
                resolved.append(component[0])
                continue

            material = component[0].material
            source_ids = [
                source_id
                for body in component
                for source_id in body.source_ids
            ]
            fused_shape = self._union_shapes([body.shape for body in component])
            resolved.append(
                CadBody(
                    id=stable_id(
                        "body-union",
                        [container["id"], material],
                        {"sourceIds": source_ids},
                    ),
                    source_ids=source_ids,
                    container_id=container["id"],
                    container_key=container.get("key", ""),
                    material=material,
                    shape=fused_shape,
                )
            )

        return resolved

    def _raise_on_cross_material_overlap(self, bodies):
        for left_index, left in enumerate(bodies):
            for right in bodies[left_index + 1:]:
                if left.material == right.material:
                    continue
                if self._has_overlap(left.shape, right.shape):
                    raise CadExportError(
                        "Overlapping sibling bodies with different materials: "
                        f"{left.id} ({left.material}) and "
                        f"{right.id} ({right.material})"
                    )

    def _same_material_overlap_components(self, bodies):
        remaining = list(bodies)
        components = []

        while remaining:
            seed = remaining.pop(0)
            component = [seed]
            changed = True
            while changed:
                changed = False
                for candidate in list(remaining):
                    if candidate.material != seed.material:
                        continue
                    if any(
                        self._has_overlap(candidate.shape, body.shape)
                        for body in component
                    ):
                        remaining.remove(candidate)
                        component.append(candidate)
                        changed = True
            components.append(component)

        return components

    def _geometry_to_shape(self, geometry):
        if {"bottom_left", "top_right", "thk"} <= geometry.keys():
            return self._box_to_shape(geometry)
        if "polys" in geometry and "thk" in geometry:
            return self._polygons_to_shape(geometry)
        if (
            {"center", "bottom_radius", "thk"} <= geometry.keys()
            and "top_radius" not in geometry
        ):
            return self._cylinder_to_shape(geometry)
        if {"center", "bottom_radius", "top_radius", "thk"} <= geometry.keys():
            return self._cone_to_shape(geometry)
        raise CadExportError(f"Unknown geometry payload: {geometry}")

    def _box_to_shape(self, geometry):
        bottom_left = geometry["bottom_left"]
        top_right = geometry["top_right"]
        width = top_right[0] - bottom_left[0]
        depth = top_right[1] - bottom_left[1]
        height = geometry["thk"]
        solid = cq.Solid.makeBox(
            width,
            depth,
            height,
            cq.Vector(bottom_left[0], bottom_left[1], bottom_left[2]),
        )
        return cq.Workplane(obj=solid)

    def _cylinder_to_shape(self, geometry):
        center = geometry["center"]
        solid = cq.Solid.makeCylinder(
            geometry["bottom_radius"],
            geometry["thk"],
            cq.Vector(center[0], center[1], center[2]),
            cq.Vector(0, 0, 1),
        )
        return cq.Workplane(obj=solid)

    def _cone_to_shape(self, geometry):
        center = geometry["center"]
        solid = cq.Solid.makeCone(
            geometry["bottom_radius"],
            geometry["top_radius"],
            geometry["thk"],
            cq.Vector(center[0], center[1], center[2]),
            cq.Vector(0, 0, 1),
        )
        return cq.Workplane(obj=solid)

    def _polygons_to_shape(self, geometry):
        regions = classify_polygon_loops(geometry["polys"])
        shapes = []
        for region in regions:
            workplane = cq.Workplane("XY")
            workplane = self._add_loop_to_workplane(workplane, region.outer)
            for hole in region.holes:
                workplane = self._add_loop_to_workplane(workplane, hole)

            shape = workplane.extrude(geometry["thk"]).translate(
                (0, 0, region.z)
            )
            shapes.append(shape)

        return self._union_shapes(shapes)

    def _add_loop_to_workplane(self, workplane, loop):
        points = [(point[0], point[1]) for point in loop]
        return workplane.polyline(points).close()

    def _build_assembly(self, root, bodies):
        assembly = cq.Assembly(name=root.get("key", "geometry-root"))
        for body in bodies:
            if (
                self._is_empty_shape(body.shape)
                or self._shape_volume(body.shape) <= self.options.volume_tolerance
            ):
                continue
            assembly.add(
                body.shape,
                name=body.id,
                color=self._material_color(body.material),
            )
        return assembly

    def _export_assembly(self, assembly, path, export_format, document):
        unit = self._cadquery_unit(document["unitSystem"])
        if export_format in {"step", "stp"}:
            assembly.export(str(path), "STEP", unit=unit)
            return
        if export_format in {"glb", "gltf"}:
            assembly.export(str(path))
            return
        if export_format == "stl":
            assembly.export(str(path), "STL")
            return
        raise CadExportError(f"Unsupported CAD export format: {export_format}")

    def _build_manifest(self, document, bodies):
        manifest = {
            "schemaVersion": document["schemaVersion"],
            "unitSystem": document["unitSystem"],
            "rootId": document["root"]["id"],
            "bodies": [
                {
                    "id": body.id,
                    "sourceIds": body.source_ids,
                    "containerId": body.container_id,
                    "containerKey": body.container_key,
                    "material": body.material,
                }
                for body in bodies
            ],
            "features": [],
        }

        if self.options.include_feature_placeholders:
            self._append_feature_placeholders(document["root"], manifest)

        return manifest

    def _append_feature_placeholders(self, container, manifest):
        for feature_type in ("vias", "circuits", "bumps"):
            for feature in container.get(feature_type, []):
                manifest["features"].append(
                    {
                        "id": feature["id"],
                        "containerId": container["id"],
                        "containerKey": container.get("key", ""),
                        "featureType": feature_type[:-1],
                        "material": feature.get("material"),
                        "density": feature.get("density"),
                        "conversion": "placeholder",
                    }
                )

        for child in container.get("children", []):
            self._append_feature_placeholders(child, manifest)

    def _union_shapes(self, shapes):
        shapes = [shape for shape in shapes if shape is not None]
        if len(shapes) == 0:
            return None

        result = shapes[0]
        for shape in shapes[1:]:
            result = result.union(shape)
        return result

    def _has_overlap(self, left, right):
        if not self._bounding_boxes_overlap(left, right):
            return False
        common = left.intersect(right)
        return self._shape_volume(common) > self.options.volume_tolerance

    def _bounding_boxes_overlap(self, left, right):
        left_box = left.val().BoundingBox()
        right_box = right.val().BoundingBox()
        return (
            left_box.xmin <= right_box.xmax
            and right_box.xmin <= left_box.xmax
            and left_box.ymin <= right_box.ymax
            and right_box.ymin <= left_box.ymax
            and left_box.zmin <= right_box.zmax
            and right_box.zmin <= left_box.zmax
        )

    def _shape_volume(self, shape):
        if self._is_empty_shape(shape):
            return 0
        return shape.val().Volume()

    def _is_empty_shape(self, shape):
        try:
            shape.val()
        except (ValueError, IndexError):
            return True
        return False

    def _material_color(self, material):
        digest = sum(ord(char) for char in material)
        red = ((digest * 37) % 200 + 35) / 255
        green = ((digest * 67) % 200 + 35) / 255
        blue = ((digest * 97) % 200 + 35) / 255
        return cq.Color(red, green, blue)

    def _cadquery_unit(self, unit_system):
        units = {
            "um": "UM",
            "mm": "MM",
            "cm": "CM",
            "m": "M",
            "inch": "INCH",
        }
        return units.get(unit_system.lower(), unit_system.upper())


def export_cad(payload, output_base, options=None):
    """Convenience wrapper for exporting a geometry document."""
    return CadQueryConverter(options).export(payload, output_base)
