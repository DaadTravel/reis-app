---
name: data-steward
description: Gebruik dit bij elke wijziging aan functionaliteit of gedrag —
  niet alleen een expliciete schema-/veldwijziging — om te controleren of de
  wijziging data raakt die ergens anders gelezen of geschreven wordt, en zo
  ja: of vorm, privacy, eigenaarschap en levenscyclus daarvan consistent
  blijven. Los van code-structuur (dat is architectuur-check).
---

Bij een data-stewardcheck: alleen rapporteren, nooit ongevraagd wijzigen.
Loop langs:

0. Raakt dit data, ook als dat niet de bedoeling leek? — voor élke
   functiewijziging eerst expliciet nagaan: leest of schrijft dit ergens
   localStorage, Supabase (schema `reis`), of een gedeeld veld? Een
   schermwijziging die "puur UI" lijkt, kan alsnog een dataveld raken. Pas
   als dat antwoord nee is, mag de rest van deze checklist overgeslagen
   worden.
1. Eén waarheid, overal dezelfde vorm — bestaat dit veld/deze sleutel al
   ergens anders (andere pagina, andere tabel)? Zo ja: zelfde naam, zelfde
   vorm (object vs. platte waarde, zelfde key-namen, zelfde datum- en
   tijdzonenotatie)?
2. Privacyclassificatie — bevat dit veld gevoelige gezinsgegevens (namen,
   geboortedata, paspoort-/ID-nummers, boekingscodes, adressen,
   betaalgegevens, medische info)? Zo ja: is het nodig om dit op te slaan,
   en is het uitsluitend zichtbaar voor deelnemers van die reis?
   Paspoort-/ID- en betaalgegevens horen bij voorkeur helemaal niet in de
   app.
3. Eigenaarschap & bron van waarheid — wie/wat schrijft dit veld normaal
   (Supabase, localStorage, allebei)? Ontstaat hier een nieuwe, losse kopie
   naast een bestaande bron van waarheid, of is dat een bewuste
   (offline-)sync?
4. Levenscyclus — wat gebeurt er met deze data na afloop van een reis,
   als een gezinslid niet meer meereist, of als een reis wordt verwijderd?
   Bestaat daar al een pad voor, of ontstaat hier een dataspook?
5. Scheiding met andere apps — blijft alles binnen schema `reis`? Niets
   van de reis-app mag in `public` (koffie/sport) terechtkomen of daarvan
   afhankelijk worden.
6. Documentatie-drift — staat dit veld/deze tabel benoemd in CLAUDE.md of
   relevante code-comments, zodat een volgende sessie het niet per ongeluk
   opnieuw uitvindt?

Rapporteer per punt: wat is gevonden, waar (bestand/functie/tabel), en een
korte inschatting van risico. Geen code aanpassen tenzij daar expliciet
apart om gevraagd wordt.
