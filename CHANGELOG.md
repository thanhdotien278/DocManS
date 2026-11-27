# Changelog

All notable changes to DocManS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.1.0] — 2026-11-27

First public release on GitHub. Versions 1.0.0 and 1.0.1 were internal deployment builds and were not published in this repository.

### Added

- **Research proposals:** intake periods, drafts, readiness checks, submission, supplement requests, resubmission, versioned files, and a workflow timeline.
- **Review and approval:** proposal completeness checks, reviewer assignment and evaluation, evaluation councils, and a routed approval chain (staff → board head → department head → leadership) with signed decision packages for topic and funding.
- **Project lifecycle:** milestones and progress reports, change and extension requests, ethics (IRB) dossiers, acceptance dossiers and acceptance councils, funding (grant, disbursement, settlement with invariant checks), liquidation, and closure.
- **Researcher profiles:** scientific CV with education, work history, research experience, publications, change history, and a printable CV form in Vietnamese and English.
- **Student research:** yearly periods, two-step student registration, teams, document upload until the deadline, scoring, and awards.
- **Documents & forms** library for institutional templates.
- **Dashboard and reports:** analytics with drill-down, Gantt view, project health snapshots, and spreadsheet export.
- **Notifications:** in-app notifications for workflow events and HTML email for account activation, approval, and password reset.
- **Accounts and administration:** ten system roles with organization scopes, self-registration by email, self-service password reset, user, catalog, and configuration management, and an audit log.
- **Operations:** Docker Compose for development and production, nginx reverse proxy, Prisma migrations, and a seed snapshot for local data.

### Security

- Hardened authentication, file handling, and nginx configuration.
- File uploads are checked against allowed extensions, size limits, MIME type, and file signature.

[Unreleased]: https://github.com/thanhdotien278/DocManS/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/thanhdotien278/DocManS/releases/tag/v1.1.0
