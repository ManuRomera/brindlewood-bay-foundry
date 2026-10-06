/**
 * Accesibilidad. Ajustes de cliente (cada persona los suyos, en su navegador) y un panel con un
 * icono en la cabecera de todas las ventanas del sistema, justo antes del de cerrar:
 * perfil visual, tamaño del texto, tipografía de alta legibilidad, reducir movimiento,
 * foco reforzado y ayuda inmediata. Solo cambian variables y clases del <body>; los
 * componentes no tienen casos especiales.
 */
import { ID } from "./rules.mjs";
import { ApplicationV2 } from "./compat.mjs";
import { rememberWindow } from "./window-state.mjs";
import { setInfoDelay } from "./inspector.mjs";

const PROFILES = ["standard", "dark", "contrast", "amber"];
const PROFILE_LABELS = { standard: "Estándar", dark: "Oscuro mate", contrast: "Alto contraste AAA", amber: "Ámbar" };
const BOXES = [
  ["readableFont", "Tipografía de alta legibilidad", "Sustituye la tipografía ornamental por una sans serif clara."],
  ["reduceMotion", "Reducir movimiento", "Sin animaciones ni transiciones en las ventanas del sistema."],
  ["strongFocus", "Foco de teclado reforzado", "Hace muy visible qué control tiene el foco al navegar con teclado."],
  ["quickHelp", "Ayuda inmediata", "La información de botones y pistas aparece al instante, sin esperar dos segundos."],
  ["autoCenterWindows", "Centrar ventanas al abrirlas", "Ignora la posición recordada y abre cada ventana centrada."],
];
export const PANEL_KEYS = ["visualProfile", "textScale", ...BOXES.map(([key]) => key)];

function setting(key, fallback) {
  try {
    return game.settings.get(ID, key);
  } catch (_) {
    return fallback;
  }
}

export function accessibilityState() {
  const profile = PROFILES.includes(setting("visualProfile", "standard")) ? setting("visualProfile", "standard") : "standard";
  return {
    profile,
    textScale: Math.min(160, Math.max(85, Number(setting("textScale", 100)) || 100)),
    reduceMotion: Boolean(setting("reduceMotion", false)),
    strongFocus: Boolean(setting("strongFocus", false)),
    readableFont: Boolean(setting("readableFont", false)),
    quickHelp: Boolean(setting("quickHelp", false)),
    autoCenterWindows: Boolean(setting("autoCenterWindows", false)),
    brightness: Number(setting("canvasBrightness", 1)),
    contrast: Number(setting("canvasContrast", 1)),
    saturation: Number(setting("canvasSaturation", 1)),
  };
}

export function applyAccessibility() {
  if (!document?.body) return;
  const state = accessibilityState();
  const body = document.body;
  for (const name of PROFILES)
    if (name !== "standard") body.classList.toggle(`bb-theme-${name}`, state.profile === name);
  body.classList.toggle("bb-reduce-motion", state.reduceMotion);
  body.classList.toggle("bb-strong-focus", state.strongFocus);
  body.classList.toggle("bb-readable-font", state.readableFont);

  const root = document.documentElement;
  root.style.setProperty("--bb-scale", String(state.textScale / 100));
  root.style.setProperty("--bb-canvas-brightness", String(state.brightness));
  root.style.setProperty("--bb-canvas-contrast", String(state.contrast));
  root.style.setProperty("--bb-canvas-saturation", String(state.saturation));
  body.classList.toggle("bb-canvas-filter", state.brightness !== 1 || state.contrast !== 1 || state.saturation !== 1);

  setInfoDelay(state.quickHelp ? 250 : 2000);
  const tooltip = game.tooltip?.constructor;
  if (tooltip) tooltip.TOOLTIP_ACTIVATION_MS = state.quickHelp ? 60 : 500;
}

async function toggleBoolean(key) {
  await game.settings.set(ID, key, !game.settings.get(ID, key));
  return true;
}

async function cycleProfile() {
  const current = game.settings.get(ID, "visualProfile");
  const index = Math.max(0, PROFILES.indexOf(current));
  await game.settings.set(ID, "visualProfile", PROFILES[(index + 1) % PROFILES.length]);
  return true;
}

