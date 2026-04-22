# Design: Client Rule Pipelines

## Technical Approach

Agregar una capacidad operativa encima del flujo actual de `Clientes`: `Clients.tsx` abre un modal dedicado que consume nuevos métodos de `services/api.ts` para CRUD y conversiones por cliente. La UI reutiliza `sanitizePipelineYaml()` antes de persistir YAML y toma el patrón visual de `SigmaConverter` para resultados de conversión.

## Architecture Decisions

### Decision: Entry point from `Clients`, feature UI extracted

**Choice**: agregar un botón/acción en `pages/Clients.tsx` y mover la UI nueva a `components/ClientPipelinesModal.tsx`.
**Alternatives considered**: incrustar todo dentro de `Clients.tsx`; crear una ruta nueva.
**Rationale**: mantiene el flujo mental centrado en perfiles, pero evita seguir inflando un archivo de más de 2000 líneas.

### Decision: Reuse existing pipeline sanitizer

**Choice**: sanitizar YAML con `utils/pipelineSanitizer.ts` antes de `POST` y `PATCH`.
**Alternatives considered**: dejar toda validación al backend; duplicar normalización local.
**Rationale**: reduce fricción con YAML legacy y aprovecha lógica ya validada en `SigmaConverter`.

### Decision: Keep API contracts in `services/api.ts`

**Choice**: definir tipos y métodos nuevos en `services/api.ts`.
**Alternatives considered**: crear un segundo cliente HTTP específico.
**Rationale**: el proyecto ya centraliza acceso REST en un único adaptador; romper eso sería inconsistente.

## Data Flow

`Clients.tsx` ──open modal──> `ClientPipelinesModal`
`ClientPipelinesModal` ──list/create/update/delete──> `services/api.ts`
`services/api.ts` ──fetch──> `/clients/{client_id}/pipelines*`
`ClientPipelinesModal` ──convert one / convert all──> `services/api.ts`
`services/api.ts` ──fetch──> `/clients/{client_id}/rules/{rule_id}/convert` / `/convert-all`

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `services/api.ts` | Modify | Exportar interfaces `ClientPipeline*` y métodos CRUD/convert/batch |
| `pages/Clients.tsx` | Modify | Agregar acción “Pipelines” por cliente y estado para abrir/cerrar modal |
| `components/ClientPipelinesModal.tsx` | Create | Modal con inventario, formulario, conversión por regla y batch |
| `utils/pipelineSanitizer.ts` | Reuse | Usar helper actual para normalizar YAML antes de persistir |

## Interfaces / Contracts

```ts
export interface ClientPipeline {
  id: number;
  client_id: number;
  rule_id: number;
  pipeline_name: string;
  target_backend: string;
  target_format: string;
  position: number;
  pipeline_yaml: string;
  warning?: string | null;
  updated_at: string | null;
}

listClientPipelines(clientId, { rule_id?, page?, page_size? })
createClientPipeline(clientId, payload)
updateClientPipeline(clientId, pipelineId, payload)
deleteClientPipeline(clientId, pipelineId)
convertClientRule(clientId, ruleId)
convertAllClientRules(clientId)
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | YAML sanitization wiring and payload shaping | Reuse existing helper expectations once test runner exists |
| Integration | Modal state, CRUD flows, convert-one, convert-all | Not available today; verify manually against API + `npx tsc --noEmit` |
| E2E | End-to-end admin flow from client card to batch conversion | Not available today |

## Migration / Rollout

No migration required. The feature is additive on top of existing client profiles and backend APIs.

## Open Questions

- [ ] Si la acción “Pipelines” debe vivir en la card principal o dentro del modal de reglas.
- [ ] Si la vista batch debe permitir descarga/copia de resultados en la primera iteración.
