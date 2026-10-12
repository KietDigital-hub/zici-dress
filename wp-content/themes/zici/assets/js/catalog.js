(() => {
  'use strict';
  const root = document.querySelector('[data-catalog]');
  if (!root) return;
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const grid = root.querySelector('[data-grid]');
  const cards = $$('.product', grid);
  const step = Number(root.dataset.limit) || 12;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const activeCat = root.querySelector('[data-filter-cat].is-active');
  const state = { cat: activeCat ? activeCat.dataset.filterCat : '', sizes: new Set(), brand: '', brandName: '', sort: 'new', limit: step };
  const countEl = root.querySelector('[data-count]');
  const emptyEl = root.querySelector('[data-empty]');
  const more = root.querySelector('[data-load-more]');
  const brandChip = root.querySelector('[data-clear-brand]');

  const matches = card => (!state.cat || card.dataset.cat === state.cat)
    && (!state.sizes.size || card.dataset.sizes.split(' ').some(s => state.sizes.has(s)))
    && (!state.brand || card.dataset.brand === state.brand);
  const sorted = () => {
    const list = cards.slice();
    const price = c => Number(c.dataset.price) || (state.sort === 'asc' ? Infinity : -Infinity);
    if (state.sort === 'asc') list.sort((a, b) => price(a) - price(b));
    else if (state.sort === 'desc') list.sort((a, b) => price(b) - price(a));
    else list.sort((a, b) => a.dataset.order - b.dataset.order);
    return list;
  };

  const apply = (animate = true) => {
    const before = new Map();
    const canAnimate = animate && !reduced.matches && typeof grid.animate === 'function';
    if (canAnimate) cards.forEach(c => { if (!c.hidden && !c.classList.contains('is-clipped')) before.set(c, c.getBoundingClientRect()); });
    const order = sorted();
    order.forEach(c => grid.append(c));
    let shown = 0; let total = 0;
    order.forEach(card => {
      const ok = matches(card);
      card.hidden = !ok;
      if (ok) { total++; card.classList.toggle('is-clipped', total > state.limit); if (total <= state.limit) shown++; }
      else card.classList.remove('is-clipped');
    });
    if (countEl) countEl.textContent = `${total} mẫu${state.brandName ? ` của ${state.brandName}` : ''} · giá theo bài đăng, nhắn shop xác nhận trước khi đặt`;
    if (emptyEl) emptyEl.hidden = total > 0;
    if (more) {
      const rest = total - shown;
      more.hidden = rest <= 0;
      const label = more.querySelector('[data-load-count]');
      if (label) label.textContent = rest > 0 ? `(${rest})` : '';
    }
    if (!canAnimate) return;
    let fresh = 0;
    cards.forEach(card => {
      if (card.hidden || card.classList.contains('is-clipped')) return;
      const old = before.get(card);
      if (!old) {
        card.style.setProperty('--i', String(fresh++ % 8));
        card.classList.remove('is-entering'); void card.offsetWidth; card.classList.add('is-entering');
        return;
      }
      const now = card.getBoundingClientRect();
      const dx = old.left - now.left; const dy = old.top - now.top;
      if (dx || dy) card.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.22,1,.36,1)' });
    });
  };

  const setCat = slug => {
    state.cat = slug; state.limit = step;
    $$('[data-filter-cat]', root).forEach(chip => {
      const on = chip.dataset.filterCat === slug;
      chip.classList.toggle('is-active', on);
      if (on) chip.setAttribute('aria-current', 'true'); else chip.removeAttribute('aria-current');
    });
    try {
      const url = new URL(location.href);
      if (slug && !document.body.classList.contains('tax-zici_category')) url.searchParams.set('zici_filter', slug); else url.searchParams.delete('zici_filter');
      history.replaceState(null, '', url);
    } catch { /* URL sync is optional */ }
    apply();
  };
  const scrollToCatalog = () => {
    const target = document.getElementById('tu-do') || root;
    target.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
  };

  document.addEventListener('click', e => {
    const cat = e.target.closest('[data-filter-cat]');
    if (cat) {
      if (document.body.classList.contains('tax-zici_category') && root.contains(cat)) return; // category pages navigate normally
      e.preventDefault();
      setCat(cat.dataset.filterCat);
      if (!root.contains(cat)) scrollToCatalog();
      return;
    }
    const brand = e.target.closest('[data-filter-brand]');
    if (brand) {
      state.brand = brand.dataset.filterBrand; state.brandName = brand.dataset.brandName || ''; state.limit = step;
      if (brandChip) { brandChip.hidden = false; brandChip.querySelector('[data-brand-label]').textContent = state.brandName; }
      apply(); scrollToCatalog();
    }
  });
  $$('[data-filter-size]', root).forEach(chip => chip.addEventListener('click', () => {
    const key = chip.dataset.filterSize;
    if (state.sizes.has(key)) state.sizes.delete(key); else state.sizes.add(key);
    chip.setAttribute('aria-pressed', String(state.sizes.has(key)));
    state.limit = step; apply();
  }));
  brandChip?.addEventListener('click', () => { state.brand = ''; state.brandName = ''; brandChip.hidden = true; apply(); });
  root.querySelector('[data-sort]')?.addEventListener('change', e => { state.sort = e.target.value; apply(); });
  more?.addEventListener('click', () => { state.limit += step; apply(); });
  apply(false);
})();
