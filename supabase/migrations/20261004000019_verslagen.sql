-- Reisverslag per dag (besluit gebruiker 2026-10-04): tijdens en na een reis schrijven de ouders
-- (rol bewerker) per dag een stuk tekst, voor naslag en om te kopiëren naar Polarsteps of een
-- fotoboek. Eén tekst per schrijver per reisdag; het hele gezin leest mee, kinderen schrijven niet.
-- Geen foto's: die blijven in Polarsteps en het fotoboek.

create table reis.verslagen (
  reis_id uuid not null references reis.reizen (id) on delete cascade,
  datum date not null,
  user_id uuid not null default auth.uid() references reis.leden (user_id) on delete cascade,
  tekst text not null default '' check (char_length(tekst) <= 20000),
  -- Moment van schrijven op de telefoon (ook als het verslag later pas verstuurd kon worden).
  gewijzigd timestamptz not null default now(),
  primary key (reis_id, datum, user_id)
);
create index verslagen_user_id_idx on reis.verslagen (user_id);

alter table reis.verslagen enable row level security;

-- Lezen: elk lid. Schrijven, wijzigen en weghalen: alleen je eigen verslag, en alleen als bewerker.
create policy verslagen_lezen on reis.verslagen
  for select to authenticated
  using ((select reis_intern.is_lid()));
create policy verslagen_schrijven on reis.verslagen
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select reis_intern.is_bewerker()));
create policy verslagen_wijzigen on reis.verslagen
  for update to authenticated
  using (user_id = (select auth.uid()) and (select reis_intern.is_bewerker()))
  with check (user_id = (select auth.uid()) and (select reis_intern.is_bewerker()));
create policy verslagen_weghalen on reis.verslagen
  for delete to authenticated
  using (user_id = (select auth.uid()) and (select reis_intern.is_bewerker()));
