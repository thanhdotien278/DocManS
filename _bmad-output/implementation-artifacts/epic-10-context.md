# Epic 10 Context: Hội đồng và hồ sơ đạo đức

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Cho phép người được QT cấu hình (mặc định TP¹/TB¹) thành lập hội đồng (đánh giá, nghiệm thu, IRB), CV³/TB¹/TP¹ lập tờ trình, chủ nhiệm (PI) hoặc CV³ phụ trách lập và nộp hồ sơ đạo đức (IRB), thành viên/thư ký hội đồng và IRB đánh giá đúng phân công, và GĐ hoặc PGĐ-KH ký thành lập hội đồng và giấy IRB. Mọi bước giữ đúng quyền theo record, che giấu đánh giá nội bộ và có audit. Hiện chỉ phần hội đồng đánh giá (thẩm định) có đặc tả triển khai (`_bmad-output/specs/spec-hoi-dong-tham-dinh.md`, story 10-1/2/5/6/7/8 ở trạng thái `review`); phần nghiệm thu và toàn bộ hồ sơ đạo đức (10.3, 10.4, 10.9 và phần IRB của các story còn lại) còn `backlog`.

## Stories

- Story 10.1: Lập kế hoạch hội đồng, thành viên và căn cứ liên quan
- Story 10.2: Thư ký khoa học hỗ trợ vận hành hội đồng
- Story 10.3: Tạo, hoàn thiện và nộp hồ sơ đạo đức
- Story 10.4: Kiểm tra hồ sơ đạo đức và xử lý bổ sung
- Story 10.5: Phân công hội đồng và reviewer với eligibility/conflict
- Story 10.6: Thành viên hội đồng hoặc reviewer nộp đánh giá được phân công
- Story 10.7: Theo dõi, tổng hợp và trình kết quả hội đồng
- Story 10.8: Quyết định hội đồng hoặc hồ sơ đạo đức
- Story 10.9: Contract tích hợp hội đồng và hồ sơ đạo đức

## Requirements & Constraints

