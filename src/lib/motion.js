// Frame-rate-independent easing. `x += (target - x) * k` moves a fixed share every frame, so it runs twice as fast
// on a 120 Hz phone as at 60 Hz, and half as fast at 30 fps. damp(k, delta) is the share for a frame lasting
// `delta` seconds that matches k at 60 fps.
export function damp(k, delta) {
  return 1 - Math.pow(1 - k, delta * 60);
}
