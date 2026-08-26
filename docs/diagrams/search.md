# Search and filtering flow

```mermaid
flowchart TD
  open(["User: mở danh sách"])
  keyword(["User: nhập keyword hoặc chọn search/filter"])
  authorize["System: áp dụng role và data scope trước search"])
  query["System: search/filter operational records trong phạm vi"]
  results["System: hiển thị kết quả đã lọc"]
  open_record(["User: mở proposal hoặc project từ kết quả"])
  detail["Document viewing flow: kiểm tra access trước khi hiển thị detail"]

  open --> keyword --> authorize --> query --> results --> open_record --> detail
```

The source documents search/filter and the shared authorization filter, but it
does not define searchable fields, empty-result behavior, or an unscoped
content-search rule. Those details are not invented here.
