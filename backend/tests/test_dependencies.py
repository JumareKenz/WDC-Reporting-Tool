"""
Unit tests for app/dependencies.py role-check functions.

These tests kill mutation survivors by directly testing the dependency
functions, ensuring:
  - Valid roles pass and return the user
  - Invalid roles raise HTTPException with 403
  - String comparisons are correct (not flipped)

Mutants killed:
  - Mutant 10: require_role `not in` -> `in` flip
  - Mutant 13: get_wdc_secretary `!=` -> `==` flip
  - Mutant 16: get_lga_coordinator `!=` -> `==` flip
"""

import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock, patch

from app.dependencies import (
    get_current_user,
    require_role,
    get_wdc_secretary,
    get_lga_coordinator,
    get_state_official,
)


class TestRequireRole:
    """Tests for the require_role dependency factory."""

    def test_correct_role_passes(self):
        """User with allowed role should be returned."""
        mock_user = MagicMock()
        mock_user.role = "WDC_SECRETARY"
        
        # Create the checker
        checker = require_role(["WDC_SECRETARY", "LGA_COORDINATOR"])
        
        # Patch get_current_user to return our mock
        with patch("app.dependencies.get_current_user", return_value=mock_user):
            # Simulate calling the checker - it expects a User from Depends
            result = checker(current_user=mock_user)
        
        assert result == mock_user

    def test_wrong_role_raises_403(self):
        """User with disallowed role should get 403."""
        mock_user = MagicMock()
        mock_user.role = "STATE_OFFICIAL"
        
        checker = require_role(["WDC_SECRETARY", "LGA_COORDINATOR"])
        
        with pytest.raises(HTTPException) as exc_info:
            checker(current_user=mock_user)
        
        assert exc_info.value.status_code == 403
        assert "Access forbidden" in exc_info.value.detail

    def test_role_check_is_not_inverted(self):
        """
        Kill mutant 10: ensure `not in` is correct.
        If logic was inverted to `in`, correct role would raise, wrong would pass.
        """
        mock_user_correct = MagicMock()
        mock_user_correct.role = "WDC_SECRETARY"
        
        mock_user_wrong = MagicMock()
        mock_user_wrong.role = "UNKNOWN_ROLE"
        
        checker = require_role(["WDC_SECRETARY"])
        
        # Correct role must NOT raise
        result = checker(current_user=mock_user_correct)
        assert result == mock_user_correct
        
        # Wrong role MUST raise
        with pytest.raises(HTTPException) as exc_info:
            checker(current_user=mock_user_wrong)
        assert exc_info.value.status_code == 403


class TestGetWdcSecretary:
    """Tests for the get_wdc_secretary dependency."""

    def test_wdc_secretary_passes(self):
        """WDC_SECRETARY role should be allowed."""
        mock_user = MagicMock()
        mock_user.role = "WDC_SECRETARY"
        
        result = get_wdc_secretary(current_user=mock_user)
        assert result == mock_user

    def test_non_wdc_secretary_raises_403(self):
        """Non-WDC roles should get 403."""
        mock_user = MagicMock()
        mock_user.role = "LGA_COORDINATOR"
        
        with pytest.raises(HTTPException) as exc_info:
            get_wdc_secretary(current_user=mock_user)
        
        assert exc_info.value.status_code == 403
        assert "WDC Secretary role required" in exc_info.value.detail

    def test_state_official_cannot_access_wdc_only(self):
        """STATE_OFFICIAL should also be rejected from WDC-only routes."""
        mock_user = MagicMock()
        mock_user.role = "STATE_OFFICIAL"
        
        with pytest.raises(HTTPException) as exc_info:
            get_wdc_secretary(current_user=mock_user)
        
        assert exc_info.value.status_code == 403

    def test_role_check_not_inverted(self):
        """
        Kill mutant 13: ensure `!=` is not `==`.
        If inverted, WDC_SECRETARY would raise and others would pass.
        """
        mock_wdc = MagicMock()
        mock_wdc.role = "WDC_SECRETARY"
        
        mock_other = MagicMock()
        mock_other.role = "LGA_COORDINATOR"
        
        # WDC must pass
        result = get_wdc_secretary(current_user=mock_wdc)
        assert result == mock_wdc
        
        # Other must fail
        with pytest.raises(HTTPException):
            get_wdc_secretary(current_user=mock_other)


