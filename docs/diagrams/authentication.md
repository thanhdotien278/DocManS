# Authentication flow

`docs/user-flows.md` documents account status and authorization context, but it
does not define credential validation, logout, or password reset behavior.
Those paths are therefore not invented here.

```mermaid
flowchart TD
  login(["User: Login"]) --> account_status{"Account ACTIVE?"}
  account_status -- "Có" --> context["System: load current system role and scope"]
  context --> authorized["Authorization is evaluated for each action"]
  account_status -- "Không" --> locked["Account LOCKED or INACTIVE"]
  locked --> no_rights["Mất quyền ngay"]
  no_rights --> retained["Giữ profile, quan hệ và lịch sử"]
```

Not documented in the source: invalid credentials, logout, and password reset.
