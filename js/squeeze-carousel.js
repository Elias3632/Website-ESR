/* ===========================
   Squeeze-Karussell (Videos)
   ===========================
   Ein Panel bekommt den Platz, die übrigen werden nach rechts in schmale
   Lamellen gedrückt. Klick auf eine Lamelle öffnet sie und schiebt die Reihe
   weiter, der Text darunter blendet über.

   Quelle ist ein normales Raster mit .work-card-Elementen und dem Attribut
   data-squeeze. Titel, Kategorie, Beschreibung, Video und Poster werden aus
   den Karten gelesen. Ohne JavaScript bleibt das Raster einfach stehen.

   Geometrie nach "carousel-squeeze" (React): vier Spalten plus Lamellen,
   ein Streifen, der gleitet, statt eines Rings, der sich dreht.

   Muss vor main.js' DOMContentLoaded laufen (per defer geladen), damit
   initWorkVideos() die ersetzten Karten nicht mehr sieht. */
(function () {
  "use strict";

  /* Anteile der vier Spalten am Restplatz (Summe jeweils 1).
     shares: Ruhezustand. stretched: Spalte unter dem Mauszeiger.
     squeezed: ihre Nachbarn, die dafür etwas abgeben.
     Querformat: Die offene Spalte startet als 16:9-Block und gibt etwas
     zurück, daher der negative erste Wert.
     Hochformat: Der 9:16-Block ist schmal, also bleibt viel Restplatz. Die
     Spalten fallen deshalb treppenartig ab, statt zu Lamellen zu werden. */
  const FORMATS = {
    landscape: {
      shares:    [-0.06, 0.61, 0.3, 0.15],
      stretched: [0, 0.71, 0.4, 0.25],
      squeezed:  [-0.12, 0.59, 0.28, 0.13],
    },
    portrait: {
      shares:    [0.06, 0.44, 0.3, 0.2],
      stretched: [0.12, 0.54, 0.4, 0.3],
      squeezed:  [0, 0.42, 0.28, 0.18],
    },
  };
  const DURATION = 1000; /* ms, gleich --sq-ms im CSS */

  const ICON_MUTED = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M11 5L6 9H2v6h4l5 4V5Z" fill="currentColor"/>
    <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const ICON_SOUND = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M11 5L6 9H2v6h4l5 4V5Z" fill="currentColor"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const ICON_PLAY = `<svg width="18" height="21" viewBox="0 0 22 26" fill="none" aria-hidden="true">
    <path d="M2 2L20 13L2 24V2Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  const arrow = (back) => `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="${
    back
      ? "M9.6 2.6 5.1 7.1h9.1v1.8H5.1l4.5 4.5-1.2 1.2-6-6L1.8 8l.6-.6 6-6 1.2 1.2Z"
      : "M6.4 2.6l4.5 4.5H1.8v1.8h9.1l-4.5 4.5 1.2 1.2 6-6 .6-.6-.6-.6-6-6-1.2 1.2Z"
  }"/></svg>`;

  let uid = 0;

  function el(tag, cls) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function text(card, sel) {
    const n = card.querySelector(sel);
    return n ? n.textContent.trim() : "";
  }

  function iconButton(label, svg) {
    const b = el("button", "sq__btn");
    b.type = "button";
    b.setAttribute("aria-label", label);
    b.innerHTML = svg;
    return b;
  }

  document.querySelectorAll("[data-squeeze]").forEach(build);

  function build(source) {
    const slides = [...source.querySelectorAll(".work-card")].map((card) => {
      const video = card.querySelector("video");
      const src = video && video.querySelector("source");
      return {
        src: src ? src.getAttribute("data-src") || src.getAttribute("src") || "" : "",
        poster: (video && video.getAttribute("poster")) || "",
        cat: text(card, ".work-card__cat"),
        title: text(card, ".work-card__title"),
        desc: text(card, ".work-card__desc"),
      };
    }).filter((s) => s.src);

    const count = slides.length;
    if (count < 2) return;

    const id = "sq" + ++uid;
    const label = source.getAttribute("data-squeeze-label") || "Videos";
    const format = source.getAttribute("data-squeeze-format") === "portrait" ? "portrait" : "landscape";
    const { shares: SHARES, stretched: STRETCHED, squeezed: SQUEEZED } = FORMATS[format];
    const slats = Math.max(1, Math.min(3, count - 4)); /* weniger Videos, kürzerer Schwanz */
    const visible = 4 + slats;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const canHover = window.matchMedia("(hover: hover)").matches;
    const wrap = (i) => ((i % count) + count) % count;
    const ms = () => (reduced.matches ? 0 : DURATION);

    /* --- Gerüst ----------------------------------------------------------- */

    const root = el("div", "sq sq--" + format);
    root.setAttribute("role", "region");
    root.setAttribute("aria-roledescription", "Karussell");
    root.setAttribute("aria-label", label);

    const inner = el("div", "sq__inner");
    inner.style.setProperty("--sq-slats", slats);

    const controls = el("div", "sq__controls");
    const soundBtn = iconButton("Ton", ICON_MUTED);
    soundBtn.setAttribute("aria-pressed", "false");
    const prevBtn = iconButton("Vorheriges Video", arrow(true));
    const nextBtn = iconButton("Nächstes Video", arrow(false));
    controls.append(soundBtn, prevBtn, nextBtn);

    const viewport = el("div", "sq__viewport");
    const strip = el("div", "sq__strip");
    strip.setAttribute("role", "tablist");
    strip.setAttribute("aria-label", label);
    viewport.append(strip);

    const panel = el("div", "sq__panel");
    panel.id = id + "-panel";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-live", "polite");
    const copies = slides.map((s) => {
      const copy = el("div", "sq__copy");
      const p = el("p", "sq__text");
      const t = el("span", "sq__title");
      t.textContent = s.title;
      p.append(t);
      if (s.desc) {
        const d = el("span", "sq__desc");
        d.textContent = s.desc;
        p.append(" ", d);
      }
      copy.append(p);
      panel.append(copy);
      return copy;
    });

    inner.append(controls, viewport, panel);
    root.append(inner);

    /* --- Zustand ---------------------------------------------------------- */

    let seed = 0;
    let cards = [];
    let column = 0;  /* Spalte einer Karte = Platz im Streifen + column */
    let slid = 0;    /* Verschiebung des Streifens in Lamellen */
    let still = false;
    let hover = -1;
    let timer = 0;
    let inView = false;
    let sound = false;
    /* Bei „Bewegung reduzieren“ oder Datensparmodus erst auf Tippen/Klick */
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    let playing = !reduced.matches && !saveData;

    const current = () => cards[-column];
    const colOf = (card) => cards.indexOf(card) + column;

    function makeCard(slide) {
      const s = slides[slide];
      const key = seed++;
      const btn = el("button", "sq__card");
      btn.type = "button";
      btn.id = `${id}-tab-${key}`;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-controls", panel.id);
      btn.setAttribute("aria-label", s.title);

      const v = el("video", "sq__media");
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute("muted", "");
      v.setAttribute("playsinline", "");
      v.preload = "none";
      if (s.poster) v.poster = s.poster;
      v.setAttribute("aria-hidden", "true");
      v.tabIndex = -1;

      const overlay = el("span", "sq__overlay");
      overlay.setAttribute("aria-hidden", "true");
      const tag = el("span", "sq__tag");
      tag.textContent = s.cat;
      overlay.append(tag);

      const play = el("span", "sq__play");
      play.setAttribute("aria-hidden", "true");
      play.innerHTML = ICON_PLAY;

      btn.append(v, overlay, play);

      const card = { key, slide, el: btn, video: v };
      btn.addEventListener("mousemove", () => {
        if (!canHover) return;
        const col = colOf(card);
        if (col !== hover) { hover = col; render(); }
      });
      btn.addEventListener("click", () => {
        const col = colOf(card);
        if (col > 0) step(col);
        else if (col === 0) { playing = !playing; syncVideos(); }
      });
      return card;
    }

    /* --- Darstellung ------------------------------------------------------ */

    function render() {
      const useHover = canHover && hover >= 0 && hover <= 3 && !reduced.matches;
      const share = (col) => (!useHover ? SHARES[col] : hover === col ? STRETCHED[col] : SQUEEZED[col]);
      /* Offenes Panel: Block plus Anteil, aber nie schmaler als --sq-open-min
         (greift nur im Hochformat bei wenig Höhe, z. B. Handy quer). Die
         übrigen Spalten teilen sich, was danach übrig ist. Ohne Mindestbreite
         ist das genau var(--sq-room) * Anteil. */
      const openW = `max(calc(var(--sq-hero) + var(--sq-room) * ${share(0)}), var(--sq-open-min))`;
      const widthOf = (col) =>
        col < 0 || col > 3 ? "var(--sq-slat)"
          : col === 0 ? openW
          : `calc((var(--sq-avail) - ${openW}) * ${share(col) / (1 - share(0))})`;

      strip.style.transition = still ? "none" : "transform var(--sq-ms) var(--sq-ease)";
      strip.style.transform = `translateX(calc(${slid} * (var(--sq-slat) + var(--sq-gap))))`;

      cards.forEach((card, place) => {
        const col = place + column;
        const w = widthOf(col);
        const front = col === 0;
        const st = card.el.style;
        /* Stil vor dem Einfügen setzen: neue Karten starten ohne Übergang */
        st.transitionDuration = still ? "0s" : "";
        st.width = w;
        st.marginLeft = place === 0 ? "0px" : col < 4 ? "var(--sq-gap)" : "var(--sq-slat-gap)";
        st.borderRadius = `min(var(--sq-radius), calc(${w} / 2))`;
        card.el.classList.toggle("is-front", front);
        card.el.setAttribute("aria-selected", String(front));
        card.el.tabIndex = front ? 0 : -1;
        const at = strip.children[place];
        if (at !== card.el) strip.insertBefore(card.el, at || null);
      });

      const open = current().slide;
      copies.forEach((copy, i) => {
        const shown = i === open;
        copy.classList.toggle("is-shown", shown);
        copy.setAttribute("aria-hidden", String(!shown));
      });

      syncVideos();
    }

    /* Nur das offene Video läuft, und nur solange das Karussell im Bild ist. */
    function syncVideos() {
      const front = current();
      cards.forEach((c) => {
        const v = c.video;
        if (c === front && inView && playing) {
          if (!v.getAttribute("src")) v.src = slides[c.slide].src;
          v.muted = !sound;
          if (v.paused) {
            const p = v.play();
            if (p) p.catch((err) => {
              if (!err || err.name !== "NotAllowedError") return; /* z. B. durch pause() abgebrochen */
              if (!v.muted) {
                /* Browser blockiert Ton ohne Interaktion: stumm weiterspielen */
                sound = false; updateSound(); v.muted = true;
                v.play().catch(() => { playing = false; syncVideos(); });
              } else {
                /* Autoplay ganz blockiert (z. B. iOS-Stromsparmodus): Play-Symbol zeigen */
                playing = false; syncVideos();
              }
            });
          }
        } else {
          if (!v.paused) v.pause();
          v.muted = true;
        }
      });
      root.classList.toggle("is-paused", !playing);
    }

    /* --- Bewegung --------------------------------------------------------- */

    function step(by) {
      if (!by) return;
      clearTimeout(timer);

      if (by > 0) {
        /* Neue Lamellen hängen sich in voller Größe hinten an, dann gleitet alles. */
        const last = cards[cards.length - 1].slide;
        for (let k = 0; k < by; k++) cards.push(makeCard(wrap(last + 1 + k)));
        column -= by;
        slid -= by;
        render();
      } else {
        /* Zurück wächst der Streifen vorne. Erst unsichtbar links davor setzen,
           dann zur neuen Position gleiten lassen. */
        const k = -by;
        const first = cards[0].slide;
        const fresh = [];
        for (let i = 0; i < k; i++) fresh.push(makeCard(wrap(first - k + i)));
        cards = fresh.concat(cards);
        column -= k;
        slid -= k;
        still = true;
        render();
        void strip.offsetWidth; /* Ausgangslage festschreiben */
        still = false;
        column += k;
        slid += k;
        render();
      }

      timer = setTimeout(settle, ms() + 20);
    }

    /* Nach der Bewegung den Streifen auf die sichtbaren Karten kürzen und die
       Zähler zurücksetzen: dasselbe Bild, also ohne Übergang. */
    function settle() {
      const start = -column;
      const keep = cards.slice(start, start + visible);
      cards.forEach((c) => {
        if (keep.includes(c)) return;
        c.video.pause();
        if (c.video.getAttribute("src")) { c.video.removeAttribute("src"); c.video.load(); }
        c.el.remove();
      });
      cards = keep;
      column = 0;
      slid = 0;
      still = true;
      render();
      void strip.offsetWidth;
      still = false;
      render();
    }

    /* --- Ton ------------------------------------------------------------- */

    function updateSound() {
      soundBtn.innerHTML = sound ? ICON_SOUND : ICON_MUTED;
      soundBtn.setAttribute("aria-pressed", String(sound));
    }

    /* Andere Videos der Seite stumm schalten, über deren eigenen Ton-Button,
       damit dessen Symbol stimmt. */
    function muteOthers() {
      document.querySelectorAll("video").forEach((v) => {
        if (root.contains(v) || v.muted) return;
        const card = v.closest(".work-card");
        const b = card && card.querySelector(".work-card__sound-btn");
        if (b) b.click(); else v.muted = true;
      });
    }

    soundBtn.addEventListener("click", () => {
      sound = !sound;
      if (sound) { playing = true; muteOthers(); }
      updateSound();
      syncVideos();
    });

    /* Bekommt ein anderes Video Ton, wird das Karussell stumm. */
    document.addEventListener("volumechange", (e) => {
      const v = e.target;
      if (sound && v instanceof HTMLVideoElement && !root.contains(v) && !v.muted) {
        sound = false;
        updateSound();
        syncVideos();
      }
    }, true);

    /* --- Bedienung -------------------------------------------------------- */

    prevBtn.addEventListener("click", () => step(-1));
    nextBtn.addEventListener("click", () => step(1));

    strip.addEventListener("keydown", (e) => {
      const by = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!by) return;
      e.preventDefault();
      step(by);
      current().el.focus({ preventScroll: true });
    });

    root.addEventListener("mouseleave", () => {
      if (hover !== -1) { hover = -1; render(); }
    });

    let sx = null, sy = 0;
    viewport.addEventListener("touchstart", (e) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    viewport.addEventListener("touchend", (e) => {
      if (sx === null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    }, { passive: true });
    viewport.addEventListener("touchcancel", () => { sx = null; }, { passive: true });

    new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      syncVideos();
    }, { threshold: 0.25 }).observe(viewport);

    if (reduced.addEventListener) reduced.addEventListener("change", render);

    /* --- Start ------------------------------------------------------------ */

    for (let p = 0; p < visible; p++) cards.push(makeCard(wrap(p)));
    render();
    source.replaceWith(root);
  }
})();
