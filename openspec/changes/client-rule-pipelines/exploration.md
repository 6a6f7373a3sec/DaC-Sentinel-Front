## Exploration: client-rule-pipelines

### Current State
`Clients.tsx` usa perfiles para análisis: CRUD, rules, coverage, gaps, compare y overrides. `SigmaConverter.tsx` resuelve conversión Sigma global con pipelines built-in o `pipeline_yaml` temporal. `services/api.ts` no expone la sección `/clients/{client_id}/pipelines`, por lo que hoy no existe persistencia `(cliente, regla) -> pipeline_yaml` ni conversión contextual por cliente.

### Affected Areas
- `services/api.ts` — faltan tipos y métodos para pipelines por cliente y conversiones asociadas.
- `pages/Clients.tsx` — necesita entry point UI para administrar pipelines por cliente.
- `pages/SigmaConverter.tsx` — referencia útil para reutilizar patrones de pipeline/convert, pero no cubre persistencia por cliente.
- `utils/pipelineSanitizer.ts` — reutilizable para normalizar YAML antes de crear/editar pipelines.

### Approaches
1. **Modal desde Clientes** — agregar acceso desde cada tarjeta y operar dentro de un modal dedicado.
   - Pros: respeta el flujo actual centrado en perfiles; bajo costo cognitivo.
   - Cons: más estado compartido con `Clients.tsx`.
   - Effort: Medium.

2. **Nueva ruta de pipelines** — crear una pantalla separada por cliente.
   - Pros: aísla complejidad y escala mejor.
   - Cons: rompe el flujo actual; más navegación y wiring inicial.
   - Effort: High.

### Recommendation
Abrir la capacidad desde `Clients.tsx`, pero extraer la UI compleja a un modal/componente dedicado. Así mantenemos el entry point actual sin seguir inflando un archivo ya muy grande.

### Risks
- `Clients.tsx` ya es extenso y puede degradarse si toda la lógica queda inline.
- El backend permite warnings y errores de validación (`409`, `422`) que la UI debe modelar explícitamente.
- `convert-all` devuelve errores parciales por regla; la UX debe distinguir éxito parcial de fallo total.

### Ready for Proposal
Yes — el alcance y el approach ya están claros.
