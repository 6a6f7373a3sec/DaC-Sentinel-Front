# Design: API Surface Alignment

## Technical Approach

Treat this change as a documentation/surface-classification pass, not a UI feature build. The implementation work is limited to `DaC-Docs` and the coverage matrix already used by the team to decide what is implemented, docs-only, or excluded.

## Architecture Decisions

### Decision: Docs-first, no new UI

**Choice**: update the coverage guide and related flow docs instead of adding new frontend features.
**Alternatives considered**: create new UI for every leftover endpoint; leave stale gaps in docs.
**Rationale**: the remaining items are either intentionally excluded (`auth/google`) or low-value adapter-only methods; code changes would add churn without clear product value.

### Decision: Single source of truth for status

**Choice**: keep `docs/guides/frontend-api-cobertura.md` as the canonical status matrix.
**Alternatives considered**: distribute status notes across multiple docs.
**Rationale**: one matrix reduces drift and makes it obvious when something moves from gap to implemented.

### Decision: Explicit exclusion section

**Choice**: keep Google Auth in a dedicated “Fuera de alcance hasta nuevo aviso” section.
**Alternatives considered**: leave them in the generic gap list.
**Rationale**: this prevents accidental re-prioritization and matches the user’s explicit request.

## Data Flow

`services/api.ts` / `pages/*` ──observed by──> `DaC-Docs`
`DaC-Docs/docs/guides/frontend-api-cobertura.md` ──classifies──> implemented / docs-only / out-of-scope
`DaC-Docs/docs/guides/clientes-vista-flujo.md` ──keeps──> client-related flow notes in sync

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `DaC-Docs/docs/guides/frontend-api-cobertura.md` | Modify | Final status matrix and gap classification cleanup |
| `DaC-Docs/docs/guides/clientes-vista-flujo.md` | Modify | Ensure flow notes match the current client/admin surface |
| `openspec/changes/api-surface-alignment/specs/api-surface-alignment/spec.md` | Create | Documentation-oriented spec |
| `openspec/changes/api-surface-alignment/tasks.md` | Create | Docs update checklist |

## Interfaces / Contracts

No new runtime interfaces. The contract is the documentation matrix itself.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | N/A | No new code paths |
| Integration | Docs classification consistency | Manual review + grep for stale gap wording |
| E2E | N/A | No UI change in scope |

## Migration / Rollout

No migration required.

## Open Questions

- [ ] Should `exportByIds` remain docs-only or be promoted to a dedicated UI later?
