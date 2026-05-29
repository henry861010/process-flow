"""Floating-point comparison helpers used by the geometry core."""

import math as _math


class Math:
    """Provide tolerance-aware numeric comparison helpers."""

    @staticmethod
    def f_eq(a: float, b: float, tolerance: float = 0.00001):
        """Return whether two floating-point values are effectively equal.

        Args:
            a: First value to compare.
            b: Second value to compare.
            tolerance: Maximum absolute difference treated as equal.

        Returns:
            True when the absolute difference is within tolerance.
        """
        return abs(a - b) <= tolerance

    @staticmethod
    def f_ne(a: float, b: float, tolerance: float = 0.00001):
        """Return whether two floating-point values are effectively unequal.

        Args:
            a: First value to compare.
            b: Second value to compare.
            tolerance: Maximum absolute difference treated as equal.

        Returns:
            True when the absolute difference is greater than tolerance.
        """
        return abs(a - b) > tolerance

    @staticmethod
    def f_gt(a: float, b: float, tolerance: float = 0.00001):
        """Return whether one value is greater than another with tolerance.

        Args:
            a: Candidate greater value.
            b: Reference value.
            tolerance: Minimum absolute difference required for comparison.

        Returns:
            True when ``a`` is greater than ``b`` beyond tolerance.
        """
        return abs(a - b) > tolerance and a > b

    @staticmethod
    def f_ge(a: float, b: float, tolerance: float = 0.00001):
        """Return whether one value is greater than or equal to another.

        Args:
            a: Candidate greater-or-equal value.
            b: Reference value.
            tolerance: Maximum absolute difference treated as equal.

        Returns:
            True when ``a`` is greater than ``b`` or equal within tolerance.
        """
        return abs(a - b) <= tolerance or a > b

    @staticmethod
    def f_lt(a: float, b: float, tolerance: float = 0.00001):
        """Return whether one value is less than another with tolerance.

        Args:
            a: Candidate lesser value.
            b: Reference value.
            tolerance: Minimum absolute difference required for comparison.

        Returns:
            True when ``a`` is less than ``b`` beyond tolerance.
        """
        return abs(a - b) > tolerance and a < b

    @staticmethod
    def f_le(a: float, b: float, tolerance: float = 0.00001):
        """Return whether one value is less than or equal to another.

        Args:
            a: Candidate less-or-equal value.
            b: Reference value.
            tolerance: Maximum absolute difference treated as equal.

        Returns:
            True when ``a`` is less than ``b`` or equal within tolerance.
        """
        return abs(a - b) <= tolerance or a < b

    @staticmethod
    def f_is_int(a: float, tolerance: float = 0.00001):
        """Return whether a numeric value is effectively an integer.

        Args:
            a: Value to inspect.
            tolerance: Maximum absolute difference from the nearest integer.

        Returns:
            True when ``a`` is numeric and close enough to an integer.
        """
        return isinstance(a, (int, float)) and _math.isclose(
            a,
            round(a),
            abs_tol=tolerance,
        )

    @staticmethod
    def f_zero(a: float, tolerance: float = 0.00001):
        """Normalize very small floating-point values to zero.

        Args:
            a: Value to normalize.
            tolerance: Maximum absolute value treated as zero.

        Returns:
            Zero when ``a`` is within tolerance, otherwise the original value.
        """
        if abs(a) < tolerance:
            return 0
        return a


math = Math()
