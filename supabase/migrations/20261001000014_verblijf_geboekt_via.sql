-- Waar een verblijf geboekt is (bijv. Booking.com, Airbnb, direct): kolom "Via"
-- in de Excel van de reis (besluit gebruiker 2026-10-01). Onderweg handig om te
-- weten bij wie je terechtkunt. Niet te verwarren met "via" als route (bijv.
-- een overstap), dat is een rit-detail. Bestaande RLS-policies en grants van
-- reis.verblijven gelden ook voor deze kolom.
alter table reis.verblijven
  add column if not exists geboekt_via text;

alter table reis.verblijven
  add constraint verblijven_geboekt_via_lengte check (char_length(geboekt_via) <= 60);
