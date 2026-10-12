(() => {
  'use strict';
  clearTimeout(window.ziciFailsafe);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => reduced.matches;

  /* Split headings into words that rise into place; keeps <em>/<br> intact. */
  let w = 0;
  const splitNode = node => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(document.createTextNode(part)); return; }
          const outer = document.createElement('span'); outer.className = 'word';
          const inner = document.createElement('span'); inner.className = 'word-in'; inner.style.setProperty('--w', String(w++));
          inner.textContent = part; outer.append(inner); frag.append(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') splitNode(child);
    });
  };
  $$('[data-split]').forEach(el => { w = 0; el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim()); splitNode(el); $$('.word', el).forEach(s => s.setAttribute('aria-hidden', 'true')); });

  /* Hero sequence */
  $$('.hero-copy [data-reveal], .page-hero [data-reveal]').forEach((el, i) => { if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', String(i + 2)); });

  /* Scroll reveals */
  const targets = $$('[data-reveal], [data-split]');
  const show = el => el.classList.add('is-in');
  if (still() || !('IntersectionObserver' in window)) targets.forEach(show);
  else {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      show(entry.target); io.unobserve(entry.target);
      entry.target.querySelectorAll?.('[data-count]').forEach(countUp);
      if (entry.target.matches('[data-count]')) countUp(entry.target);
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    requestAnimationFrame(() => requestAnimationFrame(() => targets.forEach(el => io.observe(el))));
  }

  /* Count-up for prices published by the shop */
  const counted = new WeakSet();
  function countUp(el) {
    if (counted.has(el) || still()) return;
    counted.add(el);
    const end = Number(el.dataset.count);
    const money = /đ\s*$/.test(el.textContent);
    const fmt = n => money ? `${Math.round(n).toLocaleString('vi-VN')}đ` : String(Math.round(n));
    const start = performance.now(); const dur = 1100;
    const tick = now => {
      const t = Math.min(1, (now - start) / dur);
      const v = end * (1 - Math.pow(1 - t, 3));
      el.textContent = fmt(t === 1 ? end : (money ? Math.round(v / 1000) * 1000 : v));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  if (!still()) {
    const countIo = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { countUp(e.target); countIo.unobserve(e.target); } }), { threshold: 0.6 });
    $$('[data-count]').forEach(el => countIo.observe(el));
  }

  /* Scroll-linked: parallax photos + process progress line */
  const parallax = $$('[data-parallax]');
  const steps = $$('[data-steps]');
  let ticking = false;
  const frame = () => {
    ticking = false;
    const vh = innerHeight;
    if (!still()) parallax.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      el.style.translate = `0 ${((r.top + r.height / 2 - vh / 2) * Number(el.dataset.parallax)).toFixed(1)}px`;
    });
    steps.forEach(list => {
      const r = list.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (vh * 0.75 - r.top) / (r.height + vh * 0.25)));
      list.querySelector('[data-steps-fill]')?.style.setProperty('--p', still() ? '1' : p.toFixed(3));
      const items = list.querySelectorAll('.step');
      items.forEach((item, i) => item.classList.toggle('is-done', still() || p >= (i + 0.35) / items.length));
    });
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  frame();

  /* Hero photos follow the pointer a little */
  const art = document.querySelector('.hero-art');
  if (art && matchMedia('(hover: hover)').matches) {
    const photos = $$('.hero-photo', art);
    art.closest('.hero').addEventListener('pointermove', e => {
      if (still()) return;
      const r = art.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5; const y = (e.clientY - r.top) / r.height - 0.5;
      photos.forEach((p, i) => { const d = (i + 1) * 7; p.style.transform = `translate3d(${(x * d).toFixed(1)}px, ${(y * d).toFixed(1)}px, 0) rotate(${(x * (i % 2 ? -1.5 : 1.5)).toFixed(2)}deg)`; });
    });
    art.closest('.hero').addEventListener('pointerleave', () => photos.forEach(p => { p.style.transform = ''; }));
    photos.forEach(p => { p.style.transition = 'transform 700ms cubic-bezier(.22,1,.36,1)'; });
  }

  /* Rails: progress, arrows, mouse drag */
  $$('[data-rail]').forEach(rail => {
    const scope = rail.closest('section') || document;
    const bar = scope.querySelector('[data-rail-progress]');
    const update = () => { const max = rail.scrollWidth - rail.clientWidth; bar?.style.setProperty('--p', String(max > 0 ? Math.max(0.12, (rail.scrollLeft + rail.clientWidth) / rail.scrollWidth) : 1)); };
    rail.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
    const by = dir => rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: still() ? 'auto' : 'smooth' });
    scope.querySelector('[data-rail-prev]')?.addEventListener('click', () => by(-1));
    scope.querySelector('[data-rail-next]')?.addEventListener('click', () => by(1));
    rail.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); by(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); by(-1); } });
    let startX = 0; let startLeft = 0; let moved = false; let down = false;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.target.closest('button')) return; down = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft; });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) { moved = true; rail.classList.add('is-dragging'); }
      if (moved) rail.scrollLeft = startLeft - dx;
    });
    addEventListener('pointerup', () => { if (!down) return; down = false; requestAnimationFrame(() => rail.classList.remove('is-dragging')); });
    rail.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    rail.addEventListener('dragstart', e => e.preventDefault());
  });

  reduced.addEventListener?.('change', () => { targets.forEach(show); parallax.forEach(el => { el.style.translate = ''; }); frame(); });
})();
