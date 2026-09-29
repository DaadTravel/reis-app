-- Advisor-melding 0029: security definer-functies in het blootgestelde
-- schema reis waren via /rest/v1/rpc aanroepbaar. Verplaatst naar schema
-- reis_intern, dat NIET in de Data API staat. Policies blijven ze gebruiken.

create schema if not exists reis_intern;
revoke all on schema reis_intern from public, anon;
grant usage on schema reis_intern to authenticated;

alter function reis.is_lid() set schema reis_intern;
alter function reis.is_bewerker() set schema reis_intern;
