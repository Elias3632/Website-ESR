// ===========================
// ESR Studio — Main JS
// ===========================

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initMobileMenu();
  initScrollReveal();
  setActiveNavLink();
  initContactForm();
  initWorkVideos();
});

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
// Scroll Reveal
// ===========================
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });

  els.forEach(el => io.observe(el));
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = form.querySelector('.btn--form');
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
            <div class="form-success">
              <div class="form-success__icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10L8.5 14.5L16 6" stroke="#C9A84C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h3>Nachricht erhalten.</h3>
              <p>Danke für deine Anfrage. Ich melde mich innerhalb von 1–2 Werktagen.</p>
            </div>`;
        }
      } else {
        if (btn) {
          btn.textContent = 'Nachricht senden';
          btn.disabled = false;
        }
        alert('Etwas ist schiefgelaufen. Bitte schreib direkt an info@esrstudio.de');
      }
    } catch {
      if (btn) {
        btn.textContent = 'Nachricht senden';
        btn.disabled = false;
      }
      alert('Keine Verbindung. Bitte schreib direkt an info@esrstudio.de');
    }
  });
}
