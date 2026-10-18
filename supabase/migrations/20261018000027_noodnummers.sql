-- Noodnummers (besluit gebruiker 2026-10-06, gebouwd 2026-10-18): uitklapbaar onderaan een reis, per land als de
-- reis door meer landen gaat. Geen gezondheidsinformatie.
-- - reis.landen: per land de alarmnummers en de Nederlandse ambassade (vult Claude, met bron en controledatum).
-- - reis.stops.land: het land van een plek (ISO 3166-1 alpha-2, bijv. 'JP').
-- - reis.verzekeringen: de reisverzekering(en) van het gezin (alarmcentrale, polisnummer); vult de gebruiker.
-- Lezen: elk lid (ook kinderen: in nood moet iedereen het nummer kunnen vinden). Schrijven: bewerkers.

create table reis.landen (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  naam text not null check (char_length(naam) between 1 and 80),
  -- Lijst van { label, nummer, uitleg? }, in de volgorde waarin de app ze toont.
  nummers jsonb not null default '[]'::jsonb check (jsonb_typeof(nummers) = 'array'),
  -- { naam, adres, telefoon, link }; leeg als er geen is.
  ambassade jsonb check (ambassade is null or jsonb_typeof(ambassade) = 'object'),
  bron text check (char_length(bron) <= 500),
  gecontroleerd date
);

alter table reis.stops add column land text check (land ~ '^[A-Z]{2}$');

create table reis.verzekeringen (
  id uuid primary key default gen_random_uuid(),
  naam text not null check (char_length(naam) between 1 and 120),
  alarmnummer text check (char_length(alarmnummer) <= 40),
  polisnummer text check (char_length(polisnummer) <= 80),
  link text check (char_length(link) <= 500),
  volgorde integer not null default 0
);

alter table reis.landen enable row level security;
alter table reis.verzekeringen enable row level security;

create policy landen_lezen on reis.landen for select to authenticated using ((select reis_intern.is_lid()));
create policy landen_toevoegen on reis.landen for insert to authenticated with check ((select reis_intern.is_bewerker()));
create policy landen_wijzigen on reis.landen for update to authenticated using ((select reis_intern.is_bewerker())) with check ((select reis_intern.is_bewerker()));
create policy landen_verwijderen on reis.landen for delete to authenticated using ((select reis_intern.is_bewerker()));

create policy verzekeringen_lezen on reis.verzekeringen for select to authenticated using ((select reis_intern.is_lid()));
create policy verzekeringen_toevoegen on reis.verzekeringen for insert to authenticated with check ((select reis_intern.is_bewerker()));
create policy verzekeringen_wijzigen on reis.verzekeringen for update to authenticated using ((select reis_intern.is_bewerker())) with check ((select reis_intern.is_bewerker()));
create policy verzekeringen_verwijderen on reis.verzekeringen for delete to authenticated using ((select reis_intern.is_bewerker()));

revoke all on reis.landen, reis.verzekeringen from anon;
grant select, insert, update, delete on reis.landen, reis.verzekeringen to authenticated;