export function registerAccessibility() {
  const refresh = () => {
    applyAccessibility();
    for (const app of foundry.applications.instances.values()) if (app instanceof AccessibilityPanel && app.rendered) app.render();
  };
  const reg = (key, data) => game.settings.register(ID, key, { scope: "client", config: true, onChange: refresh, ...data });
  reg("visualProfile", {
    type: String,
    default: "standard",
    choices: PROFILE_LABELS,
    name: "Accesibilidad · Perfil visual",
    hint: "Cambia la paleta solo en este cliente. El perfil estándar conserva el diseño original.",
  });
  reg("textScale", {
    type: Number,
    default: 100,
    range: { min: 85, max: 160, step: 5 },
    name: "Accesibilidad · Tamaño del texto (%)",
    hint: "Escala el texto de fichas, tablero, diálogos y tarjetas del chat. Ajuste de este navegador.",
  });
  for (const [key, name, hint] of BOXES)
    reg(key, { type: Boolean, default: false, name: `Accesibilidad · ${name}`, hint });
  reg("canvasBrightness", { type: Number, default: 1, range: { min: 0.4, max: 1.2, step: 0.05 }, name: "Accesibilidad · Brillo del lienzo", hint: "Ajusta solo la escena de juego. 1 mantiene el brillo original." });
  reg("canvasContrast", { type: Number, default: 1, range: { min: 0.7, max: 1.5, step: 0.05 }, name: "Accesibilidad · Contraste del lienzo", hint: "Ajusta solo la escena de juego. 1 mantiene el contraste original." });
  reg("canvasSaturation", { type: Number, default: 1, range: { min: 0, max: 1.5, step: 0.05 }, name: "Accesibilidad · Saturación del lienzo", hint: "Reduce o aumenta la intensidad del color de la escena. 1 mantiene el original." });

  const key = (id, name, hint, onDown) => game.keybindings.register(ID, id, { name: `Brindlewood Bay · ${name}`, hint, editable: [], onDown, restricted: false });
  key("cycleVisualProfile", "Cambiar perfil visual", "Alterna Estándar, Oscuro mate, Alto contraste y Ámbar.", cycleProfile);
  key("toggleLargeText", "Alternar texto ampliado", "Alterna entre el tamaño normal y el 130 %.", async () => {
    await game.settings.set(ID, "textScale", game.settings.get(ID, "textScale") > 100 ? 100 : 130);
    return true;
  });
  key("toggleReducedMotion", "Alternar movimiento reducido", "Activa o desactiva la reducción de animaciones.", () => toggleBoolean("reduceMotion"));
  key("toggleReadableFont", "Alternar tipografía de alta legibilidad", "Alterna entre la tipografía original y una sans serif clara.", () => toggleBoolean("readableFont"));

  // El icono va en la cabecera de toda ventana del sistema: fichas, salón, diálogos, diarios del manual.
  Hooks.on("renderApplicationV2", (app) => addHeaderButton(app));
}

export class AccessibilityPanel extends rememberWindow(ApplicationV2) {
  static MEMORIA = "accesibilidad";
  static CAMPOS_MEMORIA = ["left", "top"];
  static DEFAULT_OPTIONS = {
    id: "bb-accesibilidad",
    classes: ["bb-app", "bb-dialogo", "bb-a11y"],
    position: { width: 420, height: "auto" },
    window: { title: "Accesibilidad", icon: "fa-solid fa-universal-access" },
  };

  static open() {
    return (foundry.applications.instances.get("bb-accesibilidad") ?? new AccessibilityPanel()).render({ force: true });
  }

  async _renderHTML() {
    const state = accessibilityState();
    const profiles = PROFILES.map((id) => `<label class="bb-chip-radio"><input type="radio" name="visualProfile" value="${id}" ${state.profile === id ? "checked" : ""}><span>${PROFILE_LABELS[id]}</span></label>`).join("");
    const boxes = BOXES.map(([key, label, hint]) => `<label class="bb-check"><input type="checkbox" name="${key}" ${state[key] ? "checked" : ""}><span>${label}<small>${hint}</small></span></label>`).join("");
    return `<div class="bb-dialog">
      <fieldset class="bb-profiles"><legend>Perfil visual</legend><div class="bb-chip-group">${profiles}</div></fieldset>
      <label class="bb-scale"><span>Tamaño del texto <b>${state.textScale} %</b></span><input type="range" name="textScale" min="85" max="160" step="5" value="${state.textScale}" aria-label="Tamaño del texto"></label>
      ${boxes}
      <p class="bb-nota">Son ajustes de este navegador. El brillo, contraste y saturación del lienzo están en <b>Configuración → Ajustes del sistema</b>.</p>
      <div class="bb-actions"><button type="button" data-restablecer><i class="fa-solid fa-rotate-left"></i> Restablecer</button></div>
    </div>`;
  }

  _replaceHTML(html, content) {
    content.innerHTML = html;
    for (const input of content.querySelectorAll("input"))
      input.addEventListener("change", () => game.settings.set(ID, input.name, input.type === "checkbox" ? input.checked : input.type === "range" ? Number(input.value) : input.value));
    content.querySelector("input[type=range]")?.addEventListener("input", (event) => {
      event.target.closest("label").querySelector("b").textContent = `${event.target.value} %`;
    });
    content.querySelector("[data-restablecer]")?.addEventListener("click", async () => {
      for (const key of PANEL_KEYS) await game.settings.set(ID, key, game.settings.settings.get(`${ID}.${key}`).default);
    });
  }
}

/** El icono va en la cabecera, justo antes del de cerrar. Idempotente. */
export function addHeaderButton(app) {
  const root = app.element;
  if (!root || app instanceof AccessibilityPanel) return;
  const ours = root.classList?.contains("bb-app") || app.document?.pack?.startsWith(`${ID}.`);
  if (!ours) return;
  const header = root.querySelector(".window-header");
  if (!header || header.querySelector(".bb-a11y-button")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "header-control icon fa-solid fa-universal-access bb-a11y-button";
  button.dataset.tooltip = "Accesibilidad";
  button.setAttribute("aria-label", "Opciones de accesibilidad");
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    AccessibilityPanel.open();
  });
  const close = header.querySelector('[data-action="close"]');
  if (close) close.before(button);
  else header.append(button);
}
