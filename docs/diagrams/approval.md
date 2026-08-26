# Approval flow

```mermaid
flowchart TD
  submitted["Proposal: Đã nộp"]
  completeness(["Quản lý hoặc Thư ký được giao: kiểm tra đầy đủ và thủ tục"])
  complete{"Hồ sơ đủ điều kiện?"}
  supplement["Yêu cầu bổ sung; nêu lý do và hạn"]
  pi_correct(["PI: bổ sung hoặc chỉnh sửa"])
  resubmit(["PI: duyệt nội dung cuối và nộp lại"])
  assign(["Quản lý: phân công reviewer hoặc council"])
  review(["Reviewer hoặc council: xem đúng gói được giao"])
  score(["Reviewer hoặc council: chấm, nhận xét và khuyến nghị"])
  consolidate(["Quản lý: tổng hợp đánh giá"])
  ready["Proposal: Chờ quyết định"]
  authority["LEADERSHIP_APPROVAL_AUTHORITY: xem hồ sơ đủ điều kiện"]
  conflict{"Có conflict trên record?"}
  decision{"Phê duyệt hoặc không phê duyệt?"}
  approved["Proposal: Đã phê duyệt"]
  rejected["Proposal: Không phê duyệt"]
  archive["Đóng / lưu trữ; giữ lịch sử"]
  project(["Quản lý: tạo đề tài từ proposal đã duyệt"])

  submitted --> completeness --> complete
  complete -- "Chưa đủ" --> supplement --> pi_correct --> resubmit --> completeness
  complete -- "Đủ" --> assign --> review --> score --> consolidate --> ready --> authority --> conflict
  conflict -- "Có" --> denied["Từ chối quyết định"]
  conflict -- "Không" --> decision
  decision -- "Phê duyệt" --> approved --> project
  decision -- "Không phê duyệt" --> rejected --> archive
```

`Yêu cầu bổ sung` is the documented return-for-correction path. A separate
forward-to-next-approval-level step is not documented, so it is not shown.
