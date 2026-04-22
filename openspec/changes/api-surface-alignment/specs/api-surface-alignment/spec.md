# API Surface Alignment Specification

## Purpose

Keep the documented frontend/API surface aligned with the current implementation state, separating endpoints that are implemented in UI, documented only, or explicitly out of scope.

## Requirements

### Requirement: Surface status matrix

The system MUST maintain a clear status matrix that classifies each relevant API capability as implemented, docs-only, or out of scope.

#### Scenario: Classify a capability
- GIVEN an endpoint or capability that exists in the backend or `services/api.ts`
- WHEN the coverage guide is updated
- THEN the matrix SHALL show a single status for that capability
- AND it SHALL include a short rationale for the status

#### Scenario: Prevent ambiguous ownership
- GIVEN an endpoint is already exposed in UI
- WHEN the matrix is regenerated
- THEN the endpoint MUST NOT remain listed as a gap
- AND it MUST be marked as implemented or covered

### Requirement: Docs-only surface is explicit

The system MUST document endpoints that are available in the frontend adapter but do not have dedicated UI flows.

#### Scenario: Document adapter-only endpoints
- GIVEN an endpoint such as `health`, `exportByIds`, branch operations, or MITRE helper calls
- WHEN the documentation is refreshed
- THEN the guide SHALL list it as exposed in `api.ts` without UI
- AND it SHALL reference the file and category where it is used or intentionally unused

#### Scenario: Keep docs-only endpoints discoverable
- GIVEN a maintainer reviews the docs
- WHEN they read the coverage guide
- THEN they MUST be able to tell whether the endpoint is a candidate for UI, docs-only, or exclusion

### Requirement: Explicitly excluded gaps stay excluded

The system MUST mark Google Auth endpoints as intentionally out of scope until a new explicit decision is made.

#### Scenario: Auth Google is excluded
- GIVEN `GET /auth/google` or `GET /auth/google/callback`
- WHEN the coverage guide is updated
- THEN those endpoints SHALL appear in a dedicated out-of-scope section
- AND they MUST be labeled as not to be addressed until explicit notice

#### Scenario: Excluded gaps do not re-enter the backlog implicitly
- GIVEN a maintainer updates the docs later
- WHEN they review the backlog section
- THEN excluded Google Auth endpoints MUST NOT appear as active work items

### Requirement: Cross-document consistency

The system SHOULD keep the coverage guide and client-flow guide consistent with the current surface classification.

#### Scenario: Update one guide without breaking the other
- GIVEN the surface status changes for a client or admin flow
- WHEN the guides are refreshed
- THEN the related guide entries SHALL agree on the state of the flow
- AND no guide SHALL claim a missing capability that has already been implemented
