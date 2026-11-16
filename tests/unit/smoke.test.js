import { it, expect } from 'vitest';
import { BASE } from '../../site.config.js';

it('serves from a base path that starts and ends with a slash', () => {
  expect(BASE.startsWith('/')).toBe(true);
  expect(BASE.endsWith('/')).toBe(true);
});
