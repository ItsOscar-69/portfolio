export function swapFonts(html) {
  const out = html
    .replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.(?:googleapis|gstatic)\.com"[^>]*>\r?\n?/g, '')
    .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/[^"]*">/, '<link rel="stylesheet" href="fonts/fonts.css">');
  if (/fonts\.(googleapis|gstatic)\.com/.test(out)) throw new Error('HALCYON still references Google Fonts after swapFonts');
  return out;
}

export function lockForm(html) {
  const out = html
    .replace(/<form class="consult__form"[^>]*>/, '<form class="consult__form" autocomplete="off">')
    .replace(/(<(?:input|select|textarea)\b[^>]*?)\s+name="[^"]*"/g, '$1')
    .replace(/autocomplete="name"/g, 'autocomplete="off"');
  if (!out.includes('<form class="consult__form" autocomplete="off">')) throw new Error('HALCYON consultation form not found');
  return out;
}

export function rewriteFontCss(css, prefix) {
  const files = [];
  const out = css.replace(/src:\s*url\(\.\/files\/([^)]+?\.woff2)\)\s*format\(['"]woff2['"]\)[^;]*;/g, (_, name) => {
    files.push(name);
    return `src: url(${prefix}${name}) format('woff2');`;
  });
  if (!files.length) throw new Error('no woff2 files found in font CSS');
  return { css: out, files };
}

// The rail's "H/S" mark is labelled "Halcyon Somatics, back to top", which doesn't contain the text you see, so
// someone using speech input can't say "click H/S" (WCAG 2.5.3). Put the visible text at the start of the label.
export function labelRailMark(html) {
  return html.replace('aria-label="Halcyon Somatics, back to top"', 'aria-label="H/S: Halcyon Somatics, back to top"');
}
