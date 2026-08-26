# Document viewing flow

```mermaid
flowchart TD
  open_list(["User: mở danh sách"])
  search(["User: search hoặc filter"])
  scope["System: lọc theo role và data scope"]
  select(["User: chọn proposal hoặc project"])
  permission{"Có quyền đọc record?"}
  denied["Từ chối; không tiết lộ record"]
  detail["System: hiển thị detail trong phạm vi được phép"]
  files(["User: xem metadata hoặc tệp"])
  file_permission{"Có quyền trên record và file?"}
  file_denied["Từ chối file action"]
  download(["User: tải tệp được phép"])
  history(["User: xem workflow history trong scope"])

  open_list --> search --> scope --> select --> permission
  permission -- "Không" --> denied
  permission -- "Có" --> detail --> files --> file_permission
  file_permission -- "Không" --> file_denied
  file_permission -- "Có" --> download
  detail --> history
```

Search, count, facet, dashboard, export, notification, and file metadata use
the same authorization filter. The source confirms that versions are retained;
it does not define a separate version-preview action.
