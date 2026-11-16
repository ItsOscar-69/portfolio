// Every chapter on the site comes from this list, in this order.
// To add a project: copy TEMPLATE below into the list, fill it in, put its files in
// public/projects/<id>/, then run `npm run check` and `npm run posters`. See CLAUDE.md.
//
// const TEMPLATE = {
//   id: 'my-project',                 // kebab-case; also the media folder name
//   title: 'My Project',
//   shortTitle: 'Project',            // optional: shorter name for the pill and hero links
//   hook: 'One line that makes people want to scroll.',
//   date: '2026-12',                  // YYYY-MM
//   status: 'done',                   // 'done' or 'in-progress'
//   tags: ['Tag one', 'Tag two'],     // 1 to 5
//   world: 'picture',                 // 'picture' turns cover.webp into particles
//   worldOptions: { cover: 'cover.webp', palette: ['#ffffff'] },
//   font: 'mono',                     // optional: 'michroma', 'big-shoulders' or 'mono'
//   headline: 'A short, punchy line.',
//   summary: 'One or two short paragraphs.\n\nSeparate paragraphs with a blank line.',
//   cards: { idea: 'What I wanted.', built: 'Who did what.', inside: 'What it is made of.' },
//   media: [{ type: 'image', src: 'shot.webp', alt: 'What the image shows', caption: 'Optional caption' }],
//   links: [{ label: 'Visit it', href: 'https://example.com' }],
// };

