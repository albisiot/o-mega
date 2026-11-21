-- Holdout (P057) is a man, as the published story has always spoken of him: the real
-- name and the powers text of the card agree with it now. Season 3 says his name with
-- those of the night shift (docs/STORY.md §7.5, Chapter 3). Texts are placeholders,
-- like the rest of the catalog content (docs/WORLD.md).

update public.card_definitions
set real_name = 'Efisio Puddu',
    powers_text = 'Era al centro dell''Ora Zero e da allora non riesce a morire. Nessuna macchina lo registra: per telecamere e computer è solo rumore di fondo. Si muove a fatica, ma non cede mai.'
where code = 'P057';
