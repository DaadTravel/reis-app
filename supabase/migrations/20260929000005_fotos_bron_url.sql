-- CC-licenties vragen naast naam en licentie ook een verwijzing naar de
-- bron. Link naar de bestandspagina (bijv. op Wikimedia Commons).
alter table reis.fotos add column bron_url text;
alter table reis.fotos add constraint fotos_opslag_pad_uniek unique (opslag_pad);
