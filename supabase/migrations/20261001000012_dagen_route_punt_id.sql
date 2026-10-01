-- Een dag hangt aan een bezoek in de route (routepunt), niet alleen aan de plek
-- (besluit gebruiker 2026-10-01). Een plek die twee keer in de route staat
-- (bijv. heen en terug via dezelfde stad) heeft zo per bezoek een eigen dag;
-- tot nu toe telde de app "het hoeveelste bezoek" op volgorde.
--
-- Betekenis:
--   - dag met stop_id (verblijfdag): het routepunt van dat bezoek;
--   - dag zonder stop_id (reisdag "A → B", bijv. heen- of terugvlucht): het
--     routepunt waar die etappe aankomt (de leg_*-kolommen van dat punt
--     beschrijven dezelfde rit).
-- Leeg (null) = (nog) niet gekoppeld. stop_id blijft bestaan.
-- Bestaande RLS-policies en grants op reis.dagen gelden ook voor deze kolom.
-- De database dwingt (net als bij stop_id) niet af dat het routepunt bij
-- dezelfde reis hoort; de app en de vulling hieronder bewaken dat.

alter table reis.dagen
  add column if not exists route_punt_id uuid references reis.route_punten (id) on delete set null;

create index if not exists dagen_route_punt_id_idx on reis.dagen (route_punt_id);

-- Eenmalig vullen.
-- 1. Verblijfdag: het k-de bezoek aan een plek krijgt de k-de dag van die plek.
with rp as (
  select p.id, p.reis_id, p.stop_id,
         row_number() over (partition by p.reis_id, p.stop_id order by p.volgorde) as bezoek
    from reis.route_punten p
   where p.stop_id is not null),
d as (
  select x.id, x.reis_id, x.stop_id,
         row_number() over (partition by x.reis_id, x.stop_id order by x.volgorde) as bezoek
    from reis.dagen x
   where x.stop_id is not null)
update reis.dagen t
   set route_punt_id = rp.id
  from d join rp on rp.reis_id = d.reis_id and rp.stop_id = d.stop_id and rp.bezoek = d.bezoek
 where t.id = d.id and t.route_punt_id is null;

-- 2. Reisdag zonder plek: vóór de eerste verblijfdag = aankomst op het 2e
--    routepunt (heenreis); daarna = aankomst op het laatste routepunt (terugreis).
with rp as (
  select p.id, p.reis_id,
         row_number() over (partition by p.reis_id order by p.volgorde) as nr,
         count(*) over (partition by p.reis_id) as n
    from reis.route_punten p),
d as (
  select x.id, x.reis_id,
         x.volgorde < (select min(y.volgorde) from reis.dagen y
                        where y.reis_id = x.reis_id and y.stop_id is not null) as heen
    from reis.dagen x
   where x.stop_id is null)
update reis.dagen t
   set route_punt_id = rp.id
  from d join rp on rp.reis_id = d.reis_id and rp.nr = case when d.heen then 2 else rp.n end
 where t.id = d.id and t.route_punt_id is null;
