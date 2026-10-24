# PM triage — báo cáo QA Codex, Hội đồng thẩm định

- Ngày: 24/10/2026. Đầu vào: `bao-cao-codex.md` cùng thư mục.
- Căn cứ đối chiếu: `_bmad-output/specs/spec-hoi-dong-tham-dinh.md` (§7, §8, §10, §11, §14, §16), `docs/permission-matrix.vi.md` §7.1–7.2, `docs/authorization-core-business-baseline.md` §3.
- Cách kiểm: đọc code tại `HEAD` (`ed1e0ff`), đối chiếu JSON bằng chứng. Chưa chạy test hay build. Thư mục `apps/api/dist` chưa có.
- Kết luận chung: báo cáo Codex đúng phần lớn. Có thêm **một lỗi quyền đọc mà Codex chấm PASS nhầm**: PP `dnbinh` ở K11. Nguyên nhân gốc của L01/L02/L04 nằm ở một dòng, nhưng **không phải mọi nơi đọc đều chung một predicate** (xem §2).

## 1. Bảng phán quyết

| Mục | Phán quyết | Nguyên nhân gốc (file:dòng) | Cách sửa tối thiểu | Ưu tiên | Gói |
| --- | --- | --- | --- | --- | --- |
| **L01** TB không đọc hồ sơ (K10 FAIL) | **Lỗi thật.** Matrix §7.1 cho TB `Xem¹`; baseline §3 dòng 203 ghi "TP, TB, PP, PGĐ-TD xem trong scope¹". `nmtrung` có scope `org-khti`. | `apps/api/src/proposals-shared/proposal-access.ts:136`: nhánh đọc theo scope chỉ có `isResearchManagementHead`, `isResearchOversightAuthority`, `isLeadership`. | Thêm `isResearchBoardHead(user) \|\| isResearchManagementDeputyHead(user)` vào nhánh dòng 136. Không cần gate trạng thái, vì ghi chú ¹ chỉ yêu cầu scope. | P0 (chặn K10, K12–K16) | A |
| **L02** PGĐ-KH không đọc hồ sơ (K12) | **Lỗi thật.** Matrix §7.1 cho PGĐ-KH `Xem²`; baseline cột PGĐ-KH ghi "Như GĐ (xem)". `vndinh` có scope `org-khti` (K12.json). | Cùng dòng `proposal-access.ts:136`: thiếu `isScienceDeputyDirector`. | Thêm `isScienceDeputyDirector(user)` cạnh `isLeadership(user)`. Ghi chú ² nghĩa là "đã nộp trở đi": xem điểm cần chốt ở §2. | P0 | A |
| **L04 (PM phát hiện)** PP `dnbinh` không đọc hồ sơ (K11) | **Lỗi thật, Codex chấm PASS nhầm.** K11 chỉ kiểm "không có nút ký", phần đó vẫn PASS. Còn việc từ chối đọc thì sai matrix §7.1 (PP `Xem¹`). | Cùng `proposal-access.ts:136`. | Gộp vào sửa L01 (`isResearchManagementDeputyHead`). | P1 | A |
| **L02b (PM phát hiện)** Đọc tiến độ đánh giá thiếu PGĐ-KH và PP | **Lỗi thật, không chặn kịch bản K nào.** Matrix "Xem tiến độ đánh giá" cho GĐ/PGĐ-KH/PGĐ-TD/TP/PP/TB `Xem¹`. Panel hội đồng của PGĐ-KH vẫn hiện vì đi qua `getCouncil` → `canSignApproval`. | Predicate riêng, không dùng `canReadProposal`: `apps/api/src/permissions/proposal-capability-v1.ts:135` và `apps/api/src/proposal-evaluations/proposal-evaluation-support.ts:271` (`assertEvaluationReadScope`). | Ở cả hai dòng, thêm `isScienceDeputyDirector` và `isResearchManagementDeputyHead` (import từ `proposal-access.ts`). Giữ kiểm scope và trạng thái như cũ. | P2 | A |
| **L03** Lời mời đã từ chối biến mất khỏi `/my-reviews` (K7 FAIL) | **Lỗi thật so với §14 K7.** K7 yêu cầu người mời thấy "nhập lý do → dòng 'Đã từ chối'", trước câu về `nmphuong`. Hành vi hiện tại là chủ ý của Story 5.11 và đang bị test khóa. | `apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts:468` có `if (assignment.invitationStatus === "declined") continue;`. Test khóa hành vi cũ: `tests/approval-routing-db.test.mjs:359` khẳng định `listMyAssignments(declined)` trả `[]`. | Xóa dòng 468: dòng `declined` sẽ rơi vào nhánh `preview` vì `grantsReviewAccess` = false. Sửa test dòng 359: kỳ vọng 1 phần tử `access: "preview"`, `invitationStatus: "declined"`, `invitationStatusLabel: "Đã từ chối"`. Không cần sửa UI: `reviewer-queue-panel.tsx:80/86` đã ẩn nút khi khác `invited` và hiện nhãn. Sau khi thu hồi, `status = revoked` nên dòng vẫn tự biến mất qua bộ lọc status. | P1 | B |
| **U01** Tiến độ hiện "0/7" dù thư ký không chấm | **Lỗi thật.** §7.4 quy định chỉ tính thành viên chấm. Backend đã trả `scoringMemberCount` (`proposal-evaluation-support.ts:431`). | `apps/web/src/components/research-proposals/proposal-evaluation-panel.tsx:216` dùng `progress.activeAssignmentCount` làm mẫu số. | Đổi thành `progress.scoringMemberCount ?? progress.activeAssignmentCount`. | P2 | C |
| **U02** Bảng hội đồng/lời mời không có dạng mobile | **Lỗi thật** so với §10 ("`data-table` + `mobile-list`"). Vẫn thao tác được nhờ cuộn ngang nên không mất chức năng. | `proposal-council-panel.tsx:211` và `reviewer-queue-panel.tsx:67` (bảng Lời mời) chỉ có `.table-wrap`. CSS `globals.css:1774` (`.table-wrap:has(+ .mobile-list)`) chỉ ẩn bảng khi ngay sau nó có `.mobile-list`. | Thêm `<div className="mobile-list">` liền sau mỗi `.table-wrap`, theo đúng mẫu `reviewer-queue-panel.tsx:148` (`article.list-card`). Mỗi card: họ tên/tên đề tài, vị trí, trạng thái (`StatusBadge`), hạn, người mời, lý do từ chối (panel hội đồng), cùng các nút y như trên bảng (Thu hồi / Chấp nhận / Từ chối). | P2 | C |
| **U03** Nhãn tiếng Anh | **Có thật, nhưng có từ trước tính năng này**, không phải hồi quy của hội đồng. | `proposal-detail-workspace.tsx:638` ("Team members"), `:686` ("Staff có thể…"), `apps/web/src/app/proposals/[id]/page.tsx:24` ("kiểm tra readiness"). | Đổi chuỗi: "Thành viên nhóm", "Chuyên viên có thể…", "kiểm tra điều kiện nộp". `page.tsx` nằm ngoài phạm vi FE2 ở §16, nên gán riêng cho gói C kèm ghi chú. | P3 | C |
| **D01** Thiếu lý lịch cho `tvtien`, `nmtrung` | **Thiếu dữ liệu thật, không phải lỗi bộ lọc.** Ứng viên đủ điều kiện khi `user.researcherProfile` khác null (`proposal-review-assignments.service.ts:104`, `:879`). Điều kiện này không lọc theo đơn vị quản lý lý lịch. | `apps/api/prisma/seed-reviewer-test-accounts.mjs` chỉ tạo `test_*`; `seed.mjs` chỉ có lý lịch cho `vndinh` (dòng 270–304). | **Đề xuất:** mở rộng `seed-reviewer-test-accounts.mjs`, **không** sửa `seed.mjs` (đang có thay đổi chưa commit của người dùng). Xem §4. | P1: §11.5 không kiểm được nếu thiếu dữ liệu này | D (cần người dùng duyệt) |

