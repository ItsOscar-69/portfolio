import { describe, it, expect } from 'vitest';
import { autoplayVideos } from '../../src/ui/media.js';

function fakeVideo() {
  const handlers = {};
  const video = {
    paused: true,
    plays: 0,
    play() { video.plays++; video.paused = false; return Promise.resolve(); },
    pause() { video.paused = true; video.dispatch('pause'); },
    currentTime: 0,
    addEventListener(type, fn) { (handlers[type] ||= []).push(fn); },
    dispatch(type) { (handlers[type] || []).forEach((fn) => fn()); },
    parentNode: { insertBefore() {} },
  };
  return video;
}

function setup({ videos = [fakeVideo()], hidden = false, withObserver = true } = {}) {
  let callback;
  const doc = {
    hidden,
    querySelectorAll: () => videos,
    createElement: () => {
      const handlers = {};
      return { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, append() {}, addEventListener(type, fn) { handlers[type] = fn; }, click() { handlers.click(); } };
    },
    defaultView: withObserver ? { IntersectionObserver: class { constructor(cb) { callback = cb; } observe() {} } } : {},
  };
  const see = (video, inView, ratio = inView ? 1 : 0) => callback([{ target: video, intersectionRatio: ratio, intersectionRect: { height: 0 }, rootBounds: { height: 900 } }]);
  return { doc, videos, see };
}

describe('autoplayVideos', () => {
  it('does not observe when reduced, with no videos, or without IntersectionObserver', () => {
    expect(autoplayVideos(setup().doc, { reduced: true })).toBeNull();
    expect(autoplayVideos(setup({ videos: [] }).doc)).toBeNull();
    expect(autoplayVideos(setup({ withObserver: false }).doc)).toBeNull();
  });
  it('plays on entering and pauses on leaving, and its own pause does not block the next autoplay', () => {
    const { doc, videos: [v], see } = setup();
    autoplayVideos(doc);
    see(v, true);
    expect(v.paused).toBe(false);
    see(v, false);
    expect(v.paused).toBe(true);
    see(v, true);
    expect(v.plays).toBe(2);
    expect(v.paused).toBe(false);
  });
  it('keeps a video the visitor paused paused on re-entry', () => {
    const { doc, videos: [v], see } = setup();
    autoplayVideos(doc);
    see(v, true);
    v.pause(); // visitor
    see(v, false);
    see(v, true);
    expect(v.plays).toBe(1);
    expect(v.paused).toBe(true);
  });
  it('autoplays again once the visitor presses play', () => {
    const { doc, videos: [v], see } = setup();
    autoplayVideos(doc);
    see(v, true);
    v.pause();
    v.dispatch('play'); // visitor presses play
    v.paused = true;
    see(v, true);
    expect(v.plays).toBe(2);
  });
  it('does not count a pause while the tab is hidden as the visitor’s', () => {
    const { doc, videos: [v], see } = setup();
    autoplayVideos(doc);
    see(v, true);
    doc.hidden = true;
    v.pause(); // browser-initiated
    doc.hidden = false;
    see(v, true);
    expect(v.plays).toBe(2);
  });
  it('waits for the video to be fully on screen, and pauses it once under a quarter shows', () => {
    const { doc, videos: [v], see } = setup();
    autoplayVideos(doc);
    see(v, false, 0.6);
    expect(v.plays).toBe(0);
    see(v, true);
    expect(v.paused).toBe(false);
    see(v, false, 0.5);
    expect(v.paused).toBe(false);
    see(v, false, 0.2);
    expect(v.paused).toBe(true);
  });
  it('restarts from the beginning only after the video fully left the screen', () => {
    const { doc, videos: [v], see } = setup();
    autoplayVideos(doc);
    see(v, true);
    v.currentTime = 5;
    see(v, false, 0.2);
    see(v, true);
    expect(v.currentTime).toBe(5); // never fully left
    see(v, false, 0.2);
    see(v, false, 0);
    see(v, true);
    expect(v.currentTime).toBe(0);
  });
});
