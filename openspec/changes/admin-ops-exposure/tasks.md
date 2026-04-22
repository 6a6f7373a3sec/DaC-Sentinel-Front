# Tasks: Admin Ops Exposure

## Phase 1: API foundation

- [x] 1.1 Add typed repo patch and settings reload response interfaces in `services/api.ts`.
- [x] 1.2 Add `updateRepo(id, payload)`, `listExportJobs()`, and `reloadSettings()` helpers to `services/api.ts`.

## Phase 2: Admin UI components

- [x] 2.1 Create `components/RepoEditModal.tsx` to load `/admin/repos/{id}` and submit `PATCH /admin/repos/{id}`.
- [x] 2.2 Create `components/AdminOpsTab.tsx` to host export jobs and settings reload controls.
- [x] 2.3 Add the new ops tab entry and wiring in `pages/Admin.tsx`.

## Phase 3: Feature flows

- [x] 3.1 Wire repo edit actions into `RepoSourcesTab` with refresh-after-save behavior.
- [x] 3.2 Render `GET /export/jobs` results with empty-state and refresh support.
- [x] 3.3 Wire settings reload action with success/error feedback and snapshot display.

## Phase 4: Verification and documentation

- [x] 4.1 Run `npx tsc --noEmit` to validate the new contracts and component wiring.
- [x] 4.2 Update `DaC-Docs/docs/guides/frontend-api-cobertura.md` and `clientes-vista-flujo.md` to reflect the newly exposed admin operations.
- [ ] 4.3 Manually verify admin-only visibility, repo edit, export jobs view, and settings reload against the backend.
