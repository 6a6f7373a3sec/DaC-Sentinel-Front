# Spec: Client Profile Lifecycle

**Change:** `client-profile-lifecycle`
**Stack:** React 19, TypeScript, Vite SPA
**Status:** Draft

---

## Area 1 — Restore Persistente

### REQ-01: Modelo de datos con soporte de soft-delete

**Descripción**
`ClientProfile` en `services/api.ts` debe incluir los campos `deleted_at` y `deleted_by` que el backend ya retorna cuando un perfil está soft-deleted.

**Criterio de aceptación**
- La interfaz `ClientProfile` tiene `deleted_at: string | null` y `deleted_by: string | null`.
- Los campos son opcionales a nivel de tipo (pueden estar ausentes en respuestas antiguas o de endpoints que no incluyen soft-deleted).

**Área afectada:** `services/api.ts`

---

### REQ-02: Listado persistente de perfiles eliminados para admins

**Descripción**
Cuando el usuario autenticado tiene el rol `ADMIN`, `loadClients()` en `Clients.tsx` debe llamar a `GET /clients?include_deleted=true` para obtener tanto los activos como los soft-deleted. Los usuarios sin rol admin deben continuar llamando al endpoint sin ese parámetro.

**Criterio de aceptación**
- `api.listClients()` acepta un parámetro opcional `{ includeDeleted?: boolean }`.
- `Clients.tsx` determina si pasar `includeDeleted: true` basándose en `user?.roles.includes(UserRole.ADMIN)`.
- Los perfiles soft-deleted aparecen en la lista aunque la sesión haya sido reiniciada.
- Un usuario sin rol admin nunca ve perfiles eliminados.

**Área afectada:** `services/api.ts`, `pages/Clients.tsx`

---

### REQ-03: Eliminación del estado session-local de `recentlyDeleted`

**Descripción**
El estado `recentlyDeleted: ClientProfile[]` y toda la lógica que lo mantiene deben ser eliminados. La lista de eliminados pasa a ser parte del resultado de `loadClients()`.

**Criterio de aceptación**
- No existe `useState<ClientProfile[]>` para `recentlyDeleted`.
- `handleDelete` solo llama a `api.deleteClient()` y luego a `loadClients()`, sin mutar estado local.
- `handleRestore` solo llama a `api.restoreClient()` y luego a `loadClients()`.
- No aparece el texto "mientras sigas en esta sesión" en ningún mensaje de UI.

**Área afectada:** `pages/Clients.tsx`

---

### REQ-04: Acción de restore disponible solo para admins

**Descripción**
El botón o acción de restaurar un perfil eliminado solo debe mostrarse cuando el usuario tiene rol `ADMIN`.

**Criterio de aceptación**
- El control de restore está condicionado por `user?.roles.includes(UserRole.ADMIN)`.
- Un usuario sin admin que acceda a la página nunca ve el botón/acción de restore.

**Área afectada:** `pages/Clients.tsx`

---

## Area 2 — Filtros Avanzados

### REQ-05: Edición de `tags_include` en `ClientFormModal`

**Descripción**
El formulario de creación y edición de perfiles debe permitir definir los tags que deben estar presentes en un cliente para que el perfil aplique (`tags_include`).

**Criterio de aceptación**
- Existe un campo de entrada de tags (ej. multi-select o input de valores separados por coma) para `tags_include`.
- El valor se incluye en el payload de `POST /clients` y `PUT /clients/{id}` como array de strings.
- Si el perfil cargado para edición tiene `tags_include` populado, el campo lo refleja.
- El campo admite valor vacío (array vacío), que resulta en no filtrar por tags de inclusión.

**Área afectada:** `components/ClientFormModal.tsx` (o el componente equivalente en `Clients.tsx`)

---

### REQ-06: Edición de `tags_exclude` en `ClientFormModal`

**Descripción**
El formulario debe permitir definir los tags que, si están presentes en un cliente, lo excluyen del perfil (`tags_exclude`).

