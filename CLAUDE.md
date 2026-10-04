# reis-app

Reisapp voor de gebruiker en hun gezin — niet publiek. Statische PWA:
vanilla HTML/CSS/JS, geen build-tool, met Supabase voor gedeelde data
tussen de gezinsleden. Zelfde architectuur en werkwijze als het project
fcp16-2. Oorspronkelijk opgebouwd in Claude Projects; wordt hier stap
voor stap opnieuw en netjes opgebouwd.

## Doel: drie scenario's (besluit gebruiker 2026-10-01)

De meetlat voor elke keuze in de app:

1. **Voorbereiden** — een duidelijk en leuk overzicht van een reis.
   Nieuwe informatie moet eenvoudig in de app landen en bijgewerkt
   worden; bijvangst: de familie kijkt mee met de voortgang.
2. **Onderweg** — actueel zien waar we zijn, de tips en ideeën voor dat
   moment, en praktische info (accommodatie, wat lokaal te regelen,
   bijv. excursies). Op de telefoon, ook offline.
3. **Achteraf delen** — vrienden en familie die interesse hebben, de
   reis laten zien als inspiratie om zelf te organiseren. Bestaat nog
   niet: vraagt een eigen deelmodel (nu ziet wie geen lid is niets).

Daaruit volgt: informatie hoort in vaste onderdelen van een
reis-template (rit met tijden, verblijf, excursie, tip, weer, status)
die de app functioneel toont, niet als losse tekst. Vrije tekst alleen
voor beschrijving en beleving.

## Status

- **Fase 1 — infra: klaar (2026-09-29).** GitHub-repo, Supabase-schema,
  lokale testconfig.
- **Fase 2 — Claude-setup: klaar (2026-09-29).** Dit bestand, skills,
  agent, `tests/rooktest.md`.
- **Fase 3 — datamodel + beveiliging: klaar (2026-09-29).** Schema
  toegepast en beveiliging getest; 36 foto's in bucket `reis-fotos` met
  credits in `reis.fotos` (elke stop heeft een foto); de 4 reizen uit de
  overdracht (Noord-Spanje, Japan, Zuid-Korea, Thailand) ingevoerd en
  tegen de bron gecontroleerd. Europa 2026 is later ingevoerd uit de
  Excel van de gebruiker.
- **Fase 4 — app opbouwen: bezig.** Eerst een volledige functie-inventaris
  van de Claude Projects-versie (er mag bij het overzetten niets verloren
  gaan), dan scherm voor scherm: mockup → bouwen → rooktest. Basis is de
  ontwerpvariant **Nevel** (`bron/mockup/nevel.*`, lokaal met echte data,
  dus niet in git); de eerste mockup (`index.html`/`mockup.js` daar) is
  vervallen. De echte app staat er (2026-09-30): inloggen, startscherm
  en reispagina uit Supabase, direct in Nevel-stijl gebouwd (geen extra
  mockups, besluit gebruiker). Ook klaar: tests voor `opmaak.js`,
  `sw.js`/manifest (offline), lettertypes zelf meegeleverd. Live op
  `daadtravel.github.io/reis-app/`; gebruiker is lid (bewerker) en de
  rooktest als lid is geslaagd (2026-09-30). Geparkeerd: foto's te hoog
  op een telefoon in landscape. Sinds 2026-10-04 ook voor onderweg:
  Vandaag/morgen en het reisverslag (zie Onderweg).

**Bij de start van een sessie:** lees ook `.claude/overdracht.md`
(gitignored) — daarin staan de actuele stand, de open vragen en de
afspraken uit eerdere sessies.

## Structuur

Eén pagina (React 18 via cdnjs, `h = React.createElement`, geen build):

- `index.html` — laadt alles; adres `./` = startscherm, `?reis=<slug>` =
  reispagina
