"""Geometry primitives for simplified 2.5D package modeling."""

from abc import ABC, abstractmethod
import copy

from utils.math import math
from utils.polygon import validate_polygon_loops


class Geometry(ABC):
    """Define the shared API for all geometry primitives."""

    @abstractmethod
    def z_min(self):
        """Return the minimum z coordinate occupied by this geometry.

        Args:
            None.

        Returns:
            The bottom z coordinate of the geometry.
        """
        pass

    @abstractmethod
    def z_max(self):
        """Return the maximum z coordinate occupied by this geometry.

        Args:
            None.

        Returns:
            The top z coordinate of the geometry.
        """
        pass

    @abstractmethod
    def thk(self):
        """Return the geometry thickness along the z axis.

        Args:
            None.

        Returns:
            The z-direction thickness of the geometry.
        """
        pass

    @abstractmethod
    def copy(self):
        """Create a deep copy of this geometry.

        Args:
            None.

        Returns:
            A new geometry object with the same coordinates and thickness.
        """
        pass

    @abstractmethod
    def copy_with_thk(self, thk):
        """Create a copy of this geometry with a different thickness.

        Args:
            thk: Thickness to apply to the copied geometry.

        Returns:
            A new geometry object with the same footprint and new thickness.
        """
        pass

    @abstractmethod
    def move(self, x=0, y=0, z=0):
        """Translate this geometry in global coordinates.

        Args:
            x: Translation distance along the x axis.
            y: Translation distance along the y axis.
            z: Translation distance along the z axis.

        Returns:
            None.
        """
        pass

    @abstractmethod
    def clip_top_to(self, to_z):
        """Clip this geometry so its top does not exceed ``to_z``.

        Args:
            to_z: Target top z coordinate after clipping.

        Returns:
            True when the geometry still has positive thickness after clipping.
        """
        pass

    @abstractmethod
    def flip(self, around_z=0):
        """Mirror this geometry across a horizontal z plane.

        Args:
            around_z: Z coordinate of the mirror plane.

        Returns:
            None.
        """
        pass
    
    @abstractmethod
    def json(self):
        """Return a JSON-serializable dictionary for this geometry.

        Returns:
            A dictionary containing only built-in containers and scalar values.
        """
        pass


class BoxGeometry(Geometry):
    """Represent an extruded rectangular box footprint."""

    def __init__(self, bottom_left, top_right, thk):
        """Initialize a box geometry.

        Args:
            bottom_left: Bottom-left point of the box footprint.
            top_right: Top-right point of the box footprint.
            thk: Thickness of the box along the z axis.

        Returns:
            None.
        """
        if bottom_left[2] != top_right[2]:
            raise ValueError(
                "BoxGeometry bottom_left and top_right must be on the same "
                "xy plane."
            )

        self._bottom_left = copy.deepcopy(bottom_left)
        self._top_right = copy.deepcopy(top_right)
        self._thk = thk

    def bottom_left(self):
        """Return a copy of the bottom-left footprint point.

        Args:
            None.

        Returns:
            A copied ``[x, y, z]`` coordinate list.
        """
        return copy.deepcopy(self._bottom_left)

    def top_right(self):
        """Return a copy of the top-right footprint point.

        Args:
            None.

        Returns:
            A copied ``[x, y, z]`` coordinate list.
        """
        return copy.deepcopy(self._top_right)

    def z_min(self):
        """Return the bottom z coordinate of the box.

        Args:
            None.

        Returns:
            The lower z coordinate of the box footprint.
        """
        return min(self._bottom_left[2], self._top_right[2])

    def z_max(self):
        """Return the top z coordinate of the box.

        Args:
            None.

        Returns:
            The lower z coordinate plus thickness.
        """
        return self.z_min() + self._thk

    def thk(self):
        """Return the box thickness.

        Args:
            None.

        Returns:
            The z-direction thickness of the box.
        """
        return self._thk

    def copy(self):
        """Create a deep copy of this box.

        Args:
            None.

        Returns:
            A new ``BoxGeometry`` with the same coordinates and thickness.
        """
        return BoxGeometry(self._bottom_left, self._top_right, self._thk)

    def copy_with_thk(self, thk):
        """Create a deep copy of this box with a different thickness.

        Args:
            thk: Thickness to apply to the copied box.

        Returns:
            A new ``BoxGeometry`` with the same footprint and new thickness.
        """
        return BoxGeometry(self._bottom_left, self._top_right, thk)

    def move(self, x=0, y=0, z=0):
        """Translate this box in global coordinates.

        Args:
            x: Translation distance along the x axis.
            y: Translation distance along the y axis.
            z: Translation distance along the z axis.

        Returns:
            None.
        """
        self._bottom_left[0] += x
        self._top_right[0] += x
        self._bottom_left[1] += y
        self._top_right[1] += y
        self._bottom_left[2] += z
        self._top_right[2] += z

    def clip_top_to(self, to_z):
        """Clip the box so its top does not exceed ``to_z``.

        Args:
            to_z: Target top z coordinate after clipping.

        Returns:
            True when the box remains after clipping, otherwise False.
        """
        z_bottom = self.z_min()
        z_top = z_bottom + self._thk

        if math.f_le(to_z, z_bottom):
            return False
        if math.f_lt(z_bottom, to_z) and math.f_lt(to_z, z_top):
            self._thk = to_z - z_bottom

        return True

    def flip(self, around_z=0):
        """Mirror this box across a horizontal z plane.

        Args:
            around_z: Z coordinate of the mirror plane.

        Returns:
            None.
        """
        flipped_z = 2 * around_z - self.z_max()
        self._bottom_left[2] = flipped_z
        self._top_right[2] = flipped_z
        
    def json(self):
        """Return this box as a JSON-serializable dictionary.

        Returns:
            A dictionary with ``bottom_left``, ``top_right``, and ``thk``.
            Coordinate lists are copied so callers cannot mutate this object
            through the returned value.
        """
        return {
            "bottom_left": copy.deepcopy(self._bottom_left),
            "top_right": copy.deepcopy(self._top_right),
            "thk": self._thk
        }


