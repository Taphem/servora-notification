import { cpSync } from 'node:fs';
import { join } from 'node:path';

const srcDir = join(process.cwd(), 'src', 'templates');
const destDir = join(process.cwd(), 'dist', 'templates');

cpSync(srcDir, destDir, {
  recursive: true,
  filter: (path) => !path.endsWith('.ts'),
});
