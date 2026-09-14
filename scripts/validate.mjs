import fs from "node:fs";
import { execFileSync } from "node:child_process";
const m = JSON.parse(fs.readFileSync("system.json"));
const pkg = JSON.parse(fs.readFileSync("package.json"));
if (m.version !== pkg.version) throw Error("Versiones distintas");
if (!m.download.includes(`v${m.version}`))
  throw Error("Descarga distinta de la versión");
for (const p of [
  ...m.esmodules,
  ...m.styles,
  ...m.languages.map((l) => l.path),
  "assets/cover.png",
])
  if (!fs.existsSync(p)) throw Error(`Falta ${p}`);
for (const f of fs.readdirSync("module").filter((f) => f.endsWith(".mjs")))
  execFileSync(process.execPath, ["--check", "module/" + f]);
for (const p of m.packs) {
  const rows = JSON.parse(fs.readFileSync(`_data/${p.name}.json`));
  if (!rows.length) throw Error("Compendio vacío");
}
console.log("Manifiesto, versiones, módulos, recursos y fuentes válidos.");
