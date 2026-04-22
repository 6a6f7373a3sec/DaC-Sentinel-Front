# Backend API Spec: Password Change & Recovery

## Goal

Soportar ambos flujos pedidos por producto:

1. **Cambio de contraseña estando logueado**.
2. **Recuperación por email** para usuarios que olvidaron su contraseña.

## Contexto frontend verificado

- SPA React/Vite con hash routing.
- Auth actual: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- Token Bearer persistido en `localStorage`.
- `ApiService.request()` ya trata `204 No Content` como success.
- El frontend todavía NO tiene un flujo real de recovery por token; hoy solo existe un reset dev-only.

## Required Endpoints

### 1) `POST /auth/change-password`

**Auth**: Bearer requerido.

**Request body**

```json
{
  "current_password": "current-secret",
  "new_password": "new-secret"
}
```

**Recommended responses**

- `204 No Content` → password change exitoso, sesión actual sigue válida.
- `200 OK` + `{ "reauth_required": true, "message": "Password updated" }` → éxito, pero el frontend debe cerrar sesión de inmediato.
- `400 Bad Request` o `422 Unprocessable Entity` → `current_password` incorrecta, password policy o payload inválido.
- `401 Unauthorized` → sesión inválida, expirada o token ausente.
- `429 Too Many Requests` → rate limit.

**Backend rules**

- MUST verificar `current_password` contra el usuario autenticado.
- MUST aplicar policy del nuevo password antes de persistir.
- SHOULD reservar `401` exclusivamente para fallas de autenticación de la sesión y usar `400/422` para errores de negocio/validación.
- SHOULD auditar el evento.
- SHOULD invalidar otras sesiones activas del usuario.
- MUST devolver error accionable pero sin exponer internals.

### 2) `POST /auth/password-reset/request`

**Auth**: pública.

**Request body**

```json
{
  "email": "user@company.com"
}
```

**Recommended response**

- `202 Accepted` con mensaje genérico, tanto si el email existe como si no.

**Backend rules**

- MUST NOT filtrar existencia de cuenta por mensaje, status o timing grosero.
- MUST rate-limit por IP y por email.
- MUST generar token opaco, single-use y con expiración corta.
- MUST enviar email solo si el usuario existe y está habilitado.

### 3) `POST /auth/password-reset/confirm`

**Auth**: pública.

**Request body**

```json
{
  "token": "opaque-reset-token",
  "new_password": "new-secret"
}
```

**Recommended responses**

- `204 No Content` → reset exitoso.
- `400 Bad Request` → token inválido/expirado/usado o nueva password inválida.
- `429 Too Many Requests` → rate limit.

**Backend rules**

- MUST validar expiración y single-use.
- MUST invalidar el token luego del uso exitoso.
- MUST revocar sesiones activas tras reset exitoso.
- SHOULD auditar request y confirm por separado.

### 4) Optional: `GET /auth/password-reset/validate?token=...`

Útil si backend quiere que el frontend valide el link antes de mostrar el formulario. Si no existe, el frontend puede resolver todo desde `confirm`.

## Reset Token Model

- Token SHOULD expirar en 15–30 minutos.
- Token MUST almacenarse hasheado en backend, no en texto plano.
- Token MUST ser single-use.
- Backend SHOULD registrar `created_at`, `expires_at`, `used_at`, `requested_ip`.

## Email / SMTP Requirements

- El SMTP vive SOLO en backend.
- Para Gmail: `smtp.gmail.com` con `587` (STARTTLS) o `465` (SSL).
- La app password de Google debe ir en variables de entorno backend, NUNCA en frontend ni en git.

**Suggested env vars**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<correo>
SMTP_PASS=<google-app-password>
SMTP_FROM=<correo>
SMTP_SECURE=false
FRONTEND_RESET_URL=https://<frontend>/#/reset-password
```

**Email link format**

```text
{FRONTEND_RESET_URL}?token=<opaque-reset-token>
```

## Security Notes

- MUST NOT log raw passwords or raw reset tokens.
- MUST return generic copy for reset request to avoid user enumeration.
- SHOULD implementar cooldown/rate limit y auditoría.
- SHOULD definir password policy explícita para que frontend pueda reflejarla.

## Frontend Dependencies After Backend Delivery

Cuando estos endpoints existan, frontend podrá implementar:

- `#/forgot-password` → request email.
- `#/reset-password?token=...` → confirm new password.

OJO: el router actual usa comparaciones exactas de hash; para soportar `?token=...` habrá que parsear path y query en `App.tsx` en el change siguiente.
