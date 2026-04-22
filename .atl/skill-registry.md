# Skill Registry

## Project

- Root: `C:/Users/jose.hernandez/Documents/DaC/DaC-Frontend`
- Project-level instruction files: none detected
- Project-level custom skills: none detected

## Project Conventions

- React 19 + TypeScript + Vite SPA
- Hash-based routing in `App.tsx`
- Auth centralized in `context/AuthContext.tsx`
- REST access centralized in `services/api.ts`
- Feature pages under `pages/` and shared UI under `components/`

## Available User Skills

| Skill | Source | Trigger / Use |
|---|---|---|
| `branch-pr` | user | Crear PRs y preparar ramas para review |
| `go-testing` | user | Go tests y Bubbletea TUI testing |
| `issue-creation` | user | Crear issues siguiendo workflow issue-first |
| `judgment-day` | user | Review adversarial dual y re-juzgado |
| `skill-creator` | user | Crear nuevas skills para agentes |

## Notes

- Skills `sdd-*`, `_shared` y `skill-registry` se excluyen de esta registry operativa porque son infraestructura del workflow.
- Si el proyecto suma skills locales, deben agregarse en `.claude/skills/`, `.agent/skills/` o `skills/` dentro del repo.
