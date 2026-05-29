"""Container tree for grouping package geometry in global coordinates."""

from __future__ import annotations

from data.body import Body
from data.bump import Bump
from data.circuit import Circuit
from data.geometry import (
    BoxGeometry,
    ConeGeometry,
    CylinderGeometry,
    PolygonGeometry,
)
from data.schema import (
    DEFAULT_UNIT_SYSTEM,
    GEOMETRY_SCHEMA_VERSION,
    normalize_geometry_document,
)
from data.vias import Vias


class Container:
    """Group bodies and density-based features under one semantic node.

    The current PoC uses global coordinates for every feature. Parent and
    child containers are semantic groupings only; they do not introduce local
    transforms.
    """

    def __init__(self, parent: Container = None, key: str = ""):
        """Initialize an empty geometry container.

        Args:
            parent: Optional parent container in the semantic tree.
            key: Human-readable identifier for debugging or UI use.

        Returns:
            None.
        """
        self._key = key
        self._bodies = []
        self._vias = []
        self._circuits = []
        self._bumps = []
        self._parent = parent
        self._children = []

    def key(self):
        """Return this container's human-readable key.

        Args:
            None.

        Returns:
            The key string assigned to this container.
        """
        return self._key

    def parent(self):
        """Return this container's parent.

        Args:
            None.

        Returns:
            The parent ``Container`` object, or None when this is a root.
        """
        return self._parent

    def set_parent(self, parent: Container):
        """Assign a parent container.

        Args:
            parent: Parent container to attach to this container.

        Returns:
            None.
        """
        self._parent = parent

    def children(self):
        """Return child containers.

        Args:
            None.

        Returns:
            A tuple of child ``Container`` objects.
        """
        return tuple(self._children)

    def bodies(self):
        """Return direct solid bodies.

        Args:
            None.

        Returns:
            A tuple of direct ``Body`` objects.
        """
        return tuple(self._bodies)

    def vias(self):
        """Return direct via feature regions.

        Args:
            None.

        Returns:
            A tuple of direct ``Vias`` objects.
        """
        return tuple(self._vias)

    def circuits(self):
        """Return direct circuit feature regions.

        Args:
            None.

        Returns:
            A tuple of direct ``Circuit`` objects.
        """
        return tuple(self._circuits)

    def bumps(self):
        """Return direct bump feature regions.

        Args:
            None.

        Returns:
            A tuple of direct ``Bump`` objects.
        """
        return tuple(self._bumps)

    def add_body(self, body: Body):
        """Add a direct solid body to this container.

        Args:
            body: Body object to append to this container.

        Returns:
            The same body object that was added.
        """
        self._bodies.append(body)
        return body

    def add_via(self, via: Vias):
        """Add a direct via feature region to this container.

        Args:
            via: Via feature region to append to this container.

        Returns:
            The same via object that was added.
        """
        self._vias.append(via)
        return via

    def add_circuit(self, circuit: Circuit):
        """Add a direct circuit feature region to this container.

        Args:
            circuit: Circuit feature region to append to this container.

        Returns:
            The same circuit object that was added.
        """
        self._circuits.append(circuit)
        return circuit

    def add_bump(self, bump: Bump):
        """Add a direct bump feature region to this container.

        Args:
            bump: Bump feature region to append to this container.

        Returns:
            The same bump object that was added.
        """
        self._bumps.append(bump)
        return bump

    def add_body_box(self, material: str, node1, node2, thk):
        """Create and add a box body.

        Args:
            material: Material name or identifier for the new body.
            node1: Bottom-left footprint point of the box.
            node2: Top-right footprint point of the box.
            thk: Thickness of the box along the z axis.

        Returns:
            The newly created ``Body`` object.
        """
        geometry = BoxGeometry(node1, node2, thk)
        return self.add_body(Body(geometry, material))

    def add_body_polygon(self, material: str, polys, thk):
        """Create and add a polygon body.

        Args:
            material: Material name or identifier for the new body.
            polys: Polygon point lists for the body footprint.
            thk: Thickness of the polygon extrusion along the z axis.

        Returns:
            The newly created ``Body`` object.
        """
        geometry = PolygonGeometry(polys, thk)
        return self.add_body(Body(geometry, material))

    def add_body_cylinder(self, material: str, center, bottom_radius, thk):
        """Create and add a cylinder body.

        Args:
            material: Material name or identifier for the new body.
            center: Bottom center point of the cylinder.
            bottom_radius: Radius of the cylinder footprint.
            thk: Thickness of the cylinder along the z axis.

        Returns:
            The newly created ``Body`` object.
        """
        geometry = CylinderGeometry(center, bottom_radius, thk)
        return self.add_body(Body(geometry, material))

    def add_body_cone(
        self,
        material: str,
        center,
        bottom_radius,
        top_radius,
        thk,
    ):
        """Create and add a cone or frustum body.

        Args:
            material: Material name or identifier for the new body.
            center: Bottom center point of the cone or frustum.
            bottom_radius: Radius at the bottom face.
            top_radius: Radius at the top face.
            thk: Thickness of the cone or frustum along the z axis.

        Returns:
            The newly created ``Body`` object.
        """
        geometry = ConeGeometry(center, bottom_radius, top_radius, thk)
        return self.add_body(Body(geometry, material))

    def add_child(self, child: Container):
        """Attach a child container to this container.

        Args:
            child: Container to attach as a semantic child.

        Returns:
            The same child container that was attached.
        """
        child.set_parent(self)
        self._children.append(child)
        return child

    def thk(self):
        """Return the total z-span of this container and its children.

        Args:
            None.

        Returns:
            Difference between ``z_max`` and ``z_min``.
        """
        return self.z_max() - self.z_min()

    def z_max(self):
        """Return the maximum z coordinate in this container tree.

        Args:
            None.

        Returns:
            Highest z coordinate across direct features and child containers.
        """
        values = [feature.z_max() for feature in self._direct_features()]
        values.extend(child.z_max() for child in self._children)
        if len(values) == 0:
            return 0
        return max(values)

    def z_min(self):
        """Return the minimum z coordinate in this container tree.

        Args:
            None.

        Returns:
            Lowest z coordinate across direct features and child containers.
        """
        values = [feature.z_min() for feature in self._direct_features()]
        values.extend(child.z_min() for child in self._children)
        if len(values) == 0:
            return 0
        return min(values)

    def copy(self):
        """Create a deep copy of this container tree.

        Args:
            None.

        Returns:
            A copied ``Container`` with copied direct features and children.
        """
        copy_container = Container(key=self.key())

        for body in self._bodies:
            copy_container.add_body(body.copy())

        for via in self._vias:
            copy_container.add_via(via.copy())

        for circuit in self._circuits:
            copy_container.add_circuit(circuit.copy())

        for bump in self._bumps:
            copy_container.add_bump(bump.copy())

        for child in self._children:
            copy_container.add_child(child.copy())

        return copy_container

    def move(self, x=0, y=0, z=0):
        """Translate this container tree in global coordinates.

        Args:
            x: Translation distance along the x axis.
            y: Translation distance along the y axis.
            z: Translation distance along the z axis.

        Returns:
            None.
        """
        for feature in self._direct_features():
            feature.move(x, y, z)

        for child in self._children:
            child.move(x, y, z)

    def grind_to(self, to_z):
        """Grind this container tree down to a target top z coordinate.

        Args:
            to_z: Target maximum z coordinate after grinding.

        Returns:
            True when any geometry remains after grinding, otherwise False.
        """
        self._vias = self._features_after_clip(self._vias, to_z)
        self._circuits = self._features_after_clip(self._circuits, to_z)
        self._bumps = self._features_after_clip(self._bumps, to_z)
        self._bodies = self._features_after_clip(self._bodies, to_z)

        children = []
        for child in self._children:
            if child.grind_to(to_z):
                children.append(child)
        self._children = children

        return self.has_geometry()

    def flip(self, around_z=0):
        """Mirror this container tree across a horizontal z plane.

        Args:
            around_z: Z coordinate of the mirror plane.

        Returns:
            None.
        """
        for feature in self._direct_features():
            feature.flip(around_z)

        for child in self._children:
            child.flip(around_z)

    def has_geometry(self):
        """Return whether this container tree still contains geometry.

        Args:
            None.

        Returns:
            True when direct features or child geometry exist.
        """
        return (
            len(self._bodies) > 0
            or len(self._vias) > 0
            or len(self._circuits) > 0
            or len(self._bumps) > 0
            or any(child.has_geometry() for child in self._children)
        )

    def _direct_features(self):
        """Return all direct geometry-like features in this container.

        Args:
            None.

        Returns:
            A list containing bodies, vias, circuits, and bumps.
        """
        return self._bodies + self._vias + self._circuits + self._bumps

    def _features_after_clip(self, features, to_z):
        """Clip a feature list and drop features that disappear.

        Args:
            features: Iterable of geometry-like features to clip.
            to_z: Target maximum z coordinate after clipping.

        Returns:
            A list containing only features that remain after clipping.
        """
        clipped_features = []
        for feature in features:
            if feature.clip_top_to(to_z):
                clipped_features.append(feature)
        return clipped_features

    def tree_json(self):
        """Return this container tree without the document wrapper.

        Returns:
            A dictionary with ``key`` plus serialized direct features and
            children.
        """
        return {
            "key": self._key,
            "bodies": [body.json() for body in self._bodies],
            "vias": [via.json() for via in self._vias],
            "circuits": [circuit.json() for circuit in self._circuits],
            "bumps": [bump.json() for bump in self._bumps],
            "children": [child.tree_json() for child in self._children],
        }

    def json(
        self,
        schema_version=GEOMETRY_SCHEMA_VERSION,
        unit_system=DEFAULT_UNIT_SYSTEM,
    ):
        """Return this container tree as a schema-wrapped document.

        Returns:
            A dictionary containing ``schemaVersion``, ``unitSystem``, and the
            root container tree with deterministic ids.
        """
        return normalize_geometry_document(
            self.tree_json(),
            schema_version=schema_version,
            unit_system=unit_system,
        )
