-- Datamodel Reisgids (schema reis). Eén rij-structuur per onderdeel van de
-- vaste reispagina: TripHero/TripCard (reizen) → Dag voor dag (dagen) →
-- Plekken (stops) → QuoteBand (reizen.quote_*) → Route (route_punten) →
-- Slapen (verblijven) → Doen (activiteiten) → Kosten (budget_posten) →
-- Randvoorwaarden (reizen.randvoorwaarden).
--
-- Toegang: alleen gezinsleden in reis.leden. Rol 'bewerker' mag schrijven,
-- 'kijker' alleen lezen. anon heeft geen toegang tot schema reis (zie
-- 20260929000001). Leden worden beheerd via SQL/dashboard, niet via de app.

-- ── Vaste waardenlijsten ────────────────────────────────────────────────
create type reis.stemming as enum ('voorpret', 'herinnering');
create type reis.status as enum ('betaald', 'geboekt', 'optie', 'voorstel', 'open');
create type reis.vervoer as enum ('car', 'plane', 'boat');

-- Iconen uit de Icon-component van het design system.
create domain reis.icoon as text check (value in (
  'plane','car','boat','temple','wave','hike','city','food','village','bed',
  'pool','cup','check','clock','calendar','sun','pin','users','arrow','dots',
  'question'));

-- ── Gezinsleden en rollen ───────────────────────────────────────────────
create table reis.leden (
  user_id uuid primary key references auth.users (id) on delete cascade,
  rol text not null check (rol in ('bewerker', 'kijker')),
  weergavenaam text,
  aangemaakt timestamptz not null default now()
);

-- security definer: voorkomt dat de policy-check zelf op RLS van
-- reis.leden blijft steken. Vaste search_path, volledig gekwalificeerd.
create function reis.is_lid() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from reis.leden where user_id = (select auth.uid()));
$$;

create function reis.is_bewerker() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from reis.leden
                 where user_id = (select auth.uid()) and rol = 'bewerker');
$$;

revoke all on function reis.is_lid(), reis.is_bewerker() from public, anon;
grant execute on function reis.is_lid(), reis.is_bewerker() to authenticated;

-- ── Foto's ──────────────────────────────────────────────────────────────
-- Alleen echte foto's (eigen of rechtenvrij met echte credit). De
-- foto-verwijzingen uit de claude.ai-versie waren verzonnen en worden niet
-- overgenomen. Bestanden komen later in Supabase Storage.
create table reis.fotos (
  id uuid primary key default gen_random_uuid(),
  opslag_pad text not null,
  fotograaf text,
  bron text,                       -- bijv. 'eigen foto', 'Unsplash'
  onderwerp text,                  -- welke plek/wat er te zien is
  is_sfeerbeeld boolean not null default false,  -- niet de exacte plek
  aangemaakt timestamptz not null default now()
);

-- ── Reizen ──────────────────────────────────────────────────────────────
create table reis.reizen (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),  -- #hash in de app
  titel text not null,
  kicker text,                     -- bijv. 'zomer 2027'
  jaar_label text,                 -- TripCard year
  ondertitel text,                 -- TripCard subtitle
  stemming reis.stemming not null,
  status reis.status not null default 'voorstel',
  status_label text,
  lede text,
  start_datum date,
  eind_datum date,
  nachten integer check (nachten >= 0),
  feiten jsonb not null default '[]',          -- TripHero facts: [[icoon, tekst], ...]
  hero_foto_id uuid references reis.fotos (id) on delete set null,
  quote_tekst text,
  quote_sub text,
  quote_foto_id uuid references reis.fotos (id) on delete set null,
  budget_notitie text,
  randvoorwaarden jsonb not null default '[]', -- [[label, waarde], ...]
  secties jsonb not null default '{}',         -- per sectie {eyebrow, title, intro}
  volgorde integer not null default 0,
  aangemaakt timestamptz not null default now(),
  gewijzigd timestamptz not null default now(),
  check (eind_datum is null or start_datum is null or eind_datum >= start_datum),
  check (jsonb_typeof(feiten) = 'array'),
  check (jsonb_typeof(randvoorwaarden) = 'array'),
  check (jsonb_typeof(secties) = 'object')
);

-- ── Plekken (StopFeature) ───────────────────────────────────────────────
create table reis.stops (
  id uuid primary key default gen_random_uuid(),
  reis_id uuid not null references reis.reizen (id) on delete cascade,
  volgorde integer not null,
  naam text not null,
  nachten integer check (nachten >= 0),
  lede text,
  highlights text[] not null default '{}',
  feiten jsonb not null default '[]',          -- [[label, waarde], ...]
  tips text[] not null default '{}',           -- TipNote na deze stop
  status reis.status,
  status_label text,
  foto_id uuid references reis.fotos (id) on delete set null,
  unique (reis_id, volgorde),
  check (jsonb_typeof(feiten) = 'array')
);