class PolygonGeometry(Geometry):
    """Represent one or more extruded polygon footprints."""

    def __init__(self, polys, thk):
        """Initialize a polygon geometry.

        Args:
            polys: Polygon point lists, where each point is ``[x, y, z]``.
            thk: Thickness of the polygon extrusion along the z axis.

        Returns:
            None.
        """
        validate_polygon_loops(polys)
        self._polys = copy.deepcopy(polys)
        self._thk = thk

    def polygons(self):
        """Return a deep copy of the polygon footprint data.

        Args:
            None.

        Returns:
            Copied polygon point lists.
        """
        return copy.deepcopy(self._polys)

    def z_min(self):
        """Return the bottom z coordinate of the polygon extrusion.

        Args:
            None.

        Returns:
            The z coordinate of the first polygon node.
        """
        return self._polys[0][0][2]

    def z_max(self):
        """Return the top z coordinate of the polygon extrusion.

        Args:
            None.

        Returns:
            The lower z coordinate plus thickness.
        """
        return self.z_min() + self._thk

    def thk(self):
        """Return the polygon extrusion thickness.

        Args:
            None.

        Returns:
            The z-direction thickness of the polygon extrusion.
        """
        return self._thk

    def copy(self):
        """Create a deep copy of this polygon geometry.

        Args:
            None.

        Returns:
            A new ``PolygonGeometry`` with the same polygons and thickness.
        """
        return PolygonGeometry(self._polys, self._thk)

    def copy_with_thk(self, thk):
        """Create a deep copy of this polygon with a new thickness.

        Args:
            thk: Thickness to apply to the copied polygon extrusion.

        Returns:
            A new ``PolygonGeometry`` with the same footprint and new
            thickness.
        """
        return PolygonGeometry(self._polys, thk)

    def move(self, x=0, y=0, z=0):
        """Translate this polygon geometry in global coordinates.

        Args:
            x: Translation distance along the x axis.
            y: Translation distance along the y axis.
            z: Translation distance along the z axis.

        Returns:
            None.
        """
        for poly in self._polys:
            for node in poly:
                node[0] += x
                node[1] += y
                node[2] += z

    def clip_top_to(self, to_z):
        """Clip the polygon extrusion top to ``to_z``.

        Args:
            to_z: Target top z coordinate after clipping.

        Returns:
            True when the geometry remains after clipping, otherwise False.
        """
        z_bottom = self.z_min()
        z_top = z_bottom + self._thk

        if math.f_le(to_z, z_bottom):
            return False
        if math.f_lt(z_bottom, to_z) and math.f_lt(to_z, z_top):
            self._thk = to_z - z_bottom

        return True

    def flip(self, around_z=0):
        """Mirror this polygon extrusion across a horizontal z plane.

        Args:
            around_z: Z coordinate of the mirror plane.

        Returns:
            None.
        """
        flipped_z = 2 * around_z - self.z_max()
        for poly in self._polys:
            for node in poly:
                node[2] = flipped_z

    def json(self):
        """Return this polygon extrusion as a JSON-serializable dictionary.

        Returns:
            A dictionary with ``polys`` and ``thk``. Polygon point lists are
            copied so callers cannot mutate this object through the returned
            value.
        """
        return {
            "polys": copy.deepcopy(self._polys),
            "thk": self._thk
        }


