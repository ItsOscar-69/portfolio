import { it, expect } from 'vitest';
import { CAMERA_CONSTRAINTS, cameraProblem, mirror } from '../../src/lib/camera.js';

it('asks for the front camera’s video only, never audio', () => {
  expect(CAMERA_CONSTRAINTS.audio).toBe(false);
  expect(CAMERA_CONSTRAINTS.video.facingMode).toBe('user');
});

it('explains clearly why the camera didn’t start, and that the model stays', () => {
  const named = (name) => cameraProblem(Object.assign(new Error('x'), { name }));
  expect(named('NotAllowedError')).toMatch(/blocked/);
  expect(named('SecurityError')).toMatch(/blocked/);
  expect(named('NotFoundError')).toMatch(/No camera was found/);
  expect(named('NotReadableError')).toMatch(/busy/);
  expect(cameraProblem(null)).toMatch(/isn’t available in this browser/);
  for (const message of [named('NotAllowedError'), named('NotFoundError'), cameraProblem(null)]) expect(message).toMatch(/the model stays on screen/);
});

it('starts with no video shared', () => {
  expect(mirror.video).toBeNull();
});
