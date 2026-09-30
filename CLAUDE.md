# reis-app

Reisapp voor de gebruiker en hun gezin — niet publiek. Statische PWA:
vanilla HTML/CSS/JS, geen build-tool, met Supabase voor gedeelde data
tussen de gezinsleden. Zelfde architectuur en werkwijze als het project
fcp16-2. Oorspronkelijk opgebouwd in Claude Projects; wordt hier stap
voor stap opnieuw en netjes opgebouwd.

## Status

- **Fase 1 — infra: klaar (2026-09-29).** GitHub-repo, Supabase-schema,
  lokale testconfig.
- **Fase 2 — Claude-setup: klaar (2026-09-29).** Dit bestand, skills,
  agent, `tests/rooktest.md`.
- **Fase 3 — datamodel + beveiliging: klaar (2026-09-29).** Schema
  toegepast en beveiliging getest; 36 foto's in bucket `reis-fotos` met
  credits in `reis.fotos` (elke stop heeft een foto); de 4 reizen uit de
  overdracht (Noord-Spanje, Japan, Zuid-Korea, Thailand) ingevoerd en
  tegen de bron gecontroleerd. Europa 2026 volgt later uit een Excel van
  de gebruiker.
- **Fase 4 — app opbouwen: bezig.** Eerst een volledige functie-inventaris
  van de Claude Projects-versie (er mag bij het overzetten niets verloren
  gaan), dan scherm voor scherm: mockup → bouwen → rooktest. Mockup van
  inloggen, startscherm en reispagina staat in `bron/mockup/` (lokaal,
  met echte data, dus niet in git).

**Bij de start van een sessie:** lees ook `.claude/overdracht.md`
(gitignored) — daarin staan de actuele stand, de open vragen en de
afspraken uit eerdere sessies.

## Structuur

Nog geen app-bestanden. Beoogde opzet, gelijk aan fcp16-2:

- `index.html` — de app
- `app.js` — gedeelde logica (auth, Supabase-datalaag); alle
  Supabase-lees/schrijfacties als gedeelde functies hier, niet los per
  pagina
- een eigen CSS-bestand met thema-variabelen (kleurthema's nog te
  bepalen; minstens licht en donker)
- `manifest.json`, `sw.js` — PWA-installatie en offline gebruik
- `supabase/migrations/` — alle schemawijzigingen als SQL-bestand
- `tests/rooktest.md` — handmatige checklist met kernflows

Werk deze lijst bij zodra er echte bestanden bijkomen.

## Supabase

- Project: **Casa-Toscana** (gedeeld met andere apps van de gebruiker).
  URL en publishable key staan in `.claude/lokale-testconfig.md`
  (gitignored) — nooit in git, docs of commit-berichten.
- De reis-app gebruikt **uitsluitend schema `reis`**. Het schema `public`
  bevat koffie- en sporttabellen van andere apps: nooit lezen, wijzigen of
  verwijderen. Die staan bewust (nog) open; dat is een aparte kwestie,
  niet iets om vanuit dit project te "fixen".
- Schema `reis` is toegevoegd aan de Exposed schemas van de Data API.
  Client-side dus altijd met schema `reis` werken (bijv.
  `supabase.createClient(url, key, { db: { schema: 'reis' } })`).
- Inloggen (auth) is gedeeld met de andere apps in het project; dat is een
  bewuste, geaccepteerde keuze. Hetzelfde geldt voor gedeelde back-ups en
  pauzeren.
- **Beveiliging vanaf dag 1:** `anon` heeft geen toegang tot schema
  `reis` (migratie `20260929000001_reis_schema_basis.sql`). Elke tabel
  krijgt RLS met policies op basis van `auth.uid()` en lidmaatschap van
  een reis: je ziet alleen eigen of met jou gedeelde reizen. Zie de skill
  `supabase-wijziging`.
- **Datamodel** (migratie `20260929000002`): `reizen`, `dagen`, `stops`,
  `route_punten`, `verblijven`, `activiteiten`, `budget_posten`, `fotos`,
  `leden`. Rollen via `reis.leden`: `bewerker` (schrijven) en `kijker`
  (lezen); wie niet in `leden` staat ziet niets. Leden alleen via
  SQL/dashboard toevoegen, niet via de app. Hulpfuncties voor de policies
  staan in schema `reis_intern` (bewust niet in de Data API). Latere
  aanvullingen op het datamodel: zie migraties `…0005` t/m `…0008`.
