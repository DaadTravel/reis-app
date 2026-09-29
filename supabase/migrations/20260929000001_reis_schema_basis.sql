-- Eigen schema voor de reis-app binnen het gedeelde project Casa-Toscana.
-- Koffie- en sporttabellen blijven in public; niets hier raakt die.
-- Beveiliging vanaf dag 1: anon (niet ingelogd) heeft géén toegang tot dit
-- schema. Alleen ingelogde gezinsleden (authenticated), en per tabel komt
-- RLS met policies die alleen eigen/gedeelde reizen tonen.

create schema if not exists reis;

revoke all on schema reis from public, anon;
grant usage on schema reis to authenticated, service_role;

-- Nieuwe tabellen/sequences/functies in reis: standaard nooit voor anon.
alter default privileges in schema reis revoke all on tables from public, anon;
alter default privileges in schema reis revoke all on sequences from public, anon;
alter default privileges in schema reis revoke all on functions from public, anon;

alter default privileges in schema reis grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema reis grant all on tables to service_role;
alter default privileges in schema reis grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema reis grant execute on functions to authenticated, service_role;
