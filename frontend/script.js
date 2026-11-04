let PRODUCTS = [];
const offOf = p => p.off || 0;
const salePrice = p => p.salePrice;
const LOOKS = [
  {style:'Minimal',     text:'Clean lines, soft neutrals',        emoji:'🤍', bg:'#e4eae4'},
  {style:'Boho',        text:'Cane, jute and warm texture',       emoji:'🌿', bg:'#f3e2b9'},
  {style:'Modern',      text:'Brass, wood and bold shapes',       emoji:'🔶', bg:'#d6e4ee'},
  {style:'Traditional', text:'Carved wood and festive colour',    emoji:'🪔', bg:'#f6d3b6'}
];

const $ = id => document.getElementById(id);
let wish = [], cart = 0, room = '', festOnly = false, lastHeart = null;
try { wish = JSON.parse(localStorage.getItem('wish') || '[]'); } catch (e) {}

/* ---------- headline words (rise + shimmer) ---------- */
$('h1').innerHTML = $('h1').textContent.split(' ')
  .map((w, i) => `<span class="w${w === 'Diwali' ? ' em' : ''}" style="--d:${i * 0.13}s">${w}</span>`).join(' ');
/* ---------- typing effect ---------- */
const words = ['living room', 'bedroom', 'kitchen', 'entryway', 'festive nights'];
let wi = 0, ci = 0, del = false;
function type() {
  const w = words[wi];
  $('type').textContent = w.slice(0, ci);
  if (!del && ci === w.length) { del = true; return setTimeout(type, 1400); }
  if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; }
  ci += del ? -1 : 1;
  setTimeout(type, del ? 45 : 90);
}
if (matchMedia('(prefers-reduced-motion: reduce)').matches) $('type').textContent = words[0];
else type();

/* ---------- marquee ---------- */
const offers = ['Decor for every room', 'Free delivery above ₹1,999', 'Cash on delivery', '7-day easy returns', 'Use code HOME10 on orders above ₹1,999'];
$('track').innerHTML = [...offers, ...offers].map(t => `<span>${t}</span>`).join('') +
                       [...offers, ...offers].map(t => `<span>${t}</span>`).join('');

/* ---------- scroll reveal ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });

/* ---------- toast ---------- */
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.className = 'on';
  clearTimeout(toast.id); toast.id = setTimeout(() => t.className = '', 1700);
}

