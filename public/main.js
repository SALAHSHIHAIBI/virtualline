(() => {
  const API = 'https://api.virtualine.co.uk/contact';   // Cloudflare Worker, see src/worker.js
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Old one-page links (virtualine.co.uk/#contact etc.) go to their new pages
  const OLD = { '#services': '/services/', '#work': '/work/', '#process': '/process/', '#faq': '/faq/', '#contact': '/contact/' };
  if ((location.pathname === '/' || location.pathname === '/index.html') && OLD[location.hash]) { location.replace(OLD[location.hash]); return; }

  // ---------- smooth, weighted scroll ----------
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const scrollTo = (y) => lenis ? lenis.scrollTo(y, { duration: 1.2 }) : window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    scrollTo(t.getBoundingClientRect().top + window.scrollY);
  });

  // ---------- nav ----------
  const nav = $('.gnav');
  const toggle = $('.gnav__toggle');
  const menu = $('#menu');
  const solid = () => nav && nav.classList.toggle('is-solid', window.scrollY > 40);
  solid(); addEventListener('scroll', solid, { passive: true });
  if (toggle && menu) {
    const set = (open) => {
      menu.classList.toggle('open', open); nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (lenis) open ? lenis.stop() : lenis.start();
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', () => set(!menu.classList.contains('open')));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  // progress of an element through the viewport while it is pinned (0..1)
  const pinProgress = (el) => {
    const r = el.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
  };
  const onFrame = (fn) => { let q = false; const run = () => { q = false; fn(); }; const req = () => { if (!q) { q = true; requestAnimationFrame(run); } }; addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); req(); };

  // ---------- hero: image sinks slower than the page, copy lifts away ----------
  const hero = $('[data-hero]');
  if (hero && !reduce && window.gsap && window.ScrollTrigger) {
    gsap.to(hero.querySelector('.hero__media'), { yPercent: 18, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to(hero.querySelector('.hero__copy'), { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '35% top', end: 'bottom top', scrub: true } });
  }

  // ---------- statement: words light up as you read ----------
  $$('[data-reveal-words]').forEach((sec) => {
    const words = $$('.statement__text span', sec);
    if (reduce) { words.forEach((w) => w.classList.add('on')); return; }
    onFrame(() => {
      const r = sec.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height * 0.9)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    });
  });

  // ---------- walk: pinned scene stepping through machines ----------
  $$('[data-walk]').forEach((sec) => {
    const imgs = $$('.walk__img', sec), steps = $$('.walk__step', sec), ticks = $$('.walk__tick', sec);
    const num = $('.walk__num', sec), bar = $('.walk__bar span', sec);
    const n = steps.length; let cur = -1;
    const show = (i) => {
      if (i === cur) return; cur = i;
      [imgs, steps, ticks].forEach((list) => list.forEach((el, k) => el.classList.toggle('is-on', k === i)));
      num.textContent = String(i + 1).padStart(2, '0');
      // warm the next image so the swap never flashes
      const next = imgs[i + 1]; if (next) next.loading = 'eager';
    };
    onFrame(() => {
      const p = pinProgress(sec);
      bar.style.transform = `scaleX(${p})`;
      show(Math.min(n - 1, Math.floor(p * n)));
    });
    ticks.forEach((t, i) => t.addEventListener('click', () => {
      const r = sec.getBoundingClientRect();
      const total = r.height - innerHeight;
      scrollTo(window.scrollY + r.top + total * ((i + 0.5) / n));
    }));
  });

  // ---------- live HMI: a small line model you can stop and start ----------
  $$('[data-hmi]').forEach((root) => {
    const tiles = $$('.hmi__m', root), N = tiles.length, CAP = 4;
    const k = (name) => $(`[data-k="${name}"]`, root);
    const clock = $('.hmi__clock', root), mode = $('[data-mode]', root), foot = $('.hmi__foot', root);
    const LABEL = { running: 'Running', stopped: 'Stopped', blocked: 'Blocked', starved: 'Waiting' };
    let run, buf, count, hist, ticks, upTicks, timer = null;
    const reset = () => {
      run = Array(N).fill(true); buf = Array(N - 1).fill(2); count = Array(N).fill(0);
      hist = []; ticks = 0; upTicks = 0;
      tiles.forEach((t) => t.setAttribute('aria-pressed', 'false'));
      draw(Array(N).fill('running'));
    };
    const step = () => {
      const state = Array(N).fill('running');
      let made = 0;
      for (let i = N - 1; i >= 0; i--) {
        if (!run[i]) { state[i] = 'stopped'; continue; }
        if (i > 0 && buf[i - 1] <= 0) { state[i] = 'starved'; continue; }
        if (i < N - 1 && buf[i] >= CAP) { state[i] = 'blocked'; continue; }
        if (i > 0) buf[i - 1]--;
        if (i < N - 1) buf[i]++;
        count[i]++;
        if (i === N - 1) made++;
      }
      // the erector never runs dry: blanks are always available
      ticks++; if (state.every((s) => s === 'running')) upTicks++;
      hist.push(made); if (hist.length > 30) hist.shift();
      draw(state);
    };
    const draw = (state) => {
      tiles.forEach((t, i) => {
        t.dataset.s = state[i];
        $('.hmi__state', t).textContent = LABEL[state[i]];
        $('.hmi__count', t).textContent = count[i];
        t.setAttribute('aria-label', `${$('.hmi__name', t).textContent}: ${LABEL[state[i]]}, ${count[i]} cases. Press to ${run[i] ? 'stop' : 'start'}.`);
      });
      // one tick = 0.8 s of line time
      const rate = hist.length ? hist.reduce((a, b) => a + b, 0) / hist.length * 75 : 0;
      const oee = ticks ? (upTicks / ticks) * 100 : 100;
      k('rate').textContent = rate.toFixed(1);
      k('ratebar').style.width = Math.min(100, rate / 80 * 100) + '%';
      k('oee').textContent = oee.toFixed(1) + ' %';
      k('oeebar').style.width = oee + '%';
      k('cases').textContent = count[N - 1];
      k('pallets').textContent = Math.floor(count[N - 1] / 24);
      const down = run.map((r, i) => r ? null : $('.hmi__name', tiles[i]).textContent).filter(Boolean);
      const fault = down.length > 0;
      k('alarm').textContent = fault ? `Alarm: ${down.join(', ')} stopped by operator. Line is backing up.` : 'No active alarms · All guards closed · Air 6.1 bar';
      k('alarm').classList.toggle('is-fault', fault); foot.classList.toggle('is-fault', fault);
      mode.textContent = fault ? 'FAULT' : 'AUTO RUN'; mode.classList.toggle('is-fault', fault);
    };
    const tickClock = () => { clock.textContent = new Date().toLocaleTimeString('en-GB'); };
    tiles.forEach((t, i) => t.addEventListener('click', () => {
      run[i] = !run[i]; t.setAttribute('aria-pressed', String(!run[i])); step();
    }));
    $('[data-reset]', root).addEventListener('click', reset);
    reset(); tickClock();
    // run only while on screen
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !timer) timer = setInterval(() => { step(); tickClock(); }, 800);
      else if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; }
    }).observe(root);
  });

  // ---------- hotspots ----------
  $$('.spots').forEach((sec) => {
    const card = $('.spots__card', sec), spots = $$('.spot', sec);
    spots.forEach((b) => b.addEventListener('click', () => {
      const tpl = $(`template[data-spot="${b.dataset.s}"]`, sec);
      spots.forEach((s) => { s.classList.toggle('is-on', s === b); s.setAttribute('aria-expanded', String(s === b)); });
      card.replaceChildren(tpl.content.cloneNode(true));
      card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    }));
  });

  // ---------- numbers count up once ----------
  if (!reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      const el = e.target, end = Number(el.dataset.count), suf = el.dataset.suffix || '', t0 = performance.now();
      const f = (t) => { const p = Math.min(1, (t - t0) / 1400), v = 1 - Math.pow(1 - p, 4); el.textContent = Math.round(end * v) + suf; if (p < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }), { threshold: 0.6 });
    $$('[data-count]').forEach((el) => io.observe(el));
  }

  // ---------- contact form ----------
  const form = $('#contact-form');
  if (!form) return;
  const status = $('.form__status', form), btn = $('button[type=submit]', form);
  form.elements.t.value = String(Date.now());
  const setStatus = (msg, cls) => { status.textContent = msg; status.className = 'form__status ' + (cls || ''); };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let firstBad = null;
    ['name', 'email', 'message'].forEach((n) => {
      const el = form.elements[n];
      const bad = !el.value.trim() || (n === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.classList.toggle('invalid', bad); el.setAttribute('aria-invalid', String(bad));
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