- Mô hình 10 vai trò, mỗi tài khoản đúng một vai trò hệ thống: QT (`SYSTEM_ADMIN`), GĐ (`LEADERSHIP_APPROVAL_AUTHORITY`), PGĐ-KH (`SCIENCE_DEPUTY_DIRECTOR`), PGĐ-TD (`RESEARCH_OVERSIGHT_AUTHORITY`, chỉ theo dõi), TP (`RESEARCH_MANAGEMENT_HEAD`), PP (`RESEARCH_MANAGEMENT_DEPUTY_HEAD`), TB (`RESEARCH_BOARD_HEAD`), CV (`RESEARCH_MANAGEMENT_STAFF`), NCV (`RESEARCHER_INTERNAL_USER`), NNB (`EXTERNAL_RESEARCHER_USER`). PI, thành viên/thư ký đề tài, reviewer, thành viên hội đồng/IRB là quan hệ theo bản ghi, không bao giờ thành vai trò hệ thống.
- **Hồ sơ đạo đức (IRB):** PI (quan hệ lấy từ source record, không từ vai trò toàn cục) hoặc CV³ phụ trách tạo, hoàn thiện, nộp; dossier lưu source record/version, applicant, organization, trạng thái đầu. Dữ liệu có cấu trúc được lưu theo section, tệp đi qua module files; truy cập metadata/tệp kiểm tra cả quyền dossier lẫn quyền xem nguồn. Nộp chỉ khi đạt readiness và có `ethics-dossier.submit`; chuyển trạng thái nguyên tử, khóa phiên bản đã nộp. Thành viên/thư ký chỉ đóng góp nháp/tệp, không có quyền nộp. Nguồn tài liệu chỉ nêu `ethics-dossier.submit`; các action `ethics-dossier.*` khác (tạo, kiểm tra, bổ sung) chưa được định danh trong tài liệu, không tự đặt tên.
- **Kiểm tra đầy đủ/bổ sung IRB:** TB¹ hoặc CV³ phụ trách làm (PRD còn ghi "TB cho IRB: chờ xác nhận"); yêu cầu bổ sung phải có lý do, section/tệp, hạn; PI nhận thông báo tối thiểu; nộp lại tạo phiên bản mới, giữ truy vết các bản trước. TP, PP, BGĐ, thư ký, thành viên hội đồng không có quyền này.
- **Thành lập hội đồng:** QT cấu hình theo loại (`EVALUATION`, `ACCEPTANCE`, `IRB`) role được thành lập/mời và số thành viên (mặc định TP, TB; IRB mặc định 5, khoảng 3–15); QT chỉ cấu hình, không tự lập/mời. CV chỉ hành động khi QT tích role CV và trên hồ sơ mình phụ trách.
- **Mời thành viên:** ứng viên là tài khoản active có lý lịch khoa học (mọi vai trò trừ QT, kể cả ngoài đơn vị); phải chấp nhận hoặc từ chối (từ chối bắt buộc lý do). Tờ trình `EVALUATION_COUNCIL`/`ACCEPTANCE_COUNCIL`/`IRB_COUNCIL` chỉ được lập khi mọi thành viên đã chấp nhận; thành viên chỉ đọc hồ sơ sau khi GĐ hoặc PGĐ-KH ký. Chặn trình khi thiếu số lượng thành viên là đề xuất chờ chủ sản phẩm (P2), chưa bắt buộc.
- **Xung đột:** PI, thành viên/thư ký đề tài, người rà soát/duyệt tờ trình, người ký BGĐ trên cùng record và chính người phân công bị từ chối (`CONFLICT_DENIED`/`SOURCE_PARTICIPATION_CONFLICT`). Một người chỉ giữ tối đa một vị trí active (chair, thư ký, thành viên, reviewer) trong cùng evaluation context; chồng lấn khoảng thời gian bị từ chối (`DUPLICATE_OR_OVERLAPPING_ASSIGNMENT`, `INCOMPATIBLE_COUNCIL_POSITION`); đánh giá đã lưu vẫn giữ xung đột với consolidation/ký (`REVIEWER_DECISION_CONFLICT`). Đổi vị trí phải kết thúc vị trí cũ trước; request đồng thời phải serialize.
- **Thư ký hội đồng/IRB:** chỉ việc hành chính (chương trình, tài liệu, biên bản, theo dõi, soạn dự thảo kết luận); không chấm điểm, không phân công, không duyệt/quyết định.
- **Ký:** GĐ hoặc PGĐ-KH ký thành lập hội đồng (đánh giá, nghiệm thu, IRB) và `IRB_CERTIFICATE`; người ký không được là PI/participant/reviewer/thành viên hội đồng của record và không có xung đột; TP/PP/TB/CV/PGĐ-TD/QT không ký. Quyết định, trạng thái record, history, audit hoàn tất nguyên tử, không lặp, không ủy quyền.
- **Che giấu:** trước công bố cuối chỉ trả trạng thái workflow chung; sau đó chỉ `PublishedReviewSummaryV1` hoặc kết quả đạo đức đã duyệt; không lộ danh tính reviewer, điểm/nhận xét thô, consolidation nội bộ, assignment ẩn qua API, tệp, lịch sử, thông báo hay số đếm.
- Tờ trình đi CV → TB (`BOARD_REVIEW`) → TP (`HEAD_REVIEW`) → BGĐ (`LEADERSHIP`); trả lại cần lý do; không bỏ bước, không tự rà soát; TB/TP chỉ trong scope đơn vị.

## Technical Decisions