/* ---------- render products ---------- */
function render() {
  const style = $('fStyle').value, budget = +$('fBud').value || Infinity, wishOnly = $('fWish').checked;
  const list = PRODUCTS.filter(p =>
    (!room || p.room === room) && (!style || p.style === style) && salePrice(p) <= budget &&
    (!wishOnly || wish.includes(p.id)) && (!festOnly || p.fest));

  $('count').textContent = list.length + (list.length === 1 ? ' product' : ' products');
  $('wc').textContent = wish.length;

  $('grid').innerHTML = list.length ? list.map((p, i) => `
    <div class="cell" style="transition-delay:${i * 60}ms">
        <article class="prod" data-id="${p.id}">
        <div class="thumb" style="--c1:${p.c1};--c2:${p.c2}">
        ${p.image ? `<img class="pimg" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.remove()">` : ''}
          <button class="heart" data-heart="${p.id}" aria-label="Save to wishlist">${wish.includes(p.id) ? '♥' : '♡'}</button>
          ${p.fest ? '<span class="tag">Festive</span>' : ''}
          ${offOf(p) ? `<span class="off">${offOf(p)}% off</span>` : ''}
          <span class="emo">${p.emoji}</span>
        </div>
        <div class="body">
            <h3><a href="product.html?id=${p.id}">${p.name}</a></h3>
          <p class="meta">${p.room} · ${p.style}</p>
          <div class="row">
            <span class="price">₹${salePrice(p).toLocaleString('en-IN')}${offOf(p) ? `<s>₹${p.price.toLocaleString('en-IN')}</s>` : ''}</span>
              ${p.stock > 0 ? `<button class="add" data-add="${p.id}">Add</button>` : '<button class="add" disabled>Sold out</button>'}
          </div>
        </div>
      </article>
    </div>`).join('')
    : '<p class="empty">Nothing matches these filters. Try a different room, style or budget.</p>';

  document.querySelectorAll('.cell').forEach(c => io.observe(c));
  if (lastHeart) { const h = document.querySelector(`[data-heart="${lastHeart}"]`); if (h) h.classList.add('pop'); lastHeart = null; }
}

/* ---------- chips, looks ---------- */
['All', 'Living room', 'Bedroom', 'Kitchen', 'Entryway'].forEach(r => {
  const b = document.createElement('button');
  b.className = 'chip' + (r === 'All' ? ' on' : ''); b.textContent = r;
  b.onclick = () => {
    room = r === 'All' ? '' : r; festOnly = false;
    document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
    render();
  };
  $('chips').appendChild(b);
});

$('looks-grid').innerHTML = LOOKS.map(l => `
  <button class="look" data-style="${l.style}" style="background:${l.bg}">
    <span class="big">${l.emoji}</span><h3>${l.style}</h3><span>${l.text}</span>
  </button>`).join('');

function resetFilters() {
  room = ''; festOnly = false;
  $('fStyle').value = ''; $('fBud').value = ''; $('fWish').checked = false;
  document.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('on', i === 0));
}

$('looks-grid').addEventListener('click', e => {
  const l = e.target.closest('.look'); if (!l) return;
  resetFilters(); $('fStyle').value = l.dataset.style; render();
  $('shop').scrollIntoView();
});
$('festBtn').onclick = () => { resetFilters(); festOnly = true; render(); $('shop').scrollIntoView(); };
$('wishBtn').onclick = () => { resetFilters(); $('fWish').checked = true; render(); $('shop').scrollIntoView(); };
$('cartBtn').onclick = () => openCart();
['fStyle', 'fBud', 'fWish'].forEach(id => $(id).addEventListener('change', () => { festOnly = false; render(); }));

/* ---------- heart + add to cart ---------- */
$('grid').addEventListener('click', e => {
  const h = e.target.closest('[data-heart]'), a = e.target.closest('[data-add]');
  if (h) {
    const id = +h.dataset.heart;
    wish = wish.includes(id) ? wish.filter(x => x !== id) : [...wish, id];
    try { localStorage.setItem('wish', JSON.stringify(wish)); } catch (err) {}
    lastHeart = id; render();
  }
    if (a) addToBag(+a.dataset.add);
      if (!h && !a && !e.target.closest('a, button')) {
    const c = e.target.closest('.prod');
    if (c) location.href = 'product.html?id=' + c.dataset.id;
  }
});

/* ---------- 3D tilt + glare ---------- */
if (matchMedia('(hover: hover)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  $('grid').addEventListener('mousemove', e => {
    const c = e.target.closest('.prod'); if (!c) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty('--ry', (x - .5) * 14 + 'deg');
    c.style.setProperty('--rx', (.5 - y) * 14 + 'deg');
    c.style.setProperty('--gx', x * 100 + '%');
    c.style.setProperty('--gy', y * 100 + '%');
  });
  $('grid').addEventListener('mouseout', e => {
    const c = e.target.closest('.prod');
    if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); }
  });
}

/* ---------- newsletter ---------- */
$('sub').onclick = () => {
  if (/^\S+@\S+\.\S+$/.test($('email').value)) { toast('Thanks for subscribing'); $('email').value = ''; }
  else toast('Enter a valid email address');
};

const API = location.port === '3000' ? '/api' : 'http://localhost:3000/api';

async function loadProducts() {
  $('grid').innerHTML = '<p class="empty">Loading products…</p>';

  // 1) Sirf server se products lana. "Backend running?" ka message tabhi aayega jab yahan galti ho
  let data;
  try {
    const res = await fetch(API + '/products');
    if (!res.ok) throw new Error('Server error');
    data = await res.json();
  } catch (e) {
    $('grid').innerHTML = '<p class="empty">Could not load products. Is the backend running? (npm run dev)</p>';
    return;
  }
  PRODUCTS = data;

  // 2) Ab dikhana. Kuch toote to bhi products gayab nahi honge, bas Console me asli error dikhega
  try { render(); }
  catch (e) {
    console.error('render() me error:', e);
    $('grid').innerHTML = '<p class="empty">Something went wrong while showing products. Please refresh the page.</p>';
  }
  try { renderBag(); }
  catch (e) { console.error('renderBag() me error:', e); }
}
loadProducts();


/* ---------- sparkles ---------- */
for (let i = 0; i < 40; i++) {
  const s = document.createElement('i'), size = 2 + Math.random() * 4;
  s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-delay:${Math.random() * 4}s;animation-duration:${2 + Math.random() * 3}s`;
  $('sparkles').appendChild(s);
}

/* ---------- coupons: tap to copy ---------- */
document.querySelectorAll('.coupon').forEach(c => c.addEventListener('click', () => {
  const code = c.dataset.code;
  try { navigator.clipboard.writeText(code); } catch (e) {}
  c.querySelector('i').textContent = 'Copied!';
  toast(code + ' copied');
  setTimeout(() => c.querySelector('i').textContent = 'Tap to copy', 2000);
}));

/* ---------- deal tiles: filter the shop ---------- */
document.querySelectorAll('.deal').forEach(d => d.addEventListener('click', () => {
  resetFilters();
  if (d.dataset.fest) festOnly = true;
  if (d.dataset.bud) $('fBud').value = d.dataset.bud;
  if (d.dataset.style) $('fStyle').value = d.dataset.style;
  if (d.dataset.room) {
    room = d.dataset.room;
    document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.textContent === room));
  }
  render();
  $('shop').scrollIntoView();
}));
/* ---------- hero photo slideshow ---------- */
const slides = [...document.querySelectorAll('.slide')];
let si = 0, slideTimer;

