import { it, expect } from 'vitest';
import { swapFonts, lockForm, rewriteFontCss } from '../../tools/lib/halcyon-transform.mjs';

const head = `<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Michroma&display=swap">
  <link rel="stylesheet" href="styles.css">
</head>`;

it('swaps Google Fonts for the local font stylesheet', () => {
  const out = swapFonts(head);
  expect(out).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  expect(out).toContain('<link rel="stylesheet" href="fonts/fonts.css">');
  expect(out).toContain('<link rel="stylesheet" href="styles.css">');
});

it('locks the consultation form so typed text can never reach a URL', () => {
  const form = `<form class="consult__form" action="#sec-07" method="get">
    <input class="field__input" id="patient" name="patient" type="text" autocomplete="name" required>
    <select class="field__input" id="implant" name="implant"></select>
    <input id="consent" name="consent" type="checkbox" required></form><meta name="viewport" content="x">`;
  const out = lockForm(form);
  expect(out).toContain('<form class="consult__form" autocomplete="off">');
  expect(out).not.toMatch(/<(input|select)[^>]*\sname=/);
  expect(out).not.toContain('autocomplete="name"');
  expect(out).toContain('id="patient"');
  expect(out).toContain('<meta name="viewport"');
});

it('throws if the form is missing, so a changed source is noticed', () => {
  expect(() => lockForm('<p>no form</p>')).toThrow(/form not found/);
});

it('keeps only woff2 sources and lists the files to copy', () => {
  const css = `@font-face {
  font-family: 'Michroma';
  src: url(./files/michroma-latin-400-normal.woff2) format('woff2'), url(./files/michroma-latin-400-normal.woff) format('woff');
  unicode-range: U+0000-00FF;
}`;
  const { css: out, files } = rewriteFontCss(css, 'files/');
  expect(files).toEqual(['michroma-latin-400-normal.woff2']);
  expect(out).toContain("src: url(files/michroma-latin-400-normal.woff2) format('woff2');");
  expect(out).not.toContain('.woff)');
});
