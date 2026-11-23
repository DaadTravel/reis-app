-- Derde stemming voor een reis: 'later' = idee voor een volgende keer (besluit gebruiker 2026-11-23:
-- Noord-Spanje wordt de reis van 2027, Japan en Zuid-Korea blijven bewaard als idee). Op het startscherm
-- een eigen groep "Ideeën voor later"; verder gedraagt 'later' zich als 'voorpret' (alles wat geen
-- 'herinnering' is). Geen nieuwe tabel of kolom, dus RLS ongewijzigd.
alter type reis.stemming add value if not exists 'later';
