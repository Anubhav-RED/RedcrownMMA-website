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
  document.querySelectorAll('.ticker-track').forEach(t => (t.innerHTML += t.innerHTML));

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

})();
