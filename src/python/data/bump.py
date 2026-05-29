"""Density-based bump feature wrapper."""

from data.geometry import Geometry


class Bump(Geometry):
    """Represent bump regions using a simplified density value."""

    def __init__(self, geometry: Geometry, density: float, material: str):
        """Initialize a bump feature region.

        Args:
            geometry: Geometry primitive that defines the bump region.
            density: Effective bump density within the geometry region.
            material: Material name or identifier for the bump feature.

        Returns:
            None.
        """
        self._geometry = geometry
        self._density = density
        self._material = material

    def z_min(self):
        """Return the minimum z coordinate of the bump region.

        Args:
            None.

        Returns:
            The minimum z coordinate reported by the wrapped geometry.
        """
        return self._geometry.z_min()

    def z_max(self):
        """Return the maximum z coordinate of the bump region.

        Args:
            None.

        Returns:
            The maximum z coordinate reported by the wrapped geometry.
        """
        return self._geometry.z_max()

    def thk(self):
        """Return the bump region thickness.

        Args:
            None.

        Returns:
            The z-direction thickness reported by the wrapped geometry.
        """
        return self._geometry.thk()

    def geometry(self):
        """Return a copy of the wrapped geometry.

        Args:
            None.

        Returns:
            A deep copy of the bump region geometry.
        """
        return self._geometry.copy()

    def density(self):
        """Return the effective bump density.

        Args:
            None.

        Returns:
            The density value associated with this bump region.
        """
        return self._density

    def material(self):
        """Return the material label for this bump region.

        Args:
            None.

        Returns:
            The material string associated with this bump region.
        """
        return self._material

    def copy(self):
        """Create a deep copy of this bump feature region.

        Args:
            None.

        Returns:
            A new ``Bump`` object with copied geometry and same metadata.
        """
        return Bump(self._geometry.copy(), self._density, self._material)

    def copy_with_thk(self, thk):
        """Create a copy of this bump region with new thickness.

        Args:
            thk: Thickness to apply to the copied bump geometry.

        Returns:
            A new ``Bump`` object with the same density and material.
        """
        return Bump(
            self._geometry.copy_with_thk(thk),
            self._density,
            self._material,
        )

    def move(self, x=0, y=0, z=0):
        """Translate this bump region in global coordinates.

        Args:
            x: Translation distance along the x axis.
            y: Translation distance along the y axis.
            z: Translation distance along the z axis.

        Returns:
            None.
        """
        self._geometry.move(x, y, z)

    def clip_top_to(self, to_z):
        """Clip the bump region top to ``to_z``.

        Args:
            to_z: Target top z coordinate after clipping.

        Returns:
            True when the bump region remains after clipping, otherwise False.
        """
        return self._geometry.clip_top_to(to_z)

    def flip(self, around_z=0):
        """Mirror this bump region across a horizontal z plane.

        Args:
            around_z: Z coordinate of the mirror plane.

        Returns:
            None.
        """
        return self._geometry.flip(around_z)

    def json(self):
        """Return this bump region as a JSON-serializable dictionary.

        Returns:
            A dictionary with the nested ``geometry`` payload, ``material``
            label, and effective ``density`` value.
        """
        return {
            "geometry": self._geometry.json(),
            "material": self._material,
            "density": self._density
        }
