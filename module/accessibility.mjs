import { ID } from "./rules.mjs";

const PROFILES = ["standard", "dark", "contrast", "amber"];

function setting(key, fallback) {
  try {
    return game.settings.get(ID, key);
  } catch (_) {
    return fallback;
  }
}

export function accessibilityState() {
  const profile = PROFILES.includes(setting("visualProfile", "standard"))
    ? setting("visualProfile", "standard")
    : "standard";
  return {
    profile,
    largeText: Boolean(setting("largeText", false)),
    reduceMotion: Boolean(setting("reduceMotion", false)),
    strongFocus: Boolean(setting("strongFocus", false)),
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
  body.classList.toggle("bb-large", state.largeText);
  body.classList.toggle("bb-reduce-motion", state.reduceMotion);
  body.classList.toggle("bb-strong-focus", state.strongFocus);

  const root = document.documentElement;
  root.style.setProperty("--bb-canvas-brightness", String(state.brightness));
  root.style.setProperty("--bb-canvas-contrast", String(state.contrast));
  root.style.setProperty("--bb-canvas-saturation", String(state.saturation));
  body.classList.toggle(
    "bb-canvas-filter",
    state.brightness !== 1 || state.contrast !== 1 || state.saturation !== 1,
  );
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
  const refresh = () => applyAccessibility();
  game.settings.register(ID, "visualProfile", {
    scope: "client",
    config: true,
    type: String,
    default: "standard",
    choices: {
      standard: "Estándar",
      dark: "Oscuro mate",
      contrast: "Alto contraste AAA",
      amber: "Ámbar",
    },
    name: "Accesibilidad · Perfil visual",
    hint: "Cambia la paleta solo en este cliente. El perfil estándar conserva el diseño original.",
    onChange: refresh,
  });
  game.settings.register(ID, "largeText", {
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    name: "Accesibilidad · Texto ampliado",
    hint: "Aumenta el tamaño de texto en fichas, tablero y tarjetas del chat.",
    onChange: refresh,
  });
  game.settings.register(ID, "reduceMotion", {
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    name: "Accesibilidad · Reducir movimiento",
    hint: "Desactiva animaciones y transiciones del sistema.",
    onChange: refresh,
  });
  game.settings.register(ID, "strongFocus", {
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    name: "Accesibilidad · Foco de teclado reforzado",
    hint: "Hace mucho más visible qué control tiene el foco al navegar con teclado.",
    onChange: refresh,
  });
  game.settings.register(ID, "autoCenterWindows", {
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    name: "Accesibilidad · Centrar ventanas",
    hint: "Ignora la posición recordada y abre las ventanas del sistema centradas en pantalla.",
  });
  game.settings.register(ID, "canvasBrightness", {
    scope: "client",
    config: true,
    type: Number,
    default: 1,
    range: { min: 0.4, max: 1.2, step: 0.05 },
    name: "Accesibilidad · Brillo del lienzo",
    hint: "Ajusta solo la escena de juego. 1 mantiene el brillo original.",
    onChange: refresh,
  });
  game.settings.register(ID, "canvasContrast", {
    scope: "client",
    config: true,
    type: Number,
    default: 1,
    range: { min: 0.7, max: 1.5, step: 0.05 },
    name: "Accesibilidad · Contraste del lienzo",
    hint: "Ajusta solo la escena de juego. 1 mantiene el contraste original.",
    onChange: refresh,
  });
  game.settings.register(ID, "canvasSaturation", {
    scope: "client",
    config: true,
    type: Number,
    default: 1,
    range: { min: 0, max: 1.5, step: 0.05 },
    name: "Accesibilidad · Saturación del lienzo",
    hint: "Reduce o aumenta la intensidad del color de la escena. 1 mantiene el original.",
    onChange: refresh,
  });

  game.keybindings.register(ID, "cycleVisualProfile", {
    name: "Brindlewood Bay · Cambiar perfil visual",
    hint: "Alterna Estándar, Oscuro mate, Alto contraste y Ámbar.",
    editable: [],
    onDown: cycleProfile,
    restricted: false,
  });
  game.keybindings.register(ID, "toggleLargeText", {
    name: "Brindlewood Bay · Alternar texto ampliado",
    hint: "Activa o desactiva el texto ampliado.",
    editable: [],
    onDown: () => toggleBoolean("largeText"),
    restricted: false,
  });
  game.keybindings.register(ID, "toggleReducedMotion", {
    name: "Brindlewood Bay · Alternar movimiento reducido",
    hint: "Activa o desactiva la reducción de animaciones.",
    editable: [],
    onDown: () => toggleBoolean("reduceMotion"),
    restricted: false,
  });
}