class CylinderGeometry(Geometry):
    """Represent an extruded circular cylinder."""

    def __init__(self, center, bottom_radius, thk):
        """Initialize a cylinder geometry.

        Args:
            center: Bottom center point of the cylinder as ``[x, y, z]``.
            bottom_radius: Radius of the cylinder footprint.
            thk: Thickness of the cylinder along the z axis.

        Returns:
            None.
        """
        self._center = copy.deepcopy(center)
        self._bottom_radius = bottom_radius
        self._thk = thk

    def center(self):
        """Return a copy of the cylinder bottom center point.

        Args:
            None.

        Returns:
            A copied ``[x, y, z]`` coordinate list.
        """
        return copy.deepcopy(self._center)

    def bottom_radius(self):
        """Return the cylinder footprint radius.

        Args:
            None.

        Returns:
            The cylinder bottom radius.
        """
        return self._bottom_radius

    def z_min(self):
        """Return the bottom z coordinate of the cylinder.

        Args:
            None.

        Returns:
            The z coordinate of the cylinder bottom center point.
        """
        return self._center[2]

    def z_max(self):
        """Return the top z coordinate of the cylinder.

        Args:
            None.

        Returns:
            The lower z coordinate plus thickness.
        """
        return self.z_min() + self._thk

    def thk(self):
        """Return the cylinder thickness.

        Args:
            None.

        Returns:
            The z-direction thickness of the cylinder.
        """
        return self._thk

    def copy(self):
        """Create a deep copy of this cylinder.

        Args:
            None.

        Returns:
            A new ``CylinderGeometry`` with the same center, radius, and
            thickness.
        """
        return CylinderGeometry(self._center, self._bottom_radius, self._thk)

    def copy_with_thk(self, thk):
        """Create a deep copy of this cylinder with a new thickness.

        Args:
            thk: Thickness to apply to the copied cylinder.

        Returns:
            A new ``CylinderGeometry`` with the same footprint and new
            thickness.
        """
        return CylinderGeometry(self._center, self._bottom_radius, thk)

    def move(self, x=0, y=0, z=0):
        """Translate this cylinder in global coordinates.

        Args:
            x: Translation distance along the x axis.
            y: Translation distance along the y axis.
            z: Translation distance along the z axis.

        Returns:
            None.
        """
        self._center[0] += x
        self._center[1] += y
        self._center[2] += z

    def clip_top_to(self, to_z):
        """Clip the cylinder so its top does not exceed ``to_z``.

        Args:
            to_z: Target top z coordinate after clipping.

        Returns:
            True when the cylinder remains after clipping, otherwise False.
        """
        z_bottom = self.z_min()
        z_top = z_bottom + self._thk

        if math.f_le(to_z, z_bottom):
            return False
        if math.f_lt(z_bottom, to_z) and math.f_lt(to_z, z_top):
            self._thk = to_z - z_bottom

        return True

    def flip(self, around_z=0):
        """Mirror this cylinder across a horizontal z plane.

        Args:
            around_z: Z coordinate of the mirror plane.

        Returns:
            None.
        """
        self._center[2] = 2 * around_z - self.z_max()

    def json(self):
        """Return this cylinder as a JSON-serializable dictionary.

        Returns:
            A dictionary with ``center``, ``bottom_radius``, and ``thk``.
            The center coordinate is copied so callers cannot mutate this
            object through the returned value.
        """
        return {
            "center": copy.deepcopy(self._center),
            "bottom_radius": self._bottom_radius,
            "thk": self._thk
        }


