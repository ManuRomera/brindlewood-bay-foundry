import { DialogV2 } from "./compat.mjs";
export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const field = (key, label, value = "", type = "text") =>
  `<label>${esc(label)}<input name="${esc(key)}" type="${esc(type)}" value="${esc(value)}"></label>`;
export const area = (key, label, value = "") =>
  `<label>${esc(label)}<textarea name="${esc(key)}" rows="3">${esc(value)}</textarea></label>`;
export const select = (key, label, options, value) =>
  `<label>${esc(label)}<select name="${esc(key)}">${options.map(([k, v]) => `<option value="${esc(k)}" ${String(k) === String(value) ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>`;
export const check = (key, label, on = false) =>
  `<label class="bb-check"><input name="${esc(key)}" type="checkbox" ${on ? "checked" : ""}> ${esc(label)}</label>`;
export async function prompt(title, content, label = "Continuar", { cancel = false, validate = null, onRender = null, width = 550 } = {}) {
  const validation = validate
    ? '<p class="bb-form-status" data-bb-form-status aria-live="polite"></p>'
    : "";
  return DialogV2.prompt({
    window: { title },
    position: { width },
    classes: ["bb-app", "bb-dialogo"],
    content: `<div class="bb-dialog">${content}${validation}</div>`,
    ok: {
      label,
      callback: (_e, button) => {
        const data = new FormData(button.form);
        const issue = validate?.(data);
        if (issue) throw Error(issue);
        return data;
      },
    },
    buttons: cancel ? [{
      action: "cancel",
      label: "Cancelar",
      icon: "fa-solid fa-xmark",
      callback: () => false,
    }] : [],
    render: validate || onRender ? (_event, dialog) => {
      const form = dialog.element.querySelector("form");
      if (onRender) onRender(form, dialog);
      if (!validate) return;
      const button = dialog.element.querySelector('[data-action="ok"]');
      const status = dialog.element.querySelector("[data-bb-form-status]");
      const refresh = () => {
        const issue = validate(new FormData(form));
        button.disabled = Boolean(issue);
        status.textContent = issue ? `Falta completar: ${issue}` : "Todo listo para continuar.";
        status.classList.toggle("ready", !issue);
      };
      form.addEventListener("input", refresh);
      form.addEventListener("change", refresh);
      refresh();
    } : undefined,
    rejectClose: false,
  });
}
export async function confirm(title, content) {
  return DialogV2.confirm({
    window: { title },
    classes: ["bb-app", "bb-dialogo"],
    content: `<p>${esc(content)}</p>`,
    yes: { label: "Continuar" },
    no: { label: "Volver" },
    rejectClose: false,
  });
}
export function guard(fn) {
  return async function (...args) {
    try {
      return await fn.apply(this, args);
    } catch (e) {
      console.error("Brindlewood Bay", e);
      ui.notifications.error(e.message);
    }
  };
}
const queues = new Map();
export function locked(key, fn) {
  const prior = queues.get(key) ?? Promise.resolve();
  const p = prior.catch(() => {}).then(fn);
  queues.set(key, p);
  return p.finally(() => {
    if (queues.get(key) === p) queues.delete(key);
  });
}
export function owner(a) {
  if (!a?.isOwner) throw Error("Necesitas ser propietaria de esta ficha.");
}
export function gm() {
  if (!game.user.isGM) throw Error("Esta acción corresponde a la Guardiana.");
}
export function safeSystem(a) {
  return a.toObject().system;
}
