# Proposal: Client Profile Lifecycle

## Intent

Completar el ciclo de vida de perfiles de cliente en frontend: restore persistente, visibilidad de perfiles eliminados y edición de filtros avanzados que hoy el UI no cubre completamente.

## Scope

### In Scope
- Convertir el restore de perfiles en una capacidad persistente, no solo session-local.
- Exponer edición de filtros avanzados: `tags_include`, `tags_exclude`, `levels` y refinamientos relacionados.
- Mejorar la visibilidad del estado activo/inactivo/eliminado de perfiles.

### Out of Scope
- Pipelines por cliente (ya resuelto).
- Reescritura del modelo de cobertura/gaps.
- Cambios mayores en la navegación general de Clientes.

## Capabilities

### New Capabilities
- `client-profile-lifecycle`: gestión completa del estado de perfiles de cliente y sus filtros avanzados.

### Modified Capabilities
- `client-profiles`: el frontend deja de tratar la restauración como undo temporal y pasa a soportar restore real cuando el backend lo permita.

## Approach

Extender `pages/Clients.tsx` y el modal de formulario para editar filtros faltantes y mostrar estados de lifecycle con claridad. Si el backend requiere un endpoint adicional para listar soft-deleted, documentarlo como dependencia explícita.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `pages/Clients.tsx` | Modified | UX de lifecycle, restore persistente y visibilidad de estados |
| `services/api.ts` | Modified | Endpoints para restore/listado si aplica |
| `components/ClientFormModal.tsx` | Modified/New | Edición de filtros avanzados |
| `docs/` | Modified | Actualización del flujo y contrato operativo |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Backend sin listado de soft-deleted | High | Definir endpoint o política de visibilidad antes de implementar |
| Formulario de cliente más complejo | Medium | Agrupar filtros en secciones claras |
| Ambigüedad entre active/inactive/deleted | Medium | Labels y acciones separadas |

## Rollback Plan

Revertir cambios en `Clients.tsx`, `ClientFormModal.tsx` y `services/api.ts`. Sin migración.

## Dependencies

- Backend con soporte claro para restore/listado de perfiles soft-deleted o confirmación de alternativa funcional.

## Success Criteria

- [ ] El frontend puede restaurar perfiles sin depender de una sesión viva בלבד.
- [ ] Los filtros avanzados quedan editables en UI.
- [ ] El estado lifecycle de cada perfil es visible y accionable.
