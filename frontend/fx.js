/* ===== VELOURA animation toolkit (script.js aur filters.js ke baad load hota hai) ===== */
(function () {
  // Jo effect pasand na aaye use false kar do
  const FX = { progress: true, split: true, reveal: true, magnet: true, cursor: true, parallax: true, band: true, hideHeader: true };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;     // animation band rakhne wale users
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;  // mouse wala computer
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  let bandVel = 0;                                                         // scroll ki raftaar

  /* ---------- 1. scroll progress line ---------- */
  let bar = null;
  if (FX.progress) {
    bar = document.createElement('div');
    bar.className = 'fx-progress';
    document.body.appendChild(bar);
  }

  /* ---------- 2. heading ke words ka mask reveal ---------- */
  if (FX.split) {
    const seen = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); }
    }), { threshold: 0.3 });

    qa('section h2').forEach(h => {
      if (h.children.length) return;                     // andar kuch aur ho to chhod do
      const text = h.textContent.trim();
      h.setAttribute('aria-label', text);
      h.innerHTML = text.split(/\s+/)
        .map((w, i) => `<span class="sw" aria-hidden="true"><span class="sw-i" style="--i:${i}">${w}</span></span>`).join(' ');
      h.classList.add('fx-split');
      seen.observe(h);
    });
  }

  /* ---------- 3. cards ka halka reveal ---------- */
  if (FX.reveal) {
    const rv = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('in');
      rv.unobserve(el);
      // animation khatam hone ke baad hata do, taaki hover wagairah pehle jaise chalein
      setTimeout(() => { el.classList.remove('rv', 'in'); el.style.transitionDelay = ''; }, 1600);
    }), { threshold: 0.12 });

    qa('.sub, .coupon, .deal, .look, .fest, .news, .post').forEach(el => {
      const sibs = [...el.parentElement.children];
      el.style.transitionDelay = Math.min(sibs.indexOf(el), 5) * 80 + 'ms';
      el.classList.add('rv');
      rv.observe(el);
    });
  }

  /* ---------- 4. magnetic buttons (sirf computer pe) ---------- */
  if (FX.magnet && fine) {
    qa('.btn.gold, .btn.ghost, .pill, .wa').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.translate = `${(e.clientX - (r.left + r.width / 2)) * 0.25}px ${(e.clientY - (r.top + r.height / 2)) * 0.35}px`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'translate .4s cubic-bezier(.2,.8,.2,1)';
        el.style.translate = '';
        setTimeout(() => { el.style.transition = ''; }, 450);
      });
    });
  }

  /* ---------- 5. cursor ring (sirf computer pe) ---------- */
  if (FX.cursor && fine) {
    const ring = document.createElement('div');
    ring.className = 'fx-ring';
    ring.innerHTML = '<span></span>';
    document.body.appendChild(ring);
    const label = ring.firstChild;
    let x = -100, y = -100, rx = x, ry = y, shown = false;

    addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; rx = x; ry = y; ring.classList.add('on'); }
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { shown = false; ring.classList.remove('on'); });

    document.addEventListener('pointerover', e => {
      const t = e.target.closest('.prod, [data-cursor], a, button, label, input, select, textarea');
      ring.classList.remove('big', 'link', 'hide');
      label.textContent = '';
      if (!t) return;
      if (t.matches('input, select, textarea')) { ring.classList.add('hide'); return; }
      if (t.matches('.prod, [data-cursor]')) { label.textContent = t.dataset.cursor || 'View'; ring.classList.add('big'); }
      else ring.classList.add('link');
    }, { passive: true });

    (function loop() {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- 6. bada outlined text band (scroll se tez hota hai) ---------- */
  if (FX.band && q('.marquee')) {
        const words = ['Cozy', 'Timeless', 'Warm', 'Styled', 'VELOURA'];
    const unit = words.map(w => `<span>${w}</span><i>✦</i>`).join('');
    const band = document.createElement('div');
    band.className = 'fx-band';
    band.setAttribute('aria-hidden', 'true');
    band.innerHTML = `<div class="fx-band-track">${unit.repeat(8)}</div>`;
    q('.marquee').after(band);

    const track = band.firstChild;
    let half = 0, pos = 0, speed = 0.6;
    const measure = () => { half = track.scrollWidth / 2; };
    measure(); addEventListener('resize', measure);
    document.fonts && document.fonts.ready.then(measure);

    (function loop() {
      speed += (0.6 + Math.abs(bandVel) * 0.3 - speed) * 0.08;
      pos -= speed;
      if (half && -pos >= half) pos += half;
      track.style.transform = `translateX(${pos}px)`;
      bandVel *= 0.9;
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- 7. scroll par: progress, header, parallax ---------- */
  const header = q('.top'), hero = q('#hero'), slides = q('#slides'), heroIn = q('.hero-in');
  let lastY = scrollY, ticking = false;

  function update() {
    ticking = false;
    const y = scrollY, dy = y - lastY;
    lastY = y;
    bandVel = dy;

    if (bar) bar.style.transform = `scaleX(${Math.min(1, y / Math.max(1, document.documentElement.scrollHeight - innerHeight))})`;

    if (FX.hideHeader && header && !document.body.classList.contains('drawer-on')) {
      if (y > 240 && dy > 6) header.classList.add('fx-hide');
      else if (dy < -6 || y < 240) header.classList.remove('fx-hide');
    }
    if (FX.parallax && hero && slides && heroIn && y < innerHeight * 1.3) {
      slides.style.translate = `0 ${y * 0.28}px`;
      heroIn.style.translate = `0 ${y * -0.12}px`;
      heroIn.style.opacity = Math.max(0, 1 - y / (innerHeight * 0.8));
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();