## 2. Phạm vi của "sửa gốc một chỗ"

Sửa `canReadProposal` (`proposal-access.ts:136`) đủ để mở mọi bề mặt dùng chung predicate này:

- danh sách hồ sơ: `research-proposals.service.ts:216` (`projectProposalList`, kể cả hàng đợi quyết định);
- chi tiết: `:233` (`getProposal`);
- readiness: `:368`, đi qua `assertReadableProposal` (`:1234`);
- tệp hồ sơ: `:581`, cũng qua `assertReadableProposal`;
- capability `proposal.read` / `file.read`: `proposal-capability-v1.ts:133` dùng `input.canRead`, lấy từ `research-proposals.service.ts:1285`.

Các predicate riêng **không** đi qua `canReadProposal`, đã kiểm:

- `canViewApproval` (`approval-routing.ts:127`, đọc tờ trình): đã có TB, PP, GĐ, PGĐ-KH. **Không cần sửa.**
- `getCouncil` (`proposal-evaluation-council.service.ts:93–98`): TB qua `assertProposalManagementWriteScope`, PGĐ-KH qua `canSignApproval`. **Không cần sửa.**
- `assertEvaluationReadScope` (`proposal-evaluation-support.ts:271`) và capability `proposal.review.progress.read` (`proposal-capability-v1.ts:135`): thiếu PGĐ-KH và PP, ghi ở L02b.

