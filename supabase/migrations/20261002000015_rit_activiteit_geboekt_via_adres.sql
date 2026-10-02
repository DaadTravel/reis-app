-- Contactgegevens uit het tabblad "Contact" van de Excel (besluit gebruiker
-- 2026-10-02): per boeking Via, Adres, Telefoon, E-mail en Boekingsnr, voor
-- Transport, Verblijf en Activiteit. Verblijven hebben alles al (…0013, …0014).
-- Erbij: "Via" (waar geboekt) voor ritten en activiteiten, en een adres voor een
-- rit (vertrekpunt, bijv. pier of autoverhuur). Het adres van een activiteit is
-- het bestaande `ophaalpunt`. Praktische boekingsgegevens: alleen in schema
-- reis achter RLS; bestaande policies en grants gelden ook voor deze kolommen.
alter table reis.route_punten
  add column if not exists leg_geboekt_via text,
  add column if not exists leg_adres text;

alter table reis.route_punten
  add constraint route_punten_leg_geboekt_via_lengte check (char_length(leg_geboekt_via) <= 60),
  add constraint route_punten_leg_adres_ck check (char_length(leg_adres) between 1 and 300);

alter table reis.activiteiten
  add column if not exists geboekt_via text;

alter table reis.activiteiten
  add constraint activiteiten_geboekt_via_lengte check (char_length(geboekt_via) <= 60);
