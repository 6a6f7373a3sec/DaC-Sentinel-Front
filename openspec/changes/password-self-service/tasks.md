# Tasks: Password Self-Service

## Phase 1: API contract wiring

- [x] 1.1 Agregar `changePassword(currentPassword, newPassword)` en `services/api.ts` usando `POST /auth/change-password`.
- [x] 1.2 Definir el tipo de respuesta para cubrir `204` nominal y `reauth_required` opcional.

## Phase 2: Protected UI flow

- [x] 2.1 Crear `pages/ChangePassword.tsx` con campos `currentPassword`, `newPassword` y `confirmPassword`.
- [x] 2.2 Implementar validación local para confirmación, estados `loading/error/success` y limpieza de campos sensibles tras éxito.
- [x] 2.3 Actualizar `App.tsx` para rutear `#/change-password` dentro de `PrivateRoute`.

## Phase 3: App shell integration

- [x] 3.1 Actualizar `components/Layout.tsx` con una acción visible para navegar al flujo de cambio de contraseña.
- [x] 3.2 Resolver el caso `reauth_required` con logout explícito y retorno controlado a `#/login`.

## Phase 4: Verification

- [ ] 4.1 Verificar manualmente que un usuario autenticado puede abrir el flujo y que uno no autenticado es redirigido.
- [ ] 4.2 Verificar manualmente mismatch de confirmación, error por current password inválido y success nominal.
- [x] 4.3 Ejecutar `npx tsc --noEmit` sin errores.

## Phase 5: Documentation

- [x] 5.1 Actualizar `README.md` con la nueva ruta protegida y el flujo de cambio de contraseña.
- [x] 5.2 Entregar `openspec/changes/password-self-service/backend-api-spec.md` al equipo backend como contrato de recovery/change.
