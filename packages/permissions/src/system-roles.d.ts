export declare const SYSTEM_ROLES: readonly [
  "SYSTEM_ADMIN",
  "SCIENTIFIC_MANAGEMENT_STAFF",
  "LEADERSHIP_APPROVAL_AUTHORITY",
  "RESEARCHER_INTERNAL_USER"
];

export type SystemRole = (typeof SYSTEM_ROLES)[number];
