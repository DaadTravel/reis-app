-- Nieuwe activiteit vanuit de app zonder volgorde: de database kent max+1 binnen de reis toe (code-controleur
-- 2026-10-05). Zo krijgen twee activiteiten die offline of door twee ouders tegelijk zijn toegevoegd nooit
-- dezelfde volgorde (unique reis_id, volgorde). Een opgegeven volgorde blijft ongemoeid.
create function reis_intern.activiteit_volgorde()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.volgorde is null then
    -- Eén toekenning per reis tegelijk (tegen twee gelijktijdige toevoegingen).
    perform pg_advisory_xact_lock(hashtext('reis.activiteiten.volgorde:' || new.reis_id::text));
    select coalesce(max(a.volgorde), 0) + 1 into new.volgorde from reis.activiteiten a where a.reis_id = new.reis_id;
  end if;
  return new;
end;
$$;

create trigger activiteiten_volgorde before insert on reis.activiteiten
  for each row execute function reis_intern.activiteit_volgorde();
