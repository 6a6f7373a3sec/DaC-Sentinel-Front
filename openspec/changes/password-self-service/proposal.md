# Proposal: Password Self-Service

## Intent

Permitir que cada usuario autenticado cambie su propia contraseña desde la app, sin depender del Admin, y dejar acordado el contrato backend para recuperación por email.

## Scope

### In Scope
- Exponer un flujo protegido para cambio de contraseña estando logueado.
- Agregar el contrato frontend para `POST /auth/change-password` en `services/api.ts`.
- Añadir un entry point visible desde el shell autenticado.
- Documentar el handoff backend para recuperación por email y tokens de reset.

### Out of Scope
- Implementar la UI pública de “forgot/reset password” antes de que exista el contrato backend.
- Guardar secretos SMTP o la app password de Google en el frontend.
- Rediseñar el modelo actual de sesión JWT en `localStorage`.

## Capabilities

### New Capabilities
- `account-password-change`: cambio de contraseña self-service para usuarios autenticados.

### Modified Capabilities
- None.

## Approach

Agregar una página protegida `#/change-password`, enlazada desde `Layout.tsx`, y reutilizar `services/api.ts` como adaptador único. La recuperación por email queda documentada en un handoff técnico dentro del mismo change para que backend implemente endpoints, tokens y SMTP sin bloquear el cambio autenticado.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `App.tsx` | Modified | Nueva ruta autenticada para cambio de contraseña |
| `components/Layout.tsx` | Modified | Entry point desde el shell autenticado |
| `pages/ChangePassword.tsx` | New | Formulario self-service con validaciones |
| `services/api.ts` | Modified | Método `changePassword()` |
| `openspec/changes/password-self-service/backend-api-spec.md` | New | Handoff para backend |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Semántica incierta de reautenticación | Medium | Fijar contrato explícito en backend-api-spec |
| Error messages ambiguos | Medium | Normalizar respuestas de backend por caso |
| Scope creep hacia recovery UI | High | Mantener forgot/reset como dependencia externa |

## Rollback Plan

Revertir cambios en `App.tsx`, `Layout.tsx`, `pages/ChangePassword.tsx` y `services/api.ts`. El handoff backend puede conservarse como documento operativo sin impacto runtime.

## Dependencies

- Backend con `POST /auth/change-password`.
- Backend alineado con el contrato de recuperación por email definido en este change.

## Success Criteria

- [ ] Un usuario autenticado puede abrir el flujo y enviar cambio de contraseña sin intervención admin.
- [ ] El frontend tiene un contrato claro para manejar éxito, error y posible reautenticación.
- [ ] Backend recibe una spec accionable para recovery por email y SMTP.
