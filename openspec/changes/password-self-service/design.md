# Design: Password Self-Service

**Change:** `password-self-service`
**Stack:** React 19, TypeScript, Vite SPA
**Status:** Draft

## Technical Approach

Agregar una página protegida `#/change-password` y un método `api.changePassword()` que reutiliza el adaptador HTTP actual. El cambio autenticado se implementa ahora; la recuperación por email queda como contrato backend documentado en `backend-api-spec.md`.

## Architecture Decisions

### Decision: Usar página protegida y no modal global

**Choice**: Crear `pages/ChangePassword.tsx` y rutearla desde `App.tsx`.
**Alternatives considered**: Modal desde `Layout.tsx`; reutilizar el form de Admin.
**Rationale**: El proyecto ya organiza navegación por hash routes y páginas. Una ruta dedicada reduce acoplamiento con el header, permite deep-link interno y evita mezclar el cambio self-service con el CRUD admin.

### Decision: Reusar `ApiService.request()` con success `204`

**Choice**: Definir `changePassword()` sobre `POST /auth/change-password`, esperando `204` como caso nominal.
**Alternatives considered**: `200` con payload obligatorio; fetch inline en la página.
**Rationale**: `request()` ya resuelve `204` sin cuerpo y centraliza headers, auth y manejo base de errores.

### Decision: Soportar reautenticación como contrato opcional explícito

**Choice**: Permitir que backend responda `200 { reauth_required: true }` si invalida la sesión actual.
**Alternatives considered**: Invalidar silenciosamente el token y esperar un `401` posterior; mantener siempre la sesión actual.
**Rationale**: Evita UX confusa. Si el backend decide endurecer seguridad, el frontend puede cerrar sesión de forma intencional y mostrar contexto de éxito.

## Data Flow

```text
User
  -> Layout header action
  -> hash change `#/change-password`
  -> App.tsx / PrivateRoute
  -> ChangePassword.tsx
  -> api.changePassword(current_password, new_password)
  -> POST /auth/change-password
  <- 204 success OR 200 { reauth_required } OR 4xx error
  -> success message / graceful logout / inline error
```

## Sequence Diagram

```text
User -> Layout: click "Cambiar contraseña"
Layout -> App: set hash #/change-password
App -> ChangePasswordPage: render protected route
User -> ChangePasswordPage: submit current/new/confirm
ChangePasswordPage -> ApiService: changePassword(...)
ApiService -> Backend: POST /auth/change-password
Backend --> ApiService: 204 | 200 reauth_required | 4xx
ApiService --> ChangePasswordPage: resolved/rejected promise
ChangePasswordPage -> User: success message or error
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `pages/ChangePassword.tsx` | Create | Formulario self-service con estado local y feedback |
| `services/api.ts` | Modify | Método `changePassword()` y tipo de respuesta opcional |
| `App.tsx` | Modify | Ruta protegida `#/change-password` |
| `components/Layout.tsx` | Modify | Acción visible para navegar al flujo |
| `README.md` | Modify | Documentar nueva ruta y flujo auth |

## Interfaces / Contracts

```ts
type ChangePasswordResponse = void | { reauth_required: true; message?: string };

changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse>
```

Nominal request body:

```json
{
  "current_password": "current-secret",
  "new_password": "new-secret"
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Manual UI | Validación current/new/confirm | Navegación y submits manuales |
| Integration-lite | Success/error contract with backend | Probar contra endpoint real o mock temporal |
| Type safety | Nuevos tipos y firmas | `npx tsc --noEmit` |

## Migration / Rollout

No migration required. Deploy frontend change once backend exposes `POST /auth/change-password`.

## Open Questions

- [ ] Backend mantendrá la sesión actual o exigirá `reauth_required`?
- [ ] El backend devolverá mensajes de policy suficientemente específicos para mapearlos 1:1 en UI?
