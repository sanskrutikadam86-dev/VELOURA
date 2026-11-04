/* ===== VELOURA shop filters (script.js ke baad chalta hai) ===== */
(function () {
  const F = { cat: new Set(), mat: new Set(), style: new Set(), size: new Set(), stock: new Set(), min: null, max: null, q: '' };

  const SIZES = [
    { label: 'Height 0 to 15 cm',      from: 0,  to: 15 },
    { label: 'Height 16 to 30 cm',     from: 16, to: 30 },
    { label: 'Height 31 to 45 cm',     from: 31, to: 45 },
    { label: 'Height 46 to 60 cm',     from: 46, to: 60 },
    { label: 'Height 61 to 75 cm',     from: 61, to: 75 },
    { label: 'Height 76 cm and above', from: 76, to: Infinity }
  ];
  const sizeOf = p => {
    if (p.heightCm == null) return null;
    const b = SIZES.find(s => p.heightCm >= s.from && p.heightCm <= s.to);
    return b ? b.label : null;
  };
  const stockOf = p => (p.stock > 0 ? 'In stock' : 'Out of stock');

  const GROUPS = [
    { key: 'cat',   title: 'Collection',   get: p => p.category || null },
    { key: 'mat',   title: 'Material',     get: p => p.material || null },
    { key: 'style', title: 'Style',        get: p => p.style || null },
    { key: 'size',  title: 'Size',         get: sizeOf, order: SIZES.map(s => s.label) },
    { key: 'stock', title: 'Availability', get: stockOf, order: ['In stock', 'Out of stock'] }
  ];

  function bounds() {
    const ps = PRODUCTS.map(p => salePrice(p));
    if (!ps.length) return { lo: 0, hi: 0 };
    return { lo: Math.floor(Math.min(...ps) / 10) * 10, hi: Math.ceil(Math.max(...ps) / 10) * 10 };
  }

  // skip = jis group ki ginti nikal rahe hain, usko chhodke baaki sab filter lagao
  function pass(p, skip) {
    if (room && p.room !== room) return false;
    if (festOnly && !p.fest) return false;
    if ($('fWish').checked && !wish.includes(p.id)) return false;
    if (F.q) {
      const hay = [p.name, p.category, p.material, p.room, p.style].join(' ').toLowerCase();
      if (!F.q.split(/\s+/).every(w => hay.includes(w))) return false;
    }
    for (const g of GROUPS) {
      if (g.key === skip || !F[g.key].size) continue;
      if (!F[g.key].has(g.get(p))) return false;
    }
    if (skip !== 'price') {
      const sp = salePrice(p);
      if (F.min != null && sp < F.min) return false;
      if (F.max != null && sp > F.max) return false;
    }
    return true;
  }

  // "Shop by style" aur "Deal" wale tiles purane dropdown me value daalte hain, use yahan le lete hain
  function consumeLegacy() {
    const ls = $('fStyle').value;
    if (ls) { F.style = new Set([ls]); $('fStyle').value = ''; }
    const lb = +$('fBud').value;
    if (lb) { F.max = lb; $('fBud').value = ''; }
  }

  const SORTS = {
    feat: (a, b) => a.id - b.id,
    new:  (a, b) => b.id - a.id,
    plh:  (a, b) => salePrice(a) - salePrice(b),
    phl:  (a, b) => salePrice(b) - salePrice(a),
    off:  (a, b) => (b.off || 0) - (a.off || 0)
  };

  /* ---------- sidebar ---------- */
  function groupHtml(g) {
    const all = [...new Set(PRODUCTS.map(g.get).filter(Boolean))];
    if (!all.length) return '';                                 // jaankari hi nahi to group nahi dikhta
    const vals = g.order ? g.order.filter(v => all.includes(v)) : all.sort((a, b) => a.localeCompare(b));
    const counts = {};
    PRODUCTS.forEach(p => { const v = g.get(p); if (v && pass(p, g.key)) counts[v] = (counts[v] || 0) + 1; });
    const isOpen = !closed.has(g.key);
    return `<div class="fg${isOpen ? ' open' : ''}">
      <button class="fg-h" type="button" data-toggle="${g.key}"><span>${g.title}</span><i></i></button>
      <div class="fg-b">${vals.map(v => {
        const n = counts[v] || 0, on = F[g.key].has(v), dead = n === 0 && !on;
        return `<label class="fo${dead ? ' dim' : ''}"><input type="checkbox" data-k="${g.key}" data-v="${esc(v)}"${on ? ' checked' : ''}${dead ? ' disabled' : ''}><span>${esc(v)}</span><em>(${n})</em></label>`;
      }).join('')}</div>
    </div>`;
  }
  const closed = new Set();     // jo group band kiye gaye hain

  const rMin = $('rMin'), rMax = $('rMax'), pMin = $('pMin'), pMax = $('pMax');
  function syncPrice(b) {
    $('fxPriceG').hidden = b.lo === b.hi;
    [rMin, rMax].forEach(r => { r.min = b.lo; r.max = b.hi; r.step = 10; });
    const mn = F.min == null ? b.lo : Math.max(b.lo, F.min);
    const mx = F.max == null ? b.hi : Math.min(b.hi, F.max);
    const a = document.activeElement;                           // jo box abhi chhu rahe ho use mat chhedo
    if (a !== rMin) rMin.value = mn;
    if (a !== rMax) rMax.value = mx;
    if (a !== pMin) pMin.value = mn;
    if (a !== pMax) pMax.value = mx;
    const span = (b.hi - b.lo) || 1;
    $('pFill').style.left = ((mn - b.lo) / span * 100) + '%';
    $('pFill').style.right = (100 - (mx - b.lo) / span * 100) + '%';
    $('pLo').textContent = inr(b.lo);
    $('pHi').textContent = inr(b.hi);
  }

  /* ---------- chune hue filter ke tags ---------- */
  function pillsHtml() {
    const out = [], b = bounds();
    GROUPS.forEach(g => F[g.key].forEach(v => out.push({ k: g.key, v, label: v })));
    if ((F.min != null && F.min > b.lo) || (F.max != null && F.max < b.hi)) {
      out.push({ k: 'price', v: '', label: inr(F.min != null ? F.min : b.lo) + ' to ' + inr(F.max != null ? F.max : b.hi) });
    }
    if (F.q) out.push({ k: 'q', v: '', label: '“' + F.q + '”' });
    if (festOnly) out.push({ k: 'fest', v: '', label: 'Festive' });
    if ($('fWish').checked) out.push({ k: 'wish', v: '', label: '♥ Wishlist' });
    if (!out.length) return '';
    return out.map(t => `<button class="pill-f" type="button" data-pk="${t.k}" data-pv="${esc(t.v)}">${esc(t.label)} ×</button>`).join('') +
           '<button class="fx-clear" type="button" data-clear="1">Clear all</button>';
  }

  /* ---------- product card (script.js wale card jaisa hi) ---------- */
  const card = (p, i) => `
    <div class="cell" style="transition-delay:${Math.min(i, 12) * 50}ms">
      <article class="prod" data-id="${p.id}">
        <div class="thumb" style="--c1:${p.c1};--c2:${p.c2}">
          ${p.image ? `<img class="pimg" src="${p.image}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()">` : ''}
          <button class="heart" data-heart="${p.id}" aria-label="Save to wishlist">${wish.includes(p.id) ? '♥' : '♡'}</button>
          ${p.fest ? '<span class="tag">Festive</span>' : ''}
          ${offOf(p) ? `<span class="off">${offOf(p)}% off</span>` : ''}
          <span class="emo">${p.emoji}</span>
        </div>
        <div class="body">
          <h3><a href="product.html?id=${p.id}">${esc(p.name)}</a></h3>
          <p class="meta">${esc(p.room)} · ${esc(p.style)}</p>
                    ${p.ratingCount ? `<p class="rate"><span class="stars" style="--r:${p.ratingAvg}"></span><b>${p.ratingAvg.toFixed(1)}</b><span>(${p.ratingCount})</span></p>` : ''}
          <div class="row">
            <span class="price">${inr(salePrice(p))}${offOf(p) ? `<s>${inr(p.price)}</s>` : ''}</span>
            ${p.stock > 0 ? `<button class="add" data-add="${p.id}">Add</button>` : '<button class="add" disabled>Sold out</button>'}
          </div>
        </div>
      </article>
    </div>`;

  /* ---------- naya render ---------- */
  window.render = function () {
    consumeLegacy();
    const b = bounds();
    const list = PRODUCTS.filter(p => pass(p)).sort(SORTS[$('fSort').value] || SORTS.feat);

    $('count').textContent = list.length + ' of ' + PRODUCTS.length + ' products';
    $('wc').textContent = wish.length;

    $('fxTop').innerHTML = GROUPS.slice(0, 4).map(groupHtml).join('');
    $('fxBottom').innerHTML = groupHtml(GROUPS[4]);
    syncPrice(b);
    $('activeF').innerHTML = pillsHtml();
    $('fxApply').textContent = 'Show ' + list.length + (list.length === 1 ? ' product' : ' products');

    $('grid').innerHTML = list.length ? list.map(card).join('')
      : '<p class="empty">Nothing matches these filters. <button class="fx-clear" type="button" data-clear="1">Clear all filters</button></p>';

    document.querySelectorAll('.cell').forEach(c => io.observe(c));
    if (lastHeart) {
      const h = document.querySelector(`[data-heart="${lastHeart}"]`);
      if (h) h.classList.add('pop');
      lastHeart = null;
    }
  };

  window.resetFilters = function () {
    GROUPS.forEach(g => F[g.key].clear());
    F.min = F.max = null; F.q = '';
    $('fSearch').value = '';
    room = ''; festOnly = false;
    $('fStyle').value = ''; $('fBud').value = ''; $('fWish').checked = false;
    document.querySelectorAll('#chips .chip').forEach((c, i) => c.classList.toggle('on', i === 0));
  };

  /* ---------- events ---------- */
  let raf = 0;
  const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => window.render()); };

  $('fx').addEventListener('change', e => {
    const k = e.target.dataset.k;
    if (!k) return;
    if (e.target.checked) F[k].add(e.target.dataset.v); else F[k].delete(e.target.dataset.v);
    window.render();
  });
  $('fx').addEventListener('click', e => {
    const t = e.target.closest('[data-toggle]');
    if (!t) return;
    const grp = t.parentElement, key = t.dataset.toggle;
    grp.classList.toggle('open');
    if (grp.classList.contains('open')) closed.delete(key); else closed.add(key);
  });

  rMin.addEventListener('input', () => { if (+rMin.value > +rMax.value) rMin.value = rMax.value; F.min = +rMin.value; later(); });
  rMax.addEventListener('input', () => { if (+rMax.value < +rMin.value) rMax.value = rMin.value; F.max = +rMax.value; later(); });
  pMin.addEventListener('change', () => {
    const b = bounds();
    F.min = Math.max(b.lo, Math.min(Math.round(+pMin.value) || b.lo, F.max == null ? b.hi : F.max));
    window.render();
  });
  pMax.addEventListener('change', () => {
    const b = bounds();
    F.max = Math.min(b.hi, Math.max(Math.round(+pMax.value) || b.hi, F.min == null ? b.lo : F.min));
    window.render();
  });

  $('fSearch').addEventListener('input', () => { F.q = $('fSearch').value.trim().toLowerCase(); later(); });
  $('fSort').addEventListener('change', () => window.render());

  // tags par x, aur "Clear all"
  $('shop').addEventListener('click', e => {
    const clr = e.target.closest('[data-clear]');
    if (clr) { window.resetFilters(); window.render(); return; }
    const t = e.target.closest('[data-pk]');
    if (!t) return;
    const k = t.dataset.pk;
    if (F[k]) F[k].delete(t.dataset.pv);
    else if (k === 'price') F.min = F.max = null;
    else if (k === 'q') { F.q = ''; $('fSearch').value = ''; }
    else if (k === 'fest') festOnly = false;
    else if (k === 'wish') $('fWish').checked = false;
    window.render();
  });

  // phone: filters side se khulte hain
  const openFx = on => {
    $('fx').classList.toggle('open', on);
    $('fxOverlay').classList.toggle('open', on);
    document.body.classList.toggle('drawer-on', on);
  };
  $('fxOpen').onclick = () => openFx(true);
  $('fxClose').onclick = () => openFx(false);
  $('fxApply').onclick = () => { openFx(false); $('shop').scrollIntoView(); };
  $('fxOverlay').onclick = () => openFx(false);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') openFx(false); });

  if (PRODUCTS.length) window.render();
})();