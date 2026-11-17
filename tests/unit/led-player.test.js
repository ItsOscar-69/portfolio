import { describe, it, expect } from 'vitest';
import { createPlayer, sharedPlayer } from '../../src/lib/led/player.js';
import { createHighlighter, HOLD_MS } from '../../src/lib/led/highlight.js';

describe('the light-show player', () => {
  it('starts dark at power_up and runs 50 frames per second of time', () => {
    const p = createPlayer();
    expect(p.state).toMatchObject({ frame: 0, effect: 'power_up', phase: 'intro' });
    expect(p.state.colours.every((c) => c.join() === '0,0,0')).toBe(true);
    for (let i = 0; i < 10; i++) p.advance(0.1, 'world');
    expect(p.state.frame).toBe(50);
  });

  it('never catches up more than 5 frames at once, like boot.py’s frame timer', () => {
    const p = createPlayer();
    p.advance(600, 'world'); // ten minutes away
    expect(p.state.frame).toBe(5);
  });

  it('runs at single speed when the 3D world and the page both drive it, in either order', () => {
    const worldFirst = createPlayer();
    for (let i = 0; i < 20; i++) { worldFirst.advance(0.1, 'world'); worldFirst.advance(0.1, 'page'); }
    expect(worldFirst.state.frame).toBe(100);
    const pageFirst = createPlayer();
    for (let i = 0; i < 20; i++) { pageFirst.advance(0.1, 'page'); pageFirst.advance(0.1, 'world'); }
    expect(pageFirst.state.frame).toBe(105); // only the very first page call runs before the world is seen
  });

  it('lets the page drive when no world is running', () => {
    const p = createPlayer();
    for (let i = 0; i < 10; i++) p.advance(0.1, 'page');
    expect(p.state.frame).toBe(50);
  });

  it('stops while paused and picks up where it was', () => {
    const p = createPlayer();
    p.advance(0.1, 'world');
    p.pause();
    p.advance(0.1, 'world');
    expect([p.state.frame, p.playing]).toEqual([5, false]);
    p.play();
    p.advance(0.1, 'world');
    expect(p.state.frame).toBe(10);
  });

  it('plays a picked effect, even when paused', () => {
    const p = createPlayer();
    p.pause();
    p.select(3);
    expect(p.playing).toBe(true);
    p.advance(0.1, 'world');
    expect(p.state).toMatchObject({ phase: 'fade', effect: 'starfield' });
  });

  it('tells subscribers about new frames until they unsubscribe', () => {
    const p = createPlayer();
    const seen = [];
    const stop = p.subscribe((s) => seen.push(s.frame));
    p.advance(0.1, 'world');
    p.advance(0.001, 'world'); // not a whole frame yet: no news
    stop();
    p.advance(0.1, 'world');
    expect(seen).toEqual([5]);
  });

  it('shares one player across the page', () => {
    expect(sharedPlayer()).toBe(sharedPlayer());
  });
});

describe('the code highlight', () => {
  it('shows the rest line, and holds an event line for HOLD_MS', () => {
    const pick = createHighlighter();
    expect(pick(181, 181, 0)).toBe(181);
    expect(pick(178, 181, 100)).toBe(178);
    expect(pick(181, 181, 100 + HOLD_MS - 1)).toBe(178);
    expect(pick(181, 181, 100 + HOLD_MS)).toBe(181);
  });

  it('keeps holding while the event repeats', () => {
    const pick = createHighlighter();
    pick(217, 214, 0);
    pick(217, 214, 300);
    expect(pick(214, 214, 300 + HOLD_MS - 1)).toBe(217);
  });

  it('drops a held line as soon as the effect changes', () => {
    const pick = createHighlighter();
    pick(178, 181, 0);
    expect(pick(262, 262, 10)).toBe(262);
  });
});
