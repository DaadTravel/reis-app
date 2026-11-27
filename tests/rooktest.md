# Rooktest — kernflows reis-app

Handmatige checklist om na een grotere wijziging (nieuwe feature,
architectuurwijziging, Supabase-wijziging, deploy) af te vinken in de
echte app. Vervangt geen automatische tests, maar vangt de flows die
het meest pijn doen als ze breken.

Automatisch vooraf: `tests/opmaak.html` openen (via een lokale server of
op GitHub Pages) — alle tests groen.

Datum: ____________  Wijziging getest: ____________
Toestel(len): ____________  Versie (CACHE in `sw.js`): ____________

## Kernflows

- [ ] **Inloggen** — met een leeg veld of een fout wachtwoord: een
      Nederlandse melding, geen Engelse servertekst. Met het juiste
      wachtwoord: het startscherm.
- [ ] **Startscherm** — alle reizen, gegroepeerd in "Nog te gaan" en
      "Al gemaakt", met kaartfoto. Onbekend aantal nachten = "?".
      Een geboekte of betaalde reis staat vanaf de dag na thuiskomst bij "Al gemaakt" (lokaal:
      `spanje-test.html`, dag na thuiskomst); een reis die nog optie/voorstel is niet.
- [ ] **Reispagina** — tik op een reis: foto bovenaan met credit; de onderdelen wisselen om en om
      van achtergrond (papier / zand), ook met Dag voor dag, Verslag of Vandaag erbij;
      Overzicht, Route, Slapen, Doen en Kosten zijn er alle vijf (ook
      als een onderdeel nog leeg is). Geen citaatfoto meer.
- [ ] **Opening** — op de foto: kicker, titel en één regel "13 juli – 5 augustus ·
      24 dagen · 23 nachten · 8 plekken" (wit, leesbaar); daaronder een
      halfdoorzichtig kader met de kop ("Van duin tot bergtop"), de lede als schuin
      citaat, het feitenblok (Route/Reis, Weer, Ideeën, Stand; "Wanneer" alleen
      zonder reisdatums) en "Waar de reis zich voor leent". Vanaf 820 px links kop +
      feiten, rechts de reisscore, even hoog. Een reis zonder foto: zandkleur,
      donkere titel. Geen "Waar we naar uitkijken".
- [ ] **Menu** — smalle balk bovenaan: ← (naar alle reizen), de naam van
      het onderdeel waar je bent (bovenaan de reistitel) en de hamburgerknop (☰,
      voorgelezen als "Onderdelen"). Die opent een raster van 3 kolommen (het actieve onderdeel
      gekleurd); kiezen = raster dicht en het onderdeel staat net onder de
      balk. Esc of tikken naast het raster sluit het. Met 7 knoppen (onderweg
      Vandaag, na vertrek Verslag) staat de laatste gewoon links op een
      nieuwe rij. Nergens horizontaal scrollen, ook niet op 320 px. "Dag voor
      dag" alleen bij een reis met dagverhalen.
- [ ] **Feiten van de reis** — in het kader bij een autoreis "roadtrip · … km
      route" en, als ingevuld, "· … km gereden". Past op een telefoon zonder
      horizontale scrollbalk.
- [ ] **Plekkenlijst in Route** — bovenaan Route "Vertrek …", dan één regel per plek
      (nummer, aankomstdatum, naam, nachten, reistijd van de rit ernaartoe, ›) in
      een licht vlak, de gekozen plek gekleurd; "Thuis …" eronder. Alles in één
      overzicht, nergens zijwaarts scrollen; vanaf 820 px in twee kolommen. Een rit
      zonder gekozen vervoer toont de iconen en "keuze nodig". Tik op een regel =
      die plek en naar het plek-paneel.
- [ ] **Hoofdstukken** — Overzicht is "De reis in N
      hoofdstukken": per plek de rit ernaartoe als stippellijn ("Van → Naar · km ·
      reistijd", niet nagemeten = "rit nog meten", na de reis nooit), een
      polaroid (om en om gekanteld, naast de tekst vanaf 820 px), nummer, naam,
      periode, de korte zin, sterren/hartjes bij de ideeën van die plek.
