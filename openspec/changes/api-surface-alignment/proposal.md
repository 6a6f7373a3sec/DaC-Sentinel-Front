# Proposal: API Surface Alignment

## Intent

Alinear la superficie del frontend con los endpoints ya disponibles en `services/api.ts` pero sin UI real, y separar claramente qué se implementará, qué se documentará y qué quedará fuera de alcance.

## Scope

### In Scope
- Exponer o documentar `health`, `getRepo`, MITRE helpers, branch operations y export by IDs según el valor de negocio real.
- Revisar qué endpoints necesitan UI y cuáles solo necesitan documentación.
- Cerrar desvíos de contrato menores entre frontend y spec donde aporten claridad.

### Out of Scope
- Google Auth (fuera de alcance hasta nuevo aviso explícito).
- Nuevas capacidades de dominio fuera de los endpoints ya existentes.
- Rediseños amplios de páginas ya consolidadas.

## Capabilities

### New Capabilities
- `api-surface-alignment`: consistencia entre contratos consumidos, UI visible y documentación pública.

### Modified Capabilities
- `api-reference`: algunas rutas existentes pasarán de “solo en `api.ts`” a “documentadas o expuestas según convenga”.

## Approach

Partir de la lista de gaps documentados y clasificar cada endpoint en una de tres salidas: UI nueva, documentación explícita o exclusión deliberada. Mantener el foco en limpieza de superficie, no en acumular features sin dueño.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `services/api.ts` | Review/Modify | Ajuste de contratos y métodos huérfanos |
| `pages/*` | Maybe Modify | Solo si el endpoint tiene valor suficiente para UI |
| `DaC-Docs` | Modify | Documentación de qué queda visible, qué no y por qué |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope creep | High | Clasificar endpoints antes de tocar UI |
| Duplicación de esfuerzos con otros changes | Medium | Mantener este change estrictamente de alineación/surface cleanup |
| Mezcla de features con docs | Medium | Separar implementación de documentación por endpoint |

## Rollback Plan

Revertir cambios de UI/documentación si se detecta que el criterio de alineación no aporta valor suficiente.

## Dependencies

- Confirmación de prioridad sobre cada endpoint huérfano.

## Success Criteria

- [ ] Cada endpoint huérfano queda clasificado como UI, docs o fuera de alcance.
- [ ] No quedan contratos ambiguos sin dueño.
- [ ] La documentación refleja el estado real de la superficie API/frontend.