- `app.js` — gedeelde logica: auth (inloggen, sessie verversen,
  uitloggen, wachtwoord instellen na uitnodigingslink) en de
  Supabase-datalaag (`sbFetch`/`sbWrite`, `haalReizen`, `haalReis`,
  ondertekende foto-URL's). Alle Supabase-lees/schrijfacties als gedeelde
  functies hier, niet in de schermen. Rechtstreeks via de REST-API,
  zonder supabase-js (besluit gebruiker 2026-09-30)
- `opmaak.js` — pure tekstfuncties (datums, bedragen, nachten, reistijd,
  fotocredit, rit- en verblijftijden, status) en afleidingen: `budgetRegel`
  (kostenpost → categorie), `reisFeiten` (periode, route-km, gereden km);
  onbekend wordt "?"
- `schermen.js` — de schermen (ontwerp Nevel): inloggen, wachtwoord
  instellen, startscherm, reispagina
- `thema.css` — alle kleur- en maatvariabelen (palet Nevel; voorlopig
  alleen licht — donker is geparkeerd, besluit gebruiker 2026-09-30;
  design-check toetst tot die tijd alleen licht). `app.css` — stijl van
  de schermen (prefix `nv-`), alleen variabelen, geen losse kleuren
- `ds/bundle.js`, `ds/bundle.css` — het designsysteem "Reisgids"
  (componenten als `window.Reisgids`, prefix `rg-`), gemaakt met Claude
  Design voor de gebruiker, dus eigen werk. Lokaal gepatcht (patches 1–8,
  zie `.claude/overdracht.md`); nooit overschrijven met een ongepatchte
  versie
- `manifest.json`, `iconen/` — installeren op het beginscherm
- `sw.js` — offline: app-bestanden uit de cache (CACHE-versie), reisdata
  netwerk-eerst met de laatst opgehaalde versie als terugval, foto's
  bewaard op opslagpad (de ondertekende URL wisselt). Alle caches
  beginnen met `reis-app-` en alleen die worden opgeruimd (eigen domein,
  zie Deploy, maar voor de zekerheid). Data- en
  fotocache worden bij uitloggen gewist (`app.js`, `DATA_CACHES`). Een
  vervangen foto krijgt een nieuw opslagpad (de cache kijkt alleen naar
  het pad). Registratie en manifest zijn relatief, dus scope `/reis-app/`
  op Pages. `#eef3f3` in `manifest.json` en `index.html` (theme-color)
  moet gelijk blijven aan `--paper` in `thema.css`
- `fonts/` — Instrument Serif, Figtree en Caveat zelf meegeleverd (OFL,
  subsets latin/latin-ext; besluit gebruiker 2026-09-30: geen Google
  Fonts, werkt offline)
- `supabase/migrations/` — alle schemawijzigingen als SQL-bestand
- `tests/opmaak.html` — tests (in de browser) voor `opmaak.js` en de
  "?"-logica van de kosten- en verblijfkaarten; alleen verzonnen waarden
- `tests/rooktest.md` — handmatige checklist met kernflows
- lokaal testen zonder account: `bron/apptest/` (gitignored) vangt de
  Supabase-aanroepen op en antwoordt uit de lokale datakopie; met
  `?sw=1` draait die stub in de service worker (`sw-test.js`,
  gitignored) zodat de echte cachelogica van `sw.js` getest wordt
- `bron/` (gitignored, alleen lokaal): mockup, apptest, fotokeuze, oude
  seed-data; géén Excels (die staan in de OneDrive-map Reizen, zie
  Supabase → Excel per reis). Reservekopie via een lokale git-hook

Werk deze lijst bij zodra er echte bestanden bijkomen.

## Supabase

- Project: **Casa-Toscana** (gedeeld met andere apps van de gebruiker).
  Project-URL en publishable key staan bewust in `app.js` (besluit
  gebruiker 2026-09-30): zonder die twee werkt de app op GitHub Pages
  niet, ze zijn bedoeld om openbaar te zijn en schema `reis` is
  afgeschermd door RLS. Verder nergens (geen docs, geen
  commit-berichten); lokaal ook in `.claude/lokale-testconfig.md`. De
  secret/service_role-key nooit in git, docs of code. Gevolg, bewust
  geaccepteerd: de open tabellen in `public` worden daarmee vindbaar.
- De reis-app gebruikt **uitsluitend schema `reis`**. Het schema `public`
  bevat koffie- en sporttabellen van andere apps: nooit lezen, wijzigen of
  verwijderen. Die staan bewust (nog) open; dat is een aparte kwestie,
  niet iets om vanuit dit project te "fixen".
- Schema `reis` is toegevoegd aan de Exposed schemas van de Data API.
  Client-side dus altijd met schema `reis` werken: bij de REST-API de
  headers `Accept-Profile: reis` (lezen) en `Content-Profile: reis`
  (schrijven).
- Inloggen (auth) is gedeeld met de andere apps in het project; dat is een
  bewuste, geaccepteerde keuze. Hetzelfde geldt voor gedeelde back-ups en
  pauzeren.
- **Beveiliging vanaf dag 1:** `anon` heeft geen toegang tot schema
  `reis` (migratie `20260929000001_reis_schema_basis.sql`). Elke tabel
  krijgt RLS met policies op basis van `auth.uid()` en lidmaatschap via
  `reis.leden`. Dat lidmaatschap geldt voor álle reizen (het is één
  gezin): een lid ziet alle reizen, wie geen lid is ziet niets. Delen per
  reis bestaat (nog) niet. Zie de skill `supabase-wijziging`.
- **Datamodel** (migratie `20260929000002`): `reizen`, `dagen`, `stops`,
  `route_punten`, `verblijven`, `activiteiten`, `budget_posten`, `fotos`,
  `leden`. Rollen via `reis.leden`: `bewerker` (schrijven) en `kijker`
  (lezen); wie niet in `leden` staat ziet niets. Leden alleen via
  SQL/dashboard toevoegen, niet via de app. Hulpfuncties voor de policies
  staan in schema `reis_intern` (bewust niet in de Data API). Latere
  aanvullingen op het datamodel: zie migraties `…0005` t/m `…0016`
  (`…0010`: vervoer bus en trein; `…0011`: eigen vervoersnaam per
  etappe, `route_punten.leg_vervoer_label`, bijv. "Privébusje";
  `…0012`: `dagen.route_punt_id`; `…0013`: vaste velden, zie hieronder;
  `…0014`: `verblijven.geboekt_via`; `…0015`: `leg_geboekt_via` en
  `leg_adres` bij een rit, `geboekt_via` bij een activiteit; `…0016`: `reizen.km_gereden`;
  `…0017`: `route_punten.leg_opties`, zie Vervoersopties; `…0018`:
  `leden.groep` en `reis.hartjes`, zie Hartjes; `…0019`: `reis.verslagen`,
  `…0020`: nieuwste versie wint, zie Onderweg).
- **Onderweg** (besluit gebruiker 2026-10-04). Een gekozen reis (geboekt of
  betaald) is **actief** van de dag vóór vertrek t/m de dag van thuiskomst
  (`O.actieveReis`). Dan staat er bovenaan het startscherm een kaart "Nu
  onderweg" (`NuOnderweg`, class `nv-nu`) en op de reispagina "Vandaag"
  vooraan in de balk; de app opent níet vanzelf op Vandaag. **Vandaag** =
  de datum op de klok van de telefoon in de tijdzone waar je bent
  (`O.datumIn`; na een vlucht naar Japan springt de dag mee). Testen met
  `?vandaag=JJJJ-MM-DD`: alleen lokaal of voor de beheerder (`vandaagIso`),
  er wordt niets opgeslagen; geen dummyreis in de database. Het scherm
  Vandaag (`O.dagOverzicht`), in deze volgorde: route vandaag (betaalstatus
  bij vlucht, ferry, bus of trein, niet bij een eigen autorit; een
  nachtvlucht ook de dag erna als aankomst; een autorit na de eerste rit
  zonder tijd vertrekt "~09:00", gewoonte van het gezin), slapen vannacht (ontbijt, zwembad, kamers als bekend; betaald / nog betalen / "Status ?"),
  gepland (naam, tijd, ophaalpunt, contact en of er nog betaald moet
  worden; geen hartje, geen prijs) óf vrije dag (top 3 ideeën van de plek
  op ★/♥), morgen (uitchecken, route, activiteiten), reisverslag. Bewust
  niet: kosten, beschrijving, de hele route. **Offline**: zodra een reis
  actief is, haalt de app hem met al zijn foto's op de achtergrond op
  (`voorlaadReis`). **Reisverslag** (`reis.verslagen`): per dag een eigen
  tekst per ouder (alleen bewerkers schrijven, iedereen leest; kinderen
  zijn kijker). Elke toetsaanslag gaat meteen naar de telefoon (localStorage
  `reis-verslag-wachtrij`), versturen daarna (na een pauze in het typen,
  bij openen van de app, weer verbinding en als de app naar de achtergrond
  gaat). Na aankomst blijft je laatste versie als eigen kopie staan
  (`verzonden: true`); je eigen tekst is altijd de nieuwste van server en
  telefoon (`gewijzigd`), en de database laat een oudere versie een nieuwere
  nooit overschrijven (trigger, migratie `…0020`). Kon het verslag niet
  geladen worden en staat er niets op de telefoon, dan kan er niet getypt
  worden. Uitloggen met onverstuurde tekst: eerst een waarschuwing; de
  tekst blijft op de telefoon (gaat mee na opnieuw inloggen). Knop
  "Kopieer" (datum · plek + teksten, voor Polarsteps, een appje of het
  fotoboek; Polarsteps kan niets importeren) en onderdeel Verslag met
  "Download verslag" (tekstbestand); **altijd met de naam van de
  schrijver** (besluit gebruiker 2026-10-04). Geen foto's in het verslag.
  Rollen: beide ouders bewerker, kinderen kijker.
- **Hartjes** (migratie `…0018`, besluit gebruiker 2026-10-04): tieners
  moeten ook zin hebben in de reis. Elk lid heeft een groep
  (`leden.groep`: `tiener` of `volwassene`; geen leeftijd of geboortedatum)
  en kan bij een activiteit aangeven wat hem aanspreekt (`reis.hartjes`, één
  per lid per activiteit). Activiteiten krijgen **geen** doelgroep-label: de
  hartjes laten zien wie wat wil. De app toont per gever het teken van zijn
  groep (`O.hartVorm`: tiener ★, volwassene ♥), je eigen knop in jouw vorm,
  en in Doen een filter Alles / ★ Tieners / ♥ Ouders. Doen staat per plek
  (routevolgorde) en is het **verlanglijstje: ideeën alleen met minstens één
  hartje of ster, geboekt e.d. altijd** (`O.opVerlanglijst`, besluit gebruiker
  2026-10-04; afgeronde reis of geen gezinsdata: alles). **Alles rond een plek bij elkaar** (besluit gebruiker
  2026-10-04): het plek-paneel toont onder de tips "Te doen in …" met
  dezelfde activiteiten en hartjes, en de tegel in het reisoverzicht
  rechtsonder het aantal ★ en ♥ (`O.telVormen`). Eén hartjes-stand per
  reispagina (`useHartjes`), gedeeld door paneel, tegels en Doen. **Een idee
  (status voorstel) is een compacte regel** (`O.isIdee`; besluit gebruiker
  2026-10-04): icoon, naam, één regel uitleg en de hartjes, zonder prijs en
  zonder statuslabel; geboekt/betaald/optie (en status onbekend) houdt de
  volle regel met prijs, tijden en contact. Het plek-paneel toont eerst 4
  (`TE_DOEN_EERST`; geboekt eerst, dan de meeste hartjes, `O.sorteerTeDoen`)
  en "Toon nog …" voor de rest; de volgorde komt uit de stand bij het laden,
  zodat een idee niet wegspringt als je tikt. Dagtrips krijgen "(dagtrip)"
  in de naam. Per plek met mate: liever 4–8 goede ideeën dan alles. Alle leden zien elkaars naam en groep (`leden_lezen` =
  lid); elk lid, ook een kijker, geeft of haalt alleen zijn eigen hartje weg.
  Lukt het ophalen van leden/hartjes niet, dan werkt de pagina zonder
  hartjes (`haalGezin`). Suggesties uit de skill `tiener` gaan erin als
  voorstel-activiteit (alleen in de app). Een voorstel toont een beoogde
  dag en website alleen als die er zijn (nooit "Wanneer ?"). Namen (`leden.weergavenaam`) vult de gebruiker later in;
  zonder naam toont de app "Iemand".
- **Vervoersopties** (migratie `…0017`, besluit gebruiker 2026-10-04): zolang
  het vervoer van een rit niet gekozen is (`leg_vervoer` leeg), toont de app
  de opties uit `route_punten.leg_opties` (lijst van `{vervoer, label,
  minuten, prijs, toelichting}`; `O.vervoerOpties`): in de tijdlijn de
  iconen + reistijd kortste–langste + "nog te kiezen", in Onderweg per optie
  naam · ~reistijd · ~prijs en één regel uitleg. Is het vervoer gekozen (bijv.
  via de Excel), dan verdwijnen de opties vanzelf. Suggesties van Claude, net
  als voorstel-activiteiten: de Excel raakt dit veld nooit. Regels bij het
  invullen: **alleen opties die qua reistijd én kosten bij elkaar in de buurt
  komen** (een veel langere of duurdere route, of een die op alles slechter
  scoort, valt af; noem wat afviel aan de gebruiker). `minuten` = deur tot
  deur, benadering. **`prijs` = indicatie in euro voor het hele
  reisgezelschap, alleen waar die voor de reisperiode betrouwbaar te schatten
  is** (vaste tarieven van trein en bus); bij huurauto, vlucht of boot met
  sterke seizoensprijzen geen prijs (leeg, de app toont dan niets — geen
  "€ ?"). Omrekenen met de koers van dat moment, afronden op € 5.
- **Vaste velden in plaats van tekst** (migratie `…0013`, besluit
  gebruiker 2026-10-01). Rit: `route_punten.leg_datum` (vertrekdag),
  `leg_vertrek`/`leg_aankomst` (lokale tijd), `leg_aankomst_dagen` (1 =
  aankomst de dag erna) en contact `leg_telefoon`/`leg_email`/
  `leg_boekingscode`. Verblijf: `route_punt_id` (het bezoek; een bezoek
  kan meer verblijven hebben), `inchecken`/`uitchecken` (datums),
  `inchecktijd`/`uitchecktijd`, `adres`, `telefoon`, `email`,
  `boekingscode`. Activiteit: `route_punt_id`, `datum`,
  `begin_tijd`/`eind_tijd`, `ophaalpunt`, `link`, `telefoon`, `email`,
  `boekingscode`; `wanneer` (tekst) alleen nog als terugval zonder datum.
  Tijden niet meer in `dagen.logistiek` zetten; die blijft voor wat geen
  veld heeft (bijv. een verblijfwissel). Leeg contact toont de app niet
  (optioneel, geen "?"). Alle reizen omgezet: Thailand met tijden; Japan,
  Korea, Noord-Spanje en Europa 2026 met vertrekdagen en verblijven met
  in/uit (tijden nog onbekend).
  **`verblijven.prijs` is altijd het totaal van dat verblijf** (alle
  nachten samen, ook bij opties; besluit gebruiker 2026-10-01). Een prijs
  per nacht bij invoer eerst omrekenen met `nachten`.
- **Tips staan alleen in `stops.tips`** (besluit gebruiker 2026-10-01):
  één opgeschoonde lijst per plek, in de app altijd zichtbaar in het
  tipskader. `stops.highlights` is leeggemaakt en wordt niet meer
  gevuld; de app voegt hem voor de zekerheid nog wel samen (zonder
  dubbelen). **Iets om te doen is een activiteit, geen tip** (besluit
  gebruiker 2026-10-04): staat het als idee in `activiteiten` (met hartjes),
  dan niet ook in `stops.tips`; extra info uit de tip gaat naar de notitie
  van het idee. Tips zijn voor wat geen activiteit is (wanneer, waar
  opletten, sfeer). **Uitzondering, tips per bezoek** (besluit gebruiker
  2026-10-01): staat een plek meer dan eens in de route en hoort een tip
  bij één bezoek (bijv. een stad bij aankomst en vlak voor vertrek), dan
  staat die in `dagen.tips` van de dag van dat bezoek; de
  app toont hem in het blok van dat bezoek. `stops.tips` houdt dan alleen
  wat bij elk bezoek geldt. Bij een plek met één bezoek blijft
  `dagen.tips` leeg. Tegel en chip tonen de nachten per bezoek
  ("3 + 1 nachten").
- **Koppel op ID, nooit op naam:** dagen, routepunten, verblijven en
  activiteiten hangen via `stop_id` aan hun plek (migratie `…0009`).
  Leeg is bewust: Vertrek/Thuis en vlucht- of reisdagen ("A → B") —
  behalve als plek B geen eigen dag heeft, dan hoort die reisdag bij B.
  De database dwingt nog niet af dat de plek bij dezelfde reis hoort; de
  app moet dat zelf bewaken.
- **Dag hoort bij een bezoek** (besluit gebruiker 2026-10-01, migratie
  `…0012`): `dagen.route_punt_id` wijst naar het routepunt van dat
  bezoek, zodat een plek die twee keer in de route staat per bezoek een
  eigen dag heeft. Een reisdag zonder plek (heen- of terugvlucht) wijst
  naar het routepunt waar die rit aankomt. In het Onderweg-kader staan
  de tijden (`logistiek`) van elke dag onder de rit die op zijn
  routepunt aankomt, bij een reisdag zonder plek ook de `beleving`; wat
  aan geen getoonde rit hangt (bijv. het eerste routepunt) blijft een
  losse notitie. Heeft geen enkele dag van een plek een
  `route_punt_id`, dan bepaalt het hoeveelste bezoek (in `volgorde`)
  welke dag erbij hoort. Een nieuwe dag krijgt meteen zijn
  `route_punt_id` (de eenmalige vulling in `…0012` ging uit van alleen
  een heen- en terugreisdag). `on delete set null`: routepunten nooit
  verwijderen en opnieuw aanmaken, maar bijwerken, anders raken de
  dagen stil hun koppeling kwijt.
- **Dagen:** echte datums (`datum_van`/`datum_tot`) waar bekend; de app
  maakt daar het label van. Zonder datums toont de app "Datum ?" (of
  `stops.nachten_label`); `wanneer_label` wordt niet getoond, want dat
  bevat nu alleen het aantal nachten en dat staat al als chip (besluit
  gebruiker 2026-09-30).
- **Elke locatie is een plek** (besluit gebruiker 2026-09-29): elke
  bestemming van een reis krijgt een eigen stop (StopFeature) met foto,
  niet alleen een dag of routepunt.
- **Bron van waarheid voor cijfers:** de Excel van de gebruiker, niet de
  oude claude.ai-versie. Die las bij Thailand de Excel-kolom Prijs
  (euro) ten onrechte als reistijd in minuten.
- **Excel per reis** (besluit gebruiker 2026-09-29): de gebruiker maakt
  voor elke reis een Excel zoals die van Thailand; wat daarin staat wordt
  de werkelijkheid en vervangt schattingen en budgetplafonds. **De Excels
  staan in de OneDrive-map Reizen van de gebruiker** (besluit 2026-10-01:
  overal bereikbaar en niet kwijt als de laptop stukgaat; het pad staat
  alleen in `.claude/overdracht.md`). Claude leest en schrijft daar
  rechtstreeks: geen kopieën in `bron/`, en vóór het wijzigen nagaan of
  het bestand openstaat (dan eerst laten sluiten, anders maakt OneDrive
  een conflictkopie). Nooit in git. De mappen `bron/`,
  `.claude/` en `Screenshots/` kopieert een lokale git-hook na elke commit
  naar de submap "reis-app reserve" daar (alleen toevoegen, nooit wissen;
  log in `.git/reserve.log`).
- **Excel is de bron voor feiten, Claude voor tekst** (besluit gebruiker
  2026-10-01, geldt bij het samenstellen van een reis; wat onderweg in
  de app moet kunnen komt later). Sjabloon van de gebruiker:
  `Reistemplate.xltx` in de OneDrive-map Reizen (opbouw van Thailand: één regel per dag,
  blokken Transport/Verblijf/Activiteit, totalen onderaan; Verblijf heeft
  "Via" = waar geboekt). Feiten (dagen, verblijven, kosten, tijden,
  reistijden, afstanden, status) komen uit de Excel; beschrijving, tips en
  beleving schrijft Claude en het inlezen raakt die nooit. **Tabblad
  Contact** (besluit gebruiker 2026-10-02): één regel per boeking, Datum |
  Blok (Transport/Verblijf/Activiteit) | Via | Adres | Telefoon | E-mail |
  Boekingsnr; koppelt op datum + blok. De gebruiker kiest zelf wat erin
  komt (geen bevestigingsmails plakken: daarin staan ook gegevens die niet
  in de app horen). Adres → `verblijven.adres`, `route_punten.leg_adres`
  (vertrekpunt) of `activiteiten.ophaalpunt`; Via → `geboekt_via`
  (`leg_geboekt_via` bij een rit) en gaat vóór de kolom Via in het
  hoofdblad. In de app opent een adres of ophaalpunt bij een tik Google
  Maps (alleen het adres). **Cel "Reis" (N3): Idee / Gekozen** — reizen
  kunnen alternatieven in dezelfde periode zijn; Gekozen →
  `reizen.status` geboekt (betaald blijft betaald), Idee → voorstel, leeg
  verandert niets. **Cel "Gereden km" (O3)** → `reizen.km_gereden`: achteraf van de
  teller, van vertrek tot thuis inclusief ritjes ter plekke (restaurant,
  tour, boodschappen; besluit gebruiker 2026-10-02). Iets anders dan de
  route-km (som van `leg_km` van de autoritten), die rekent de app zelf
  uit. Brandstof en literprijs vult de gebruiker zelf in de Excel in. **Inlezen doet Claude**,
  niet de app: Excel lezen, de wijzigingen per rij laten zien, pas na
  akkoord wegschrijven. **Activiteiten:** Claude stelt ideeën voor
  (status `voorstel`, alleen in de app) bij een verblijf/plek, eventueel
  met een beoogde dag; de datum is pas echt als de gebruiker hem in de
  Excel zet (status optie/geboekt/betaald) — vanaf dan is de Excel de baas
  over datum, tijd, prijs en status, de omschrijving blijft van Claude.
  Zo leest Claude de Excel (bevestigd door de gebruiker): een verblijf
  checkt in op de dag waar het staat en uit op de eerstvolgende dag met
  een ander verblijf; aankomsttijd vóór vertrektijd = aankomst de dag
  erna; **lege status = onbekend** (`null`, de app toont "Status ?", niet
  "Nog te bepalen") — zo'n verblijf staat in het plek-paneel wél in het
  blok Slapen (met contact), want het kan geboekt zijn (`O.inSlapen`;
  voorlopig, gebruiker kijkt in de praktijk of dat bevalt); één
  activiteit per dag is voor nu genoeg.
  **Een lege Excel-cel overschrijft nooit iets in de app** (ook geen
  status of opties die alleen in de app staan, bijv. hotelopties of
  voorstellen); alleen ingevulde cellen tellen. Een regel met alleen een
  bedrag (en status) onder een verblijf is een extra betaling van dat
  verblijf (bijv. aanbetaling): `verblijven.prijs` is de som. "Via"
  schrijven als het bedrijf (bijv. Booking) of **Direct** (niet
  "Rechtstreeks"). Koppelen
  aan de app op dag + blok (één rit, verblijf en activiteit per dag), dus
  geen ID-kolom in de Excel. Kolom "Via" → `verblijven.geboekt_via`
  (migratie `…0014`; app: "Geboekt via …" bij het verblijf en "via …" op
  de verblijfkaart). "Via" als route (Japan "Via Nagoya") is iets anders
  en staat nog in `logistiek`.
- **Feiten bovenaan een reis worden afgeleid** (besluit gebruiker
  2026-10-02, `O.reisFeiten`): de periode komt uit `reizen.start_datum`/
  `eind_datum`; bij het feit "car" zet de app de route-km (onbekend als
  één autorit geen km heeft: "? km route") en de gereden km erachter.
  In `reizen.feiten` dus geen datums of km als tekst; vlucht en weer
  blijven (nog) tekst.
- **Onbekend is "?", niet "nee":** een kenmerk dat niet is ingevuld
  (`null`, bijv. ontbijt of zwembad) toont de app als "?". Ook een
  onbekend bedrag (bijv. `budget_posten.totaal`) is `null` → "?", nooit 0.
  Uitzondering: `budget_posten.betaald` leeg betekent "bedrag bekend,
  nog niets betaald" en telt dus als € 0 betaald (besluit gebruiker
  2026-09-30).