**Criterio de aceptación**
- Existe un campo de entrada de tags para `tags_exclude`, separado visualmente del de inclusión.
- El valor se incluye en el payload como array de strings.
- Si el perfil cargado tiene `tags_exclude` populado, el campo lo refleja.
- El campo admite valor vacío.

**Área afectada:** `components/ClientFormModal.tsx`

---

### REQ-07: Edición de `levels` en `ClientFormModal`

**Descripción**
El formulario debe permitir seleccionar los niveles de cliente que aplican al perfil (`levels`), como complemento al campo `min_level` ya existente.

**Criterio de aceptación**
- Existe un campo de selección múltiple para `levels`.
- El valor se incluye en el payload como array.
- Si el perfil cargado tiene `levels` populado, el campo lo refleja.
- El campo convive sin conflicto con `min_level`; ambos pueden estar presentes en el payload.
- El campo admite valor vacío.

**Área afectada:** `components/ClientFormModal.tsx`

---

### REQ-08: Los filtros avanzados ya guardados se muestran correctamente en el summary

**Descripción**
La vista de resumen/detalle de un perfil debe mostrar `tags_include`, `tags_exclude` y `levels` cuando el backend los retorna, con independencia de si fueron editados en esta versión del form o en una anterior.

**Criterio de aceptación**
- El summary no muestra "-" o vacío para `tags_include`/`tags_exclude`/`levels` cuando el objeto `filters` del perfil los tiene populados.
- Este requisito ya parece cumplido según el contexto; se incluye para confirmar regresión no introducida.

**Área afectada:** `pages/Clients.tsx`

---

## Area 3 — Visibilidad de Estado

### REQ-09: Diferenciación visual de perfiles activos, inactivos y eliminados

**Descripción**
La lista de perfiles debe mostrar el estado lifecycle de cada perfil de forma clara y diferenciada, sin ambigüedad entre activo, inactivo y eliminado.

**Criterio de aceptación**
- Los perfiles con `is_active: true` y sin `deleted_at` muestran un indicador "Activo" (ej. badge verde).
- Los perfiles con `is_active: false` y sin `deleted_at` muestran "Inactivo" (ej. badge gris o amarillo).
- Los perfiles con `deleted_at` populado muestran "Eliminado" (ej. badge rojo o tachado), nunca mezclados visualmente con los activos.
- Los tres estados se distinguen solo con color + label (no solo color, por accesibilidad).

**Área afectada:** `pages/Clients.tsx`

---

### REQ-10: Agrupación o separación visual de perfiles eliminados

**Descripción**
Los perfiles soft-deleted no deben aparecer intercalados entre los activos/inactivos sin aviso. Deben estar visualmente separados del grupo principal.

**Criterio de aceptación**
- Existe una sección, grupo o separador visual que delimita los perfiles eliminados del resto.
- La separación puede ser un encabezado de sección, un acordeón colapsable o un tab separado — a decisión del diseño, pero debe ser explícita.
- Si no hay perfiles eliminados, la sección no aparece.

**Área afectada:** `pages/Clients.tsx`

---

### REQ-11: Metadatos de eliminación visibles en el detalle

**Descripción**
Para perfiles eliminados, el tooltip, la fila expandida o algún elemento de detalle debe mostrar cuándo y por quién fue eliminado.

**Criterio de aceptación**
- Se muestra `deleted_at` formateado como fecha legible (no ISO crudo).
- Se muestra `deleted_by` cuando está disponible.
- La información solo aparece cuando `deleted_at` no es null.

**Área afectada:** `pages/Clients.tsx`

---

## Dependencias externas confirmadas

| Endpoint | Estado | Notas |
|----------|--------|-------|
| `GET /clients?include_deleted=true` | Disponible | Requiere rol ADMIN. Soft-deleted tienen `deleted_at` y `deleted_by`. Activos primero. |
| `POST /clients/{id}/restore` | Disponible | Ya existía. |

---

## Out of Scope (confirmado desde proposal)

- Cambios en pipelines por cliente.
- Reescritura del modelo de cobertura/gaps.
- Cambios en navegación general.
