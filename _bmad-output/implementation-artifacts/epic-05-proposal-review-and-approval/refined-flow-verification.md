# Refined Golden Flow verification

> Role names and decision rights here predate the 10-role model (2026-10-18); see `docs/permission-matrix.md`.

## Kiểm chứng UI 08/11/2026 — mô hình 10 vai trò (5.3, 5.9, 5.10, 5.11, 11.1)

Môi trường: web `localhost:3000`, API `localhost:4000`, DB `docmansystem` (dev). Trình duyệt tích hợp của Claude; đăng nhập từng tài khoản seed qua form `/login`. Hồ sơ `8d3d6476-6fd1-4451-9341-faf96489a0c7` ("Mùa thu 2", PI `int1`). Không ghi DB trực tiếp; SQL chỉ dùng để đối chiếu.

Giới hạn công cụ: trình duyệt chặn `window.confirm()` (luôn trả `false`), nên mỗi trang đã ghi đè `window.confirm = () => true` để mô phỏng bấm OK. Phần lớn ô nhập được điền bằng setter DOM kèm sự kiện `input`/`change`, rồi bấm nút thật; không gọi API nghiệp vụ trực tiếp.

| Bước | Tác nhân | Kết quả |
| --- | --- | --- |
| Xác nhận đầy đủ | CV `hdtien1` | "Đã ghi nhận kết quả kiểm tra" |
| Mời 7 (1/2/3/1) | TP `nmphuong` | 7 dòng "Chờ chấp nhận"; điều kiện trình hiện "7 thành viên chưa chấp nhận lời mời" (chỉ thấy thông báo, chưa thử bấm trình). Lượt này không tra từng ứng viên bị loại; luật loại PI/thành viên/QT/tự mời được phủ bởi `tests/approval-routing-db.test.mjs:310` và QA K4 |
| Thông báo lời mời (11.1) | `test_internal01` | Chuông "1 chưa đọc", `review.invited` → `/my-reviews` |
| Từ chối | `test_external02` | Lý do trống: nút "Gửi từ chối" khóa; có lý do → "Đã từ chối"; TP thấy lý do và điều kiện chặn |
| Thu hồi, mời thay | TP | Hộp thoại bắt buộc lý do; mời `test_external03`; 7/7 nhận lời → "Sẵn sàng trình" |
| Tờ trình `EVALUATION_COUNCIL` | CV → TB → TP | TB nhận thông báo và mở link đúng hồ sơ; TP trả lại lý do trống bị chặn ("Nhập lý do trả lại."); trả lại có lý do → CV nhận "Tờ trình bị trả lại"; lập lại → TB chuyển → TP trình |
| Ký hội đồng | PGĐ-KH `vndinh` | PP `dnbinh` không có nút, không có thông báo; `vndinh` ký → "Đã thành lập ngày 08/11/2026"; thông báo chờ ký cũ của GĐ tự đánh dấu đã đọc |
| Chấm phiếu | 6 thành viên | Mỗi phiếu khóa sau khi gửi; thư ký chỉ có "Soạn biên bản", phiếu hiện ẩn danh "Phiếu N" |
| Chốt tổng hợp | TP | 5/6 phiếu: "Chốt bản tổng hợp" khóa, lý do "Còn 1 phiếu chưa gửi." (N02 đã sửa); nháp cũ bị chặn chốt cho tới khi lưu lại; chốt thành công |
| Tờ trình `DECISION_PACKAGE` | TP → TB → GĐ | TP lập → TB chuyển → lên thẳng "Chờ Ban giám đốc ký" (D-037); PGĐ-KH không có nút quyết định, không có thông báo |
| Quyết định | GĐ `tvtien` | "Không phê duyệt" khi trống lý do bị chặn; Phê duyệt → hồ sơ `approved`; PI nhận "Hồ sơ đã có quyết định — Đã duyệt"; TP (người lập) nhận "Tờ trình đã được ký duyệt"; PI GET roster hội đồng → 403 |

