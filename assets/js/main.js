/* PROTEUS website option 8 · page behaviour: nav, film player, lazy looping clips with pause controls,
   readout typing, reveals. No tracking, no third-party requests. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = document.querySelector('[data-nav]');
  const toggle = document.querySelector('[data-menu-toggle]');

  // nav state
  const onScroll = () => nav && nav.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // mobile menu
  if (toggle && nav) {
    const close = () => { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', () => {
      const open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('.nav__links a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  // play / pause helpers
  const setState = (btn, paused) => {
    if (!btn) return;
    btn.classList.toggle('is-paused', paused);
    btn.setAttribute('aria-label', paused ? 'Play video' : 'Pause video');
  };
  const tryPlay = v => { const p = v.play(); if (p && p.catch) p.catch(() => {}); return p; };

  // hero
  const hero = document.querySelector('[data-hero]');
  const heroBtn = document.querySelector('[data-toggle-for="hero"]');
  if (hero) {
    if (reduce) { hero.removeAttribute('autoplay'); hero.pause(); setState(heroBtn, true); }
    else { setState(heroBtn, false); }
    heroBtn && heroBtn.addEventListener('click', () => {
      if (hero.paused) { hero.dataset.userPaused = ''; tryPlay(hero); setState(heroBtn, false); }
      else { hero.dataset.userPaused = '1'; hero.pause(); setState(heroBtn, true); }
    });
  }

  // lazy clips: load near the viewport, play while visible, pause when not
  const clips = Array.from(document.querySelectorAll('video[data-src]'));
  const load = v => { if (!v.getAttribute('src')) { v.src = v.dataset.src; v.load(); } };
  const btnOf = v => v.parentElement && v.parentElement.querySelector('.media-toggle');
  clips.forEach(v => {
    const b = btnOf(v);
    setState(b, true);
    b && b.addEventListener('click', () => {
      load(v);
      if (v.paused) { v.dataset.userPaused = ''; tryPlay(v); setState(b, false); }
      else { v.dataset.userPaused = '1'; v.pause(); setState(b, true); }
    });
    v.addEventListener('play', () => setState(btnOf(v), false));
    v.addEventListener('pause', () => setState(btnOf(v), true));
  });

  // film: plays with sound on request; background clips pause meanwhile
  const filmWrap = document.querySelector('.film');
  const dlg = document.getElementById('film-dialog');
  const film = document.querySelector('[data-film]');
  let filmOn = false;
  if (film && filmWrap) {
    film.controls = false; // native controls appear once the film is started
    const start = () => {
      filmWrap.classList.add('is-playing');
      film.controls = true;
      film.muted = false;
      const p = tryPlay(film);
      film.focus({ preventScroll: true });
      return p;
    };
    const playBtn = document.querySelector('[data-film-play]');
    playBtn && playBtn.addEventListener('click', start);
    document.querySelectorAll('[data-play-film]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      if (dlg && typeof dlg.showModal === 'function' && !dlg.open) dlg.showModal();
      start();
    }));
    film.addEventListener('play', () => {
      filmOn = true;
      film.controls = true;
      filmWrap.classList.add('is-playing');
      if (hero && !hero.paused) hero.pause();
      clips.forEach(v => { if (!v.paused) v.pause(); });
    });
    const off = () => { filmOn = false; };
    if (dlg) {
      const closeBtn = dlg.querySelector('[data-film-close]');
      closeBtn && closeBtn.addEventListener('click', () => dlg.close());
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', () => { film.pause(); filmWrap.classList.remove('is-playing'); });
    }
    film.addEventListener('pause', off);
    film.addEventListener('ended', off);
  }

  // autoplay policy: a muted loop plays only while at least half of it is on screen and the tab is visible;
  // it pauses when scrolled away and resumes on return. Data saver or 2G: posters only, play on tap.
  const conn = navigator.connection || {};
  const lean = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  const inView = new Set();
  const canAuto = v => !reduce && !lean && !filmOn && !v.dataset.userPaused && !document.hidden;
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting && !lean) { load(e.target); near.unobserve(e.target); } }), { rootMargin: '300px 0px' });
    const seen = new IntersectionObserver(entries => entries.forEach(e => {
      const v = e.target;
      if (e.intersectionRatio >= 0.5) { inView.add(v); if (canAuto(v)) { load(v); tryPlay(v); } }
      else { inView.delete(v); if (!v.paused) v.pause(); }
    }), { threshold: [0, 0.5, 1] });
    clips.forEach(v => { near.observe(v); seen.observe(v); });
    if (hero) {
      if (lean) { hero.removeAttribute('autoplay'); hero.pause(); setState(heroBtn, true); }
      const heroSeen = new IntersectionObserver(entries => entries.forEach(e => {
        if (e.intersectionRatio >= 0.5) { inView.add(hero); if (canAuto(hero)) tryPlay(hero); }
        else { inView.delete(hero); if (!hero.paused) hero.pause(); }
      }), { threshold: [0, 0.5, 1] });
      heroSeen.observe(hero);
    }
    if (film && filmWrap) {
      // the film (with sound) stops once mostly scrolled away; it does not restart by itself
      new IntersectionObserver(entries => entries.forEach(e => {
        if (e.intersectionRatio < 0.25 && !film.paused) film.pause();
      }), { threshold: [0, 0.25] }).observe(filmWrap);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { [hero, ...clips].forEach(v => v && !v.paused && v.pause()); if (film && !film.paused) film.pause(); }
      else inView.forEach(v => { if (canAuto(v)) tryPlay(v); });
    });
  } else {
    clips.forEach(load);
  }

  // readout: types itself once when it comes into view
  const readout = document.querySelector('[data-type]');
  if (readout && !reduce && 'IntersectionObserver' in window) {
    const full = readout.dataset.type;
    readout.textContent = '';
    readout.classList.add('is-typing');
    const typer = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      typer.disconnect();
      let i = 0;
      const step = () => {
        i += 1;
        readout.textContent = full.slice(0, i);
        if (i < full.length) setTimeout(step, full[i - 1] === ' ' ? 90 : 55);
        else setTimeout(() => readout.classList.remove('is-typing'), 1600);
      };
      setTimeout(step, 450);
    }), { threshold: 0.6 });
    typer.observe(readout);
  }

  // reveals
  const items = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) { items.forEach(i => i.classList.add('is-in')); return; }
  const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach(i => io.observe(i));
})();

// founders video: pauses when scrolled out of view, resumes when back, only if the viewer had started it
(() => {
  const v = document.querySelector('.founders__video');
  if (!v || !('IntersectionObserver' in window)) return;
  let resume = false, seen = false;
  const play = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  new IntersectionObserver(entries => entries.forEach(e => {
    seen = e.intersectionRatio >= 0.5;
    if (!seen) { if (!v.paused) { resume = true; v.pause(); } }
    else if (resume && !document.hidden) { resume = false; play(); }
  }), { threshold: [0, 0.5, 1] }).observe(v);
  v.addEventListener('play', () => { resume = false; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (!v.paused) { resume = true; v.pause(); } }
    else if (resume && seen) { resume = false; play(); }
  });
})();

// shape-shifter: six identical modules redrawn as a walker, a chain or a braced arm.
// Each module moves as a rigid strut (centre, angle, length), so a change of body reads as modules re-docking.
(() => {
  const fig = document.querySelector('[data-morph]');
  if (!fig) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const gS = fig.querySelector('[data-struts]');
  const gH = fig.querySelector('[data-heads]');
  const tabs = Array.from(fig.querySelectorAll('[data-shape]'));
  const envs = Array.from(fig.querySelectorAll('[data-env]'));
  const cap = fig.querySelector('.morph__caption');
  const captions = [
    'Walks over rubble and steps with a sensor on board.',
    'Turns into a chain and slips under a low slab.',
    'Braces between floor and ceiling and presses a sensor onto a cracked wall.'
  ];
  // [x1, y1, x2, y2] per module; module i keeps its identity across shapes
  const shapes = [
    [[230,124,196,218],[230,124,264,218],[230,124,330,124],[330,124,430,124],[430,124,396,218],[430,124,487,206]],
    [[40,218,140,218],[140,218,240,218],[240,218,340,218],[340,218,440,218],[440,218,540,218],[540,218,640,218]],
    [[180,218,230,131.4],[180,218,280,218],[230,131.4,230,31.4],[280,218,230,131.4],[230,131.4,330,131.4],[330,131.4,430,131.4]]
  ];
  const pose = m => ({ cx: (m[0] + m[2]) / 2, cy: (m[1] + m[3]) / 2, a: Math.atan2(m[3] - m[1], m[2] - m[0]), l: Math.hypot(m[2] - m[0], m[3] - m[1]) });
  const poses = shapes.map(s => s.map(pose));
  const el = (n, attrs) => { const e = document.createElementNS(NS, n); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const oct = r => { let d = ''; for (let k = 0; k < 8; k++) { const t = Math.PI / 8 + k * Math.PI / 4; d += (k ? 'L' : 'M') + (r * Math.cos(t)).toFixed(2) + ' ' + (r * Math.sin(t)).toFixed(2); } return d + 'Z'; };
  const struts = [], heads = [];
  for (let i = 0; i < 6; i++) {
    const o = el('line', { class: 'morph__strut' }), h = el('line', { class: 'morph__strut-hi' });
    gS.append(o, h); struts.push([o, h]);
    for (let k = 0; k < 2; k++) {
      const g = el('g', { class: 'morph__head' });
      g.append(el('path', { d: oct(13.5) }), el('path', { class: 'morph__face', d: oct(6) }));
      gH.append(g); heads.push(g);
    }
  }
  const f = n => n.toFixed(1);
  const draw = P => P.forEach((p, i) => {
    const dx = Math.cos(p.a) * p.l / 2, dy = Math.sin(p.a) * p.l / 2;
    const x1 = p.cx - dx, y1 = p.cy - dy, x2 = p.cx + dx, y2 = p.cy + dy;
    struts[i].forEach(l => { l.setAttribute('x1', f(x1)); l.setAttribute('y1', f(y1)); l.setAttribute('x2', f(x2)); l.setAttribute('y2', f(y2)); });
    const deg = f(p.a * 180 / Math.PI);
    heads[2 * i].setAttribute('transform', `translate(${f(x1)} ${f(y1)}) rotate(${deg})`);
    heads[2 * i + 1].setAttribute('transform', `translate(${f(x2)} ${f(y2)}) rotate(${deg})`);
  });
  // struts are symmetric, so the shortest turn is taken modulo 180 degrees
  const turn = (a, b) => { let d = (b - a) % Math.PI; if (d > Math.PI / 2) d -= Math.PI; if (d < -Math.PI / 2) d += Math.PI; return d; };
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let cur = poses[0].map(p => ({ ...p })), target = 0, raf = 0;
  draw(cur);
  const animateTo = P => {
    cancelAnimationFrame(raf);
    if (reduce) { cur = P.map(p => ({ ...p })); draw(cur); return; }
    const from = cur.map(p => ({ ...p }));
    const plan = from.map((p, i) => {
      const q = P[i], dist = Math.hypot(q.cx - p.cx, q.cy - p.cy);
      return { da: turn(p.a, q.a), lift: Math.min(34, 8 + dist * 0.16), delay: i * 0.05 };
    });
    const dur = 1150, t0 = performance.now();
    const step = now => {
      const T = Math.min(1, (now - t0) / dur);
      cur = from.map((p, i) => {
        const q = P[i], k = plan[i];
        const t = ease(Math.min(1, Math.max(0, (T - k.delay) / (1 - 0.25))));
        return { cx: p.cx + (q.cx - p.cx) * t, cy: p.cy + (q.cy - p.cy) * t - Math.sin(Math.PI * t) * k.lift, a: p.a + k.da * t, l: p.l + (q.l - p.l) * t };
      });
      draw(cur);
      if (T < 1) raf = requestAnimationFrame(step);
      else { cur = P.map(p => ({ ...p })); draw(cur); }
    };
    raf = requestAnimationFrame(step);
  };
  const CYCLE = 4600;
  fig.style.setProperty('--cycle', CYCLE + 'ms');
  let auto = !reduce, visible = false, timer = 0;
  const select = (k, byUser) => {
    if (byUser) stop();
    if (k === target) return;
    target = k;
    tabs.forEach((b, i) => b.setAttribute('aria-pressed', String(i === k)));
    envs.forEach(e => e.classList.toggle('is-on', Number(e.dataset.env) === k));
    if (cap) { cap.setAttribute('aria-live', byUser ? 'polite' : 'off'); cap.textContent = captions[k]; }
    animateTo(poses[k]);
  };
  const run = () => {
    clearTimeout(timer);
    const on = auto && visible && !document.hidden;
    fig.classList.toggle('is-cycling', on);
    if (on) timer = setTimeout(() => { select((target + 1) % 3, false); run(); }, CYCLE);
  };
  function stop() { auto = false; clearTimeout(timer); fig.classList.remove('is-cycling'); }
  tabs.forEach((b, i) => b.addEventListener('click', () => select(i, true)));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => entries.forEach(e => {
      const was = visible; visible = e.intersectionRatio >= 0.35;
      if (visible !== was) run();
    }), { threshold: [0, 0.35, 1] }).observe(fig);
  }
  document.addEventListener('visibilitychange', run);
})();

// nav: mark the section in view
(() => {
  const links = Array.from(document.querySelectorAll('.nav__links a[href^="#"]'));
  const pairs = links.map(a => [a, document.getElementById(a.getAttribute('href').slice(1))]).filter(p => p[1]);
  if (!pairs.length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const line = window.innerHeight * 0.4;
    let active = null;
    pairs.forEach(([a, s]) => { const r = s.getBoundingClientRect(); if (r.top <= line && r.bottom > line) active = a; });
    pairs.forEach(([a]) => a.classList.toggle('is-active', a === active));
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
