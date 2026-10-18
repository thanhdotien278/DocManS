# Approval flow

```mermaid
flowchart TD
  submitted["Proposal: Đã nộp"]
  completeness(["TB / CV phụ trách: kiểm tra đầy đủ và thủ tục"])
  complete{"Hồ sơ đủ điều kiện?"}
  supplement["Yêu cầu bổ sung; nêu lý do và hạn"]
  pi_correct(["PI: bổ sung hoặc chỉnh sửa"])
  resubmit(["PI: duyệt nội dung cuối và nộp lại"])
  assign(["TP / TB / CV phụ trách: phân công phản biện hoặc mời hội đồng"])
  accepted_all{"Mọi thành viên hội đồng đã chấp nhận?"}
  council_sign(["Tờ trình hội đồng: CV → TB → TP; GĐ hoặc PGĐ-KH ký thành lập"])
  review(["Reviewer hoặc council: xem đúng gói được giao"])
  score(["Reviewer hoặc council (mọi role trừ QT, khi được mời): chấm, nhận xét và khuyến nghị"])
  consolidate(["TP / TB / CV phụ trách hoặc thư ký hội đồng: tổng hợp và chốt đánh giá"])
  draft_tt(["CV phụ trách: lập tờ trình phê duyệt"])
  tb_review{"TB: rà soát tờ trình"}
  tp_approve{"TP: duyệt, trình Ban giám đốc"}
  returned["Trả về người lập; bắt buộc nêu lý do"]
  ready["Proposal: Chờ quyết định"]
  authority["GĐ — LEADERSHIP_APPROVAL_AUTHORITY: xem hồ sơ đủ điều kiện"]
  conflict{"Có conflict trên record?"}
  decision{"Phê duyệt đề tài và kinh phí?"}
  approved["Proposal: Đã phê duyệt"]
  rejected["Proposal: Không phê duyệt"]
  archive["Đóng / lưu trữ; giữ lịch sử"]
  project(["CV phụ trách: tạo đề tài từ proposal đã duyệt"])

  submitted --> completeness --> complete
  complete -- "Chưa đủ" --> supplement --> pi_correct --> resubmit --> completeness
  complete -- "Đủ" --> assign
  assign -- "Phản biện" --> review
  assign -- "Hội đồng" --> accepted_all
  accepted_all -- "Có" --> council_sign --> review
  accepted_all -- "Chưa" --> assign
  review --> score --> consolidate --> draft_tt --> tb_review
  tb_review -- "Chuyển" --> tp_approve
  tb_review -- "Trả về" --> returned
  tp_approve -- "Trình BGĐ" --> ready
  tp_approve -- "Trả về" --> returned
  returned --> draft_tt
  ready --> authority --> conflict
  conflict -- "Có" --> denied["Từ chối quyết định"]
  conflict -- "Không" --> decision
  decision -- "Phê duyệt" --> approved --> project
  decision -- "Không phê duyệt" --> rejected --> archive
```

Tờ trình do TB lập đi thẳng đến TP; tờ trình do TP lập vẫn qua bước TB. TB/TP
không rà soát tờ trình do chính mình lập. Chỉ GĐ phê duyệt đề tài và kinh phí;
PGĐ-KH chỉ ký thành lập hội đồng. Thư ký hội đồng tổng hợp/lập biên bản, không chấm.
