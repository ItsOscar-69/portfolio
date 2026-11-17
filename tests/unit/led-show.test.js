import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createShow, INTRO_FRAMES, PLAY_FRAMES } from '../../src/lib/led/show.js';
import { EFFECTS, POWER_UP } from '../../src/lib/led/effects.js';
import { FADE_FRAMES, NUM_LEDS } from '../../src/lib/led/maths.js';

const ref = JSON.parse(fs.readFileSync('tests/fixtures/boot-reference.json', 'utf8'));
const run = (show, n) => Array.from({ length: n }, () => show.step());
const encode = (frames) => frames.map((f) => f.map((c) => c.join(',')).join(';')).join('\n');

describe('the light-show port', () => {
  it('the fixture was recorded from this exact boot.py', () => {
    const bytes = fs.readFileSync('public/projects/pico-light-show/boot.py');
    expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(ref.bootSha256);
  });

  const states = run(createShow({ seed: ref.seed }), ref.frames);

  it('shows exactly the frames the real boot.py shows: the intro, all six effects and back to the first', () => {
    ref.blocks.forEach((want, b) => {
      const block = states.slice(b * ref.blockSize, (b + 1) * ref.blockSize).map((s) => s.colours);
      const got = crypto.createHash('sha256').update(encode(block)).digest('hex').slice(0, 16);
      expect(got, `frames ${b * ref.blockSize}–${(b + 1) * ref.blockSize - 1}`).toBe(want);
    });
    for (const [i, want] of Object.entries(ref.checkpoints)) expect(states[Number(i)].colours, `frame ${i}`).toEqual(want);
  });

  it('plays power_up for 2.6 s, then crossfades over 50 frames into each effect in order and plays it for 15 s', () => {
    expect([INTRO_FRAMES, FADE_FRAMES, PLAY_FRAMES]).toEqual([130, 50, 750]);
    expect(states.slice(0, 130).every((s) => s.phase === 'intro' && s.effect === 'power_up')).toBe(true);
    EFFECTS.forEach((effect, e) => {
      const fadeStart = INTRO_FRAMES + e * (FADE_FRAMES + PLAY_FRAMES);
      const fading = states.slice(fadeStart, fadeStart + FADE_FRAMES);
      const playing = states.slice(fadeStart + FADE_FRAMES, fadeStart + FADE_FRAMES + PLAY_FRAMES);
      expect(fading.every((s) => s.phase === 'fade' && s.effect === effect.name), `fade into ${effect.name}`).toBe(true);
      expect(playing.every((s) => s.phase === 'play' && s.effect === effect.name), `play ${effect.name}`).toBe(true);
    });
    expect(states[4930]).toMatchObject({ phase: 'fade', effect: 'rainbow_glitter' });
  });

  it('only reports lines inside the effect that is playing', () => {
    const byName = Object.fromEntries([POWER_UP, ...EFFECTS].map((e) => [e.name, e]));
    for (const s of states) {
      const [first, last] = byName[s.effect].lines;
      expect(s.line >= first && s.line <= last, `${s.effect} line ${s.line} at frame ${s.frame}`).toBe(true);
    }
  });
});

describe('twin_comets', () => {
  it('bounces off both ends and throws 8 sparks every time the comets cross', () => {
    const px = Array.from({ length: NUM_LEDS }, () => [0, 0, 0]);
    let sparks = 0;
    const gen = EFFECTS[1].run(px, { uniform: () => { sparks += 1; return 0.3; } });
    const lines = Array.from({ length: 800 }, () => gen.next().value);
    const crossings = lines.filter((l) => l === 178).length;
    expect(crossings).toBeGreaterThan(5);
    expect(sparks).toBe(8 * crossings);
    expect(lines).toContain(168);
    expect(lines).toContain(171);
  });
});

describe('picking an effect', () => {
  it('crossfades into a fresh start of it, plays it for 15 s, then carries on in order', () => {
    const show = createShow({ seed: 7 });
    run(show, 300);
    show.select(2);
    const after = run(show, FADE_FRAMES + PLAY_FRAMES + 1);
    expect(after.slice(0, FADE_FRAMES).every((s) => s.phase === 'fade' && s.effect === 'fire')).toBe(true);
    expect(after.slice(FADE_FRAMES, FADE_FRAMES + PLAY_FRAMES).every((s) => s.phase === 'play' && s.effect === 'fire')).toBe(true);
    expect(after[FADE_FRAMES + PLAY_FRAMES]).toMatchObject({ phase: 'fade', effect: 'starfield' });
  });

  it('picking again mid-crossfade starts from the half-blended frame, so nothing jumps', () => {
    const show = createShow({ seed: 7 });
    run(show, 300);
    show.select(2);
    run(show, 25);
    const before = show.state().colours;
    show.select(4);
    const first = show.step();
    expect(first).toMatchObject({ phase: 'fade', effect: 'plasma' });
    const jump = Math.max(...before.flatMap((c, i) => c.map((v, ch) => Math.abs(v - first.colours[i][ch]))));
    expect(jump).toBeLessThanOrEqual(6); // one 1/50 step of a crossfade
  });
});

describe('the boot.py lines the code panel highlights', () => {
  const source = fs.readFileSync('public/projects/pico-light-show/boot.py', 'utf8').split(/\r?\n/);
  const at = (n) => source[n - 1];

  it('point at the statements they describe', () => {
    const expected = {
      113: 'draw_dot(px, pos,', 121: 'px[i] = (v, v, v)', 128: 'px[i] = hsv(int(d * 256', 137: 'yield',
      146: 'px[i] = hsv(t * 2', 148: 'px[random.randint', 168: 'a_vel = -a_vel', 171: 'b_vel = -b_vel',
      178: 'sparks.append', 181: 'draw_dot(px, a_pos', 214: 'heat[k] = (heat[k - 1]', 217: 'heat[y] = min(255',
      233: 'state[i] = 1', 245: 'bg = hsv(', 262: 'px[i] = hsv(((a + b)', 280: 'v = max(55, env[',
    };
    for (const [n, text] of Object.entries(expected)) expect(at(Number(n)), `boot.py line ${n}`).toContain(text);
  });

  it('frame each effect’s own def', () => {
    for (const effect of [POWER_UP, ...EFFECTS]) {
      const [first, last] = effect.lines;
      expect(at(first), effect.name).toMatch(/^def /);
      expect(source.slice(first - 1, last).some((l) => l.startsWith(`def ${effect.name}(`)), effect.name).toBe(true);
      expect(effect.restLine >= first && effect.restLine <= last, effect.name).toBe(true);
    }
  });
});
