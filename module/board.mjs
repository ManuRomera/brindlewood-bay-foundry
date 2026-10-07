/**
 * Pizarra de investigación de cada caso: pistas, personas de interés, notas y fotos sueltas sobre un corcho,
 * unidas con hilos de colores. Es ambientación pura: no cambia ninguna regla.
 *
 * Trabajo en común sin pisarse:
 *  - Cada elemento y cada hilo se guarda bajo su propia clave (`system.board.items.<id>`), de modo que dos personas
 *    que mueven cosas distintas escriben en rutas distintas. Las jugadoras (Observadoras del caso) envían sus
 *    operaciones a la Guardiana conectada, que las valida y las aplica, igual que las notas del caso.
 *  - Mientras alguien arrastra o escribe en un elemento, lo bloquea para el resto con un mensaje efímero
 *    (`boardLive`); los demás ven moverse la tarjeta en directo y no pueden tocarla hasta que la suelte.
 *  - Lo local se aplica al instante (capa `overlay`) y se reconcilia cuando llega el cambio del Actor.
 */
import { ID } from "./rules.mjs";
import { ApplicationV2, FilePicker } from "./compat.mjs";
import { rememberWindow } from "./window-state.mjs";
import { esc } from "./ui.mjs";
import { saveCaseNote } from "./case-collaboration.mjs";
import { planOps, BOARD, THREAD_COLORS, BACKGROUNDS } from "./board-rules.mjs";

const SOCKET = `system.${ID}`;
const LOCK_MS = 10000;
const OVERLAY_MS = 6000;
const COLOR_NAMES = { rojo: "Rojo", azul: "Azul", verde: "Verde", ambar: "Ámbar", violeta: "Violeta", negro: "Negro" };
const NOTE_CYCLE = ["amarillo", "rosa", "verde", "azul"];
const rid = () => foundry.utils.randomID(16);
const tilt = (id) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ((h % 9) - 4) * 0.7;
};
const boards = () => [...foundry.applications.instances.values()].filter((app) => app instanceof BoardApp);
const ctxFor = (actor) => ({
  clueIds: new Set(actor.system.clues.map((clue) => clue.id)),
  suspectIds: new Set(actor.system.suspects.map((person) => person.id).filter(Boolean)),
});

/** La Guardiana valida y aplica; el resto de clientes recibe el cambio por el propio Actor. */
export async function applyBoardOps(actor, ops) {
  const plan = planOps(actor.system.board, ops, ctxFor(actor));
  if (Object.keys(plan.update).length) await actor.update(plan.update);
}

async function sendOps(actor, ops) {
  if (game.user.isGM) return applyBoardOps(actor, ops);
  if (!game.users.activeGM) throw Error("La Guardiana debe estar conectada para guardar la pizarra.");
  game.socket.emit(SOCKET, { action: "boardOps", caseId: actor.id, ops });
}

export function registerBoardSocket() {
  game.socket.on(SOCKET, async (message, senderId) => {
    if (message?.action === "boardLive") return boards().forEach((app) => app.onLive(message, senderId));
    if (message?.action === "boardError" && message.userId === game.user.id) return ui.notifications.warn(message.error);
    if (message?.action !== "boardOps" || game.users.activeGM?.id !== game.user.id) return;
    const user = game.users.get(senderId);
    const actor = game.actors.get(message.caseId);
    try {
      if (!user || actor?.type !== "misterio" || !actor.testUserPermission(user, "OBSERVER")) throw Error("No puedes usar la pizarra de este caso.");
      await applyBoardOps(actor, message.ops);
    } catch (error) {
      game.socket.emit(SOCKET, { action: "boardError", userId: senderId, error: error.message });
    }
  });
  Hooks.on("updateActor", (actor) => {
    if (actor.type === "misterio") for (const app of boards()) if (app.actor.id === actor.id) app.refrescar();
  });
  Hooks.on("deleteActor", (actor) => {
    for (const app of boards()) if (app.actor.id === actor.id) app.close();
  });
}

