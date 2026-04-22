# Design: Client Profile Lifecycle

**Change:** `client-profile-lifecycle`
**Stack:** React 19, TypeScript, Vite SPA
**Status:** Draft

---

## 1. `services/api.ts` — Extensión del modelo y firma de `listClients()`

### 1.1 Extensión de `ClientProfile`

```typescript
export interface ClientProfile {
  id: number;
  name: string;
  description: string | null;
  filters: Record<string, any>;
  is_active: boolean;
  rule_count: number;
  created_at: string;
  updated_at: string | null;
  // campos soft-delete — opcionales para retrocompatibilidad con respuestas sin include_deleted
  deleted_at?: string | null;
  deleted_by?: string | null;
}
```

**Decisión:** campos opcionales (`?`) y no `| null` estricto en la declaración. El backend ya los retorna en `GET /clients?include_deleted=true`; para el endpoint sin ese parámetro los campos simplemente no vienen. Marcarlos como opcionales evita castings en todo el código consumidor que no gestiona eliminados.

### 1.2 Firma de `listClients()`

```typescript
async listClients(
  options: { includeDeleted?: boolean } = {}
): Promise<{ items: ClientProfile[]; total: number }> {
  const params = options.includeDeleted ? '?include_deleted=true' : '';
  return this.request<{ items: ClientProfile[]; total: number }>(
    `/clients${params}`
  );
}
```

Sin romper la firma actual: el parámetro tiene default `{}`, por lo que cualquier llamada existente sin argumentos sigue funcionando.

---

## 2. `pages/Clients.tsx` — Estado y handlers

### 2.1 Nuevo estado: reemplazar `recentlyDeleted` por `deletedClients`

```typescript
// ANTES
const [recentlyDeleted, setRecentlyDeleted] = useState<ClientProfile[]>([]);
const [restoringId, setRestoringId] = useState<number | null>(null);

// DESPUÉS
// recentlyDeleted se elimina por completo.
// Los eliminados llegan como parte de clients[] y se derivan:
const deletedClients = clients.filter(c => c.deleted_at != null);
const activeClients = clients.filter(c => c.deleted_at == null);
```

`clients` sigue siendo `useState<ClientProfile[]>([])`. El split activos/eliminados es derivado en render, sin estado extra.

### 2.2 `loadClients()` actualizado

```typescript
const isAdmin = user?.roles.includes(UserRole.ADMIN) ?? false;

const loadClients = useCallback(async () => {
  const res = await api.listClients({ includeDeleted: isAdmin });
  setClients(res.items);
}, [isAdmin]);
```

**Decisión:** `isAdmin` como dependencia del callback. Si el rol cambia (edge case: re-login sin recargar), el callback se recrea y el próximo `loadClients()` usa el valor correcto.

### 2.3 `handleDelete` simplificado

```typescript
const handleDelete = async (c: ClientProfile) => {
  await api.deleteClient(c.id);
  await loadClients();
  // sin mutación de recentlyDeleted
};
```

### 2.4 `handleRestore` — sin cambios funcionales

```typescript
const handleRestore = async (profile: ClientProfile) => {
  await api.restoreClient(profile.id);
  await loadClients();
  // sin mutación de recentlyDeleted
};
```

La lógica ya era correcta; solo se elimina la línea que filtraba `recentlyDeleted`.

### 2.5 UI: sección de eliminados

```tsx
{isAdmin && deletedClients.length > 0 && (
  <section aria-label="Perfiles eliminados">
    <h3 className="...">Eliminados ({deletedClients.length})</h3>
    {deletedClients.map(c => (
      <ClientRow
        key={c.id}
        client={c}
        onRestore={() => handleRestore(c)}
        showRestoreButton={true}
      />
    ))}
  </section>
)}
```

La sección solo se renderiza si `isAdmin && deletedClients.length > 0`. No aparece para usuarios sin admin.

---

## 3. `ClientFormModal` — Filtros avanzados

### 3.1 Nuevos estados

```typescript
// existentes
const [minLevel, setMinLevel] = useState(editing?.filters?.min_level || '');
const [statuses, setStatuses] = useState<string[]>(editing?.filters?.statuses || []);
const [repoSourceIds, setRepoSourceIds] = useState<number[]>(editing?.filters?.repo_source_ids || []);

// nuevos
const [tagsInclude, setTagsInclude] = useState<string>(
  (editing?.filters?.tags_include as string[] | undefined)?.join(', ') ?? ''
);
const [tagsExclude, setTagsExclude] = useState<string>(
  (editing?.filters?.tags_exclude as string[] | undefined)?.join(', ') ?? ''
);
const [levels, setLevels] = useState<string[]>(editing?.filters?.levels || []);
```

**Decisión para tags:** el estado local es `string` (la cadena cruda del input). La conversión a `string[]` sucede solo en `handleSave`, con un helper de una línea. Esto evita inputs controlados complejos y es consistente con el pattern "input libre" solicitado.

Helper de parseo (local al componente o en un utils):

```typescript
const parseTagsInput = (raw: string): string[] =>
  raw.split(',').map(t => t.trim()).filter(Boolean);
```

### 3.2 UI — tags

