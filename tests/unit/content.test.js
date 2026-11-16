import { it, expect } from 'vitest';
import path from 'node:path';
import { projects } from '../../src/content/projects.js';
import { checkProjects } from '../../plugins/chapters.js';

it('the real project list passes the build check', () => {
  expect(() => checkProjects(projects, path.resolve('public'))).not.toThrow();
});
it('launches with the four approved projects first, in order', () => {
  expect(projects.slice(0, 4).map((p) => p.id)).toEqual(['halcyon-somatics', 'ascii-mirror', 'pico-light-show', 'dead-tired']);
});