export class BoardApp extends rememberWindow(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["bb-app", "bb-pizarra"],
    position: { width: 1100, height: 720 },
    window: { resizable: true, icon: "fa-solid fa-thumbtack" },
  };

  static abrir(actor) {
    if (!actor.testUserPermission(game.user, "OBSERVER")) throw Error("No puedes consultar este misterio.");
    return (foundry.applications.instances.get(`bb-pizarra-${actor.id}`) ?? new BoardApp(actor)).render({ force: true });
  }

  constructor(actor) {
    super({ id: `bb-pizarra-${actor.id}`, memoria: `pizarra.${actor.uuid}` });
    this.actor = actor;
    this.locks = new Map();
    this.overlay = { items: {}, links: {}, rm: { items: new Set(), links: new Set() }, t: new Map() };
    this.color = "rojo";
    this.escala = this.recordado("zoom", 1);
    this.drag = null;
    this.seleccion = null;
  }

  get title() {
    return `Pizarra · ${this.actor.name.replace(/^Caso:\s*/i, "")}`;
  }

  async _renderHTML() {
    return `<div class="bb-pz">
      <aside class="bb-pz-bandeja"></aside>
      <div class="bb-pz-vista"><div class="bb-pz-tamano"><div class="bb-pz-lienzo" style="width:${BOARD.width}px;height:${BOARD.height}px">
        <div class="bb-pz-items"></div><svg class="bb-pz-hilos" width="${BOARD.width}" height="${BOARD.height}" aria-hidden="true"></svg>
      </div></div></div>
    </div>`;
  }

  _replaceHTML(html, content) {
    content.innerHTML = html;
    this.vista = content.querySelector(".bb-pz-vista");
    this.tamano = content.querySelector(".bb-pz-tamano");
    this.lienzo = content.querySelector(".bb-pz-lienzo");
    this.capa = content.querySelector(".bb-pz-items");
    this.svg = content.querySelector(".bb-pz-hilos");
    this.bandeja = content.querySelector(".bb-pz-bandeja");
    this.#escuchar();
    this.#escalar();
    this.#pintar();
    const cajas = Object.values(this.#view().items);
    if (cajas.length) {
      this.vista.scrollLeft = Math.max(0, Math.min(...cajas.map((i) => i.x)) * this.escala - 40);
      this.vista.scrollTop = Math.max(0, Math.min(...cajas.map((i) => i.y)) * this.escala - 40);
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    // Las medidas de las tarjetas solo existen con la ventana ya en pantalla: los hilos se dibujan ahora.
    requestAnimationFrame(() => this.#hilos());
  }

  async close(options) {
    for (const [id, lock] of this.locks) if (lock.user === game.user.id) this.#soltar(id);
    return super.close(options);
  }

  /* ------------------------------ estado ------------------------------ */

  #view() {
    const now = Date.now();
    for (const [key, t] of this.overlay.t) {
      if (now - t < OVERLAY_MS) continue;
      this.overlay.t.delete(key);
      const [kind, id] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
      delete this.overlay[kind][id];
      this.overlay.rm[kind].delete(id);
    }
    const base = this.actor.system.board ?? {};
    const out = { items: { ...(base.items ?? {}) }, links: { ...(base.links ?? {}) } };
    for (const kind of ["items", "links"]) {
      for (const [id, patch] of Object.entries(this.overlay[kind])) out[kind][id] = { ...(out[kind][id] ?? {}), ...patch };
      for (const id of this.overlay.rm[kind]) delete out[kind][id];
    }
    for (const [id, link] of Object.entries(out.links)) if (!out.items[link.from] || !out.items[link.to]) delete out.links[id];
    return out;
  }

  /** Llega un cambio del Actor: se descarta lo local que ya coincide con él. */
  refrescar() {
    const base = this.actor.system.board ?? {};
    for (const kind of ["items", "links"]) {
      for (const [id, patch] of Object.entries(this.overlay[kind])) {
        const real = base[kind]?.[id];
        if (real && Object.entries(patch).every(([key, value]) => JSON.stringify(real[key]) === JSON.stringify(value))) {
          delete this.overlay[kind][id];
          this.overlay.t.delete(`${kind}:${id}`);
        }
      }
      for (const id of [...this.overlay.rm[kind]])
        if (!base[kind]?.[id]) {
          this.overlay.rm[kind].delete(id);
          this.overlay.t.delete(`${kind}:${id}`);
        }
    }
    if (this.fondoLocal && base.background === this.fondoLocal) this.fondoLocal = null;
    if (this.rendered) this.#pintar();
  }

  #fondo() {
    if (this.fondoLocal && Date.now() - this.fondoT > OVERLAY_MS) this.fondoLocal = null;
    const id = this.fondoLocal ?? this.actor.system.board?.background ?? "corcho";
    return BACKGROUNDS.find((entry) => entry.id === id) ?? BACKGROUNDS[0];
  }

  async #commit(ops) {
    let plan;
    try {
      plan = planOps(this.#view(), ops, ctxFor(this.actor));
    } catch (error) {
      ui.notifications.warn(error.message);
      return this.#pintar();
    }
    if (!plan.ops.length) return;
    const now = Date.now();
    for (const op of plan.ops) {
      if (op.kind === "settings") {
        this.fondoLocal = op.data.background;
        this.fondoT = now;
        continue;
      }
      const key = `${op.kind}:${op.id}`;
      this.overlay.t.set(key, now);
      if (op.op === "set") {
        this.overlay.rm[op.kind].delete(op.id);
        this.overlay[op.kind][op.id] = { ...(this.overlay[op.kind][op.id] ?? {}), ...op.data };
      } else {
        delete this.overlay[op.kind][op.id];
        this.overlay.rm[op.kind].add(op.id);
      }
    }
    this.#pintar();
    try {
      await sendOps(this.actor, plan.ops);
      // La Guardiana ya tiene el dato en el Actor: la capa local sobra. El resto la ve caducar o coincidir.
      if (game.user.isGM) {
        for (const op of plan.ops) {
          if (op.kind === "settings") {
            this.fondoLocal = null;
            continue;
          }
          delete this.overlay[op.kind][op.id];
          this.overlay.rm[op.kind].delete(op.id);
          this.overlay.t.delete(`${op.kind}:${op.id}`);
        }
      }
      clearTimeout(this._caduca);
      this._caduca = setTimeout(() => this.refrescar(), OVERLAY_MS + 200);
      if (game.user.isGM) this.#pintar();
    } catch (error) {
      ui.notifications.error(error.message);
      this.overlay = { items: {}, links: {}, rm: { items: new Set(), links: new Set() }, t: new Map() };
      this.#pintar();
    }
  }

  /* ------------------------------ bloqueos y directo ------------------------------ */

  #emit(extra) {
    game.socket.emit(SOCKET, { action: "boardLive", caseId: this.actor.id, ...extra });
  }

  #bloqueadoPorOtra(id) {
    const lock = this.locks.get(id);
    if (!lock) return null;
    if (lock.until < Date.now()) {
      this.locks.delete(id);
      return null;
    }
    return lock.user === game.user.id ? null : lock.user;
  }

  #tomar(id) {
    this.locks.set(id, { user: game.user.id, until: Date.now() + LOCK_MS });
    this.#emit({ type: "lock", id });
    this.#marcar(id);
  }

  #soltar(id) {
    if (this.locks.get(id)?.user !== game.user.id) return;
    this.locks.delete(id);
    this.#emit({ type: "unlock", id });
    this.#marcar(id);
  }

  #marcar(id) {
    const el = this.capa?.querySelector(`[data-id="${id}"]`);
    if (!el) return;
    const other = this.#bloqueadoPorOtra(id);
    el.classList.toggle("bloqueado", Boolean(other));
    if (other) {
      const user = game.users.get(other);
      el.dataset.por = user?.name ?? "Alguien";
      el.style.setProperty("--por", user?.color?.css ?? String(user?.color ?? "#c0392b"));
    } else delete el.dataset.por;
    for (const field of el.querySelectorAll("textarea, input")) field.readOnly = Boolean(other);
  }

  /** Mensajes efímeros de las demás personas: bloqueos y movimiento en directo. */
  onLive(message, senderId) {
    if (message.caseId !== this.actor.id || senderId === game.user.id || !this.capa) return;
    const { id, type } = message;
    if (type === "unlock") {
      if (this.locks.get(id)?.user === senderId) this.locks.delete(id);
      this.#marcar(id);
      return this.refrescar();
    }
    const mine = this.locks.get(id);
    if (type === "lock" && mine?.user === game.user.id && mine.until > Date.now()) {
      // Dos personas lo toman a la vez: gana la de identificador menor.
      if (game.user.id < senderId) return;
      if (this.drag?.id === id) this.#abortar();
    }
    this.locks.set(id, { user: senderId, until: Date.now() + LOCK_MS });
    this.#marcar(id);
    if (type === "move") {
      const el = this.capa.querySelector(`[data-id="${id}"]`);
      if (!el) return;
      el.style.left = `${message.x}px`;
      el.style.top = `${message.y}px`;
      this.#hilos();
    }
  }

  /* ------------------------------ pintado ------------------------------ */

  #datos(id, item) {
    const system = this.actor.system;
    if (item.type === "clue") {
      const clue = system.clues.find((entry) => entry.id === item.ref);
      return clue ? { text: clue.text, void: Boolean(clue.void) } : null;
    }
    if (item.type === "person") {
      const person = system.suspects.find((entry) => entry.id === item.ref);
      return person ? { name: person.name, img: person.img || `systems/${ID}/assets/teacup.svg`, uuid: person.actorUuid ?? "" } : null;
    }
    if (item.type === "note") return { text: item.text ?? "", color: item.color ?? "amarillo", origen: this.#etiquetaOrigen(item.origin) };
    if (item.type === "photo") return { src: item.src ?? "", text: item.text ?? "" };
    return null;
  }

  #etiquetaOrigen(origin) {
    if (!origin) return "";
    const system = this.actor.system;
    if (origin.kind === "case") return "Cuaderno del caso";
    if (origin.kind === "clue") return system.clues.some((c) => c.id === origin.ref) ? "Notas de una pista" : "";
    return `Notas de ${system.suspects.find((p) => p.id === origin.ref)?.name ?? "una persona"}`;
  }

  /** Apuntes que el grupo ha escrito en el tablero: lo único del caso que puede pasar a la pizarra. */
  #apuntes() {
    const system = this.actor.system;
    const out = [];
    if (system.notes?.trim()) out.push({ kind: "case", ref: "", titulo: "Cuaderno del caso", texto: system.notes });
    for (const clue of system.clues) if (clue.notes?.trim()) out.push({ kind: "clue", ref: clue.id, titulo: `Pista: ${clue.text}`, texto: clue.notes });
    for (const person of system.suspects) if (person.id && person.notes?.trim()) out.push({ kind: "suspect", ref: person.id, titulo: person.name, texto: person.notes });
    return out;
  }

  #contenido(item, d) {
    const pin = '<span class="pin" data-pin title="Arrastra la chincheta hasta otra tarjeta para unirlas con un hilo"></span>';
    const quitar = '<button type="button" class="quitar" aria-label="Quitar de la pizarra" title="Quitar de la pizarra"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>';
    if (item.type === "clue") return `${pin}${quitar}<b class="et">${d.void ? "Pista del Vacío" : "Pista"}</b><p>${esc(d.text)}</p>`;
    if (item.type === "person")
      return `${pin}${quitar}<figure><img src="${esc(d.img)}" alt="" draggable="false"><figcaption>${esc(d.name)}</figcaption></figure>${game.user.isGM && d.uuid ? '<button type="button" class="abrir" aria-label="Abrir la ficha original" title="Abrir la ficha original"><i class="fa-solid fa-address-card" aria-hidden="true"></i></button>' : ""}`;
    if (item.type === "note")
      return `${pin}${quitar}<button type="button" class="tinte" aria-label="Cambiar el color de la nota" title="Cambiar el color"></button><textarea data-campo="text" rows="5" maxlength="${BOARD.textMax}" placeholder="Escribe una nota…" aria-label="Nota">${esc(d.text)}</textarea>${d.origen ? `<small class="origen">↔ ${esc(d.origen)}</small>` : ""}<button type="button" class="enviar" aria-label="Enviar al tablero de investigación" title="Enviar esta nota al tablero de investigación (a la pista o persona unida con un hilo, al apunte del que viene o al cuaderno del caso)"><i class="fa-solid fa-share" aria-hidden="true"></i></button>`;
    return `${pin}${quitar}<figure><img src="${esc(d.src)}" alt="" draggable="false"><input data-campo="text" class="pie" maxlength="120" value="${esc(d.text)}" placeholder="Pie de foto" aria-label="Pie de foto"></figure><button type="button" class="cambiar" aria-label="Cambiar la imagen" title="Cambiar la imagen"><i class="fa-solid fa-image" aria-hidden="true"></i></button>`;
  }

  #pintar() {
    if (!this.capa) return;
    const view = (this._v = this.#view());
    const fondo = this.#fondo();
    this.lienzo.dataset.fondo = fondo.id;
    this.lienzo.style.setProperty("--fondo", fondo.file ? `url("${new URL(`systems/${ID}/assets/pizarra/${fondo.file}`, document.baseURI).href}")` : "none");
    const seen = new Set();
    let z = 0;
    for (const it of Object.values(view.items)) z = Math.max(z, it.z ?? 0);
    this._z = z;
    for (const [id, item] of Object.entries(view.items)) {
      const d = this.#datos(id, item);
      if (!d) continue;
      seen.add(id);
      let el = this.capa.querySelector(`[data-id="${id}"]`);
      const firma = JSON.stringify([item.type, d]);
      if (!el) {
        el = document.createElement("article");
        el.dataset.id = id;
        el.style.setProperty("--giro", `${tilt(id)}deg`);
        this.capa.append(el);
      }
      if (el.dataset.firma !== firma && !el.classList.contains("arrastrando") && !el.contains(document.activeElement)) {
        el.dataset.firma = firma;
        el.className = `bb-pz-item t-${item.type}${item.type === "note" ? ` nota-${d.color}` : ""}${item.type === "clue" && d.void ? " vacia" : ""}`;
        el.innerHTML = this.#contenido(item, d);
      }
      if (!el.classList.contains("arrastrando") && !this.#bloqueadoPorOtra(id)) {
        el.style.left = `${item.x ?? 0}px`;
        el.style.top = `${item.y ?? 0}px`;
      }
      el.style.zIndex = String(item.z ?? 1);
      this.#marcar(id);
    }
    for (const el of this.capa.querySelectorAll("[data-id]")) if (!seen.has(el.dataset.id)) el.remove();
    this.#hilos();
    this.#armarBandeja(view);
    if (this._enfocar && this.capa.querySelector(`[data-id="${this._enfocar}"] textarea`)) {
      this.capa.querySelector(`[data-id="${this._enfocar}"] textarea`).focus();
      this._enfocar = null;
    }
  }

  #punta(id) {
    const el = this.capa.querySelector(`[data-id="${id}"]`);
    return el ? { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + 8 } : null;
  }

  #hilos() {
    if (!this.svg) return;
    const links = this._v?.links ?? {};
    let html = "";
    for (const [id, link] of Object.entries(links)) {
      const a = this.#punta(link.from);
      const b = this.#punta(link.to);
      if (!a || !b) continue;
      const hang = Math.min(110, Math.hypot(a.x - b.x, a.y - b.y) * 0.2 + 14);
      const qx = (a.x + b.x) / 2;
      const qy = (a.y + b.y) / 2 + hang * 2;
      const d = `M${a.x} ${a.y} Q${qx} ${qy} ${b.x} ${b.y}`;
      const mx = 0.25 * a.x + 0.5 * qx + 0.25 * b.x;
      const my = 0.25 * a.y + 0.5 * qy + 0.25 * b.y;
      html += `<g class="enlace${this.seleccion === id ? " sel" : ""}"><path class="sombra" d="${d}" transform="translate(2 4)"/><path class="hilo" d="${d}" stroke="${THREAD_COLORS[link.color]}"/><path class="hit" data-link="${id}" d="${d}"/><g class="borrar" data-borrar="${id}" transform="translate(${mx} ${my})"><title>Quitar este hilo</title><circle r="13"/><path d="M-5 -5 L5 5 M5 -5 L-5 5"/></g></g>`;
    }
    if (this.temp) html += `<path class="temp" d="${this.temp}" stroke="${THREAD_COLORS[this.color]}"/>`;
    this.svg.innerHTML = html;
  }

  #armarBandeja(view) {
    const placed = new Set(Object.values(view.items).map((item) => item.ref).filter(Boolean));
    const clues = this.actor.system.clues.filter((clue) => !placed.has(clue.id));
    const people = this.actor.system.suspects.filter((person) => person.id && !placed.has(person.id));
    const firma = JSON.stringify([this.color, clues.map((c) => c.id), people.map((p) => p.id), this.escala, this.#fondo().id, this.#apuntes().map((a) => [a.kind, a.ref, a.texto])]);
    if (this._bandeja === firma) return;
    this._bandeja = firma;
    const actual = this.#fondo();
    const notas = this.#apuntes();
    const apuntes = notas.length
      ? `<ul>${notas.map((n) => `<li><button type="button" data-acc="apunte" data-kind="${n.kind}" data-ref="${esc(n.ref)}" title="Poner este apunte como nota en la pizarra"><i class="fa-solid fa-note-sticky" aria-hidden="true"></i><span><b>${esc(n.titulo)}</b>${esc(n.texto)}</span></button></li>`).join("")}</ul>`
      : '<p class="bb-tenue">Aún no hay apuntes en el tablero de investigación.</p>';
    const colors = Object.entries(THREAD_COLORS)
      .map(([key, css]) => `<button type="button" class="hilo-color${key === this.color ? " sel" : ""}" data-color="${key}" style="--c:${css}" aria-label="Hilo ${COLOR_NAMES[key]}" aria-pressed="${key === this.color}" title="${COLOR_NAMES[key]}"></button>`)
      .join("");
    const list = (rows, kind, label) =>
      rows.length
        ? `<ul>${rows.map((row) => `<li><button type="button" data-acc="${kind}" data-ref="${esc(row.id)}" title="Poner en la pizarra"><i class="fa-solid fa-plus" aria-hidden="true"></i><span>${esc(label(row))}</span></button></li>`).join("")}</ul>`
        : '<p class="bb-tenue">Todo está en la pizarra.</p>';
    this.bandeja.innerHTML = `
      <h3>Hilo</h3><div class="hilo-colores" role="group" aria-label="Color del hilo">${colors}</div>
      <p class="bb-tenue">Arrastra la chincheta de una tarjeta hasta otra para unirlas. Pulsa un hilo para quitarlo.</p>
      <h3>Añadir</h3><div class="bb-acciones"><button type="button" data-acc="nota"><i class="fa-solid fa-note-sticky" aria-hidden="true"></i> Nota</button><button type="button" data-acc="foto"><i class="fa-solid fa-image" aria-hidden="true"></i> Foto</button></div>
      <h3>Pistas por poner</h3>${list(clues, "clue", (clue) => `${clue.void ? "◆ " : ""}${clue.text}`)}
      <h3>Personas por poner</h3>${list(people, "person", (person) => person.name)}
      <h3>Apuntes del caso</h3>${apuntes}
      <h3>Fondo</h3><details class="fondo-menu"><summary><span class="muestra"${actual.file ? ` style="background-image:url('systems/${ID}/assets/pizarra/${actual.file}')"` : ""}></span><span class="nombre">${esc(actual.name)}</span></summary><div class="fondos" role="group" aria-label="Fondo de la pizarra">${BACKGROUNDS.map((entry) => `<button type="button" class="fondo-op${entry.id === actual.id ? " sel" : ""}" data-fondo="${entry.id}" aria-pressed="${entry.id === actual.id}"><span class="muestra"${entry.file ? ` style="background-image:url('systems/${ID}/assets/pizarra/${entry.file}')"` : ""}></span><span class="nombre">${esc(entry.name)}</span></button>`).join("")}</div></details>
      <p class="bb-tenue">Los perfiles Oscuro, Alto contraste y Ámbar oscurecen la pizarra solo en tu pantalla.</p>
      <h3>Vista</h3><div class="bb-acciones"><button type="button" data-acc="menos" aria-label="Alejar"><i class="fa-solid fa-magnifying-glass-minus" aria-hidden="true"></i></button><button type="button" data-acc="mas" aria-label="Acercar"><i class="fa-solid fa-magnifying-glass-plus" aria-hidden="true"></i></button><button type="button" data-acc="ajustar">Ajustar</button></div>`;
  }

  #escalar() {
    this.escala = Math.min(1.6, Math.max(0.3, Math.round(this.escala * 10) / 10));
    this.lienzo.style.transform = `scale(${this.escala})`;
    this.tamano.style.width = `${BOARD.width * this.escala}px`;
    this.tamano.style.height = `${BOARD.height * this.escala}px`;
    this.recordar("zoom", this.escala);
  }

  /* ------------------------------ interacción ------------------------------ */

  #punto(event) {
    const r = this.lienzo.getBoundingClientRect();
    return { x: (event.clientX - r.left) / this.escala, y: (event.clientY - r.top) / this.escala };
  }

  #abortar() {
    const drag = this.drag;
    this.drag = null;
    drag?.el.classList.remove("arrastrando");
    this.#pintar();
  }

  #nuevo(data, { enfocar = false } = {}) {
    const v = this.vista;
    const jitter = () => Math.round((Math.random() - 0.5) * 60);
    const x = (v.scrollLeft + v.clientWidth / 2) / this.escala - 90 + jitter();
    const y = (v.scrollTop + v.clientHeight / 2) / this.escala - 60 + jitter();
    const id = rid();
    if (enfocar) this._enfocar = id;
    return this.#commit([{ op: "set", kind: "items", id, data: { x, y, z: this._z + 1, ...data } }]);
  }

  #escuchar() {
    const capa = this.capa;
    capa.addEventListener("pointerdown", (event) => {
      this.seleccion = null;
      const el = event.target.closest(".bb-pz-item");
      if (!el || event.button !== 0) return this.#hilos();
      const id = el.dataset.id;
      if (event.target.closest(".pin")) return this.#empezarHilo(event, el);
      if (event.target.closest("button, textarea, input")) return;
      if (this.#bloqueadoPorOtra(id)) {
        el.classList.add("rechazo");
        setTimeout(() => el.classList.remove("rechazo"), 300);
        return;
      }
      const item = this._v.items[id];
      const start = this.#punto(event);
      this.drag = { id, el, sx: start.x, sy: start.y, ox: item.x ?? 0, oy: item.y ?? 0, moved: false, last: 0 };
      el.setPointerCapture(event.pointerId);
      el.classList.add("arrastrando");
      this.#tomar(id);
      el.style.zIndex = String(this._z + 1);
    });
    capa.addEventListener("pointermove", (event) => {
      const drag = this.drag;
      if (!drag) return;
      const p = this.#punto(event);
      const x = Math.round(Math.min(BOARD.width - 60, Math.max(0, drag.ox + p.x - drag.sx)));
      const y = Math.round(Math.min(BOARD.height - 60, Math.max(0, drag.oy + p.y - drag.sy)));
      if (x !== drag.ox || y !== drag.oy) drag.moved = true;
      drag.x = x;
      drag.y = y;
      drag.el.style.left = `${x}px`;
      drag.el.style.top = `${y}px`;
      this.#hilos();
      const now = Date.now();
      if (now - drag.last > 45) {
        drag.last = now;
        this.locks.set(drag.id, { user: game.user.id, until: now + LOCK_MS });
        this.#emit({ type: "move", id: drag.id, x, y });
      }
    });
    const soltar = (event) => {
      const drag = this.drag;
      if (!drag) return;
      this.drag = null;
      drag.el.classList.remove("arrastrando");
      if (drag.el.hasPointerCapture?.(event.pointerId)) drag.el.releasePointerCapture(event.pointerId);
      if (drag.moved) this.#commit([{ op: "set", kind: "items", id: drag.id, data: { x: drag.x, y: drag.y, z: this._z + 1 } }]);
      this.#soltar(drag.id);
    };
    capa.addEventListener("pointerup", soltar);
    capa.addEventListener("pointercancel", soltar);

    capa.addEventListener("click", async (event) => {
      const el = event.target.closest(".bb-pz-item");
      if (!el) return;
      const id = el.dataset.id;
      const item = this._v.items[id];
      if (event.target.closest(".quitar")) {
        if (this.#bloqueadoPorOtra(id)) return ui.notifications.info("Alguien está usando esta tarjeta.");
        return this.#commit([{ op: "remove", kind: "items", id }]);
      }
      if (event.target.closest(".tinte")) {
        if (this.#bloqueadoPorOtra(id)) return;
        const next = NOTE_CYCLE[(NOTE_CYCLE.indexOf(item.color ?? "amarillo") + 1) % NOTE_CYCLE.length];
        return this.#commit([{ op: "set", kind: "items", id, data: { color: next } }]);
      }
      if (event.target.closest(".abrir")) {
        const person = this.actor.system.suspects.find((entry) => entry.id === item.ref);
        const actor = person?.actorUuid ? await fromUuid(person.actorUuid) : null;
        return actor?.sheet.render(true);
      }
      if (event.target.closest(".enviar")) return this.#enviar(id);
      if (event.target.closest(".cambiar")) {
        if (this.#bloqueadoPorOtra(id)) return;
        new (FilePicker())({ type: "image", current: item.src, callback: (src) => this.#commit([{ op: "set", kind: "items", id, data: { src } }]) }).render({ force: true });
      }
    });
    capa.addEventListener("focusin", (event) => {
      const el = event.target.closest(".bb-pz-item");
      if (!el || !event.target.matches("textarea, input")) return;
      if (this.#bloqueadoPorOtra(el.dataset.id)) return event.target.blur();
      this.#tomar(el.dataset.id);
    });
    capa.addEventListener("focusout", (event) => {
      const el = event.target.closest(".bb-pz-item");
      if (el && event.target.matches("textarea, input")) this.#soltar(el.dataset.id);
    });
    capa.addEventListener("change", (event) => {
      const el = event.target.closest(".bb-pz-item");
      if (!el || event.target.dataset.campo !== "text" || this.#bloqueadoPorOtra(el.dataset.id)) return;
      this.#commit([{ op: "set", kind: "items", id: el.dataset.id, data: { text: event.target.value } }]);
    });

    // Hilos: se eligen y se quitan desde el SVG; el lienzo vacío deselecciona.
    this.svg.addEventListener("click", (event) => {
      const borrar = event.target.closest("[data-borrar]");
      if (borrar) {
        this.seleccion = null;
        return this.#commit([{ op: "remove", kind: "links", id: borrar.dataset.borrar }]);
      }
      const hit = event.target.closest("[data-link]");
      this.seleccion = hit ? hit.dataset.link : null;
      this.#hilos();
    });

    // Bandeja lateral.
    this.bandeja.addEventListener("click", (event) => {
      const color = event.target.closest("[data-color]");
      if (color) {
        this.color = color.dataset.color;
        this._bandeja = null;
        return this.#armarBandeja(this._v);
      }
      const fondo = event.target.closest("[data-fondo]");
      if (fondo) {
        this.bandeja.querySelector(".fondo-menu")?.removeAttribute("open");
        return this.#commit([{ op: "set", kind: "settings", id: "ajustes01", data: { background: fondo.dataset.fondo } }]);
      }
      const button = event.target.closest("[data-acc]");
      if (!button) return;
      const { acc, ref } = button.dataset;
      if (acc === "clue" || acc === "person") return this.#nuevo({ type: acc, ref });
      if (acc === "apunte") return this.#desdeApunte(button.dataset.kind, ref);
      if (acc === "nota") return this.#nuevo({ type: "note" }, { enfocar: true });
      if (acc === "foto")
        return new (FilePicker())({ type: "image", callback: (src) => this.#nuevo({ type: "photo", src }) }).render({ force: true });
      if (acc === "mas" || acc === "menos" || acc === "ajustar") {
        this.escala = acc === "ajustar" ? 1 : this.escala + (acc === "mas" ? 0.1 : -0.1);
        this.#escalar();
        this._bandeja = null;
        this.#armarBandeja(this._v);
      }
    });

    this.vista.addEventListener("wheel", (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      this.escala += event.deltaY < 0 ? 0.1 : -0.1;
      this.#escalar();
    }, { passive: false });
  }

  /** Convierte un apunte del tablero en una nota de la pizarra, junto a su pista o persona si ya está puesta. */
  #desdeApunte(kind, ref) {
    const system = this.actor.system;
    const texto = kind === "case" ? system.notes : kind === "clue" ? system.clues.find((c) => c.id === ref)?.notes : system.suspects.find((p) => p.id === ref)?.notes;
    if (!texto?.trim()) return ui.notifications.warn("Ese apunte ya no tiene texto.");
    const card = Object.entries(this._v.items).find(([, it]) => kind !== "case" && it.ref === ref);
    const data = { type: "note", text: texto.slice(0, BOARD.textMax), origin: { kind, ref } };
    if (card) {
      const el = this.capa.querySelector(`[data-id="${card[0]}"]`);
      Object.assign(data, { x: (card[1].x ?? 0) + (el?.offsetWidth ?? 170) + 16, y: (card[1].y ?? 0) + 10 });
      const id = rid();
      return this.#commit([{ op: "set", kind: "items", id, data: { z: this._z + 1, ...data } }]);
    }
    return this.#nuevo(data);
  }

  /** Devuelve una nota al tablero de investigación: al apunte del que viene, a la pista o persona unida con un hilo, o al cuaderno. */
  async #enviar(id) {
    const item = this._v.items[id];
    const texto = (item?.text ?? "").trim();
    if (!texto) return ui.notifications.warn("La nota está vacía.");
    const system = this.actor.system;
    let dest = item.origin ? { ...item.origin, reemplazar: true } : null;
    if (!dest)
      for (const link of Object.values(this._v.links)) {
        const other = this._v.items[link.from === id ? link.to : link.to === id ? link.from : null];
        if (other && ["clue", "person"].includes(other.type)) {
          dest = { kind: other.type === "clue" ? "clue" : "suspect", ref: other.ref };
          break;
        }
      }
    dest ??= { kind: "case", ref: "" };
    const index = dest.kind === "suspect" ? system.suspects.findIndex((p) => p.id === dest.ref) : -1;
    const actual = dest.kind === "case" ? system.notes : dest.kind === "clue" ? system.clues.find((c) => c.id === dest.ref)?.notes : system.suspects[index]?.notes;
    if (actual === undefined || (dest.kind === "suspect" && index < 0)) return ui.notifications.warn("Esa pista o persona ya no está en el caso.");
    const nombre = dest.kind === "case" ? "el cuaderno del caso" : dest.kind === "clue" ? "las notas de la pista" : `las notas de ${system.suspects[index].name}`;
    if ((actual ?? "").includes(texto) && !dest.reemplazar) return ui.notifications.info(`Esa nota ya está en ${nombre}.`);
    const text = dest.reemplazar || !(actual ?? "").trim() ? texto : `${actual.trim()}\n${texto}`;
    try {
      await saveCaseNote(this.actor, { kind: dest.kind, id: dest.kind === "clue" ? dest.ref : undefined, index: dest.kind === "suspect" ? index : undefined, text });
      ui.notifications.info(`Nota enviada a ${nombre}.`);
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }

  #empezarHilo(event, el) {
    event.preventDefault();
    const from = el.dataset.id;
    const pin = event.target.closest(".pin");
    pin.setPointerCapture(event.pointerId);
    const a = this.#punta(from);
    const mover = (e) => {
      const p = this.#punto(e);
      this.temp = `M${a.x} ${a.y} L${p.x} ${p.y}`;
      this.#hilos();
    };
    const fin = (e) => {
      pin.removeEventListener("pointermove", mover);
      pin.removeEventListener("pointerup", fin);
      pin.removeEventListener("pointercancel", fin);
      this.temp = null;
      const to = document.elementFromPoint(e.clientX, e.clientY)?.closest(".bb-pz-item")?.dataset.id;
      this.#hilos();
      if (to && to !== from) this.#commit([{ op: "set", kind: "links", id: rid(), data: { from, to, color: this.color } }]);
    };
    pin.addEventListener("pointermove", mover);
    pin.addEventListener("pointerup", fin);
    pin.addEventListener("pointercancel", fin);
  }
}
