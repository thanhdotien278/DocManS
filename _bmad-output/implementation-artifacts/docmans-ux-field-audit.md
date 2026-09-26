# DocManS UX field audit

Status: implementation gate, 2026-09-26

This audit classifies presentation fields considered during the UX migration.
It is intentionally conservative: no visual design is evidence for a new
business field. Category C is empty because the current canonical requirements
do not confirm a missing field that must be added for this migration.

| Screen/form | Field or group | Class | Canonical equivalent | DB impact | API impact | Authorization impact | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Researcher profile | Name, profile type, organization, affiliation, rank, degree, title, position, military rank, contact fields | A | Existing `ResearcherProfile` fields | None | None | Preserve profile capabilities and scope | Present through current form/API |
| Researcher profile | Research fields and expertise keywords | A | Existing catalog links and `expertiseKeywords` | None | None | Preserve current update capability | Present through current form/API |
| Researcher profile | Publications | A | Existing `publications` collection | None | None | Preserve profile read/update disclosure | Present through current form/API |
| Researcher profile | Research/project participation history | A | Existing self-reported `participations` collection | None | None | Must not grant operational record access | Present with explicit self-reported meaning |
| Researcher profile | Account/access status and activation actions | A | Existing linked account and credential-delivery state | None | None | Render backend profile/account actions only | Keep current implementation |
| Researcher profile | Printable scientific summary | B | Compose from the existing A fields above | None | None | Same disclosure as the loaded profile | May provide print styling/summary without persistence |
| Researcher profile | Organization/rank/degree labels and participation date/status display | B | Existing catalog and date/status values | None | None | No new grant | Derive for display only |
| Researcher profile | Portrait/avatar upload or URL | E | No canonical stored profile portrait contract | None | None | File disclosure/authorization unresolved | Exclude until separately specified |
| Researcher profile | Gender, birth details, nationality, identity number and issue details | E | No canonical field or disclosure contract | None | None | Sensitive-data policy unresolved | Exclude until separately specified |
| Researcher profile | Education and employment history | E | No canonical collection or ownership rules | None | None | Edit/disclosure/version rules unresolved | Exclude until separately specified |
| Researcher profile | Languages and certificates | E | No canonical collection | None | None | Disclosure and evidence rules unresolved | Exclude until separately specified |
| Researcher profile | Intellectual property and professional awards | E | No canonical collection | None | None | Evidence/version rules unresolved | Exclude until separately specified |
| Researcher profile | Bank account, bank branch and SmartCA serial | D | No DocManS research-profile requirement | None | None | Would introduce high-risk sensitive data | Intentionally exclude |
| Researcher profile | Data-sharing consent embedded in CV | D | No consent workflow in current product | None | None | Consent purpose/retention not defined | Intentionally exclude |
| Researcher profile | Bilingual ceremonial CV declarations/signature blocks | D | No canonical signed-CV workflow | None | None | Signature authority not defined | Intentionally exclude |
| Dashboard/reports | Project funding used/remaining and utilization totals | D | Only proposal requested amount currently exists | None | None | Would overstate authorized source data | Exclude; never derive expenditure |
| Search/notifications | Global suggestions, unread counts and read state | E | No current operational backend source | None | None | Counts/results must be authorization-scoped | Do not ship an active control until supported |
| Proposal/project actions | Status/action buttons shown by visual examples | D | Current domain operations and capability actions | None | None | Frontend role inference is forbidden | Use only current backend actions/reasons |
| Council/acceptance screens | Placeholder lifecycle fields and controls | D | Deferred canonical lifecycle | None | None | No current mutation authority | Exclude from operational UX |

## Outcome

- Category A fields are retained and presented with the shared UX system.
- Category B values are derived only from already-authorized response data.
- No Category C schema/API work is required.
- Category D fields are intentionally excluded.
- Category E fields remain unresolved and do not block unrelated UX migration.
