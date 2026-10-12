(() => {
  'use strict';
  const data = window.ziciData || { items: [], faqs: [], contact: {} };
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byCode = new Map(data.items.map(item => [item.code.toUpperCase(), item]));

  /* Header: compact border, hide on scroll down, show on scroll up */
  const header = $('.site-header');
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 8);
    const hide = y > 480 && y > lastY && !document.body.classList.contains('menu-open');
    header?.classList.toggle('is-hidden', hide);
    document.body.classList.toggle('header-visible', !hide);
    lastY = y;
  };
  document.body.classList.add('header-visible');
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile menu */
  const menu = $('.menu-toggle');
  const nav = $('#primary-nav');
  const setMenu = open => {
    menu?.setAttribute('aria-expanded', String(open));
    nav?.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  };
  menu?.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  nav?.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); } });

  /* Dialogs */
  let opener = null;
  $$('[aria-haspopup="dialog"][aria-controls]').forEach(button => button.addEventListener('click', () => {
    const dialog = document.getElementById(button.getAttribute('aria-controls'));
    if (!dialog || dialog.open) return;
    opener = button;
    dialog.showModal();
    button.setAttribute('aria-expanded', 'true');
    dialog.dispatchEvent(new Event('zici:open'));
  }));
  $$('dialog.panel-dialog').forEach(dialog => {
    dialog.addEventListener('click', e => { if (e.target === dialog || e.target.closest('[data-close]')) dialog.close(); });
    dialog.addEventListener('close', () => {
      $$(`[aria-controls="${dialog.id}"]`).forEach(b => b.setAttribute('aria-expanded', 'false'));
      opener?.focus();
    });
  });

  /* Clipboard + open DM in the same click so pop-up blockers allow it */
  const copyText = text => {
    const area = document.createElement('textarea');
    area.value = text; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0';
    document.body.append(area); area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    if (!ok && navigator.clipboard) { navigator.clipboard.writeText(text).catch(() => {}); ok = true; }
    return ok;
  };
  const openChannel = channel => {
    const url = channel === 'facebook' ? data.contact.facebook : (data.contact.dm || data.contact.instagram);
    if (url) window.open(url, '_blank', 'noopener');
  };

  /* Saved items */
  const KEY = 'zici-saved';
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(c => byCode.has(String(c).toUpperCase())) : []; } catch { return []; } };
  const write = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* private mode: list lives for this page only */ } };
  let saved = read();

  const savedDialog = $('#zici-saved');
  const list = $('[data-saved-list]');
  const empty = $('[data-saved-empty]');
  const form = $('[data-saved-form]');
  const messageBox = $('#saved-message');
  const status = $('.saved-status');

  const formatDate = value => { if (!value) return ''; const [y, m, d] = value.split('-'); return `${d}/${m}/${y}`; };
  const buildMessage = () => {
    const lines = ['Chào ZiCi, mình muốn hỏi lịch thuê các mẫu:'];
    saved.forEach(code => { const item = byCode.get(code); lines.push(`• ${item.code}${item.priceText ? ` (${item.priceText})` : ''}`); });
    const date = formatDate($('#saved-date')?.value);
    lines.push(`Ngày cần dùng: ${date || '…'}`);
    const note = $('#saved-note')?.value.trim();
    if (note) lines.push(`Ghi chú: ${note}`);
    lines.push('Shop kiểm tra giúp mình nhé!');
    return lines.join('\n');
  };
  const renderSaved = (bumped) => {
    $$('[data-save]').forEach(button => {
      const on = saved.includes(button.dataset.save.toUpperCase());
      button.setAttribute('aria-pressed', String(on));
      const label = $('[data-save-text]', button);
      if (label) label.textContent = on ? 'Đã lưu' : 'Lưu mẫu';
    });
    $$('[data-saved-count]').forEach(el => {
      el.textContent = String(saved.length);
      if (bumped) { el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); }
    });
    if (!list) return;
    list.replaceChildren(...saved.map(code => {
      const item = byCode.get(code);
      const li = document.createElement('li');
      const link = document.createElement('a'); link.href = item.url;
      if (item.img) { const img = document.createElement('img'); img.src = item.img; img.alt = ''; img.loading = 'lazy'; link.append(img); }
      const text = document.createElement('div');
      const name = document.createElement('a'); name.href = item.url;
      const b = document.createElement('b'); b.textContent = item.code; name.append(b);
      const meta = document.createElement('span'); meta.textContent = [item.priceText || 'Nhắn hỏi giá', item.sizes && `Size ${item.sizes}`].filter(Boolean).join(' · ');
      text.append(name, meta);
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'icon-button'; remove.setAttribute('aria-label', `Bỏ lưu ${item.code}`);
      remove.innerHTML = '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
      remove.addEventListener('click', () => toggle(code));
      li.append(link, text, remove);
      return li;
    }));
    if (empty) empty.hidden = saved.length > 0;
    if (form) form.hidden = saved.length === 0;
    if (messageBox) messageBox.value = buildMessage();
  };
  const toggle = (code, button) => {
    code = code.toUpperCase();
    saved = saved.includes(code) ? saved.filter(c => c !== code) : [...saved, code];
    write(saved);
    renderSaved(true);
    if (button && saved.includes(code)) { button.classList.remove('is-pop'); void button.offsetWidth; button.classList.add('is-pop'); }
  };
  document.addEventListener('click', e => {
    const button = e.target.closest('[data-save]');
    if (!button) return;
    e.preventDefault();
    toggle(button.dataset.save, button);
  });
  ['#saved-date', '#saved-note'].forEach(sel => $(sel)?.addEventListener('input', () => { if (messageBox) messageBox.value = buildMessage(); }));
  $$('[data-send]').forEach(button => button.addEventListener('click', () => {
    const ok = copyText(buildMessage());
    if (status) status.textContent = ok ? 'Đã sao chép tin nhắn. Dán vào khung chat để gửi shop nhé!' : 'Bạn sao chép tin nhắn ở ô trên rồi gửi shop nhé.';
    openChannel(button.dataset.send);
  }));
  savedDialog?.addEventListener('zici:open', () => { saved = read(); renderSaved(false); if (status) status.textContent = ''; });
  window.addEventListener('storage', e => { if (e.key === KEY) { saved = read(); renderSaved(false); } });
  renderSaved(false);

  /* "Hỏi lịch mẫu này" on item pages */
  $$('[data-ask]').forEach(button => button.addEventListener('click', () => {
    const item = byCode.get(button.dataset.ask.toUpperCase());
    if (!item) return;
    const text = `Chào ZiCi, mình muốn hỏi lịch thuê mẫu ${item.code}${item.priceText ? ` (${item.priceText})` : ''}.\nNgày cần dùng: …\nShop kiểm tra giúp mình nhé!\n${item.url}`;
    const ok = copyText(text);
    const hint = $('[data-ask-status]');
    if (hint) { hint.textContent = ok ? `Đã sao chép tin nhắn hỏi mẫu ${item.code}. Dán vào Instagram rồi điền ngày cần dùng nhé!` : `Nhắn shop mã ${item.code} và ngày cần dùng nhé.`; hint.classList.add('is-ok'); }
    openChannel('dm');
  }));

  /* Product gallery */
  const photo = $('#item-main-photo');
  $$('.pd-thumb').forEach(button => button.addEventListener('click', () => {
    if (!photo || button.getAttribute('aria-pressed') === 'true') return;
    const loader = new Image();
    loader.onload = () => {
      photo.src = loader.src; photo.removeAttribute('srcset'); photo.removeAttribute('sizes');
      if (button.dataset.alt) photo.alt = button.dataset.alt;
      $$('.pd-thumb').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) photo.animate([{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
    };
    loader.src = button.dataset.image;
  }));

  /* Chatbot: answers only from shop-approved FAQ entries and item data */
  const chat = $('#zici-chat');
  if (!chat) return;
  const log = $('.chat-messages', chat);
  const normalize = text => String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const faqs = data.faqs.map(faq => ({ ...faq, q: normalize(faq.question), keys: (faq.keywords || []).map(normalize).filter(Boolean) }));
  const bubble = (who, build) => {
    const p = document.createElement('p'); p.className = `chat-message ${who}`;
    const span = document.createElement('span'); build(span); p.append(span); log.append(p);
    while (log.children.length > 30) log.firstElementChild.remove();
    p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return p;
  };
  const findItem = q => {
    const m = q.match(/\b([a-z]{1,2})\s?(\d{2,3})\b/);
    return m ? byCode.get((m[1] + m[2]).toUpperCase()) || byCode.get((m[1] + m[2].padStart(3, '0')).toUpperCase()) : null;
  };
  const findFaq = q => {
    let best = null; let score = 0;
    const padded = ` ${q} `;
    faqs.forEach(faq => {
      let s = faq.q === q ? 100 : 0;
      faq.keys.forEach(k => { if (padded.includes(` ${k} `)) s += k.split(' ').length * 2; });
      faq.q.split(' ').filter(w => w.length > 2).forEach(w => { if (padded.includes(` ${w} `)) s += 0.5; });
      if (s > score) { score = s; best = faq; }
    });
    return score >= 2 ? best : null;
  };
  const reply = question => {
    const q = normalize(question);
    const item = findItem(q);
    const typing = bubble('bot chat-typing', span => { span.innerHTML = '<i></i><i></i><i></i>'; span.setAttribute('aria-label', 'ZiCi đang trả lời'); });
    setTimeout(() => {
      typing.remove();
      if (item) {
        bubble('bot', span => {
          span.textContent = `${item.code}${item.brand ? ` · ${item.brand}` : ''}\nGiá theo bài đăng: ${item.priceText || 'bài đăng ẩn giá, bạn nhắn shop hỏi nhé'}\nSize: ${item.sizes || 'chưa ghi trong bài'}\nLịch trống cần shop kiểm tra.\n`;
          const a = document.createElement('a'); a.href = item.url; a.textContent = `Xem mẫu ${item.code}`; span.append(a);
        });
        return;
      }
      const faq = findFaq(q);
      bubble('bot', span => { span.textContent = faq ? faq.answer : data.fallback; });
    }, 550 + Math.random() * 350);
  };
  const ask = text => { bubble('visitor', span => { span.textContent = text; }); reply(text); };
  const chips = $('.chat-questions', chat);
  faqs.slice(0, 8).forEach(faq => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = faq.question;
    b.addEventListener('click', () => ask(faq.question));
    chips.append(b);
  });
  $('.chat-form', chat).addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#chat-input', chat);
    const value = input.value.trim();
    if (!value) return;
    ask(value); input.value = ''; input.focus();
  });
  chat.addEventListener('zici:open', () => $('#chat-input', chat)?.focus());
})();
