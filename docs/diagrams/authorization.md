# Authorization and permission flow

```mermaid
flowchart TD
  admin(["SYSTEM_ADMIN: tạo hoặc khóa account"])
  role(["SYSTEM_ADMIN: gán system role và scope"])
  account["System: mỗi account có một system role active"]
  head(["SCIENTIFIC_MANAGEMENT_HEAD: xem trong scope; officer / chưa phân công / workload"])
  leader(["LEADERSHIP_APPROVAL_AUTHORITY: giám sát trong scope và quyết định đủ điều kiện"])
  oversight(["RESEARCH_OVERSIGHT_AUTHORITY: nghiên cứu nội bộ và giám sát chỉ đọc; không quyết định cuối"])
  staff(["SCIENTIFIC_MANAGEMENT_STAFF: management cần officer assignment hiện hành"])
  internal(["RESEARCHER_INTERNAL_USER: PI/participation actions theo quan hệ"])
  external(["EXTERNAL_RESEARCHER_USER: chỉ assignment/relationship được cấp"])
  record["System: relationship hoặc assignment chỉ có hiệu lực trên record tương ứng"]
  delegation_rules["System: delegation chỉ tồn tại khi owning contract cho phép"]
  action(["User: request view, create, edit, download, approve, or delete action"])
  context["System: resolve system role, scope, relationship, assignment, state, delegation và conflict"]
  allowed{"Tất cả điều kiện đạt?"}
  permit["Cho phép action trong phạm vi"]
  deny["Từ chối; fail closed khi context thiếu, cũ hoặc mơ hồ"]
  no_hard_delete["Không xóa cứng; giữ record, version, relationship, decision và audit"]
  audit["Audit action nếu thuộc hành động cần ghi nhận"]

  admin --> role --> account
  role -. "Scope giám sát được cấp" .-> head
  role -. "Scope + officer assignment" .-> staff
  role -. "Scope lãnh đạo được cấp" .-> leader
  role -. "Scope giám sát được cấp" .-> oversight
  role -. "Own/relationship context" .-> internal
  role -. "Relationship/assignment context" .-> external
  leader --> context
  oversight --> context
  oversight -. "PI / thành viên độc lập" .-> record
  internal -. "PI / thành viên độc lập" .-> record
  external -. "Assignment/relationship" .-> record
  staff --> record
  head -. "Visibility, không phải final decision" .-> context
  delegation_rules --> context
  action --> context --> allowed
  record -. "Context của record" .-> context
  allowed -- "Có" --> permit --> audit
  allowed -- "Không" --> deny
  action -. "Delete không được xóa cứng" .-> no_hard_delete
```

`SYSTEM_ADMIN` không mặc nhiên được xem hoặc sửa dữ liệu nghiệp vụ, phản biện,
phê duyệt, hoặc mở lại hồ sơ. Có role, scope, relationship, assignment và
state không làm mất conflict policy.
