-- Contact en boekingscodes vóór de reis (besluit gebruiker 2026-10-18): ouders wijzigen in de app ook vóór de
-- reis adres, telefoon, e-mail, boekingscode en notitie. E-mail is nieuw in de app; het logboek legt die nu ook
-- vast. Verder ongewijzigd t.o.v. …0023. (De lengtegrens hieronder is dubbel: …0013 eist al 3–200 tekens met @.)
alter table reis.route_punten add constraint route_punten_leg_email_lengte check (char_length(leg_email) <= 300);
alter table reis.verblijven add constraint verblijven_email_lengte check (char_length(email) <= 300);
alter table reis.activiteiten add constraint activiteiten_email_lengte check (char_length(email) <= 300);

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
    when 'route_punten' then array['leg_vertrek', 'leg_aankomst', 'leg_aankomst_dagen', 'leg_adres', 'leg_boekingscode', 'leg_telefoon', 'leg_email', 'leg_status', 'leg_notitie']
    when 'verblijven' then array['inchecktijd', 'uitchecktijd', 'adres', 'telefoon', 'email', 'boekingscode', 'status', 'notitie']
    when 'activiteiten' then array['naam', 'datum', 'begin_tijd', 'eind_tijd', 'ophaalpunt', 'telefoon', 'email', 'boekingscode', 'status', 'notitie']
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
