/* ==========================================================================
   REDCROWN MMA — MAIN JS (v7)
   View Transitions API handles page wipe natively — no JS wipe needed.
   Theme · Nav · Mobile · Modal · Google Sheets · WhatsApp · Reveal · FAQ · Ticker
   ========================================================================== */

(function () {
  'use strict';

  const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwNrioeb_sG3A2rH8xhzqTCZJgseJJeFauFfdJBDBCXrV8sURM9tZ8Mho48zWq31TdcsQ/exec';

  /* ─── THEME: system + click override ─── */
  const root    = document.documentElement;
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)');
  const TKEY    = 'rc-theme'; // 'auto' | 'dark' | 'light'

  function applyTheme(pref) {
    pref = pref || localStorage.getItem(TKEY) || 'auto';
    const dark = pref === 'dark' ? true : pref === 'light' ? false : sysDark.matches;
    dark ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', 'light');
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeSet === pref);
    });
    document.querySelectorAll('img[data-src-light]').forEach(img => {
      const wanted = dark ? img.dataset.srcDark : img.dataset.srcLight;
      if (wanted && img.getAttribute('src') !== wanted) img.setAttribute('src', wanted);
    });
  }

  applyTheme();

  sysDark.addEventListener('change', () => {
    if ((localStorage.getItem(TKEY) || 'auto') === 'auto') applyTheme('auto');
  });

  document.addEventListener('click', e => {
    const btn = e.target.closest('.theme-btn');
    if (!btn) return;
    const next = btn.dataset.themeSet;
    localStorage.setItem(TKEY, next);
    applyTheme(next);
  });

  /* ─── NAV: scroll state + active link ─── */
  const nav = document.querySelector('.nav');
  if (nav) {
    const tick = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    tick();
    window.addEventListener('scroll', tick, { passive: true });
  }

  const curFile = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(a => {
    const f = (a.getAttribute('href') || '').split('/').pop();
    if (f === curFile || (!curFile && f === 'index.html')) a.classList.add('active');
  });

  /* ─── ANCHOR SCROLL ─── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      window.scrollTo({
        top: t.getBoundingClientRect().top + window.scrollY - ((nav?.offsetHeight || 80) + 20),
        behavior: 'smooth'
      });
    });
  });

  /* ─── MOBILE NAV ─── */
  const burger = document.querySelector('.hamburger');
  const mobNav = document.querySelector('.mobile-nav');
  if (burger && mobNav) {
    burger.addEventListener('click', () => {
      const open = burger.classList.toggle('open');
      mobNav.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      burger.classList.remove('open');
      mobNav.classList.remove('open');
      document.body.style.overflow = '';
    }));
  }

  /* ─── BOOKING MODAL ─── */
  const backdrop = document.getElementById('booking-modal');

  function openModal() {
    if (!backdrop) return;
    backdrop.querySelector('.modal-form')?.classList.remove('hide');
    backdrop.querySelector('.modal-success')?.classList.remove('show');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!backdrop) return;
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', e => {
    if (!e.target.closest('[data-open-modal]')) return;
    e.preventDefault();
    openModal();
  });
  if (backdrop) {
    backdrop.querySelector('.modal-close')?.addEventListener('click', closeModal);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && backdrop?.classList.contains('open')) closeModal();
  });

  /* ─── FORM → GOOGLE SHEETS (no-cors: data hits the sheet, response is opaque) ─── */
  document.querySelectorAll('.modal-form').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btnSpan = form.querySelector('[type="submit"] span');
      if (btnSpan) btnSpan.textContent = 'Sending…';

      const data = {
        name:       form.querySelector('[name="name"]')?.value?.trim()       || '',
        phone:      form.querySelector('[name="phone"]')?.value?.trim()      || '',
        email:      form.querySelector('[name="email"]')?.value?.trim()      || '',
        discipline: form.querySelector('[name="discipline"]')?.value?.trim() || '',
        batch:      form.querySelector('[name="batch"]')?.value?.trim()      || ''
      };

      try {
        await fetch(SHEETS_URL, {
          method:  'POST',
          mode:    'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(data)
        });
      } catch (_) { /* fire and forget — sheet still receives it */ }

      form.classList.add('hide');
      form.closest('.modal, .contact-form-box')?.querySelector('.modal-success')?.classList.add('show');
    });
  });

  /* ─── WHATSAPP PRE-FILL ─── */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-wa');
    if (!btn) return;
    const ctx = btn.closest('.modal, .contact-form-box, form') || document;
    const get = n => ctx.querySelector?.(`[name="${n}"]`)?.value?.trim() || '';
    const msg = [
      "Hi Redcrown MMA! I'd like to book a free class.",
      get('name')  ? `Name: ${get('name')}`   : '',
      get('phone') ? `Phone: ${get('phone')}` : '',
      `Interest: ${get('discipline') || 'Not decided yet'}`,
      get('batch') ? `Preferred batch: ${get('batch')}` : ''
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/919910604536?text=${encodeURIComponent(msg)}`, '_blank');
  });

  /* ─── GYM PACKAGE PRICING TOGGLE ─── */
  const GYM_KEY = 'rc-gym-pricing';

  function setCardPrice(card, showGym, animate) {
    const valEl    = card.querySelector('.price-amount-val');
    const strikeEl = card.querySelector('.price-strike');
    const subEl    = card.querySelector('.price-sub');
    if (!valEl) return;

    const newVal    = showGym ? `₹${card.dataset.comboFinal}`  : `₹${card.dataset.mma}`;
    const newStrike = showGym ? `₹${card.dataset.comboStrike}` : '';
    const newSub    = showGym ? card.dataset.comboSub          : card.dataset.mmaSub;

    const commit = () => {
      valEl.textContent = newVal;
      if (subEl) subEl.textContent = newSub;
      if (strikeEl) {
        strikeEl.textContent = newStrike;
        strikeEl.classList.toggle('show', showGym);
      }
      valEl.classList.remove('rolling');
    };

    if (!animate) { commit(); return; }
    valEl.classList.add('rolling');
    setTimeout(commit, 200);
  }

  function applyGymPricing(active, animate) {
    document.querySelectorAll('.gym-toggle').forEach(btn => {
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
      const lbl = btn.querySelector('.gym-toggle-label');
      if (lbl) lbl.textContent = active ? 'MMA + Gym Package' : 'Include Gym Package';
    });
    document.querySelectorAll('.price-card[data-mma]').forEach(card => {
      card.classList.toggle('gym-active', active);
      setCardPrice(card, active, animate);
    });
  }

  const gymStart = sessionStorage.getItem(GYM_KEY) === '1';
  applyGymPricing(gymStart, false);

  document.addEventListener('click', e => {
    const btn = e.target.closest('.gym-toggle');
    if (!btn) return;
    const active = !btn.classList.contains('active');
    sessionStorage.setItem(GYM_KEY, active ? '1' : '0');
    applyGymPricing(active, true);
  });

  /* ─── SCROLL REVEAL ─── */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver(
      entries => entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('visible'));
  }

  /* ─── FAQ ─── */
  document.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-btn')?.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  /* ─── TICKER ─── */
  document.querySelectorAll('.ticker-track').forEach(t => (t.innerHTML += t.innerHTML));

})();
