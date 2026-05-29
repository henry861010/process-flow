"""Geometry JSON schema helpers and deterministic identifiers."""

import copy
import hashlib
import json
import re


GEOMETRY_SCHEMA_VERSION = "1.0.0"
DEFAULT_UNIT_SYSTEM = "um"


def normalize_geometry_document(
    payload,
    schema_version=GEOMETRY_SCHEMA_VERSION,
    unit_system=DEFAULT_UNIT_SYSTEM,
):
    """Return a schema-wrapped geometry document with stable ids.

    Args:
        payload: Either an old-style container tree dictionary or a
            schema-wrapped geometry document.
        schema_version: Schema version to apply when one is missing.
        unit_system: Unit system to apply when one is missing.

    Returns:
        A copied document dictionary containing ``schemaVersion``,
        ``unitSystem``, and ``root``.
    """
    copied = copy.deepcopy(payload)
    if _is_document(copied):
        document = copied
    else:
        document = {
            "schemaVersion": schema_version,
            "unitSystem": unit_system,
            "root": copied,
        }

    document.setdefault("schemaVersion", schema_version)
    document.setdefault("unitSystem", unit_system)
    _assign_container_ids(document["root"], ["root"])
    return document


def stable_id(kind, path, payload=None):
    """Create a deterministic id from kind, path, and payload content."""
    normalized_path = [str(part) for part in path]
    digest_payload = {
        "kind": kind,
        "path": normalized_path,
        "payload": payload,
    }
    digest = _payload_digest(digest_payload)
    label = _slug("-".join(normalized_path[-3:]))
    return f"{kind}:{label}:{digest}"


def _is_document(payload):
    return (
        isinstance(payload, dict)
        and "root" in payload
        and (
            "schemaVersion" in payload
            or "unitSystem" in payload
        )
    )


def _assign_container_ids(container, path):
    container.setdefault("bodies", [])
    container.setdefault("vias", [])
    container.setdefault("circuits", [])
    container.setdefault("bumps", [])
    container.setdefault("children", [])

    container_key = container.get("key", "")
    container_path = path + [f"container:{container_key}"]
    container.setdefault(
        "id",
        stable_id(
            "container",
            container_path,
            {"key": container_key},
        ),
    )

    _assign_feature_ids(container["bodies"], "body", container_path)
    _assign_feature_ids(container["vias"], "via", container_path)
    _assign_feature_ids(container["circuits"], "circuit", container_path)
    _assign_feature_ids(container["bumps"], "bump", container_path)

    for index, child in enumerate(container["children"]):
        child_key = child.get("key", "")
        child_path = container_path + [f"child:{index}:{child_key}"]
        _assign_container_ids(child, child_path)


def _assign_feature_ids(features, kind, container_path):
    for index, feature in enumerate(features):
        payload = _without_id(feature)
        feature.setdefault(
            "id",
            stable_id(
                kind,
                container_path + [f"{kind}:{index}"],
                payload,
            ),
        )


def _without_id(value):
    copied = copy.deepcopy(value)
    if isinstance(copied, dict):
        copied.pop("id", None)
    return copied


def _payload_digest(value):
    canonical = json.dumps(
        value,
        ensure_ascii=True,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha1(canonical.encode("utf-8")).hexdigest()[:12]


def _slug(value):
    lowered = value.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", lowered).strip("-")
    return slug or "item"
