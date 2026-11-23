# Portfolio polish pass: design

Oscar's requests after the milestone 6 copy review, on 24 Nov 2026, before the first publish. They come from his own look at the site.

## Why

Before the site goes public, Oscar wants it to feel smooth and consistent. Three things stood out:
- **Things start before you can see them.** The code box and the HALCYON video both start moving while they're only partly on screen.
- **Generic browser parts look foreign:** the default video player that appears on hover.
- **One-off elements don't match the rest:** the big white "Open the live HALCYON page" tile and the cards row.

He also wants the ASCII figure to read as a person rather than a blob.

## Goals

1. **Tab title:** the browser tab says **Portfolio**.
2. **Pico code box:**
   - It holds still while it slides into view.
   - It starts following the show only once the whole box is on screen; on a short screen, once it fills at least 90% of the screen's height.
   - It then glides smoothly to the running line instead of jumping.
   - Scrolling the box yourself still pauses following, as now.
3. **HALCYON video (Oscar chose option A):**
   - It plays the HALCYON page's start-up sequence, with the black first second trimmed, then fades into the polished 3D body from this chapter's header, turning slowly.
   - The live HALCYON page itself doesn't change.
   - It starts only once it's fully on screen (90% or more), and starts from the beginning each time it comes back into view.
   - No generic browser player. Instead, a small Pause/Play button in the site's own pill style, which visitors need in order to stop the motion.
   - The ASCII demo video gets the same player, for consistency.
4. **HALCYON write-up:** the big white link tile is removed. The existing "Visit the live page" link in the text becomes a small outlined pill button with ↗, like the site's other buttons. Panel links in every chapter take this style.
5. **Cards** ("The idea", "How it was built", "Inside") keep their words in all four chapters, restyled so they belong to the site:
   - labels in the small spaced mono capitals of the intro's top line;
   - text in the paper colour.
6. **ASCII Mirror figure:** redrawn as a full-length person mid-stride (head, neck, shoulders, two arms, two legs), lit from the left, in the same green ASCII characters, on the same 1000×1000 canvas.
7. **SERAPH-9 screenshot:** recaptured so the "Known side effects" card doesn't cover the spec plate's numbers. The HALCYON posters are re-rendered, because the chapter's 3D world shows that screenshot as a floating panel.

## Non-goals and anti-goals

- **Non-goals:**
  - no change to the live HALCYON page at /halcyon/;
  - no copy changes beyond the strings listed below;
  - no new dependencies;
  - no change to the 3D worlds themselves.
- **Anti-goals:** it would be a failure, even if it technically works, if:
  - a video or the code box starts moving while partly off screen;
  - a video can't be paused by keyboard or screen reader;
  - the new video carries metadata, encoder notes or audio.

## Approaches considered (for the video)

- **A, chosen:** cut from the page's start-up to the 3D model on its own. It's honest, because the live page stays as built, and it's the simplest.
- **B:** swap the model into the page's header, for the video only. It would show something the live page doesn't have.
- **C:** B, plus changing the live page. It's the biggest job, and it changes the original project.

## New copy (Oscar approves at plan review)

- **Tab title:** `Portfolio`
- **HALCYON video:**
  - description for screen readers: `A short film of the HALCYON SOMATICS page starting up, then the 3D body from the top of this chapter turning slowly`
  - caption: `The page's start-up sequence, then the 3D body from the top of this chapter.`
- **Video buttons:** `Pause` / `Play`, read aloud as `Pause the video` / `Play the video`.
- **ASCII Mirror figure, description for screen readers:** `A person mid-stride, drawn in green ASCII characters on a black background`

Everything else stays word for word.

## Left to the builder

- the exact capsule shapes and walking pose of the figure;
- the scroll position and pointer sweep for the 3D part of the video;
- the viewport that un-overlaps SERAPH-9.

Each is checked by eye and reported.
