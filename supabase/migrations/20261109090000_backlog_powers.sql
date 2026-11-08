-- The powers of docs/POWERS-BACKLOG.md, ready in the rules engine. No card has them yet:
-- each one arrives later on new characters, with its params on card_definitions.
-- Nebbia still needs the server to hide its card (see the backlog) before a card gets it.

insert into public.power_definitions (code, name, tier, description_template, required_params) values
  ('scrappy', 'Arte di arrangiarsi', 'simple',
   'Le abilità richieste che valgono meno di {min_value} contano {min_value}', array['min_value']),
  ('counterpunch', 'Contrattacco', 'simple',
   '+{bonus} per ogni abilità richiesta in cui il personaggio avversario lo supera, fino a +{max}', array['bonus', 'max']),
  ('eclectic', 'Eclettico', 'simple',
   '+{bonus} se le abilità richieste sono di almeno {min_families} famiglie diverse', array['bonus', 'min_families']),
  ('lone_wolf', 'Lupo solitario', 'simple',
   '+{bonus} se nessun altro personaggio della squadra è della sua fazione', array['bonus']),
  ('opportunist', 'Opportunista', 'simple',
   '+{bonus} se il personaggio avversario non ha un potere', array['bonus']),
  ('reflect', 'Riflesso', 'simple',
   'Immune a Sabotatore, e lo rimanda indietro: il Sabotatore avversario perde lui il suo malus', '{}'),
  ('vendetta', 'Vendetta', 'simple',
   '+{bonus} se hai perso il round precedente', array['bonus']),
  ('main_event', 'Grande prova', 'simple',
   '+{bonus} contro la Minaccia di livello più alto della partita', array['bonus']),
  ('adaptable', 'Adattabile', 'simple',
   '+{bonus} contro una Minaccia con modificatore, e i malus del modificatore non lo toccano', array['bonus']),
  ('sacrifice', 'Sacrificio', 'distinctive',
   'Il suo punteggio conta 0, e il tuo prossimo personaggio ottiene +{bonus}', array['bonus']),
  ('pack_leader', 'Capobranco', 'distinctive',
   'Dopo di lui, ogni tuo personaggio della sua fazione ottiene +{bonus} fino a fine partita', array['bonus']),
  ('echo', 'Riverbero', 'distinctive',
   'Copia il potere a punti del personaggio che hai giocato nel round prima', '{}'),
  ('catalyst', 'Catalizzatore', 'distinctive',
   'Il tuo prossimo personaggio moltiplica per {multiplier} il bonus del suo potere', array['multiplier']),
  ('fog', 'Nebbia', 'distinctive',
   'L''avversario non vede chi hai giocato fino a fine partita', '{}');
