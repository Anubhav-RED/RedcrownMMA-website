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

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduceMotion) { applyTheme(next); return; }

    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => applyTheme(next));
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
        { duration: 500, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
      );
    });
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
    let f = (a.getAttribute('href') || '').split('/').pop();
    if (f === '' ) f = 'index.html'; // href="/" points at the homepage
    if (f === curFile) a.classList.add('active');
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
  const modalPanel = backdrop?.querySelector('.modal');
  let modalReturnFocus = null;

  if (modalPanel) {
    modalPanel.setAttribute('role', 'dialog');
    modalPanel.setAttribute('aria-modal', 'true');
    const heading = modalPanel.querySelector('.modal-header h3, h3, h2');
    if (heading) {
      if (!heading.id) heading.id = 'booking-modal-title';
      modalPanel.setAttribute('aria-labelledby', heading.id);
    }
  }
  const successEl = backdrop?.querySelector('.modal-success');
  if (successEl) successEl.setAttribute('aria-live', 'polite');

  function getFocusable(container) {
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null);
  }

  function openModal(trigger) {
    if (!backdrop) return;
    modalReturnFocus = trigger || document.activeElement;
    backdrop.querySelector('.modal-form')?.classList.remove('hide');
    backdrop.querySelector('.modal-success')?.classList.remove('show');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    const focusables = modalPanel ? getFocusable(modalPanel) : [];
    (focusables[0] || modalPanel)?.focus();
  }
  function closeModal() {
    if (!backdrop) return;
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    modalReturnFocus?.focus?.();
  }

  document.addEventListener('click', e => {
    if (!e.target.closest('[data-open-modal]')) return;
    e.preventDefault();
    openModal(e.target.closest('[data-open-modal]'));
  });
  if (backdrop) {
    backdrop.querySelector('.modal-close')?.addEventListener('click', closeModal);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
  }
  document.addEventListener('keydown', e => {
    if (!backdrop?.classList.contains('open')) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab' && modalPanel) {
      const focusables = getFocusable(modalPanel);
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
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

  /* ─── PLAN SELECTOR: MMA / GYM / COMBO ─── */
  const PLAN_KEY = 'rc-plan-mode';

  function setCardPlan(card, plan, animate) {
    const valEl    = card.querySelector('.price-amount-val');
    const strikeEl = card.querySelector('.price-strike');
    const subEl    = card.querySelector('.price-sub');
    if (!valEl) return;

    const showCombo = plan === 'combo';
    const newVal    = showCombo ? `₹${card.dataset.comboFinal}`  : `₹${card.dataset.mma}`;
    const newStrike = showCombo ? `₹${card.dataset.comboStrike}` : '';
    const newSub     = showCombo ? card.dataset.comboSub          : card.dataset.mmaSub;

    const commit = () => {
      valEl.textContent = newVal;
      if (subEl) subEl.textContent = newSub;
      if (strikeEl) {
        strikeEl.textContent = newStrike;
        strikeEl.classList.toggle('show', showCombo);
      }
      valEl.classList.remove('rolling');
      card.querySelectorAll('.price-features').forEach(ul => {
        ul.style.display = ul.classList.contains('pf-' + plan) ? '' : 'none';
      });
    };

    if (!animate) { commit(); return; }
    valEl.classList.add('rolling');
    setTimeout(commit, 200);
  }

  function applyPlanMode(plan, animate) {
    document.querySelectorAll('.plan-group').forEach(group => {
      group.querySelectorAll('.plan-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.planSet === plan);
      });
    });
    document.querySelectorAll('.price-card[data-mma]').forEach(card => {
      card.classList.toggle('gym-active', plan !== 'mma');
      setCardPlan(card, plan, animate);
    });
  }

  const planStart = sessionStorage.getItem(PLAN_KEY) || 'mma';
  applyPlanMode(planStart, false);

  document.addEventListener('click', e => {
    const btn = e.target.closest('.plan-btn');
    if (!btn) return;
    const plan = btn.dataset.planSet;
    sessionStorage.setItem(PLAN_KEY, plan);
    applyPlanMode(plan, true);
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
  document.querySelectorAll('.ticker-track').forEach(t => {
    t.setAttribute('aria-hidden', 'true');
    t.innerHTML += t.innerHTML;
  });

  /* ─── NAV "MORE" DROPDOWN ─── */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.nav-more-btn');
    const openMenu = document.querySelector('.nav-more.open');

    if (btn) {
      const wrap = btn.closest('.nav-more');
      const willOpen = !wrap.classList.contains('open');
      document.querySelectorAll('.nav-more.open').forEach(w => {
        w.classList.remove('open');
        w.querySelector('.nav-more-btn').setAttribute('aria-expanded', 'false');
      });
      if (willOpen) {
        wrap.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    if (openMenu && !e.target.closest('.nav-more-menu')) {
      openMenu.classList.remove('open');
      openMenu.querySelector('.nav-more-btn').setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.nav-more.open').forEach(w => {
        w.classList.remove('open');
        w.querySelector('.nav-more-btn').setAttribute('aria-expanded', 'false');
      });
    }
  });

  /* ─── GOOGLE REVIEWS WIDGET ───
     Fill these in once you have them, then this widget goes live automatically.
     placeId: your Google Business Place ID (Find it: developers.google.com/maps/documentation/places/web-service/place-id)
     apiKey:  a Google Places API key, restricted by HTTP referrer to redcrownmma.com
              in Google Cloud Console. This key is not secret, restriction is what protects it.
     Until both are filled in, the widget correctly shows the honest "reviews coming" state. */
  const GR_CONFIG = {
    placeId: '',
    apiKey: ''
  };

  (function initGoogleReviews() {
    const widget = document.getElementById('gr-widget');
    if (!widget) return;
    const loadingEl = widget.querySelector('.gr-loading');
    const emptyEl   = widget.querySelector('.gr-empty');
    const cardEl    = widget.querySelector('.gr-card');
    const dotsEl    = widget.querySelector('.gr-dots');

    function showEmpty() {
      loadingEl.style.display = 'none';
      cardEl.style.display = 'none';
      dotsEl.style.display = 'none';
      emptyEl.style.display = 'flex';
    }

    function renderReview(r) {
      cardEl.classList.remove('gr-card');
      void cardEl.offsetWidth; // restart animation
      cardEl.classList.add('gr-card');
      const stars = '★★★★★'.slice(0, r.rating || 5) + '☆☆☆☆☆'.slice(0, 5 - (r.rating || 5));
      cardEl.querySelector('.gr-stars').textContent = stars;
      cardEl.querySelector('.gr-text').textContent = '"' + (r.text || '') + '"';
      cardEl.querySelector('.gr-name').textContent = r.author || 'Google User';
      cardEl.querySelector('.gr-time').textContent = r.time || '';
      const avatar = cardEl.querySelector('.gr-avatar');
      if (r.photo) {
        avatar.style.backgroundImage = `url(${r.photo})`;
      } else {
        avatar.style.backgroundImage = 'none';
      }
    }

    function renderRotation(reviews) {
      loadingEl.style.display = 'none';
      emptyEl.style.display = 'none';
      cardEl.style.display = 'flex';
      let idx = 0;
      renderReview(reviews[0]);

      if (reviews.length > 1) {
        dotsEl.style.display = 'flex';
        dotsEl.innerHTML = '';
        reviews.forEach((_, i) => {
          const dot = document.createElement('span');
          dot.className = 'gr-dot' + (i === 0 ? ' active' : '');
          dot.addEventListener('click', () => {
            idx = i;
            renderReview(reviews[idx]);
            dotsEl.querySelectorAll('.gr-dot').forEach((d, di) => d.classList.toggle('active', di === idx));
          });
          dotsEl.appendChild(dot);
        });
        setInterval(() => {
          idx = (idx + 1) % reviews.length;
          renderReview(reviews[idx]);
          dotsEl.querySelectorAll('.gr-dot').forEach((d, di) => d.classList.toggle('active', di === idx));
        }, 6000);
      }
    }

    if (!GR_CONFIG.placeId || !GR_CONFIG.apiKey) {
      showEmpty();
      return;
    }

    fetch(`https://places.googleapis.com/v1/places/${GR_CONFIG.placeId}?fields=reviews,rating,userRatingCount`, {
      headers: { 'X-Goog-Api-Key': GR_CONFIG.apiKey }
    })
      .then(res => res.json())
      .then(data => {
        const reviews = (data.reviews || [])
          .filter(r => r.text && r.text.text)
          .map(r => ({
            text: r.text.text,
            rating: r.rating,
            author: r.authorAttribution ? r.authorAttribution.displayName : 'Google User',
            photo: r.authorAttribution ? r.authorAttribution.photoUri : '',
            time: r.relativePublishTimeDescription || ''
          }))
          .slice(0, 8);
        if (!reviews.length) { showEmpty(); return; }
        renderRotation(reviews);
      })
      .catch(showEmpty);
  })();


  /* ─── SPOTLIGHT CARDS: mouse-tracked radial glow ─── */
  document.querySelectorAll('.spotlight-card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ─── LIMELIGHT NAV: glow tracks the active/hovered link ─── */
  document.querySelectorAll('.nav-links').forEach(list => {
    const lime = document.createElement('span');
    lime.className = 'nav-limelight';
    lime.setAttribute('aria-hidden', 'true');
    list.appendChild(lime);

    function moveTo(el) {
      if (!el) { lime.style.opacity = '0'; return; }
      lime.style.left = el.offsetLeft + 'px';
      lime.style.width = el.offsetWidth + 'px';
      lime.style.opacity = '1';
    }

    // Only direct children of the top-level bar drive the limelight.
    // Dropdown items (.nav-more-menu a) live in a different offsetParent —
    // tracking them here was the cause of the underline "ghosting" bug.
    const topLevel = Array.from(list.children).filter(el => el.tagName === 'A');
    const moreBtn = list.querySelector('.nav-more-btn');

    const active = topLevel.find(a => a.classList.contains('active'));
    if (active) moveTo(active);

    topLevel.forEach(a => a.addEventListener('mouseenter', () => moveTo(a)));
    if (moreBtn) moreBtn.addEventListener('mouseenter', () => moveTo(moreBtn));
    list.addEventListener('mouseleave', e => {
      if (e.relatedTarget && list.querySelector('.nav-more-menu')?.contains(e.relatedTarget)) return;
      moveTo(topLevel.find(a => a.classList.contains('active')));
    });
  });

  /* ─── MOBILE MINIMAL DOCK: icon-only bottom nav, built from existing nav links ─── */
  (function buildTabBar() {
    const src = document.querySelector('.nav-links');
    if (!src || document.querySelector('.tab-bar')) return;

    const wanted = ['Home', 'Programs', 'Schedule', 'Contact'];
    const links = Array.from(src.querySelectorAll('a'));
    const bar = document.createElement('nav');
    bar.className = 'tab-bar';
    bar.setAttribute('aria-label', 'Quick navigation');

    const icons = {
      Home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
      Programs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>',
      Book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="M9 15l2 2 4-4"/></svg>',
      Schedule: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
      Contact: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>'
    };

    const found = [];
    wanted.forEach(label => {
      const match = links.find(a => a.textContent.trim().toLowerCase() === label.toLowerCase());
      if (match) found.push({ label, href: match.getAttribute('href'), active: match.classList.contains('active') });
    });
    const bookHref = document.querySelector('[data-open-modal]') ? '#' : null;

    function addTab(label, href, active, isBook) {
      const a = document.createElement('a');
      a.href = href;
      a.setAttribute('aria-label', label);
      if (isBook) a.setAttribute('data-open-modal', '');
      if (active) a.classList.add('active');
      a.innerHTML = icons[label] || icons.Home;
      a.addEventListener('click', () => {
        bar.querySelectorAll('a').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
      });
      bar.appendChild(a);
    }
    function addDivider() {
      const d = document.createElement('span');
      d.className = 'tab-bar-divider';
      d.setAttribute('aria-hidden', 'true');
      bar.appendChild(d);
    }

    found.slice(0, 2).forEach(f => addTab(f.label, f.href, f.active, false));
    if (bookHref) { addDivider(); addTab('Book', bookHref, false, true); addDivider(); }
    found.slice(2).forEach(f => addTab(f.label, f.href, f.active, false));

    document.body.appendChild(bar);
  })();

  /* ─── HOVER PREVIEW: interlink image previews on [data-preview] terms ─── */
  (function hoverPreview() {
    const terms = document.querySelectorAll('[data-preview]');
    if (!terms.length) return;

    const panel = document.createElement('div');
    panel.className = 'hover-preview';
    panel.innerHTML = `<img alt="" /><div class="hp-title"></div><div class="hp-sub"></div>`;
    document.body.appendChild(panel);
    const imgEl = panel.querySelector('img');
    const titleEl = panel.querySelector('.hp-title');
    const subEl = panel.querySelector('.hp-sub');
    let hideTimer;

    function show(el) {
      clearTimeout(hideTimer);
      const src = el.dataset.previewImg || 'assets/images/previews/placeholder.jpg';
      imgEl.src = src;
      imgEl.alt = el.dataset.previewTitle || '';
      titleEl.textContent = el.dataset.previewTitle || el.textContent;
      subEl.textContent = el.dataset.previewSub || '';

      const r = el.getBoundingClientRect();
      const panelW = 240;
      let left = r.left + r.width / 2 - panelW / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - panelW - 12));
      let top = r.top - 160;
      if (top < 12) top = r.bottom + 12;
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
      requestAnimationFrame(() => panel.classList.add('is-visible'));
    }
    function hide() {
      hideTimer = setTimeout(() => panel.classList.remove('is-visible'), 80);
    }

    terms.forEach(el => {
      el.classList.add('hp-term');
      el.addEventListener('mouseenter', () => show(el));
      el.addEventListener('mouseleave', hide);
      el.addEventListener('focus', () => show(el));
      el.addEventListener('blur', hide);
    });
    panel.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    panel.addEventListener('mouseleave', hide);
  })();

  /* ─── CONTACT DOCK: speed-dial (Message on WhatsApp / Instagram / Book) ─── */
  (function coachDock() {
    const dock = document.querySelector('.coach-dock');
    if (!dock) return;
    const trigger = dock.querySelector('.coach-dock-trigger');

    function closeAll() { dock.classList.remove('is-dial-open'); }
    function toggleDial() { dock.classList.toggle('is-dial-open'); }

    trigger?.addEventListener('click', toggleDial);
    // Message/Instagram/Book are plain links or the modal trigger — just close the dial after any of them fire.
    dock.querySelectorAll('.dock-speed-item').forEach(item => {
      item.addEventListener('click', closeAll);
    });

    document.addEventListener('click', e => {
      if (!dock.contains(e.target) && dock.classList.contains('is-dial-open')) closeAll();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAll();
    });
  })();

  /* ─── EXPANDABLE LOCATION CARD ─── */
  document.querySelectorAll('.loc-card').forEach(card => {
    const head = card.querySelector('.loc-card-head');
    head?.addEventListener('click', () => {
      const expanded = card.getAttribute('data-expanded') === 'true';
      card.setAttribute('data-expanded', String(!expanded));
      head.setAttribute('aria-expanded', String(!expanded));
    });
  });

})();