```tsx
<label>Tags incluidos</label>
<input
  type="text"
  value={tagsInclude}
  onChange={e => setTagsInclude(e.target.value)}
  placeholder="tag1, tag2, tag3"
/>
<span className="hint">Separar por coma. Deja vacío para no filtrar.</span>

<label>Tags excluidos</label>
<input
  type="text"
  value={tagsExclude}
  onChange={e => setTagsExclude(e.target.value)}
  placeholder="tag1, tag2, tag3"
/>
<span className="hint">Clientes con estos tags quedan excluidos del perfil.</span>
```

No se introduce ningún componente chip. El hint documenta la semántica directamente en la UI.

### 3.3 UI — levels (checkboxes, igual que `statuses`)

```tsx
{AVAILABLE_LEVELS.map(level => (
  <label key={level}>
    <input
      type="checkbox"
      checked={levels.includes(level)}
      onChange={e => {
        setLevels(prev =>
          e.target.checked ? [...prev, level] : prev.filter(l => l !== level)
        );
      }}
    />
    {level}
  </label>
))}
```

`AVAILABLE_LEVELS` es una constante local con los valores válidos del dominio (igual al patrón de `AVAILABLE_STATUSES` que ya debe existir para `statuses`). Si esa constante aún no existe en el archivo, se define junto a la de statuses.

### 3.4 `handleSave` — persistencia de los nuevos filtros

```typescript
const handleSave = async () => {
  const filters: Record<string, any> = {};

  if (minLevel)          filters.min_level      = minLevel;
  if (statuses.length)   filters.statuses       = statuses;
  if (repoSourceIds.length) filters.repo_source_ids = repoSourceIds;

  // nuevos
  const parsedTagsInclude = parseTagsInput(tagsInclude);
  const parsedTagsExclude = parseTagsInput(tagsExclude);

  if (parsedTagsInclude.length) filters.tags_include = parsedTagsInclude;
  if (parsedTagsExclude.length) filters.tags_exclude = parsedTagsExclude;
  if (levels.length)             filters.levels       = levels;

  // ...resto del save
};
```

La condición `if (array.length)` es consistente con el patrón ya usado en el componente: solo se incluye la clave si tiene valores.

---

## 4. Visibilidad de estado — badges

### 4.1 Helper de badge

```typescript
type LifecycleStatus = 'active' | 'inactive' | 'deleted';

function getLifecycleStatus(c: ClientProfile): LifecycleStatus {
  if (c.deleted_at != null) return 'deleted';
  if (c.is_active)          return 'active';
  return 'inactive';
}

const BADGE_CONFIG: Record<LifecycleStatus, { label: string; className: string }> = {
  active:   { label: 'Activo',    className: 'badge badge-green'  },
  inactive: { label: 'Inactivo',  className: 'badge badge-gray'   },
  deleted:  { label: 'Eliminado', className: 'badge badge-red'    },
};
```

**Decisión:** `deleted_at != null` tiene prioridad sobre `is_active`. Un registro soft-deleted puede tener `is_active: false` — siempre se muestra como "Eliminado", nunca como "Inactivo".

### 4.2 Uso en la fila

```tsx
const status = getLifecycleStatus(client);
const badge  = BADGE_CONFIG[status];

<span className={badge.className}>{badge.label}</span>
```

### 4.3 Metadatos de eliminación (REQ-11)

Inline en la fila o en un tooltip, condicional:

```tsx
{client.deleted_at && (
  <span title={`Eliminado por ${client.deleted_by ?? 'desconocido'}`}>
    {new Date(client.deleted_at).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric',
    })}
  </span>
)}
```

`toLocaleDateString` convierte el ISO string a fecha legible sin dependencias externas.

---

## 5. Compatibilidad con el summary de filtros (REQ-08)

El summary ya renderiza `tags_include` y `levels` si existen en `filters`. No hay cambio de código en esa sección. Lo que cambia es que ahora el formulario persiste esos campos, por lo que el summary los mostrará en perfiles creados/editados con esta versión.

**Verificación de no-regresión:** el summary lee directamente de `profile.filters`, que es el objeto retornado por el backend. No hay transformación intermedia que pueda romperlo.

---

## 6. Decisiones de diseño

| Decisión | Razonamiento |
|----------|--------------|
| Tags como `string` local → parse en save | Evita complejidad de arrays controlados. Consistente con inputs libres en el resto del form. |
| `deletedClients` derivado, no estado | Una sola fuente de verdad (`clients[]`). Sin riesgo de desincronia entre listas. |
| `deleted_at != null` tiene prioridad en badge | Un soft-deleted con `is_active: false` es semánticamente "eliminado", no "inactivo". |
| Campos `deleted_at?` opcionales en interfaz | Retrocompatibilidad con endpoints que no retornan esos campos (sin `include_deleted`). |
| `isAdmin` como dependencia de `loadClients` | Correcto manejo del closure en `useCallback`. Si el rol cambia en sesión, el efecto se re-ejecuta. |

---

## 7. Archivos afectados

| Archivo | Cambios |
|---------|---------|
| `services/api.ts` | Extensión de `ClientProfile` + parámetro opcional en `listClients()` |
| `pages/Clients.tsx` | Estado, handlers, badges, sección eliminados, metadatos de eliminación |
| `pages/Clients.tsx` (ClientFormModal) | Estados y UI para `tags_include`, `tags_exclude`, `levels` |
