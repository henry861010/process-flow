"""Density-based circuit feature wrapper."""

from data.geometry import Geometry


class Circuit(Geometry):
    """Represent circuit regions using a simplified density value."""

    def __init__(self, geometry: Geometry, density: float, material: str):
        """Initialize a circuit feature region.

        Args:
            geometry: Geometry primitive that defines the circuit region.
            density: Effective circuit density within the geometry region.
            material: Material name or identifier for the circuit feature.

        Returns:
            None.
        """
        self._geometry = geometry
        self._density = density
        self._material = material

    def z_min(self):
        """Return the minimum z coordinate of the circuit region.

        Args:
            None.

        Returns:
            The minimum z coordinate reported by the wrapped geometry.
        """
        return self._geometry.z_min()

    def z_max(self):
        """Return the maximum z coordinate of the circuit region.

        Args:
            None.

        Returns:
            The maximum z coordinate reported by the wrapped geometry.
        """
        return self._geometry.z_max()

    def thk(self):
        """Return the circuit region thickness.

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
            A deep copy of the circuit region geometry.
        """
        return self._geometry.copy()

    def density(self):
        """Return the effective circuit density.

        Args:
            None.

        Returns:
            The density value associated with this circuit region.
        """
        return self._density

    def material(self):
        """Return the material label for this circuit region.

        Args:
            None.

        Returns:
            The material string associated with this circuit region.
        """
        return self._material

    def copy(self):
        """Create a deep copy of this circuit feature region.

        Args:
            None.

        Returns:
            A new ``Circuit`` object with copied geometry and same metadata.
        """
        return Circuit(self._geometry.copy(), self._density, self._material)

    def copy_with_thk(self, thk):
        """Create a copy of this circuit region with new thickness.

        Args:
            thk: Thickness to apply to the copied circuit geometry.

        Returns:
            A new ``Circuit`` object with the same density and material.
        """
        return Circuit(
            self._geometry.copy_with_thk(thk),
            self._density,
            self._material,
        )

    def move(self, x=0, y=0, z=0):
        """Translate this circuit region in global coordinates.

        Args:
            x: Translation distance along the x axis.
            y: Translation distance along the y axis.
            z: Translation distance along the z axis.

        Returns:
            None.
        """
        self._geometry.move(x, y, z)

    def clip_top_to(self, to_z):
        """Clip the circuit region top to ``to_z``.

        Args:
            to_z: Target top z coordinate after clipping.

        Returns:
            True when the circuit region remains after clipping, otherwise
            False.
        """
        return self._geometry.clip_top_to(to_z)

    def flip(self, around_z=0):
        """Mirror this circuit region across a horizontal z plane.

        Args:
            around_z: Z coordinate of the mirror plane.

        Returns:
            None.
        """
        return self._geometry.flip(around_z)

    def json(self):
        """Return this circuit region as a JSON-serializable dictionary.

        Returns:
            A dictionary with the nested ``geometry`` payload, ``material``
            label, and effective ``density`` value.
        """
        return {
            "geometry": self._geometry.json(),
            "material": self._material,
            "density": self._density
        }
