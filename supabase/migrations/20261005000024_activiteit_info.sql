-- Extra info bij een activiteit, achter de (i)-knop (besluit gebruiker 2026-10-05): tekst voor iedereen,
-- duur/kosten/let op alleen voor ouders (de app filtert), en later eventueel een foto. De link staat al in
-- activiteiten.link. Bestaande policies op reis.activiteiten gelden ook voor deze kolommen.
alter table reis.activiteiten
  add column info_tekst text,
  add column info_duur text,
  add column info_kosten text,
  add column info_let_op text,
  add column foto_id uuid references reis.fotos(id) on delete set null;

create index activiteiten_foto_id_idx on reis.activiteiten (foto_id);
