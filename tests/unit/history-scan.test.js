import { it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { scanHistory } from '../../tools/lib/history-scan.mjs';

// A throwaway repo with its own identity, set through the environment (git config is never touched).
const ENV = { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.invalid' };
const dirs = [];
afterEach(() => { for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });
function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-scan-'));
  dirs.push(dir);
  const git = (...args) => execFileSync('git', args, { cwd: dir, env: ENV });
  git('init', '-q');
  const commit = (message) => { git('add', '-A'); git('commit', '-q', '-m', message); };
  return { dir, commit, git };
}

it('finds a word that only an old commit contains, and never returns the word', async () => {
  const { dir, commit } = repo();
  fs.writeFileSync(path.join(dir, 'notes.md'), 'made by Plumtree\n');
  commit('first');
  fs.writeFileSync(path.join(dir, 'notes.md'), 'made by Oscar\n');
  commit('second');
  const r = await scanHistory(dir, ['Plumtree']);
  expect(r.commits).toBe(2);
  expect(r.textHits).toHaveLength(1);
  expect(r.textHits[0]).toMatch(/^[0-9a-f]{40}:notes\.md$/);
  expect(JSON.stringify(r).toLowerCase()).not.toContain('plumtree');
});

it('counts private words in commit messages', async () => {
  const { dir, commit } = repo();
  fs.writeFileSync(path.join(dir, 'a.txt'), 'hello\n');
  commit('fix for plumtree');
  expect((await scanHistory(dir, ['Plumtree'])).messageHits).toBe(1);
});

it('finds an old image that carried metadata', async () => {
  const { dir, commit } = repo();
  const file = path.join(dir, 'a.webp');
  await sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } }).withMetadata({ exif: { IFD0: { Copyright: 'someone' } } }).webp().toFile(file);
  commit('with metadata');
  await sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } }).webp().toFile(file);
  commit('clean');
  const r = await scanHistory(dir, ['plumtree']);
  expect(r.imageHits).toHaveLength(1);
  expect(r.imageHits[0]).toMatch(/^[0-9a-f]{7}:a\.webp$/);
});

it('reports nothing for a clean history', async () => {
  const { dir, commit } = repo();
  fs.writeFileSync(path.join(dir, 'a.txt'), 'made by Oscar\n');
  commit('first');
  const r = await scanHistory(dir, ['plumtree']);
  expect([r.textHits, r.messageHits, r.imageHits]).toEqual([[], 0, []]);
});

it('never puts a word in a thrown message when git fails', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-scan-'));
  dirs.push(dir); // not a repo
  const err = await scanHistory(dir, ['Plumtree']).catch((e) => e);
  expect(err).toBeInstanceOf(Error);
  expect(`${err.message}${err.stack}`.toLowerCase()).not.toContain('plumtree');
});

it('refuses an empty or unusable word list instead of reporting clean', async () => {
  const { dir, commit } = repo();
  fs.writeFileSync(path.join(dir, 'a.txt'), 'hello\n');
  commit('first');
  for (const bad of [[], [''], ['  '], [null, 3], 'plumtree', undefined]) {
    await expect(scanHistory(dir, bad)).rejects.toThrow();
  }
});

it('finds a word inside a binary blob', async () => {
  const { dir, commit } = repo();
  fs.writeFileSync(path.join(dir, 'a.bin'), Buffer.concat([Buffer.from([0, 1, 2, 0]), Buffer.from('xxPlumTreexx'), Buffer.from([0, 255])]));
  commit('binary');
  const r = await scanHistory(dir, ['plumtree']);
  expect(r.textHits).toHaveLength(1);
  expect(r.textHits[0]).toMatch(/^[0-9a-f]{40}:a\.bin$/);
});

it('finds a word in an annotated tag message', async () => {
  const { dir, commit, git } = repo();
  fs.writeFileSync(path.join(dir, 'a.txt'), 'hello\n');
  commit('first');
  git('tag', '-a', 'v1', '-m', 'release for plumtree');
  const r = await scanHistory(dir, ['Plumtree']);
  expect(r.messageHits).toBe(1);
});

it('finds a word in a branch name', async () => {
  const { dir, commit, git } = repo();
  fs.writeFileSync(path.join(dir, 'a.txt'), 'hello\n');
  commit('first');
  git('branch', 'plumtree-work');
  expect((await scanHistory(dir, ['Plumtree'])).messageHits).toBe(1);
});

it('finds a word in a file name and redacts it in the output', async () => {
  const { dir, commit } = repo();
  fs.mkdirSync(path.join(dir, 'plumtree-dir'));
  fs.writeFileSync(path.join(dir, 'plumtree-dir', 'notes.txt'), 'hello\n');
  commit('first');
  const r = await scanHistory(dir, ['Plumtree']);
  expect(r.textHits).toEqual([expect.stringMatching(/^[0-9a-f]{40}:\[redacted\]\/notes\.txt$/)]);
  expect(JSON.stringify(r).toLowerCase()).not.toContain('plumtree');
});

it('throws on a repository with no commits', async () => {
  const { dir } = repo();
  await expect(scanHistory(dir, ['plumtree'])).rejects.toThrow();
});
