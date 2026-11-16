export function createPill(root, scenes) {
  const label = root.querySelector('.pill__label');
  const labels = scenes.map(({ el }) => {
    if (el.classList.contains('chapter')) return `${el.dataset.number} · ${el.dataset.short || el.dataset.title}`;
    if (el.classList.contains('next')) return `${el.dataset.number} · Coming soon`;
    return null; // hero: no pill
  });
  let shown;
  return {
    update(index) {
      if (index === shown) return;
      shown = index;
      const text = labels[index] ?? null;
      root.hidden = !text;
      if (text) label.textContent = text;
    },
  };
}