**Điểm cần chốt trước khi sửa (gói A).** Ghi chú ² của matrix yêu cầu GĐ/PGĐ-KH chỉ xem hồ sơ "đã nộp trở đi", nhưng nhánh `isLeadership` hiện không gate trạng thái. Trong khi đó `tests/proposals-ep03.test.mjs:977` kỳ vọng GĐ nhận 403 với hồ sơ nháp. Dev chạy baseline trước:

```bash
cd /Users/Super/DocManS && npm run build:api && node --test tests/proposals-ep03.test.mjs
```

- Nếu test 977 **đang pass**: thêm `isScienceDeputyDirector` thẳng vào nhánh dòng 136.
- Nếu test 977 **đang fail**: tách GĐ/PGĐ-KH thành nhánh riêng `if ((isLeadership(user) || isScienceDeputyDirector(user)) && isWorkflowVisibleStatus(proposal.status)) return true;`. `isWorkflowVisibleStatus` đã được import trong file. Chủ hồ sơ nháp vẫn đọc được qua `ownerId` ở cuối hàm.

Ghi nhận, không sửa lần này: `research-proposals.service.ts:1286` (`canExposeEvaluationSummaryStatus`) và `:1338` (`reviewWorkflow`) chỉ hiện cho TP/CV/GĐ, chưa có TB. Đây chỉ là trường hiển thị, không chặn kịch bản nào.

## 3. Gói sửa cho dev Sonnet (không chồng file)

