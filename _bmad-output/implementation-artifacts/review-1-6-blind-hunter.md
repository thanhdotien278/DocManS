# Story 1.6 Blind Hunter Prompt

Review the current uncommitted changes in `/Users/Super/DocManS` as an adversarial code reviewer. First gather the exact review diff with:

```sh
git diff HEAD
git diff --no-index /dev/null _bmad-output/implementation-artifacts/1-6-quan-ly-danh-muc-va-cau-hinh-van-hanh-dung-chung.md
```

Focus on concrete bugs, regressions, security or authorization defects, data-integrity failures, and missing tests. Report only actionable findings with severity, file and line, impact, and evidence. Invoke the `bmad-review-adversarial-general` skill before reviewing.
