(function () {
  "use strict";
  const container = document.getElementById("upcoming-events");
  const status = document.getElementById("upcoming-events-status");
  const config = window.OCU_EVENTS_CONFIG;
  if (!container || !status || !config) return;
  let events = [];
  let loaded = false;
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit"
  });
  function todayInRome() {
    const parts = Object.fromEntries(dateParts.formatToParts(new Date()).map(p => [p.type, p.value]));
    return parts.year + "-" + parts.month + "-" + parts.day;
  }
  function render() {
    if (!loaded) return;
    const today = todayInRome();
    const upcoming = events.filter(event =>
      typeof event.data_evento === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(event.data_evento) &&
      event.data_evento >= today
    ).sort((a, b) => a.data_evento.localeCompare(b.data_evento));
    container.replaceChildren();
    for (const event of upcoming) {
      const card = document.createElement("article");
      card.className = "card";
      const heading = document.createElement("h3");
      heading.textContent = event.nome || "Clean-up";
      const paragraph = document.createElement("p");
      const time = document.createElement("time");
      time.dateTime = event.data_evento;
      time.textContent = new Intl.DateTimeFormat("it-IT", {
        timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", year: "numeric"
      }).format(new Date(event.data_evento + "T12:00:00Z"));
      paragraph.append(time);
      const link = document.createElement("a");
      link.className = "more";
      link.href = "https://logistocu.pages.dev/iscriviti/" + encodeURIComponent(String(event.id));
      link.textContent = "Iscriviti";
      card.append(heading, paragraph, link);
      container.append(card);
    }
    status.textContent = upcoming.length
      ? "I prossimi clean-up: scegli un appuntamento e iscriviti."
      : "Non ci sono appuntamenti in programma. Seguici sui social per le prossime date.";
  }
  async function refresh() {
    try {
      const url = new URL(config.url + "/rest/v1/eventi");
      url.search = new URLSearchParams({
        select: "id,nome,data_evento", attivo: "eq.true",
        data_evento: "gte." + todayInRome(), order: "data_evento.asc"
      });
      const response = await fetch(url, {
        headers: { apikey: config.anonKey, Authorization: "Bearer " + config.anonKey },
        cache: "no-store", signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error("Eventi non disponibili");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Risposta eventi non valida");
      events = data;
      loaded = true;
      render();
    } catch {
      render();
      status.textContent = "Non riusciamo a caricare gli appuntamenti. Riprova tra poco o consulta i nostri canali social.";
    }
  }
  refresh();
  setInterval(render, 30000);
  setInterval(refresh, 300000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { render(); refresh(); }
  });
})();