- **Dagen:** echte datums (`datum_van`/`datum_tot`) waar bekend; de app
  maakt daar het label van. Alleen zonder datums een vrij `wanneer_label`.
- **Elke locatie is een plek** (besluit gebruiker 2026-09-29): elke
  bestemming van een reis krijgt een eigen stop (StopFeature) met foto,
  niet alleen een dag of routepunt.
- **Bron van waarheid voor cijfers:** de Excel van de gebruiker, niet de
  oude claude.ai-versie. Die las bij Thailand de Excel-kolom Prijs
  (euro) ten onrechte als reistijd in minuten.
- **Excel per reis** (besluit gebruiker 2026-09-29): de gebruiker maakt
  voor elke reis een Excel zoals die van Thailand; wat daarin staat wordt
  de werkelijkheid en vervangt schattingen en budgetplafonds. De Excels
  zelf staan in `bron/` en gaan nooit in git. Uploaden/inlezen
  wordt een aparte functie, later.
- **Onbekend is "?", niet "nee":** een kenmerk dat niet is ingevuld
  (`null`, bijv. ontbijt of zwembad) toont de app als "?". Ook een
  onbekend bedrag (bijv. `budget_posten.totaal`) is `null` → "?", nooit 0.
- **Zoekprofiel is geen reisinhoud** (besluit gebruiker 2026-09-30): de
  zoekcriteria voor verblijven (kolom `reizen.randvoorwaarden`: max per
  nacht, minimale beoordeling, kamers, zwembad) zijn het uitgangspunt bij
  het zóeken naar verblijven. De kolom blijft bestaan, maar de reispagina
  toont geen sectie Randvoorwaarden. Max per nacht en
  beoordeling zijn zoekfilters; kamers en zwembad zijn sterke wensen,
  geen eisen. Matcht niets, dan zoeken waar te verruimen. Een plafond
  (bijv. nachten × max per nacht) is nooit een bedrag in de kosten: alleen
  echt ingegeven bedragen tellen.
- **Per verblijf in het overzicht** (besluit gebruiker 2026-09-30):
  `beoordeling` (0–10) met `beoordeling_bron` en `beoordeeld_op`; bron is
  eerst de Excel van de reis, anders Booking.com via de connector in
  Claude (de app zelf kan geen connectoren aanroepen). Plus
  `kamerindeling` (vaste lijst: 2 kamers apart, gezinskamer, appartement
  met 2 slaapkamers, anders + `kamerindeling_toelichting`) naast ontbijt
  en zwembad. Een beoordeling zonder bron en datum weigert de database
  (migratie `…0008`). Een beoordeling is een momentopname: eenmaal
  vastgelegd niet bijwerken naar een nieuwer cijfer. Bij een nieuw veld
  meteen invullen waar een bron beschikbaar is.
- **Reisinhoud nooit in git.** Seed-data (accommodaties, bedragen, route)
  gaat rechtstreeks de database in, niet als migratie of bestand in de
  publieke repo. Bronmateriaal staat in `bron/` (gitignored).

## Foto's

- De foto's uit de claude.ai-versie waren verzonnen (ook de credits) —
  niets daarvan overnemen.