Đối chiếu DB: hồ sơ `approved`, 1 `proposal_decisions`; 3 `approval_submissions` (council RETURNED, council APPROVED, DECISION_PACKAGE APPROVED với chuỗi `SUBMIT > FORWARD > APPROVE@LEADERSHIP`); audit có `establish-evaluation-council`, `return-approval-submission`, `decline-review-invitation`, `finalize-evaluation-summary`, `submit-evaluation-package`, `approve-proposal`.

### Nhánh không phê duyệt (cùng ngày)

Hồ sơ QA mới `83104e2d-b93c-4bbf-8f21-67b48fce7757` ("QA 08/11 — Nhánh không phê duyệt"), PI `test_internal06`. PI tạo nháp, tải 2 tệp PDF bắt buộc và nộp qua UI. CV phụ trách `hdtien1` được gán tự động theo đợt.

| Bước | Tác nhân | Kết quả |
| --- | --- | --- |
| Xác nhận đầy đủ, mời 7, 7/7 nhận lời | CV, TP, 7 thành viên | "Sẵn sàng trình" |
| Tờ trình `EVALUATION_COUNCIL` | CV → TB → TP → GĐ `tvtien` ký | "Đã thành lập ngày 08/11/2026" (lần này GĐ ký; nhánh phê duyệt là PGĐ-KH ký) |
| 6 phiếu "không phê duyệt" | 6 thành viên | Mỗi phiếu khóa sau khi gửi (30–39/100) |
| Tổng hợp, `DECISION_PACKAGE` | TP lưu nháp → chốt → lập; TB chuyển | "Chờ Ban giám đốc ký" |
| Không phê duyệt | GĐ | Nhập lý do → "Không phê duyệt"; nút quyết định khóa sau khi ban hành; hồ sơ `rejected` |
| Thông báo | — | TB, GĐ nhận "Tờ trình chờ xử lý"; TP (người lập) nhận "Tờ trình không được phê duyệt"; PI nhận "Hồ sơ đã có quyết định — Từ chối" |

Đối chiếu DB: `research_proposals.status = rejected`, `proposal_decisions.decision = rejected`, `DECISION_PACKAGE` REJECTED với chuỗi `SUBMIT > FORWARD > REJECT@LEADERSHIP`.

`tests/reviewer-council-assignment.test.mjs` (opt-in DB) đã viết lại theo luật 5.11 (TP mời, ứng viên có lý lịch) và chạy trên DB tạm `docmans_assignment_test_*`: 3/3 PASS.

Chưa kiểm trong lượt này: người ký là thành viên hội đồng bị khóa (đã PASS ở QA vòng 2, K16, và `approval-routing-db.test.mjs`); IRB/nghiệm thu.

Lỗi nhỏ phát hiện (chưa sửa):
- Panel "Quyết định phê duyệt" ghi "6/7 phiếu đã gửi", trong khi panel tiến độ ghi 6/6; mẫu số 7 tính cả thư ký.
- Tờ trình do TP lập: TB vẫn thấy nút "Chuyển Trưởng phòng" và lịch sử ghi "Trưởng ban chuyển Trưởng phòng", dù tờ trình đi thẳng Ban giám đốc.
- Sau khi tờ trình hội đồng bị trả lại và đã lập lại, dòng lịch sử của tờ trình cũ không còn hiện bước "Trả lại" (DB vẫn có bước `RETURN`).
- Panel hội đồng không tự cập nhật trạng thái ngay sau thao tác chuyển hoặc trả lại ở panel tờ trình; tải lại trang thì đúng.
- Nội dung thông báo trả lại bị lặp tiền tố: "Thành lập hội đồng đánh giá: Hội đồng đánh giá: Mùa thu 2".

Updated: 2026-09-22. Implementation and both normal-UI terminal journeys verified.
Independent review pending. No commit or push requested or performed.

## Synthetic UI acceptance

