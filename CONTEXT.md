# RTMS Context

RTMS is an internal research-management system for the Military Medical Academy. This context file captures domain language that implementation and review should use consistently across stories.

## Language

**Internal User**:
A staff, leadership, investigator, reviewer, or administrator account that is allowed to access RTMS.
_Avoid_: account holder, external user

**Authenticated Session**:
A revocable server-side access session created after a successful local username/password login.
_Avoid_: JWT session, client token

**Current-User Context**:
The safe user identity data resolved from the authenticated session and exposed to protected RTMS screens and APIs.
_Avoid_: token payload, client auth state

## Relationships

- An **Internal User** can create zero or more **Authenticated Sessions**
- An **Authenticated Session** resolves exactly one **Current-User Context**

## Example dialogue

> **Dev:** "For Story 1.2, does the browser keep a JWT after login?"
> **Domain expert:** "No. RTMS uses an **Authenticated Session** on the server, and the browser only keeps an opaque cookie."

## Flagged ambiguities

- "session" was left ambiguous between opaque server session and JWT-based client token flow — resolved: Story 1.2 uses only **Authenticated Session** backed by the server
