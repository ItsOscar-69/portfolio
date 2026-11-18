// The mirror's camera rules (spec §4.3 and §8.2): the front camera's video only, never audio; clear messages when it
// can't start; and one shared slot through which the mirror UI hands its <video> to the ascii world.
export const CAMERA_CONSTRAINTS = { audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } };

export function cameraProblem(error) {
  const name = error && error.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera access was blocked, so the model stays on screen. You can allow the camera for this site in your browser and try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found, so the model stays on screen.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'The camera is busy in another app, so the model stays on screen.';
  return 'The camera isn’t available in this browser, so the model stays on screen.';
}

// The page's one mirror: src/ui/mirror.js sets video while the camera is on; the ascii world draws it.
export const mirror = { video: null };
