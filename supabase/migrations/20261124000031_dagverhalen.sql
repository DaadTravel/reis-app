-- Dagverhaal (besluit gebruiker 2026-11-24): per plek de dagen als kort verhaal (kop, logistiek, foto, verhaal,
-- tips, gekoppelde activiteiten), plus wat het nieuwe Overzicht nodig heeft. Fase 1 van de bouw; de app leest
-- het pas vanaf fase 5. Teksten schrijft Claude; ze staan niet in de Excel (de app is de bron).
--
-- - reis.dagverhalen: één rij per "dag N van een plek" (dag_in_plek, 1 = aankomstdag). De datum is afgeleid
--   (aankomst bij de plek + N - 1), zodat een verhaal meeschuift als de route verschuift. Niet opgeslagen omdat
--   het afleidbaar is: datum, dagnummer in de reis, km en rijtijd (de regel van een rijdag komt uit de route).
-- - reis.activiteiten.dagverhaal_id: activiteit bij een dag. Een vaste datum (activiteiten.datum, Excel) gaat voor.
-- - reis.reizen.highlights: maximaal 3 regels "waar we naar uitkijken" (Overzicht).
-- - reis.stops.kort: één korte zin per plek voor de hoofdstukken in het Overzicht. stops.lede (de lange
--   beschrijving in Route) blijft ongewijzigd; zonder kort toont de app de eerste zin van lede.
--
-- Koppelingen binnen één reis worden door de database afgedwongen (samengestelde sleutel met reis_id): een
-- dagverhaal kan niet aan een plek van een andere reis hangen, een activiteit niet aan een dagverhaal van een
-- andere reis. Verwijderen van een plek of dagverhaal maakt alleen de koppeling leeg (set null op die ene kolom):
-- activiteiten en hun hartjes blijven staan. Een dagverhaal zonder plek toont de app niet.
-- RLS zoals reis.dagen: leden lezen, bewerkers schrijven; anon niets.

create type reis.verhaalstatus as enum ('concept', 'akkoord');

-- Doel voor de samengestelde koppeling (id is al uniek; dit voegt alleen de combinatie met reis_id toe).
alter table reis.stops add constraint stops_id_reis_uniek unique (id, reis_id);

create table reis.dagverhalen (
  id uuid primary key default gen_random_uuid(),
  reis_id uuid not null references reis.reizen (id) on delete cascade,
  stop_id uuid,
  dag_in_plek smallint not null check (dag_in_plek between 1 and 60),
  titel text not null check (char_length(titel) between 1 and 80),
  -- Alleen voor een dag zonder rit; een rijdag krijgt zijn regel uit route_punten.
  logistiek text check (logistiek is null or char_length(logistiek) between 1 and 160),
  verhaal text not null check (char_length(verhaal) between 1 and 900),
  tips text[] not null default '{}' check (cardinality(tips) <= 2 and array_position(tips, null) is null),
  foto_id uuid references reis.fotos (id) on delete set null,
  uitgelicht boolean not null default false,
  status reis.verhaalstatus not null default 'concept',
  constraint dagverhalen_id_reis_uniek unique (id, reis_id),
  constraint dagverhalen_dag_uniek unique (stop_id, dag_in_plek),
  constraint dagverhalen_stop_fk foreign key (stop_id, reis_id) references reis.stops (id, reis_id) on delete set null (stop_id)
);
create index dagverhalen_reis_idx on reis.dagverhalen (reis_id);
create index dagverhalen_stop_reis_idx on reis.dagverhalen (stop_id, reis_id);
create index dagverhalen_foto_idx on reis.dagverhalen (foto_id);

alter table reis.activiteiten add column dagverhaal_id uuid;
alter table reis.activiteiten add constraint activiteiten_dagverhaal_fk
  foreign key (dagverhaal_id, reis_id) references reis.dagverhalen (id, reis_id) on delete set null (dagverhaal_id);
create index activiteiten_dagverhaal_idx on reis.activiteiten (dagverhaal_id, reis_id);

alter table reis.reizen add column highlights text[] not null default '{}'
  check (cardinality(highlights) <= 3 and array_position(highlights, null) is null);

alter table reis.stops add column kort text check (kort is null or char_length(kort) between 1 and 120);

alter table reis.dagverhalen enable row level security;
create policy dagverhalen_lezen on reis.dagverhalen for select to authenticated using ((select reis_intern.is_lid()));
create policy dagverhalen_toevoegen on reis.dagverhalen for insert to authenticated with check ((select reis_intern.is_bewerker()));
create policy dagverhalen_wijzigen on reis.dagverhalen for update to authenticated using ((select reis_intern.is_bewerker())) with check ((select reis_intern.is_bewerker()));
create policy dagverhalen_verwijderen on reis.dagverhalen for delete to authenticated using ((select reis_intern.is_bewerker()));

revoke all on reis.dagverhalen from anon;
grant select, insert, update, delete on reis.dagverhalen to authenticated;
