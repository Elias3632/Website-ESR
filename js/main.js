// ===========================
// ESR Studio — Main JS
// ===========================

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initMobileMenu();
  setActiveNavLink();
  initContactForm();
  initWorkVideos();
});

// Hero video loads after all critical resources to not block page render
window.addEventListener('load', initHeroVideo);

function initHeroVideo() {
  const video = document.getElementById('heroVideo');
  if (!video) return;
  const source = video.querySelector('source[data-src]');
  if (!source) return;
  source.src = source.dataset.src;
  source.removeAttribute('data-src');
  video.load();
  video.play().catch(() => {});
}

// ===========================
// Navigation
// ===========================
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  const hasDarkTop = document.querySelector('.hero, .page-hero');

  function updateNav() {
    const isScrolled = window.scrollY > 56;
    nav.classList.toggle('nav--solid',       isScrolled);
    nav.classList.toggle('nav--transparent', !isScrolled);
  }

  if (hasDarkTop) {
    nav.classList.add('nav--transparent');
    window.addEventListener('scroll', updateNav, { passive: true });
  } else {
    nav.classList.add('nav--solid');
  }

  updateNav();
}

// ===========================
// Mobile Menu
// ===========================
function initMobileMenu() {
  const toggle    = document.getElementById('navToggle');
  const menu      = document.getElementById('mobileMenu');
  const closeBtn  = document.getElementById('mobileClose');
  if (!toggle || !menu) return;

  function open() {
    menu.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    menu.classList.remove('open');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);

  menu.querySelectorAll('.nav__mobile-link').forEach(link =>
    link.addEventListener('click', close)
  );

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

// ===========================
// Active Nav Link
// ===========================
function setActiveNavLink() {
  const page = window.location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.nav__link').forEach(link => {
    const href = link.getAttribute('href');
    const isHome = (page === '' || page === 'index.html') && (href === 'index.html' || href === './');
    if (href === page || isHome) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// ===========================
// Work Page Videos
// ===========================
function initWorkVideos() {
  const cards = [...document.querySelectorAll('.work-card')].filter(c => c.querySelector('video'));
  if (!cards.length) return;

  const isTouch = window.matchMedia('(hover: none)').matches ||
    (navigator.maxTouchPoints > 1 && window.matchMedia('(pointer: coarse)').matches);

  function loadSrc(video) {
    const source = video.querySelector('source[data-src]');
    if (!source) return;
    source.src = source.dataset.src;
    source.removeAttribute('data-src');
    video.load();
  }

  const iconMuted = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 5L6 9H2v6h4l5 4V5Z" fill="white"/>
    <line x1="17" y1="9" x2="23" y2="15" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <line x1="23" y1="9" x2="17" y2="15" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
  const iconUnmuted = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 5L6 9H2v6h4l5 4V5Z" fill="white"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </svg>`;

  function addSoundButton(card, video) {
    const btn = document.createElement('button');
    btn.className = 'work-card__sound-btn';
    btn.setAttribute('aria-label', 'Ton ein/aus');
    btn.innerHTML = iconMuted;

    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (video.muted) {
        // Mute all other videos and unmute this one
        cards.forEach(c => {
          const v = c.querySelector('video');
          if (c !== card) {
            v.muted = true;
            const b = c.querySelector('.work-card__sound-btn');
            if (b) b.innerHTML = iconMuted;
          }
        });
        video.muted = false;
        btn.innerHTML = iconUnmuted;
      } else {
        video.muted = true;
        btn.innerHTML = iconMuted;
      }
    });

    card.appendChild(btn);
  }

  if (!isTouch) {
    // Desktop: preload src when card nears viewport, play on hover
    const viewIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          loadSrc(e.target.querySelector('video'));
          viewIO.unobserve(e.target);
        }
      });
    }, { rootMargin: '300px' });

    cards.forEach(card => {
      viewIO.observe(card);
      const video = card.querySelector('video');
      addSoundButton(card, video);
      card.addEventListener('mouseenter', () => video.play().catch(() => {}));
      card.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
    });
  } else {
    // Touch: tap to play/pause. Tapping a card pauses all others.
    const preloadIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          loadSrc(e.target.querySelector('video'));
          preloadIO.unobserve(e.target);
        }
      });
    }, { rootMargin: '300px' });

    cards.forEach(card => {
      preloadIO.observe(card);
      const video = card.querySelector('video');
      addSoundButton(card, video);

      // Inject visible play button
      const playBtn = document.createElement('div');
      playBtn.className = 'work-card__play-touch';
      playBtn.innerHTML = `<svg width="22" height="26" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L20 13L2 24V2Z" fill="white" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
      card.appendChild(playBtn);

      card.addEventListener('click', () => {
        const wasPlaying = !video.paused;

        cards.forEach(c => {
          c.querySelector('video').pause();
          c.classList.remove('work-card--active');
        });

        if (!wasPlaying) {
          loadSrc(video);
          video.play().catch(() => {});
          card.classList.add('work-card--active');
        }
      });
    });
  }
}

// ===========================
// Contact Form
// ===========================
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const btn = form.querySelector('.btn--form');
  const btnHTML = btn ? btn.innerHTML : '';   // inkl. goldenem Punkt

  // Prüfregeln: leerer String = in Ordnung, sonst der Hinweis
  const rules = {
    name:    v => v ? '' : 'Bitte gib deinen Namen ein.',
    email:   v => !v ? 'Bitte gib deine E-Mail-Adresse ein.'
               : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Bitte gib eine gültige E-Mail-Adresse ein.',
    message: v => v ? '' : 'Bitte schreib kurz, worum es geht.',
  };

  function check(field) {
    const rule = rules[field.name];
    if (!rule) return true;
    const msg = rule(field.value.trim());
    const out = form.querySelector(`[data-fs-error="${field.name}"]`);
    if (out) {
      if (!out.id) out.id = `${field.name}-error`;
      out.textContent = msg;
      field.setAttribute('aria-describedby', out.id);
    }
    if (msg) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return !msg;
  }

  // Hinweis erst nach dem ersten Verlassen eines ausgefüllten Felds,
  // danach live verschwinden lassen, sobald es passt
  Object.keys(rules).forEach(name => {
    const field = form.elements[name];
    if (!field) return;
    field.addEventListener('blur', () => { if (field.value.trim()) check(field); });
    field.addEventListener('input', () => { if (field.hasAttribute('aria-invalid')) check(field); });
  });

  // Fehlermeldung im Formular statt Popup
  function showError(text) {
    let box = form.querySelector('.form-error-global');
    if (!box) {
      box = document.createElement('div');
      box.className = 'form-error-global';
      box.setAttribute('role', 'alert');
      form.insertBefore(box, form.querySelector('.form-submit'));
    }
    box.innerHTML = `${text} Bitte schreib direkt an <a href="mailto:info@esrstudio.de">info@esrstudio.de</a>.`;
  }
  function clearError() {
    const box = form.querySelector('.form-error-global');
    if (box) box.remove();
  }
  function resetButton() {
    if (!btn) return;
    btn.innerHTML = btnHTML;
    btn.disabled = false;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const invalid = Object.keys(rules)
      .map(name => form.elements[name])
      .filter(field => field && !check(field));
    if (invalid.length) {
      invalid[0].focus();
      return;
    }

    if (btn) {
      btn.textContent = 'Senden…';
      btn.disabled = true;
    }

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      const wrap = document.getElementById('contactFormWrap');
      if (response.ok) {
        if (wrap) {
          wrap.innerHTML = `
            <div class="form-success" role="status">
              <div class="form-success__icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 10L8.5 14.5L16 6" stroke="#C9A84C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h3 tabindex="-1">Nachricht erhalten.</h3>
              <p>Danke für deine Anfrage. Ich melde mich innerhalb von 1–2 Werktagen.</p>
            </div>`;
          const heading = wrap.querySelector('h3');
          if (heading) heading.focus({ preventScroll: true });
          const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          wrap.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
        }
      } else {
        resetButton();
        showError('Etwas ist schiefgelaufen.');
      }
    } catch {
      resetButton();
      showError('Keine Verbindung.');
    }
  });
}
