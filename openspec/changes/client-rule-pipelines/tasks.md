# Tasks: Client Rule Pipelines

## Phase 1: API foundation

- [x] 1.1 Extender `services/api.ts` con interfaces para `ClientPipeline`, respuestas paginadas y resultados de conversión por cliente.
- [x] 1.2 Agregar métodos `list/create/get/update/delete` para `/clients/{client_id}/pipelines`.
- [x] 1.3 Agregar métodos `convertClientRule()` y `convertAllClientRules()` para la sección 12 del spec.

## Phase 2: Client entry point

- [x] 2.1 Modificar `pages/Clients.tsx` para agregar acción “Pipelines” por cliente y estado del modal.
- [x] 2.2 Crear `components/ClientPipelinesModal.tsx` con carga inicial de inventario y filtro opcional por regla.
- [x] 2.3 Reutilizar `api.getClientRules()` para poblar el selector de reglas dentro del modal.

## Phase 3: CRUD and conversions

- [x] 3.1 Implementar formulario create/edit con `pipeline_name`, `target_backend`, `target_format`, `position` y `pipeline_yaml`.
- [x] 3.2 Integrar `sanitizePipelineYaml()` antes de `POST` y `PATCH`, mostrando qué claves fueron removidas.
- [x] 3.3 Implementar delete con confirmación y refresh optimista del inventario.
- [x] 3.4 Implementar conversión por regla usando `convertClientRule()` y vista del resultado.
- [x] 3.5 Implementar `convert-all` con resumen `success_count`, `error_count` y detalle por regla.

## Phase 4: Feedback and resilience

- [x] 4.1 Mapear `warning`, `409`, `422` y errores parciales de batch a mensajes accionables en el modal.
- [x] 4.2 Diferenciar claramente pipelines globales del converter versus pipelines persistidos por cliente.

## Phase 5: Verification

- [x] 5.1 Ejecutar `npx tsc --noEmit` para validar tipos tras el wiring nuevo.
- [ ] 5.2 Verificar manualmente escenarios del spec: listar, crear, editar, borrar, convertir una regla, convertir batch con fallos parciales.
- [x] 5.3 Actualizar documentación funcional si el flujo final difiere del diseño.
