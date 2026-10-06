import fs from "node:fs";
import { execFileSync } from "node:child_process";
const m = JSON.parse(fs.readFileSync("system.json"));
const pkg = JSON.parse(fs.readFileSync("package.json"));
if (m.version !== pkg.version) throw Error("Versiones distintas");
const tag = process.env.RELEASE_TAG;
if (tag && tag !== `v${m.version}`)
  throw Error(`La etiqueta ${tag} no coincide con la versión ${m.version} del manifiesto`);
const repo = "https://github.com/ManuRomera/brindlewood-bay-foundry";
if (m.manifest !== `${repo}/releases/latest/download/system.json`)
  throw Error("El manifiesto debe apuntar a releases/latest/download/system.json");
if (m.download !== `${repo}/releases/latest/download/${m.id}.zip`)
  throw Error("La descarga debe apuntar a releases/latest/download/<id>.zip");
if (m.version.includes("-"))
  throw Error("«latest» ignora las prereleases: publica versiones estables (X.Y.Z)");
if (m.compatibility?.maximum) throw Error("No fijes compatibility.maximum: la capa compat.mjs enruta v13 y v14");
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