-- ── Dag voor dag (DayBlock) ─────────────────────────────────────────────
create table reis.dagen (
  id uuid primary key default gen_random_uuid(),
  reis_id uuid not null references reis.reizen (id) on delete cascade,
  volgorde integer not null,
  -- Echte datums waar bekend; de app maakt daar het label van
  -- ('di 13 – wo 14 juli'). Alleen als er (nog) geen datums zijn, bijv. bij
  -- een schetsreis, staat er een vrij label ('nacht 1–5', 'nachten nog open').
  datum_van date,
  datum_tot date,
  wanneer_label text,
  plaats text not null,
  icoon reis.icoon,
  beleving text,
  tips text[] not null default '{}',  -- nooit null: DayBlock crasht op null
  logistiek text,
  standaard_open boolean not null default false,
  unique (reis_id, volgorde),
  check (datum_van is not null or wanneer_label is not null),
  check (datum_tot is null or (datum_van is not null and datum_tot >= datum_van))
);

-- ── Route (RouteStrip) ──────────────────────────────────────────────────
-- Elk punt, inclusief start/eind en transit. De leg-velden beschrijven de
-- rit VAN het vorige punt NAAR dit punt (leeg bij het eerste punt).
create table reis.route_punten (
  id uuid primary key default gen_random_uuid(),
  reis_id uuid not null references reis.reizen (id) on delete cascade,
  volgorde integer not null,
  naam text not null,
  nachten integer check (nachten >= 0),
  leg_km numeric check (leg_km >= 0),
  leg_minuten integer check (leg_minuten >= 0),
  leg_vervoer reis.vervoer,
  leg_geverifieerd boolean not null default false,
  leg_prijs numeric check (leg_prijs >= 0),
  leg_status reis.status,
  unique (reis_id, volgorde)
);

-- ── Slapen (StayCard) ───────────────────────────────────────────────────
create table reis.verblijven (
  id uuid primary key default gen_random_uuid(),
  reis_id uuid not null references reis.reizen (id) on delete cascade,
  stop_id uuid references reis.stops (id) on delete set null,
  volgorde integer not null,
  naam text not null,
  plaats text not null,
  nachten integer check (nachten >= 0),
  prijs numeric check (prijs >= 0),   -- totaal voor het gezin
  ontbijt boolean,
  zwembad boolean,
  kamers integer check (kamers >= 0),
  status reis.status,
  status_label text,
  link text,
  foto_id uuid references reis.fotos (id) on delete set null,
  unique (reis_id, volgorde)
);

-- ── Doen (ActivityRow) ──────────────────────────────────────────────────
create table reis.activiteiten (
  id uuid primary key default gen_random_uuid(),
  reis_id uuid not null references reis.reizen (id) on delete cascade,
  stop_id uuid references reis.stops (id) on delete set null,
  volgorde integer not null,
  naam text not null,
  wanneer text,
  prijs numeric check (prijs >= 0),   -- voor het gezin, niet p.p.
  notitie text,
  status reis.status,
  status_label text,
  icoon reis.icoon,
  unique (reis_id, volgorde)
);

-- ── Kosten (BudgetSummary) ──────────────────────────────────────────────
create table reis.budget_posten (
  id uuid primary key default gen_random_uuid(),
  reis_id uuid not null references reis.reizen (id) on delete cascade,
  volgorde integer not null,
  label text not null,
  totaal numeric not null check (totaal >= 0),
  betaald numeric check (betaald >= 0),
  detail text,
  unique (reis_id, volgorde)
);

-- ── Indexen op foreign keys ─────────────────────────────────────────────
create index on reis.reizen (hero_foto_id);
create index on reis.reizen (quote_foto_id);
create index on reis.stops (foto_id);
create index on reis.verblijven (stop_id);
create index on reis.verblijven (foto_id);
create index on reis.activiteiten (stop_id);

-- ── gewijzigd bijhouden op reizen ───────────────────────────────────────
create function reis.zet_gewijzigd() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.gewijzigd := now();
  return new;
end;
$$;
create trigger reizen_gewijzigd before update on reis.reizen
  for each row execute function reis.zet_gewijzigd();

-- ── Row Level Security ──────────────────────────────────────────────────
alter table reis.leden          enable row level security;
alter table reis.fotos          enable row level security;
alter table reis.reizen         enable row level security;
alter table reis.stops          enable row level security;
alter table reis.dagen          enable row level security;
alter table reis.route_punten   enable row level security;
alter table reis.verblijven     enable row level security;
alter table reis.activiteiten   enable row level security;
alter table reis.budget_posten  enable row level security;

-- leden: je ziet je eigen rij; een bewerker ziet alle leden. Geen
-- schrijfrechten via de API.
create policy leden_lezen on reis.leden for select to authenticated
  using (user_id = (select auth.uid()) or (select reis.is_bewerker()));
revoke insert, update, delete on reis.leden from authenticated;

-- Inhoudstabellen: leden lezen, bewerkers schrijven.
do $$
declare t text;
begin
  foreach t in array array['fotos','reizen','stops','dagen','route_punten',
                           'verblijven','activiteiten','budget_posten'] loop
    execute format('create policy %I on reis.%I for select to authenticated using ((select reis.is_lid()))', t || '_lezen', t);
    execute format('create policy %I on reis.%I for insert to authenticated with check ((select reis.is_bewerker()))', t || '_toevoegen', t);
    execute format('create policy %I on reis.%I for update to authenticated using ((select reis.is_bewerker())) with check ((select reis.is_bewerker()))', t || '_wijzigen', t);
    execute format('create policy %I on reis.%I for delete to authenticated using ((select reis.is_bewerker()))', t || '_verwijderen', t);
  end loop;
end;
$$;
