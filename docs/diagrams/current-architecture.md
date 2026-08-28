# DocManS current architecture and safety diagrams

These diagrams describe the current DocManS architecture. Optional components
are marked explicitly; no future infrastructure is shown as deployed.

## 1. System Context / Container Architecture

```mermaid
flowchart LR
  browser["Browser"]

  subgraph edge["Optional edge"]
    proxy["Optional Nginx / HTTPS reverse proxy"]
  end

  subgraph app["DocManS application"]
    web["Next.js Web App"]
    api["NestJS API<br/>central enforcement point"]
    auth["Auth & Session service"]
    authz["Authorization service"]
    workflow["Workflow services"]
    files["File service"]
    audit["Audit log service"]
    notify["Notification service"]
    worker["Optional Scheduled Job / Background Worker"]
  end

  subgraph persistence["Private persistence"]
    pg[("PostgreSQL via Prisma")]
    minio[("MinIO private object storage")]
  end

  smtp["Optional Email / SMTP service"]
  constraints["No direct browser access to PostgreSQL or MinIO<br/>Redis is not part of the current implementation"]

  browser -->|HTTPS| proxy --> web
  web -->|All business requests| api
  api --> auth
  api --> authz
  api --> workflow
  api --> files
  api --> audit
  api --> notify
  api -.->|Optional trigger| worker
  auth --> pg
  authz --> pg
  workflow --> pg
  files --> pg
  files --> minio
  audit --> pg
  notify --> pg
  worker -.->|Scheduled checks via application service layer| pg
  worker -.-> notify
  worker -.-> smtp
  notify -.->|Optional email| smtp
  api --- constraints
```

The reverse proxy and scheduled worker are optional deployment components.
Business requests, authentication, authorization, validation, workflow rules,
and audit logging remain enforced by the NestJS API.

## 2. End-to-End Business Workflow

```mermaid
flowchart TD
  intake(["Management: open intake period"])
  draft(["PI: create and edit draft"])
  upload(["File service: upload through API"])
  submit(["PI: submit proposal"])
  readiness{"Proposal ready?"}
  supplement["Request supplement with reason and due date"]
  correct(["PI: supplement or correct"])
  resubmit(["PI: review final content and resubmit"])
  review(["Assigned reviewer or council: review"])
  score(["Reviewer or council: score and comment"])
  consolidate(["Management: consolidate evaluation"])
  decision{"Leadership decision?"}
  approved["Proposal: approved"]
  rejected["Proposal: rejected"]
  project(["Management: create project"])
  task["Generate follow-up task"]
  archive["Close / archive; retain history"]

  scheduled["[SCHEDULED JOB] Check deadlines and overdue items"]
  reminder["Reminder"]
  overdue["Overdue warning"]
  notify["[NOTIFY] Create in-app notification"]
  email["[OPTIONAL] Send email notification"]

  intake --> draft --> upload --> submit --> readiness
  readiness -- "No" --> supplement --> correct --> resubmit --> readiness
  readiness -- "Yes" --> review --> score --> consolidate --> decision
  decision -- "Approve" --> approved --> project --> task
  decision -- "Reject" --> rejected --> archive
  task --> notify
  scheduled --> reminder --> notify
  scheduled --> overdue --> notify
  notify -.-> email
```

Reminders, overdue warnings, and task generation are independent of any queue
or cache. Scheduled checks use PostgreSQL as the source of truth.

## 3. Data Flow Diagram / DFD mức an toàn

```mermaid
flowchart LR
  browser["Browser"] --> web["Next.js Web App"]
  web -->|All business requests| api["NestJS API"]

  api --> session["Check session and load context"]
  session --> authz["Authorization-scoped response"]
  authz --> domain["Workflow and domain services"]
  domain --> pg[("PostgreSQL / Prisma<br/>business data, roles, scopes, schedules, notifications, audit logs")]

  api --> file["File service"]
  file -->|File metadata| pg
  file -->|Binary object| minio[("MinIO private bucket")]

  domain --> audit["Audit log service"]
  audit --> pg
  domain -.-> notify["Notification Service"]
  notify --> pg

  worker["Scheduled Job / Background Worker<br/>PostgreSQL-backed"]
  worker -.->|Read schedules and pending checks| pg
  worker -.->|Write reminders and overdue warnings| pg
  worker -.-> notify
  worker -.-> smtp["Email / SMTP"]

  dashboard["Dashboard request"] --> web
  domain -.->|Scoped dashboard query| dashboard
  constraints["No direct browser access to PostgreSQL or MinIO"]
  api --- constraints
```

Redis is intentionally excluded because it is not part of the current DocManS
implementation.

## 4. Core Data Model / ERD logic

