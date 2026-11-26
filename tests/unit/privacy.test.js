// Guards the public repo: tracked files and commit messages must never contain the words in
// privacy.local.json (gitignored). Skipped where that file doesn't exist (e.g. CI).
import { it, expect, vi } from 'vitest';
vi.setConfig({ testTimeout: 30_000 }); // many git processes; slow on Windows, so 5 s is too tight
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const local = fs.existsSync('privacy.local.json') ? JSON.parse(fs.readFileSync('privacy.local.json', 'utf8')) : null;
const TEXT = /\.(js|mjs|json|md|html|css|svg|py|yml|txt)$/i;

it.skipIf(!local)('no tracked file or commit message contains a private word', () => {
  const words = local.forbidden.map((w) => w.toLowerCase());
  const hits = [];
  const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter((f) => f && TEXT.test(f));
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8').toLowerCase();
    for (const w of words) if (text.includes(w)) hits.push(`${f} contains a private word`);
  }
  const log = execSync('git log --format=%an%n%ae%n%B', { encoding: 'utf8' }).toLowerCase();
  for (const w of words) if (log.includes(w)) hits.push('a commit message or author contains a private word');
  expect(hits).toEqual([]);
});