| Outcome | Proposal | Current submission event | Decision |
| --- | --- | --- | --- |
| Approved | `97a5cfab-2e6f-4a11-814a-9326ee77ec28` | `f6a2cc66-bad9-48f8-a416-ffd437c333ef` | `9893e38b-e9c4-4b3d-b53c-bbbc160970cc` at 07:57 local |
| Rejected | `8bbf968f-d6b2-4a7d-a7d4-a2091293b91f` | `9a1113d6-8fbc-42ef-85b4-b088edccaaff` | `81beb8d5-a191-4434-9bf1-240b44f693d2` at 07:58 local |

Both records were created, supplied with required synthetic PDFs, submitted, assigned to
Staff, sent for supplements, edited and resubmitted through normal UI. This session then
confirmed completeness as `hdtien1`, assigned two reviewers (`researcher2`, `researcher3`)
and three committee members (`external1`–`external3`) as Head `nmphuong`, and submitted
all ten reviews through UI. Reviewer draft/save and submitted read-only mode were checked.
Staff monitoring showed 5/5 and named assignments on both records without synthesis controls.
Head separately saved, finalized and submitted each synthesis; `LEADERSHIP_APPROVAL_AUTHORITY` `tvtien` approved A
and rejected B through UI. No direct database/status writes, reset or reseed were used.

Final authenticated reads verified both terminal states, one decision each, package revision 2,
five immutable submitted reviews bound to each current submission, Staff named monitoring,
PI denial of internal endpoints, `RESEARCH_OVERSIGHT_AUTHORITY` read-only oversight and redacted leadership progress.
Read-only persistence inspection confirmed completeness, review submission, completion threshold,
synthesis draft/finalization/submission and decision history plus their corresponding audit actions.

## Checks run

- `npm run typecheck`: passed for API and web.
- `npm run build:api`: passed.
- `npm run build:web`: passed; web dev stopped first and restored afterwards.
- Focused Golden Flow/cardinality/assignment tests: 12 passed, 0 failed, 1 disposable-DB test skipped.
- `git diff --check`: passed.
- Twenty live negative API assertions passed before synthesis: PI/member candidate conflict,
  duplicate/incompatible duty, Staff assignment and all synthesis actions, premature Head draft,
  premature leadership package/approval, Oversight approval, PI internal endpoints, unassigned review
  access, submitted-review edit, reviewer decision, and wrong-proposal context token.
- One further live assertion denied submitting the saved synthesis draft before finalization.
- Prior handoff evidence: Head assignment before completeness denied (400), Staff assignment denied (403).
- Regression verifies a completeness event cannot replace the current submission snapshot,
  exact-version readiness binding, effective/active roster filtering and stale finalized source rejection.
- Post-decision API checks against the final build passed for both proposals and all five actor types.

## Known verification limits and policy gaps

- Disposable database integration test remains skipped; this is not integration-test proof.
- Broader legacy `proposals-st30.test.mjs`: 3 passed, 11 failed. Existing transaction mocks lack
  `tx.user.findUnique`; these failures predate this slice and were not rewritten wholesale.
- Capability source suite has a pre-existing whole-file role-regex failure (the officer panel
  already uses role-based section display). The changed action-list expectation was updated.
- Review reopening and recovery after finalized sources become invalid have no approved workflow;
  mutations fail closed rather than silently regenerating evidence.
- Reminder delivery, notification/export backends and other council positions remain outside
  implemented surfaces. Existing deadlines and overdue visibility are used.
- TypeSafe skill was read when requested. Both its live index and building-guide fetch failed;
  no AI integration was added because authorization and workflow rules are deterministic.
- The earlier browser approval-review usage failure was transient; subsequent approved normal
  UI operations completed. No alternate authentication bypass was used.

## Runtime and migration

Existing `20260921010000_proposal_review_golden_flow` migration was applied in the prior
session. This refinement adds no schema migration. Final local API/web listeners were restored
on 4000/3000. Unrelated `skills-lock.json` remains untouched.

