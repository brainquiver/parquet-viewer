import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { people } from './parquet.js';

// The script writes _test-page.html beside the page, so it runs on a copy of the page and the
// script in a temporary folder, and the repository stays as it was.
const root = fileURLToPath(new URL('../..', import.meta.url));
let scratch;
let parquetBytes;

beforeAll(async () => {
  scratch = mkdtempSync(join(tmpdir(), 'parquet-viewer-'));
  mkdirSync(join(scratch, 'tools'));
  copyFileSync(join(root, 'parquet-viewer.html'), join(scratch, 'parquet-viewer.html'));
  copyFileSync(join(root, 'tools', 'build-test-page.py'), join(scratch, 'tools', 'build-test-page.py'));
  parquetBytes = Buffer.from(await people([1, 2]).arrayBuffer());
  writeFileSync(join(scratch, 'small.parquet'), parquetBytes);
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const run = args =>
  spawnSync('python3', ['tools/build-test-page.py', ...args], { cwd: scratch, encoding: 'utf8' });

describe('tools/build-test-page.py', () => {
  it('writes a copy of the page with the file inside it, before the end of the body', () => {
    const result = run(['small.parquet']);
    expect(result.status).toBe(0);
    const out = readFileSync(join(scratch, '_test-page.html'), 'utf8');
    expect(out).toContain(parquetBytes.toString('base64'));
    expect(out).toContain('window.__testFiles');
    expect(out.indexOf('window.__testFiles')).toBeLessThan(out.lastIndexOf('</body>'));
    expect(out.startsWith(readFileSync(join(root, 'parquet-viewer.html'), 'utf8').split('</body>')[0])).toBe(true);
  });

  it('stops with a failure when it is given nothing to embed', () => {
    expect(run([]).status).toBe(1);
    expect(run(['missing.parquet']).stdout).toContain('Nothing to embed.');
  });
});
