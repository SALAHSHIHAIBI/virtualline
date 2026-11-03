(() => {
  // Contact form endpoint: Cloudflare Worker (see src/worker.js)
  const API = 'https://api.virtualline.co.uk/contact';

  // mobile menu
  const toggle = document.querySelector('.nav__toggle');
  const links = document.querySelector('.nav__links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  // year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // reveal on scroll
  const els = document.querySelectorAll('.section h2, .card, .service, .feat, .gallery figure, .process li, .feature, .faq details, .band__inner > *');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => { el.classList.add('reveal'); io.observe(el); });
  }

  // contact form
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
      if (bad && !firstBad) firstBad = el;
    });
    if (firstBad) { setStatus('Please fill in your name, a valid email and a message.', 'err'); firstBad.focus(); return; }

    btn.disabled = true; btn.textContent = 'Sending…'; setStatus('');
    try {
      const data = Object.fromEntries(new FormData(form));
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || 'Something went wrong.');
      const to = data.topic === 'tech' ? 'our technical team' : 'our sales team';
      form.classList.add('sent');
      form.innerHTML = '<div class="sent__icon" aria-hidden="true"></div><h3>Thanks, message sent.</h3><p>It\'s with ' + to + '. We\'ll reply to you within one working day.</p>';
    } catch (err) {
      setStatus(err.message + ' You can also email sales@virtualline.co.uk directly.', 'err');
      btn.disabled = false; btn.textContent = 'Send message';
    }
  });
})();