| Gói | File độc quyền | Thay đổi | Test và lệnh kiểm |
| --- | --- | --- | --- |
| **A** Quyền đọc | `apps/api/src/proposals-shared/proposal-access.ts`; `apps/api/src/permissions/proposal-capability-v1.ts`; `apps/api/src/proposal-evaluations/proposal-evaluation-support.ts`; `tests/proposals-ep03.test.mjs` | L01, L02, L04, L02b như bảng trên, kèm điểm cần chốt ở §2. | Thêm **một** test hồi quy vào `proposals-ep03.test.mjs`: TB, PP, PGĐ-KH có scope đọc được hồ sơ đã nộp (`getProposal`); PGĐ-KH ngoài scope bị 403; PGĐ-KH bị 403 với hồ sơ nháp. Test phải fail trên code cũ. Chạy: `npm run build:api && node --test tests/proposals-ep03.test.mjs tests/proposal-review-golden-flow.test.mjs tests/approval-routing-db.test.mjs`, rồi `npm run typecheck`. |
| **B** Lời mời đã từ chối | `apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts`; `tests/approval-routing-db.test.mjs` | L03: xóa dòng 468; sửa khẳng định dòng 359. | `npm run build:api && node --test tests/approval-routing-db.test.mjs` (cần PostgreSQL local). Gói A cũng chạy file test này nhưng **không sửa** nó. |
| **C** UI | `apps/web/src/components/research-proposals/proposal-evaluation-panel.tsx`; `proposal-council-panel.tsx`; `reviewer-queue-panel.tsx`; `proposal-detail-workspace.tsx`; `apps/web/src/app/proposals/[id]/page.tsx` | U01, U02, U03. | Không thêm test UI (spec §12). Chạy `npm run typecheck` và `npm run build:web`; chỉ sửa `tests/proposal-capability-ui-source.test.mjs` nếu nó vỡ. |
| **D** Dữ liệu thử | `apps/api/prisma/seed-reviewer-test-accounts.mjs` | D01. **Chỉ làm khi người dùng duyệt.** | `node apps/api/prisma/seed-reviewer-test-accounts.mjs` trên DB local, sau đó assert số lý lịch. |

A, B, C, D chạy song song được. Cả A và B đều chạm `apps/api/src/proposal-evaluations/`, nhưng ở hai file khác nhau.

## 4. D01: đề xuất xử lý dữ liệu

**Đề xuất mở rộng `seed-reviewer-test-accounts.mjs`, không chỉ ghi chú.** Lý do quyết định là §11.5: "Mời TB duy nhất (`nmtrung`) bị `ROUTING_ACTOR_UNAVAILABLE`" là điều kiện hoàn thành, và không kiểm được khi `nmtrung` chưa có lý lịch (K4 ghi rõ lỗi sẽ thành `CANDIDATE_NOT_ELIGIBLE`). K16 là tùy chọn, còn §11.5 thì không.

Thay đổi đề xuất, idempotent, cộng thêm vào script (không đụng `seed.mjs`):

- Thêm bước upsert `researcherProfile` với `update: {}` cho `user-leadership` (`tvtien`) và `user-board-head-nmtrung`. Theo mẫu lý lịch `vndinh` ở `seed.mjs:270–304`: `profileType: "INTERNAL"`, `linkedUserId`, `fullName` / `fullNameKey`, `status: "ACTIVE"`, `createdById: "user-admin"`. Kèm `accountLinks` ACTIVE, đúng như cách script đang tạo cho `test_*`.
- `findUniqueOrThrow` hai user trước khi upsert, để script fail rõ nếu base seed chưa chạy.
- Sửa chú thích đầu file ("existing accounts are untouched") thành "chỉ thêm lý lịch cho `tvtien`, `nmtrung`; không đổi tài khoản".
- Assert cuối file đếm thêm 2 lý lịch này.

Tác động dự kiến:

- `nmtrung` vẫn không hiện trong danh sách ứng viên vì bị lọc #8, và mời trực tiếp qua API sẽ trả `ROUTING_ACTOR_UNAVAILABLE`.
- `tvtien` mời được: nhóm người ký có `tvtien` và `vndinh`, nên `tvtien` không phải người ký duy nhất (`routingSoleHolderIds`, `proposal-review-assignments.service.ts:148`).

## 5. Kịch bản Codex chạy lại sau khi sửa

**Điều kiện môi trường**