- Domain sở hữu quan hệ: module `councils`, `ethics-dossiers`, `council-evaluations`, `files`, `audit-logs` tự quản vòng đời; không dùng một bảng participation chung. Quan hệ liên quan: `COUNCIL_MEMBER`, `COUNCIL_SCIENTIFIC_SECRETARY` (map sang `COUNCIL_SECRETARY`), `ETHICS_REVIEWER_ASSIGNMENT`, `REVIEWER_ASSIGNMENT`; chair/secretary/member/reviewer là một nhóm vị trí loại trừ lẫn nhau.
- Evaluation context key = `(sourceDomain, sourceRecordId, evaluationContextId)`, do nguồn sở hữu và bất biến; thiếu/lệch trả `STALE_ASSIGNMENT_CONTEXT`. Endpoint council/ethics mang context ID và version trong mutation token; mutation so `ContextVersionTokenV1` trong cùng transaction, lệch thì `CONTEXT_VERSION_MISMATCH`. Khoảng hiệu lực UTC nửa mở `[effectiveFrom, effectiveUntil)`; lịch sử bất biến.
- Hội đồng đánh giá (đã có spec): không có model `Council`/`CouncilMember`, thành viên là các hàng `ProposalReviewAssignment` của vòng hiện tại; cấu hình lưu `SystemParameter` khóa `council_formation.EVALUATION|ACCEPTANCE|IRB`; `COUNCIL_TYPES`, mặc định và khoảng thành viên ở `apps/api/src/proposals-shared/council-formation.ts`. Nghiệm thu và IRB mới dùng chung cấu hình, hàm policy và các `kind` tờ trình, chưa có lưu trữ thành viên/luồng/UI.
- Tờ trình dùng `approval_submissions`, kind `IRB_COUNCIL`/`IRB_CERTIFICATE`/`EVALUATION_COUNCIL`/`ACCEPTANCE_COUNCIL`, signer `DIRECTOR_OR_SCIENCE_DEPUTY` (code ở `apps/api/src/proposals-shared/approval-routing.ts`); một tờ trình mở cho mỗi kind và subject.
- Action `PermissionActionV1` là chuỗi namespaced khớp chính xác (`packages/permissions`). Nhóm non-delegable: phân công reviewer/hội đồng, nộp/chấm đánh giá, lộ danh tính, đổi thành viên, mọi hành động duyệt/ký/final decision và mọi action tờ trình; action lạ mặc định non-delegable. Deny thắng allow; `ViewerAuthorizationV1` chỉ trả quan hệ của chính viewer, hành động bị khóa kèm code/reason.
- Mọi đường (bulk, import, API trực tiếp, admin) phải qua cùng mutation của module sở hữu; mutation recheck và serialize theo candidate/context.
- Nguồn chỉ tích hợp khi contract-complete (lifecycle, disclosure, conflict, file, version); consumer (nhắc việc, tìm kiếm, dashboard, báo cáo) không đọc trực tiếp bảng council/ethics; item bị chặn do xung đột dùng minimum blocked projection; liên kết văn bản cần action link đúng ở cả hai phía; nguồn/liên kết unresolved/stale/partial thì cả response tổng hợp fail closed.
- Quy ước: tài liệu `.md` bằng tiếng Việt; test chỉ thêm cho hành vi quan sát được hoặc hồi quy đáng tin, ưu tiên mở rộng test sẵn có.

## UX & Interaction Patterns

- Mọi màn hình chi tiết hiển thị action được phép/bị chặn từ backend: action không liên quan (`ACTION_NOT_GRANTED`) ẩn hẳn khu vực; action liên quan nhưng bị chặn (`CONFLICT_DENIED`, `WORKFLOW_STATE_DENIED`) vẫn hiển thị, vô hiệu hóa kèm lý do.
- Màn đánh giá `/reviews/:assignmentId` của reviewer/thành viên/IRB: lưu nháp, nộp một lần, sau nộp khóa trường, sửa tạo phiên bản có kiểm soát; không thấy đánh giá hay consolidation của người khác. Trước khi chấp nhận lời mời chỉ thấy tiêu đề, vai trò, hạn, người mời.
- Panel quyết định: GĐ/PGĐ-KH ký thành lập hội đồng/IRB và giấy IRB (kèm xác nhận); bước TB rà soát/TP duyệt là chuyển tiếp hoặc trả lại tác giả kèm lý do.
- Tìm ứng viên phân công qua tài khoản active (id, displayName, username), hiển thị kết quả conflict an toàn; ô ngày không có giờ/phút.

## Cross-Story Dependencies

- 10.1 là nền: cấu hình hội đồng, vòng đời thành viên, quy tắc chấp nhận/từ chối và chặn xung đột; 10.2, 10.5, 10.6, 10.7, 10.8 dựa trên đó.
- 10.3 → 10.4 → (10.1/10.5 lập hội đồng IRB, mời thành viên) → 10.6 → 10.7 (kết luận IRB, lập `IRB_CERTIFICATE`) → 10.8 (GĐ/PGĐ-KH ký).
- 10.7 và 10.8 dùng luồng tờ trình Story 5.9; 10.3/10.6 dùng module files; 10.1/10.9 dùng văn bản pháp lý Epic 9; 10.5 dùng chung chuẩn compatibility/multiplicity với Epic 5.
- 10.9 phải xong trước khi Epic 11 (thông báo, nhắc việc, “Của tôi”) và dashboard/báo cáo tích hợp nguồn council/ethics.
- Lưu ý: phần ethics dossier chưa có code trong repo; lược đồ dossier, trạng thái, danh mục section/tệp bắt buộc và định nghĩa readiness chưa được chốt trong planning artifacts, cần quyết định khi tạo story 10.3.
