#!/usr/bin/env node
/**
 * Copies shared/contracts/api.ts into both packages.
 *
 * Create React App will not compile imports from outside `src/`, so the
 * contract cannot simply be imported from a shared folder. Rather than let the
 * two copies drift silently, they are generated from one source file and each
 * package carries a test that fails when its copy is stale.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'shared', 'contracts', 'api.ts');
const targets = [
  path.join(root, 'movies-list-api', 'src', 'contracts', 'api.ts'),
  path.join(root, 'movies-list-web', 'src', 'contracts', 'api.ts'),
];

const contents = fs.readFileSync(source, 'utf8');
let changed = 0;

for (const target of targets) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
  if (current !== contents) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
    changed += 1;
    console.log(`updated ${path.relative(root, target)}`);
  }
}

console.log(changed === 0 ? 'contracts already in sync' : `${changed} file(s) updated`);
