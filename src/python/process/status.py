"""Process status object for simplified package geometry construction."""

from data.body import Body
from data.container import Container
from data.circuit import Circuit
from data.geometry import BoxGeometry, CylinderGeometry
from data.vias import Vias
from utils.math import math


class Status:
    """Track the current process geometry state.

    The status owns one root container, a reusable base footprint geometry,
    and the current process z plane. The current PoC uses global coordinates
    only.
    """

    def __init__(self):
        """Initialize an empty process status.

        Args:
            None.

        Returns:
            None.
        """
        self._container = Container(key="main")
        self._base_geometry = None
        self._z_now = 0

    def container(self):
        """Return the root geometry container.

        Args:
            None.

        Returns:
            The root ``Container`` owned by this status.
        """
        return self._container

    def base_geometry(self):
        """Return a copy of the reusable base footprint geometry.

        Args:
            None.

        Returns:
            A copied base geometry, or None before initialization.
        """
        if self._base_geometry is None:
            return None
        return self._base_geometry.copy()

    def _require_base_geometry(self):
        """Return the initialized reusable base footprint geometry.

        Args:
            None.

        Returns:
            The base geometry used for full-footprint process operations.

        Raises:
            ValueError: If no initial body has been registered yet.
        """
        if self._base_geometry is None:
            raise ValueError(
                "initial_body must be called before using this API"
            )
        return self._base_geometry

    def z_now(self):
        """Return the current process z plane.

        Args:
            None.

        Returns:
            The current z coordinate used for subsequent process operations.
        """
        return self._z_now

    def initial_body(self, body: Body):
        """Set the reusable base footprint from an initial body.

        Args:
            body: Body whose footprint should seed layer and fill operations.

        Returns:
            None.
        """
        base_body = body.copy()
        base_body.move(z=-base_body.z_min())
        self._base_geometry = base_body.geometry()

    def flip(self):
        """Flip the whole process state and normalize it back to z equals 0.

        Args:
            None.

        Returns:
            None.
        """
        self._container.flip()
        self._container.move(z=-self._container.z_min())
        self._z_now = self._container.z_max()

    def fill_thk(self, material, thk):
        """Add a full-footprint layer above the current z plane.

        Args:
            material: Material name or identifier for the new layer.
            thk: Thickness of the new layer.

        Returns:
            The newly created ``Body`` layer.

        Raises:
            ValueError: If no initial body exists or ``thk`` is not positive.
        """
        base_geometry = self._require_base_geometry()
        if math.f_le(thk, 0):
            raise ValueError("thk must be positive")

        geometry = base_geometry.copy_with_thk(thk)
        new_layer = Body(geometry, material)
        new_layer.move(z=self._z_now)

        self._container.add_body(new_layer)
        self._z_now += thk
        return new_layer

    def fill(self, material, to_z):
        """Add a full-footprint layer from current z plane up to ``to_z``.

        Args:
            material: Material name or identifier for the new layer.
            to_z: Target top z coordinate of the new layer.

        Returns:
            The newly created ``Body`` layer.

        Raises:
            ValueError: If no initial body exists or ``to_z`` is not above
                the current z plane.
        """
        base_geometry = self._require_base_geometry()
        if math.f_le(to_z, self._z_now):
            raise ValueError("to_z must be above current z_now")

        layer_thk = to_z - self._z_now
        geometry = base_geometry.copy_with_thk(layer_thk)
        new_layer = Body(geometry, material)
        new_layer.move(z=self._z_now)

        self._container.add_body(new_layer)
        self._z_now = to_z
        return new_layer

    def add_body(self, body: Body):
        """Add a body directly to the root container.

        Args:
            body: Body object to add to the current process state.

        Returns:
            The same body object that was added.
        """
        return self._container.add_body(body)

    def grind_to(self, to_z):
        """Grind the current process state down to a target z coordinate.

        Args:
            to_z: Target maximum z coordinate after grinding.

        Returns:
            True when geometry remains after grinding, otherwise False.
        """
        still_exists = self._container.grind_to(to_z)
        self._z_now = min(self._z_now, to_z)
        return still_exists

    def add_containers(self, dies: list[Container]):
        """Place die containers on the current process z plane.

        Args:
            dies: Containers representing dies to place into the root state.

        Returns:
            None.
        """
        for die in dies:
            die.move(z=self._z_now - die.z_min())
            self._container.add_child(die)

    def dig_via(self, thk, material, density):
        """Add a via feature below the current process z plane.

        Args:
            thk: Thickness of the via feature region.
            material: Material name or identifier for the via feature.
            density: Effective via density within the feature region.

        Returns:
            The newly created ``Vias`` feature.

        Raises:
            ValueError: If no initial body exists, ``thk`` is not positive, or
                the via would extend below z equals 0.
        """
        base_geometry = self._require_base_geometry()
        if math.f_le(thk, 0):
            raise ValueError("thk must be positive")
        if math.f_lt(self._z_now - thk, 0):
            raise ValueError("dig_via cannot dig below z=0")

        geometry = base_geometry.copy_with_thk(thk)
        via_layer = Vias(geometry, density, material)
        via_layer.move(z=self._z_now - thk)
        return self._container.add_via(via_layer)

    def grow_via(self, thk, material, density):
        """Add a via feature above the current process z plane.

        Args:
            thk: Thickness of the via feature region.
            material: Material name or identifier for the via feature.
            density: Effective via density within the feature region.

        Returns:
            The newly created ``Vias`` feature.

        Raises:
            ValueError: If no initial body exists or ``thk`` is not positive.
        """
        base_geometry = self._require_base_geometry()
        if math.f_le(thk, 0):
            raise ValueError("thk must be positive")

        geometry = base_geometry.copy_with_thk(thk)
        via_layer = Vias(geometry, density, material)
        via_layer.move(z=self._z_now)
        return self._container.add_via(via_layer)

    def grow_circuit(self, thk, material, density):
        """Add a circuit feature above the current process z plane.

        Args:
            thk: Thickness of the circuit feature region.
            material: Material name or identifier for the circuit feature.
            density: Effective circuit density within the feature region.

        Returns:
            The newly created ``Circuit`` feature.

        Raises:
            ValueError: If no initial body exists or ``thk`` is not positive.
        """
        base_geometry = self._require_base_geometry()
        if math.f_le(thk, 0):
            raise ValueError("thk must be positive")

        geometry = base_geometry.copy_with_thk(thk)
        circuit_layer = Circuit(geometry, density, material)
        circuit_layer.move(z=self._z_now)
        return self._container.add_circuit(circuit_layer)


