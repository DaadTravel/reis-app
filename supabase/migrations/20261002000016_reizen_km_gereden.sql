-- Gereden kilometers van een hele reis (besluit gebruiker 2026-10-02): achteraf
-- van de teller, van vertrek tot thuis, inclusief ritjes ter plekke (restaurant,
-- tour, boodschappen). Niet te verwarren met de route-km (som van leg_km tussen
-- de verblijven), die rekent de app zelf uit. Bron: cel "Gereden km" in de Excel
-- van de reis. Bestaande RLS-policies en grants van reis.reizen gelden ook hier.
alter table reis.reizen
  add column if not exists km_gereden integer;

alter table reis.reizen
  add constraint reizen_km_gereden_ck check (km_gereden between 1 and 100000);
