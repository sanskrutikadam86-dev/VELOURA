/* ===== VELOURA spotlight hero (script.js aur filters.js ke baad load hota hai) ===== */
(function () {
  if (!$('spotStage')) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Hero me jin products ko dikhana hai unke number (id) yahan likho (6 tak)
    const FEATURED_IDS = [1, 2, 3, 5, 10, 11];

  let LIST = [], idx = 0, front = 'A', busy = false, paused = false, inView = true, started = false, timer = null;
  const orbs = { A: $('orbA'), B: $('orbB') };
  const short = s => (s.length > 18 ? s.slice(0, 17) + '…' : s);
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

  function pickList() {
    const ok = p => p.image && p.stock > 0;
    const chosen = FEATURED_IDS.map(id => PRODUCTS.find(p => p.id === id)).filter(p => p && ok(p));
    const rest = PRODUCTS.filter(p => ok(p) && !chosen.includes(p)).sort((a, b) => (b.off || 0) - (a.off || 0));
    return [...chosen, ...rest].slice(0, 6);
  }

  /* ---------- bada gol photo ---------- */
  function setOrb(el, p) {
    el.style.backgroundColor = p.c2;
    el.style.backgroundImage = 'none';
    el.textContent = '';
    el.classList.toggle('cut', /\.png$/i.test(p.image || ''));         // transparent PNG ho to tairta hua dikhao
    if (!p.image) { el.textContent = p.emoji || '🏠'; return; }
    const im = new Image();
    im.onload = () => { el.style.backgroundImage = `url("${p.image}")`; };
    im.onerror = () => { el.textContent = p.emoji || '🏠'; };          // photo na mile to emoji
    im.src = p.image;
  }

  /* ---------- likhai aur card ---------- */
  function renderCopy(p, animate) {
    const w = p.name.trim().split(/\s+/);
    const t1 = w.length > 1 ? w[0] : '';
    const t2 = w.length > 1 ? w.slice(1).join(' ') : p.name;
    const off = p.off || 0;

        $('spotEyebrow').textContent = (p.fest ? 'Festive pick' : 'Featured') + ' · ' +
      ((p.category && p.category.toLowerCase() !== 'festive') ? p.category : p.room);
    $('spotTitle').innerHTML = (t1 ? `<span class="ln t1"><span>${esc(t1)}</span></span>` : '') +
                               `<span class="ln t2"><span>${esc(t2)}</span></span>`;
    $('spotPrice').innerHTML = inr(p.salePrice) + (off ? `<s>${inr(p.price)}</s><em>${off}% off</em>` : '');
    $('spotDesc').textContent = clip((p.description || '').trim() || `A ${p.style.toLowerCase()} piece for your ${p.room.toLowerCase()}.`, 150);
    $('spotShop').href = 'product.html?id=' + p.id;
    $('spotCard').innerHTML = `<h4>At a glance</h4><dl>
      <dt>Room</dt><dd>${esc(p.room)}</dd>
      <dt>Style</dt><dd>${esc(p.style)}</dd>
      ${p.material ? `<dt>Material</dt><dd>${esc(p.material)}</dd>` : ''}
      ${p.category ? `<dt>Collection</dt><dd>${esc(p.category)}</dd>` : ''}
      <dt>Stock</dt><dd>${p.stock <= 5 ? 'Only ' + p.stock + ' left' : 'In stock'}</dd></dl>`;

    if (animate) {
      const copy = document.querySelector('.spot-copy');
      copy.classList.remove('swap'); void copy.offsetWidth; copy.classList.add('swap');
    }
  }

  /* ---------- thumbnails ---------- */
  function renderThumbs() {
    $('spotThumbs').innerHTML =
      '<button class="spot-arrow" id="spotPrev" type="button" aria-label="Previous product">‹</button>' +
      LIST.map((p, i) => `<button class="th${i === idx ? ' on' : ''}" type="button" data-i="${i}" aria-label="${esc(p.name)}">
        <span style="background-image:url('${esc(p.image || '')}')">${p.image ? '' : esc(p.emoji || '🏠')}</span>${esc(short(p.name))}</button>`).join('') +
      '<button class="spot-arrow" id="spotNext" type="button" aria-label="Next product">›</button>';
  }
  const markThumb = n => document.querySelectorAll('#spotThumbs .th').forEach((b, i) => b.classList.toggle('on', i === n));

  /* ---------- product badalna: gola ek arc me ghoom ke dhundhla hota hai ---------- */
  function show(n, dir) {
    if (!LIST.length || busy) return;
    n = (n + LIST.length) % LIST.length;
    if (n === idx) return;
    const p = LIST[n];

    markThumb(n);
    $('spotDiag').style.backgroundColor = p.c2;
    renderCopy(p, true);

    const out = orbs[front], inn = orbs[front === 'A' ? 'B' : 'A'];
    setOrb(inn, p);
    idx = n;
    front = front === 'A' ? 'B' : 'A';

    if (reduce || !out.animate) { out.style.opacity = 0; inn.style.opacity = 1; return; }

    busy = true;
    setTimeout(() => { busy = false; }, 1400);
    const R = $('spotOrb').offsetWidth, s = dir >= 0 ? 1 : -1;
    out.style.zIndex = 1; inn.style.zIndex = 2; inn.style.opacity = 1;

    const a1 = out.animate([
      { transform: 'none', opacity: 1, filter: 'blur(0px)' },
      { transform: `translate(${-0.6 * R * s}px, ${-0.4 * R}px) rotate(${-150 * s}deg) scale(.5)`, opacity: 0, filter: 'blur(8px)' }
    ], { duration: 900, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' });
    a1.onfinish = () => { out.style.opacity = 0; a1.cancel(); };

    inn.animate([
      { transform: `translate(${0.6 * R * s}px, ${0.45 * R}px) rotate(${150 * s}deg) scale(.5)`, opacity: 0, filter: 'blur(8px)' },
      { transform: 'none', opacity: 1, filter: 'blur(0px)' }
    ], { duration: 1000, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  function play() {
    clearInterval(timer);
    timer = setInterval(() => { if (!paused && inView && !document.hidden) show(idx + 1, 1); }, 6000);
  }

  /* ---------- shuruat (products aane ke baad) ---------- */
  function init() {
    LIST = pickList();
    if (!LIST.length) {                                   // dikhane layak product nahi to purana hero wapas
      $('spot').hidden = true;
      const old = $('hero'); if (old) old.style.display = 'block';
      started = true;
      return;
    }
    started = true;
    LIST.forEach(p => { if (p.image) new Image().src = p.image; });     // photos pehle se load

    setOrb(orbs.A, LIST[0]);
    orbs.A.style.opacity = 1; orbs.B.style.opacity = 0;
    $('spotDiag').style.backgroundColor = LIST[0].c2;
    renderCopy(LIST[0], true);
    renderThumbs();
    play();
  }

  const baseRender = window.render;
  window.render = function () {
    baseRender.apply(this, arguments);
    if (!started && PRODUCTS.length) init();
  };
  if (PRODUCTS.length) init();

  /* ---------- buttons aur mouse ---------- */
  $('spotThumbs').addEventListener('click', e => {
    const th = e.target.closest('.th');
    if (th) { const i = +th.dataset.i; show(i, i > idx ? 1 : -1); play(); return; }
    if (e.target.closest('#spotNext')) { show(idx + 1, 1); play(); }
    if (e.target.closest('#spotPrev')) { show(idx - 1, -1); play(); }
  });
  $('spotAdd').onclick = () => { if (LIST[idx]) addToBag(LIST[idx].id); };
  $('spotOrb').addEventListener('click', () => { if (LIST[idx]) location.href = 'product.html?id=' + LIST[idx].id; });

  $('spotDock').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    window.resetFilters();
    if (b.dataset.fest) festOnly = true; else room = b.dataset.room;
    document.querySelectorAll('#chips .chip').forEach(c => c.classList.toggle('on', c.textContent === room));
    window.render();
    $('shop').scrollIntoView();
  });

  const stage = $('spotStage');
  stage.addEventListener('pointerenter', () => { paused = true; });
  stage.addEventListener('pointerleave', () => { paused = false; $('spotOrb').style.translate = ''; });
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0.2 }).observe(stage);
  if (fine && !reduce) {
    stage.addEventListener('pointermove', e => {                  // mouse ke saath halka depth
      const r = stage.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      $('spotOrb').style.translate = `${dx * -22}px ${dy * -16}px`;
    });
  }


 
})();