slides.forEach((_, i) => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', 'Show photo ' + (i + 1));
  b.onclick = () => { go(i); restart(); };
  $('dots').appendChild(b);
});

function go(n) {
  si = (n + slides.length) % slides.length;
  slides.forEach((s, i) => s.classList.toggle('on', i === si));
  [...$('dots').children].forEach((d, i) => d.classList.toggle('on', i === si));
}
function restart() {
  clearInterval(slideTimer);
  slideTimer = setInterval(() => go(si + 1), 5000);
}

$('hero').addEventListener('mouseenter', () => clearInterval(slideTimer));
$('hero').addEventListener('mouseleave', restart);
go(0); restart();
/* ---------- login popup (email OTP) ---------- */
const modal = $('authModal');
let user = null, otpEmail = '', needName = false, resendTimer = null;

const seen = () => { try { return localStorage.getItem('vlr_seen') === '1'; } catch (e) { return false; } };
const markSeen = () => { try { localStorage.setItem('vlr_seen', '1'); } catch (e) {} };
const getToken = () => { try { return localStorage.getItem('vlr_token'); } catch (e) { return null; } };
const showErr = m => { $('aErr').textContent = m; };
function showUser() { $('userBtn').textContent = user ? 'Hi, ' + user.name.split(' ')[0] : 'Login'; }

async function postJson(path, body) {
  const res = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}
const netMsg = err => err instanceof TypeError ? 'Cannot reach the server. Is the backend running?' : err.message;

function step(n) {                                   // 1 = email, 2 = code
  $('stepEmail').hidden = n !== 1;
  $('stepCode').hidden = n !== 2;
  showErr('');
  setTimeout(() => (n === 1 ? $('aEmail') : $('aCode')).focus(), 350);
}
function openAuth() {                                // purane jagah openAuth('login') bhi chalta rahega
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  step(otpEmail ? 2 : 1);
}
function closeAuth() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  markSeen();
}

function startResend(sec) {
  clearInterval(resendTimer);
  let left = sec;
  const tick = () => {
    $('resendBtn').disabled = left > 0;
    $('resendBtn').textContent = left > 0 ? 'Resend code in ' + left + 's' : 'Resend code';
  };
  tick();
  resendTimer = setInterval(() => { left--; tick(); if (left <= 0) clearInterval(resendTimer); }, 1000);
}

async function requestCode(email) {
  const { res, data } = await postJson('/auth/otp/request', { email });
  if (!res.ok) throw new Error(data.error || 'Could not send the code');
  return data;
}

/* step 1: email */
$('emailForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('aEmail').value.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return showErr('Enter a valid email address');
  $('sendBtn').disabled = true; showErr('');
  try {
    const d = await requestCode(email);
    otpEmail = email; needName = false;
    $('sentTo').textContent = email;
    $('aCode').value = ''; $('aName').value = ''; $('nameRow').hidden = true;
    step(2); startResend(d.resendIn || 60);
  } catch (err) {
    showErr(netMsg(err));
  } finally {
    $('sendBtn').disabled = false;
  }
});

