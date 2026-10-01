import { ID, canOfferChatCrown } from "./rules.mjs";
import { crown } from "./operations.mjs";
import { guard } from "./ui.mjs";

export function attachRollActions(message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  const recordId = message.getFlag(ID, "recordId");
  const actorId = message.getFlag(ID, "actorId");
  if (!recordId || !actorId) return;

  const actor = game.actors.get(actorId);
  const record = actor?.system.history.find((entry) => entry.id === recordId);
  if (!actor?.isOwner || !message.isAuthor && !game.user.isGM || !canOfferChatCrown(record))
    return;

  const card = root.querySelector(".bb-chat");
  if (!card || card.querySelector("[data-bb-chat-crown]")) return;

  const actions = document.createElement("div");
  actions.className = "bb-chat-actions";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "bb-chat-crown";
  button.dataset.bbChatCrown = "true";
  button.setAttribute("aria-label", "Ponerse una Corona para mejorar este resultado");
  button.innerHTML = '<i class="fas fa-crown" aria-hidden="true"></i> Ponerse una Corona';
  button.addEventListener("click", guard(async () => {
    button.disabled = true;
    try {
      await crown(actor, recordId, null, message.id, true);
    } finally {
      button.disabled = false;
    }
  }));
  actions.append(button);
  card.append(actions);
}
