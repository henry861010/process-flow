"""Material-bearing geometry wrapper for solid package volumes."""

from data.geometry import Geometry


class Body(Geometry):
    """Represent a physical solid volume with a material label."""

    def __init__(self, geometry: Geometry, material: str):
        """Initialize a material-bearing geometry body.

        Args:
            geometry: Geometry primitive that defines the body volume.
            material: Material name or identifier for this body.

        Returns:
            None.
        """
        self._geometry = geometry
        self._material = material

    def z_min(self):
        """Return the minimum z coordinate of the body.

        Args:
            None.

        Returns:
            The minimum z coordinate reported by the wrapped geometry.
        """
        return self._geometry.z_min()

    def z_max(self):
        """Return the maximum z coordinate of the body.

        Args:
            None.

        Returns:
            The maximum z coordinate reported by the wrapped geometry.
        """
        return self._geometry.z_max()

    def thk(self):
        """Return the body thickness.

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
            A deep copy of the body geometry.
        """
        return self._geometry.copy()

    def material(self):
        """Return the material label for this body.

        Args:
            None.

        Returns:
            The material string associated with this body.
        """
        return self._material

    def copy(self):
        """Create a deep copy of this body.

        Args:
            None.

        Returns:
            A new ``Body`` with copied geometry and the same material.
        """
        return Body(self._geometry.copy(), self._material)

    def copy_with_thk(self, thk):
        """Create a copy of this body with a new geometry thickness.

        Args:
            thk: Thickness to apply to the copied body geometry.

        Returns:
            A new ``Body`` with the same material and new thickness.
        """
        return Body(self._geometry.copy_with_thk(thk), self._material)

    def move(self, x=0, y=0, z=0):
        """Translate this body in global coordinates.

        Args:
            x: Translation distance along the x axis.
            y: Translation distance along the y axis.
            z: Translation distance along the z axis.

        Returns:
            None.
        """
        self._geometry.move(x, y, z)

    def clip_top_to(self, to_z):
        """Clip the wrapped geometry top to ``to_z``.

        Args:
            to_z: Target top z coordinate after clipping.

        Returns:
            True when the body remains after clipping, otherwise False.
        """
        return self._geometry.clip_top_to(to_z)

    def flip(self, around_z=0):
        """Mirror this body across a horizontal z plane.

        Args:
            around_z: Z coordinate of the mirror plane.

        Returns:
            None.
        """
        return self._geometry.flip(around_z)

    def json(self):
        """Return this body as a JSON-serializable dictionary.

        Returns:
            A dictionary with the nested ``geometry`` payload and ``material``
            label.
        """
        return {
            "geometry": self._geometry.json(),
            "material": self._material
        }
