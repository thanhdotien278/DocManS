# Authorization and permission flow

```mermaid
flowchart TD
  admin(["SYSTEM_ADMIN: tạo hoặc khóa account"])
  role(["SYSTEM_ADMIN: gán system role và scope"])
  account["System: mỗi account có một system role active"]
  staff(["SCIENTIFIC_MANAGEMENT_STAFF: tạo hoặc thu hồi relationship / assignment"])
  record["System: relationship hoặc assignment chỉ có hiệu lực trên record tương ứng"]
  delegation(["PI: tạo delegation proposal.submit cho một record"])
  delegation_rules["System: action, thời hạn, lý do, phê duyệt và thu hồi"]
  action(["User: request view, create, edit, download, approve, or delete action"])
  context["System: resolve system role, scope, relationship, assignment, state, delegation và conflict"]
  allowed{"Tất cả điều kiện đạt?"}
  permit["Cho phép action trong phạm vi"]
  deny["Từ chối; fail closed khi context thiếu, cũ hoặc mơ hồ"]
  no_hard_delete["Không xóa cứng; giữ record, version, relationship, decision và audit"]
  audit["Audit action nếu thuộc hành động cần ghi nhận"]

  admin --> role --> account
  role -. "Data scope" .-> staff
  staff --> record
  delegation --> delegation_rules --> context
  action --> context --> allowed
  record -. "Context của record" .-> context
  allowed -- "Có" --> permit --> audit
  allowed -- "Không" --> deny
  action -. "Delete không được xóa cứng" .-> no_hard_delete
```

`SYSTEM_ADMIN` không mặc nhiên được xem hoặc sửa dữ liệu nghiệp vụ, phản biện,
phê duyệt, hoặc mở lại hồ sơ. Có role, scope, relationship, assignment và
state không làm mất conflict policy.
