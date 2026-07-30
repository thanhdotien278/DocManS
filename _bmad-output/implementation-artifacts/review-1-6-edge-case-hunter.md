# Story 1.6 Edge Case Hunter Prompt

Review the current uncommitted changes in `/Users/Super/DocManS`. First gather the exact review diff with:

```sh
git diff HEAD
git diff --no-index /dev/null _bmad-output/implementation-artifacts/1-6-quan-ly-danh-muc-va-cau-hinh-van-hanh-dung-chung.md
```

Walk all relevant branches, error paths, authorization boundaries, invalid input states, concurrent/transactional behavior, and UI state transitions. Report only reproducible findings with severity, file and line, impact, and evidence. Invoke the `bmad-review-edge-case-hunter` skill before reviewing.
