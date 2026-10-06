-- Hartjes vooraf en achteraf (besluit gebruiker 2026-10-06): naast "zin in" (vooraf) geeft iedereen bij wat je echt
-- deed aan of het goed viel (achteraf). Alleen positief: geen hartje achteraf = viel niet zo goed. Bestaande hartjes
-- zijn van vooraf. Wanneer achteraf kan (na de datum of de aankomst op de plek) bepaalt de app (O.magAchteraf).
-- De policies blijven gelijk: lezen als lid, geven alleen je eigen als lid, weghalen alleen je eigen.

alter table reis.hartjes
  add column moment text not null default 'vooraf';
alter table reis.hartjes
  add constraint hartjes_moment_ck check (moment in ('vooraf', 'achteraf'));

-- Eén hartje per lid per activiteit per moment.
alter table reis.hartjes drop constraint hartjes_pkey;
alter table reis.hartjes add constraint hartjes_pkey primary key (user_id, activiteit_id, moment);
