/* =====================================================================
   OSTIA CLEAN-UP — script.js
   Vanilla JS, nessuna dipendenza. Ottimizzato per Cloudflare Pages.
   - Menu hamburger (mobile)
   - Header con stato "scrolled"
   - Reveal allo scroll (IntersectionObserver)
   - Contatori animati 0 → valore
   - Validazione form + captcha matematico
   - Look switcher (anteprima brand — vedi nota in fondo)
   ===================================================================== */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Year ---------- */
  function setYear() {
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  }

  /* ---------- Hamburger / mobile nav ---------- */
  function initNav() {
    const burger = $(".hamburger");
    const links = $("#nav-links");
    const backdrop = $(".nav-backdrop");
    if (!burger || !links) return;

    const closeBtn = $(".nav-close", links);
    const mobileNav = window.matchMedia("(max-width: 1199px)");
    if (backdrop) backdrop.hidden = false;
    const setOpen = (open) => {
      burger.setAttribute("aria-expanded", String(open));
      links.classList.toggle("open", open);
      backdrop && backdrop.classList.toggle("open", open);
      document.body.style.overflow = open ? "hidden" : "";
      if (open) closeBtn && closeBtn.focus();
    };
    burger.addEventListener("click", () =>
      setOpen(burger.getAttribute("aria-expanded") !== "true")
    );
    closeBtn && closeBtn.addEventListener("click", () => { setOpen(false); burger.focus(); });
    backdrop && backdrop.addEventListener("click", () => setOpen(false));
    $$("#nav-links a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        burger.focus();
      }
      if (e.key === "Tab" && mobileNav.matches && burger.getAttribute("aria-expanded") === "true") {
        const items = $$("button, a[href]", links);
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener("resize", () => {
      if (!mobileNav.matches) setOpen(false);
    });
  }

  /* ---------- Header scrolled state ---------- */
  function initHeader() {
    const header = $(".site-header");
    if (!header) return;
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Scroll reveal ----------
     Usa IntersectionObserver come miglioria, con un fallback basato su
     getBoundingClientRect (scroll/resize) che garantisce il reveal anche
     dove l'observer non scatta. Una safety net rivela comunque tutto. */
  function inViewport(el, margin) {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return r.top < vh * (1 - margin) && r.bottom > 0;
  }
  function initReveal() {
    const items = $$(".reveal");
    if (!items.length) return;
    if (reduceMotion) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    let pending = new Set(items);
    const show = (el) => {
      el.classList.add("in");
      pending.delete(el);
    };
    const check = () => {
      pending.forEach((el) => {
        if (inViewport(el, 0.08)) show(el);
      });
      if (!pending.size) window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => requestAnimationFrame(check);

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              show(e.target);
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      items.forEach((el) => io.observe(el));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("load", check);
    // poll i primi istanti (copre layout/innerHeight non ancora pronti)
    let polls = 0;
    const poll = setInterval(() => {
      check();
      if (!pending.size || ++polls > 14) clearInterval(poll);
    }, 120);
    requestAnimationFrame(check);
    // safety net: non lasciare mai contenuto nascosto
    setTimeout(() => items.forEach((el) => el.classList.add("in")), 1800);
  }

  /* ---------- Animated counters ---------- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count || "0");
    const dur = 1600;
    const dec = parseInt(el.dataset.decimals || "0", 10);
    if (reduceMotion) {
      el.textContent = target.toLocaleString("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec });
      return;
    }
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const val = target * ease(p);
      el.textContent = val.toLocaleString("it-IT", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      });
      if (p < 1) requestAnimationFrame(tick);
      else
        el.textContent = target.toLocaleString("it-IT", {
          minimumFractionDigits: dec,
          maximumFractionDigits: dec,
        });
    }
    requestAnimationFrame(tick);
  }
  function initCounters() {
    const nums = $$("[data-count]");
    if (!nums.length) return;
    const done = new WeakSet();
    const run = (el) => {
      if (done.has(el)) return;
      done.add(el);
      animateCount(el);
    };
    const check = () => nums.forEach((n) => inViewport(n, 0.15) && run(n));

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              run(e.target);
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      nums.forEach((n) => io.observe(n));
    }
    window.addEventListener("scroll", () => requestAnimationFrame(check), { passive: true });
    window.addEventListener("load", check);
    let polls = 0;
    const poll = setInterval(() => {
      check();
      if (nums.every((n) => done.has(n)) || ++polls > 14) clearInterval(poll);
    }, 120);
    requestAnimationFrame(check);
    // safety net
    setTimeout(() => nums.forEach(run), 1900);
  }

  /* ---------- Contact form: Apps Script + Turnstile ---------- */
  function initForm() {
    if (window.OCUContact) window.OCUContact.init();
  }

  /* ---------- Look switcher (ANTEPRIMA) ----------
     Permette di confrontare i 3 look del rebranding.
     >>> Per il sito definitivo: scegli un look, imposta
         <html data-look="..."> e rimuovi questo blocco
         insieme all'elemento .look-switch nell'HTML. <<< */
  function initLookSwitch() {
    const wrap = $(".look-switch");
    if (!wrap) return;
    const toggle = $(".look-switch__toggle", wrap);
    const label  = $(".look-switch__label", wrap);

    const saved = localStorage.getItem("ocu-look");
    if (saved) document.documentElement.setAttribute("data-look", saved);

    const setOpen = (open) => {
      wrap.setAttribute("data-open", String(open));
      toggle && toggle.setAttribute("aria-expanded", String(open));
    };

    const sync = () => {
      const cur = document.documentElement.getAttribute("data-look") || "marea";
      $$("button[data-look]", wrap).forEach((b) => b.classList.toggle("on", b.dataset.look === cur));
      if (label) label.textContent = cur.charAt(0).toUpperCase() + cur.slice(1);
      const tc = getComputedStyle(document.documentElement).getPropertyValue("--theme-color").trim();
      const meta = $('meta[name="theme-color"]');
      if (meta && tc) meta.setAttribute("content", tc);
    };

    toggle && toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(wrap.getAttribute("data-open") !== "true");
    });

    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-look]");
      if (!btn) return;
      document.documentElement.setAttribute("data-look", btn.dataset.look);
      localStorage.setItem("ocu-look", btn.dataset.look);
      setOpen(false);
      sync();
    });

    document.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

    sync();
  }

  /* ---------- Hero carousel ---------- */
  function initHeroCarousel() {
    const slides = $$(".hero__slide");
    if (slides.length < 2) return;
    let cur = 0;
    setInterval(() => {
      slides[cur].classList.remove("active");
      cur = (cur + 1) % slides.length;
      slides[cur].classList.add("active");
    }, 4500);
  }

  /* ---------- Logo splash ---------- */
  function initLogoSplash() {
    if (reduceMotion) return;
    const brand = $(".brand");
    if (!brand) return;

    const pathD =
      "M199.43 272.39 C215.58 258.13 230.77 244.73 247.16 230.27 C278.02 277.21 308.31 323.29" +
      " 339.38 370.55 C333.93 371.63 331.35 372.15 326.83 373.04 C341.42 386.43 354.61 398.52" +
      " 367.79 410.62 C368.26 410.19 368.73 409.75 369.20 409.32 C364.72 391.92 360.24 374.53" +
      " 355.49 356.09 C352.84 359.26 350.94 361.53 347.38 365.78 C320.44 315.76 294.30 267.21" +
      " 267.72 217.87 C288.50 210.29 307.67 203.29 326.45 196.44 C329.94 210.35 332.34 223.41" +
      " 336.58 235.84 C340.95 248.61 346.44 261.13 352.72 273.10 C358.86 284.81 366.30 295.88" +
      " 373.74 306.85 C381.08 317.68 389.14 328.02 396.88 338.57 C397.54 338.13 398.19 337.69" +
      " 398.84 337.24 C393.67 320.37 388.50 303.50 382.92 285.27 C380.70 288.93 379.26 291.31" +
      " 377.82 293.68 C376.85 293.77 375.89 293.87 374.92 293.96 C367.13 272.86 358.75 251.95" +
      " 351.72 230.60 C344.63 209.08 343.99 186.72 347.44 162.72 C325.98 171.71 306.09 180.12" +
      " 286.14 188.37 C272.07 194.19 265.95 192.11 257.44 179.48 C253.84 174.14 250.82 167.23" +
      " 245.68 164.36 C236.11 159.01 232.01 150.20 226.89 141.79 C221.16 132.39 215.57 122.92" +
      " 209.95 113.46 C203.09 101.93 196.27 90.39 189.40 78.80 C281.76 32.64 413.36 59.63" +
      " 476.59 169.67 C537.79 276.18 499.82 413.18 392.85 473.40 C284.77 534.25 148.26 495.77" +
      " 88.42 387.02 C28.29 277.74 71.68 150.51 161.52 94.39 C177.23 120.74 192.94 147.09" +
      " 208.62 173.45 C209.26 174.53 209.60 175.80 209.99 177.01 C212.76 185.75 214.63 194.90" +
      " 218.44 203.14 C224.65 216.55 224.18 222.42 212.80 231.90 C200.36 242.25 187.62 252.24" +
      " 175.10 262.49 C170.53 266.24 166.22 270.30 160.91 275.01 C164.00 275.85 165.26 276.11" +
      " 166.46 276.52 C194.83 286.25 270.48 355.61 260.81 363.88 L253.55 363.88 C266.66 376.29" +
      " 279.53 388.46 290.98 399.31 C270.22 352.37 246.26 305.03 199.43 272.39" +
      " M42.34 279.65 C42.33 414.07 150.02 520.95 285.42 520.92 C417.09 520.90 524.63 411.81" +
      " 524.59 278.33 C524.55 146.16 415.84 38.47 282.65 38.67 C149.59 38.87 42.35 146.41 42.34 279.65";

    const splash = document.createElement("div");
    splash.id = "logo-splash";
    splash.setAttribute("aria-hidden", "true");
    splash.innerHTML =
      '<div class="splash__inner">' +
        '<svg class="splash__svg" viewBox="16.3 20.6 533.5 525.6" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<circle class="splash__ring" cx="283.5" cy="287" r="241" fill="none" stroke="currentColor" stroke-width="3"/>' +
          '<g transform="translate(0 566.8) scale(1 -1)">' +
            '<path class="splash__fill" fill="currentColor" fill-rule="evenodd" d="' + pathD + '"/>' +
          "</g>" +
        "</svg>" +
        '<p class="splash__name">Ostia Clean-Up</p>' +
        '<p class="splash__sub">Litorale di Roma</p>' +
      "</div>";
    document.body.appendChild(splash);

    let busy = false;

    function closeSplash() {
      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        splash.classList.remove("splash--open", "splash--closing");
        splash.setAttribute("aria-hidden", "true");
        const ring = splash.querySelector(".splash__ring");
        const fill = splash.querySelector(".splash__fill");
        [ring, fill].forEach((el) => {
          if (!el) return;
          el.style.animation = "none";
          void el.offsetWidth;
          el.style.animation = "";
        });
        busy = false;
        window.location.href = brand.getAttribute("href") || "index.html";
      };
      splash.classList.add("splash--closing");
      splash.addEventListener("transitionend", function onEnd(e) {
        if (e.propertyName !== "clip-path") return;
        splash.removeEventListener("transitionend", onEnd);
        cleanup();
      });
      setTimeout(cleanup, 600);
    }

    function openSplash() {
      if (busy) return;
      busy = true;
      splash.removeAttribute("aria-hidden");
      splash.classList.add("splash--open");
      setTimeout(closeSplash, 2200);
    }

    brand.addEventListener("click", (e) => {
      e.preventDefault();
      openSplash();
    });
  }

  /* ---------- Donate modal ---------- */
  function initDonateModal() {
    const overlay = $("#modal-dona");
    if (!overlay) return;
    const open = () => { overlay.removeAttribute("hidden"); document.body.style.overflow = "hidden"; };
    const close = () => { overlay.setAttribute("hidden", ""); document.body.style.overflow = ""; };
    document.querySelectorAll("[data-modal='dona']").forEach(btn => btn.addEventListener("click", open));
    overlay.addEventListener("click", e => { if (e.target === overlay || e.target.closest(".modal__close")) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !overlay.hasAttribute("hidden")) close(); });
  }

  /* ---------- Scroll cue ---------- */
  function initScrollCue() {
    const btn = $(".hero__scroll");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const next = $(".hero")?.nextElementSibling;
      if (next) next.scrollIntoView({ behavior: "smooth" });
    });
  }

  /* ---------- Logo marquee (partner / press) ---------- */
  function initMarquee() {
    $$(".marquee").forEach((m) => {
      const track = m.querySelector(".marquee__track");
      if (!track || track.dataset.cloned) return;
      // duplica gli elementi: quando si arriva a metà si torna indietro di mezza riga senza stacchi
      Array.from(track.children).forEach((li) => {
        const c = li.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        c.querySelectorAll("img").forEach((img) => (img.alt = ""));
        c.querySelectorAll("a").forEach((a) => a.setAttribute("tabindex", "-1"));
        track.appendChild(c);
      });
      track.dataset.cloned = "1";
      m.classList.add("marquee--on");

      const dir = m.classList.contains("marquee--reverse") ? -1 : 1;
      const speed = parseFloat(m.dataset.speed || "45"); // px al secondo
      const half = () => track.scrollWidth / 2;
      let pos = dir < 0 ? half() : 1;
      m.scrollLeft = pos;

      // riporta la posizione dentro la prima metà (giro infinito in entrambe le direzioni)
      const wrap = (x) => {
        const h = half();
        if (h <= 0) return x;
        if (x >= h) return x - h;
        if (x <= 0) return x + h;
        return x;
      };

      let hover = false, touching = false, dragging = false, holdUntil = 0;
      const hold = (ms) => { holdUntil = performance.now() + ms; };

      m.addEventListener("mouseenter", () => (hover = true));
      m.addEventListener("mouseleave", () => (hover = false));
      m.addEventListener("touchstart", () => (touching = true), { passive: true });
      m.addEventListener("touchend", () => { touching = false; hold(2500); }, { passive: true });
      m.addEventListener("wheel", () => hold(1500), { passive: true });

      // trascinamento col mouse: niente drag nativo di link e immagini
      m.querySelectorAll("a, img").forEach((el) => el.setAttribute("draggable", "false"));
      m.addEventListener("dragstart", (e) => e.preventDefault());
      let downX = 0, startScroll = 0, moved = false, down = false;
      m.addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        down = true; moved = false; downX = e.clientX; startScroll = m.scrollLeft;
      });
      window.addEventListener("pointermove", (e) => {
        if (!down) return;
        const dx = e.clientX - downX;
        if (!moved && Math.abs(dx) > 5) { moved = true; dragging = true; m.classList.add("marquee--dragging"); }
        if (!moved) return;
        let target = startScroll - dx;
        const wrapped = wrap(target);
        if (wrapped !== target) { startScroll += wrapped - target; target = wrapped; }
        m.scrollLeft = target;
      });
      window.addEventListener("pointerup", () => {
        if (!down) return;
        down = false; dragging = false; m.classList.remove("marquee--dragging"); hold(1500);
      });
      // dopo un trascinamento non aprire il link sotto il mouse
      m.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

      let last = performance.now();
      const tick = (now) => {
        const dt = Math.min(now - last, 50) / 1000;
        last = now;
        const auto = !reduceMotion && !hover && !touching && !dragging && now > holdUntil;
        if (auto) {
          pos = wrap(pos + dir * speed * dt);
          m.scrollLeft = pos;
        } else {
          const cur = m.scrollLeft, w = wrap(cur);
          if (w !== cur && !touching) m.scrollLeft = w;
          pos = w;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    setYear();
    initNav();
    initHeader();
    initReveal();
    initCounters();
    initForm();
    initLookSwitch();
    initHeroCarousel();
    initLogoSplash();
    initScrollCue();
    initDonateModal();
    initMarquee();
  });
})();
