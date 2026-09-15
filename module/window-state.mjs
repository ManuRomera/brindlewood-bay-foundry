import { ID } from "./rules.mjs";

const PREFIX = `${ID}.window.`;
const margin = 12;

function key(app) {
  const document = app.document ?? app.actor ?? app.item;
  return PREFIX + (document?.uuid ?? app.options.id ?? app.constructor.name);
}

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

export function rememberWindow(Base) {
  return class RememberedWindow extends Base {
    _bbRestored = false;

    async _onRender(context, options) {
      await super._onRender(context, options);
      if (this._bbRestored) return;
      this._bbRestored = true;
      try {
        const saved = JSON.parse(localStorage.getItem(key(this)) || "null");
        if (saved) this.setPosition(fitWindow(saved));
      } catch (_) {}
    }

    _onPosition(position) {
      super._onPosition?.(position);
      if (!this.rendered || !this._bbRestored) return;
      try {
        localStorage.setItem(key(this), JSON.stringify(fitWindow(this.position)));
      } catch (_) {}
    }

    async close(options = {}) {
      if (this.rendered) {
        try {
          localStorage.setItem(key(this), JSON.stringify(fitWindow(this.position)));
        } catch (_) {}
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
