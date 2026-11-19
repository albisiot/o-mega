// Text selection is off in the game (globals.css): a long press or a double tap must not paint
// words blue nor open the copy menu. The admin's Editor keeps it, to copy names, codes and texts.

/** The class on <html> that gives text selection back. */
export const TEXT_SELECTABLE_CLASS = "text-selectable";

/** Whether the page at `pathname` keeps text selection: the Editor and its management pages. */
export function allowsTextSelection(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  // /prova-editor-*: the editors without an admin account, in `next dev` only.
  return path === "/editor" || path.startsWith("/gestione-") || path.startsWith("/prova-editor");
}