- **Kosten: vaste opzet per reis** (besluit gebruiker 2026-10-04). Zolang
  er niets geboekt is, schat Claude per reis zo realistisch mogelijk met de
  info van dat moment, in deze `budget_posten` (volgorde 1–4):
  1. heen en terug: de vlucht (gevonden prijs), of bij een roadtrip
     "Brandstof, tol en parkeren (schatting)" op basis van de route-km;
  2. "Verblijf (schatting)": nachten van de route × gemiddelde per nacht
     (twee kamers of familiekamer, zwembad heeft voorkeur);
  3. "Eten, drinken en activiteiten (schatting)": een bedrag per persoon
     voor de hele reis (ijkpunt Japan: ~€ 1.000 p.p. voor 3 weken),
     aangepast aan het prijsniveau van het land;
  4. "Vervoer ter plaatse (schatting)": treinen, bussen, huurauto,
     binnenlandse vluchten (vervalt bij een roadtrip, zit in post 1).
  `budget_notitie`: "Totaal een orde van grootte van € …, inclusief eten
  en activiteiten." `secties.kosten.title` "Eerste inschatting". In
  `detail` staat hoe het bedrag is opgebouwd, zodat het na een
  routewijziging (aantal nachten) mee kan. **Na elke wijziging van de
  nachten de posten 2 en 3 en de notitie bijwerken.** Echte bedragen uit
  de Excel vervangen de schatting. **Afgeronde reis:** dezelfde posten met
  de echte bedragen uit de Excel (bij brandstof het blok "werkelijk"); wat
  niet is bijgehouden (eten, drinken, tol) komt er als schatting bij, in
  het label en `detail` zo benoemd, met `betaald` = `totaal` (het geld is
  uitgegeven). Notitie: "Totaal ongeveer € …: € … echte kosten uit de
  Excel, plus … geschat." Maximaal 4 posten (de kostenbalk heeft 4 kleuren).
