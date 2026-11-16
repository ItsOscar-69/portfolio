/* HALCYON SOMATICS // PATIENT TERMINAL v9.4.1
   Pure helpers live on `api` and are exported for node tests.
   DOM modules below only run in the browser, each isolated in try/catch. */
(function () {
  'use strict';

  const api = {};

  // ---- HELPERS --------------------------------------------------------------

  api.formatClock = function formatClock(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@*+=<>/';
  api.GLYPHS = GLYPHS;

  api.scrambleFrame = function scrambleFrame(target, progress, random) {
    const rand = random || Math.random;
    const clamped = Math.min(Math.max(progress, 0), 1);
    const settled = Math.floor(clamped * target.length);
    let out = '';
    for (let i = 0; i < target.length; i += 1) {
      const ch = target[i];
      out += (i < settled || /[\s.,]/.test(ch)) ? ch : GLYPHS[Math.floor(rand() * GLYPHS.length)];
    }
    return out;
  };

  api.countValue = function countValue(target, progress) {
    const p = Math.min(Math.max(progress, 0), 1);
    return target * (1 - Math.pow(1 - p, 3));
  };

  api.formatCount = function formatCount(value, decimals) {
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  api.tiltAngles = function tiltAngles(x, y, width, height, max) {
    const limit = max === undefined ? 6 : max;
    const nx = Math.min(Math.max(x / width, 0), 1) - 0.5;
    const ny = Math.min(Math.max(y / height, 0), 1) - 0.5;
    const round = (n) => Math.round(n * 100) / 100 + 0; // + 0 turns -0 into 0
    return { rx: round(-ny * 2 * limit), ry: round(nx * 2 * limit) };
  };

  api.ERRORS = {
    patient: '[ERR] PATIENT NAME REQUIRED',
    consent: '[ERR] CONSENT REQUIRED',
  };

  api.validateConsult = function validateConsult(fields) {
    const errors = {};
    if (!String(fields.patient || '').trim()) errors.patient = api.ERRORS.patient;
    if (!fields.consent) errors.consent = api.ERRORS.consent;
    return errors;
  };

  api.makeRef = function makeRef(random) {
    const rand = random || Math.random;
    const hex = '0123456789ABCDEF';
    let code = '';
    for (let i = 0; i < 6; i += 1) code += hex[Math.floor(rand() * 16)];
    return `HS-${code.slice(0, 4)}-${code.slice(4)}`;
  };

  // @@ HELPERS-END @@

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }

  // ---- DOM MODULES ----------------------------------------------------------
  const html = document.documentElement;
  const modules = [];

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function powerOn() {
    html.classList.remove('booting');
    html.classList.add('powered');
    document.dispatchEvent(new Event('halcyon:powered'));
  }

  function whenPowered(callback) {
    if (html.classList.contains('powered')) callback();
    else document.addEventListener('halcyon:powered', callback, { once: true });
  }

  const BOOT_LINES = [
    'HALCYON OS v9.4.1 // PATIENT TERMINAL',
    'LOADING SOMATIC INDEX ............ OK',
    'CALIBRATING OPTIC FEED ........... OK',
    'BIOMETRIC SCAN ................... OK',
    'CROSS-REFERENCING CREDIT FILE .... OK',
    'LIABILITY WAIVER ............ ASSUMED',
    'WELCOME, PATIENT PT-7734-A',
  ];

  modules.push(function boot() {
    const overlay = document.querySelector('.boot');
    if (!overlay || !html.classList.contains('booting')) {
      powerOn();
      return;
    }
    const log = overlay.querySelector('.boot__log');
    const timers = [];
    let finished = false;

    BOOT_LINES.forEach((line, i) => {
      timers.push(setTimeout(() => {
        const row = document.createElement('div');
        row.className = 'boot__line';
        row.textContent = line;
        row.style.setProperty('--chars', String(line.length));
        log.appendChild(row);
      }, i * 200));
    });

    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      window.removeEventListener('keydown', finish);
      overlay.removeEventListener('click', finish);
      let storage = null;
      try { storage = window.sessionStorage; } catch (err) { /* blocked */ }
      if (window.HalcyonBootGate) window.HalcyonBootGate.markBootSeen(storage);
      overlay.classList.add('boot--done');
      setTimeout(powerOn, 400);
    }

    timers.push(setTimeout(finish, 2100));
    window.addEventListener('keydown', finish);
    overlay.addEventListener('click', finish);
  });

  modules.push(function reveal() {
    const targets = document.querySelectorAll('.power-on');
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-on'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-on');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    whenPowered(() => targets.forEach((el) => observer.observe(el)));
  });

  modules.push(function clock() {
    const el = document.querySelector('[data-clock]');
    if (!el) return;
    const tick = () => { el.textContent = api.formatClock(new Date()); };
    tick();
    setInterval(tick, 1000);
  });

  modules.push(function rail() {
    const railEl = document.querySelector('.rail');
    const toggle = document.querySelector('.rail__toggle');
    const links = Array.from(document.querySelectorAll('.rail__link'));
    if (!railEl) return;

    const setOpen = (open) => {
      railEl.classList.toggle('rail--open', open);
      if (toggle) toggle.setAttribute('aria-expanded', String(open));
    };
    if (toggle) toggle.addEventListener('click', () => setOpen(!railEl.classList.contains('rail--open')));
    links.forEach((link) => link.addEventListener('click', () => setOpen(false)));

    if (!('IntersectionObserver' in window)) return;
    const byId = new Map(links.map((link) => [link.hash.slice(1), link]));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.removeAttribute('aria-current'));
        const active = byId.get(entry.target.id);
        if (active) active.setAttribute('aria-current', 'location');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main > section[id]').forEach((sec) => observer.observe(sec));
  });

  modules.push(function decrypt() {
    if (prefersReducedMotion()) return;
    document.querySelectorAll('[data-decrypt]').forEach((el) => {
      const target = el.textContent;
      whenPowered(() => {
        const started = performance.now();
        const frame = (now) => {
          const progress = (now - started) / 900;
          el.textContent = progress < 1 ? api.scrambleFrame(target, progress) : target;
          if (progress < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
    });
  });

  modules.push(function counters() {
    // The HTML already holds final values; this only animates them into place.
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
    const els = document.querySelectorAll('[data-count]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const started = performance.now();
        const frame = (now) => {
          const progress = (now - started) / 1200;
          el.textContent = api.formatCount(api.countValue(target, progress), decimals);
          if (progress < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
    });
    whenPowered(() => els.forEach((el) => observer.observe(el)));
  });

  modules.push(function tilt() {
    if (prefersReducedMotion() || window.matchMedia('(hover: none)').matches) return;
    document.querySelectorAll('.pass').forEach((pass) => {
      pass.addEventListener('pointermove', (event) => {
        const box = pass.getBoundingClientRect();
        const { rx, ry } = api.tiltAngles(event.clientX - box.left, event.clientY - box.top, box.width, box.height);
        pass.style.setProperty('--rx', `${rx}deg`);
        pass.style.setProperty('--ry', `${ry}deg`);
      });
      pass.addEventListener('pointerleave', () => {
        pass.style.setProperty('--rx', '0deg');
        pass.style.setProperty('--ry', '0deg');
      });
    });
  });

  modules.push(function consultForm() {
    const form = document.querySelector('.consult__form');
    const success = document.querySelector('.consult__success');
    if (!form || !success) return;
    form.noValidate = true;
    const { patient, implant, consent } = form.elements;

    const showError = (field, input, message) => {
      document.getElementById(`${field}-error`).textContent = message || '';
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const errors = api.validateConsult({
        patient: patient.value,
        implant: implant.value,
        consent: consent.checked,
      });
      showError('patient', patient, errors.patient);
      showError('consent', consent, errors.consent);
      if (errors.patient) { patient.focus(); return; }
      if (errors.consent) { consent.focus(); return; }

      success.querySelector('[data-patient]').textContent = patient.value.trim();
      success.querySelector('[data-implant]').textContent = implant.selectedOptions[0].textContent;
      success.querySelector('[data-ref]').textContent = api.makeRef();
      form.hidden = true;
      success.hidden = false;
      success.focus();
    });
  });

  // @@ MODULES-END @@

  function start() {
    modules.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('[HALCYON] module failed:', fn.name, err);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
