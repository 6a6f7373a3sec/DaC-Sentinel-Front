# Tasks: API Surface Alignment

## Phase 1: Matrix cleanup

- [x] 1.1 Normalize `DaC-Docs/docs/guides/frontend-api-cobertura.md` so every gap has exactly one status: implemented, docs-only, or out of scope.
- [x] 1.2 Ensure `GET /auth/google` and `GET /auth/google/callback` stay in the explicit out-of-scope section only.

## Phase 2: Doc alignment

- [x] 2.1 Update `DaC-Docs/docs/guides/clientes-vista-flujo.md` so client-flow notes match the current implemented surface.
- [x] 2.2 Remove stale language that still describes implemented endpoints as gaps.
- [x] 2.3 Keep docs-only adapter methods (`health`, `exportByIds`, branch ops, MITRE helpers) clearly categorized.

## Phase 3: Verification

- [x] 3.1 Run a grep/read pass to confirm no stale Google Auth backlog wording remains outside the out-of-scope section.
- [x] 3.2 Verify the final matrix matches the implementation status of `services/api.ts` and `pages/*`.
