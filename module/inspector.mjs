const ACTION_INFO = {
  roll: "Prepara y realiza este movimiento. Lo que haces puede explicarse por voz; el apunte escrito es opcional.",
  condition: "Añade una Condición cuando la ficción deje una consecuencia duradera.",
  clear: "Resuelve esta Condición después de una escena Afable o cuando lo indique la Guardiana.",
  crown: "Marca una Corona para elevar un resultado o introducir una escena de la vida de tu Experta.",
  home: "Añade un objeto querido. Evocarlo durante una tirada concede ventaja y normalmente lo deja marcado.",
  advance: "Gasta 5 PE para elegir uno de los avances todavía disponibles.",
  end: "Cierra la participación de esta Experta en la sesión y responde sus preguntas de experiencia.",
  theorize: "Selecciona las pistas incorporadas a la teoría y tira 2d6 + pistas − complejidad.",
  reveal: "Comparte con las jugadoras una pista o persona del expediente privado.",
  dossier: "Abre el expediente privado de la Guardiana para este misterio.",
  safety: "Pide una pausa inmediata para ajustar, rebobinar o retirar contenido de la escena.",
  create: "Crea una nueva Experta del Crimen y abre su cuaderno personal.",
  import: "Importa uno de los misterios incluidos y prepara su expediente privado.",
};

let popover;
let currentTarget;
let hoverTimer;
let pinned = false;
let persistent = false;

function close({ force = false } = {}) {
  clearTimeout(hoverTimer);
  if (pinned && !force) return;
  popover?.remove();
  popover = null;
  currentTarget = null;
  persistent = false;
  pinned = false;
}

function place(target) {
  const rect = target.getBoundingClientRect();
  const margin = 12;
  const width = Math.min(390, window.innerWidth - margin * 2);
  popover.style.width = `${width}px`;
  let left = Math.min(rect.left, window.innerWidth - width - margin);
  left = Math.max(margin, left);
  popover.style.left = `${left}px`;
  const height = popover.offsetHeight;
  const below = rect.bottom + margin;
  popover.style.top = `${below + height <= window.innerHeight ? below : Math.max(margin, rect.top - height - margin)}px`;
}

function show(target, mode) {
  const body = target.dataset.bbInfo?.trim();
  if (!body) return;
  close({ force: true });
  currentTarget = target;
  persistent = mode === "context";
  popover = document.createElement("aside");
  popover.className = `bb-info-popover ${persistent ? "persistent" : ""}`;
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", "Información contextual");
  const title = target.dataset.bbInfoTitle || target.getAttribute("aria-label") || "Información";
  popover.innerHTML = `<header><strong></strong><span><button type="button" data-bb-pin aria-label="Anclar esta información" title="Anclar"><i class="fas fa-thumbtack"></i></button><button type="button" data-bb-close aria-label="Cerrar información" title="Cerrar"><i class="fas fa-xmark"></i></button></span></header><p></p><small>${persistent ? "Pulsa fuera para cerrar o usa la chincheta para conservarla." : "Mueve el ratón para cerrar. Botón derecho para mantener."}</small>`;
  popover.querySelector("strong").textContent = title;
  popover.querySelector("p").textContent = body;
  document.body.append(popover);
  place(target);
  popover.querySelector("[data-bb-close]").addEventListener("click", () => close({ force: true }));
  popover.querySelector("[data-bb-pin]").addEventListener("click", (event) => {
    event.stopPropagation();
    pinned = !pinned;
    persistent = true;
    popover.classList.toggle("pinned", pinned);
    popover.querySelector("[data-bb-pin]").setAttribute("aria-pressed", String(pinned));
    popover.querySelector("small").textContent = pinned
      ? "Información anclada. Desancla la chincheta o usa el aspa para cerrar."
      : "Desanclada. Pulsa fuera para cerrar.";
  });
  if (mode === "hover") {
    const dismiss = () => {
      document.removeEventListener("mousemove", dismiss, true);
      if (!persistent && !pinned) close({ force: true });
    };
    setTimeout(() => document.addEventListener("mousemove", dismiss, true), 0);
  }
}

function describe(element) {
  if (element.dataset.bbInfo) return;
  const action = element.dataset.action;
  const actionInfo = ACTION_INFO[action];
  const title = element.getAttribute("aria-label") || element.querySelector?.("h3, summary, strong, label")?.textContent || element.textContent;
  const text = actionInfo || element.getAttribute("title") || element.textContent;
  const clean = text?.replace(/\s+/g, " ").trim();
  if (!clean || clean.length < 3) return;
  element.dataset.bbInfo = clean;
  element.dataset.bbInfoTitle ||= title?.replace(/\s+/g, " ").trim().slice(0, 90) || "Información";
}

export function attachInfo(root) {
  if (!root || root.dataset.bbInfoReady) return;
  root.dataset.bbInfoReady = "true";
  for (const element of root.querySelectorAll(
    "[data-bb-info], button, summary, label, .bb-card, .bb-clue, .bb-condition, .bb-status > span, .bb-stats > div, .bb-agenda li, .bb-note",
  )) describe(element);

  root.addEventListener("mouseenter", (event) => {
    const target = event.target.closest?.("[data-bb-info]");
    if (!target || !root.contains(target) || persistent || pinned) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => show(target, "hover"), 2000);
  }, true);
  root.addEventListener("mouseleave", (event) => {
    if (event.target.closest?.("[data-bb-info]")) clearTimeout(hoverTimer);
  }, true);
  root.addEventListener("contextmenu", (event) => {
    const target = event.target.closest?.("[data-bb-info]");
    if (!target || !root.contains(target)) return;
    event.preventDefault();
    show(target, "context");
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", (event) => {
    if (!popover || pinned || popover.contains(event.target) || currentTarget?.contains(event.target)) return;
    close({ force: true });
  }, true);
}
