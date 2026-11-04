/* ===== VELOURA "Why VELOURA" (script.js aur filters.js ke baad load hota hai) ===== */
(function () {
  const sec = $('about');
  if (!sec) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let built = false, seen = false;

  // Ginti seedha products se aati hai, isliye hamesha sahi rehti hai
  function stats() {
    const uniq = f => new Set(PRODUCTS.map(f).filter(Boolean)).size;
    return [
      [PRODUCTS.length, 'pieces to choose from'],
      [uniq(p => p.category), 'collections'],
      [uniq(p => p.room), 'rooms covered'],
      [uniq(p => p.style), 'styles']
    ].filter(s => s[0] > 0);
  }

  function countUp() {
    document.querySelectorAll('#abStats b').forEach(b => {
      const n = +b.dataset.n;
      if (reduce) { b.textContent = n; return; }
      const t0 = performance.now(), dur = 1400;
      (function step(t) {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);   // shuru me tez, aakhir me dheere
        b.textContent = Math.round(n * e);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  function build() {
    if (built || !PRODUCTS.length) return;
    built = true;
    $('abStats').innerHTML = stats().map(([n, label], i) =>
      `<div class="ab-stat" style="--i:${i + 1}"><b data-n="${n}">0</b><span>${label}</span></div>`).join('');
    if (seen) countUp();                                    // section pehle dikh chuka ho to ab ginti chalao
  }

  // section screen pe aate hi cards aate hain aur ginti chalti hai
  const watcher = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    watcher.disconnect();
    seen = true;
    sec.classList.add('in');
    countUp();
    setTimeout(() => sec.classList.add('done'), 2400);       // animation ke baad hover pehle jaisa tez
  }, { threshold: 0.2 });
  watcher.observe(sec);

  // products aate hi cards banao
  const baseRender = window.render;
  window.render = function () { baseRender.apply(this, arguments); build(); };
  build();
})();