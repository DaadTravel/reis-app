-- Bewerken onderweg (besluit gebruiker 2026-10-05): ouders wijzigen in de app tijden, adres, contact,
-- boekingscode, betaalstatus en notities, en voegen activiteiten toe. Wijzigingen in de app winnen van de
-- Excel; daarom een logboek, zodat Claude de Excel na de reis kan bijwerken (en een vergissing terugzetten).

-- Notitie onderweg (bijv. wifi, deurcode, gate); zichtbaar voor het hele gezin.
alter table reis.route_punten add column leg_notitie text check (char_length(leg_notitie) <= 2000);
alter table reis.verblijven add column notitie text check (char_length(notitie) <= 2000);

-- Logboek: wie, wanneer, welke rij en welk veld, oude en nieuwe waarde (als tekst). Alleen wijzigingen vanuit
-- de app (ingelogde gebruiker); aanpassingen via SQL/dashboard (auth.uid() leeg) komen er niet in.
create table reis.wijzigingen (
  id bigint generated always as identity primary key,
  tabel text not null,
  rij_id uuid not null,
  veld text not null,          -- '*' bij een nieuwe rij
  oud text,
  nieuw text,
  door uuid,
  op timestamptz not null default now()
);
create index wijzigingen_rij_idx on reis.wijzigingen (tabel, rij_id);
create index wijzigingen_door_idx on reis.wijzigingen (door);

alter table reis.wijzigingen enable row level security;
-- Lezen: alleen bewerkers. Schrijven gebeurt alleen door de trigger (geen policies voor insert/update/delete).
create policy wijzigingen_lezen on reis.wijzigingen
  for select to authenticated
  using ((select reis_intern.is_bewerker()));
revoke insert, update, delete on reis.wijzigingen from authenticated;

-- Trigger: per gewijzigd veld uit de lijst van "bewerken onderweg" een regel; bij een nieuwe activiteit één regel.
create function reis_intern.log_wijziging()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  velden text[];
  v text;
  oud_j jsonb;
  nieuw_j jsonb;
begin
  if auth.uid() is null then
    return null;
  end if;
  if tg_op = 'INSERT' then
    insert into reis.wijzigingen (tabel, rij_id, veld, oud, nieuw, door)
    values (tg_table_name, new.id, '*', null, to_jsonb(new)::text, auth.uid());
    return null;
  end if;
  velden := case tg_table_name
    when 'route_punten' then array['leg_vertrek', 'leg_aankomst', 'leg_adres', 'leg_boekingscode', 'leg_telefoon', 'leg_status', 'leg_notitie']
    when 'verblijven' then array['inchecktijd', 'uitchecktijd', 'adres', 'telefoon', 'boekingscode', 'status', 'notitie']
    when 'activiteiten' then array['naam', 'datum', 'begin_tijd', 'eind_tijd', 'ophaalpunt', 'telefoon', 'boekingscode', 'status', 'notitie']
    else array[]::text[] end;
  oud_j := to_jsonb(old);
  nieuw_j := to_jsonb(new);
  foreach v in array velden loop
    if (oud_j -> v) is distinct from (nieuw_j -> v) then
      insert into reis.wijzigingen (tabel, rij_id, veld, oud, nieuw, door)
      values (tg_table_name, new.id, v, oud_j ->> v, nieuw_j ->> v, auth.uid());
    end if;
  end loop;
  return null;
end;
$$;

create trigger route_punten_log after update on reis.route_punten
  for each row execute function reis_intern.log_wijziging();
create trigger verblijven_log after update on reis.verblijven
  for each row execute function reis_intern.log_wijziging();
create trigger activiteiten_log after insert or update on reis.activiteiten
  for each row execute function reis_intern.log_wijziging();
