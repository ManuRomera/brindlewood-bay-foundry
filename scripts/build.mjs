import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { ClassicLevel } from "classic-level";
import archiver from "archiver";
import { createHash } from "node:crypto";
const manifest = JSON.parse(await fs.readFile("system.json"));
// Prefijos LevelDB de Foundry: documento raíz y colecciones embebidas.
const ROOT = {
  JournalEntry: "journal",
  Item: "items",
  Actor: "actors",
  RollTable: "tables",
  Macro: "macros",
  Scene: "scenes",
};
const EMBEDDED = {
  JournalEntry: ["pages"],
  Actor: ["items", "effects"],
  Item: ["effects"],
  RollTable: ["results"],
  Scene: ["tiles", "tokens", "walls", "lights", "sounds", "drawings", "notes", "regions", "templates"],
};
await fs.mkdir("packs", { recursive: true });
for (const pack of manifest.packs) {
  await fs.rm(pack.path, { recursive: true, force: true });
  const db = new ClassicLevel(pack.path, { valueEncoding: "json" });
  const file = `_data/${pack.name}.json`;
  const raw = JSON.parse(await fs.readFile(file));
  // Un pack puede traer carpetas propias: {folders: [...], documents: [...]}.
  const folders = Array.isArray(raw) ? [] : (raw.folders ?? []);
  const documents = Array.isArray(raw) ? raw : (raw.documents ?? []);
  const root = ROOT[pack.type];
  if (!root)
    throw new Error(`${file}: tipo de pack no soportado (${pack.type})`);
  for (const folder of folders)
    await db.put(`!folders!${folder._id}`, { type: pack.type, ...folder });
  for (const source of documents) {
    const doc = structuredClone(source);
    for (const collection of EMBEDDED[pack.type] ?? []) {
      const rows = doc[collection];
      if (!Array.isArray(rows)) continue;
      // El padre guarda solo los ids; cada hijo va en su propia clave.
      doc[collection] = rows.map((r) => r._id);
      for (const row of rows)
        await db.put(`!${root}.${collection}!${doc._id}.${row._id}`, row);
    }
    await db.put(`!${root}!${doc._id}`, doc);
  }
  await db.close();
  console.log(
    `pack ${pack.name}: ${documents.length} documentos, ${folders.length} carpetas`,
  );
}
await fs.mkdir("dist", { recursive: true });
const out = createWriteStream("dist/brindlewood-bay.zip");
const zip = archiver("zip", { zlib: { level: 9 } });
zip.pipe(out);
const done = new Promise((resolve, reject) => {
  out.on("close", resolve);
  out.on("error", reject);
  zip.on("error", reject);
});
for (const path of [
  "system.json",
  "module",
  "templates",
  "styles",
  "lang",
  "packs",
  "assets",
  "docs",
  "_data",
  "LICENSE",
  "README.md",
  "CHANGELOG.md",
]) {
  const stat = await fs.stat(path);
  if (stat.isDirectory()) zip.directory(path, `brindlewood-bay/${path}`);
  else zip.file(path, { name: `brindlewood-bay/${path}` });
}
await zip.finalize();
await done;
await fs.copyFile("system.json", "dist/system.json");
const bytes = await fs.readFile("dist/brindlewood-bay.zip");
await fs.writeFile(
  "dist/SHA256SUMS",
  createHash("sha256").update(bytes).digest("hex") + "  brindlewood-bay.zip\n",
);
console.log(`ZIP: ${bytes.length} bytes`);