export const projects = [
  {
    id: 'halcyon-somatics',
    title: 'HALCYON SOMATICS',
    shortTitle: 'HALCYON',
    hook: 'A fake cyberware megacorp, with the horror hidden in the fine print.',
    date: '2026-09',
    status: 'done',
    tags: ['HTML', 'CSS', 'JavaScript'],
    world: 'picture',
    worldOptions: { cover: 'cover.webp', palette: ['#e6f4f7', '#7fb8c4', '#0b1a1f'] },
    font: 'michroma',
    headline: 'Perfection, installed.',
    summary: "I wanted a just-for-fun website for a company that doesn't exist: a luxury implant clinic in a rain-soaked future city. Claude Code and I planned it as a design spec first, then built it piece by piece: a boot sequence, decrypting headlines, a stock ticker, implant spec sheets and a consultation form that goes nowhere.\n\nIt all runs from one HTML page with no build step. You can try the real thing below.",
    cards: {
      idea: 'A cyberpunk megacorp landing page with its own brand, products and voice: calm and luxurious on the surface, quietly horrifying in the side effects and the terms.',
      built: 'I chose the direction and the mood. Claude Code wrote the spec and the plan, then built it in 13 commits, checking contrast, reduced motion and a 360 px phone layout along the way.',
      inside: 'Plain HTML, CSS and JavaScript. Michroma and IBM Plex Mono type, clip-path panels, a pointer-tilt effect, and Node tests for the helper functions.',
    },
    media: [
      { type: 'image', src: 'shot-hero.webp', alt: 'The HALCYON SOMATICS homepage: a wireframe body with callouts beside the headline "Perfection, installed."', caption: 'The hero: a wireframe body, callouts and a headline that decrypts itself.' },
      { type: 'image', src: 'shot-seraph.webp', alt: 'The SERAPH-9 implant spec plate on the HALCYON SOMATICS page', caption: 'SERAPH-9, the flagship implant, with its spec plate.' },
      { type: 'image', src: 'shot-terms.webp', alt: 'The "Terms of installation" section of the HALCYON SOMATICS page', caption: 'The terms of installation nobody reads.' },
      { type: 'link', src: '/halcyon/', caption: 'Open the live HALCYON page' },
    ],
    links: [{ label: 'Visit the live page', href: '/halcyon/' }],
  },
  {
    id: 'ascii-mirror',
    title: 'ASCII Mirror',
    hook: 'A camera that redraws the people walking past as live ASCII art.',
    date: '2026-11',
    status: 'in-progress',
    tags: ['Raspberry Pi 5', 'AI HAT+', 'OpenSCAD', '3D printing', 'Python'],
    world: 'picture',
    worldOptions: { cover: 'cover.webp', palette: ['#39ff88', '#0f5c33', '#b6ffd2'] },
    font: 'mono',
    headline: 'Only the people, drawn in text.',
    summary: "The plan: point a camera at a hallway, and everyone who walks past shows up on a TV as a glowing ASCII-art copy of themselves, only for as long as they're in view.\n\nClaude Code modelled my Raspberry Pi 5, AI HAT+ and Camera Module 3 from the official drawings, designed a camera mount around the screws I actually had, and wrote a Windows demo of the effect. The mount is printed and the hardware is built. The software on the Pi is next.",
    cards: {
      idea: 'A live mirror for passers-by: only people get drawn, nothing is ever recorded, and each copy disappears the moment its person leaves the frame.',
      built: 'Claude Code turned official STEP files into a 3D model of my exact setup, checked the parts for collisions, then designed a mount the camera slides into. I printed it.',
      inside: 'A Raspberry Pi 5 with an AI HAT+ (13 TOPS) and Camera Module 3, an OpenSCAD model with a fit-check script, and a Python demo that draws a moving figure in neon ASCII.',
    },
    media: [
      { type: 'image', src: 'cover.webp', alt: 'A figure drawn in green ASCII characters on a black background', caption: 'The look: brightness becomes characters, from dots up to @ signs.' },
    ],
  },
  {
    id: 'pico-light-show',
    title: 'Pico Light Show',
    shortTitle: 'Pico',
    hook: 'Seven LED effects for a 20-pixel strip, running on a Raspberry Pi Pico.',
    date: '2026-09',
    status: 'done',
    tags: ['MicroPython', 'Raspberry Pi Pico', 'WS2812 LEDs'],
    world: 'picture',
    worldOptions: { cover: 'cover.webp', palette: ['#ff3b6b', '#ffb020', '#39d0ff', '#a46bff'] },
    headline: 'Twenty pixels, seven moods.',
    summary: "It started with one request to Claude Code: make the light flow down my NeoPixel strip and bounce back. Claude wrote a rainbow comet, and I kept going until it became a whole light show.\n\nA power-up intro sends two sparks racing in from the ends, colliding in a flash and blooming into a rainbow. Then come rainbow glitter, twin comets that throw sparks every time they cross, fire, a starfield, plasma and a heartbeat, each one crossfading into the next every 15 seconds.",
    cards: {
      idea: 'Make a 20-LED strip on a Pico feel alive: smooth motion, no flicker, and effects that each have their own personality.',
      built: 'Claude Code wrote the first version, a bouncing rainbow comet, and fixed a bug where colour values over 255 bled into the next colour. I built the rest of the show on top of it.',
      inside: "MicroPython driving WS2812 LEDs through the Pico's PIO, a gamma table so fades look smooth to the eye, anti-aliased dots and a steady 50 fps frame timer.",
    },
    media: [
      { type: 'code', src: 'boot.py', lines: [153, 192], caption: 'twin_comets: two comets bounce along the strip and throw off sparks whenever they cross.' },
      { type: 'image', src: 'cover.webp', alt: 'An illustration of twenty LEDs in a row with a rainbow comet trail', caption: 'An illustration of the strip mid-comet.' },
    ],
  },
  {
    id: 'dead-tired',
    title: 'DEAD TIRED',
    hook: 'A graphic tee: a skeleton from a 1543 anatomy book, too tired to stand up straight.',
    date: '2026-11',
    status: 'done',
    tags: ['Photoshop', 'Graphic design', 'Typography'],
    world: 'picture',
    worldOptions: { cover: 'cover.webp', palette: ['#8c1f25', '#bca775', '#f2ede3'] },
    font: 'big-shoulders',
    headline: 'No sleep since 1543.',
    summary: "A T-shirt design for my art class. I found a skeleton plate in Vesalius's 1543 anatomy book, cut it out and coloured the bones myself, then picked a layout with the title sitting behind the figure.\n\nClaude Code helped me find a style and free public-domain assets, and when I got stuck on the last steps, I asked it to compose the final layout from my skeleton: worn red DEAD TIRED type with outline echoes, the skeleton cut into it, and a bottom bar with a low battery.",
    cards: {
      idea: 'A dark, funny tee: a skeleton slumped mid-step under a huge distressed title, as if it gave up on sleep five centuries ago.',
      built: 'I prepared the skeleton and chose the direction. Claude Code built a style kit, found public-domain images and a free font, then composed the final layered Photoshop file when I asked it to.',
      inside: 'Big Shoulders Display Black type, a 1543 Vesalius plate (Fig. 165), a procedural worn-ink texture and 9 separate layers, laid out for a black shirt.',
    },
    media: [
      { type: 'image', src: 'on-black.webp', alt: 'The DEAD TIRED design on a black T-shirt', caption: 'The design on a black shirt.' },
      { type: 'image', src: 'mockup.webp', alt: 'A mockup of a T-shirt printed with the DEAD TIRED design', caption: 'Tee mockup.' },
      { type: 'image', src: 'alt-stump.webp', alt: 'An alternative version of the DEAD TIRED design that keeps the stump', caption: 'The alternative version, with the stump left in.' },
    ],
  },
];
