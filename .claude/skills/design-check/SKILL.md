---
name: design-check
description: Gebruik dit bij elke visuele/UI-wijziging of nieuw scherm — 
  nieuwe componenten, kleuren, lay-outs, of aanpassingen aan bestaande 
  schermen.
---

Bij elke visuele wijziging:

1. Kleuren — nooit hardgecodeerde hex-waarden. Altijd de bestaande 
   CSS-variabelen van de app gebruiken, en controleren dat het resultaat 
   in alle kleurthema's van de app (minstens licht en donker; zie de 
   actuele lijst in CLAUDE.md) goed leesbaar en onderscheidend blijft — 
   met name of twee elementen die apart moeten blijven (bijv. twee 
   verschillende betekenissen of statussen) niet in een van de thema's 
   toevallig samenvallen.
2. Hergebruik bestaande componenten/patronen (pop-ups, kaarten, 
   badges) in plaats van een nieuw, eigen patroon te verzinnen voor iets 
   dat al bestaat.
3. Unieke class-namen — check dat een nieuwe CSS-klasse niet toevallig 
   dezelfde naam heeft als een bestaande klasse elders in de app met een 
   andere betekenis.
4. Responsief op alle apparaten — test portrait én landscape, op 
   telefoon, tablet en desktop. De app wordt vooral onderweg op een 
   telefoon gebruikt: daar moet de belangrijkste informatie van een 
   scherm (bijv. vandaag, eerstvolgende vertrek) zonder scrollen 
   zichtbaar zijn.
5. Test met een echte browsertest en screenshots vóór het als "klaar" 
   wordt gemeld.
