-- Weer per plek (besluit gebruiker 2026-10-06, gebouwd 2026-10-18). De app haalt voor de dagen op een plek de
-- weersverwachting bij Open-Meteo (alleen coördinaten en datums, nooit gezinsgegevens; CLAUDE.md Privacy). Is die er
-- nog niet (meer dan ± 2 weken vooruit), dan de klimaatcijfers voor die periode, die Claude vooraf berekent.
-- - lat/lon: het punt waarvoor het weer geldt (de plaats of de uitvalsbasis, niet het exacte hotel).
-- - klimaat: { tmax, tmin, regen (% dagen met ≥ 1 mm), van, tot (MM-DD), jaren, bron }.
alter table reis.stops add column lat numeric(8, 5) check (lat between -90 and 90);
alter table reis.stops add column lon numeric(8, 5) check (lon between -180 and 180);
alter table reis.stops add column klimaat jsonb check (klimaat is null or jsonb_typeof(klimaat) = 'object');
alter table reis.stops add constraint stops_lat_lon_samen check ((lat is null) = (lon is null));
