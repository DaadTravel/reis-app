-- Reisverslag: een oudere versie mag een nieuwere nooit overschrijven (code-controleur 2026-10-04).
-- Bijvoorbeeld: een tekst die zonder bereik op de telefoon in de wachtrij stond en later pas aankomt,
-- terwijl er intussen op een ander toestel een nieuwere versie is opgeslagen. "gewijzigd" is het moment
-- van schrijven op het toestel; een update met een ouder moment laat de rij ongewijzigd (geen fout, zodat
-- de app het item gewoon als verwerkt beschouwt).

create function reis_intern.verslag_nieuwste_wint()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.gewijzigd < old.gewijzigd then
    return old;
  end if;
  return new;
end;
$$;

create trigger verslagen_nieuwste_wint
  before update on reis.verslagen
  for each row execute function reis_intern.verslag_nieuwste_wint();
