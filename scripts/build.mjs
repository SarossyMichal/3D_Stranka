import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'dist');
const publicExtensions = new Set(['.html', '.css', '.js']);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const publicFiles = (await readdir(root, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && publicExtensions.has(path.extname(entry.name).toLowerCase()))
  .map((entry) => entry.name);

for (const file of publicFiles) {
  await copyFile(path.join(root, file), path.join(output, file));
}

console.log(`Pripravených ${publicFiles.length} verejných súborov v priečinku dist/.`);
