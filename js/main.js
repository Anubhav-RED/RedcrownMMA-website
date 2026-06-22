/* ==========================================================================
   REDCROWN MMA — MAIN JS (v4)
   System theme + manual override · Page wipe · Nav · Mobile menu
   Modal · WhatsApp pre-fill · Scroll reveal · FAQ · Ticker
   ========================================================================== */

(function () {
  'use strict';

  /* ─── THEME: system default + click to override ─── */
  const root      = document.documentElement;
  const sysDark   = window.matchMedia('(prefers-color-scheme: dark)');
  const THEME_KEY = 'rc-theme'; // stored: 'auto' | 'dark' | 'light'

  function resolveTheme(stored) {
    if (stored === 'dark')  return 'dark';
    if (stored === 'light') return 'light';
    return sysDark.matches ? 'dark' : 'light'; // 'auto' → follow system
  }

  function applyTheme(stored) {
    const r      = resolveTheme(stored || 'auto');
    const isAuto = !stored || stored === 'auto';
    r === 'dark'
      ? root.removeAttribute('data-theme')
      : root.setAttribute('data-theme', 'light');

    document.querySelectorAll('.t-icon').forEach(el =>
      (el.textContent = r === 'dark' ? '☾' : '☀')
    );
    document.querySelectorAll('.t-lbl').forEach(el =>
      (el.textContent = isAuto ? 'AUTO' : r === 'dark' ? 'DARK' : 'LIGHT')
    );
  }

  applyTheme(localStorage.getItem(THEME_KEY));

  // Auto-update when OS changes and user hasn't overridden
  sysDark.addEventListener('change', () => {
    if ((localStorage.getItem(THEME_KEY) || 'auto') === 'auto') applyTheme('auto');
  });

  // Click cycles: auto → dark → light → auto
  document.addEventListener('click', e => {
    if (!e.target.closest('.theme-toggle')) return;
    const cur  = localStorage.getItem(THEME_KEY) || 'auto';
    const next = cur === 'auto' ? 'dark' : cur === 'dark' ? 'light' : 'auto';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  /* ─── PAGE WIPE TRANSITION ─── */
  const wipe = document.getElementById('wipe');

  // Reveal on load: wipe sweeps out left
  if (wipe) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      wipe.classList.add('revealing');
      wipe.addEventListener('animationend', () => wipe.classList.remove('revealing'), { once: true });
    }));
  }

  // Cover on internal link click, then navigate
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    if (href.startsWith('#')) return;
    if (href.startsWith('mailto') || href.startsWith('tel')) return;
    if (link.target === '_blank') return;
    if (link.hasAttribute('data-open-modal')) return;
    if (href.startsWith('http') && !href.includes('redcrownmma.com') && !href.includes('localhost')) return;

    e.preventDefault();

    if (!wipe) { window.location.href = href; return; }

    wipe.classList.remove('revealing');
    void wipe.offsetWidth; // reset animation
    wipe.classList.add('covering');

    wipe.addEventListener('animationend', () => {
      window.location.href = href;
    }, { once: true });
  });

  /* ─── NAV: scroll state + active link ─── */
  const nav = document.querySelector('.nav');
  if (nav) {
    const tick = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    tick();
    window.addEventListener('scroll', tick, { passive: true });
  }

  // Auto-highlight current page in nav
  const curFile = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(a => {
    const linkFile = (a.getAttribute('href') || '').split('/').pop();
    if (linkFile && linkFile === curFile) a.classList.add('active');
    if (curFile === 'index.html' && (linkFile === '' || linkFile === '/')) a.classList.add('active');
  });

  /* ─── ANCHOR SCROLL: account for fixed nav height ─── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = (nav?.offsetHeight || 80) + 20;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
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
    mobNav.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        burger.classList.remove('open');
        mobNav.classList.remove('open');
        document.body.style.overflow = '';
      })
    );
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

  /* ─── FORM SUBMIT ─── */
  document.querySelectorAll('.modal-form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      /* REPLACE: wire to Formspree / EmailJS / your backend here */
      form.classList.add('hide');
      form.closest('.modal, .contact-form-box')?.querySelector('.modal-success')?.classList.add('show');
    });
  });

  /* ─── WHATSAPP PRE-FILL ─── */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-wa');
    if (!btn) return;
    const ctx  = btn.closest('.modal, .contact-form-box, form') || document;
    const get  = n => ctx.querySelector?.(`[name="${n}"]`)?.value?.trim() || '';
    const lines = [
      "Hi Redcrown MMA! I'd like to book a free class.",
      get('name')  ? `Name: ${get('name')}`   : '',
      get('phone') ? `Phone: ${get('phone')}` : '',
      `Interest: ${get('discipline') || 'Not decided yet'}`,
      get('batch') ? `Preferred batch: ${get('batch')}` : '',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/919910604536?text=${encodeURIComponent(lines)}`, '_blank');
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