def _rdl_layer_thickness(rdl_layer):
    """Return the single thickness value for an RDL layer definition.

    Args:
        rdl_layer: Dictionary describing one RDL layer. The layer may define
            ``thk`` directly, or define both ``pm_thickness`` and
            ``rdl_thickness`` with matching values.

    Returns:
        The shared PM and metal thickness for the RDL layer.

    Raises:
        ValueError: If thickness fields are missing or inconsistent.
    """
    if "thk" in rdl_layer:
        thk = rdl_layer["thk"]
        pm_thickness = rdl_layer.get("pm_thickness", thk)
        rdl_thickness = rdl_layer.get("rdl_thickness", thk)
        if math.f_ne(pm_thickness, thk) or math.f_ne(rdl_thickness, thk):
            raise ValueError(
                "RDL thk, pm_thickness, and rdl_thickness must match"
            )
        return thk

    pm_thickness = rdl_layer.get("pm_thickness")
    rdl_thickness = rdl_layer.get("rdl_thickness")
    if pm_thickness is None or rdl_thickness is None:
        raise ValueError(
            "rdl_layer must define thk, or both pm_thickness and "
            "rdl_thickness"
        )
    if math.f_ne(pm_thickness, rdl_thickness):
        raise ValueError("pm_thickness and rdl_thickness must be equal")
    return pm_thickness


def add_wafer(status: Status, material, thk, radius) -> Status:
    """Initialize the process status with a circular wafer body.

    Args:
        status: Process status to update.
        material: Material name or identifier for the wafer.
        thk: Wafer thickness.
        radius: Wafer radius.

    Returns:
        The same ``Status`` object after adding the wafer layer.
    """
    wafer_body = Body(
        CylinderGeometry([0.0, 0.0, 0.0], radius, thk),
        material=material,
    )
    status.initial_body(wafer_body)
    status.fill_thk(material, thk)
    return status


def add_panel(status: Status, material, thk, width) -> Status:
    """Initialize the process status with a square panel body.

    Args:
        status: Process status to update.
        material: Material name or identifier for the panel.
        thk: Panel thickness.
        width: Panel side length.

    Returns:
        The same ``Status`` object after adding the panel layer.
    """
    panel_body = Body(
        BoxGeometry(
            [-width / 2, -width / 2, 0.0],
            [width / 2, width / 2, 0.0],
            thk,
        ),
        material=material,
    )
    status.initial_body(panel_body)
    status.fill_thk(material, thk)
    return status


def add_rdl(status: Status, rdl_layers=None) -> Status:
    """Add an odd-count RDL stack to the process status.

    Args:
        status: Process status to update.
        rdl_layers: RDL layer dictionaries. Each layer must provide
            ``pm_material``, ``metal_material``, ``density``, and one shared
            thickness value via ``thk`` or matching ``pm_thickness`` and
            ``rdl_thickness``.

    Returns:
        The same ``Status`` object after adding the RDL stack.

    Raises:
        ValueError: If the layer count is even or a layer has inconsistent
            thickness fields.
        KeyError: If a required layer field is missing.
    """
    if rdl_layers is None:
        rdl_layers = []
    if len(rdl_layers) % 2 == 0:
        raise ValueError("rdl_layers must contain an odd number of layers")

    for index, rdl_layer in enumerate(rdl_layers):
        thk = _rdl_layer_thickness(rdl_layer)
        pm_material = rdl_layer["pm_material"]
        metal_material = rdl_layer["metal_material"]
        density = rdl_layer["density"]

        if index % 2 == 0:
            status.fill_thk(pm_material, thk)
            status.dig_via(thk, metal_material, density)
        else:
            status.grow_circuit(thk, metal_material, density)
            status.fill_thk(pm_material, thk)

    return status


def add_layer(status: Status, material, thk, width=None) -> Status:
    """Add one full-footprint material layer to the process status.

    Args:
        status: Process status to update.
        material: Material name or identifier for the new layer.
        thk: Thickness of the new layer.
        width: Reserved for callers that pass a common layer signature.

    Returns:
        The same ``Status`` object after adding the layer.
    """
    status.fill_thk(material, thk)
    return status
