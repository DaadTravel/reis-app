-- Vervoer: naast auto, vliegtuig en boot ook bus en trein (besluit gebruiker 2026-10-01).
-- Alleen nieuwe waarden; bestaande rijen en RLS blijven ongewijzigd.
alter type reis.vervoer add value if not exists 'bus';
alter type reis.vervoer add value if not exists 'train';
