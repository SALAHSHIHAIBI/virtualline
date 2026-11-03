(() => {
  const API = 'https://api.virtualine.co.uk/contact';   // Cloudflare Worker, see src/worker.js
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const gbp = (n) => '£' + Math.round(n).toLocaleString('en-GB');

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
    scrollTo(t.getBoundingClientRect().top + window.scrollY - 70);
  });

  // ---------- nav ----------
  const nav = $('.gnav'), toggle = $('.gnav__toggle'), menu = $('#menu');
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

  // ---------- background videos: pause button, reduced motion, off-screen pause ----------
  const bgVideos = $$('video[autoplay]');
  if (reduce) bgVideos.forEach((v) => { v.removeAttribute('autoplay'); v.pause(); });
  const vio = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target; if (reduce || v.dataset.userPaused) return;
    if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
  }), { threshold: 0.1 });
  bgVideos.forEach((v) => vio.observe(v));
  $$('[data-pause]').forEach((b) => {
    const v = b.closest('.hero').querySelector('video');
    const sync = () => { const p = v.paused; b.classList.toggle('is-paused', p); b.setAttribute('aria-label', p ? 'Play background video' : 'Pause background video'); };
    b.addEventListener('click', () => { if (v.paused) { delete v.dataset.userPaused; v.play(); } else { v.dataset.userPaused = '1'; v.pause(); } sync(); });
    v.addEventListener('play', sync); v.addEventListener('pause', sync); sync();
  });

  // hero copy lifts away as you leave it
  const hero = $('[data-hero]');
  if (hero && !reduce && window.gsap && window.ScrollTrigger) {
    gsap.to(hero.querySelector('.hero__media'), { yPercent: 14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to(hero.querySelector('.hero__copy'), { y: -70, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '40% top', end: 'bottom top', scrub: true } });
  }

  // ---------- reveal on enter, staggered within each section ----------
  const rio = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); rio.unobserve(e.target);
  }), { rootMargin: '0px 0px -10% 0px' });
  $$('section, .block').forEach((sec) => $$(':scope [data-reveal]', sec).forEach((el, i) => el.style.setProperty('--d', Math.min(i, 5) * 0.08 + 's')));
  $$('[data-reveal]').forEach((el) => reduce ? el.classList.add('in') : rio.observe(el));

  // ---------- savings calculator ----------
  $$('[data-calc]').forEach((root) => {
    const v = (id) => Number($('#' + id, root).value);
    const total = $('[data-total]', root);
    let shown = 0, raf = 0;
    const tween = (to) => {
      cancelAnimationFrame(raf);
      if (reduce) { shown = to; total.textContent = Math.round(to).toLocaleString('en-GB'); return; }
      const from = shown, t0 = performance.now();
      const step = (t) => { const p = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - p, 3); shown = from + (to - from) * e; total.textContent = Math.round(shown).toLocaleString('en-GB'); if (p < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    };
    const calc = () => {
      $$('input[type=range]', root).forEach((i) => { $(`[data-out="${i.id}"]`, root).textContent = i.dataset.pre + Number(i.value).toLocaleString('en-GB') + i.dataset.unit; });
      const shows = v('c-shows') * v('c-show-cost');
      const train = v('c-ops') * v('c-days') * v('c-hours') * v('c-rate');
      const sum = shows + train, max = Math.max(shows, train, 1);
      $('[data-part="shows"]', root).textContent = gbp(shows);
      $('[data-part="train"]', root).textContent = gbp(train);
      $('[data-bar="shows"]', root).style.width = (shows / max * 100) + '%';
      $('[data-bar="train"]', root).style.width = (train / max * 100) + '%';
      tween(sum);
    };
    root.addEventListener('input', calc);
    // count up the first time it comes into view
    total.textContent = '0';
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { calc(); o.disconnect(); } }, { threshold: 0.3 }).observe(root);
  });

  // ---------- PW-600 wash cycle demo ----------
  $$('[data-wash]').forEach((root) => {
    const durs = JSON.parse(root.dataset.cycle);
    const steps = $$('.wash__steps li', root), names = steps.map((li) => li.lastChild.textContent);
    const w = (k) => $(`[data-w="${k}"]`, root);
    const start = w('start'), stop = w('stop'), foot = $('.wash__foot', root);
    // target values per step: water %, temp °C, pressure bar, drum spinning, jets on
    const T = [[0, 22, 0.4, 0, 0], [92, 45, 1.2, 0, 0], [92, 60, 1.0, 1, 0], [70, 60, 6.2, 1, 1], [8, 52, 0.8, 0, 0], [55, 70, 3.5, 1, 1], [0, 40, 0.4, 0, 0]];
    let i = -1, left = 0, total = 0, timer = null, baskets = 0;
    let state = { lvl: 0, tmp: 18, prs: 0 };
    const ease = (a, b) => a + (b - a) * 0.35;
    const render = () => {
      w('level').textContent = Math.round(state.lvl) + ' %'; w('levelbar').style.width = state.lvl + '%';
      w('temp').textContent = Math.round(state.tmp) + ' °C'; w('tempbar').style.width = (state.tmp / 80 * 100) + '%';
      w('press').textContent = state.prs.toFixed(1) + ' bar'; w('pressbar').style.width = (state.prs / 8 * 100) + '%';
      const h = state.lvl / 100 * 132;
      w('water').setAttribute('y', 146 - h); w('water').setAttribute('height', h);
      const m = Math.floor(total / 60), s = total % 60;
      w('time').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      w('baskets').textContent = baskets;
    };
    const mode = (txt, cls) => { const el = w('mode'); el.textContent = txt; el.className = 'wash__mode ' + (cls || ''); };
    const setStep = (k) => {
      i = k; left = durs[k];
      steps.forEach((li, n) => { li.classList.toggle('is-on', n === k); li.classList.toggle('is-done', n < k); });
      w('stage').textContent = names[k];
      w('drum').classList.toggle('is-spin', !!T[k][3] && !reduce);
      w('jets').classList.toggle('is-on', !!T[k][4] && !reduce);
      w('msg').textContent = `Step ${k + 1} of ${durs.length}: ${names[k]}`;
    };
    const tick = () => {
      total++; left--;
      const tg = T[i];
      state = { lvl: ease(state.lvl, tg[0]), tmp: ease(state.tmp, tg[1]), prs: ease(state.prs, tg[2]) };
      if (left <= 0) {
        if (i < durs.length - 1) setStep(i + 1);
        else { finish(); return; }
      }
      render();
    };
    const finish = () => {
      clearInterval(timer); timer = null; baskets++;
      steps.forEach((li) => { li.classList.remove('is-on'); li.classList.add('is-done'); });
      w('drum').classList.remove('is-spin'); w('jets').classList.remove('is-on');
      w('stage').textContent = 'Cycle complete'; w('msg').textContent = 'Clean basket on the outfeed. Press Start for the next one.';
      mode('DONE', 'is-run'); start.disabled = false; start.textContent = 'Start next basket';
      state = { lvl: 0, tmp: 30, prs: 0 }; render();
    };
    const go = () => {
      if (timer) return;
      foot.classList.remove('is-stop'); total = 0; state = { lvl: 0, tmp: 18, prs: 0 };
      setStep(0); render(); mode('RUNNING', 'is-run'); start.disabled = true;
      timer = setInterval(tick, 1000);
    };
    start.addEventListener('click', go);
    stop.addEventListener('click', () => {
      if (!timer) return;
      clearInterval(timer); timer = null;
      w('drum').classList.remove('is-spin'); w('jets').classList.remove('is-on');
      mode('E-STOP', 'is-stop'); foot.classList.add('is-stop');
      w('stage').textContent = 'Emergency stop';
      w('msg').textContent = `E-stop pressed during ${names[i]}. Pumps off, drum braked. Press Start to reset and run again.`;
      start.disabled = false; start.textContent = 'Reset and start';
    });
    render();
    // start one cycle on its own the first time it scrolls into view, so it is never a blank screen
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { go(); o.disconnect(); } }, { threshold: 0.5 }).observe(root);
  });

  // ---------- HoneyLine line HMI ----------
  $$('[data-hmi]').forEach((root) => {
    const tiles = $$('.hmi__m', root), N = tiles.length, CAP = 4;
    const k = (name) => $(`[data-k="${name}"]`, root);
    const clock = $('.hmi__clock', root), mode = $('[data-mode]', root), foot = $('.hmi__foot', root);
    const LABEL = { running: 'Running', stopped: 'Stopped', blocked: 'Blocked', starved: 'Waiting' };
    let run, buf, count, hist, ticks, upTicks, timer = null;
    const draw = (state) => {
      tiles.forEach((t, i) => {
        t.dataset.s = state[i];
        $('.hmi__state', t).textContent = LABEL[state[i]];
        $('.hmi__count', t).textContent = count[i];
        t.setAttribute('aria-label', `${$('.hmi__name', t).textContent}: ${LABEL[state[i]]}, ${count[i]} cases. Press to ${run[i] ? 'stop' : 'start'}.`);
      });
      const rate = hist.length ? hist.reduce((a, b) => a + b, 0) / hist.length * 75 : 0;
      const oee = ticks ? (upTicks / ticks) * 100 : 100;
      k('rate').textContent = rate.toFixed(1); k('ratebar').style.width = Math.min(100, rate / 80 * 100) + '%';
      k('oee').textContent = oee.toFixed(1) + ' %'; k('oeebar').style.width = oee + '%';
      k('cases').textContent = count[N - 1]; k('pallets').textContent = Math.floor(count[N - 1] / 24);
      const down = run.map((r, i) => r ? null : $('.hmi__name', tiles[i]).textContent).filter(Boolean), fault = down.length > 0;
      k('alarm').textContent = fault ? `Alarm: ${down.join(', ')} stopped by operator. Line is backing up.` : 'No active alarms · All guards closed · Air 6.1 bar';
      k('alarm').classList.toggle('is-fault', fault); foot.classList.toggle('is-fault', fault);
      mode.textContent = fault ? 'FAULT' : 'AUTO RUN'; mode.classList.toggle('is-fault', fault);
    };
    const reset = () => { run = Array(N).fill(true); buf = Array(N - 1).fill(2); count = Array(N).fill(0); hist = []; ticks = 0; upTicks = 0; tiles.forEach((t) => t.setAttribute('aria-pressed', 'false')); draw(Array(N).fill('running')); };
    const step = () => {
      const state = Array(N).fill('running'); let made = 0;
      for (let i = N - 1; i >= 0; i--) {
        if (!run[i]) { state[i] = 'stopped'; continue; }
        if (i > 0 && buf[i - 1] <= 0) { state[i] = 'starved'; continue; }
        if (i < N - 1 && buf[i] >= CAP) { state[i] = 'blocked'; continue; }
        if (i > 0) buf[i - 1]--; if (i < N - 1) buf[i]++;
        count[i]++; if (i === N - 1) made++;
      }
      ticks++; if (state.every((s) => s === 'running')) upTicks++;
      hist.push(made); if (hist.length > 30) hist.shift();
      draw(state);
    };
    tiles.forEach((t, i) => t.addEventListener('click', () => { run[i] = !run[i]; t.setAttribute('aria-pressed', String(!run[i])); step(); }));
    $('[data-reset]', root).addEventListener('click', reset);
    reset(); clock.textContent = new Date().toLocaleTimeString('en-GB');
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !timer) timer = setInterval(() => { step(); clock.textContent = new Date().toLocaleTimeString('en-GB'); }, 800);
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

  // ---------- lightbox for films and stills ----------
  const lb = $('#lightbox');
  const open = (node, cap) => {
    if (!lb || !lb.showModal) return;
    $('.lightbox__body', lb).replaceChildren(node); $('.lightbox__cap', lb).textContent = cap;
    lb.showModal(); if (lenis) lenis.stop();
  };
  if (lb) {
    const close = () => { const v = $('video', lb); if (v) v.pause(); lb.close(); };
    $('.lightbox__close', lb).addEventListener('click', close);
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    lb.addEventListener('close', () => { $('.lightbox__body', lb).replaceChildren(); if (lenis) lenis.start(); });
  }
  $$('.reel').forEach((r) => {
    const v = $('video', r);
    r.addEventListener('mouseenter', () => { if (!reduce) { v.preload = 'auto'; v.play().catch(() => {}); } });
    r.addEventListener('mouseleave', () => v.pause());
    r.addEventListener('click', () => {
      const big = document.createElement('video');
      Object.assign(big, { src: r.dataset.video, controls: true, autoplay: true, playsInline: true, loop: true });
      open(big, r.dataset.caption);
    });
  });
  $$('.shot').forEach((s) => s.addEventListener('click', () => {
    const img = document.createElement('img'); img.src = s.dataset.img; img.alt = s.dataset.caption;
    open(img, s.dataset.caption);
  }));

  // ---------- stills filter ----------
  $$('.filters').forEach((bar) => {
    const grid = $('[data-shots]'), chips = $$('.chip', bar);
    chips.forEach((c) => c.addEventListener('click', () => {
      const f = c.dataset.filter;
      chips.forEach((x) => { x.classList.toggle('is-on', x === c); x.setAttribute('aria-pressed', String(x === c)); });
      $$('.shot', grid).forEach((s) => {
        const show = f === 'all' || s.dataset.cat === f;
        s.classList.toggle('is-hidden', !show);
        s.classList.remove('pop'); if (show && !reduce) { void s.offsetWidth; s.classList.add('pop'); }
      });
    }));
  });

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
