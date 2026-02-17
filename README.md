# DaC Sentinel — Detection as Code Platform

> Plataforma web para gestión, búsqueda, generación y cobertura de reglas Sigma en entornos SOC/Detection Engineering.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript, Vite (ESM), TailwindCSS v3 |
| Routing | Hash-based SPA (`#/route`) |
| Charts | Recharts |
| Icons | lucide-react |
| Backend | REST API en `http://localhost:8000/api/v1` (externa, no incluida) |
| Auth | JWT Bearer — `localStorage` (`access_token` / `user`) |
| AI (rules) | Gemini API (clave en `.env.local`) |

---

## Arquitectura

```
src/
├── index.tsx          # Entry point — ReactDOM.createRoot + AuthProvider
├── App.tsx            # Router hash-based + PrivateRoute guard
├── constants.ts       # API_BASE_URL, paleta de colores/charts
├── services/
│   └── api.ts         # ApiService class — único adaptador HTTP (fetch)
├── context/
│   └── AuthContext.tsx # AuthProvider — estado global de sesión
├── components/
│   ├── Layout.tsx      # Shell: sidebar + header + nav
│   └── Modal.tsx       # Modal genérico (size: sm/md/lg/xl/2xl)
└── pages/
    ├── Login.tsx
    ├── Dashboard.tsx   # Stats + charts (PieChart, BarChart)
    ├── RuleSearch.tsx  # Búsqueda paginada + filtros + export + detail modal
    ├── RuleGenerator.tsx # Generación IA + guardar local + PR proposal
    ├── MitreMatrix.tsx # Visualización ATT&CK Enterprise
    └── Admin.tsx       # Tabs: Users · Import · Reglas Locales · Indexer
```

---

## Rutas

| Hash | Página | Rol mínimo |
|------|--------|-----------|
| `#/login` | Login | — |
| `#/dashboard` | Dashboard | Analyst |
| `#/rules` | Librería de Reglas | Analyst |
| `#/generator` | Generador IA | Analyst (guardar: Admin) |
| `#/mitre` | Matriz MITRE ATT&CK | Analyst |
| `#/admin` | Administración | **Admin** |

---

## Funcionalidades clave

### Dashboard
- Total reglas, cobertura ATT&CK (%), reglas estables vs. experimentales.
- Gráficos: distribución por nivel (PieChart) y top data sources (BarChart).

### Librería de Reglas (`RuleSearch`)
- Búsqueda full-text con debounce (400 ms) + filtros dinámicos (nivel, estado, producto, autor, origen).
- Export: síncrono (ZIP directo) o asíncrono con polling de estado.
- Modal de detalle con YAML completo de la regla.

### Generador de Reglas IA (`RuleGenerator`)
- Input en lenguaje natural → regla Sigma YAML vía Gemini.
- Opciones: copiar YAML, guardar como regla local (Admin), crear PR en Git.

### Matriz MITRE (`MitreMatrix`)
- Visualización horizontal de tácticas/técnicas con cobertura coloreada (verde = cubierta).
- Admin puede disparar actualización de datos MITRE en background.

### Administración (`Admin`) — solo Admin
- **Users**: CRUD de usuarios, roles (Analyst / Admin), activación.
- **Import**: sincronización SigmaHQ, clonado Git, upload ZIP.
- **Reglas Locales**: CRUD de reglas en `rules/local/` con indexación automática.
- **Indexer**: stats del índice, preview de errores (exportables JSON/CSV), trigger reindex, scheduler jobs.

---

## Configuración

```bash
# .env.local
GEMINI_API_KEY=<tu-clave>
```

```ts
// constants.ts
export const API_BASE_URL = 'http://localhost:8000/api/v1';
```

---

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build producción
npm run build
```

> El backend (`localhost:8000`) debe estar corriendo independientemente. Consulta su propio README para configuración.

---

## Auth Flow

1. `POST /auth/login` → guarda `access_token` + `user` en `localStorage`.
2. En cada request, `ApiService` inyecta `Authorization: Bearer <token>`.
3. HTTP 401 → limpia storage y redirige a `#/login`.
4. `AuthProvider` valida el token al montar vía `GET /auth/me`.

---

## Roles

| Rol | Enum | Capacidades |
|-----|------|-------------|
| `analyst` | `UserRole.ANALYST` | Lectura, búsqueda, generación IA |
| `admin` | `UserRole.ADMIN` | Todo lo anterior + CRUD usuarios, import, indexer, guardar reglas locales, sync MITRE |

---

## Notas de seguridad

- Los tokens JWT se almacenan en `localStorage` (riesgo XSS). Para entornos de alta seguridad, migrar a cookies `HttpOnly`.
- `GEMINI_API_KEY` no debe exponerse en el bundle de cliente; mover a proxy backend.
- Sin CSRF explícito (API stateless con Bearer); adecuado si se añaden headers `SameSite` en cookies.