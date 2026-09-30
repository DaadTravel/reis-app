-- Per verblijf in het reisoverzicht: beoordeling en kamerindeling
-- (besluit gebruiker 2026-09-30).
-- - Beoordeling: bron eerst de Excel van de reis; staat die daar niet, dan
--   Booking.com via de connector in Claude. Scores veranderen, dus ook de
--   datum waarop de score is opgezocht.
-- - Kamerindeling: vaste lijst. `kamers` (aantal) blijft bestaan; de
--   indeling wordt daar niet uit afgeleid.
-- - Budgetposten: een onbekend bedrag is null (de app toont "?"), niet 0.
--   Plafonds zijn nooit een bedrag.
-- Bestaande tabellen: RLS, policies en grants blijven ongewijzigd gelden.

create type reis.kamerindeling as enum (
  'twee_kamers_apart',
  'gezinskamer',
  'appartement_2_slaapkamers',
  'anders'
);

alter table reis.verblijven
  add column kamerindeling reis.kamerindeling,
  add column beoordeling numeric(3,1) check (beoordeling between 0 and 10),
  add column beoordeling_bron text,
  add column beoordeeld_op date;

alter table reis.budget_posten alter column totaal drop not null;
