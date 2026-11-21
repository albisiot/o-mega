// The names of the app's pages, for the ways back: "← Profilo" on a page's header, "Torna al
// profilo" on a button or for a screen reader.
import { placePath } from "@/lib/place-memory";

/** By path: the short name, then the words of a button that goes back there. */
const PAGES: Record<string, readonly [name: string, back: string]> = {
  "/": ["Home", "Torna alla home"],
  "/gioca": ["Gioca", "Torna a Gioca"],
  "/collezione": ["Collezione", "Torna alla collezione"],
  "/negozio": ["Negozio", "Torna al negozio"],
  "/profilo": ["Profilo", "Torna al profilo"],
  "/storico": ["Storico", "Torna allo storico"],
  "/classificata": ["Classificata", "Torna alla Classificata"],
  "/classifiche": ["Classifiche", "Torna alle classifiche"],
  "/classifica-sfida": ["Classifica", "Torna alla classifica"],
  "/bestiario": ["Bestiario", "Torna al Bestiario"],
  "/imprese": ["Imprese", "Torna alle imprese"],
  "/obiettivi": ["Obiettivi", "Torna agli obiettivi"],
  "/evento": ["Evento", "Torna all'evento"],
  "/emergenza": ["Emergenza", "Torna all'Emergenza"],
  "/storia": ["Storia", "Torna alla Storia"],
  "/operazioni": ["Operazioni", "Torna alle Operazioni"],
  "/operazioni/stanza": ["Stanza", "Torna alla stanza"],
  "/operazioni/coda": ["Cerca squadra", "Torna alla coda"],
  "/squadra": ["Squadra", "Torna alla squadra"],
  "/partita": ["Partita", "Torna alla partita"],
  "/carta": ["Carta", "Torna alla carta"],
  "/privacy": ["Privacy", "Torna alla privacy"],
  "/editor": ["Editor", "Torna all'Editor"],
};

/** The short name of a page, for "← Profilo": "Indietro" for a page without one. */
export function pageName(key: string): string {
  return PAGES[placePath(key)]?.[0] ?? (placePath(key).startsWith("/gestione-") ? "Gestione" : "Indietro");
}

/** The words of a way back to a page: "Torna agli obiettivi", "Torna indietro" without a name. */
export function backLabel(key: string): string {
  return PAGES[placePath(key)]?.[1] ?? "Torna indietro";
}
