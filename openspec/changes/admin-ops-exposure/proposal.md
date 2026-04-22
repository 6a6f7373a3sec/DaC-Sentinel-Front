# Proposal: Admin Ops Exposure

## Intent

Completar en el frontend los endpoints administrativos de mayor valor que hoy existen en el backend pero no están visibles como flujo de producto. Esto cierra el hueco entre operación real y superficie UI para repositorios, export y system reload.

## Scope

### In Scope
- Exponer en frontend `PATCH /admin/repos/{id}` para edición operativa de repositorios.
- Agregar UI para `GET /export/jobs` y mejorar la visibilidad del estado de export asincrónico.
- Exponer `POST /admin/system/settings/reload` en un panel administrativo seguro.
- Alinear la experiencia con los contratos ya consumidos por `api.ts`.

### Out of Scope
- Cambios de contrato backend.
- Rediseño completo del Admin existente.
- Nuevas capacidades de export fuera del spec actual.

## Capabilities

### New Capabilities
- `admin-ops-exposure`: gestión operativa de repositorios, export jobs y reload de settings desde frontend.

### Modified Capabilities
- None.

## Approach

Agregar acciones puntuales dentro de `pages/Admin.tsx` y/o submodales dedicados para evitar inflar el panel principal. Reusar `services/api.ts` como adaptador único y mantener permisos admin explícitos.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `pages/Admin.tsx` | Modified | UI para repositorios, export jobs y reload settings |
| `services/api.ts` | Modified | Exponer contratos ya documentados en backend |
| `components/*` | New/Modified | Modales o paneles auxiliares para acciones admin |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| UI admin demasiado cargada | Medium | Extraer modales y agrupar por dominio |
| Contratos backend con respuestas heterogéneas | Medium | Tipos explícitos + manejo de errores por acción |
| Exposición accidental a roles no admin | Low | Guardas de rol existentes + revisión de rutas |

## Rollback Plan

Revertir cambios de `pages/Admin.tsx`, `services/api.ts` y los componentes auxiliares. No requiere migración.

## Dependencies

- Backend estable con `PATCH /admin/repos/{id}`, `GET /export/jobs` y `POST /admin/system/settings/reload`.

## Success Criteria

- [ ] Un admin puede editar un repo existente desde el frontend.
- [ ] Un admin puede ver y gestionar export jobs desde la UI.
- [ ] Un admin puede recargar settings sin salir de la app.
