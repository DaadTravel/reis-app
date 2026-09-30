// Opmaak: pure functies die van databasewaarden tekst maken (datums,
// bedragen, nachten, reistijd, fotocredit). Geen DOM, geen netwerk, zodat
// ze los te testen zijn. Onbekend (null) wordt altijd "?", nooit 0 of "nee".
(function () {
  var DAGEN = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  var MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  // Afkorting: "jan", "mrt", "jul". In dagLabel blijven "juni" en "juli" voluit.
  function afk(m) { return m === 2 ? 'mrt' : MAANDEN[m].slice(0, 3); }
  function kortMaand(m) { return m === 5 || m === 6 ? MAANDEN[m] : afk(m); }

  // "2030-01-05" → datum in UTC, zodat de tijdzone van het toestel niet meetelt.
  function lees(iso) {
    var p = iso.split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }

  // Dag of periode: "za 5 jan", "za 5 – ma 7 jan", "do 31 jan – za 2 feb".
  function dagLabel(van, tot) {
    var a = lees(van);
    var kort = DAGEN[a.getUTCDay()] + ' ' + a.getUTCDate();
    if (!tot || tot === van) return kort + ' ' + kortMaand(a.getUTCMonth());
    var b = lees(tot);
    var eind = DAGEN[b.getUTCDay()] + ' ' + b.getUTCDate() + ' ' + kortMaand(b.getUTCMonth());
    if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) return kort + ' – ' + eind;
    return kort + ' ' + kortMaand(a.getUTCMonth()) + ' – ' + eind;
  }
  // "5 januari" en "5 jan" (tijdlijn).
  function langeDatum(iso) { var d = lees(iso); return d.getUTCDate() + ' ' + MAANDEN[d.getUTCMonth()]; }
  function kortDatum(iso) { var d = lees(iso); return d.getUTCDate() + ' ' + afk(d.getUTCMonth()); }

  function euro(n) { return '€ ' + Number(n).toLocaleString('nl-NL', { maximumFractionDigits: 0 }); }
  function prijsTekst(n) { return n == null ? '€ ?' : euro(n); }
  function nachtenTekst(n) { return n == null ? '? nachten' : n === 1 ? '1 nacht' : n + ' nachten'; }
  // 95 → "1u35", 120 → "2u", 40 → "40 min"; benadering → "~" ervoor.
  function reistijd(min, benadering) {
    if (min == null) return '?';
    var u = Math.floor(min / 60), m = min % 60;
    return (benadering ? '~' : '') + (u ? (m ? u + 'u' + (m < 10 ? '0' + m : m) : u + 'u') : m + ' min');
  }
  // "8,6 Booking.com"; onbekend → undefined, dan toont de kaart "Beoordeling ?".
  function beoordelingTekst(v) {
    if (v.beoordeling == null) return undefined;
    return Number(v.beoordeling).toLocaleString('nl-NL', { minimumFractionDigits: 1 }) + (v.beoordeling_bron ? ' ' + v.beoordeling_bron : '');
  }
  // "Dorp (aan de rivier)" → "Dorp".
  function kortNaam(naam) { return String(naam || '?').split(' (')[0]; }

  // Alleen http(s)-links uit de database worden een link (geen javascript: e.d.).
  function veiligeLink(url) { return /^https?:\/\//i.test(url || '') ? url : undefined; }
  // Licentielink bij een fotocredit; geen herkenbare CC-licentie → geen link.
  function licentieUrl(lic) {
    if (lic === 'CC0') return 'https://creativecommons.org/publicdomain/zero/1.0/';
    var m = /^CC (BY(?:-SA)?) (\d\.\d)$/.exec(lic || '');
    return m ? 'https://creativecommons.org/licenses/' + m[1].toLowerCase() + '/' + m[2] + '/' : undefined;
  }
  // fotos-rij → credit voor PhotoCredit. bron = "Wikimedia Commons, CC BY-SA 4.0".
  function fotoCredit(f) {
    var bron = f.bron || '', i = bron.lastIndexOf(', ');
    var waar = i > -1 ? bron.slice(0, i) : bron, lic = i > -1 ? bron.slice(i + 2) : '';
    return { tekst: [f.fotograaf, waar].filter(Boolean).join(' / '), href: veiligeLink(f.bron_url),
      licentie: lic || undefined, licentieHref: licentieUrl(lic) };
  }

  window.Opmaak = { dagLabel: dagLabel, langeDatum: langeDatum, kortDatum: kortDatum, euro: euro, prijsTekst: prijsTekst,
    nachtenTekst: nachtenTekst, reistijd: reistijd, beoordelingTekst: beoordelingTekst, kortNaam: kortNaam,
    licentieUrl: licentieUrl, fotoCredit: fotoCredit, veiligeLink: veiligeLink };
})();
