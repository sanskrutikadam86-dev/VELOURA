/* ===== VELOURA closing: newsletter letter + footer (script.js aur filters.js ke baad load hota hai) ===== */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- newsletter ---------- */
  const form = $('nlForm'), art = $('nlArt'), msg = $('nlMsg');
  if (form) {
    $('sub').onclick = null;                            // script.js ka purana "sirf toast" wala handler hataya
    const say = (t, bad) => { msg.textContent = t; msg.classList.toggle('bad', !!bad); };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = $('email').value.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return say('Please enter a valid email address.', true);

      $('sub').disabled = true; say('');
      try {
        const res = await fetch(API + '/subscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');

        art.classList.add('sent');                     // muhar tootti hai, lifafa khulta hai
        say('You are on the list. Thank you!');
        $('email').value = ''; $('email').disabled = true; $('sub').textContent = 'Joined ✓';
      } catch (err) {
        say(err instanceof TypeError ? 'Cannot reach the server. Please try again.' : err.message, true);
        $('sub').disabled = false;
      }
    });
  }

  /* ---------- footer ke bade akshar ---------- */
  const word = $('ftWord');
  if (word) {
    word.innerHTML = 'VELOURA'.split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('');
    if (reduce) {
      word.classList.add('in', 'done');
    } else {
      const seen = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        seen.disconnect();
        word.classList.add('in');
        setTimeout(() => word.classList.add('done'), 1800);      // uske baad hover pe akshar tez uthte hain
      }, { threshold: 0.35 });
      seen.observe(word);
    }
  }

  /* ---------- footer ke Shop links (collections apne aap) ---------- */
  let built = false;
  function buildShopLinks() {
    if (built || !PRODUCTS.length) return;
    built = true;
    const cats = [...new Set(PRODUCTS.map(p => p.category).filter(Boolean))].sort().slice(0, 7);
    $('ftShop').innerHTML = '<h4>Shop</h4>' +
      cats.map(c => `<button type="button" data-q="${esc(c)}">${esc(c)}</button>`).join('') +
      '<button type="button" data-q="">All products</button>';
  }
  const baseRender = window.render;
  window.render = function () { baseRender.apply(this, arguments); buildShopLinks(); };
  buildShopLinks();

  $('ft').addEventListener('click', e => {
    const b = e.target.closest('[data-q], [data-room]');
    if (!b) return;
    window.resetFilters();
    if (b.dataset.room) {
      room = b.dataset.room;
      document.querySelectorAll('#chips .chip').forEach(c => c.classList.toggle('on', c.textContent === room));
    } else if (b.dataset.q) {
      $('fSearch').value = b.dataset.q;                  // search se collection ke products chhante hain
      $('fSearch').dispatchEvent(new Event('input'));
    }
    window.render();
    $('shop').scrollIntoView();
  });

  /* ---------- upar jao ka button ---------- */
  const topBtn = $('toTop'), ring = $('ttRing'), C = 125.66;
  function onScroll() {
    const h = document.documentElement.scrollHeight - innerHeight;
    topBtn.classList.toggle('on', scrollY > 700);
    ring.style.strokeDashoffset = C * (1 - Math.min(1, scrollY / Math.max(1, h)));
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  topBtn.onclick = () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
})();