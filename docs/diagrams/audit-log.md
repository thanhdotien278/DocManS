# Audit log flow

```mermaid
flowchart TD
  action(["User or system performs a domain action"])
  important{"Action requires audit?"}
  no_audit["No audit record required by the documented action list"]
  audit["System: create immutable audit record"]
  fields["actor, timestamp, target, action, reason when needed, and safe context"]
  history(["Authorized user: view workflow history on source record"])
  search(["SYSTEM_ADMIN, authorized staff, or authorized leadership: search or view audit logs"])
  export(["SYSTEM_ADMIN, authorized staff, or authorized leadership: export audit logs within scope"])
  access{"Role and data scope allow audit access?"}
  denied["Từ chối audit access"]

  action --> important
  important -- "Không" --> no_audit
  important -- "Có" --> audit --> fields
  fields --> access
  access -- "Không" --> denied
  access -- "Có" --> history
  access -- "Có và audit role" --> search --> export
```

Documented audited actions include create/update/soft-delete, workflow state
changes, assignments, delegation, important file access, decisions,
post-submission edits, reopen, withdrawal, profile linking, and account/role/
scope changes. Audit history is immutable; business records, versions,
relationships, decisions, and audit records are not hard-deleted.
