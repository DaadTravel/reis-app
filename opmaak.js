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
  // Vervoersopties van een rit (route_punten.leg_opties): alleen zolang het vervoer nog niet
  // gekozen is (leg_vervoer leeg). Suggesties van Claude, bekend vervoer, volgorde zoals opgeslagen.
  var VERVOERSOORTEN = ['car', 'plane', 'boat', 'bus', 'train'];
  var VERVOERNAAM = { car: 'Auto', plane: 'Vliegtuig', boat: 'Boot', bus: 'Bus', train: 'Trein' };
  // "Shinkansen + Hida-express · ~4u30 · ~€ 360". Prijs = indicatie voor het hele reisgezelschap,
  // alleen waar die betrouwbaar te schatten is; geen prijs → weglaten (optioneel, geen "€ ?").
  function optieTekst(o) {
    var prijs = getal(o.prijs);
    return [tekstOf(o.label) || VERVOERNAAM[o.vervoer], reistijd(getal(o.minuten, true), true), prijs != null ? '~' + euro(prijs) : '']
      .filter(Boolean).join(' · ');
  }
  // leg_opties wordt met de hand ingevuld: alleen een echt getal (≥ 0) telt, anders onbekend (null).
  function getal(x, rond) {
    if (x == null || x === '') return null;
    var n = Number(x);
    return isFinite(n) && n >= 0 ? (rond ? Math.round(n) : n) : null;
  }
  function tekstOf(x) { return typeof x === 'string' ? x : ''; }
  function vervoerOpties(l) {
    if (l.leg_vervoer || !Array.isArray(l.leg_opties)) return [];
    return l.leg_opties.filter(function (o) { return o && VERVOERSOORTEN.indexOf(o.vervoer) > -1; });
  }
  // Kop bij de opties: één optie is een advies, meer opties een keuze (besluit gebruiker 2026-10-04).
  function optiesKop(opties) { return opties.length === 1 ? 'advies' : 'nog te kiezen'; }
  // Reistijd over de opties: "~3u15–4u" (kortste–langste), één tijd als die gelijk zijn; altijd benadering.
  function reistijdBereik(opties) {
    var m = opties.map(function (o) { return getal(o.minuten, true); }).filter(function (x) { return x != null; });
    if (!m.length) return '?';
    var min = Math.min.apply(null, m), max = Math.max.apply(null, m);
    return reistijd(min, true) + (max > min ? '–' + reistijd(max) : '');
  }
  // Hartjes van één activiteit (reis.hartjes): aantal, of jij er een gaf, en wie ("Jij" eerst).
  // Naam uit reis.leden.weergavenaam; onbekend of leeg → "Iemand".
  // gevers: per hartje naam en groep (leden.groep), voor de vorm per groep (O.hartVorm).
  function hartjesVan(hartjes, activiteitId, leden, mijnId) {
    var lid = {};
    (leden || []).forEach(function (l) { lid[l.user_id] = l; });
    var van = hartjes.filter(function (x) { return x.activiteit_id === activiteitId; });
    var ik = !!mijnId && van.some(function (x) { return x.user_id === mijnId; });
    var gever = function (x, naam) { var l = lid[x.user_id] || {}; return { naam: naam || l.weergavenaam || 'Iemand', groep: l.groep || null }; };
    var gevers = (ik ? [gever({ user_id: mijnId }, 'Jij')] : [])
      .concat(van.filter(function (x) { return !mijnId || x.user_id !== mijnId; }).map(function (x) { return gever(x); }));
    return { aantal: van.length, ikOok: ik, namen: gevers.map(function (x) { return x.naam; }), gevers: gevers };
  }
  // Aantal sterren (tieners) en hartjes (volwassenen; groep onbekend telt als hart) bij een set activiteiten,
  // bijv. alle activiteiten van één plek (indicatie op de tegel).
  function telVormen(hartjes, activiteitIds, leden) {
    var groep = {}, ids = {}, uit = { tiener: 0, volwassene: 0 };
    (leden || []).forEach(function (l) { groep[l.user_id] = l.groep; });
    activiteitIds.forEach(function (id) { ids[id] = true; });
    hartjes.forEach(function (x) { if (ids[x.activiteit_id]) uit[groep[x.user_id] === 'tiener' ? 'tiener' : 'volwassene']++; });
    return uit;
  }
  // Een idee = activiteit met status voorstel: compacte regel zonder prijs en label (besluit gebruiker 2026-10-04).
  // Onbekende status (null) is géén idee: dat kan geboekt zijn ("Status ?").
  function isIdee(a) { return a.status === 'voorstel'; }
  // Te doen per plek: eerst wat geen idee is (op volgorde), dan ideeën op aantal hartjes (meeste eerst), dan volgorde.
  function sorteerTeDoen(acts, hartjes) {
    var tel = {};
    hartjes.forEach(function (x) { tel[x.activiteit_id] = (tel[x.activiteit_id] || 0) + 1; });
    return acts.slice().sort(function (a, b) {
      return (isIdee(a) - isIdee(b)) || (isIdee(a) ? (tel[b.id] || 0) - (tel[a.id] || 0) : 0) || a.volgorde - b.volgorde;
    });
  }
  // Verlanglijstje (besluit gebruiker 2026-10-04): een idee alleen met minstens één hartje of ster; wat geen idee
  // is (geboekt e.d.) staat er altijd op. Volgorde blijft.
  function opVerlanglijst(acts, hartjes) {
    var met = {};
    hartjes.forEach(function (x) { met[x.activiteit_id] = true; });
    return acts.filter(function (a) { return !isIdee(a) || met[a.id]; });
  }
  // Teken per groep (besluit gebruiker 2026-10-04): tieners een ster, volwassenen (en onbekend) een hart.
  function hartVorm(groep) { return groep === 'tiener' ? '★' : '♥'; }
  // ["Jij", "Bas", "Lies"] → "Jij, Bas en Lies".
  function hartjesTekst(namen) {
    if (namen.length < 2) return namen.join('');
    return namen.slice(0, -1).join(', ') + ' en ' + namen[namen.length - 1];
  }
  // "8,6 Booking.com"; onbekend → undefined, dan toont de kaart "Beoordeling ?".
  function beoordelingTekst(v) {
    if (v.beoordeling == null) return undefined;
    return Number(v.beoordeling).toLocaleString('nl-NL', { minimumFractionDigits: 1 }) + (v.beoordeling_bron ? ' ' + v.beoordeling_bron : '');
  }
  // budget_posten-rij → categorie voor BudgetSummary. Totaal leeg = onbekend (null → "?");
  // betaald leeg = bedrag bekend, nog niets betaald (€ 0; besluit gebruiker 2026-09-30).
  function budgetRegel(b) {
    return { label: b.label, total: b.totaal != null ? Number(b.totaal) : null,
      paid: b.betaald != null ? Number(b.betaald) : 0, detail: b.detail || undefined };
  }
  // Tijd uit de database ("22:10:00", lokale tijd ter plekke) → "22:10"; leeg → "".
  function tijd(t) { return t ? String(t).slice(0, 5) : ''; }
  // Rit (leg_*-velden van een routepunt): "di 15 jan, 22:10 → 07:05 (+1 dag)"; niets bekend → "".
  function ritTijden(l) {
    var v = tijd(l.leg_vertrek), a = tijd(l.leg_aankomst), plus = l.leg_aankomst_dagen;
    var t = v && a ? v + ' → ' + a : v ? 'vertrek ' + v : a ? 'aankomst ' + a : '';
    if (a && plus) t += ' (+' + plus + (plus === 1 ? ' dag)' : ' dagen)');
    return [l.leg_datum ? dagLabel(l.leg_datum) : '', t].filter(Boolean).join(', ');
  }
  // "13:00–18:00", "vanaf 13:00" of "".
  function tijdvak(begin, eind) {
    var b = tijd(begin), e = tijd(eind);
    return b && e ? b + '–' + e : b ? 'vanaf ' + b : '';
  }
  // Activiteit: datum + tijdvak; zonder datum de oude tekst (`wanneer`), anders "Wanneer ?".
  function activiteitWanneer(a) {
    // Een voorstel zonder datum heeft nog geen moment: geen "Wanneer ?" (ruis; besluit gebruiker 2026-10-04).
    if (!a.datum) return a.wanneer || (a.status === 'voorstel' ? '' : 'Wanneer ?');
    return [dagLabel(a.datum), tijdvak(a.begin_tijd, a.eind_tijd)].filter(Boolean).join(', ');
  }
  // Verblijf: "wo 16 – za 19 jan" (incheck- t/m uitcheckdag); onbekend → "".
  function verblijfPeriode(v) { return v.inchecken && v.uitchecken ? dagLabel(v.inchecken, v.uitchecken) : ''; }
  // Telefoonnummer → "tel:"-link zonder spaties en zonder "(0)" na de landcode; geen cijfers → undefined (geen link).
  function telLink(nr) {
    var n = String(nr || '').replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
    return /\d/.test(n) ? 'tel:' + n : undefined;
  }

  // Label voor een StatusBadge. Lege status = onbekend (lege cel in de Excel, besluit gebruiker
  // 2026-10-01): "Status ?", niet het standaardlabel "Nog te bepalen". Anders het eigen label of
  // undefined (dan kiest de badge zelf).
  function statusLabel(x) { return x.status ? x.status_label || undefined : 'Status ?'; }
  // Verblijf in het blok Slapen (met adres en contact): geboekt, betaald of onbekend. Onbekend
  // erbij omdat het geboekt kán zijn; dan liever zichtbaar dan onderweg het adres missen.
  function inSlapen(v) { return v.status === 'geboekt' || v.status === 'betaald' || !v.status; }

  // Periode van een reis zonder weekdag: "13 jul – 5 aug", binnen één maand "7 – 30 jul".
  function periodeKort(van, tot) {
    var a = lees(van), b = lees(tot);
    if (a.getUTCFullYear() !== b.getUTCFullYear()) return kortDatum(van) + ' ' + a.getUTCFullYear() + ' – ' + kortDatum(tot) + ' ' + b.getUTCFullYear();
    var begin = a.getUTCMonth() === b.getUTCMonth() ? String(a.getUTCDate()) : kortDatum(van);
    return begin + ' – ' + kortDatum(tot);
  }
  // Route-km: som van de autoritten (leg_km, van verblijf naar verblijf). Een autorit zonder km →
  // null (onbekend, nooit een te laag totaal); geen autoritten → undefined.
  function routeKm(route) {
    var auto = route.filter(function (l) { return l.leg_vervoer === 'car'; });
    if (!auto.length) return undefined;
    if (auto.some(function (l) { return l.leg_km == null; })) return null;
    return auto.reduce(function (som, l) { return som + Number(l.leg_km); }, 0);
  }
  // Feiten bovenaan een reis (besluit gebruiker 2026-10-02). De periode komt uit de reisdatums; bij de
  // auto komen de route-km erbij en, als ingevuld, de gereden km (achteraf van de teller, inclusief
  // ritjes ter plekke). Overige feiten (vlucht, weer) blijven tekst.
  function reisFeiten(reis, route) {
    var getal = function (n) { return Number(n).toLocaleString('nl-NL'); };
    var periode = reis.start_datum && reis.eind_datum ? periodeKort(reis.start_datum, reis.eind_datum) : null;
    var rk = routeKm(route);
    var uit = (reis.feiten || []).map(function (f) {
      if (f[0] === 'calendar' && periode) return ['calendar', periode];
      if (f[0] === 'car' && (rk !== undefined || reis.km_gereden)) {
        return ['car', [f[1], rk !== undefined && (rk == null ? '?' : getal(rk)) + ' km route',
          reis.km_gereden && getal(reis.km_gereden) + ' km gereden'].filter(Boolean).join(' · ')];
      }
      return f;
    });
    if (periode && !uit.some(function (f) { return f[0] === 'calendar'; })) uit.unshift(['calendar', periode]);
    return uit;
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
    nachtenTekst: nachtenTekst, reistijd: reistijd, vervoerOpties: vervoerOpties, reistijdBereik: reistijdBereik, optieTekst: optieTekst, optiesKop: optiesKop, tekstOf: tekstOf, hartjesVan: hartjesVan, hartjesTekst: hartjesTekst, hartVorm: hartVorm, telVormen: telVormen, isIdee: isIdee, sorteerTeDoen: sorteerTeDoen, opVerlanglijst: opVerlanglijst, VERVOERNAAM: VERVOERNAAM, beoordelingTekst: beoordelingTekst, kortNaam: kortNaam,
    licentieUrl: licentieUrl, fotoCredit: fotoCredit, veiligeLink: veiligeLink,
    budgetRegel: budgetRegel, tijd: tijd, ritTijden: ritTijden, tijdvak: tijdvak, activiteitWanneer: activiteitWanneer,
    verblijfPeriode: verblijfPeriode, telLink: telLink, statusLabel: statusLabel, inSlapen: inSlapen,
    periodeKort: periodeKort, routeKm: routeKm, reisFeiten: reisFeiten };
})();
