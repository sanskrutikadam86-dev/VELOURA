/* ===== phone ka menu ===== */
(function () {
  const btn = $('menuBtn'), nav = $('mnav');
  if (!btn || !nav) return;

  const set = open => {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? '✕' : '☰';
  };
  btn.addEventListener('click', () => set(!nav.classList.contains('open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  document.addEventListener('click', e => { if (!e.target.closest('#mnav, #menuBtn')) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  addEventListener('scroll', () => { if (nav.classList.contains('open')) set(false); }, { passive: true });
})();