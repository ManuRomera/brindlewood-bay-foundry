import { ID } from "./rules.mjs";
import { caseBookPlacement } from "./case-book-layout.mjs";

export async function ensureSalonScene() {
  if (!game.user.isGM) return game.scenes.find((scene) => scene.getFlag(ID, "salon"));
  let scene = game.scenes.find((entry) => entry.getFlag(ID, "salon"));
  if (!scene) {
    const source = await game.packs.get(`${ID}.salon`)?.getDocument("bba10c0b5ce0e001");
    if (!source) throw Error("No se encontró la escena del salón del club.");
    const data = source.toObject();
    delete data._id;
    data.active = false;
    scene = await Scene.create(data);
    if (!game.scenes.active) await scene.activate();
  }
  await syncCaseBooks(scene);
  return scene;
}

export async function syncCaseBooks(scene = game.scenes.find((entry) => entry.getFlag(ID, "salon"))) {
  if (!game.user.isGM || !scene) return;
  const resolved = new Set(game.actors.filter((actor) => actor.type === "misterio" && actor.system.status === "resolved").map((actor) => actor.system.sourceId));
  const books = scene.tiles.filter((tile) => tile.getFlag(ID, "caseId"));
  const visible = books.filter((tile) => resolved.has(tile.getFlag(ID, "caseId")));
  const updates = books.map((tile) => {
    const index = visible.findIndex((entry) => entry.id === tile.id);
    return {
      _id: tile.id,
      ...caseBookPlacement(index, scene.width, scene.height),
    };
  });
  if (updates.length) await scene.updateEmbeddedDocuments("Tile", updates);
}
