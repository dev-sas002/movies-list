import fs from 'fs';
import path from 'path';

/**
 * The API and the web client each compile against their own copy of the HTTP
 * contract. This test is what stops the copies drifting.
 */
describe('shared contract', () => {
  const root = path.resolve(__dirname, '..', '..', '..');

  it('matches shared/contracts/api.ts - run `npm run contract:sync` from the repo root', () => {
    const source = fs.readFileSync(path.join(root, 'shared', 'contracts', 'api.ts'), 'utf8');
    const copy = fs.readFileSync(path.join(__dirname, '..', 'contracts', 'api.ts'), 'utf8');

    expect(copy).toBe(source);
  });
});
