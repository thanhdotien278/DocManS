# DocManS diagram overview

Source of truth: [`../user-flows.md`](../user-flows.md); role rules follow
[`../permission-matrix.md`](../permission-matrix.md) §7.

Rounded nodes are user or role actions, rectangles are system states or
responses, and diamonds are decisions. `-.->` marks a policy boundary or an
alternative path.

```mermaid
flowchart LR
  subgraph actors["Actors"]
    admin["QT — SYSTEM_ADMIN"]
    director["GĐ — LEADERSHIP_APPROVAL_AUTHORITY"]
    science["PGĐ-KH — SCIENCE_DEPUTY_DIRECTOR"]
    oversight["PGĐ-TD — RESEARCH_OVERSIGHT_AUTHORITY"]
    head["TP — RESEARCH_MANAGEMENT_HEAD"]
    deputy["PP — RESEARCH_MANAGEMENT_DEPUTY_HEAD"]
    board["TB — RESEARCH_BOARD_HEAD"]
    staff["CV — RESEARCH_MANAGEMENT_STAFF"]
    internal["NCV — RESEARCHER_INTERNAL_USER"]
    external["NNB — EXTERNAL_RESEARCHER_USER"]
    reviewer["Record assignment: reviewer, council or IRB member"]
  end

  intake(["Mở đợt tiếp nhận"])
  draft(["Tạo bản nháp"])
  submitted["Đã nộp"]
  review["Đang thẩm định / đánh giá"]
  supplement["Yêu cầu bổ sung"]
  resubmitted["Đã nộp lại"]
  routing["Tờ trình: CV lập → TB rà soát → TP duyệt"]
  ready["Chờ quyết định"]
  decision{"Phê duyệt?"}
  approved["Đã phê duyệt"]
  rejected["Không phê duyệt"]
  proposal_archive["Đóng / lưu trữ"]
  project_create(["Tạo đề tài"])
  preparation["Chuẩn bị triển khai"]
  active["Đang thực hiện"]
  suspended["Tạm dừng"]
  awaiting["Chờ nghiệm thu"]
  acceptance{"Nghiệm thu đạt?"}
  accepted["Đã nghiệm thu"]
  not_achieved["Không đạt"]
  project_archive["Đóng / lưu trữ"]
  withdrawn["Đã rút"]

  intake --> draft --> submitted --> complete{"Hồ sơ đủ điều kiện?"}
  complete -- "Chưa đủ" --> supplement --> resubmitted --> review
  complete -- "Đủ" --> review
  review --> routing --> ready --> decision
  routing -. "Trả về người lập kèm lý do" .-> review
  decision -- "Không phê duyệt" --> rejected --> proposal_archive
  decision -- "Phê duyệt" --> approved --> project_create --> preparation --> active
  active -. "Tạm dừng" .-> suspended
  suspended -. "Tiếp tục" .-> active
  active --> awaiting --> acceptance
  acceptance -- "Đạt" --> accepted --> project_archive
  acceptance -- "Không đạt" --> not_achieved --> project_archive
  submitted -. "Yêu cầu rút được phê duyệt" .-> withdrawn --> proposal_archive

  admin -. "Tài khoản, role và scope" .-> intake
  head -. "Tạo / mở / đóng đợt" .-> intake
  staff -. "Tạo / mở / đóng đợt" .-> intake
  internal -. "PI sở hữu bản nháp (mọi role trừ QT/NNB)" .-> draft
  board -. "Kiểm tra đầy đủ / bổ sung" .-> complete
  staff -. "Hồ sơ được giao: kiểm tra, phân công, tổng hợp, lập tờ trình" .-> review
  head -. "Phân công, tổng hợp trong scope" .-> review
  reviewer -. "Assignment đúng record; chấm (mọi role trừ QT)" .-> review
  external -. "Chỉ reviewer / hội đồng / IRB / thành viên" .-> reviewer
  board -. "Rà soát tờ trình" .-> routing
  head -. "Duyệt tờ trình trình BGĐ" .-> routing
  science -. "Ký thành lập hội đồng, IRB, nghiệm thu, gia hạn, điều chỉnh" .-> review
  director -. "Duy nhất phê duyệt đề tài + kinh phí, thanh lý" .-> decision
  oversight -. "Chỉ theo dõi; kinh phí tổng hợp" .-> submitted
  deputy -. "Chỉ theo dõi trong scope" .-> submitted
```

The `Yêu cầu điều chỉnh / gia hạn`, notification, file, version, and audit
details are shown in the focused diagrams below.
