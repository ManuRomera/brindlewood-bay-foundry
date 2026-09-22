// Ajusta únicamente el encuadre del fondo en la pantalla de acceso al mundo
// (el "Join Game" que Foundry construye a partir de system.json → "background").
// No existe forma de fijar background-position desde el manifiesto, así que
// esta pequeña utilidad reposiciona ese fondo por CSS mientras la pantalla de
// acceso sigue presente en el DOM, y no toca nada una vez el mundo ha cargado.

const JOIN_SCREEN_ID = "join-game";
const BACKGROUND_POSITION = "center 8%";
const BACKGROUND_SIZE = "cover";

function isJoinScreenActive() {
  return !!document.getElementById(JOIN_SCREEN_ID);
}

function applyJoinScreenBackground() {
  if (!isJoinScreenActive()) return false;
  const { style } = document.body;
  if (style.getPropertyValue("background-position") !== BACKGROUND_POSITION)
    style.setProperty("background-position", BACKGROUND_POSITION, "important");
  if (style.getPropertyValue("background-size") !== BACKGROUND_SIZE)
    style.setProperty("background-size", BACKGROUND_SIZE, "important");
  return true;
}

function clearJoinScreenBackground() {
  document.body.style.removeProperty("background-position");
  document.body.style.removeProperty("background-size");
}

/**
 * Repositions the world's background image (assets/cover.png) so the title
 * isn't cropped on the world join screen, without touching the background
 * used once inside the game (e.g. behind a scene-less canvas) or any other
 * system's styling.
 */
export function initJoinScreenBackground() {
  applyJoinScreenBackground();

  const observer = new MutationObserver(() => {
    if (!applyJoinScreenBackground()) {
      observer.disconnect();
      clearJoinScreenBackground();
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ["style"], childList: true });

  Hooks.once("setup", applyJoinScreenBackground);
  Hooks.once("ready", () => {
    observer.disconnect();
    clearJoinScreenBackground();
  });
}
