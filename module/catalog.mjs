const PREFIX = /^(?:PJ|Caso):\s*/iu;

export function catalogName(kind, name) {
  const clean = String(name ?? "").replace(PREFIX, "").trim();
  if (!clean) return "";
  return `${kind === "case" ? "Caso" : "PJ"}: ${clean}`;
}

export const displayName = (name) => String(name ?? "").replace(PREFIX, "").trim();
