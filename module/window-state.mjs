/**
 * Memoria de ventanas. Cada ventana del sistema recuerda, por persona y mundo:
 * posición y tamaño, pestaña activa, secciones plegables, desplazamiento y cualquier
 * valor suelto que la hoja quiera guardar. Una hoja nueva hereda el último tamaño
 * usado para su clase de ventana.
 *
 * Vive en localStorage: es una preferencia de este navegador, no un dato del mundo.
 */
import { ID } from "./rules.mjs";

const PREFIX = `${ID}.ventana.`;
const margin = 12;
const CAMPOS = ["left", "top", "width", "height"];

const clave = (id) => `${PREFIX}${game.world?.id}.${game.user?.id}.${id}`;

export function leer(id) {
  try {
    return JSON.parse(localStorage.getItem(clave(id))) ?? {};
  } catch {
    return {};
  }
}

function escribir(id, cambios) {
  try {
    localStorage.setItem(clave(id), JSON.stringify({ ...leer(id), ...cambios }));
  } catch (error) {
    console.warn(`${ID} | No se pudo guardar la ventana`, error);
  }
}

const numericos = (pos, campos) =>
  Object.fromEntries(campos.filter((c) => Number.isFinite(pos?.[c])).map((c) => [c, Math.round(pos[c])]));

export function fitWindow(position, viewport = {}) {
  const viewportWidth = Math.max(640, viewport.width ?? window.innerWidth);
  const viewportHeight = Math.max(480, viewport.height ?? window.innerHeight);
  const width = Math.min(Number(position.width) || 700, viewportWidth - margin * 2);
  const height = Math.min(Number(position.height) || 650, viewportHeight - margin * 2);
  return {
    width,
    height,
    left: Math.max(margin, Math.min(Number(position.left) || margin, viewportWidth - width - margin)),
    top: Math.max(margin, Math.min(Number(position.top) || margin, viewportHeight - height - margin)),
  };
}

export function centerWindow(position, viewport = {}) {
  const viewportWidth = Math.max(640, viewport.width ?? window.innerWidth);
  const viewportHeight = Math.max(480, viewport.height ?? window.innerHeight);
  const fitted = fitWindow(position, { width: viewportWidth, height: viewportHeight });
  return {
    ...fitted,
    left: Math.max(margin, Math.round((viewportWidth - fitted.width) / 2)),
    top: Math.max(margin, Math.round((viewportHeight - fitted.height) / 2)),
  };
}

/**
 * @param {typeof foundry.applications.api.ApplicationV2} Base
 * Opciones estáticas que puede declarar la subclase:
 *  - MEMORIA: identificador fijo (ventanas únicas). Las hojas usan el uuid del documento.
 *  - CAMPOS_MEMORIA: qué dimensiones recordar (los diálogos de alto automático omiten height).
 *  - SCROLL_MEMORIA: selectores cuyo desplazamiento se recuerda.
 */
