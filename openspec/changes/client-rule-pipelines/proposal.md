# Proposal: Client Rule Pipelines

## Intent

Cerrar la brecha entre el potencial del backend y el frontend para que un perfil de cliente no sea solo analítico. El objetivo es permitir asociar pipelines pySigma YAML a reglas por cliente y ejecutar conversiones basadas en esa configuración persistida.

## Scope

### In Scope
- Exponer en `services/api.ts` la sección `/clients/{client_id}/pipelines` y sus conversiones.
- Agregar una UI desde `Clientes` para listar, crear, editar y eliminar pipelines por regla.
- Permitir convertir una regla y ejecutar `convert-all` usando pipelines persistidos por cliente.
- Mostrar warnings y errores del backend (`warning`, `409`, `422`, errores parciales de batch).

### Out of Scope
- Cambios en el contrato backend.
- Reemplazar `SigmaConverter` como herramienta genérica global.
- Rediseño total de `Clients.tsx`.

## Capabilities

### New Capabilities
- `client-rule-pipelines`: gestión y uso de pipelines pySigma persistidos por cliente/regla desde el frontend.

### Modified Capabilities
- None.

## Approach

Usar `Clients.tsx` como punto de entrada y delegar la complejidad a un modal/componente dedicado. Reutilizar `sanitizePipelineYaml()` para entradas YAML y mantener `services/api.ts` como adaptador HTTP único.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `services/api.ts` | Modified | Tipos y métodos para CRUD + convert por cliente |
| `pages/Clients.tsx` | Modified | Acción para abrir la gestión de pipelines |
| `components/ClientPipelinesModal.tsx` | New | UI principal de pipelines por cliente |
| `utils/pipelineSanitizer.ts` | Reused | Normalización de YAML antes de persistir |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| UX confusa entre converter global y converter por cliente | Medium | Etiquetado claro y entry point desde perfiles |
| Conflictos de `position` o YAML inválido | High | Validación previa + surfacing explícito de errores backend |
| Más complejidad en `Clients.tsx` | Medium | Extraer modal y helpers a archivo dedicado |

## Rollback Plan

Revertir cambios en `Clients.tsx`, `services/api.ts` y el modal nuevo; al no tocar contrato backend ni persistencia del frontend, el rollback es solo de UI/adaptador.

## Dependencies

- Backend con sección 12 disponible según `API_Spec.md`.

## Success Criteria

- [ ] Un admin puede crear, editar y borrar pipelines por regla dentro de un cliente.
- [ ] La UI puede convertir una regla y ejecutar `convert-all` usando pipelines persistidos por cliente.
- [ ] Warnings y errores del backend se muestran de forma accionable.
