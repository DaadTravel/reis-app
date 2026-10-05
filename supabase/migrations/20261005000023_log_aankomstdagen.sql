-- Logboek bewerken onderweg: ook leg_aankomst_dagen (de app rekent de aankomstdag mee bij een gewijzigde
-- vertrektijd, besluit gebruiker 2026-10-05). Verder ongewijzigd t.o.v. …0021.
create or replace function reis_intern.log_wijziging()
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
    when 'route_punten' then array['leg_vertrek', 'leg_aankomst', 'leg_aankomst_dagen', 'leg_adres', 'leg_boekingscode', 'leg_telefoon', 'leg_status', 'leg_notitie']
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
