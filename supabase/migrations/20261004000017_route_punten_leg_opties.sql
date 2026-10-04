-- Vervoersopties bij een rit waarvan het vervoer nog niet gekozen is (besluit gebruiker
-- 2026-10-04). Lijst van objecten {vervoer, label, minuten, prijs, toelichting}: vervoer
-- is een waarde van reis.vervoer, minuten de reistijd deur tot deur (benadering), prijs een
-- indicatie in euro voor het hele reisgezelschap (alleen waar betrouwbaar te schatten).
-- Suggesties van Claude, alleen in de app; de Excel overschrijft ze nooit. De app toont ze
-- alleen zolang leg_vervoer leeg is. Bestaande RLS-policies en grants van
-- reis.route_punten gelden ook hier.
alter table reis.route_punten
  add column if not exists leg_opties jsonb;

alter table reis.route_punten
  add constraint route_punten_leg_opties_ck check (leg_opties is null or jsonb_typeof(leg_opties) = 'array');
