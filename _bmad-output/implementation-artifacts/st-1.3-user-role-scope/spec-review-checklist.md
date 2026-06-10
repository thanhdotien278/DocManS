# ST-1.3 Spec Review Checklist

## Status

Draft for owner review

Use this checklist before approving implementation.

- [ ] Có đủ UC chưa? Required: `UC-ST-1.3-01` through `UC-ST-1.3-08`.
- [ ] Có đủ AC chưa? Required: list/filter, create, duplicate username, mandatory role/scope, update display name, update role, update scope, lock/deactivate, blocked login/protected flow, unlock/reactivate, login after reactivation, non-admin forbidden, current-user context, audit expectation.
- [ ] Có tách hard delete khỏi scope chưa? Required: hard delete is out of scope; soft-delete/archive is deferred.
- [ ] Có đủ auth rule chưa? Required: `AUTH-ST-1.3-01` through `AUTH-ST-1.3-05`.
- [ ] Có đủ audit rule chưa? Required: `AUD-ST-1.3-01` through `AUD-ST-1.3-06`.
- [ ] Có test plan map tới AC chưa? Required: service, API, web/manual, E2E, audit and authorization tests are mapped in `traceability-matrix.md`.
- [ ] Có giữ đúng ST-1.3, không lấn sang ST-1.4/EP-02 không? Required: no permission matrix detail, no proposal workflow, no catalog/config workflow beyond user role/scope needs.
- [ ] Có rõ backend enforcement không? Required: admin-only and fail-closed rules are backend expectations.
- [ ] Có rõ UI behavior không? Required: list/search/filter/create/edit/status behavior is described without treating UI as enforcement source.
- [ ] Có deferred decisions rõ không? Required: status model, role cardinality, scope cardinality, mandatory role/scope, unlock vs reactivate, soft-delete/archive.

## Filtering/searching review checklist

- [ ] Có rõ filter fields chưa? Required: `keyword`, `roleId` or `roleCode`, `organizationId`, `status`.
- [ ] Có rõ query contract chưa? Required: expected params, response rows, result count/pagination if existing, invalid value behavior.
- [ ] Có rõ behavior nút "Lọc" chưa? Required: applies all current keyword/role/organization/status conditions.
- [ ] Có rõ behavior nút "Xóa lọc" chưa? Required: resets keyword and dropdowns to defaults, then reloads default list.
- [ ] Có AC cho empty/error state chưa? Required: `AC-ST-1.3-01-10`, `AC-ST-1.3-01-12`.
- [ ] Có AC cho combined filters chưa? Required: `AC-ST-1.3-01-08`.
- [ ] Có test IDs map tới từng AC chưa? Required: `TEST-ST-1.3-API-FILTER-*`, `TEST-ST-1.3-WEB-FILTER-*`, `TEST-ST-1.3-AUTH-FILTER-01` in `traceability-matrix.md`.
- [ ] Có xác nhận search/filter không cần business audit log chưa? Required: normal read-only filter has no business audit requirement unless owner approves read-audit policy.
- [ ] Có xác nhận backend admin-only enforcement chưa? Required: `AUTH-ST-1.3-FILTER-01`, `AUTH-ST-1.3-FILTER-02`, `AUTH-ST-1.3-FILTER-03`.
- [ ] Có giữ status `not-started` và `pending-owner-review` chưa? Required: filtering refinement rows remain not-started until implementation is approved and verified.

## Owner decisions needed

- [ ] Decide whether `lock/unlock` and `deactivate/reactivate` are separate actions or one status model with reason.
- [ ] Decide whether phase 1 users can have one role or multiple roles.
- [ ] Decide whether organization scope is single unit, multiple units, or hierarchical.
- [ ] Decide whether role and organization scope are mandatory on create for every user.
- [ ] Decide the default user status after create.
- [ ] Decide later audit behavior if the business mutation succeeds but audit write fails.
- [ ] Decide whether role filter uses `roleId`, `roleCode`, or both.
- [ ] Decide exact status filter enum after status model decision.
- [ ] Decide whether invalid filter values are rejected or ignored; recommended default is reject.
