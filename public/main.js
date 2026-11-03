(() => {
  // Contact form endpoint: Cloudflare Worker (see src/worker.js)
  const API = 'https://api.virtualine.co.uk/contact';

  // Old one-page links (virtualine.co.uk/#contact etc.) go to their new pages
  const OLD = { '#services': '/services/', '#work': '/work/', '#process': '/process/', '#faq': '/faq/', '#contact': '/contact/' };
  if ((location.pathname === '/' || location.pathname === '/index.html') && OLD[location.hash]) {
    location.replace(OLD[location.hash]);
    return;
  }

  // Mobile menu
  const toggle = document.querySelector('.gnav__toggle');
  const menu = document.getElementById('menu');
  if (toggle && menu) {
    const set = (open) => {
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', () => set(!menu.classList.contains('open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  // Year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Sideways galleries: arrow buttons scroll one card
  document.querySelectorAll('.rail').forEach((rail) => {
    const ctrl = rail.nextElementSibling;
    if (!ctrl) return;
    ctrl.querySelectorAll('.rbtn').forEach((b) => {
      b.addEventListener('click', () => {
        const item = rail.querySelector('.rail__item');
        const step = item ? item.getBoundingClientRect().width + 20 : rail.clientWidth * 0.8;
        rail.scrollBy({ left: step * Number(b.dataset.dir), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
    });
  });

  // Contact form
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = form.querySelector('.form__status');
  const btn = form.querySelector('button[type=submit]');
  form.elements.t.value = String(Date.now());
  const setStatus = (msg, cls) => { status.textContent = msg; status.className = 'form__status ' + (cls || ''); };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let firstBad = null;
    ['name', 'email', 'message'].forEach((n) => {
      const el = form.elements[n];
      const bad = !el.value.trim() || (n === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.classList.toggle('invalid', bad);
      el.setAttribute('aria-invalid', String(bad));
      if (bad && !firstBad) firstBad = el;
    });
    if (firstBad) { setStatus('Add your name, a valid email and a message.', 'err'); firstBad.focus(); return; }

    btn.disabled = true; btn.textContent = 'Sending…'; setStatus('');
    try {
      const data = Object.fromEntries(new FormData(form));
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || 'The message didn’t send.');
      const to = data.topic === 'tech' ? 'our technical team' : 'our sales team';
      form.classList.add('sent');
      form.innerHTML = '<div class="sent__icon" aria-hidden="true"></div><h3>Message sent.</h3><p>It’s with ' + to + '. We’ll reply within one working day.</p>';
    } catch (err) {
      setStatus(err.message + ' You can also email sales@virtualine.co.uk.', 'err');
      btn.disabled = false; btn.textContent = 'Send message';
    }
  });
})();
