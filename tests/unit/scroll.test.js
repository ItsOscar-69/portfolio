import { describe, it, expect } from 'vitest';
import { clamp01, sceneState } from '../../src/lib/scroll.js';

const scenes = [{ start: 0, length: 1000 }, { start: 2000, length: 1000 }, { start: 5000, length: 500 }];
const vh = 1000;

describe('sceneState', () => {
  it('starts in the first scene with nothing in transition', () => {
    expect(sceneState(0, vh, scenes)).toEqual({ active: 0, next: 1, progress: 0, transition: 0, display: 0 });
  });
  it('measures progress through the active scene and clamps at 1', () => {
    expect(sceneState(500, vh, scenes).progress).toBeCloseTo(0.5);
    expect(sceneState(1500, vh, scenes).progress).toBe(1);
  });
  it('starts the transition as the next scene rises from the bottom', () => {
    const s = sceneState(1500, vh, scenes);
    expect(s.transition).toBeCloseTo(0.5);
    expect(s.display).toBe(0);
    expect(sceneState(1600, vh, scenes).display).toBe(1);
  });
  it('hands over exactly at the next scene start', () => {
    expect(sceneState(2000, vh, scenes)).toMatchObject({ active: 1, next: 2, progress: 0, transition: 0, display: 1 });
  });
  it('has no next scene at the end', () => {
    const s = sceneState(5200, vh, scenes);
    expect(s).toMatchObject({ active: 2, next: -1, transition: 0, display: 2 });
    expect(s.progress).toBeCloseTo(0.4);
  });
  it('treats overscroll above the top as the first scene', () => {
    expect(sceneState(-80, vh, scenes)).toMatchObject({ active: 0, progress: 0 });
  });
  it('copes with an empty layout', () => {
    expect(sceneState(100, vh, [])).toEqual({ active: -1, next: -1, progress: 0, transition: 0, display: -1 });
  });
});

describe('clamp01', () => {
  it('clamps to the 0..1 range', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.3)).toBe(0.3);
    expect(clamp01(9)).toBe(1);
  });
});