```mermaid
erDiagram
  USER ||--o{ SESSION : has
  USER ||--o{ USER_ORGANIZATION_SCOPE : receives
  ORGANIZATION_UNIT ||--o{ USER_ORGANIZATION_SCOPE : defines
  PROPOSAL_INTAKE_PERIOD ||--o{ RESEARCH_PROPOSAL : accepts
  ORGANIZATION_UNIT ||--o{ RESEARCH_PROPOSAL : hosts
  USER ||--o{ RESEARCH_PROPOSAL : owns
  RESEARCH_PROPOSAL ||--o{ PROPOSAL_MEMBER : includes
  USER ||--o{ PROPOSAL_MEMBER : participates
  RESEARCH_PROPOSAL ||--o{ PROPOSAL_ATTACHMENT : has
  USER ||--o{ FILE_RECORD : uploads
  RESEARCH_PROPOSAL ||--o{ PROPOSAL_SUBMISSION_EVENT : records
  RESEARCH_PROPOSAL ||--o{ PROPOSAL_SUPPLEMENT_REQUEST : receives
  RESEARCH_PROPOSAL ||--o{ PROPOSAL_REVIEW_ASSIGNMENT : assigns
  PROPOSAL_REVIEW_ASSIGNMENT ||--o| PROPOSAL_REVIEW : produces
  RESEARCH_PROPOSAL ||--o| PROPOSAL_EVALUATION_SUMMARY : has
  RESEARCH_PROPOSAL ||--o{ PROPOSAL_DECISION : receives
  RESEARCH_PROPOSAL ||--o{ PROPOSAL_DELEGATION : permits
  USER ||--o{ AUDIT_LOG : causes
  USER ||--o{ NOTIFICATION : receives
  RESEARCH_PROPOSAL ||--o{ NOTIFICATION : concerns

  USER {
    string id PK
    string username UK
    string systemRole
    string status
  }
  ORGANIZATION_UNIT {
    string id PK
    string code UK
    string name
  }
  RESEARCH_PROPOSAL {
    string id PK
    string ownerId FK
    string hostOrganizationUnitId FK
    string status
    int authorizationContextVersion
  }
  PROPOSAL_ATTACHMENT {
    string id PK
    string proposalId FK
    string storageKey
    string status
  }
  FILE_RECORD {
    string id PK
    string relatedEntityId
    string storageBucket
    string storageObjectKey
    string status
  }
  AUDIT_LOG {
    string id PK
    string actorId FK
    string targetEntityId
    string action
    string result
    datetime timestamp
  }
  NOTIFICATION {
    string id PK
    string recipientId FK
    string proposalId FK
    string status
  }
```

Business records, versions, relationships, decisions, workflow history, and
audit records are retained; audit history is append-only or immutable where
appropriate. No queue or cache entity is required.

## 5. Authorization Decision Flow

```mermaid
flowchart TD
  request(["User requests an action"])
  session["Authenticate and load active session"]
  context["Resolve role, organization scope, relationship, assignment, state, delegation, and conflict context"]
  complete{"All required context present and valid?"}
  deny_missing["Deny; fail closed"]
  allowed{"Role, scope, state, and policy allow action?"}
  deny["Deny before data access"]
  execute["Execute validated business action"]
  audit["Write audit record when action requires audit"]
  notify["Create notification after successful action if needed"]

  request --> session --> context --> complete
  complete -- "No" --> deny_missing
  complete -- "Yes" --> allowed
  allowed -- "No" --> deny
  allowed -- "Yes" --> execute --> audit --> notify
```

Role alone is not sufficient. Scope, record relationship or assignment,
workflow state, delegation, and conflict checks are evaluated before data
access. `SYSTEM_ADMIN` does not automatically receive business-record access.

## 6. File Upload / Download Safety Flow

```mermaid
flowchart TD
  request(["Browser requests upload or download"])
  api["NestJS API"]
  session["Authenticate session"]
  permission{"Permission on the record and file action?"}
  deny["Deny file action"]
  validate["Validate metadata, type, size, and workflow state"]
  key["Generate or resolve non-guessable object key"]
  upload["Upload or stream binary through File service"]
  object[("MinIO private object storage")]
  metadata["Write file metadata and version reference"]
  pg[("PostgreSQL / Prisma")]
  audit["Audit important file access"]
  response["Return permitted response through API"]

  request --> api --> session --> permission
  permission -- "No" --> deny
  permission -- "Yes" --> validate --> key --> upload
  upload --> object
  upload --> metadata --> pg
  upload --> audit --> pg
  object --> response
  pg --> response
  response --> api
```

The MinIO bucket is private. The browser never accesses PostgreSQL, MinIO, or
an object-storage bucket directly; upload and download always pass through API
permission checks.

## 7. Feasibility & Safety Check

- [x] Browser business requests go through the Next.js Web App and NestJS API.
- [x] NestJS API is the central enforcement point for authentication,
  authorization, validation, workflow rules, and audit logging.
- [x] Dashboard, list, search, detail, export, and file metadata queries are
  authorization-scoped.
- [x] File metadata is stored in PostgreSQL; file binaries are stored in a
  private MinIO bucket.
- [x] No actor accesses PostgreSQL or MinIO directly.
- [x] Scheduled Job / Background Worker can process reminders and overdue
  warnings using PostgreSQL as the source of truth.
- [x] Audit logs and workflow history are append-only or immutable where
  appropriate.
- [x] Redis is not part of the current implementation; only consider it as a
  future extension if queue/cache requirements become necessary.
