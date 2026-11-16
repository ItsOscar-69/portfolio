import { it, expect } from 'vitest';
import { worldLoaders } from '../../src/worlds/registry.js';
import { WORLD_NAMES } from '../../src/worlds/names.js';

it('only registers worlds whose names are allowed in content', () => {
  for (const name of Object.keys(worldLoaders)) expect(WORLD_NAMES).toContain(name);
});
it('loads lazily (each entry is a function)', () => {
  for (const load of Object.values(worldLoaders)) expect(typeof load).toBe('function');
});
it('has a world file for every allowed name', () => {
  expect(Object.keys(worldLoaders).sort()).toEqual([...WORLD_NAMES].sort());
});
