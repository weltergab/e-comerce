import { access, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8'));

if (config.outputDirectory !== 'public') {
  throw new Error('vercel.json deve declarar outputDirectory como "public".');
}

const output = resolve(root, config.outputDirectory);
if (!(await stat(output)).isDirectory()) {
  throw new Error(`Output Directory ausente: ${output}`);
}

await Promise.all([
  access(resolve(root, 'api/index.ts')),
  access(resolve(root, 'api/tasks.ts')),
  access(resolve(output, 'index.html')),
]);

console.log('Vercel deploy configuration validated.');
