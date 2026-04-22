# Design: Admin Ops Exposure

## Technical Approach

Keep `pages/Admin.tsx` as the route entrypoint, but split the new admin-ops surface into focused UI pieces: a repo edit modal for `RepoSourcesTab` and a dedicated operational panel/tab for export jobs + settings reload. Reuse `services/api.ts` as the single HTTP adapter and mirror the existing modal-heavy patterns already used across the app.

## Architecture Decisions

### Decision: Separate ops from the indexer surface

**Choice**: add a dedicated admin ops panel/tab for export jobs and settings reload.
**Alternatives considered**: embed everything in `IndexerTab`; create a new route.
**Rationale**: these actions are operational, not index-health, and deserve their own grouping without fragmenting navigation.

### Decision: Edit repos via modal

**Choice**: keep repository edits as a modal launched from `RepoSourcesTab`.
**Alternatives considered**: inline row editing; separate repository page.
**Rationale**: repo editing is a short-lived form flow and matches the current repo add/import interaction pattern.

### Decision: Use explicit typed API helpers

**Choice**: add `updateRepo()`, `listExportJobs()`, and `reloadSettings()` methods plus response interfaces in `services/api.ts`.
**Alternatives considered**: call `request()` ad hoc from components; keep responses as `any`.
**Rationale**: the repo already centralizes HTTP contracts in one adapter, and typed helpers reduce drift.

### Decision: Keep job rendering resilient

**Choice**: render export jobs generically enough to handle evolving backend payloads.
**Alternatives considered**: hardcode a full job schema now.
**Rationale**: `/export/jobs` is documented without a response schema, so the UI should tolerate future response shape changes.

## Data Flow

`Admin.tsx` ──opens──> `RepoEditModal`
`RepoEditModal` ──loads/saves──> `services/api.ts`
`services/api.ts` ──fetch──> `/admin/repos/{id}` / `PATCH /admin/repos/{id}`

`AdminOpsTab` ──loads jobs/reload──> `services/api.ts`
`services/api.ts` ──fetch──> `/export/jobs` / `POST /admin/system/settings/reload`

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `services/api.ts` | Modify | Add typed helpers for repo patch, export job list, and settings reload |
| `pages/Admin.tsx` | Modify | Wire new admin ops tab and repo edit actions |
| `components/RepoEditModal.tsx` | Create | Edit existing Git repo sources |
| `components/AdminOpsTab.tsx` | Create | Export jobs list + reload settings controls |
| `DaC-Docs/docs/guides/frontend-api-cobertura.md` | Modify | Mark these admin endpoints as implemented |

## Interfaces / Contracts

```ts
interface RepoUpdatePayload {
  name?: string;
  branch?: string;
  rules_subpath?: string;
  is_active?: boolean;
}

interface ExportJobSummary {
  job_id: string;
  status: string;
  [key: string]: unknown;
}

interface ExportJobsResponse {
  items: ExportJobSummary[];
  total?: number;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Payload shaping, modal state transitions | Not available today; rely on typecheck and manual validation |
| Integration | Repo patch flow, jobs list, settings reload | Manual verification against backend + `npx tsc --noEmit` |
| E2E | Admin-only visibility and operational actions | Not available today |

## Migration / Rollout

No migration required. This is additive UI/API exposure on top of existing backend endpoints.

## Open Questions

- [ ] Should export jobs live in the new ops tab permanently or be grouped under indexer for discoverability?
