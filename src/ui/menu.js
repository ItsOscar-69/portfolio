export function createMenu({ menu, triggers, onSelect }) {
  let open = false;
  let returnTo = null;
  let current = -1;
  const links = () => Array.from(menu.querySelectorAll('a.menu__link'));
  const setExpanded = (value) => triggers.forEach((t) => t.setAttribute('aria-expanded', String(value)));

  function show(trigger) {
    open = true;
    returnTo = trigger;
    menu.classList.toggle('menu--top', trigger?.dataset.menuPlacement === 'top');
    menu.hidden = false;
    setExpanded(true);
    const list = links();
    (list[current] || list[0])?.focus();
  }
  function hide({ restoreFocus = true } = {}) {
    if (!open) return;
    open = false;
    menu.hidden = true;
    setExpanded(false);
    if (restoreFocus && returnTo) returnTo.focus();
  }

  triggers.forEach((t) => t.addEventListener('click', () => (open ? hide() : show(t))));
  menu.addEventListener('keydown', (e) => {
    const list = links();
    const i = list.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); hide(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      list[(i + step + list.length) % list.length].focus();
    } else if (e.key === 'Tab') {
      e.preventDefault(); // keep focus inside the open menu
      const step = e.shiftKey ? -1 : 1;
      list[(Math.max(i, 0) + step + list.length) % list.length].focus();
    }
  });
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a.menu__link');
    if (!a) return;
    e.preventDefault();
    hide({ restoreFocus: false });
    onSelect(a.dataset.target);
  });
  document.addEventListener('pointerdown', (e) => {
    if (open && !menu.contains(e.target) && !triggers.some((t) => t.contains(e.target))) hide({ restoreFocus: false });
  });

  return {
    setCurrent(index) {
      if (index === current) return;
      current = index;
      links().forEach((a, j) => (j === index ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    },
    get isOpen() { return open; },
  };
}
