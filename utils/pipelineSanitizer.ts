/**
 * pipelineSanitizer — normaliza pipeline YAML legacy (sigma-cli / custom)
 * al schema ProcessingPipeline de pySigma, con best-effort.
 *
 * Estrategia: whitelist de claves root válidas. Cualquier clave desconocida
 * se elimina junto con su valor (incluyendo bloques multilinea indentados).
 * Compatible con documentos multi-bloque separados por "---".
 */

// ── Schema pySigma ProcessingPipeline (root keys) ──────────────────────────
const PYSIGMA_VALID_ROOT_KEYS = new Set([
  'name',
  'priority',
  'transformations',
  'postprocessing',
  'finalizers',
  'vars',
  'allowed_backends',
  'conditions',
]);

// ── Mapeos legacy → pySigma (extensible) ───────────────────────────────────
// Añade aquí cualquier transformación estructural futura
// clave = patrón en nombre de campo/tipo, valor = reemplazo
export const LEGACY_FIELD_TYPE_MAP: Record<string, string> = {
  // Ejemplo futuro: 'fieldmapping' → 'field_name_mapping'
};

export interface SanitizeResult {
  yaml: string;
  removedKeys: string[];
  wasModified: boolean;
}

// ── Sanitiza un único documento YAML (sin "---") ────────────────────────────
function sanitizeChunk(chunk: string): { yaml: string; removed: string[] } {
  const lines = chunk.split('\n');
  const out: string[] = [];
  const removed: string[] = [];
  let skipping = false;

  for (const line of lines) {
    const trimmed = line.trimStart();

    // Comentarios: los conservamos solo si no estamos dentro de un bloque suprimido
    if (trimmed.startsWith('#')) {
      if (!skipping) out.push(line);
      continue;
    }

    // Línea vacía
    if (trimmed === '') {
      if (!skipping) out.push(line);
      continue;
    }

    // Detección de clave root (sin indentación + patrón "key:")
    const isRootKey = /^[a-zA-Z_][a-zA-Z0-9_-]*\s*:/.test(line);
    if (isRootKey) {
      const key = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/)![1];
      if (PYSIGMA_VALID_ROOT_KEYS.has(key)) {
        skipping = false;
        out.push(line);
      } else {
        skipping = true;
        if (!removed.includes(key)) removed.push(key);
      }
      continue;
    }

    // Línea indentada — pertenece al bloque actual
    if (!skipping) out.push(line);
  }

  // Eliminar trailing blanks del chunk resultante
  const yaml = out.join('\n').trimEnd();
  return { yaml, removed };
}

// ── API pública ─────────────────────────────────────────────────────────────
export function sanitizePipelineYaml(raw: string): SanitizeResult {
  if (!raw.trim()) return { yaml: raw, removedKeys: [], wasModified: false };

  const chunks = raw.split(/\n---(?:\s*\n|$)/);
  const sanitizedChunks: string[] = [];
  const allRemoved: string[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed || trimmed.startsWith('#')) continue; // skip comment-only chunks

    const { yaml, removed } = sanitizeChunk(trimmed);
    sanitizedChunks.push(yaml);
    removed.forEach(k => { if (!allRemoved.includes(k)) allRemoved.push(k); });
  }

  const result = sanitizedChunks.join('\n---\n');
  return {
    yaml: result,
    removedKeys: allRemoved,
    wasModified: allRemoved.length > 0,
  };
}