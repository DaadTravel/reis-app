-- Eigen naam voor het vervoer van een etappe, bijv. "Privébusje" bij leg_vervoer 'bus'
-- (besluit gebruiker 2026-10-01). Leeg = de app toont de standaardnaam van leg_vervoer.
-- Bestaande RLS-policies en grants op reis.route_punten gelden ook voor deze kolom.
alter table reis.route_punten
  add column if not exists leg_vervoer_label text
  check (leg_vervoer_label is null or length(btrim(leg_vervoer_label)) between 1 and 40);
