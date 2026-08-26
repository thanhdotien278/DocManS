# Document creation flow

In the source terminology, the document creation path is the proposal draft
and submission workflow.

```mermaid
flowchart TD
  intake(["Quản lý: mở đợt tiếp nhận"])
  create(["PI: tạo bản nháp"])
  edit(["PI: sửa bản nháp và tệp"])
  draft["Proposal: Nháp"]
  submit(["PI: nộp chính thức"])
  submitted["Proposal: Đã nộp"]
  review(["Quản lý hoặc Thư ký được giao: kiểm tra đầy đủ và thủ tục"])
  complete{"Hồ sơ đủ điều kiện?"}
  missing["Yêu cầu bổ sung; nêu lý do và hạn"]
  correction(["PI: bổ sung hoặc chỉnh sửa"])
  resubmit(["PI: duyệt nội dung cuối và nộp lại"])
  under_review["Proposal: Đang thẩm định / đánh giá"]

  intake --> create --> edit --> draft --> submit --> submitted --> review --> complete
  complete -- "Chưa đủ" --> missing --> correction --> resubmit --> under_review
  complete -- "Đủ" --> under_review
```

The source does not define a separate `metadata` step; metadata entry is not
added as a new business step.
