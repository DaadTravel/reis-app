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
- [ ] **Reispagina** — tik op een reis: foto bovenaan met credit;
      Overzicht, Programma, Slapen, Doen en Kosten zijn er alle vijf (ook
      als een onderdeel nog leeg is).
- [ ] **Tijdlijn** — in het reisoverzicht staan datum, plaatsnaam, nachten
      en reistijd bij elke plek op dezelfde hoogte, ook als een naam over
      twee regels loopt (bijv. Picos de Europa); vertrek/thuis in dezelfde
      letter als de plekken; zijwaarts swipen werkt. Eén keer op een
      iPhone bekijken (subgrid: iOS 16+).
- [ ] **Plek kiezen** — een tegel in het overzicht opent het programma
      bij die plek; de tabbladen en ← / → wisselen van plek.
- [ ] **Tips** — bij een plek één tipskader "Tips voor …", altijd open
      (geen losse opsommingspunten en geen uitklapknop); geen tip dubbel.
- [ ] **Onderweg** — onderaan elke plek een groen kader met aankomst
      (vorige → deze plek) en vertrek (deze plek → volgende), met vervoer,
      km, reistijd en prijs (onbekend = "?" / "€ ?"); een autorit toont
      géén prijs (ook niet in de tijdlijn), vlucht/boot/overig vervoer wel;
      tik op een regel = naar die plek. Bus en trein krijgen een eigen
      icoon en naam; "? km" alleen bij een autorit. Noord-Spanje: bij
      elke plek ingevuld. Chumphon (Thailand): 4 etappes.
- [ ] **Links** — een fotocredit opent de Commons-pagina en de licentie
      in een nieuw tabblad; een verblijf met link opent de website.
- [ ] **Onbekend is "?"** — geen datum = "Datum ?"; onbekend ontbijt,
      zwembad, beoordeling of prijs = "?"; een onbekend kostentotaal geeft
      "+ ?" en "rest ?", nooit € 0.
- [ ] **Uitloggen** — terug naar het inlogscherm; herladen blijft op het
      inlogscherm.
- [ ] **Uitnodiging** — (alleen bij een nieuw account) de link uit de
      mail opent "Wachtwoord instellen"; daarna ingelogd.

## Beveiliging

- [ ] Niet ingelogd: `?reis=<slug>` toont het inlogscherm, geen data.
- [ ] Ingelogd als lid: alle reizen zichtbaar.
- [ ] Ingelogd, maar geen lid (`reis.leden`): geen enkele reis zichtbaar.

## Onderweg (PWA)

- [ ] **Installeren** — "Toevoegen aan beginscherm" geeft het icoon en
      de naam "Reizen"; de app opent zonder adresbalk.
- [ ] **Offline** — een reis één keer online openen, dan vliegtuigmodus
      aan en de app opnieuw openen: dezelfde reis is leesbaar, met foto's,
      en je blijft ingelogd. Een reis die nog nooit geopend was geeft een
      duidelijke melding "Geen verbinding".
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
