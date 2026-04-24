export function clientNameToSlug(name: string): string {
  return name
    .trim()
    .normalize('NFD')                  // "Ñ" → "N" + combining tilde, "é" → "e" + accent
    .replace(/[\u0300-\u036f]/g, '')   // strip combining diacritical marks
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');      // strip anything remaining (symbols, non-latin scripts)
}

export function extractClientTag(yaml: string): string | null {
  const match = yaml.match(/^\s+-\s+client\.([a-zA-Z0-9_]+)\s*$/im);
  return match ? match[1] : null;
}

export function removeClientTags(yaml: string): string {
  const lines = yaml.split('\n');
  const filtered: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s+-\s+client\.[a-zA-Z0-9_]+\s*$/i.test(line)) {
      i++;
      continue;
    }
    filtered.push(line);
    i++;
  }

  // If tags: block is now empty (next non-empty line after tags: is a top-level key or EOF), remove tags: header
  const result: string[] = [];
  for (let j = 0; j < filtered.length; j++) {
    const line = filtered[j];
    if (/^tags:\s*$/.test(line)) {
      // Look ahead: check if there are any remaining tag items
      let hasItems = false;
      for (let k = j + 1; k < filtered.length; k++) {
        const next = filtered[k];
        if (next.trim() === '') continue;
        if (/^\s+-\s+/.test(next)) {
          hasItems = true;
          break;
        }
        break;
      }
      if (!hasItems) {
        // Skip the empty tags: line
        continue;
      }
    }
    result.push(line);
  }

  return result.join('\n');
}

export function injectClientTag(yaml: string, slug: string | null): string {
  const cleaned = removeClientTags(yaml);

  if (!slug) {
    return cleaned;
  }

  const tag = `  - client.${slug}`;
  const lines = cleaned.split('\n');

  // Find existing tags: block
  const tagsIdx = lines.findIndex((l) => /^tags:\s*$/.test(l));

  if (tagsIdx !== -1) {
    // Append tag as last item in the tags block
    // Find insertion point: after last tag item in block
    let insertAt = tagsIdx + 1;
    for (let i = tagsIdx + 1; i < lines.length; i++) {
      if (/^\s+-\s+/.test(lines[i])) {
        insertAt = i + 1;
      } else if (lines[i].trim() === '') {
        continue;
      } else {
        break;
      }
    }
    lines.splice(insertAt, 0, tag);
    return lines.join('\n');
  }

  // No tags: block — insert before detection: or at end
  const detectionIdx = lines.findIndex((l) => /^detection:/.test(l));
  const newBlock = ['tags:', tag];

  if (detectionIdx !== -1) {
    lines.splice(detectionIdx, 0, ...newBlock, '');
  } else {
    lines.push(...newBlock);
  }

  return lines.join('\n');
}
