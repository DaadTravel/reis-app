-- Waar leent een plek zich voor (besluit gebruiker 2026-10-28). Per plek vijf scores 1–5, de plek inclusief de
-- uitstapjes vanaf daar: cultuur, stad, natuur (strand telt niet, dat is relax), actief (een dag door de stad
-- lopen = 3) en relax. Geen profiel = doorreisplek: telt niet mee in de reisscore (gemiddelde gewogen naar nachten,
-- berekend in de app, Opmaak.reisProfiel/reisScore). Daarbij een korte zin "leent zich voor".
-- Bestaande RLS-policies en grants op reis.stops gelden ook voor deze kolommen (lezen: lid, schrijven: bewerker).
alter table reis.stops add column profiel jsonb check (profiel is null or (
  jsonb_typeof(profiel) = 'object'
  and profiel ?& array['cultuur', 'stad', 'natuur', 'actief', 'relax']
  and profiel - array['cultuur', 'stad', 'natuur', 'actief', 'relax'] = '{}'::jsonb
  and jsonb_typeof(profiel -> 'cultuur') = 'number' and (profiel ->> 'cultuur') ~ '^[1-5]$'
  and jsonb_typeof(profiel -> 'stad') = 'number' and (profiel ->> 'stad') ~ '^[1-5]$'
  and jsonb_typeof(profiel -> 'natuur') = 'number' and (profiel ->> 'natuur') ~ '^[1-5]$'
  and jsonb_typeof(profiel -> 'actief') = 'number' and (profiel ->> 'actief') ~ '^[1-5]$'
  and jsonb_typeof(profiel -> 'relax') = 'number' and (profiel ->> 'relax') ~ '^[1-5]$'));
alter table reis.stops add column leent_zich_voor text check (leent_zich_voor is null or char_length(leent_zich_voor) between 1 and 120);
