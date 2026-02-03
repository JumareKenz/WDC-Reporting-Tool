"""
mutmut configuration — targets only the highest-value modules.

Run:
    cd backend
    python -m mutmut run --config mutmut_config.py
    python -m mutmut results

Quick mode (PR):
    python -m mutmut run --config mutmut_config.py --limit 50

Full mode (nightly / manual):
    python -m mutmut run --config mutmut_config.py
"""

# ---------------------------------------------------------------------------
# Files to mutate (relative to backend/)
# ---------------------------------------------------------------------------
# auth.py          — password verification, token creation/decode
# dependencies.py  — role checks, active-user guard
# routers/reports.py — submission logic, duplicate check, month validation call
# utils/date_utils.py — day-boundary logic (<=23 vs >23)
# ---------------------------------------------------------------------------
source_dirs = [
    "app",
]

# Only mutate these specific files
include_patterns = [
    "app/auth.py",
    "app/dependencies.py",
    "app/routers/reports.py",
    "app/utils/date_utils.py",
]

# Exclude test files and __pycache__
exclude_patterns = [
    "__pycache__",
    "tests/",
    "*.pyc",
]

# Test command — runs only the tests that exercise the targeted modules
# (fast feedback loop; full suite takes ~2 min)
test_command = (
    "python -m pytest tests/test_security.py tests/test_contracts.py "
    "tests/test_reports.py tests/test_profile.py "
    "-x -q --tb=line"
)
