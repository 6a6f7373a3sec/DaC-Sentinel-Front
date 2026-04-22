# Tasks: Client Profile Lifecycle

## Phase 1: API layer

- [x] 1.1 Extender `ClientProfile` en `services/api.ts` con `deleted_at?: string | null` y `deleted_by?: string | null`.
- [x] 1.2 Actualizar `listClients()` para aceptar `options?: { includeDeleted?: boolean }` y pasar `?include_deleted=true` cuando corresponda.

## Phase 2: Restore persistente

- [x] 2.1 Importar `useAuth` y `UserRole` en `Clients.tsx`. Derivar `isAdmin`.
- [x] 2.2 Actualizar `loadClients()` para llamar `listClients({ includeDeleted: isAdmin })` e incluir `isAdmin` como dependencia del `useCallback`.
- [x] 2.3 Eliminar estado `recentlyDeleted`. Derivar `deletedClients` y `activeClients` como filtros sobre `clients`.
- [x] 2.4 Simplificar `handleDelete` (sin mutación de `recentlyDeleted`).
- [x] 2.5 Simplificar `handleRestore` (sin mutación de `recentlyDeleted`).
- [x] 2.6 Reemplazar el bloque UI de "perfiles eliminados recientemente" por la nueva sección persistente (solo visible para admins, usa `deletedClients`).

## Phase 3: Visibilidad de estado

- [x] 3.1 Agregar helper `getLifecycleStatus()` y `BADGE_CONFIG` en `Clients.tsx`.
- [x] 3.2 Reemplazar la lógica de badge de `is_active` existente por el nuevo helper. El estado "Eliminado" tiene prioridad sobre "Inactivo".
- [x] 3.3 Mostrar metadatos de eliminación (`deleted_at`, `deleted_by`) en la fila del perfil cuando aplique.

## Phase 4: Filtros avanzados

- [x] 4.1 Agregar `parseTagsInput()` helper en `ClientFormModal`.
- [x] 4.2 Agregar estados locales `tagsInclude` y `tagsExclude` (tipo `string`) inicializados desde `editing?.filters?.tags_include/exclude`.
- [x] 4.3 Agregar estado `levels` (tipo `string[]`) inicializado desde `editing?.filters?.levels`.
- [x] 4.4 Agregar campos de texto para `tags_include` y `tags_exclude` en la UI del form.
- [x] 4.5 Agregar checkboxes para `levels` (patrón idéntico al de `statuses`).
- [x] 4.6 Persistir los tres filtros nuevos en `handleSave`.

## Phase 5: Verificación

- [x] 5.1 Ejecutar `npx tsc --noEmit` sin errores.
- [x] 5.2 Verificar manualmente: admin ve eliminados al recargar; no-admin no los ve.
- [x] 5.3 Verificar que filtros avanzados se guardan y se muestran en el summary.
- [x] 5.4 Actualizar documentación: `frontend-api-cobertura.md`.