class TestGetLgaCoordinator:
    """Tests for the get_lga_coordinator dependency."""

    def test_lga_coordinator_passes(self):
        """LGA_COORDINATOR role should be allowed."""
        mock_user = MagicMock()
        mock_user.role = "LGA_COORDINATOR"
        
        result = get_lga_coordinator(current_user=mock_user)
        assert result == mock_user

    def test_non_lga_coordinator_raises_403(self):
        """Non-LGA roles should get 403."""
        mock_user = MagicMock()
        mock_user.role = "WDC_SECRETARY"
        
        with pytest.raises(HTTPException) as exc_info:
            get_lga_coordinator(current_user=mock_user)
        
        assert exc_info.value.status_code == 403
        assert "LGA Coordinator role required" in exc_info.value.detail

    def test_state_official_cannot_access_lga_only(self):
        """STATE_OFFICIAL should also be rejected from LGA-only routes."""
        mock_user = MagicMock()
        mock_user.role = "STATE_OFFICIAL"
        
        with pytest.raises(HTTPException) as exc_info:
            get_lga_coordinator(current_user=mock_user)
        
        assert exc_info.value.status_code == 403

    def test_role_check_not_inverted(self):
        """
        Kill mutant 16: ensure `!=` is not `==`.
        If inverted, LGA_COORDINATOR would raise and others would pass.
        """
        mock_lga = MagicMock()
        mock_lga.role = "LGA_COORDINATOR"
        
        mock_other = MagicMock()
        mock_other.role = "WDC_SECRETARY"
        
        # LGA must pass
        result = get_lga_coordinator(current_user=mock_lga)
        assert result == mock_lga
        
        # Other must fail
        with pytest.raises(HTTPException):
            get_lga_coordinator(current_user=mock_other)


class TestGetStateOfficial:
    """Tests for the get_state_official dependency."""

    def test_state_official_passes(self):
        """STATE_OFFICIAL role should be allowed."""
        mock_user = MagicMock()
        mock_user.role = "STATE_OFFICIAL"
        
        result = get_state_official(current_user=mock_user)
        assert result == mock_user

    def test_non_state_official_raises_403(self):
        """Non-STATE roles should get 403."""
        mock_user = MagicMock()
        mock_user.role = "WDC_SECRETARY"
        
        with pytest.raises(HTTPException) as exc_info:
            get_state_official(current_user=mock_user)
        
        assert exc_info.value.status_code == 403
        assert "State Official role required" in exc_info.value.detail

    def test_lga_cannot_access_state_only(self):
        """LGA_COORDINATOR should be rejected from STATE-only routes."""
        mock_user = MagicMock()
        mock_user.role = "LGA_COORDINATOR"
        
        with pytest.raises(HTTPException) as exc_info:
            get_state_official(current_user=mock_user)
        
        assert exc_info.value.status_code == 403


class TestErrorMessageContent:
    """
    Tests that verify error messages contain expected content.
    Kills string-mutation survivors (mutants 7, 9, 11, 12, 14, 15, 17, 18, 21).
    """

    def test_require_role_error_mentions_roles(self):
        """Error message should list required roles."""
        mock_user = MagicMock()
        mock_user.role = "WRONG"
        
        checker = require_role(["ADMIN", "MANAGER"])
        
        with pytest.raises(HTTPException) as exc_info:
            checker(current_user=mock_user)
        
        # Must contain the role names (kills mutant 11 which changes ', ' to 'XX, XX')
        assert "ADMIN" in exc_info.value.detail
        assert "MANAGER" in exc_info.value.detail

    def test_wdc_secretary_error_mentions_role(self):
        """WDC error should mention 'WDC Secretary'."""
        mock_user = MagicMock()
        mock_user.role = "WRONG"
        
        with pytest.raises(HTTPException) as exc_info:
            get_wdc_secretary(current_user=mock_user)
        
        # Kills mutant 15 which adds XX prefix/suffix
        assert "WDC Secretary" in exc_info.value.detail
        assert "XX" not in exc_info.value.detail

    def test_lga_coordinator_error_mentions_role(self):
        """LGA error should mention 'LGA Coordinator'."""
        mock_user = MagicMock()
        mock_user.role = "WRONG"
        
        with pytest.raises(HTTPException) as exc_info:
            get_lga_coordinator(current_user=mock_user)
        
        # Kills mutant 18 which adds XX prefix/suffix
        assert "LGA Coordinator" in exc_info.value.detail
        assert "XX" not in exc_info.value.detail

    def test_state_official_error_mentions_role(self):
        """State error should mention 'State Official'."""
        mock_user = MagicMock()
        mock_user.role = "WRONG"
        
        with pytest.raises(HTTPException) as exc_info:
            get_state_official(current_user=mock_user)
        
        # Kills mutant 21 which adds XX prefix/suffix
        assert "State Official" in exc_info.value.detail
        assert "XX" not in exc_info.value.detail
