/* HALCYON SOMATICS // boot gate. Runs synchronously in <head>, before first paint,
   so the boot overlay is decided before any content can flash on screen. */
(function (root) {
  'use strict';

  const BOOT_KEY = 'hs-booted';
  const FAILSAFE_MS = 6000;

  function shouldPlayBoot(storage, reducedMotion) {
    if (reducedMotion) return false;
    try {
      return storage.getItem(BOOT_KEY) !== '1';
    } catch (err) {
      return true; // storage blocked or missing: play the boot, never crash
    }
  }

  function markBootSeen(storage) {
    try {
      storage.setItem(BOOT_KEY, '1');
    } catch (err) {
      /* storage blocked: the boot simply plays again next time */
    }
  }

  const gate = { BOOT_KEY, FAILSAFE_MS, shouldPlayBoot, markBootSeen };

  if (typeof module === 'object' && module.exports) {
    module.exports = gate;
    return;
  }

  root.HalcyonBootGate = gate;
  const html = document.documentElement;
  html.classList.add('js');

  let storage = null;
  try { storage = window.sessionStorage; } catch (err) { /* blocked */ }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (shouldPlayBoot(storage, reduced)) html.classList.add('booting');

  // If main.js never powers the page on, show everything anyway.
  setTimeout(function () {
    if (!html.classList.contains('powered')) html.classList.add('no-power');
  }, FAILSAFE_MS);
})(typeof window !== 'undefined' ? window : globalThis);