- Bron: Wikimedia Commons (of eigen foto's). Fotograaf en licentie komen
  uit de Commons-metadata, nooit zelf invullen. Credit-vorm:
  "Foto: naam / Wikimedia Commons, CC BY-SA 4.0".
- Per plek het hoofddoel of herkenbaarste beeld; verblijven krijgen een
  sfeerfoto van de plaats met `is_sfeerbeeld = true`.
- **Credit met links (CC-eis):** de credit bij een foto linkt naar de
  Commons-pagina (`fotos.bron_url`) én naar de licentietekst (afgeleid
  uit de licentie aan het eind van `fotos.bron`, bijv. "CC BY 2.0" of
  "CC0"), beide in een nieuw tabblad. Geen herkenbare CC-licentie (bijv.
  eigen foto): dan geen licentielink. Elke foto
  op een kaart zonder credit staat op dezelfde reispagina ook mét credit.
- Commons-titels kunnen fout zijn: elke gekozen foto zelf bekijken vóór
  gebruik. De gebruiker kiest via `bron/fotokeuze/index.html`.

## Deploy

Gelijk aan fcp16-2: **GitHub Pages**, "Deploy from a branch" (`main`,
map `/`), zonder eigen workflowbestand — elke push naar `main` publiceert
automatisch. Daarvoor is de repo bewust **publiek** (keuze 2026-09-29;
gratis GitHub-account ondersteunt Pages alleen op publieke repo's).
Gevolg: alles in git is openbaar. Daarom nooit keys (behalve de
publishable key in de app-code zelf), gezinsgegevens of testdata met
echte gegevens committen — de data zelf blijft beschermd door RLS.
Pages wordt aangezet zodra de eerste `index.html` op `main` staat.

## Werkwijze-afspraken

### Skills
Vraag bij elk verzoek om een actie of wijziging aan de app eerst welke
skill(s) ingezet moeten worden (architectuur-check, cc-instructie-schrijver,
data-steward, design-check, mockup-eerst, monkey, rooktest,
supabase-wijziging, super-reiziger, tdd). Na afronding van een taak, vóór
commit/push: de agent `code-controleur` laten meekijken.

### Testen, niet aannemen
- Valideer gewijzigde bestanden altijd op syntaxfouten voordat je iets
  "klaar" noemt.
- Test schrijfacties naar Supabase altijd echt: een rij aanmaken/wijzigen,
  het resultaat controleren, en bij een test met bestaande data die
  netjes terugzetten naar de oorspronkelijke waarde.
- Test beveiliging echt: niet-ingelogd, lid van een reis, en ingelogde
  niet-deelnemer.
- Gebruik nooit een "verwijderen en opnieuw aanmaken"-patroon om een rij
  te verversen als er een andere tabel met ON DELETE CASCADE naar die rij
  verwijst — dat veegt gekoppelde data weg. Gebruik dan een update.
- Neem nooit aan dat bestaande code doet wat de naam doet vermoeden —
  lees de code eerst na voordat je een aanname baseert op hoe iets
  "waarschijnlijk" werkt.
- Functionele wijzigingen moeten goed werken op mobiel (portrait én
  landscape), tablet en desktop. Mobiel onderweg is het belangrijkste
  gebruik.

### Voordat er iets naar GitHub gaat
- Vraag altijd expliciet toestemming voordat je commit en pusht naar
  GitHub. Leg eerst kort uit wat er gewijzigd is en waarom, en wacht op
  een duidelijk "ja" voordat je pusht.
- Verhoog bij elke wijziging aan de app het versienummer
  (CACHE-constante bovenaan `sw.js`), zodat de PWA de nieuwe versie ook
  echt oppikt.

### Na elke wijziging
- Geef een beknopte samenvatting: wat is er veranderd, welke bestanden,
  en — als het relevant is — wat de gebruiker zelf in de app moet
  controleren om te bevestigen dat het werkt.
- Stel na een grotere wijziging voor om `tests/rooktest.md` te doorlopen.
- Bij twijfel of onduidelijkheid: stel een gerichte vraag in plaats van
  te gokken. Kies bij kleine, voor de hand liggende keuzes gewoon een
  redelijke aanname en meld die kort.

### Privacy
- Sla nooit namen, geboortedata, paspoort-/ID-nummers, boekingscodes,
  adressen of andere persoonlijke gezinsgegevens op buiten de app zelf
  (dus ook niet in documentatie, logs, testdata of commit-berichten).
  Testen gebeurt met verzonnen dummy-data.

## Sessiebeheer

- Stel na het afronden van een duidelijk afgebakende taak proactief voor
  om /compact te draaien, met een korte, concrete instructie die aansluit
  bij wat er nog moet gebeuren. Als het volgende onderwerp er niets mee te
  maken heeft: /clear voorstellen.
- Belangrijke, blijvende afspraken horen in CLAUDE.md zelf, niet alleen
  ergens in het gesprek.