- [ ] **Dag voor dag** (alleen bij een reis met dagverhalen; lokaal Noord-Spanje,
      Llanes) — "Lees het dagverhaal" bij een hoofdstuk opent Dag voor dag bij die
      plek. Plek-hero met gescheurde onderrand, daaronder de plek-tabs (plakken onder de menubalk);
      de dagregel als intro; dagen in volgorde: compact (kop, één zin) en uitgelicht
      (polaroid om en om, vanaf 820 px naast de tekst), met "Dag N · datum", de rit
      (rijdag) of de praktische regel, "Mijn tips" en de ideeën met ★/♥ (zelfde knop en
      info-venster als Doen). Plek zonder verhalen: alleen de dagregel. "Volgend
      hoofdstuk" gaat naar de volgende plek. Als tiener geen verhalen met status
      concept, geen gestreept fotovlak en geen beheermeldingen (lokaal `&concept=1`:
      tiener ziet geen knop Dag voor dag, ouder wel met label "Concept"). Rare data:
      `&verhaalmonkey=1` geeft geen fout. Verslag heet "Ons verslag".
- [ ] **Plek kiezen** — "Bekijk in Route" bij een hoofdstuk opent Route direct bij
      die plek. Tijdens het lezen plakt een balk "3. Llanes ‹ ›" onder de menubalk:
      ‹ › wisselt van plek (het paneel begint net onder de balk), een tik op de naam
      gaat terug naar de plekkenlijst. Toetsenbord: pijltjes in de lijst.
- [ ] **Tips** — bij een plek één tipskader "Tips voor …", altijd open
      (geen losse opsommingspunten en geen uitklapknop); geen tip dubbel.
      Bij twee bezoeken: zie hieronder.
- [ ] **Onderweg** — onderaan elke plek een groen kader met aankomst
      (vorige → deze plek) en vertrek (deze plek → volgende), met vervoer,
      km, reistijd en prijs (onbekend = "?" / "€ ?"); een autorit toont
      géén prijs (ook niet in de plekkenlijst), vlucht/boot/overig vervoer wel;
      tik op een regel = naar die plek. Bus en trein krijgen een eigen
      icoon en naam; een eigen naam (bijv. "Privébusje") gaat voor; "? km"
      alleen bij een autorit. Noord-Spanje: bij elke plek ingevuld.
      Chumphon (Thailand): 4 etappes. Heen- en terugreis staan onder hun
      rit met tijden en tekst (Thailand: bij Bangkok, eerste en laatste
      rit).
- [ ] **Twee bezoeken** — een plek die twee keer in de route staat
      (Thailand: Bangkok, Chumphon) toont "2 bezoeken", per bezoek datum,
      nachten, eigen tekst en eigen tips ("Tips 1e bezoek"); het hoofdstuk
      ("2 bezoeken · 3 + 1 nachten") en de chip tonen de nachten per bezoek. Bangkok: elk bezoek een eigen tipskader,
      geen tip in beide.
- [ ] **Rit, verblijf, excursie** — onder elke rit datum en tijden
      (vorm: "wo 1 jan, 22:00 → 06:00 (+1 dag)"); in het plek-paneel een
      blok Slapen met elk geboekt verblijf (of status onbekend), zijn data en (als ingevuld)
      adres, telefoon en e-mail als tikbare links en de boekingscode; een
      plek met een verblijfwissel toont beide verblijven. Doen: plek,
      datum en tijden (vorm: "Plek · wo 1 jan, 13:00–18:00"). Geen "per
      nacht" bij opties. Een verblijf met "Via" ingevuld toont "Geboekt
      via …" in het blok Slapen en "· via …" op de verblijfkaart; een rit
      en een excursie tonen "Geboekt via …" en (als ingevuld) "Vertrek: …" of
      "Ophalen: …". Een tik op een adres, vertrekpunt of ophaalpunt opent Google Maps. Een
      verblijf of activiteit zonder status toont "Status ?"; zo'n verblijf
      staat in het plek-paneel in het blok Slapen, net als een geboekt.
- [ ] **Links** — een fotocredit opent de Commons-pagina en de licentie
      in een nieuw tabblad; een verblijf met link opent de website.
- [ ] **Onbekend is "?"** — geen datum = "Datum ?"; onbekend ontbijt,
      zwembad, beoordeling of prijs = "?"; een onbekend kostentotaal geeft
      "+ ?" en "rest ?", nooit € 0.
- [ ] **Uitloggen** — terug naar het inlogscherm; herladen blijft op het
      inlogscherm.
- [ ] **Uitnodiging** — (alleen bij een nieuw account) de link uit de
      mail opent "Wachtwoord instellen"; daarna ingelogd.

