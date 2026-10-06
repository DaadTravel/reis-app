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
  // Te doen per plek: eerst wat geen idee is (op volgorde), dan ideeën op aantal hartjes (meeste eerst), dan wat bij
  // onze smaak past (O.smaakScore per soort, besluit gebruiker 2026-10-06; zonder smaak telt dat niet), dan volgorde.
  function sorteerTeDoen(acts, hartjes, smaak) {
    var sm = smaak && typeof smaak === 'object' ? smaak : {};
    // Score per soort: alleen een eigen, eindig getal telt (rare waarden → 0, zodat de volgorde vast blijft).
    function score(a) { var v = isSoort(a.icoon) && Object.prototype.hasOwnProperty.call(sm, a.icoon) ? Number(sm[a.icoon]) : 0; return isFinite(v) ? v : 0; }
    var tel = {};
    hartjes.forEach(function (x) { tel[x.activiteit_id] = (tel[x.activiteit_id] || 0) + 1; });
    return acts.slice().sort(function (a, b) {
      return (isIdee(a) - isIdee(b)) || (isIdee(a) ? (tel[b.id] || 0) - (tel[a.id] || 0) || score(b) - score(a) : 0) || a.volgorde - b.volgorde;
    });
  }
  // Verlanglijstje (besluit gebruiker 2026-10-04): een idee alleen met minstens één hartje of ster; wat geen idee
  // is (geboekt e.d.) staat er altijd op. Volgorde blijft.
  function opVerlanglijst(acts, hartjes) {
    var met = {};
    hartjes.forEach(function (x) { met[x.activiteit_id] = true; });
    return acts.filter(function (a) { return !isIdee(a) || met[a.id]; });
  }
  // Hartjes vooraf (lijkt me leuk) en achteraf (was leuk), besluit gebruiker 2026-10-06. Zonder moment = vooraf
  // (rijen van vóór de kolom); een onbekend moment telt nergens mee.
  function splitsMoment(hartjes) {
    var uit = { vooraf: [], achteraf: [] };
    rijen(hartjes).forEach(function (x) { var m = x.moment || 'vooraf'; if (m === 'vooraf' || m === 'achteraf') uit[m].push(x); });
    return uit;
  }
  // Achteraf kan alleen bij wat je echt deed (geen idee, geen optie): na de reis, of onderweg vanaf de datum van de activiteit;
  // zonder datum vanaf de aankomst op de plek (aankomst: stop_id → datum, O.aankomstPlekken). Besluit gebruiker 2026-10-06.
  function magAchteraf(a, herinnering, vandaag, aankomst) {
    if (isIdee(a) || a.status === 'optie') return false;
    if (herinnering) return true;
    if (!isDatum(vandaag)) return false;
    if (isDatum(a.datum)) return a.datum <= vandaag;
    var plek = aankomst && typeof aankomst === 'object' ? aankomst[a.stop_id] : null;
    return !!(plek && plek <= vandaag);
  }
  // Na thuiskomst (code-controleur 2026-10-06): een gekozen reis (geboekt/betaald) geldt na de einddatum als
  // afgerond voor "was leuk", ook als de stemming nog niet met de hand op herinnering staat.
  function naReis(r, vandaag) {
    return !!(r && typeof r === 'object' && (r.status === 'geboekt' || r.status === 'betaald') && isDatum(r.eind_datum) && isDatum(vandaag) && r.eind_datum < vandaag);
  }
  // Aankomst per plek = het vroegste inchecken van de verblijven daar (ook opties: die liggen op dezelfde dagen).
  function aankomstPlekken(verblijven) {
    var uit = {};
    rijen(verblijven).forEach(function (v) { if (v.stop_id && isDatum(v.inchecken) && (!uit[v.stop_id] || v.inchecken < uit[v.stop_id])) uit[v.stop_id] = v.inchecken; });
    return uit;
  }
  // Soorten voor het smaakprofiel (activiteiten.icoon); vervoer, slapen en hulpiconen tellen niet mee.
  var SOORTEN = { wave: 'Water en strand', pool: 'Zwemmen en ontspannen', hike: 'Natuur en uitzicht', city: 'Stad en musea',
    food: 'Eten en markten', temple: 'Cultuur en tempels', village: 'Dorpjes', boat: 'Boottochten', sun: 'Pretparken en uitjes', cup: 'Proeven' };
  // Alleen echte soorten (eigen sleutel van SOORTEN), niet 'constructor' en dergelijke van elk object.
  function isSoort(k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(SOORTEN, k); }
  // Smaakprofiel per groep (tiener; volwassene of onbekend): per soort het aantal hartjes vooraf en achteraf.
  // Volgorde: achteraf telt dubbel (dat weet je zeker), dan op naam. Rare data → leeg, nooit een fout.
  function smaakprofiel(hartjes, activiteiten, leden) {
    var soort = {}, groep = {}, tel = { tiener: {}, volwassene: {} };
    rijen(activiteiten).forEach(function (a) { if (isSoort(a.icoon)) soort[a.id] = a.icoon; });
    rijen(leden).forEach(function (l) { groep[l.user_id] = l.groep; });
    var s = splitsMoment(hartjes);
    ['vooraf', 'achteraf'].forEach(function (m) {
      s[m].forEach(function (x) {
        var k = Object.prototype.hasOwnProperty.call(soort, x.activiteit_id) ? soort[x.activiteit_id] : null;
        if (!k) return;
        var t = tel[groep[x.user_id] === 'tiener' ? 'tiener' : 'volwassene'];
        t[k] = t[k] || { soort: k, naam: SOORTEN[k], vooraf: 0, achteraf: 0 };
        t[k][m]++;
      });
    });
    function lijst(t) {
      return Object.keys(t).map(function (k) { return t[k]; }).sort(function (a, b) {
        return (b.achteraf * 2 + b.vooraf) - (a.achteraf * 2 + a.vooraf) || (a.naam < b.naam ? -1 : 1);
      });
    }
    return { tiener: lijst(tel.tiener), volwassene: lijst(tel.volwassene) };
  }
  // Smaak als score per soort voor de volgorde van ideeën: beide groepen samen, achteraf dubbel.
  function smaakScore(profiel) {
    var uit = {};
    if (!profiel || typeof profiel !== 'object') return uit;
    ['tiener', 'volwassene'].forEach(function (g) {
      rijen(profiel[g]).forEach(function (x) { if (isSoort(x.soort)) uit[x.soort] = (uit[x.soort] || 0) + (Number(x.achteraf) || 0) * 2 + (Number(x.vooraf) || 0); });
    });
    return uit;
  }
  // Past bij ons (vergelijkingstabel): per groep het deel (%) van de activiteiten van een reis waarvan de soort in de
  // top 3 van die groep staat. Alleen activiteiten met een bekende soort tellen; geen profiel of niets te tellen → null.
  function pastBijOns(activiteiten, profiel) {
    var acts = rijen(activiteiten).filter(function (a) { return isSoort(a.icoon); }), uit = {};
    ['tiener', 'volwassene'].forEach(function (g) {
      var top = rijen(profiel && profiel[g]).filter(function (x) { return isSoort(x.soort); }).slice(0, 3).map(function (x) { return x.soort; });
      uit[g] = top.length && acts.length ? Math.round(100 * acts.filter(function (a) { return top.indexOf(a.icoon) > -1; }).length / acts.length) : null;
    });
    return uit;
  }
  // Vergelijkingstabel voor de beheerder (2026-10-04): per reis de kerngegevens naast elkaar. Onbekend blijft
  // null ("?"), nooit 0. Totaal = som van de bekende posten; onbekend = er is een post zonder (geldig) bedrag,
  // of geen post. Dagen = van vertrek t/m thuiskomst (incl. reisdagen). Per nacht = totaal / nachten in het land
  // (reizen.nachten; besluit gebruiker 2026-10-06: een nachtvlucht maakt een reis niet duurder per dag), voor het
  // hele gezin. Erheen = de eerste rit na het vertrekpunt (nog niet gekozen → onbekend): de vlucht, of bij een
  // roadtrip de rijuren tot de eerste plek met 3+ nachten (besluit gebruiker 2026-10-04); komt die plek er niet
  // of ontbreekt een tijd → onbekend. Weer = het feit met icoon 'sun'.
  function vergelijk(reizen, d) {
    var van = function (lijst, r) { return (lijst || []).filter(function (x) { return x && x.reis_id === r.id; }); };
    var bedrag = function (b) { return b.totaal != null && b.totaal !== '' && isFinite(Number(b.totaal)); };
    return reizen.map(function (r) {
      var posten = van(d.budget, r), bekend = posten.filter(bedrag);
      var totaal = bekend.length ? bekend.reduce(function (s, b) { return s + Number(b.totaal); }, 0) : null;
      var geldig = typeof r.start_datum === 'string' && typeof r.eind_datum === 'string';
      var dagen = geldig ? Math.round((lees(r.eind_datum) - lees(r.start_datum)) / 864e5) + 1 : null;
      if (!(dagen > 0)) dagen = null;
      var punten = van(d.route, r).slice().sort(function (a, b) { return a.volgorde - b.volgorde; });
      if (punten[0] && !punten[0].leg_vervoer && !punten[0].leg_opties) punten = punten.slice(1);
      var eerste = punten[0] && punten[0].leg_vervoer ? punten[0] : null;
      var heen = null;
      if (eerste && eerste.leg_vervoer === 'car') {
        for (var i = 0; i < punten.length && punten[i].leg_vervoer === 'car'; i++) {
          if (punten[i].nachten >= 3) { heen = punten.slice(0, i + 1); break; }
        }
      } else if (eerste) heen = [eerste];
      var heenMin = heen && heen.every(function (l) { return l.leg_minuten != null && isFinite(Number(l.leg_minuten)); })
        ? heen.reduce(function (s, l) { return s + Number(l.leg_minuten); }, 0) : null;
      var weer = (Array.isArray(r.feiten) ? r.feiten : []).filter(function (f) { return Array.isArray(f) && f[0] === 'sun' && typeof f[1] === 'string'; })[0];
      var vormen = telVormen(d.hartjes || [], van(d.activiteiten, r).map(function (a) { return a.id; }), d.leden || []);
      return { id: r.id, slug: r.slug, titel: r.titel, stemming: r.stemming,
        status: r.stemming === 'herinnering' ? 'Afgerond' : String(r.kaart_status_label || r.status_label || '?').split(' · ')[0],
        periode: dagen ? periodeKort(r.start_datum, r.eind_datum) + ' ' + lees(r.eind_datum).getUTCFullYear() : null,
        dagen: dagen, nachten: r.nachten == null ? null : r.nachten, plekken: van(d.stops, r).length,
        erheen: eerste ? eerste.leg_vervoer : null, totaal: totaal,
        erheenMin: heenMin, erheenDagen: heen && eerste.leg_vervoer === 'car' ? heen.length : null,
        erheenBenadering: !!heen && heen.some(function (l) { return l.leg_benadering; }),
        weer: weer ? weer[1] : null,
        onbekend: !posten.length || bekend.length < posten.length,
        schatting: posten.some(function (b) { return /schatting|geschat/i.test(b.label || ''); }),
        perNacht: totaal != null && Number(r.nachten) > 0 ? Math.round(totaal / Number(r.nachten)) : null,
        tiener: vormen.tiener, volwassene: vormen.volwassene };
    });
  }
  // ===== Onderweg (besluit gebruiker 2026-10-04) =====
  // Datum "vandaag" als JJJJ-MM-DD op de klok van de telefoon, in de tijdzone waar je bent: na een vlucht naar
  // Japan springt de telefoon over en dus ook de dag. tijdzone alleen voor tests; onbekend → die van het toestel.
  function datumIn(nu, tijdzone) {
    if (!(nu instanceof Date) || isNaN(nu)) return null;
    var opties = { year: 'numeric', month: '2-digit', day: '2-digit' }, f;
    try { f = new Intl.DateTimeFormat('en-CA', Object.assign({ timeZone: tijdzone || undefined }, opties)); } catch (e) { f = new Intl.DateTimeFormat('en-CA', opties); }
    var d = {};
    f.formatToParts(nu).forEach(function (p) { d[p.type] = p.value; });
    return d.year + '-' + d.month + '-' + d.day;
  }
  // Echte kalenderdatum JJJJ-MM-DD (geen 2026-13-45 of 30 februari); alles anders → false.
  function isDatum(iso) {
    if (typeof iso !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(iso)) return false;
    var d = lees(iso);
    return !isNaN(d) && d.toISOString().slice(0, 10) === iso;
  }
  function plusDagen(iso, n) {
    if (!isDatum(iso)) return null;
    var d = lees(iso); d.setUTCDate(d.getUTCDate() + (Number(n) || 0));
    return d.toISOString().slice(0, 10);
  }
  function dagenTussen(van, tot) { return isDatum(van) && isDatum(tot) ? Math.round((lees(tot) - lees(van)) / 864e5) : null; }
  // Rijen uit de database: alleen een echte lijst met objecten telt (rare of ontbrekende data → leeg).
  function rijen(x) { return Array.isArray(x) ? x.filter(function (r) { return r && typeof r === 'object'; }) : []; }
  // Actieve reis: gekozen (geboekt/betaald), van de dag vóór vertrek (dagNr 0) t/m de dag van thuiskomst.
  // Lopen er twee tegelijk, dan de reis die het eerst begon. Ongeldige datums tellen niet mee.
  function actieveReis(reizen, vandaag) {
    if (!isDatum(vandaag)) return null;
    var kandidaten = rijen(reizen).filter(function (r) {
      return (r.status === 'geboekt' || r.status === 'betaald') && isDatum(r.start_datum) && isDatum(r.eind_datum) &&
        vandaag >= plusDagen(r.start_datum, -1) && vandaag <= r.eind_datum;
    }).sort(function (a, b) { return a.start_datum < b.start_datum ? -1 : a.start_datum > b.start_datum ? 1 : 0; });
    var r = kandidaten[0];
    return r ? { reis: r, dagNr: dagenTussen(r.start_datum, vandaag) + 1, dagen: dagenTussen(r.start_datum, r.eind_datum) + 1 } : null;
  }
  // Wat er op een dag gebeurt. routes: ritten die die dag vertrekken, plus een nachtvlucht van gisteren die vandaag
  // aankomt (aankomst: true). Vertrek zonder tijd: een autorit na de eerste rit vertrekt "~09:00" (gewoonte van het
  // gezin, besluit gebruiker 2026-10-04); anders geen tijd. slapen: het geboekte (of onbekende) verblijf van die nacht.
  // Vrije dag (geen rit, niets gepland): de top 3 ideeën van deze plek op hartjes. Rare data → leeg, nooit een fout.
  function dagOverzicht(d, datum) {
    d = d && typeof d === 'object' ? d : {};
    var r = d.reis && typeof d.reis === 'object' ? d.reis : {};
    var leeg = { datum: datum, dagNr: null, dagen: null, plek: null, routes: [], slapen: null, nachtNr: null, nachtenHier: null,
      activiteiten: [], vrij: false, ideeen: [], laatsteDag: false, morgen: { datum: null, uitchecken: null, routes: [], activiteiten: [] } };
    if (!isDatum(datum)) return leeg;
    var route = rijen(d.route).slice().sort(function (a, b) { return (Number(a.volgorde) || 0) - (Number(b.volgorde) || 0); });
    var eersteRit = route.filter(function (l) { return l.leg_vervoer; })[0];
    var stopNaam = {};
    rijen(d.stops).forEach(function (s) { stopNaam[s.id] = tekstOf(s.naam) || null; });
    var verblijven = rijen(d.verblijven), acts = rijen(d.activiteiten);
    function rit(l, aankomst) {
      var i = route.indexOf(l), van = i > 0 ? tekstOf(route[i - 1].naam) || null : null;
      var vertrek = l.leg_vertrek ? tijd(l.leg_vertrek) : l.leg_vervoer === 'car' && l !== eersteRit ? '~09:00' : null;
      return { punt: l, van: van, naar: tekstOf(l.naam) || null, vertrek: vertrek, aankomst: !!aankomst, aankomstTijd: l.leg_aankomst ? tijd(l.leg_aankomst) : null };
    }
    function routesOp(dt) {
      return route.filter(function (l) { return l.leg_vervoer && Number(l.leg_aankomst_dagen) >= 1 && isDatum(l.leg_datum) && plusDagen(l.leg_datum, Number(l.leg_aankomst_dagen)) === dt; }).map(function (l) { return rit(l, true); })
        .concat(route.filter(function (l) { return l.leg_vervoer && l.leg_datum === dt; }).map(function (l) { return rit(l, false); }));
    }
    function slaapOp(dt) {
      return verblijven.filter(function (v) { return inSlapen(v) && isDatum(v.inchecken) && isDatum(v.uitchecken) && v.inchecken <= dt && dt < v.uitchecken; })[0] || null;
    }
    function gepland(dt) {
      return acts.filter(function (a) { return !isIdee(a) && a.datum === dt; })
        .sort(function (a, b) { return String(a.begin_tijd || '99').localeCompare(String(b.begin_tijd || '99')); });
    }
    var morgenDatum = plusDagen(datum, 1);
    var routes = routesOp(datum), slapen = slaapOp(datum), activiteiten = gepland(datum);
    var vertrekt = routes.filter(function (x) { return !x.aankomst; });
    var laatste = vertrekt[vertrekt.length - 1];
    var plekId = slapen ? slapen.stop_id : laatste && laatste.punt.stop_id;
    var vrij = !routes.length && !activiteiten.length && !!slapen;
    var ideeen = vrij ? sorteerTeDoen(acts.filter(function (a) { return isIdee(a) && a.stop_id === plekId; }), rijen(d.hartjes), d.smaak).slice(0, 3) : [];
    var morgenSlapen = slaapOp(morgenDatum);
    var dagNr = dagenTussen(r.start_datum, datum), dagen = dagenTussen(r.start_datum, r.eind_datum);
    return {
      datum: datum, dagNr: dagNr == null ? null : dagNr + 1, dagen: dagen == null ? null : dagen + 1,
      plek: plekId ? stopNaam[plekId] || null : null, plekId: plekId && stopNaam[plekId] !== undefined ? plekId : null, routes: routes, slapen: slapen,
      nachtNr: slapen ? dagenTussen(slapen.inchecken, datum) + 1 : null, nachtenHier: slapen ? dagenTussen(slapen.inchecken, slapen.uitchecken) : null,
      activiteiten: activiteiten, vrij: vrij, ideeen: ideeen, laatsteDag: datum === r.eind_datum,
      morgen: { datum: morgenDatum, uitchecken: slapen && slapen.uitchecken === morgenDatum && (!morgenSlapen || morgenSlapen.id !== slapen.id) ? slapen : null,
        routes: routesOp(morgenDatum).filter(function (x) { return !x.aankomst; }), activiteiten: gepland(morgenDatum) }
    };
  }
  // Kenmerken van het verblijf op Vandaag (besluit gebruiker 2026-10-04): "Ontbijt inbegrepen · Zwembad · 2 kamers".
  // Alleen wat bekend is (onbekend wordt weggelaten, geen "?"); geen ontbijt wél noemen (dan zelf regelen).
  function verblijfKenmerken(v) {
    var x = v || {}, uit = [], n = Number(x.kamers);
    if (x.ontbijt === true) uit.push('Ontbijt inbegrepen'); else if (x.ontbijt === false) uit.push('Geen ontbijt');
    if (x.zwembad === true) uit.push('Zwembad');
    if (x.kamers != null && x.kamers !== '' && isFinite(n) && n > 0) uit.push(n === 1 ? '1 kamer' : n + ' kamers');
    return uit.join(' · ');
  }
  // Nog open van gisteren (besluit gebruiker 2026-10-05): wat gisteren gebeurde en nog niet betaald is (nog betalen
  // of onbekend): activiteiten (geen ideeën), ritten (geen eigen auto) en het verblijf van die nacht. Op de eerste
  // dag van de reis niets (gisteren was je thuis).
  function openVanGisteren(d, datum) {
    d = d && typeof d === 'object' ? d : {};
    var r = d.reis || {}, gisteren = plusDagen(datum, -1);
    var leeg = { gisteren: gisteren, activiteiten: [], routes: [], verblijven: [] };
    if (!gisteren || (isDatum(r.start_datum) && gisteren < r.start_datum)) return leeg;
    var open = function (s) { return s !== 'betaald'; };
    return {
      gisteren: gisteren,
      activiteiten: rijen(d.activiteiten).filter(function (a) { return a.datum === gisteren && !isIdee(a) && open(a.status); }),
      routes: rijen(d.route).filter(function (l) { return l.leg_vervoer && l.leg_vervoer !== 'car' && l.leg_datum === gisteren && open(l.leg_status); }),
      verblijven: rijen(d.verblijven).filter(function (v) {
        return inSlapen(v) && isDatum(v.inchecken) && isDatum(v.uitchecken) && v.inchecken <= gisteren && gisteren < v.uitchecken && open(v.status);
      })
    };
  }
  // ===== Bewerken onderweg (besluit gebruiker 2026-10-05) =====
  // Alleen wat onderweg verandert: tijden, adres/ophaalpunt, contact, boekingscode, betaalstatus, notitie (bijv. wifi,
  // deurcode, gate). Herplannen (nachten, route, prijzen) niet. Per tabel de velden en hun soort.
  var WIJZIGBAAR = {
    route_punten: { leg_vertrek: 'tijd', leg_aankomst: 'tijd', leg_aankomst_dagen: 'dagen', leg_adres: 'tekst', leg_boekingscode: 'kort', leg_telefoon: 'tel', leg_status: 'status', leg_notitie: 'notitie' },
    verblijven: { inchecktijd: 'tijd', uitchecktijd: 'tijd', adres: 'tekst', telefoon: 'tel', boekingscode: 'kort', status: 'status', notitie: 'notitie' },
    activiteiten: { naam: 'naam', datum: 'datum', begin_tijd: 'tijd', eind_tijd: 'tijd', ophaalpunt: 'tekst', telefoon: 'tel', boekingscode: 'kort', status: 'status', notitie: 'notitie' }
  };
  // Controle vóór opslaan. Leeg = wissen (null), behalve een naam (verplicht). Uitslag { ok, schoon, fouten }.
  function valideerWijziging(tabel, velden) {
    var soort = WIJZIGBAAR[tabel], schoon = {}, fouten = {};
    if (!soort || !velden || typeof velden !== 'object') return { ok: false, schoon: {}, fouten: { tabel: 'Kan hier niet gewijzigd worden.' } };
    Object.keys(velden).forEach(function (k) {
      var s = soort[k], v = velden[k];
      if (!s) { fouten[k] = 'Dit veld kan onderweg niet gewijzigd worden.'; return; }
      var t = v == null ? '' : String(v).trim();
      if (!t) { if (s === 'naam') fouten[k] = 'Geef een naam.'; else schoon[k] = s === 'dagen' ? 0 : null; return; }
      var m;
      if (s === 'tijd') {
        m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(t);
        if (!m || +m[1] > 23 || +m[2] > 59) fouten[k] = 'Tijd als UU:MM, bijv. 08:30.';
        else schoon[k] = (m[1].length === 1 ? '0' : '') + m[1] + ':' + m[2];
      } else if (s === 'dagen') {
        // Aankomst 0 t/m 3 dagen na vertrek (zoals de check in de database); als getal.
        if (/^[0-3]$/.test(t)) schoon[k] = Number(t); else fouten[k] = 'Aantal dagen 0 t/m 3.';
      } else if (s === 'datum') {
        if (isDatum(t)) schoon[k] = t; else fouten[k] = 'Geen geldige datum.';
      } else if (s === 'status') {
        if (t === 'betaald' || t === 'geboekt') schoon[k] = t; else fouten[k] = 'Kies betaald of nog betalen.';
      } else if (s === 'tel') {
        if (/^\+?[\d\s()\-./]{3,30}$/.test(t)) schoon[k] = t; else fouten[k] = 'Alleen cijfers, +, spaties, streepjes en haakjes.';
      } else {
        var max = s === 'notitie' ? 2000 : s === 'kort' ? 80 : 300; // zoals de checks in de database
        if (t.length > max) fouten[k] = 'Te lang (max. ' + max + ' tekens).'; else schoon[k] = t;
      }
    });
    return { ok: !Object.keys(fouten).length, schoon: schoon, fouten: fouten };
  }
  // Aankomst- of eindtijd die meeschuift met een nieuwe vertrek- of begintijd (besluit gebruiker 2026-10-05).
  // Waren begin én eind al bekend: het eind schuift evenveel op (klopt ook bij een vlucht naar een andere tijdzone).
  // Anders, met een bekende reistijd en geen vlucht: begin + reistijd. Uitslag { eind: 'UU:MM', dagen } of null
  // (niets te berekenen; bij geenDagen, een activiteit, ook null als het eind over middernacht zou gaan).
  function volgTijd(p, nieuwBegin) {
    var x = p || {};
    var min = function (t) { var m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; };
    var nb = min(nieuwBegin), ob = min(x.oudBegin), oe = min(x.oudEind), totaal = null;
    if (nb == null) return null;
    if (ob != null && oe != null) totaal = oe + (Number(x.eindDagen) || 0) * 1440 + (nb - ob);
    else if (x.minuten != null && isFinite(Number(x.minuten)) && Number(x.minuten) > 0 && x.vervoer !== 'plane') totaal = nb + Number(x.minuten);
    if (totaal == null) return null;
    var dagen = Math.floor(totaal / 1440);
    if (dagen < 0 || dagen > 3 || (x.geenDagen && dagen !== 0)) return null;
    var r = totaal - dagen * 1440, uu = Math.floor(r / 60), mm = r % 60;
    return { eind: (uu < 10 ? '0' : '') + uu + ':' + (mm < 10 ? '0' : '') + mm, dagen: dagen };
  }
  // Wachtrij van wijzigingen op de telefoon (localStorage, JSON): per veld { tabel, id, veld, waarde, gewijzigd } en
  // nieuwe rijen { tabel, id, nieuw: true, rij, gewijzigd }. Alleen geldige items; rommel → weg, nooit een fout.
  function wijzigWachtrijLees(json) {
    var w;
    try { w = JSON.parse(json || '{}'); } catch (e) { return {}; }
    if (!w || typeof w !== 'object' || Array.isArray(w)) return {};
    var uit = {};
    Object.keys(w).forEach(function (k) {
      var x = w[k];
      if (!x || typeof x !== 'object' || !WIJZIGBAAR[x.tabel] || typeof x.id !== 'string' || typeof x.gewijzigd !== 'string') return;
      // fout: geweigerd; user_id: van wie (alleen eigen items versturen en tonen); verzonden: aangekomen, blijft als
      // kopie staan tot de reis opnieuw van de server is gehaald (de offline kopie kan nog oud zijn).
      var extra = { fout: typeof x.fout === 'string' ? x.fout : null, user_id: typeof x.user_id === 'string' ? x.user_id : null, verzonden: x.verzonden === true, verzondenOp: typeof x.verzondenOp === 'string' ? x.verzondenOp : null };
      if (x.nieuw === true && x.rij && typeof x.rij === 'object' && x.rij.id === x.id) uit[k] = Object.assign({ tabel: x.tabel, id: x.id, nieuw: true, rij: x.rij, gewijzigd: x.gewijzigd }, extra);
      else if (typeof x.veld === 'string' && WIJZIGBAAR[x.tabel][x.veld] && (x.waarde === null || typeof x.waarde === 'string' || (typeof x.waarde === 'number' && isFinite(x.waarde))))
        uit[k] = Object.assign({ tabel: x.tabel, id: x.id, veld: x.veld, waarde: x.waarde, gewijzigd: x.gewijzigd }, extra);
    });
    return uit;
  }
  // Rijen met de wijzigingen uit de wachtrij erop (nieuwe kopieën; de bron blijft ongewijzigd). Een nieuwe rij die al
  // op de server staat, komt er niet nog een keer bij.
  function pasWijzigingenToe(rijenIn, tabel, wachtrij, ik) {
    var lijst = rijen(rijenIn).map(function (r) { return Object.assign({}, r); }), opId = {};
    lijst.forEach(function (r) { opId[r.id] = r; });
    var w = wachtrij || {};
    Object.keys(w).sort(function (a, b) { return String(w[a].gewijzigd).localeCompare(String(w[b].gewijzigd)); }).forEach(function (k) {
      var x = w[k];
      // Geweigerde wijzigingen niet tonen; met ik alleen je eigen (een ander account op dit toestel niet).
      if (!x || x.tabel !== tabel || x.fout || (ik && x.user_id && x.user_id !== ik)) return;
      if (x.nieuw) {
        if (!opId[x.id]) {
          // Volgorde kent de database toe; in beeld alvast max+1, zodat sorteren klopt (de wachtrij blijft ongemoeid).
          var n = Object.assign({}, x.rij);
          if (n.volgorde == null) n.volgorde = lijst.reduce(function (m, r) { return Math.max(m, Number(r.volgorde) || 0); }, 0) + 1;
          lijst.push(n); opId[x.id] = n;
        }
        return;
      }
      if (opId[x.id]) opId[x.id][x.veld] = x.waarde;
    });
    return lijst;
  }
  // ===== Reisverslag (besluit gebruiker 2026-10-04) =====
  // Wachtrij op de telefoon: { "reis|datum|user": {reis_id, datum, user_id, tekst, gewijzigd, verzonden, fout} }.
  // Kapotte of rare inhoud → leeg (wat kapot is, kan niet meer verstuurd worden; nooit een fout).
  function wachtrijLees(json) {
    var w;
    try { w = JSON.parse(json || '{}'); } catch (e) { return {}; }
    if (!w || typeof w !== 'object' || Array.isArray(w)) return {};
    var uit = {};
    Object.keys(w).forEach(function (k) {
      var x = w[k];
      if (x && typeof x === 'object' && typeof x.reis_id === 'string' && isDatum(x.datum) && typeof x.user_id === 'string' &&
        typeof x.tekst === 'string' && typeof x.gewijzigd === 'string') {
        // verzonden: deze versie is aangekomen (blijft als eigen kopie staan); fout: laatste weigering.
        uit[k] = Object.assign({}, x, { verzonden: x.verzonden === true, fout: typeof x.fout === 'string' ? x.fout : null });
      }
    });
    return uit;
  }
  // Dagen van het verslag: van vertrek t/m vandaag (tijdens de reis) of t/m thuiskomst (daarna); vóór vertrek geen.
  function verslagDagen(reis, vandaag) {
    var r = reis || {};
    if (!isDatum(r.start_datum) || !isDatum(r.eind_datum) || !isDatum(vandaag) || vandaag < r.start_datum) return [];
    var tot = vandaag < r.eind_datum ? vandaag : r.eind_datum, uit = [];
    for (var d = r.start_datum; d <= tot && uit.length < 400; d = plusDagen(d, 1)) uit.push(d);
    return uit;
  }
  // Per dag: je eigen verslag (om te bewerken) en die van de anderen met naam (om te lezen; lege tekst telt niet).
  function verslagVan(verslagen, datum, mijnId, leden) {
    var naam = {};
    rijen(leden).forEach(function (l) { naam[l.user_id] = l.weergavenaam || 'Iemand'; });
    var vandag = rijen(verslagen).filter(function (v) { return v.datum === datum && typeof v.tekst === 'string'; });
    return { eigen: vandag.filter(function (v) { return v.user_id === mijnId; })[0] || null,
      anderen: vandag.filter(function (v) { return v.user_id !== mijnId && v.tekst.trim(); })
        .map(function (v) { return { naam: naam[v.user_id] || 'Iemand', tekst: v.tekst }; }) };
  }
  // Download als platte tekst: titel, periode, per dag "wo 8 juli · plek" en de teksten, altijd met de naam van
  // de schrijver (besluit gebruiker 2026-10-04; op naam gesorteerd). Dagen zonder tekst vallen weg.
  function verslagExport(reis, verslagen, leden, plekken) {
    var r = reis || {}, naam = {};
    rijen(leden).forEach(function (l) { naam[l.user_id] = l.weergavenaam || 'Iemand'; });
    var delen = [tekstOf(r.titel)];
    if (isDatum(r.start_datum) && isDatum(r.eind_datum)) delen[0] += '\n' + periodeKort(r.start_datum, r.eind_datum) + ' ' + lees(r.eind_datum).getUTCFullYear();
    var dagen = {};
    rijen(verslagen).forEach(function (v) {
      if (!isDatum(v.datum) || typeof v.tekst !== 'string' || !v.tekst.trim()) return;
      (dagen[v.datum] = dagen[v.datum] || []).push({ naam: naam[v.user_id] || 'Iemand', tekst: v.tekst.trim() });
    });
    Object.keys(dagen).sort().forEach(function (d) {
      var lijst = dagen[d].sort(function (a, b) { return a.naam.localeCompare(b.naam); });
      var kop = dagLabel(d) + (plekken && plekken[d] ? ' · ' + plekken[d] : '');
      delen.push(kop + '\n\n' + lijst.map(function (x) { return x.naam + ':\n' + x.tekst; }).join('\n\n'));
    });
    return delen.join('\n\n') + '\n';
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
  // Extra info bij een idee (de (i)-knop, besluit gebruiker 2026-10-05): tieners alleen de tekst, ouders ook duur,
  // kosten, let op en de link. Niets te tonen → null (dan geen knop). Een foto telt voor iedereen.
  function infoVan(a, groep) {
    var vol = function (s) { return String(s || '').trim(); };
    var alineas = vol(a.info_tekst).split(/\n\s*\n/).map(vol).filter(Boolean);
    var kind = groep === 'tiener';
    var feiten = kind ? [] : [['Duur', a.info_duur], ['Kosten', a.info_kosten], ['Let op', a.info_let_op]]
      .map(function (f) { return [f[0], vol(f[1])]; }).filter(function (f) { return f[1]; });
    var link = kind ? undefined : veiligeLink(a.link);
    return alineas.length || feiten.length || link || a.foto_id ? { alineas: alineas, feiten: feiten, link: link } : null;
  }
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
    nachtenTekst: nachtenTekst, reistijd: reistijd, vervoerOpties: vervoerOpties, reistijdBereik: reistijdBereik, optieTekst: optieTekst, optiesKop: optiesKop, tekstOf: tekstOf, hartjesVan: hartjesVan, hartjesTekst: hartjesTekst, hartVorm: hartVorm, telVormen: telVormen, isIdee: isIdee, sorteerTeDoen: sorteerTeDoen, opVerlanglijst: opVerlanglijst, splitsMoment: splitsMoment, magAchteraf: magAchteraf, naReis: naReis, smaakprofiel: smaakprofiel, smaakScore: smaakScore, pastBijOns: pastBijOns, aankomstPlekken: aankomstPlekken, vergelijk: vergelijk, datumIn: datumIn, plusDagen: plusDagen, actieveReis: actieveReis, dagOverzicht: dagOverzicht,
    openVanGisteren: openVanGisteren, volgTijd: volgTijd, WIJZIGBAAR: WIJZIGBAAR, valideerWijziging: valideerWijziging, wijzigWachtrijLees: wijzigWachtrijLees, pasWijzigingenToe: pasWijzigingenToe,
    verblijfKenmerken: verblijfKenmerken, wachtrijLees: wachtrijLees, verslagDagen: verslagDagen, verslagVan: verslagVan, verslagExport: verslagExport, VERVOERNAAM: VERVOERNAAM, beoordelingTekst: beoordelingTekst, kortNaam: kortNaam,
    licentieUrl: licentieUrl, fotoCredit: fotoCredit, veiligeLink: veiligeLink, infoVan: infoVan,
    budgetRegel: budgetRegel, tijd: tijd, ritTijden: ritTijden, tijdvak: tijdvak, activiteitWanneer: activiteitWanneer,
    verblijfPeriode: verblijfPeriode, telLink: telLink, statusLabel: statusLabel, inSlapen: inSlapen,
    periodeKort: periodeKort, routeKm: routeKm, reisFeiten: reisFeiten };
})();
