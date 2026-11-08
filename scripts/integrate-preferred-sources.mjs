import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preferredSources, publiclyEnabled } from '../src/lib/preferred-sources-config.mjs';
import { transformPreferredSources } from '../src/lib/preferred-sources-transform.mjs';

export async function integratePreferredSources(dist = 'dist') {
  // Kill switch: no parse, no script/UI/event insertion. Preview is NEVER a build option.
  if (!publiclyEnabled(preferredSources)) return {enabled:false, changed:0};
  const root = resolve(dist);
  if (root !== resolve(fileURLToPath(new URL('../dist/', import.meta.url)))) throw new Error('Unexpected build output');
  let changed = 0;
  async function visit(dir) {
    for (const entry of await readdir(dir, {withFileTypes:true})) {
      const target = join(dir, entry.name);
      if (!target.startsWith(root + sep) || entry.isSymbolicLink()) throw new Error('Unsafe output entry');
      if (entry.isDirectory()) await visit(target);
      else if (entry.name.endsWith('.html')) {
        const html = await readFile(target,'utf8');
        const route = '/' + target.slice(root.length + 1).split(sep).join('/');
        const result = transformPreferredSources(html, route);
        if (result.html !== html) { await writeFile(target, result.html); changed++; }
      }
    }
  }
  await visit(root);
  return {enabled:true, changed};
}
