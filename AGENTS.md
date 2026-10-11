# DocManS Project Rules

BMAD is the primary methodology for significant feature work.

Existing BMAD requirements, architecture, stories, and specs are authoritative.
Do not recreate them using Superpowers.

Use `bmad-build` for meaningful implementation work.

Superpowers may support implementation with:
- systematic-debugging
- test-driven-development
- verification-before-completion
- code review

Do not invoke Superpowers brainstorming or writing-plans when BMAD already
contains an approved specification or plan.

Keep changes scoped to the requested task.
Do not refactor unrelated code.

### Before Adding a Test

- When writing, changing, reviewing, or deciding whether to add tests, use the `test-audit` skill.
- Do not assume every code change needs a test. Add one only for observable behavior, a contract, or a credible regression.
- Prefer extending an existing test over creating a new test or test file.
- Test only the paths put at meaningful risk by the change; do not automatically enumerate edge cases or duplicate the same proof across layers.
- Do not create production exports, wrappers, flags, or seams solely for tests.
- Bug fixes should normally have one focused regression test that fails on the pre-fix code for the intended reason.
- Use focused validation first. Do not run broad audits or the full test suite unless justified by the change or explicitly requested.
- Once the behavior is adequately protected and relevant validation passes, stop.

See `docs/agent-policy.md` only when detailed workflow guidance is required.