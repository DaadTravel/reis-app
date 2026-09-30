-- Dagen en routepunten krijgen een vaste koppeling met hun plek (stop),
-- net als verblijven en activiteiten (architectuurcheck 2026-09-30).
-- Tot nu toe koppelde de app op naam ("Kanchanaburi" = "Kanchanaburi &
-- River Kwai"); een hernoemde plek raakte dan stil zijn dagen kwijt.
--
-- Leeg (null) is bewust: Vertrek/Thuis en overstappen zonder eigen plek.

alter table reis.dagen
  add column stop_id uuid references reis.stops (id) on delete set null;
alter table reis.route_punten
  add column stop_id uuid references reis.stops (id) on delete set null;

create index on reis.dagen (stop_id);
create index on reis.route_punten (stop_id);

-- Eenmalig vullen met de naamkoppeling die de app tot nu toe gebruikte:
-- zelfde naam, of zelfde kern (zonder " (…)" en zonder " & …").
create function pg_temp.kern(naam text) returns text language sql immutable
  as $$ select split_part(split_part(naam, ' (', 1), ' & ', 1) $$;

update reis.route_punten p
   set stop_id = s.id
  from reis.stops s
 where s.reis_id = p.reis_id
   and (s.naam = p.naam or pg_temp.kern(s.naam) = pg_temp.kern(p.naam));

update reis.dagen d
   set stop_id = s.id
  from reis.stops s
 where s.reis_id = d.reis_id
   and (s.naam = d.plaats or pg_temp.kern(s.naam) = pg_temp.kern(d.plaats));

-- Een reisdag "A → B" hoort bij aankomstplek B, maar alleen als B geen
-- eigen dag heeft (zoals de app het tot nu toe toonde).
update reis.dagen d
   set stop_id = s.id
  from reis.stops s
 where d.stop_id is null
   and s.reis_id = d.reis_id
   and d.plaats like '% → %'
   and pg_temp.kern(s.naam) = pg_temp.kern(split_part(d.plaats, ' → ', 2))
   and not exists (select 1 from reis.dagen x where x.stop_id = s.id);