/* step 2: code (6 akshar poore hote hi apne aap check) */
$('aCode').addEventListener('input', () => {
  $('aCode').value = $('aCode').value.replace(/\D/g, '').slice(0, 6);
  if ($('aCode').value.length === 6 && !needName) $('codeForm').requestSubmit();
});

$('codeForm').addEventListener('submit', async e => {
  e.preventDefault();
  const code = $('aCode').value;
  const name = $('aName').value.trim();
  if (code.length !== 6) return showErr('Enter the 6-digit code');
  if (needName && name.length < 2) return showErr('Please enter your name');

  $('verifyBtn').disabled = true; showErr('');
  try {
    const { res, data } = await postJson('/auth/otp/verify', { email: otpEmail, code, name: needName ? name : undefined });
    if (!res.ok) { showErr(data.error || 'Something went wrong'); $('aCode').select(); return; }
    if (data.needName) {                              // naya user: code sahi hai, naam chahiye
      needName = true; $('nameRow').hidden = false; $('aName').focus(); return;
    }
    user = data.user;
    try { localStorage.setItem('vlr_token', data.token); } catch (x) {}
    otpEmail = ''; needName = false; clearInterval(resendTimer);
    $('emailForm').reset(); $('codeForm').reset();
    closeAuth(); showUser();
    toast('Welcome, ' + user.name.split(' ')[0] + '!');
  } catch (err) {
    showErr(netMsg(err));
  } finally {
    $('verifyBtn').disabled = false;
  }
});

$('resendBtn').onclick = async () => {
  try { const d = await requestCode(otpEmail); startResend(d.resendIn || 60); showErr(''); toast('New code sent'); }
  catch (err) { showErr(netMsg(err)); }
};
$('changeEmail').onclick = () => { otpEmail = ''; needName = false; clearInterval(resendTimer); step(1); };

/* band karna */
$('authClose').onclick = closeAuth;
$('guestBtn').onclick = closeAuth;
modal.addEventListener('click', e => { if (e.target === modal) closeAuth(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeAuth(); });

$('userBtn').onclick = () => { if (user) openOrders(); else openAuth(); };

// Page khulte hi check karo ki pehle se logged-in hai ya nahi
(async () => {
  const t = getToken();
  if (!t) return;
  try {
    const r = await fetch(API + '/auth/me', { headers: { Authorization: 'Bearer ' + t } });
    if (r.ok) { user = (await r.json()).user; showUser(); }
    else localStorage.removeItem('vlr_token');
  } catch (e) {}
})();

/* ---------- welcome intro: makhmal ke parde + gold dust ---------- */
const INTRO_ONCE = false;   // site live karte waqt true kar dena: visitor ko sirf ek baar dikhega

function schedulePopup() {
  setTimeout(() => { if (!user && !seen()) openAuth('signup'); }, 3000);
}

/* ----- awaaz (Web Audio: kisi mp3 file ki zarurat nahi) ----- */
let actx = null, master = null, noiseBuf = null, muted = false;

function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  actx = new AC();
  master = actx.createGain();
  master.gain.value = 0.3;                      // halki awaaz, aur dheemi karni ho to 0.15 kar de
  master.connect(actx.destination);
  const len = actx.sampleRate;
  noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
}
function noiseSrc(t, dur) {
  const s = actx.createBufferSource();
  s.buffer = noiseBuf;
  s.start(t, Math.random() * 0.1);
  s.stop(t + dur);
  return s;
}
function out(pan) {
  if (actx.createStereoPanner) {
    const p = actx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(master);
    return p;
  }
  return master;
}
function whoosh(pan) {
  if (!actx || muted) return;
  const t = actx.currentTime, s = noiseSrc(t, 0.6);
  const bp = actx.createBiquadFilter(), g = actx.createGain();
  bp.type = 'bandpass'; bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(500, t);
  bp.frequency.exponentialRampToValueAtTime(3000, t + 0.55);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  s.connect(bp); bp.connect(g); g.connect(out(pan));
}
function swish() {                              // makhmal ke parde khinchne ki naram awaaz
  if (!actx || muted) return;
  const t = actx.currentTime, s = noiseSrc(t, 0.9);
  const lp = actx.createBiquadFilter(), g = actx.createGain();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(300, t);
  lp.frequency.exponentialRampToValueAtTime(2600, t + 0.7);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  s.connect(lp); lp.connect(g); g.connect(out(0));
}
function chime() {                              // halki ghanti jaisi teen aawazein
  if (!actx || muted) return;
  const t0 = actx.currentTime + 0.25;
  [[880, 0], [1318.5, 0.14], [1760, 0.3]].forEach(([f, d]) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0 + d);
    g.gain.exponentialRampToValueAtTime(0.22, t0 + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 1.4);
    o.connect(g); g.connect(out(0)); o.start(t0 + d); o.stop(t0 + d + 1.5);
  });
}