- **Vergelijkingstabel** (besluit gebruiker 2026-10-04): onderaan het
  startscherm, ingeklapt, alleen voor de beheerder (`leden.rol` bewerker;
  `haalVergelijk` in app.js, `O.vergelijk`). Per reis: status, periode,
  dagen (vertrek t/m thuis) en nachten, plekken, erheen (vlucht, of bij een
  roadtrip de rijuren tot de eerste plek met 3+ nachten), weer (het feit
  `sun` in `reizen.feiten`, dus elke reis een temperatuur geven), totaal
  (~ = deels geschat) en per dag voor het hele gezin, ★/♥. "Rust" (nachten
  per plek) bewust niet.
- **Zoekprofiel is geen reisinhoud** (besluit gebruiker 2026-09-30): de
  zoekcriteria voor verblijven (kolom `reizen.randvoorwaarden`: max per
  nacht, minimale beoordeling, kamers, zwembad) zijn het uitgangspunt bij
  het zóeken naar verblijven. De kolom blijft bestaan, maar de reispagina
  toont geen sectie Randvoorwaarden. Max per nacht en
  beoordeling zijn zoekfilters; kamers en zwembad zijn sterke wensen,
  geen eisen. **Zwembad heeft bij elk verblijf voorkeur, bij elke reis**
  (besluit gebruiker 2026-10-04), en eigen kamers voor de tieners (zie de
  skill `tiener`). Matcht niets, dan zoeken waar te verruimen. Een plafond
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
  publieke repo. Bronmateriaal staat in `bron/` (gitignored); de Excels in
  de OneDrive-map Reizen.

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
  eigen foto): dan geen licentielink. Zo min mogelijk credits in beeld
  (besluit gebruiker 2026-09-30): een foto op een kaart of tegel zonder
  credit is genoeg als hij op dezelfde reispagina ergens mét credit te
  zien is, bijv. de plekfoto in het plek-paneel (per tabblad).
