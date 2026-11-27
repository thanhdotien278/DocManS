# Security Policy

DocManS manages research records, personal data, and institutional decisions, so security reports are taken seriously.

## Supported versions

| Version | Supported |
| --- | --- |
| Latest release (1.1.x) | Yes |
| `main` branch | Yes |
| Older releases | No — please upgrade |

## Reporting a vulnerability

**Do not open a public issue, discussion, or pull request for a vulnerability.**

Report it privately through [GitHub private vulnerability reporting](https://github.com/thanhdotien278/DocManS/security/advisories/new). Please include:

- the affected component (API endpoint, page, Docker/nginx configuration, …) and version or commit;
- steps to reproduce, using seeded local accounts rather than real data;
- the impact you expect (for example, which role can read or change what it should not);
- a suggested fix, if you have one.

The maintainer aims to acknowledge reports within 7 days and will keep you updated until a fix is released. Reporters are credited in the advisory unless they ask otherwise.

## Scope

In scope: authentication and sessions, authorization bypass between roles, organization scopes or workflow states, file upload and download, injection, cross-site scripting or request forgery, exposure of personal or research data, and insecure defaults in the provided Docker, nginx, and environment templates.

Out of scope: findings that require an already-compromised administrator account or server, and issues in a specific institution's deployment that do not come from DocManS code or its default configuration. Please report those to that institution.

## Security design notes

- Opaque server-side sessions in an `HttpOnly` cookie (no JWT); passwords hashed with scrypt and compared in constant time.
- Every business endpoint checks role, organization scope, record ownership, and workflow state on the server; the rules are documented in [docs/permission-matrix.md](docs/permission-matrix.md).
- Uploads are checked against an allow-list of extensions, a size cap, and a MIME/extension match before they reach object storage.
- Authentication events and data changes are written to an audit log.
