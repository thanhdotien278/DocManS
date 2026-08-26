# Document editing flow

```mermaid
flowchart TD
  open(["User: mở proposal hoặc project hiện có"])
  edit_check["System: kiểm tra role, scope, relationship, state và conflict"]
  allowed{"Có quyền edit ở state hiện tại?"}
  blocked["Chặn edit; giữ record và lịch sử"]
  draft_edit(["PI: sửa bản nháp và tệp"])
  save["System: giữ Proposal ở Nháp"]
  submit(["PI: nộp chính thức"])
  request(["PI: gửi yêu cầu chỉnh sửa sau nộp"])
  approve(["Quản lý có scope hoặc Thư ký được giao phê duyệt"])
  approved{"Được phê duyệt?"}
  keep["Giữ bản đã khóa"]
  revision["System: tạo revision mới từ bản khóa"]
  revise(["PI: sửa trong revision"])
  final_submit(["PI: duyệt nội dung cuối và nộp lại"])
  immutable["Bản cũ, tệp, review và lịch sử không bị ghi đè"]

  open --> edit_check --> allowed
  allowed -- "Không" --> blocked
  allowed -- "Có; Nháp" --> draft_edit --> save --> submit
  allowed -- "Có; đã nộp" --> request --> approve --> approved
  approved -- "Không" --> keep
  approved -- "Có" --> revision --> revise --> final_submit
  revision --> immutable
```

Changing mục tiêu, kinh phí, nhân sự, thời hạn, or kết quả uses `Yêu cầu điều chỉnh chính thức`, not the ordinary post-submission revision flow. File
replacement creates a new version and does not overwrite evidence.
