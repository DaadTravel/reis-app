-- Hartjes per gezinslid bij activiteiten, met een vorm per groep (besluit gebruiker
-- 2026-10-04): tieners en volwassenen geven elk aan wat hen aanspreekt; de app toont
-- per gever het teken van zijn groep. Geen leeftijd of geboortedatum, alleen de groep.

-- Groep per lid; leeg = nog niet ingevuld (de app toont dan het teken van een volwassene).
alter table reis.leden
  add column if not exists groep text;
alter table reis.leden
  add constraint leden_groep_ck check (groep in ('tiener', 'volwassene'));

-- Alle leden zien elkaars naam en groep (één gezin), zodat je ziet wie een hartje gaf.
-- Was: alleen je eigen rij, of alles als bewerker. Schrijven blijft alleen via SQL/dashboard.
drop policy if exists leden_lezen on reis.leden;
create policy leden_lezen on reis.leden
  for select to authenticated
  using ((select reis_intern.is_lid()));

-- Hartjes: één per lid per activiteit. Weg met het lid of de activiteit (cascade).
create table reis.hartjes (
  user_id uuid not null default auth.uid() references reis.leden (user_id) on delete cascade,
  activiteit_id uuid not null references reis.activiteiten (id) on delete cascade,
  aangemaakt timestamptz not null default now(),
  primary key (user_id, activiteit_id)
);
create index hartjes_activiteit_id_idx on reis.hartjes (activiteit_id);

alter table reis.hartjes enable row level security;
-- Geen wijzigen: een hartje geef je of haal je weg.
revoke update on reis.hartjes from authenticated;

-- Lezen: elk lid ziet alle hartjes. Geven: alleen je eigen, en alleen als lid (ook kijkers).
-- Weghalen: alleen je eigen.
create policy hartjes_lezen on reis.hartjes
  for select to authenticated
  using ((select reis_intern.is_lid()));
create policy hartjes_geven on reis.hartjes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select reis_intern.is_lid()));
create policy hartjes_weghalen on reis.hartjes
  for delete to authenticated
  using (user_id = (select auth.uid()));
