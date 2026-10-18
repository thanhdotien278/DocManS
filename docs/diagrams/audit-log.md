# Audit log flow

```mermaid
flowchart TD
  action(["User or system performs a domain action"])
  important{"Action requires audit?"}
  no_audit["No audit record required by the documented action list"]
  audit["System: create immutable audit record"]
  fields["actor, timestamp, target, action, reason when needed, and safe context"]
  access{"Role and data scope allow audit access?"}
  anonymity{"Viewer is PI or reviewer of the record?"}
  hidden["Hidden: two-way anonymity; PI and reviewers cannot view the record's action log"]
  history(["Scoped user or participating topic team: view workflow history on source record"])
  search(["SYSTEM_ADMIN, or Phòng KHQS / BGĐ when authorized within scope: search or view audit logs"])
  export(["SYSTEM_ADMIN, or Phòng KHQS / BGĐ when authorized within scope: export audit logs"])
  denied["Từ chối audit access"]

  action --> important
  important -- "Không" --> no_audit
  important -- "Có" --> audit --> fields
  fields --> access
  access -- "Không" --> denied
  access -- "Có" --> anonymity
  anonymity -- "Có" --> hidden
  anonymity -- "Không" --> history
  access -- "Có và audit role" --> search --> export
```

Documented audited actions include create/update/soft-delete, workflow state
changes, assignments, delegation, important file access, decisions, tờ trình
submit/forward/return/approve/sign, post-submission edits, reopen, withdrawal,
profile linking, and account/role/scope changes. The PI may still read the tờ
trình step history of their own record. Audit history is immutable; business
records, versions, relationships, decisions, and audit records are not hard-deleted.
