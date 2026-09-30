-- Aanvulling op 0007 (besluit gebruiker 2026-09-30):
-- - Kamerindeling 'anders' krijgt een toelichting, zodat die informatie
--   niet verloren gaat (vgl. status_label, nachten_label).
-- - Een ingevulde beoordeling heeft altijd een bron en een opzoekdatum:
--   scores veranderen, zonder datum weet je niet hoe oud een score is.

alter table reis.verblijven
  add column kamerindeling_toelichting text,
  add constraint verblijven_beoordeling_met_bron check (
    beoordeling is null or (beoordeling_bron is not null and beoordeeld_op is not null)
  );
