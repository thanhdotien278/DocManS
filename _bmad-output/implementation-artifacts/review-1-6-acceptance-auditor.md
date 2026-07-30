# Story 1.6 Acceptance Auditor Prompt

Review the current uncommitted changes in `/Users/Super/DocManS` against:

- `_bmad-output/implementation-artifacts/1-6-quan-ly-danh-muc-va-cau-hinh-van-hanh-dung-chung.md`
- `_bmad-output/project-context.md`

First gather the exact review diff with:

```sh
git diff HEAD
git diff --no-index /dev/null _bmad-output/implementation-artifacts/1-6-quan-ly-danh-muc-va-cau-hinh-van-hanh-dung-chung.md
```

Check each acceptance criterion and stated constraint for missing behavior, contradiction, or partial implementation. Output only actionable Markdown findings: title, violated AC/constraint, file and line, and evidence.
