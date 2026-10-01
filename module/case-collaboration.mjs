import { ID } from "./rules.mjs";

const SOCKET = `system.${ID}`;
const NOTE_LIMIT = 16000;
const pendingCaseNotes = new Map();

const cleanNote = (value) => String(value ?? "").slice(0, NOTE_LIMIT);

export function caseNotePatch(system, edit) {
  const text = cleanNote(edit?.text);
  if (edit?.kind === "case") return { "system.notes": text };

  if (edit?.kind === "clue") {
    const clues = structuredClone(system?.clues ?? []);
    const clue = clues.find((entry) => entry.id === edit.id);
    if (!clue) throw Error("La pista ya no existe en este caso.");
    clue.notes = text;
    return { "system.clues": clues };
  }

  if (edit?.kind === "suspect") {
    const index = Number(edit.index);
    const suspects = structuredClone(system?.suspects ?? []);
    if (!Number.isInteger(index) || !suspects[index])
      throw Error("La persona de interés ya no existe en este caso.");
    suspects[index].notes = text;
    return { "system.suspects": suspects };
  }

  throw Error("Tipo de nota de investigación desconocido.");
}

async function applyCaseNote(actor, edit) {
  await actor.update(caseNotePatch(actor.toObject().system, edit));
}

async function requestCaseNote(actor, edit) {
  const activeGM = game.users.activeGM;
  if (!activeGM) throw Error("La Guardiana debe estar conectada para guardar las notas.");
  const requestId = foundry.utils.randomID();
  const result = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingCaseNotes.delete(requestId);
      reject(Error("La Guardiana no respondió al guardado de las notas."));
    }, 15000);
    pendingCaseNotes.set(requestId, { resolve, reject, timer });
  });
  game.socket.emit(SOCKET, {
    action: "caseNote",
    requestId,
    caseId: actor.id,
    edit,
  });
  await result;
}

export async function saveCaseNote(actor, edit) {
  if (!actor?.testUserPermission(game.user, "OBSERVER"))
    throw Error("No puedes anotar este misterio.");
  if (game.user.isGM) return applyCaseNote(actor, edit);
  return requestCaseNote(actor, edit);
}

export function registerCaseCollaborationSocket() {
  game.socket.on(SOCKET, async (message, senderId) => {
    if (
      message?.action === "caseNoteSaved" &&
      message.userId === game.user.id &&
      game.users.get(senderId)?.isGM
    ) {
      const pending = pendingCaseNotes.get(message.requestId);
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingCaseNotes.delete(message.requestId);
      if (message.error) pending.reject(Error(message.error));
      else pending.resolve();
      return;
    }

    if (message?.action !== "caseNote" || game.users.activeGM?.id !== game.user.id)
      return;

    const user = game.users.get(senderId);
    const actor = game.actors.get(message.caseId);
    let error = "";
    try {
      if (!user || !actor || actor.type !== "misterio")
        throw Error("Solicitud de anotación inválida.");
      if (!actor.testUserPermission(user, "OBSERVER"))
        throw Error("Ese usuario no puede consultar este misterio.");
      await applyCaseNote(actor, message.edit);
    } catch (caught) {
      error = caught?.message ?? String(caught);
    }

    game.socket.emit(SOCKET, {
      action: "caseNoteSaved",
      requestId: message.requestId,
      userId: user?.id ?? senderId,
      error,
    });
  });
}
