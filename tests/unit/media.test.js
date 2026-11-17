import { describe, it, expect } from 'vitest';
import { autoplayVideos } from '../../src/ui/media.js';

function fakeVideo() {
  const handlers = {};
  const video = {
    paused: true,
    plays: 0,
    play() { video.plays++; video.paused = false; return Promise.resolve(); },
    pause() { video.paused = true; video.dispatch('pause'); },
    addEventListener(type, fn) { (handlers[type] ||= []).push(fn); },
    dispatch(type) { (handlers[type] || []).forEach((fn) => fn()); },
  };
  return video;
}

function setup({ videos = [fakeVideo()], hidden = false, withObserver = true } = {}) {
  let callback;
  const doc = {
    hidden,
    querySelectorAll: () => videos,
    defaultView: withObserver ? { IntersectionObserver: class { constructor(cb) { callback = cb; } observe() {} } } : {},
  };
  const see = (video, isIntersecting) => callback([{ target: video, isIntersecting }]);
  return { doc, videos, see };
}

describe('autoplayVideos', () => {
  it('does nothing when reduced, with no videos, or without IntersectionObserver', () => {
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
});
