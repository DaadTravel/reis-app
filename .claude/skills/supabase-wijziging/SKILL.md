---
name: supabase-wijziging
description: Gebruik dit bij elke wijziging die de Supabase-database raakt
  — een nieuwe tabel, kolom, policy, of aanpassing aan een bestaande
  schrijfactie. Ook van toepassing bij het aanpassen van sw.js of het
  klaarzetten van een levering.
---

De reis-app draait in het gedeelde Supabase-project **Casa-Toscana**, in
een eigen schema **`reis`**. Het schema `public` hoort bij andere apps van
de gebruiker (koffie, sport) en wordt door deze skill nooit aangeraakt.

Bij elke wijziging die de database raakt:
1. **Alleen schema `reis`.** Elke DDL/DML verwijst expliciet naar
   `reis.<tabel>`. Nooit iets aanmaken, wijzigen of verwijderen in `public`,
   `auth` of `storage` zonder expliciete, aparte toestemming.
2. **Migratie = bestand + toepassen.** Schrijf elke schemawijziging eerst
   als bestand in `supabase/migrations/<yyyymmddhhmmss>_<naam>.sql` en pas
   exact diezelfde SQL daarna toe (apply_migration). Repo en database
   lopen zo nooit uit elkaar.
3. **Beveiliging vanaf dag 1 — geen uitzonderingen.**
   - Elke nieuwe tabel krijgt in dezelfde migratie `enable row level
     security` én policies. Een tabel zonder policies is geen "later
     regelen".
   - Policies zijn gebaseerd op `auth.uid()` en lidmaatschap van een reis
     (alleen eigen of met jou gedeelde reizen). Nooit `using (true)` en
     nooit rechten voor de rol `anon`.
   - Een `security definer`-functie alleen als het echt nodig is (bijv.
     om recursie in policies te voorkomen), altijd met
     `set search_path = ''` en volledig gekwalificeerde namen.
   - Draai na elke wijziging `get_advisors` (security én performance) en
     los meldingen over `reis` op vóór je verdergaat.
4. **Bewijs dat de beveiliging werkt**, niet alleen dat hij bestaat: test
   als niet-ingelogd (moet niets zien), als lid van de reis (moet wel
   zien/schrijven), en als ingelogde niet-deelnemer (moet niets zien).
5. Valideer gewijzigde bestanden op syntaxfouten. Controleer eerst met
   `command -v node` of Node op deze machine staat — neem dat nooit aan
   op basis van een eerdere sessie. Staat het er wel, gebruik `node --check`
   op losse .js-bestanden. Staat het er niet, valideer dan via de echte
   browser (HttpListener-patroon uit `monkey`, poort 8934) en lees de
   console (`read_console_messages`, `onlyErrors:true`).
6. Test schrijfacties echt tegen de database: voeg een rij toe of wijzig
   'm, controleer het resultaat, en zet bestaande data daarna weer exact
   terug naar de oorspronkelijke waarde.
7. Gebruik nooit een "verwijderen en opnieuw aanmaken"-patroon om een rij
   te verversen als een andere tabel daarnaar verwijst met
   ON DELETE CASCADE — dat veegt gekoppelde data weg. Gebruik een update.
8. Controleer het totaal aantal rijen vóór en ná de wijziging, zodat
   niets onbedoeld is bijgekomen of verdwenen.
9. Verhoog het versienummer (CACHE-constante) in sw.js als de app zelf
   gewijzigd is.
10. Vraag pas om toestemming voor commit/push nadat dit allemaal is
    bevestigd, en geef daarbij kort aan wat je hebt getest.
