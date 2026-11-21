/**
 * Taking a character out of the squad being picked, and putting it back with «Annulla»: in the same
 * place, unless the player has meanwhile picked it again or filled the squad.
 */

/** The squad without the character, and where it was (-1: it was not in the squad). */
export function removeFromSquad(selected: string[], definitionId: string): { selected: string[]; index: number } {
  const index = selected.indexOf(definitionId);
  return index < 0 ? { selected, index } : { selected: selected.filter((id) => id !== definitionId), index };
}

/** The squad with the character back where it was (or last, if the squad has shrunk since). */
export function restoreToSquad(selected: string[], definitionId: string, index: number, size: number): string[] {
  if (selected.includes(definitionId) || selected.length >= size) return selected;
  const at = Math.max(0, Math.min(index, selected.length));
  return [...selected.slice(0, at), definitionId, ...selected.slice(at)];
}
