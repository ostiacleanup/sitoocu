(function () {
  "use strict";
  window.OCUContact = { init };
  function init() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    const config = window.OCU_CONTACT_CONFIG || {};
    const status = form.querySelector("#form-msg");
    const button = form.querySelector('[type="submit"]');
    const widget = form.querySelector(".contact-turnstile");
    let widgetId, token = "", busy = false;
    const notice = (text, ok = false) => {
      status.className = "form__msg " + (ok ? "ok" : "err");
      status.textContent = text;
    };
    button.disabled = true;
    form.addEventListener("submit", submit);
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.endpoint || "") || !config.siteKey) {
      notice("Il modulo è in attivazione. Puoi scriverci a ostiacleanup@gmail.com.");
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => {
      widgetId = window.turnstile.render(widget, {
        sitekey: config.siteKey, action: "contact",
        callback: value => { token = value; button.disabled = busy; },
        "expired-callback": () => { token = ""; button.disabled = true; },
        "error-callback": () => {
          token = ""; button.disabled = true;
          notice("Verifica antispam non disponibile. Ricarica la pagina o scrivici a ostiacleanup@gmail.com.");
        }
      });
    };
    script.onerror = () => notice("Verifica antispam non disponibile. Scrivici a ostiacleanup@gmail.com.");
    document.head.append(script);

    function submit(event) {
      event.preventDefault();
      if (busy) return;
      if (!form.reportValidity()) return;
      if (!token) { notice("Completa la verifica antispam."); return; }
      const values = Object.fromEntries(new FormData(form));
      values.name = String(values.name || "").trim();
      values.email = String(values.email || "").trim();
      values.message = String(values.message || "").trim();
      if (!values.name || !values.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        notice("Compila tutti i campi con un indirizzo e-mail valido."); return;
      }
      const nonce = crypto.randomUUID();
      const iframe = document.createElement("iframe");
      iframe.name = "ocu-contact-" + nonce;
      iframe.title = "Risposta invio messaggio";
      iframe.hidden = true;
      const transport = document.createElement("form");
      transport.method = "POST";
      transport.action = config.endpoint;
      transport.target = iframe.name;
      transport.hidden = true;
      Object.entries({
        name: values.name, email: values.email, topic: values.topic,
        message: values.message, website: values.website || "",
        token, nonce, origin: window.location.origin
      }).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden"; input.name = name; input.value = value;
        transport.append(input);
      });
      busy = true;
      button.disabled = true;
      form.setAttribute("aria-busy", "true");
      notice("Invio in corso…");
      let finished = false;
      const timeout = setTimeout(() => finish(false,
        "Non è stato possibile confermare l’invio. Controlla prima di riprovare, oppure scrivici a ostiacleanup@gmail.com."
      ), 45000);
      // Apps Script HTML runs in a nested Google sandbox. A fresh random nonce
      // authenticates the response; Google's exact sandbox hostname may vary.
      function receive(event) {
        let hostname;
        try {
          const url = new URL(event.origin);
          if (url.protocol !== "https:") return;
          hostname = url.hostname;
        } catch { return; }
        const google = hostname === "script.google.com" ||
          hostname === "script.googleusercontent.com" ||
          hostname.endsWith("-script.googleusercontent.com") ||
          hostname.endsWith(".script.googleusercontent.com");
        const data = event.data;
        if (!google || !data || data.type !== "ocu-contact-result" || data.nonce !== nonce ||
            typeof data.ok !== "boolean" || typeof data.message !== "string") return;
        finish(data.ok, data.message);
      }
      function finish(ok, message) {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        window.removeEventListener("message", receive);
        transport.remove(); iframe.remove();
        busy = false; token = "";
        form.removeAttribute("aria-busy");
        if (ok) form.reset();
        notice(message, ok);
        button.disabled = true;
        window.turnstile.reset(widgetId);
      }
      window.addEventListener("message", receive);
      document.body.append(iframe, transport);
      try { transport.submit(); } catch {
        finish(false, "Invio non riuscito. Riprova o scrivici a ostiacleanup@gmail.com.");
      }
    }
  }
})();