- [ ] **Hartjes** — bij een idee je eigen ♥ (ouder) of ★ (tiener) aan en
      uit; de namen van de gevers eronder; Doen filtert Alles / ★ / ♥. Na de
      dag (of bij een afgeronde reis) betekent hetzelfde hartje "was leuk"
      (groen; beide = goud). (i)-knop opent het info-venster; × en Esc sluiten.
- [ ] **Vergelijken en smaak** (alleen ouder) — onderaan het startscherm
      "Onze smaak" en de vergelijkingstabel, ingeklapt; een tiener ziet ze niet.
- [ ] **Wijzigen vóór de reis** (ouder, reis die nog komt) — "Wijzig" bij
      een rit of geboekt verblijf toont alleen adres, telefoon, e-mail,
      boekingscode en notitie, met de uitleg dat tijden via de Excel gaan.
      Fout e-mailadres geeft een melding; na opslaan staat het er direct.
- [ ] **Noodnummers** — onderaan een reis die nog komt: per land de
      nummers (tik = bellen), de ambassade, altijd Buitenlandse Zaken 24/7
      en de reisverzekering. Bij meer landen de plekken erbij. Niet bij een
      afgeronde reis.
- [ ] **Weer** — in het plek-paneel van een komende reis "Weer half juli:
      meestal ± …" met bron; binnen 15 dagen per dag de verwachting (lokaal:
      `&vandaag=…&nepweer=1`).

## Onderweg (actieve reis)

Lokaal met de tijdreis `?reis=europa&vandaag=2026-07-18` (als ouder en als tiener).

- [ ] **Nu onderweg** — op het startscherm de kaart "Nu onderweg" bovenaan;
      tik = naar Vandaag. "Vandaag" staat als eerste in het menuraster.
- [ ] **Vandaag** — waar we zijn (dag x van y), het weer, route vandaag met
      tijden en betaalstatus, slapen vannacht met adres/contact, gepland of
      vrije dag (top 3 ideeën), Morgen (met weer), reisverslag.
- [ ] **Nog open van gisteren** (ouder, vanaf dag 2) — onbetaalde dingen van
      gisteren met Wijzig; verdwijnt als alles af is.
- [ ] **Wijzigen onderweg** (ouder) — alle velden (tijden, betaalstatus
      erbij); vertrektijd wijzigen schuift de aankomst mee; zonder bereik
      "staat op deze telefoon", met bereik verstuurd. "+ Activiteit toevoegen".
- [ ] **Reisverslag** — typen, pagina herladen: tekst staat er nog;
      Kopieer met naam; onderdeel Verslag → Download verslag (.txt).

## Beveiliging

- [ ] Niet ingelogd: `?reis=<slug>` toont het inlogscherm, geen data.
- [ ] Ingelogd als lid: alle reizen zichtbaar.
- [ ] Ingelogd, maar geen lid (`reis.leden`): geen enkele reis zichtbaar.

## Op de eigen telefoon (PWA, alleen de gebruiker)

- [ ] **Installeren** — "Toevoegen aan beginscherm" geeft het icoon en
      de naam "Reizen"; de app opent zonder adresbalk.
- [ ] **Offline** — een reis één keer online openen, dan vliegtuigmodus
      aan en de app opnieuw openen: dezelfde reis is leesbaar, met foto's (ook
      Dag voor dag met de dagfoto's),
      en je blijft ingelogd. Een reis die nog nooit geopend was geeft een
      duidelijke melding "Geen verbinding".
- [ ] **Verslag offline** — tijdens een actieve reis in vliegtuigmodus het
      verslag typen: "Bewaard op deze telefoon"; met bereik gaat het mee.
- [ ] **Uitloggen wist offline data** — na uitloggen (offline) is geen
      reis meer te openen.
- [ ] **Nieuwe versie** — na een deploy (CACHE opgehoogd) laadt de app
      bij de eerste keer openen de nieuwe versie (de pagina herlaadt zich
      één keer vanzelf).

## Aandachtspunten

- [ ] Belangrijkste info zichtbaar zonder scrollen (telefoon, portrait én
      landscape); geen horizontale scrollbalk.
- [ ] Tablet en desktop: kaarten in 2–3 kolommen, niets uitgerekt.
- [ ] Geen console-errors tijdens bovenstaande flows.

## Resultaat

Gevonden problemen: ____________
