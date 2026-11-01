// Database functions raise stable error codes as messages; the UI shows them in Italian.
const SERVER_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Sessione scaduta: accedi di nuovo.",
  profile_not_found: "Profilo non trovato: esci e accedi di nuovo.",
  username_invalid: "Il nome utente deve avere da 3 a 20 caratteri: lettere, numeri o _.",
  username_taken: "Questo nome utente è già in uso.",
  daily_pack_already_claimed: "Hai già aperto il pacchetto di oggi.",
  insufficient_coins: "Non hai abbastanza monete.",
  pack_not_found: "Pacchetto non trovato.",
  nothing_to_convert: "Non ci sono doppioni da convertire.",
  invalid_count: "Numero di copie non valido.",
  match_already_active: "Hai già una partita in corso: riprendila o abbandonala.",
  match_not_found: "Partita non trovata.",
  match_not_active: "La partita è già finita.",
  round_already_resolved: "Il round è già stato giocato.",
  round_not_expired: "Il tempo non è ancora scaduto.",
  character_not_available: "Questo personaggio non è disponibile.",
  character_already_played: "Questo personaggio è già stato giocato.",
  invalid_team_size: "Scegli 5 personaggi.",
  duplicate_card: "Hai scelto due volte la stessa carta.",
  duplicate_character: "Non puoi schierare due copie dello stesso personaggio.",
  card_not_owned: "Una delle carte scelte non è più tua.",
  invalid_difficulty: "Difficoltà non valida.",
  too_many_formations: "Hai raggiunto il numero massimo di formazioni.",
  invalid_formation_name: "Il nome della formazione deve avere da 1 a 30 caratteri.",
  formation_not_found: "Formazione non trovata.",
  lobby_not_found: "Codice non valido o scaduto.",
  cannot_play_yourself: "Non puoi sfidare te stesso.",
  round_expired: "Tempo scaduto per questo round.",
  opponent_still_connected: "L'avversario è ancora connesso.",
  conquest_locked: "Completa 5 partite o raggiungi il livello 3 per sbloccare la Conquista.",
  daily_loss_limit: "Hai già perso 10 carte oggi: la Conquista torna dopo la mezzanotte.",
  not_enough_conquerable: "In Conquista servono almeno 3 carte non protette.",
  card_locked: "Una carta appena conquistata non si può schierare in Conquista per 48 ore.",
  card_at_stake: "Una delle carte è in palio in una scelta aperta.",
  same_pair_cooldown: "Avete già giocato in Conquista nelle ultime 24 ore.",
  card_not_eligible: "Questa carta non si può conquistare.",
  emergency_already_played: "Hai già giocato l'Emergenza di oggi: la prossima arriva dopo la mezzanotte.",
  emergency_not_started: "L'Emergenza di oggi non è ancora iniziata: scegli la squadra.",
  invalid_emergency_squad: "Scegli 8 personaggi.",
};

export function describeServerError(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "";
  return SERVER_ERROR_MESSAGES[message] ?? "Qualcosa è andato storto. Riprova tra poco.";
}
