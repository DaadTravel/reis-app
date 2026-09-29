# Rooktest — kernflows reis-app

Handmatige checklist om na een grotere wijziging (nieuwe feature,
architectuurwijziging, Supabase-wijziging, deploy) af te vinken in de
echte app. Vervangt geen automatische tests, maar vangt de flows die
het meest pijn doen als ze breken.

Datum: ____________  Wijziging getest: ____________

## Kernflows

_Nog in te vullen zodra de functie-inventaris uit Claude Projects klaar
is. Denk aan: inloggen, reis aanmaken, reis delen met een gezinslid,
dag/onderdeel toevoegen, en "vandaag" bekijken onderweg._

- [ ] **Inloggen** — een gezinslid logt in en ziet alleen eigen/gedeelde
      reizen.

## Aandachtspunten

- [ ] Een niet-gedeelde reis is níet zichtbaar voor een ander gezinslid.
- [ ] Belangrijkste info zichtbaar zonder scrollen (telefoon, portrait én
      landscape).
- [ ] Werkt zonder internetverbinding (laatst geladen reis blijft
      leesbaar).
- [ ] Geen console-errors tijdens bovenstaande flows.
- [ ] PWA-update opgepikt na wijziging (versienummer in `sw.js`
      opgehoogd, nieuwe versie laadt na herladen).

## Resultaat

Gevonden problemen: ____________