/* ----- intro ----- */
(function intro() {
  const el = $('intro');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let played = false;
  try { played = sessionStorage.getItem('vlr_intro') === '1'; } catch (e) {}
    const skipIntro = location.hash === '#cart' || new URLSearchParams(location.search).has('review');
  if (reduce || (INTRO_ONCE && played) || skipIntro) {
    el.remove();
    if (!skipIntro) schedulePopup();
    return;
  }
  try { sessionStorage.setItem('vlr_intro', '1'); } catch (e) {}

  // logo image na mile to text dikhao
  const img = $('introLogoImg');
  const fallback = () => { $('introLogo').innerHTML = '<span class="intro-word">VELOURA</span>'; };
  if (img.complete && img.naturalWidth === 0) fallback(); else img.addEventListener('error', fallback);

  document.body.classList.add('intro-on');

  /* ---- sunehri dhool ---- */
  const cv = $('fw'), ctx = cv.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  let W = 0, H = 0, motes = [], burst = [], raf = 0, last = performance.now();
  let opened = false, closed = false, gateTimer;

  const mote = init => ({
    x: rnd(0, W), y: init ? rnd(0, H) : H + 8, r: rnd(0.6, 2.2), vy: -rnd(8, 26),
    sway: rnd(6, 22), ph: rnd(0, 6.28), tw: rnd(1.2, 3.5), a: rnd(0.3, 0.95)
  });

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = W < 700 ? 36 : 72;
    while (motes.length < n) motes.push(mote(true));
    motes.length = n;
  }
  resize(); addEventListener('resize', resize);

  function makeBurst() {                                  // parde khulte hi beech se dhool phailti hai
    const cols = ['255,214,130', '255,236,190', '240,190,90'];
    for (let i = 0; i < 150; i++) {
      const a = rnd(0, 6.283), s = rnd(90, 460);
      burst.push({ x: W / 2, y: H / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rnd(0.8, 2.6), life: 1, c: cols[(Math.random() * 3) | 0] });
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    for (const m of motes) {
      m.y += m.vy * dt; m.ph += dt * 0.7;
      if (m.y < -10) Object.assign(m, mote(false));
      const a = m.a * (0.45 + 0.55 * Math.sin(now / 1000 * m.tw + m.ph));
      ctx.fillStyle = `rgba(255,214,130,${Math.max(0, a)})`;
      ctx.beginPath(); ctx.arc(m.x + Math.sin(m.ph) * m.sway, m.y, m.r, 0, 6.283); ctx.fill();
    }
    const f = Math.pow(0.12, dt);
    burst = burst.filter(p => {
      p.life -= dt * 0.65;
      if (p.life <= 0) return false;
      p.vx *= f; p.vy = p.vy * f + 40 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.fillStyle = `rgba(${p.c},${p.life})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      return true;
    });
    raf = requestAnimationFrame(frame);
  }

  /* ---- parde kholna ---- */
  function openUp(withSound) {
    if (opened || closed) return;
    opened = true;
    clearTimeout(gateTimer);
    if (withSound) { initAudio(); swish(); chime(); }     // awaaz tabhi chalti hai jab user ne click kiya ho
    el.classList.add('open');
    makeBurst();
    setTimeout(finish, 1900);
  }

  function finish() {
    if (closed) return;
    closed = true;
    clearTimeout(gateTimer);
    el.classList.add('out');
    document.body.classList.remove('intro-on');

    const sc = document.querySelector('.spot-copy');      // hero ke likhai ka animation dobara chalao, taaki dikhe
    if (sc) { sc.classList.remove('swap'); void sc.offsetWidth; sc.classList.add('swap'); }

    setTimeout(() => { cancelAnimationFrame(raf); removeEventListener('resize', resize); el.remove(); }, 900);
    schedulePopup();
  }

  $('introEnter').onclick = () => openUp(true);
  $('introSkip').onclick = finish;
  $('introMute').onclick = () => {
    muted = !muted;
    $('introMute').textContent = muted ? '🔇 Sound off' : '🔊 Sound on';
  };
  gateTimer = setTimeout(() => openUp(false), 12000);     // koi click na kare to 12 second baad chup-chaap khulta hai

  raf = requestAnimationFrame(frame);
})();
/* ---------- cart drawer ---------- */
const FREE_AT = 1999, DELIVERY = 99;
let bag = [], coupon = null;
try { bag = JSON.parse(localStorage.getItem('vlr_bag') || '[]'); } catch (e) {}
if (!Array.isArray(bag)) bag = [];

const inr = n => '₹' + n.toLocaleString('en-IN');
const saveBag = () => { try { localStorage.setItem('vlr_bag', JSON.stringify(bag)); } catch (e) {} };
const lines = () => bag.map(b => ({ p: PRODUCTS.find(x => x.id === b.id), qty: b.qty })).filter(l => l.p);
const subtotalOf = () => lines().reduce((s, l) => s + salePrice(l.p) * l.qty, 0);
const setCpMsg = (m, bad) => { $('cpMsg').textContent = m; $('cpMsg').className = 'cp-msg' + (m ? (bad ? ' bad' : ' ok') : ''); };

function openCart() {
  $('drawer').classList.add('open');
  $('drawerOverlay').classList.add('open');
  $('drawer').setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-on');
}
function closeCart() {
  $('drawer').classList.remove('open');
  $('drawerOverlay').classList.remove('open');
  $('drawer').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('drawer-on');
}

function renderBag() {
  const L = lines(), count = L.reduce((s, l) => s + l.qty, 0), sub = subtotalOf();
  $('cc').textContent = count;
  $('bagCount').textContent = count ? '(' + count + ')' : '';

  $('bagItems').innerHTML = L.length ? L.map(({ p, qty }) => `
    <div class="b-row">
      <div class="b-thumb" style="--c1:${p.c1};--c2:${p.c2}">
        ${p.image ? `<img src="${p.image}" alt="" onerror="this.remove()">` : ''}<span>${p.emoji}</span>
      </div>
      <div>
        <h4>${p.name}</h4>
        <p class="b-price">${inr(salePrice(p))}${offOf(p) ? `<s>${inr(p.price)}</s>` : ''}</p>
        <div class="qty">
          <button data-minus="${p.id}" aria-label="Decrease quantity">−</button>
          <span>${qty}</span>
          <button data-plus="${p.id}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="b-side">
        <b>${inr(salePrice(p) * qty)}</b>
        <button class="b-del" data-del="${p.id}">Remove</button>
      </div>
    </div>`).join('')
    : '<div class="bag-empty"><div>🛍️</div><p>Your cart is empty</p><button class="btn gold" id="keepShop">Continue shopping</button></div>';

  $('bagFoot').style.display = L.length ? '' : 'none';
  $('ship').style.display = L.length ? '' : 'none';

  const disc = coupon && L.length ? coupon.discount : 0;
  const ship = !sub || sub >= FREE_AT ? 0 : DELIVERY;
  $('shipText').textContent = sub >= FREE_AT ? '🎉 You have unlocked free delivery' : 'Add ' + inr(FREE_AT - sub) + ' more for free delivery';
  $('shipFill').style.width = Math.min(100, sub / FREE_AT * 100) + '%';
  $('sSub').textContent = inr(sub);
  $('sDiscRow').classList.toggle('hide', !disc);
  $('sDiscLabel').textContent = coupon ? 'Coupon ' + coupon.code : 'Discount';
  $('sDisc').textContent = '− ' + inr(disc);
  $('sShip').textContent = ship ? inr(ship) : 'Free';
  $('sTotal').textContent = inr(sub - disc + ship);
}

// coupon ka hisaab server se aata hai, browser khud kuch tay nahi karta
async function applyCoupon(code) {
  try {
    const r = await fetch(API + '/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, items: bag.map(b => ({ id: b.id, qty: b.qty })) })
    });
    const d = await r.json();
    if (!r.ok) { coupon = null; setCpMsg(d.error || 'Invalid coupon', true); }
    else { coupon = { code: d.code, discount: d.discount }; setCpMsg(d.code + ' applied. You save ' + inr(d.discount), false); }
  } catch (e) {
    setCpMsg('Cannot reach the server', true);
  }
  renderBag();
}

function bagChanged() {
  saveBag();
  renderBag();
  if (!bag.length) { coupon = null; setCpMsg('', false); return; }
  if (coupon) applyCoupon(coupon.code);     // cart badla to coupon dobara check karo
}

function addToBag(id) {
  const b = bag.find(x => x.id === id);
  if (b) b.qty = Math.min(10, b.qty + 1); else bag.push({ id, qty: 1 });
  bagChanged();
  $('cc').classList.remove('bump'); void $('cc').offsetWidth; $('cc').classList.add('bump');
  openCart();
}

$('bagItems').addEventListener('click', e => {
  const m = e.target.dataset.minus, p = e.target.dataset.plus, d = e.target.dataset.del;
  if (m) {
    const b = bag.find(x => x.id === +m);
    if (b) { b.qty--; if (b.qty < 1) bag = bag.filter(x => x !== b); bagChanged(); }
  }
  if (p) {
    const b = bag.find(x => x.id === +p);
    if (b && b.qty < 10) { b.qty++; bagChanged(); }
  }
  if (d) { bag = bag.filter(x => x.id !== +d); bagChanged(); }
  if (e.target.id === 'keepShop') { closeCart(); $('shop').scrollIntoView(); }
});

$('cpBtn').onclick = () => {
  const code = $('cpIn').value.trim().toUpperCase();
  if (!code) return setCpMsg('Enter a coupon code', true);
  if (!bag.length) return setCpMsg('Add something to your cart first', true);
  applyCoupon(code);
};
$('cpIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('cpBtn').click(); });

$('drawerClose').onclick = closeCart;
$('drawerOverlay').onclick = closeCart;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

$('checkoutBtn').onclick = () => {
  if (!user) { closeCart(); openAuth('login'); toast('Please log in to checkout'); return; }
  openCheckout();
};

renderBag();
/* ---------- checkout + orders ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const orderNo = id => 'VLR' + String(id).padStart(5, '0');
const fmtDate = s => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() });
const coErr = m => { $('coErr').textContent = m; };

function showModal(id) { const m = $(id); m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); }
function hideModal(id) { const m = $(id); m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }

function totals() {
  const sub = subtotalOf(), disc = coupon ? coupon.discount : 0;
  const ship = !sub || sub >= FREE_AT ? 0 : DELIVERY;
  return { sub, disc, ship, total: sub - disc + ship };
}

function openCheckout() {
  const L = lines();
  if (!L.length) return;
  const t = totals();
  $('coSum').innerHTML = '<h4>Order summary</h4>' +
    L.map(({ p, qty }) => `<div class="co-line"><span>${esc(p.name)} × ${qty}</span><b>${inr(salePrice(p) * qty)}</b></div>`).join('') +
    `<div class="co-line"><span>Subtotal</span><b>${inr(t.sub)}</b></div>` +
    (t.disc ? `<div class="co-line ok"><span>Coupon ${esc(coupon.code)}</span><b>− ${inr(t.disc)}</b></div>` : '') +
    `<div class="co-line"><span>Delivery</span><b>${t.ship ? inr(t.ship) : 'Free'}</b></div>` +
    `<div class="co-line total"><span>Total</span><b>${inr(t.total)}</b></div>`;
  if (!$('coName').value && user) $('coName').value = user.name;
  coErr('');
  $('coMain').hidden = false; $('coSum').hidden = false; $('coDone').hidden = true;
  closeCart();
  showModal('coModal');
}

$('coForm').addEventListener('submit', async e => {
  e.preventDefault();
  const shipping = {
    name: $('coName').value, phone: $('coPhone').value.trim(), address: $('coAddr').value,
    city: $('coCity').value, state: $('coState').value, pincode: $('coPin').value.trim()
  };
  // jaldi wali checking (server dobara check karta hai)
  if (shipping.name.trim().length < 2) return coErr('Please enter your name');
  if (!/^[6-9]\d{9}$/.test(shipping.phone)) return coErr('Enter a valid 10-digit mobile number');
  if (!/^[1-9]\d{5}$/.test(shipping.pincode)) return coErr('Enter a valid 6-digit pincode');
  if (shipping.address.trim().length < 6) return coErr('Please enter your full address');
  if (shipping.city.trim().length < 2 || shipping.state.trim().length < 2) return coErr('Please enter city and state');

  $('coSubmit').disabled = true; coErr('');
  try {
    const res = await fetch(API + '/orders', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        items: bag.map(b => ({ id: b.id, qty: b.qty })),
        coupon: coupon ? coupon.code : null,
        shipping, payment: 'COD'
      })
    });
    const data = await res.json();
    if (res.status === 401) {
      hideModal('coModal'); user = null; showUser(); openAuth('login');
      return toast('Please log in again');
    }
    if (!res.ok) return coErr(data.error || 'Could not place the order');

    bag = []; coupon = null; saveBag(); setCpMsg('', false); renderBag();
    showDone(data);
  } catch (err) {
    coErr('Cannot reach the server. Is the backend running?');
  } finally {
    $('coSubmit').disabled = false;
  }
});

function showDone(o) {
  $('coMain').hidden = true; $('coSum').hidden = true; $('coDone').hidden = false;
  $('coDone').innerHTML =
    `<div class="ok-badge">✓</div><h3>Thank you!</h3>
     <p>Your order <b>${orderNo(o.id)}</b> is placed.</p>
     <p class="muted">Please keep ${inr(o.total)} ready to pay in cash on delivery.</p>
     <div class="co-btns">
       <button class="btn gold" id="doneOrders">View my orders</button>
       <button class="btn plain" id="doneShop">Continue shopping</button>
     </div>`;
  $('doneOrders').onclick = () => { hideModal('coModal'); openOrders(); };
  $('doneShop').onclick = () => { hideModal('coModal'); $('shop').scrollIntoView(); };
}

async function openOrders() {
  $('ordList').innerHTML = '<p class="muted">Loading…</p>';
  showModal('ordModal');
  try {
    const res = await fetch(API + '/orders', { headers: authHeaders() });
    if (res.status === 401) { hideModal('ordModal'); user = null; showUser(); return openAuth('login'); }
    const list = await res.json();
    $('ordList').innerHTML = list.length ? list.map(o => `
      <div class="o-card">
        <div class="o-top"><b>${orderNo(o.id)}</b><span class="st st-${esc(o.status)}">${esc(o.status)}</span></div>
        <p class="muted">${fmtDate(o.created_at)} · ${esc(o.payment)}</p>
        <ul>${o.items.map(i => `<li><span>${esc(i.name)} × ${i.qty}${o.status === 'Delivered' ? ` <button type="button" class="rv-btn" data-rv="${i.product_id}" data-name="${esc(i.name)}">Rate and review</button>` : ''}</span><span>${inr(i.price * i.qty)}</span></li>`).join('')}</ul>
        <div class="o-bot"><span>Deliver to ${esc(o.name)}, ${esc(o.city)} ${esc(o.pincode)}</span><b>${inr(o.total)}</b></div>
      </div>`).join('')
      : '<p class="muted">No orders yet. Your first order will show up here.</p>';
  } catch (e) {
    $('ordList').innerHTML = '<p class="muted">Could not load orders. Is the backend running?</p>';
  }
}

$('logoutBtn').onclick = () => {
  user = null;
  try { localStorage.removeItem('vlr_token'); } catch (e) {}
  showUser(); hideModal('ordModal'); toast('Logged out');
};

$('coClose').onclick = () => hideModal('coModal');
$('ordClose').onclick = () => hideModal('ordModal');
['coModal', 'ordModal'].forEach(id => $(id).addEventListener('click', e => { if (e.target === $(id)) hideModal(id); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { hideModal('coModal'); hideModal('ordModal'); } });
/* ---------- product page se aaya "Cart" link: #cart ho to cart kholo ---------- */
if (location.hash === '#cart') {
  openCart();                                              // products load hote hi cart bhar jayega
  history.replaceState(null, '', location.pathname + location.search);   // refresh pe dobara na khule
}