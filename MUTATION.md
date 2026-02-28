# Mutation Testing

Mutation testing proves that the test suite actually catches logic errors in the critical auth/RBAC/report-submission code paths. If a mutant (subtle code change) survives — i.e., all tests still pass — it means the tests don't cover that specific logic branch.

## Targeted modules

| File | Why |
|---|---|
| `app/auth.py` | Password verification (`bcrypt.checkpw`), token creation/decode, expiry logic |
| `app/dependencies.py` | `get_current_user` active-user guard, `require_role` / `get_state_official` / `get_wdc_secretary` / `get_lga_coordinator` role checks |
| `app/routers/reports.py` | Duplicate-submission 409, month validation call, ward-ownership IDOR check, review role gating |
| `app/utils/date_utils.py` | Day-boundary logic (`<= 23` vs `> 23`), year-wrap for January |

These four files contain the highest-consequence logic: a surviving mutant here means a real security or correctness gap.

## Tool

**mutmut** (Python). Config lives in `backend/setup.cfg` `[mutmut]` section.

## How to run

```bash
cd backend
pip install mutmut

# Quick mode — auth + deps only (use on PRs for fast feedback)
python -m mutmut run --paths-to-mutate app/auth.py --paths-to-mutate app/dependencies.py

# Full run — all mutants in the targeted files (use nightly)
python -m mutmut run

# View results
python -m mutmut results

# View specific surviving mutant
python -m mutmut show <mutant_id>
```

## How to interpret the score

```
Mutation score = (killed mutants / total mutants) × 100
```

- **100%** — every mutant was caught. Tests are tight.
- **80–99%** — good. Surviving mutants are edge cases or cosmetic.
- **< 80%** — investigate survivors. They likely indicate untested branches.

## CI integration

- **On PR:** `mutmut run --limit 50` (fast, ~30s). Results printed; non-zero exit is informational, not a blocker.
- **Nightly (schedule):** full run, results saved. If score drops below the previous run, flag for review.

## Addressing surviving mutants

1. Run `python -m mutmut show <id>` to see exactly what was changed.
2. Write a test that fails when that change is applied.
3. Re-run `mutmut run` — the mutant should now be killed.

Common survivors in this codebase to watch for:
- Boundary comparisons (`<=` vs `<`) in `date_utils.py` — the day-23/24 split.
- Return-value checks in `verify_password` — ensure tests assert on wrong-password paths, not just right-password paths.
- Role string comparisons in `dependencies.py` — ensure every non-target role is tested, not just one.
