/* ===== VELOURA reviews (script.js aur filters.js ke baad load hota hai) ===== */
(function () {
  const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  let pid = null, stars = 0;
  const err = m => { $('rvErr').textContent = m; };

  function paint(n) {
    document.querySelectorAll('#rvStars button').forEach(b => b.classList.toggle('on', +b.dataset.v <= n));
    $('rvHint').textContent = n ? LABELS[n] : 'Tap a star';
  }
  $('rvStars').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { stars = +b.dataset.v; paint(stars); } });
  $('rvStars').addEventListener('mouseover', e => { const b = e.target.closest('button'); if (b) paint(+b.dataset.v); });
  $('rvStars').addEventListener('mouseleave', () => paint(stars));

  // review ka popup kholna (pehle server se poochte hain ki ye user likh sakta hai ya nahi)
  async function openReview(id, name) {
    if (!user) { toast('Please log in to write a review'); openAuth(); return; }
    let info;
    try {
      const res = await fetch(API + '/reviews/' + id + '/mine', { headers: { Authorization: 'Bearer ' + getToken() } });
      if (res.status === 401) { user = null; showUser(); toast('Please log in again'); openAuth(); return; }
      info = await res.json();
    } catch (e) { toast('Could not open the review box. Please try again.'); return; }

    if (!info.canReview) { toast('You can review a product after it has been delivered to you.'); return; }

    const p = PRODUCTS.find(x => x.id === id);
    pid = id; stars = info.review ? info.review.rating : 0;
    $('rvName').textContent = name || (p ? p.name : '');
    $('rvTitle').value = info.review ? info.review.title : '';
    $('rvText').value = info.review ? info.review.text : '';
    err(''); paint(stars);
    hideModal('ordModal');
    showModal('rvModal');
  }

  async function refreshProducts() {                    // cards pe nayi rating dikhane ke liye
    try { const r = await fetch(API + '/products'); if (r.ok) { PRODUCTS = await r.json(); render(); } } catch (e) {}
  }

  $('rvSubmit').onclick = async () => {
    const text = $('rvText').value.trim();
    if (!stars) return err('Please tap a star rating');
    if (text.length < 10) return err('Please write at least 10 characters');

    $('rvSubmit').disabled = true; err('');
    try {
      const res = await fetch(API + '/reviews/' + pid, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ rating: stars, title: $('rvTitle').value, text })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save your review');
      hideModal('rvModal');
      toast('Thank you for your review!');
      refreshProducts();
    } catch (e) {
      err(e instanceof TypeError ? 'Cannot reach the server. Please try again.' : e.message);
    } finally {
      $('rvSubmit').disabled = false;
    }
  };

  $('ordList').addEventListener('click', e => {
    const b = e.target.closest('[data-rv]');
    if (b) openReview(+b.dataset.rv, b.dataset.name);
  });
  $('rvClose').onclick = () => hideModal('rvModal');
  $('rvModal').addEventListener('click', e => { if (e.target === $('rvModal')) hideModal('rvModal'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideModal('rvModal'); });

  // product page ke "Write a review" link se aaye: /?review=5
  const rid = Number(new URLSearchParams(location.search).get('review'));
  if (Number.isInteger(rid) && rid > 0) {
    history.replaceState(null, '', location.pathname);
    let tries = 0;
    const wait = setInterval(() => {                    // login ki jaanch hone tak thoda ruko
      tries++;
      if (user || !getToken() || tries > 15) { clearInterval(wait); openReview(rid); }
    }, 150);
  }
})();