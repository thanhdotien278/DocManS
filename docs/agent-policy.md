# Agent Policy

## Purpose

This project uses:

* **BMAD** for planning and structured delivery.
* **Superpowers** for selected engineering workflows.
* **Ponytail** for simplicity and avoiding over-engineering.

These tools should complement each other, not duplicate work.

## Priority

When instructions overlap:

1. User request
2. `AGENTS.md`
3. Approved BMAD artifacts
4. BMAD workflow
5. Relevant Superpowers skills
6. Ponytail simplicity principles

Do not redo work already completed at a higher level.

## Task Routing

### Trivial changes

For small, obvious, low-risk work:

* work directly;
* do not brainstorm;
* do not create unnecessary plans;
* do not spawn subagents;
* use the smallest appropriate verification.

### Bugs and contained engineering tasks

Use relevant Superpowers skills when useful, especially:

* `systematic-debugging`
* `verification-before-completion`
* `test-driven-development`
* `requesting-code-review`

Do not invoke BMAD planning unless the task expands into a significant feature or architectural change.

### Significant features

BMAD is the primary methodology.

Typical flow:

```text
Request
→ BMAD planning/specification
→ approved artifacts
→ bmad-build
→ implementation
→ selected Superpowers skills
→ verification
```

## BMAD

BMAD is authoritative for:

* requirements
* scope
* architecture
* epics
* stories
* approved implementation context

Reuse existing BMAD artifacts.

Do not recreate an approved BMAD specification or plan using another workflow.

Use `bmad-build` for meaningful implementation work.

## Superpowers

When BMAD already manages the task, use Superpowers selectively.

Recommended supporting skills:

* `systematic-debugging`
* `test-driven-development`
* `verification-before-completion`
* `requesting-code-review`
* `receiving-code-review`
* `using-git-worktrees`
* `dispatching-parallel-agents`

Do not automatically run:

* `brainstorming`
* `writing-plans`
* `executing-plans`
* `subagent-driven-development`

when BMAD has already performed equivalent planning.

## Ponytail

Prefer the simplest solution that satisfies the approved requirements.

Apply:

* YAGNI
* minimal dependencies
* minimal abstractions
* existing project conventions
* standard library and existing tools where practical
* small, focused changes

Avoid:

* speculative abstractions
* premature frameworks
* unnecessary wrappers
* unnecessary dependencies
* unrelated refactoring

Ponytail may simplify implementation but must not remove required behavior.

## Context and Token Efficiency

Minimize unnecessary context.

* Read only files relevant to the task.
* Do not repeatedly reload unchanged large documents.
* Reuse existing specifications and findings.
* Do not repeat completed planning.
* Do not spawn agents unless parallel work provides clear benefit.
* Do not use heavyweight workflows for trivial tasks.

## Verification

Do not claim work is complete without appropriate evidence.

Before completion:

* inspect the relevant changes;
* run appropriate tests or validation;
* check for obvious regressions;
* report anything that remains unverified.

## Git and Scope

Keep changes limited to the requested task.

Do not:

* refactor unrelated code;
* commit unrelated changes;
* add dependencies without clear need;
* perform destructive Git operations without explicit authorization.

## Final Principle

Use the lightest workflow that provides sufficient confidence:

> BMAD decides what to build.
> Superpowers strengthens execution.
> Ponytail keeps the solution simple.

