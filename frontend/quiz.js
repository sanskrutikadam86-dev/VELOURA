/* ===== VELOURA style quiz (script.js aur filters.js ke baad load hota hai) ===== */
(function () {
  if (!$('qz')) return;

  const STYLES = {
    Minimal:     'Clean lines, soft neutrals and calm, uncluttered spaces.',
    Boho:        'Natural textures like cane and jute, relaxed and full of warmth.',
    Modern:      'Sleek shapes with brass and wood accents.',
    Traditional: 'Carved wood, brass and rich colour with a classic feel.'
  };
  const ORDER = Object.keys(STYLES);

  // w = kis style ko kitne number milte hain
  const QUESTIONS = [
    { title: 'Which room are you styling?', opts: [
      { label: 'Living room', icon: '🛋️', room: 'Living room' },
      { label: 'Bedroom',     icon: '🛏️', room: 'Bedroom' },
      { label: 'Kitchen',     icon: '🍳', room: 'Kitchen' },
      { label: 'Entryway',    icon: '🚪', room: 'Entryway' } ] },
    { title: 'How should it feel?', opts: [
      { label: 'Calm and clean',     icon: '🤍', w: { Minimal: 2 } },
      { label: 'Relaxed and earthy', icon: '🌿', w: { Boho: 2 } },
      { label: 'Sleek and bold',     icon: '🖤', w: { Modern: 2 } },
      { label: 'Warm and classic',   icon: '🪵', w: { Traditional: 2 } } ] },
    { title: 'Pick a colour mood', opts: [
      { label: 'Soft neutrals',     sw: ['#efe7dc', '#d9cbb8', '#b9a58b'], w: { Minimal: 1 } },
      { label: 'Wood and jute',     sw: ['#d8b98a', '#b58a52', '#7a5a34'], w: { Boho: 1 } },
      { label: 'Black and brass',   sw: ['#2a2a2e', '#b8923e', '#e6d6a8'], w: { Modern: 1 } },
      { label: 'Deep red and gold', sw: ['#7a1f3d', '#b8501f', '#d9b66b'], w: { Traditional: 1 } } ] }
  ];

  let step = 0, answers = [];

  const bar = pct => { $('qzBarI').style.width = pct + '%'; };

  function renderQ() {
    const q = QUESTIONS[step];
    bar(step / QUESTIONS.length * 100);
    $('qzMain').innerHTML = `
      <div class="qz-q">
        <p class="qz-count">Question ${step + 1} of ${QUESTIONS.length}</p>
        <h3>${q.title}</h3>
        <div class="qz-opts">${q.opts.map((o, i) => `
          <button type="button" class="qz-opt" data-i="${i}" style="--i:${i}">
            ${o.sw ? `<span class="qz-sw">${o.sw.map(c => `<i style="background:${c}"></i>`).join('')}</span>` : `<span class="qz-ic">${o.icon}</span>`}
            <span>${o.label}</span>
          </button>`).join('')}
        </div>
        ${step > 0 ? '<button type="button" class="qz-back" id="qzBack">← Back</button>' : ''}
      </div>`;
  }

  function result() {
    bar(100);
    const score = {};
    ORDER.forEach(s => { score[s] = 0; });
    QUESTIONS.forEach((q, qi) => {
      const o = q.opts[answers[qi]];
      if (o && o.w) for (const k in o.w) score[k] += o.w[k];
    });
    let best = ORDER[0];
    ORDER.forEach(s => { if (score[s] > score[best]) best = s; });

    const room = QUESTIONS[0].opts[answers[0]].room;
    const inStock = PRODUCTS.filter(p => p.stock > 0);
    const sameStyle = inStock.filter(p => p.style === best);
    const picks = [...sameStyle.filter(p => p.room === room), ...sameStyle.filter(p => p.room !== room)];
    inStock.filter(p => p.room === room && !picks.includes(p)).forEach(p => picks.push(p));   // kam pade to usi kamre ke aur products
    const top = picks.slice(0, 4);

    $('qzMain').innerHTML = `
      <div class="qz-res">
        <p class="qz-count">Your style</p>
        <h3>${best}</h3>
        <p class="qz-blurb">${STYLES[best]}</p>
        ${top.length ? `<div class="qz-grid">${top.map(p => `
          <a class="qz-card" href="product.html?id=${p.id}">
            <div class="im" style="--c1:${esc(p.c1)};--c2:${esc(p.c2)}">
              ${esc(p.emoji || '🏠')}${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
            </div>
            <b>${esc(p.name)}</b><span>${inr(p.salePrice)}</span>
          </a>`).join('')}</div>` : '<p class="qz-blurb">Products are still loading. Please try the quiz again in a moment.</p>'}
        <div class="qz-actions">
          <button type="button" class="btn gold" id="qzAll">See all ${best} pieces</button>
          <button type="button" class="btn plain" id="qzAgain">Retake quiz</button>
        </div>
      </div>`;
    $('qzMain').dataset.style = best;
  }

  $('qzMain').addEventListener('click', e => {
    const opt = e.target.closest('.qz-opt');
    if (opt) {
      opt.classList.add('on');
      setTimeout(() => {
        answers[step] = +opt.dataset.i;
        step++;
        if (step < QUESTIONS.length) renderQ(); else result();
      }, 240);
      return;
    }
    if (e.target.closest('#qzBack')) { step--; answers.length = step; renderQ(); return; }
    if (e.target.closest('#qzAgain')) { step = 0; answers = []; renderQ(); return; }
    if (e.target.closest('#qzAll')) {
      window.resetFilters();
      $('fStyle').value = $('qzMain').dataset.style;       // filters.js ise style filter bana leta hai
      window.render();
      $('shop').scrollIntoView();
    }
  });

  renderQ();
})();