- Khởi động lại API (:4001) và web (:3001) **từ repo này sau khi A, B, C đã vào**. Codex ghi nhận chưa xác minh được bản build đang chạy.
- Nếu gói D được duyệt: chạy `node apps/api/prisma/seed-reviewer-test-accounts.mjs` trên đúng DB QA, trước khi chạy K4 và K16.
- Giữ nguyên dữ liệu thử hiện có. Không cần tạo lại hồ sơ.

| Kịch bản | Dữ liệu và bước chuẩn bị | Kỳ vọng chính |
| --- | --- | --- |
| K4 | Cần D. Hồ sơ 02. Tìm `nmtrung` ở vị trí Ủy viên trên UI, rồi gọi `POST :id/review-assignments` trực tiếp. | Không hiện trên UI; API trả `400 ROUTING_ACTOR_UNAVAILABLE`. Ghi lại mã thực tế. |
| K7 | Hồ sơ 02 đã có lời mời `test_external10` bị từ chối: reload `/my-reviews` bằng `test_external10`. Thêm một lần từ chối mới (dùng tài khoản `test_*` chưa dùng) để kiểm cả luồng. | Dòng "Đã từ chối", không có nút trả lời. TP vẫn thấy badge, lý do và blocker. Sau khi TP thu hồi, dòng biến mất khỏi `/my-reviews`. |
| K10 | Hồ sơ 01 đang ở `BOARD_REVIEW`: chạy tiếp, không cần chuẩn bị. | TB đọc được hồ sơ, thấy `RoutingStatus` và nút Chuyển. Toàn bộ chuỗi trả lại, lập lại, duyệt kết thúc ở "Chờ Ban giám đốc ký". |
| K11 | Chạy lại với `ndbac`, `dnbinh`, `nmtrung`. | Cả ba **đọc được** hồ sơ (PP và TB nay có quyền đọc theo matrix) và **không** có nút ký. |
| K12 | Sau K10. | `vndinh` đọc được, ký được; "Đã thành lập" kèm ngày; audit `establish-evaluation-council`. Thêm bước: `vndinh` mở tiến độ đánh giá, không còn 403 (L02b). |
| K13 | Sau K12. | Chấm 4 tiêu chí; phiếu khóa sau khi gửi; tiêu đề có vị trí. Chụp ảnh mobile của form chấm thật. |
| K14 | Sau K12. | Thư ký có "Soạn biên bản", phiếu ẩn danh, lưu nháp được, không có Chốt/Trình. |
| K15 | Sau K13, đủ 6 phiếu. | Tiến độ hiện "x/6" (U01); "Còn N phiếu" không tính thư ký; chốt và trình xong thì hồ sơ sang "Chờ phê duyệt". |
| K16 | Cần D. Hồ sơ 02: TP thu hồi `test_external10` (có lý do), mời `tvtien` làm Ủy viên, rồi điền các vị trí còn lại bằng tài khoản chưa dùng (`test_internal06–10`, `test_external04–09`). Đủ 7 người nhận lời thì CV lập tờ trình, TB chuyển, TP duyệt. | `tvtien` thấy nút ký bị khóa với lý do xung đột; `vndinh` ký được. |
| U02 (mobile) | Viewport 390×844: panel hội đồng (TP) và `/my-reviews` (thành viên). | Hiện dạng thẻ, không cuộn ngang; nút Thu hồi / Chấp nhận / Từ chối thấy ngay. |
| U03 | Xem nhanh chi tiết hồ sơ. | Không còn "Team members", "Staff", "readiness". |

Không chạy lại K1–K3, K5–K6, K8–K9: các kịch bản này đã PASS và không bị gói nào chạm tới. Riêng K9 chỉ cần quan sát lại khi chạy K10.

## 6. Chưa kiểm trong lần triage này

- Chưa chạy test hay build (`apps/api/dist` chưa có), nên chưa biết test `proposals-ep03.test.mjs:977` đang pass hay fail.
- Chưa xác minh bản API đang chạy ở :4001 có khớp `HEAD` không.
- Chưa rà toàn bộ §11 ngoài các mục trong báo cáo.
