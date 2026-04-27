# AGENTS.md

## Working Style

- Prefer the simplest solution that fully solves the requested problem.
- Make surgical changes only. Do not refactor unrelated code or "clean up" adjacent areas unless explicitly asked.
- State assumptions when requirements are ambiguous. If a risky assumption would change behavior, ask instead of guessing.
- Match the existing code style and structure of the repository.
- Avoid speculative abstractions, extra configurability, or features that were not requested.

## Execution Rules

- Define clear success criteria before making substantial changes.
- For bug fixes, prefer reproducing the issue first, then verify the fix.
- For refactors, preserve behavior and verify before/after when practical.
- Remove only the unused code introduced by your own changes. Do not delete unrelated dead code without approval.

## Validation

- Verify changes with the smallest reliable check available: tests, build, lint, or a targeted manual check.
- If verification cannot be run, state that explicitly and describe the remaining risk.

## Review Priorities

- Prioritize correctness, regressions, edge cases, and missing validation/tests.
- Keep summaries brief. Findings and risks come first.
