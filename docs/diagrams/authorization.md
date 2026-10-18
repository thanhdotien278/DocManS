# Authorization and permission flow

```mermaid
flowchart TD
  admin(["QT — SYSTEM_ADMIN: tạo hoặc khóa account"])
  role(["QT — SYSTEM_ADMIN: gán đúng một system role và scope"])
  account["System: mỗi account có một system role active"]
  director(["GĐ — LEADERSHIP_APPROVAL_AUTHORITY: duy nhất phê duyệt đề tài + kinh phí và thanh lý; ký mọi tờ trình BGĐ"])
  science(["PGĐ-KH — SCIENCE_DEPUTY_DIRECTOR: ký thành lập hội đồng, IRB, nghiệm thu, gia hạn, điều chỉnh"])
  oversight(["PGĐ-TD — RESEARCH_OVERSIGHT_AUTHORITY: chỉ theo dõi; kinh phí tổng hợp; không ký"])
  head(["TP — RESEARCH_MANAGEMENT_HEAD: duyệt tờ trình trình BGĐ; giao CV, phân mảng; không kiểm tra đầy đủ"])
  deputy(["PP — RESEARCH_MANAGEMENT_DEPUTY_HEAD: chỉ theo dõi trong scope; không bước tờ trình"])
  board(["TB — RESEARCH_BOARD_HEAD: rà soát tờ trình; giao CV; kiểm tra đầy đủ trong scope"])
  staff(["CV — RESEARCH_MANAGEMENT_STAFF: chỉ hồ sơ đang được giao phụ trách"])
  internal(["NCV — RESEARCHER_INTERNAL_USER: PI/participation actions theo quan hệ"])
  external(["NNB — EXTERNAL_RESEARCHER_USER: không tạo đề xuất; chỉ assignment/relationship được cấp"])
  record["System: relationship hoặc assignment chỉ có hiệu lực trên record tương ứng"]
  delegation_rules["System: delegation chỉ tồn tại khi owning contract cho phép"]
  action(["User: request view, create, edit, download, approve, or delete action"])
  context["System: resolve system role, scope, relationship, assignment, state, tờ trình step, delegation và conflict"]
  allowed{"Tất cả điều kiện đạt?"}
  permit["Cho phép action trong phạm vi"]
  deny["Từ chối; fail closed khi context thiếu, cũ hoặc mơ hồ"]
  no_hard_delete["Không xóa cứng; giữ record, version, relationship, decision và audit"]
  audit["Audit action nếu thuộc hành động cần ghi nhận"]

  admin --> role --> account
  role -. "Scope BGĐ" .-> director
  role -. "Scope BGĐ" .-> science
  role -. "Scope theo dõi" .-> oversight
  role -. "Scope đơn vị" .-> head
  role -. "Scope đơn vị" .-> deputy
  role -. "Scope đơn vị" .-> board
  role -. "Scope + officer assignment" .-> staff
  role -. "Own/relationship context" .-> internal
  role -. "Relationship/assignment context" .-> external
  director --> context
  science --> context
  oversight -. "Chỉ đọc, không ký" .-> context
  deputy -. "Chỉ đọc, không duyệt" .-> context
  head --> context
  board --> context
  staff --> record
  internal -. "PI / thành viên" .-> record
  external -. "Reviewer / hội đồng / IRB / thành viên" .-> record
  account -. "Mọi role trừ QT/NNB có thể là PI; mọi role trừ QT có thể được mời phản biện" .-> record
  delegation_rules --> context
  action --> context --> allowed
  record -. "Context của record" .-> context
  allowed -- "Có" --> permit --> audit
  allowed -- "Không" --> deny
  action -. "Delete không được xóa cứng" .-> no_hard_delete
```

`SYSTEM_ADMIN` không mặc nhiên được xem hoặc sửa dữ liệu nghiệp vụ, phản biện,
phê duyệt, hoặc mở lại hồ sơ; không có lý lịch khoa học và không được mời phản
biện. PI, thành viên hoặc reviewer của một record không dùng quyền quản lý trên
chính record đó; PI và reviewer không xem nhật ký hành động của record. Có role,
scope, relationship, assignment và state không làm mất conflict policy.