- Commons-titels kunnen fout zijn: elke gekozen foto zelf bekijken vóór
  gebruik. De gebruiker kiest via `bron/fotokeuze/index.html`.

## Deploy

**GitHub Pages**, "Deploy from a branch" (`main`, map `/`), zonder eigen
workflowbestand — elke push naar `main` publiceert automatisch. Daarvoor
is de repo bewust **publiek** (keuze 2026-09-29; gratis GitHub
ondersteunt Pages alleen op publieke repo's). Gevolg: alles in git is
openbaar. Daarom nooit keys (behalve de publishable key in de app-code
zelf), gezinsgegevens of testdata met echte gegevens committen — de data
zelf blijft beschermd door RLS.

**Eigen domein, geen technische relatie met andere apps** (besluit
gebruiker 2026-09-30): de repo staat in de organisatie **DaadTravel**
(`github.com/DaadTravel/reis-app`), dus de app draait op
`daadtravel.github.io/reis-app/` — niet op `daadwerkelijk.github.io`,
waar fcp16-2, sport en Cafe-Toscane draaien. Een browser deelt
cache-opslag, localStorage, service workers en toestemmingen per domein;
zo deelt de reis-app daar niets mee. Nooit terugzetten naar het
persoonlijke account. Het Supabase-project Casa-Toscana blijft wel
gedeeld (bewuste keuze, zie Supabase).

## Werkwijze-afspraken

### Skills
Vraag bij elk verzoek om een actie of wijziging aan de app eerst welke
skill(s) ingezet moeten worden (architectuur-check, cc-instructie-schrijver,
data-steward, design-check, mockup-eerst, monkey, rooktest,
supabase-wijziging, super-reiziger, tdd, tiener). Na afronding van een taak, vóór
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
- **Praktische boekingsgegevens horen wél in de app** (besluit gebruiker
  2026-10-01): adres, telefoon, e-mail en boekingscode van verblijven,
  ritten en excursies, zodat onderweg snel contact te zoeken is. Alleen
  in schema `reis` achter RLS (leden), nooit in git, docs of logs, en
  niet in een latere deelversie. Paspoort-/ID- en betaalgegevens blijven
  buiten de app.
- **Bedragen zijn deelbaar** (besluit gebruiker 2026-10-01): de kosten van
  een reis mogen in een latere deelversie (scenario 3) zichtbaar zijn.
- **Weer** (besluit gebruiker 2026-10-01): graag actueel (verwachting)
  voor de data waarop we op een plek zijn, als dat haalbaar is. Vraagt
  coördinaten per plek; een externe weerdienst krijgt alleen
  coördinaten en datums, nooit gegevens van het gezin.

## Sessiebeheer

- Stel na het afronden van een duidelijk afgebakende taak proactief voor
  om /compact te draaien, met een korte, concrete instructie die aansluit
  bij wat er nog moet gebeuren. Als het volgende onderwerp er niets mee te
  maken heeft: /clear voorstellen.
- Belangrijke, blijvende afspraken horen in CLAUDE.md zelf, niet alleen
  ergens in het gesprek.
