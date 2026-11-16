/* Scroll-Einblendung
   Überschriften erscheinen Wort für Wort aus der Unschärfe, Absätze gleiten
   zeilenweise hoch, Karten heben sich nacheinander an, Buttons kommen zuletzt.
   Ohne JS, bei „Bewegung reduzieren“ und beim Drucken bleibt alles sichtbar.
   Was beim Laden schon im Bild ist, wird nie versteckt. */
(function () {
  "use strict";

  /* ===== EINSTELLUNGEN: an die Website anpassen ===== */
  var BEREICH   = "main";            /* nur innerhalb dieses Elements animieren */
  var ZIELE = [                      /* Reihenfolge zählt: Äußeres zuerst */
    ["lift",   ".value-card, .work-card, .process-card, .photo-card, .about-visual, .contact-detail, .sq"],
    ["words",  "h2"],
    ["lines",  ".process-section__head > p, .cta-banner p"],
    ["action", ".cta-banner .btn, .section-header > .btn"]
  ];
  var GRUPPEN   = ".values__grid, .work-grid, .process-grid, .photo-grid, .contact-details";
  var AUSNAHMEN = ".hero, .page-hero, nav, footer, form, .contact-form-wrap, .legal-content";
  var LEISTE_UNTEN = ".mobile-bar";     /* gibt es auf dieser Website nicht */
  var GRUPPEN_ABSTAND = 100;            /* ms zwischen Geschwistern */
  /* ================================================== */

  var bereich = document.querySelector(BEREICH) || document.body;
  if (!("IntersectionObserver" in window) || typeof bereich.animate !== "function") return;
  var reduziert = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduziert.matches) return;

  var SANFT = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  var ARTEN = {
    words:  { dauer: 700,  schritt: 50, max: 350, warte: 0,   kurve: SANFT,
              von: { opacity: 0, filter: "blur(10px)" }, zu: { opacity: 1, filter: "blur(0)" } },
    lines:  { dauer: 1000, schritt: 80, max: 400, warte: 0,   kurve: SANFT,
              von: { opacity: 0, transform: "translateY(40px)" }, zu: { opacity: 1, transform: "none" } },
    lift:   { dauer: 1000, schritt: 0,  max: 0,   warte: 0,   kurve: "cubic-bezier(0.22, 1, 0.36, 1)",
              von: { opacity: 0, transform: "translateY(40px)" }, zu: { opacity: 1, transform: "none" } },
    action: { dauer: 600,  schritt: 0,  max: 0,   warte: 300, kurve: SANFT,
              von: { opacity: 0, transform: "translateY(24px)" }, zu: { opacity: 1, transform: "none" } }
  };

  var aktiv = [];
  var leiste = document.querySelector(LEISTE_UNTEN);
  var unten = (leiste && leiste.offsetHeight) || 0;

  /* Text in Wort-Spans zerlegen (Leerzeichen bleiben echte Leerzeichen) */
  function zerlegen(el) {
    var tokens = [];
    (function lauf(knoten) {
      Array.prototype.slice.call(knoten.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          if (!n.textContent.trim()) return;
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (teil) {
            if (!teil) return;
            if (/^\s+$/.test(teil)) { frag.appendChild(document.createTextNode(teil)); return; }
            var s = document.createElement("span");
            s.setAttribute("data-reveal-token", "");
            s.textContent = teil;
            frag.appendChild(s);
            tokens.push(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") {
          if (n.matches("svg, img, .tag")) {      /* als Ganzes einblenden */
            n.setAttribute("data-reveal-token", "");
            tokens.push(n);
          } else {
            lauf(n);
          }
        }
      });
    })(el);
    return tokens;
  }

  function fertig(el) {
    if (el._anims) el._anims.forEach(function (a) { a.cancel(); });
    el._anims = null;
    el.dataset.revealState = "complete";
    beobachter.unobserve(el);
  }

  function zeigen(el, verzug) {
    if (el.dataset.revealState !== "pending") return;
    var art = ARTEN[el.dataset.reveal];
    var teile = el._tokens && el._tokens.length ? el._tokens : [el];

    var stufen;   /* bei „lines“ die Zeile, sonst die Position */
    if (el.dataset.reveal === "lines" && teile.length > 1) {
      var zeilen = [];
      stufen = teile.map(function (t) {
        var top = t.getBoundingClientRect().top;
        var i = zeilen.findIndex(function (z) { return Math.abs(z - top) < 2; });
        if (i === -1) { zeilen.push(top); i = zeilen.length - 1; }
        return i;
      });
    } else {
      stufen = teile.map(function (t, i) { return i; });
    }
    var hoechste = Math.max.apply(null, stufen);
    var schritt = Math.min(art.schritt, art.max / Math.max(1, hoechste));

    el._anims = teile.map(function (t, i) {
      return t.animate([art.von, art.zu], {
        duration: art.dauer,
        delay: art.warte + verzug + stufen[i] * schritt,
        easing: art.kurve,
        fill: "both"
      });
    });
    el.dataset.revealState = "running";
    Promise.all(el._anims.map(function (a) { return a.finished; }))
      .then(function () { fertig(el); }, function () {});
  }

  var beobachter = new IntersectionObserver(function (eintraege) {
    var jetzt = [];
    eintraege.forEach(function (e) {
      if (e.isIntersecting) jetzt.push(e.target);
      else if (e.boundingClientRect.bottom <= 0) fertig(e.target);  /* schon vorbeigescrollt */
    });
    jetzt.sort(function (a, b) {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    var zaehler = new Map();
    jetzt.forEach(function (el) {
      beobachter.unobserve(el);
      var gruppe = el.parentElement && el.parentElement.closest(GRUPPEN);
      var nr = gruppe ? (zaehler.get(gruppe) || 0) : 0;
      if (gruppe) zaehler.set(gruppe, nr + 1);
      var verzug = Math.min(nr * GRUPPEN_ABSTAND, 400);
      var los = function () { zeigen(el, verzug); };
      if (el._tokens && document.fonts && document.fonts.status === "loading") {
        document.fonts.ready.then(los, los);   /* Zeilen erst nach dem Schriftladen messen */
      } else {
        los();
      }
    });
  }, { threshold: 0, rootMargin: "0px 0px -" + (24 + unten) + "px 0px" });

  ZIELE.forEach(function (ziel) {
    bereich.querySelectorAll(ziel[1]).forEach(function (el) {
      if (el.closest(AUSNAHMEN) || el.closest("[data-reveal]")) return;
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight - unten && r.bottom > 0) return;  /* schon im Bild */
      el.dataset.reveal = ziel[0];
      if (ziel[0] === "words" || ziel[0] === "lines") el._tokens = zerlegen(el);
      el.dataset.revealState = "pending";
      aktiv.push(el);
      beobachter.observe(el);
    });
  });

  function alleZeigen() { aktiv.forEach(fertig); }

  /* Tastatur: Fokus in verstecktem Inhalt zeigt ihn sofort */
  bereich.addEventListener("focusin", function (e) {
    var el = e.target.closest && e.target.closest('[data-reveal-state="pending"], [data-reveal-state="running"]');
    if (el) fertig(el);
  });
  window.addEventListener("beforeprint", alleZeigen);
  if (reduziert.addEventListener) reduziert.addEventListener("change", function () {
    if (reduziert.matches) alleZeigen();
  });
})();
