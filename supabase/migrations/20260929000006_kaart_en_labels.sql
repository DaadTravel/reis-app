-- Aanvullingen zodat de overgezette reizen niets verliezen t.o.v. de
-- claude.ai-versie:
-- - De TripCard op het startscherm kan een andere foto en statustekst
--   hebben dan de TripHero (bijv. Japan: kaart Senso-ji, hero Shibuya).
-- - Een stop kan een afwijkend nachtenlabel hebben ('3 nachten (heen)',
--   'nachten nog open'); leeg = de app maakt 'N nachten' van `nachten`.
-- - Een reistijd kan een benadering zijn ('~2u').

alter table reis.reizen
  add column kaart_foto_id uuid references reis.fotos (id) on delete set null,
  add column kaart_status_label text;
create index on reis.reizen (kaart_foto_id);

alter table reis.stops add column nachten_label text;

alter table reis.route_punten
  add column leg_benadering boolean not null default false;
