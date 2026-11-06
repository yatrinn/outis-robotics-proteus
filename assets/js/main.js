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