## Story 5.6 / 5.7 / 5.8 — kiểm chứng UI ngày 08/11/2026 (phiên làm việc đêm)

Cách thao tác: đăng nhập, điền form và bấm nút làm trên UI. File PDF được gắn vào input bằng `DataTransfer`. `window.confirm` bị thay để tự đồng ý. Các kiểm tra ẩn/từ chối dùng `fetch` chạy từ trang. Môi trường: API `4001` (build mới), Web `3001`, DB dev. Migration `20261108230000_evaluation_admin_files` đã áp dụng. Kiểm thử bằng trình duyệt tích hợp, vì `agent-desktop` thiếu quyền Accessibility/Screen Recording của macOS. Hồ sơ: `cc36d963-6b91-4f9f-9c40-c0ccd3c1e8b8` ("Mùa thu 3", PI `int1`).

| Bước | Tác nhân | Kết quả |
|---|---|---|
| 5.6: tải biên bản họp hội đồng qua UI (`under_review`) | Thư ký hội đồng `test_internal05` | PASS: tệp `7de36648…` (`COUNCIL_MINUTES`) |
| 5.6: ẩn biên bản với người tham gia | PI `int1` | PASS: UI và API không liệt kê; tải theo id trả 404 |
| 5.6: quản lý xem biên bản | TP `nmphuong` | PASS: thấy trên UI, tải trả 200 |
| Bước chuẩn bị (gọi HTTP thật, không sửa DB) | 5 thành viên chấm phiếu; TP tổng hợp, chốt, trình; TB chuyển tiếp | Tờ trình `DECISION_PACKAGE` tới LEADERSHIP. TP là người lập nên không qua bước `HEAD_REVIEW` (đúng luật 5.9) |
| 5.7: từ chối PGĐ-KH và PGĐ-TD | `vndinh`, `ndbac` | PASS (gọi API với contextVersion hợp lệ, chạy từ trang): approve 403 "Chỉ lãnh đạo có thẩm quyền…", gói 403, hàng đợi 403; capability `ACTION_NOT_GRANTED`; UI không có nút Phê duyệt/Không phê duyệt |
| 5.7: hàng đợi và gói của GĐ | `tvtien` | PASS: hồ sơ có trong hàng đợi; gói có 6/7 phiếu, điểm ẩn, danh sách tệp (gồm biên bản, có nhãn tiếng Việt), bản tổng hợp |
| 5.8: phê duyệt kèm ghi chú nội bộ, tóm tắt công bố, yêu cầu tiếp theo | `tvtien` | PASS: hồ sơ chuyển `approved`, tờ trình đóng |
| 5.8: quyết định lần hai | `tvtien` | PASS: 400 kèm `currentStatus: approved`; không tạo quyết định thứ hai |
| 5.8: PI xem kết quả | `int1` | PASS: thẻ "Kết quả quyết định" theo `PublishedReviewSummaryV1`; không có ghi chú nội bộ; có thông báo `proposal.decided` |

Chưa kiểm trên UI:
- Nhánh không phê duyệt với code mới (đã được test DB và luồng 5.9/5.10 trước đó bao).
- Thư ký đề tài tải `MEETING_MATERIAL`: không có hồ sơ `under_review` nào có thư ký đề tài, và sau khi nộp thì không thêm thành viên được. Phần này chỉ được service test và test DB trigger bao.

### Bổ sung 09/11/2026 — quyền xem biên bản sau Codex review

Kiểm trên API 4001, hồ sơ `cc36d963`, biên bản `7de36648`, cả chi tiết hồ sơ và tải tệp:
- Thấy và tải được (200): TP `nmphuong`, GĐ `tvtien`, thư ký hội đồng `test_internal05`.
- Không thấy, tải trả 404: PGĐ-KH `vndinh`, PGĐ-TD `ndbac`, reviewer `test_internal01`, PI `int1`.
