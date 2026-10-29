// Database functions raise stable error codes as messages; the UI shows them in Italian.
const SERVER_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Sessione scaduta: accedi di nuovo.",
  profile_not_found: "Profilo non trovato: esci e accedi di nuovo.",
  username_invalid: "Il nome utente deve avere da 3 a 20 caratteri: lettere, numeri o _.",
  username_taken: "Questo nome utente è già in uso.",
  daily_pack_already_claimed: "Hai già aperto il pacchetto di oggi.",
  insufficient_coins: "Non hai abbastanza monete.",
  pack_not_found: "Pacchetto non trovato.",
};

export function describeServerError(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "";
  return SERVER_ERROR_MESSAGES[message] ?? "Qualcosa è andato storto. Riprova tra poco.";
}