class ConeGeometry(Geometry):
    """Represent an extruded cone or frustum."""

    def __init__(self, center, bottom_radius, top_radius, thk):
        """Initialize a cone or frustum geometry.

        Args:
            center: Bottom center point of the cone as ``[x, y, z]``.
            bottom_radius: Radius at the bottom face.
            top_radius: Radius at the top face.
            thk: Thickness of the cone along the z axis.

        Returns:
            None.
        """
        self._center = copy.deepcopy(center)
        self._bottom_radius = bottom_radius
        self._top_radius = top_radius
        self._thk = thk

    def center(self):
        """Return a copy of the cone bottom center point.

        Args:
            None.

        Returns:
            A copied ``[x, y, z]`` coordinate list.
        """
        return copy.deepcopy(self._center)

    def bottom_radius(self):
        """Return the cone bottom radius.

        Args:
            None.

        Returns:
            The radius at the bottom face.
        """
        return self._bottom_radius

    def top_radius(self):
        """Return the cone top radius.

        Args:
            None.

        Returns:
            The radius at the top face.
        """
        return self._top_radius

    def z_min(self):
        """Return the bottom z coordinate of the cone.

        Args:
            None.

        Returns:
            The z coordinate of the cone bottom center point.
        """
        return self._center[2]

    def z_max(self):
        """Return the top z coordinate of the cone.

        Args:
            None.

        Returns:
            The lower z coordinate plus thickness.
        """
        return self.z_min() + self._thk

    def thk(self):
        """Return the cone thickness.

        Args:
            None.

        Returns:
            The z-direction thickness of the cone.
        """
        return self._thk

    def copy(self):
        """Create a deep copy of this cone.

        Args:
            None.

        Returns:
            A new ``ConeGeometry`` with the same center, radii, and thickness.
        """
        return ConeGeometry(
            self._center,
            self._bottom_radius,
            self._top_radius,
            self._thk,
        )

    def copy_with_thk(self, thk):
        """Create a deep copy of this cone with a new thickness.

        Args:
            thk: Thickness to apply to the copied cone.

        Returns:
            A new ``ConeGeometry`` with the same footprint and new thickness.
        """
        return ConeGeometry(
            self._center,
            self._bottom_radius,
            self._top_radius,
            thk,
        )

    def move(self, x=0, y=0, z=0):
        """Translate this cone in global coordinates.

        Args:
            x: Translation distance along the x axis.
            y: Translation distance along the y axis.
            z: Translation distance along the z axis.

        Returns:
            None.
        """
        self._center[0] += x
        self._center[1] += y
        self._center[2] += z

    def clip_top_to(self, to_z):
        """Clip the cone so its top does not exceed ``to_z``.

        Args:
            to_z: Target top z coordinate after clipping.

        Returns:
            True when the cone remains after clipping, otherwise False.
        """
        z_bottom = self.z_min()
        z_top = z_bottom + self._thk

        if math.f_le(to_z, z_bottom):
            return False
        if math.f_lt(z_bottom, to_z) and math.f_lt(to_z, z_top):
            self._thk = to_z - z_bottom

        return True

    def flip(self, around_z=0):
        """Mirror this cone across a horizontal z plane.

        Args:
            around_z: Z coordinate of the mirror plane.

        Returns:
            None.
        """
        self._center[2] = 2 * around_z - self.z_max()
        self._bottom_radius, self._top_radius = (
            self._top_radius,
            self._bottom_radius,
        )

    def json(self):
        """Return this cone or frustum as a JSON-serializable dictionary.

        Returns:
            A dictionary with ``center``, ``bottom_radius``, ``top_radius``,
            and ``thk``. The center coordinate is copied so callers cannot
            mutate this object through the returned value.
        """
        return {
            "center": copy.deepcopy(self._center),
            "bottom_radius": self._bottom_radius,
            "top_radius": self._top_radius,
            "thk": self._thk
        }