export function rememberWindow(Base) {
  return class RememberedWindow extends Base {
    static CAMPOS_MEMORIA = CAMPOS;

    constructor(options = {}) {
      const Clase = new.target;
      const id = options.memoria ?? options.document?.uuid ?? Clase.MEMORIA ?? Clase.name;
      const propia = leer(id);
      const heredada = propia.posicion ? {} : numericos(leer(`clase.${Clase.name}`).posicion, ["width", "height"]);
      const guardada = numericos(propia.posicion, Clase.CAMPOS_MEMORIA);
      super({ ...options, position: { ...options.position, ...heredada, ...guardada } });
      this._memoria = { id, valores: propia.valores ?? {}, secciones: propia.secciones ?? {}, scroll: propia.scroll ?? {}, restaurada: false };
    }

    /** Valor suelto recordado (pestaña, filtro…). */
    recordado(nombre, porDefecto = undefined) {
      return this._memoria.valores[nombre] ?? porDefecto;
    }

    recordar(nombre, valor) {
      this._memoria.valores[nombre] = valor;
      escribir(this._memoria.id, { valores: this._memoria.valores });
    }

    /** Guardar al moverse o redimensionar (el motor llama a esto tras cada setPosition). */
    _onPosition(position) {
      super._onPosition?.(position);
      if (!this.rendered || !this._memoria.restaurada) return;
      clearTimeout(this._memoria.temporizador);
      this._memoria.temporizador = setTimeout(() => this.#guardarPosicion(), 250);
    }

    #guardarPosicion() {
      // Minimizada, la altura es la de la barra de título: solo vale la posición.
      const campos = this.minimized ? ["left", "top"] : this.constructor.CAMPOS_MEMORIA;
      const pos = numericos(this.position, campos);
      escribir(this._memoria.id, { posicion: { ...leer(this._memoria.id).posicion, ...pos } });
      if (!this.minimized) escribir(`clase.${this.constructor.name}`, { posicion: numericos(this.position, ["width", "height"]) });
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      for (const d of this.element.querySelectorAll("details[data-memoria]")) {
        const guardado = this._memoria.secciones[d.dataset.memoria];
        if (guardado !== undefined) d.open = guardado;
        d.addEventListener("toggle", () => {
          this._memoria.secciones[d.dataset.memoria] = d.open;
          escribir(this._memoria.id, { secciones: this._memoria.secciones });
        });
      }
      if (this._memoria.restaurada) return;
      this._memoria.restaurada = true;
      for (const [selector, top] of Object.entries(this._memoria.scroll)) {
        const el = this.element.querySelector(selector);
        if (el) el.scrollTop = top;
      }
      try {
        if (game.settings.get(ID, "autoCenterWindows")) this.setPosition(centerWindow(this.position));
        else if (Number.isFinite(this.position.left)) this.setPosition(fitWindow(this.position));
      } catch (_) {}
    }

    /**
     * La mesa es compartida: otra persona puede provocar un repintado mientras escribes.
     * El motor devuelve el foco, pero no el texto aún sin guardar; aquí se conserva.
     */
    _preSyncPartState(partId, nuevo, anterior, estado) {
      super._preSyncPartState?.(partId, nuevo, anterior, estado);
      const campo = document.activeElement;
      if (!anterior.contains(campo) || !campo.matches?.("input[type=text], textarea")) return;
      let selector = campo.name ? `${campo.tagName}[name="${campo.name}"]` : null;
      if (!selector && campo.dataset.caseNote)
        selector = `${campo.tagName}[data-case-note="${campo.dataset.caseNote}"]${campo.dataset.id ? `[data-id="${campo.dataset.id}"]` : ""}${campo.dataset.index !== undefined ? `[data-index="${campo.dataset.index}"]` : ""}`;
      if (!selector) return;
      estado.escrito = { selector, valor: campo.value, desde: campo.selectionStart, hasta: campo.selectionEnd };
    }

    _syncPartState(partId, nuevo, anterior, estado) {
      super._syncPartState?.(partId, nuevo, anterior, estado);
      const campo = estado.escrito && nuevo.querySelector(estado.escrito.selector);
      if (!campo) return;
      campo.value = estado.escrito.valor;
      campo.focus();
      campo.setSelectionRange(estado.escrito.desde, estado.escrito.hasta);
    }

    async close(options) {
      if (this.rendered) {
        const scroll = {};
        for (const selector of this.constructor.SCROLL_MEMORIA ?? [".bb-scroll"]) {
          const el = this.element.querySelector(selector);
          if (el) scroll[selector] = el.scrollTop;
        }
        this.#guardarPosicion();
        escribir(this._memoria.id, { scroll });
      }
      return super.close(options);
    }
  };
}

export function clearRememberedWindows() {
  for (let index = localStorage.length - 1; index >= 0; index--) {
    const storedKey = localStorage.key(index);
    if (storedKey?.startsWith(PREFIX)) localStorage.removeItem(storedKey);
  }
}
