-- Vaste velden in plaats van losse tekst (besluit gebruiker 2026-10-01, "drie
-- scenario's"): rit met tijden, verblijf per bezoek met contact, excursie met
-- datum en tijd. Tijden zijn lokale tijd ter plekke (geen tijdzone).
--
-- Contact en boekingscode zijn praktische boekingsgegevens: alleen in schema
-- reis achter RLS (leden), nooit in git/docs/logs en niet in een latere
-- deelversie (CLAUDE.md, Privacy). Paspoort-/ID- en betaalgegevens horen
-- hier niet. Bestaande RLS-policies en grants van de tabellen gelden ook voor
-- deze kolommen.

-- Rit: de leg_*-kolommen van een routepunt beschrijven de rit die er aankomt.
alter table reis.route_punten
  add column if not exists leg_datum date,                 -- vertrekdag
  add column if not exists leg_vertrek time,
  add column if not exists leg_aankomst time,
  add column if not exists leg_aankomst_dagen smallint not null default 0, -- 1 = aankomst de dag erna
  add column if not exists leg_telefoon text,
  add column if not exists leg_email text,
  add column if not exists leg_boekingscode text;

alter table reis.route_punten
  add constraint route_punten_leg_aankomst_dagen_ck check (leg_aankomst_dagen between 0 and 3),
  add constraint route_punten_leg_telefoon_ck check (char_length(leg_telefoon) between 1 and 40),
  add constraint route_punten_leg_email_ck check (char_length(leg_email) between 3 and 200 and leg_email like '%@%'),
  add constraint route_punten_leg_boekingscode_ck check (char_length(leg_boekingscode) between 1 and 80);

-- Verblijf: hangt aan het bezoek (routepunt); een bezoek kan meer verblijven
-- hebben (wissel halverwege), dus eigen in- en uitcheckdatum.
alter table reis.verblijven
  add column if not exists route_punt_id uuid references reis.route_punten (id) on delete set null,
  add column if not exists inchecken date,
  add column if not exists uitchecken date,
  add column if not exists inchecktijd time,
  add column if not exists uitchecktijd time,
  add column if not exists adres text,
  add column if not exists telefoon text,
  add column if not exists email text,
  add column if not exists boekingscode text;

alter table reis.verblijven
  add constraint verblijven_periode_ck check (uitchecken > inchecken),
  add constraint verblijven_adres_ck check (char_length(adres) between 1 and 300),
  add constraint verblijven_telefoon_ck check (char_length(telefoon) between 1 and 40),
  add constraint verblijven_email_ck check (char_length(email) between 3 and 200 and email like '%@%'),
  add constraint verblijven_boekingscode_ck check (char_length(boekingscode) between 1 and 80);

create index if not exists verblijven_route_punt_id_idx on reis.verblijven (route_punt_id);

-- Excursie/activiteit: bij welk bezoek, wanneer, waar ophalen, contact.
-- `wanneer` (tekst) blijft als terugval voor wat (nog) geen datum heeft.
alter table reis.activiteiten
  add column if not exists route_punt_id uuid references reis.route_punten (id) on delete set null,
  add column if not exists datum date,
  add column if not exists begin_tijd time,
  add column if not exists eind_tijd time,
  add column if not exists ophaalpunt text,
  add column if not exists link text,
  add column if not exists telefoon text,
  add column if not exists email text,
  add column if not exists boekingscode text;

alter table reis.activiteiten
  add constraint activiteiten_ophaalpunt_ck check (char_length(ophaalpunt) between 1 and 300),
  add constraint activiteiten_link_ck check (link ~* '^https?://'),
  add constraint activiteiten_telefoon_ck check (char_length(telefoon) between 1 and 40),
  add constraint activiteiten_email_ck check (char_length(email) between 3 and 200 and email like '%@%'),
  add constraint activiteiten_boekingscode_ck check (char_length(boekingscode) between 1 and 80);

create index if not exists activiteiten_route_punt_id_idx on reis.activiteiten (route_punt_id);
