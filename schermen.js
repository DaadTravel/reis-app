// Schermen van de app (ontwerp "Nevel"): inloggen, wachtwoord instellen,
// startscherm met alle reizen, en de reispagina. Data komt uitsluitend via
// de functies in app.js; tekstopmaak via opmaak.js.
(function () {
  var G = window.Reisgids, h = React.createElement, O = window.Opmaak;
  var nachtenTekst = O.nachtenTekst, prijsTekst = O.prijsTekst, kortNaam = O.kortNaam;

  function A(o, p) { return Object.assign({}, o, p); }
  // Foto-ID → props voor een component ({ image, credit }); onbekend → {}.
  function maakFoto(fotos) {
    return function (id) {
      var f = id && fotos[id];
      if (!f || !f.url) return {};
      return { image: f.url, credit: O.fotoCredit(f) };
    };
  }
  // De foto-opzoeker van de reispagina, voor onderdelen diep in de boom (info bij een idee).
  var FotoCtx = React.createContext(function () { return {}; });
  function stopOpId(stops, id) { return stops.filter(function (s) { return s.id === id; })[0]; }
  // Dagen van een plek, in volgorde (koppeling via stop_id, migratie 0009).
  function dagenVan(dagen, stopId) { return dagen.filter(function (d) { return d.stop_id === stopId; }); }
  // De dag van één bezoek (routepunt) aan een plek, via route_punt_id (migratie 0012).
  // Nog niets gekoppeld bij die plek: het hoeveelste bezoek (keer) telt.
  function dagVanBezoek(dagen, punt, keer) {
    var eigen = dagenVan(dagen, punt.stop_id);
    if (!eigen.some(function (d) { return d.route_punt_id; })) return eigen[keer];
    return eigen.filter(function (d) { return d.route_punt_id === punt.id; })[0];
  }
  // Wat bij de rit hoort die aankomt op dit routepunt: datum en tijden uit de rit zelf
  // (migratie 0013), de logistiek-tekst van elke dag die daaraan hangt (nog niet omgezette
  // reizen) en de tekst van een reisdag zonder plek (heen- of terugvlucht).
  function ritTekst(dagen, punt) {
    var bij = dagen.filter(function (d) { return d.route_punt_id === punt.id; });
    return [O.ritTijden(punt)].concat(bij.map(function (d) { return d.logistiek; })).filter(meerDanAfstand)
      .concat(bij.filter(function (d) { return !d.stop_id && d.beleving; }).map(function (d) { return d.beleving; })).join(' · ');
  }
  // Etappes van en naar een plek, uit de route; bij twee bezoeken alle vier.
  function etappesVan(route, stopId) {
    var uit = [];
    route.forEach(function (x, k) {
      if (x.stop_id !== stopId) return;
      if (k > 0) uit.push({ van: route[k - 1], naar: x, aankomst: true });
      if (k < route.length - 1) uit.push({ van: x, naar: route[k + 1], aankomst: false });
    });
    return uit;
  }
  // Nachten van een plek; twee keer in de route = per bezoek ("3 + 1 nachten"), onbekend = "?".
  function nachtenPlek(route, s) {
    var bezoeken = route.filter(function (x) { return x.stop_id === s.id; });
    if (bezoeken.length < 2) return nachtenTekst(s.nachten);
    return bezoeken.map(function (v) { return v.nachten == null ? '?' : v.nachten; }).join(' + ') + ' nachten';
  }
  var VERVOER = O.VERVOERNAAM;
  // Reistijd plus prijs van een etappe. Een autorit krijgt geen prijs (brandstof/tol
  // tonen we niet); alleen echte vervoerskosten (besluit gebruiker 2026-10-01).
  function etappeTijdPrijs(l) {
    var uit = [O.reistijd(l.leg_minuten, l.leg_benadering)];
    if (l.leg_vervoer !== 'car') uit.push(prijsTekst(l.leg_prijs));
    return uit;
  }
  // Alle tips van een plek in één lijst: highlights, tips van de plek en van de dag(en)
  // (bij een plek met meer bezoeken alleen de plek; de dagtips staan dan per bezoek).
  // Dubbel = gelijk na wegstrepen van leestekens, of het begin van een langere tip
  // (dan blijft de langere staan). Besluit gebruiker 2026-10-01: alles in het tipskader.
  function tipsVan(s, dagen) {
    var alle = [].concat(s.highlights || [], s.tips || [], [].concat.apply([], dagen.map(function (x) { return x.tips || []; })));
    var kaal = function (t) { return t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); };
    var uit = [];
    alle.forEach(function (t) {
      var k = kaal(t || '');
      if (!k) return;
      for (var j = 0; j < uit.length; j++) {
        var u = kaal(uit[j]);
        if (u === k || u.indexOf(k + ' ') === 0) return;
        if (k.indexOf(u + ' ') === 0) { uit[j] = t; return; }
      }
      uit.push(t);
    });
    return uit;
  }
  // Logistiek-tekst die alleen km en reistijd herhaalt ("765 km (7u59)", "60 km · ~2 uur")
  // staat al in de etappes; alleen tonen als er meer in staat (tijden, overstap).
  function meerDanAfstand(t) {
    return !!t && !!t.replace(/~?\s*\d+([.,]\d+)?\s*(km|uur|min|u\d*)(?![\w:])|vanaf\s+\S+|daarna|[()·,~]/gi, '').trim();
  }
  function wanneerTekst(d, s) {
    if (d && d.datum_van) return O.dagLabel(d.datum_van, d.datum_tot);
    // wanneer_label niet: dat is nu overal het aantal nachten, en dat staat al als chip.
    return (s && s.nachten_label) || 'Datum ?';
  }
  // Praktische gegevens (verblijf, rit, excursie): alleen wat bekend is, als link waar dat
  // onderweg helpt (bellen, mailen, route). Leeg → niets (geen "?": optioneel, geen kenmerk).
  // Het adres gaat pas bij een tik naar Google Maps (alleen het adres, geen gezinsgegevens).
  function kaartLink(adres) {
    return h('a', { href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(adres),
      target: '_blank', rel: 'noopener noreferrer' }, adres);
  }
  function Contact(p) {
    var d = [];
    if (p.ophaalpunt) d.push(h('li', { key: 'o' }, 'Ophalen: ', kaartLink(p.ophaalpunt)));
    if (p.vertrekpunt) d.push(h('li', { key: 'w' }, 'Vertrek: ', kaartLink(p.vertrekpunt)));
    if (p.adres) d.push(h('li', { key: 'a' }, kaartLink(p.adres)));
    var tel = O.telLink(p.telefoon), web = O.veiligeLink(p.link);
    if (p.telefoon) d.push(h('li', { key: 't' }, tel ? h('a', { href: tel }, p.telefoon) : p.telefoon));
    if (p.email) d.push(h('li', { key: 'e' }, h('a', { href: 'mailto:' + encodeURI(p.email) }, p.email)));
    if (p.via) d.push(h('li', { key: 'v' }, 'Geboekt via ' + p.via));
    if (p.boekingscode) d.push(h('li', { key: 'b' }, 'Boekingscode ', h('strong', null, p.boekingscode)));
    if (web) d.push(h('li', { key: 'l' }, h('a', { href: web, target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Website' + (p.naam ? ' van ' + p.naam : '') }, 'Website')));
    return d.length ? h('ul', { className: 'nv-contact' }, d) : null;
  }
  function naar(id) { var el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function reisUrl(slug) { return '?reis=' + encodeURIComponent(slug); }

  // Lege-staat voor een onderwerp zonder gegevens.
  function Leeg(p) {
    return h('p', { className: 'nv-leeg' },
      p.herinnering ? null : h(G.StatusBadge, { status: 'open', label: 'Nog te bepalen' }),
      h('span', { className: 'nv-muted' }, p.tekst));
  }
  function Status(p) {
    return h('div', { className: 'nv-status', role: p.fout ? 'alert' : 'status' },
      p.fout ? h('p', { className: 'nv-melding' }, p.tekst) : h('p', null, p.tekst),
      p.kinderen);
  }
  // Foto's niet op te halen (bijv. geen verbinding met de fotoopslag): melden, niet stil weglaten.
  function FotoMelding(p) {
    return p.fout ? h('p', { className: 'nv-melding nv-melding--los', role: 'status' }, 'Niet alle foto\'s konden geladen worden. Herlaad de pagina om het opnieuw te proberen.') : null;
  }
  function Voet(p) {
    return h('footer', { className: 'nv-voet' },
      h('span', null, p.tekst || 'Onze reisgids'),
      h('button', { type: 'button', className: 'nv-knop', onClick: p.onUitloggen }, 'Uitloggen'));
  }

  // ═════════════ inloggen ═════════════
  function Poort(p) {
    return h('main', { className: 'nv-poort' },
      h('div', null,
        h('div', { className: 'nv-poort__kop' }, h('span', { className: 'nv-label' }, 'Reisgids'), h('h1', null, 'Onze reizen')),
        p.children));
  }

  function Inloggen(p) {
    var b = React.useState(false), bezig = b[0], setBezig = b[1];
    var m = React.useState(p.melding || ''), melding = m[0], setMelding = m[1];
    function verstuur(e) {
      e.preventDefault();
      var f = e.target, email = f.email.value.trim(), ww = f.wachtwoord.value;
      if (!email || !ww) { setMelding('Vul je e-mail en wachtwoord in.'); return; }
      setBezig(true); setMelding('');
      signIn(email, ww).then(function (r) {
        setBezig(false);
        if (isFout(r)) setMelding(r.message); else p.onIngelogd();
      });
    }
    return h(Poort, null,
      h('form', { className: 'nv-formulier', onSubmit: verstuur, noValidate: true },
        h('p', null, 'Log in met het account waarvoor je een uitnodiging hebt gekregen.'),
        h('label', { className: 'nv-veld' }, h('span', null, 'E-mail'),
          h('input', { name: 'email', type: 'email', autoComplete: 'username', inputMode: 'email', required: true })),
        h('label', { className: 'nv-veld' }, h('span', null, 'Wachtwoord'),
          h('input', { name: 'wachtwoord', type: 'password', autoComplete: 'current-password', required: true })),
        h('button', { className: 'nv-hoofdknop', type: 'submit', disabled: bezig }, bezig ? 'Bezig…' : 'Inloggen'),
        melding && h('p', { className: 'nv-melding', role: 'alert' }, melding)));
  }

  // Na een uitnodigings- of resetlink: zelf een wachtwoord kiezen.
  function WachtwoordInstellen(p) {
    var b = React.useState(false), bezig = b[0], setBezig = b[1];
    var m = React.useState(''), melding = m[0], setMelding = m[1];
    function verstuur(e) {
      e.preventDefault();
      var a = e.target.wachtwoord.value, c = e.target.herhaal.value;
      if (a.length < 8) { setMelding('Kies een wachtwoord van minstens 8 tekens.'); return; }
      if (a !== c) { setMelding('De twee wachtwoorden zijn niet gelijk.'); return; }
      setBezig(true); setMelding('');
      zetWachtwoord(a).then(function (r) {
        setBezig(false);
        if (isFout(r)) setMelding(r.message); else p.onKlaar();
      });
    }
    return h(Poort, null,
      h('form', { className: 'nv-formulier', onSubmit: verstuur, noValidate: true },
        h('p', null, p.type === 'recovery' ? 'Kies een nieuw wachtwoord.' : 'Welkom! Kies een wachtwoord voor je account.'),
        h('label', { className: 'nv-veld' }, h('span', null, 'Nieuw wachtwoord'),
          h('input', { name: 'wachtwoord', type: 'password', autoComplete: 'new-password', minLength: 8, required: true })),
        h('label', { className: 'nv-veld' }, h('span', null, 'Nog een keer'),
          h('input', { name: 'herhaal', type: 'password', autoComplete: 'new-password', minLength: 8, required: true })),
        h('button', { className: 'nv-hoofdknop', type: 'submit', disabled: bezig }, bezig ? 'Bezig…' : 'Wachtwoord opslaan'),
        melding && h('p', { className: 'nv-melding', role: 'alert' }, melding)));
  }

  // ═════════════ startscherm ═════════════
  function Startscherm(p) {
    var foto = maakFoto(p.data.fotos);
    var reizen = p.data.reizen;
    var groepen = [['voorpret', 'Nog te gaan'], ['herinnering', 'Al gemaakt']];
    React.useEffect(function () { document.title = 'Onze reizen'; }, []);
    return h(React.Fragment, null,
      h('main', { className: 'nv-wrap' },
        h('header', { className: 'nv-start__kop' },
          h('span', { className: 'nv-label' }, 'Reisgids'),
          h('h1', null, 'Onze reizen'),
          h('p', null, 'De reizen die we nog gaan maken, en de reizen die we al gemaakt hebben.')),
        h(FotoMelding, { fout: p.data.fotoFout }),
        p.data.actief ? h(NuOnderweg, { actief: p.data.actief }) : null,
        reizen.length ? null : h(Leeg, { herinnering: true, tekst: 'Er zijn nog geen reizen zichtbaar voor dit account. Is je account al toegevoegd aan de reisgids?' }),
        groepen.map(function (g) {
          var lijst = reizen.filter(function (r) { return r.stemming === g[0]; });
          if (!lijst.length) return null;
          return h('section', { key: g[0], 'aria-label': g[1] },
            h('h2', { className: 'nv-label nv-start__groep' }, g[1]),
            h('div', { className: 'nv-reizen' }, lijst.map(function (r) {
              return h(G.TripCard, A(foto(r.kaart_foto_id || r.hero_foto_id), {
                key: r.id, title: r.titel, year: r.jaar_label || undefined, mood: r.stemming, subtitle: r.ondertitel || undefined,
                nights: r.nachten == null ? '?' : r.nachten, status: r.status || undefined, statusLabel: r.kaart_status_label || r.status_label || undefined,
                href: reisUrl(r.slug) }));
            })));
        }),
        p.data.smaak ? h(Smaak, { smaak: p.data.smaak }) : null,
        p.data.vergelijk && p.data.vergelijk.length ? h(Vergelijk, { rijen: p.data.vergelijk }) : null),
      h(Voet, { onUitloggen: p.onUitloggen }));
  }

  // Smaakprofiel (2026-10-06, alleen ouders = beheerder): per groep de soorten met de meeste hartjes; achteraf telt dubbel.
  // Ingeklapt onderaan, zoals de vergelijkingstabel. Top 4 per groep; zonder hartjes van een groep een korte zin.
  function Smaak(p) {
    var s = p.smaak, groepen = [['tiener', 'Tieners'], ['volwassene', 'Ouders']];
    if (!s.vooraf && !s.achteraf) return null;
    return h('details', { className: 'nv-vergelijk nv-smaak' },
      h('summary', null,
        h('span', { className: 'nv-label' }, 'Alleen voor ouders'),
        h('span', { className: 'nv-vergelijk__titel' }, 'Onze smaak')),
      h('p', { className: 'nv-tekst nv-muted' }, 'Per soort uitje: hoe vaak iets vooraf leuk leek, en hoe vaak het achteraf leuk was (telt dubbel). Op basis van ' +
        s.vooraf + ' keer "leek leuk" en ' + s.achteraf + ' keer "was leuk".'),
      groepen.map(function (gr) {
        var lijst = s.profiel[gr[0]].slice(0, 4), vorm = O.hartVorm(gr[0]);
        return h('section', { key: gr[0], className: 'nv-smaak__groep', 'aria-label': gr[1] },
          h('h3', { className: 'nv-smaak__kop' }, h('span', { 'aria-hidden': true, className: gr[0] === 'tiener' ? 'nv-smaak__vorm--tiener' : undefined }, vorm), ' ' + gr[1]),
          lijst.length ? h('ol', { className: 'nv-smaak__lijst' }, lijst.map(function (x) {
            return h('li', { key: x.soort },
              h('span', { className: 'rg-act__icon' }, h(G.Icon, { name: x.soort, size: 18 })),
              h('span', { className: 'nv-smaak__naam' }, x.naam),
              h('span', { className: 'nv-smaak__tel' }, [x.achteraf ? x.achteraf + '× was leuk' : null, x.vooraf ? x.vooraf + '× leek leuk' : null].filter(Boolean).join(' · ')));
          })) : h('p', { className: 'nv-muted' }, 'Nog geen ' + vorm + ' gegeven.'));
      }));
  }

  // Vergelijkingstabel (alleen beheerder, app.js haalVergelijk): de reizen naast elkaar op de kerngegevens.
  // Ingeklapt onderaan (besluit gebruiker 2026-10-04). "~" = (deels) geschat, "+ ?" = er is nog een post
  // zonder bedrag; onbekend is "?". Erheen: zie O.vergelijk.
  function Vergelijk(p) {
    var euro = function (x) {
      if (x.totaal == null) return '?';
      return (x.schatting ? '~' : '') + O.euro(x.totaal) + (x.onbekend ? ' + ?' : '');
    };
    var groepen = [['voorpret', 'Nog te gaan'], ['herinnering', 'Al gemaakt']];
    var kop = ['Reis', 'Status', 'Periode', 'Nachten', 'Plekken', 'Erheen', 'Weer', 'Totaal', 'Per nacht', 'Hartjes'];
    var getal = [3, 4, 7, 8, 9];
    return h('details', { className: 'nv-vergelijk' },
      h('summary', null,
        h('span', { className: 'nv-label' }, 'Alleen voor ouders'),
        h('span', { className: 'nv-vergelijk__titel' }, 'Reizen vergelijken')),
      h('p', { className: 'nv-tekst nv-muted' }, 'Totaal met ~ is (deels) een schatting. Per nacht = totaal ÷ nachten in het land, voor het hele gezin; klein onder de nachten staan de dagen inclusief reisdagen. Hartjes: ★ en ♥ vooraf; ‘past’ = welk deel van de activiteiten en ideeën hoort bij de 3 soorten die tieners en ouders het leukst vinden (zie Onze smaak).'),
      h('div', { className: 'nv-vergelijk__schuif', tabIndex: 0, role: 'region', 'aria-label': 'Tabel, schuif zijwaarts voor alle kolommen' },
        h('table', { className: 'nv-vergelijk__tabel' },
          h('thead', null, h('tr', null, kop.map(function (k, i) {
            return h('th', { key: i, scope: 'col', className: getal.indexOf(i) > -1 ? 'nv-getal' : undefined, 'aria-label': i === kop.length - 1 ? 'Hartjes: sterren van tieners en hartjes van ouders, en hoe goed de reis bij onze smaak past' : undefined }, k);
          }))),
          groepen.map(function (g) {
            var rijen = p.rijen.filter(function (x) { return x.stemming === g[0]; });
            if (!rijen.length) return null;
            return h('tbody', { key: g[0] },
              h('tr', { className: 'nv-vergelijk__groep' }, h('th', { colSpan: kop.length, scope: 'rowgroup' }, g[1])),
              rijen.map(function (x) {
                var tijd = x.erheenMin != null ? O.reistijd(x.erheenMin, x.erheenBenadering) + (x.erheenDagen > 1 ? ' in ' + x.erheenDagen + ' rijdagen' : '') : 'reistijd ?';
                return h('tr', { key: x.id },
                  h('th', { scope: 'row' }, h('a', { href: reisUrl(x.slug) }, x.titel)),
                  h('td', null, x.status),
                  h('td', null, x.periode || '?'),
                  h('td', { className: 'nv-getal' }, x.nachten == null ? '?' : x.nachten, x.dagen != null ? h('small', null, x.dagen + ' dagen') : null),
                  h('td', { className: 'nv-getal' }, x.plekken),
                  h('td', null, x.erheen ? h(React.Fragment, null, h('span', { className: 'nv-vergelijk__erheen' }, h(G.Icon, { name: x.erheen, size: 16 }), VERVOER[x.erheen] || x.erheen), h('small', null, tijd)) : '?'),
                  h('td', null, x.weer || '?'),
                  h('td', { className: 'nv-getal' }, euro(x)),
                  h('td', { className: 'nv-getal' }, x.perNacht == null ? '?' : (x.schatting ? '~' : '') + O.euro(x.perNacht) + (x.onbekend ? ' + ?' : '')),
                  // Hartjes: aantal ★ (tieners) en ♥ (ouders) vooraf, met klein eronder hoe goed de reis bij onze smaak past
                  // (O.pastBijOns: deel van de activiteiten in de top 3 soorten per groep). Eén kolom, zodat de tabel past.
                  h('td', { className: 'nv-getal' }, x.tiener || x.volwassene ? O.hartVorm('tiener') + ' ' + x.tiener + '  ' + O.hartVorm('volwassene') + ' ' + x.volwassene : '–',
                    x.past && (x.past.tiener != null || x.past.volwassene != null)
                      ? h('small', null, 'past ' + O.hartVorm('tiener') + ' ' + (x.past.tiener == null ? '?' : x.past.tiener + '%') + ' ' + O.hartVorm('volwassene') + ' ' + (x.past.volwassene == null ? '?' : x.past.volwassene + '%')) : null));
              }));
          }))));
  }

  // ═════════════ onderweg (besluit gebruiker 2026-10-04) ═════════════
  // Kaart bovenaan het startscherm tijdens een actieve reis (vanaf de dag vóór vertrek); één tik naar Vandaag.
  function NuOnderweg(p) {
    var a = p.actief, r = a.reis;
    var dag = a.dagNr === 0 ? 'Morgen vertrekken we' : a.dagNr === a.dagen ? 'Laatste dag' : 'Dag ' + a.dagNr + ' van ' + a.dagen;
    return h('a', { className: 'nv-nu', href: reisUrl(r.slug) + location.search.replace(/^\?/, '&').replace(/&reis=[^&]*/, '') + '#vandaag' },
      h('span', { className: 'nv-label' }, a.dagNr === 0 ? 'Bijna op reis' : 'Nu onderweg'),
      h('span', { className: 'nv-nu__titel' }, r.titel),
      h('span', { className: 'nv-nu__dag' }, dag, h('span', { className: 'nv-nu__pijl', 'aria-hidden': true }, ' →')));
  }

  // Eén blok op het scherm Vandaag.
  function VandaagBlok(p) {
    return h('section', { className: 'nv-vandaag__blok', 'aria-label': p.titel },
      h('h3', { className: 'nv-vandaag__kop' }, p.icoon ? h(G.Icon, { name: p.icoon, size: 18 }) : null, p.titel),
      p.children);
  }
  function RouteRegel(p) {
    var x = p.x, l = x.punt;
    var tijden = x.aankomst ? [x.aankomstTijd ? 'aankomst ' + x.aankomstTijd : 'aankomst vandaag']
      : [x.vertrek ? 'vertrek ' + x.vertrek : null, x.aankomstTijd ? 'aankomst ' + x.aankomstTijd + (l.leg_aankomst_dagen ? ' (+' + l.leg_aankomst_dagen + ')' : '') : null];
    var naam = (x.van ? kortNaam(x.van) + ' → ' : '') + kortNaam(x.naar || '?');
    return h('div', { className: 'nv-vandaag__regel' },
      h(Wijzigbaar, { tabel: 'route_punten', rij: l, naam: 'route ' + naam, wz: p.wz, bewerk: p.bewerk && !x.aankomst },
        h('p', { className: 'nv-vandaag__hoofd' }, h(G.Icon, { name: l.leg_vervoer || 'arrow', size: 18 }), naam),
        tijden.filter(Boolean).length ? h('p', { className: 'nv-vandaag__tijd' }, tijden.filter(Boolean).join(' · ')) : null,
        // Betaalstatus bij een kaartje (vlucht, ferry, bus, trein); niet bij een eigen autorit.
        x.aankomst || l.leg_vervoer === 'car' ? null : h(BetaalStatus, { status: l.leg_status }),
        h(Notitie, { tekst: l.leg_notitie }),
        x.aankomst ? null : h(Contact, { vertrekpunt: l.leg_adres, telefoon: l.leg_telefoon, via: l.leg_geboekt_via, boekingscode: l.leg_boekingscode })));
  }
  // ── Bewerken onderweg (besluit gebruiker 2026-10-05): alleen ouders; velden per soort uit O.WIJZIGBAAR. ──
  var VELDEN = {
    route_punten: [['leg_vertrek', 'Vertrek'], ['leg_aankomst', 'Aankomst'], ['leg_adres', 'Vertrekadres of ophaalpunt'], ['leg_boekingscode', 'Boekingscode'],
      ['leg_telefoon', 'Telefoon'], ['leg_status', 'Betaalstatus'], ['leg_notitie', 'Notitie (bijv. gate of perron)']],
    verblijven: [['inchecktijd', 'Inchecken vanaf'], ['uitchecktijd', 'Uitchecken uiterlijk'], ['adres', 'Adres'], ['telefoon', 'Telefoon'], ['boekingscode', 'Boekingscode'],
      ['status', 'Betaalstatus'], ['notitie', 'Notitie (bijv. wifi, deurcode)']],
    activiteiten: [['naam', 'Wat'], ['datum', 'Datum'], ['begin_tijd', 'Begin'], ['eind_tijd', 'Eind'], ['ophaalpunt', 'Ophaalpunt'], ['telefoon', 'Telefoon'],
      ['boekingscode', 'Boekingscode'], ['status', 'Betaalstatus'], ['notitie', 'Notitie']]
  };
  // Welke tijd volgt welke: [begin, eind, dagen-veld of null].
  var VOLGT = { route_punten: ['leg_vertrek', 'leg_aankomst', 'leg_aankomst_dagen'], activiteiten: ['begin_tijd', 'eind_tijd', null] };
  function veldWaarde(soort, v) { return v == null ? '' : soort === 'tijd' ? String(v).slice(0, 5) : String(v); }
  // Formulier in het blok zelf; alleen gewijzigde velden gaan mee (bij een nieuwe activiteit alles).
  function WijzigForm(p) {
    var soorten = O.WIJZIGBAAR[p.tabel], velden = VELDEN[p.tabel];
    // Beginstand bij het openen vastleggen: alleen wat je zelf wijzigt gaat mee, ook als de rij intussen opnieuw is
    // opgehaald (anders zou een open formulier de wijziging van de andere ouder met oude waarden overschrijven).
    // Aankomst- of eindtijd volgt de vertrek- of begintijd (O.volgTijd), tot je hem zelf aanpast. Bij een rit ook
    // het aantal dagen (verborgen veld leg_aankomst_dagen: "(+1)" bij een aankomst na middernacht).
    var volgt = VOLGT[p.tabel];
    var begin = React.useRef(null);
    if (!begin.current) {
      begin.current = {};
      velden.forEach(function (f) { begin.current[f[0]] = veldWaarde(soorten[f[0]], p.rij[f[0]]); });
      if (volgt && volgt[2]) begin.current[volgt[2]] = String(p.rij[volgt[2]] || 0);
    }
    var s = React.useState(function () { return A(begin.current, {}); }), w = s[0], setW = s[1];
    var f = React.useState({}), fouten = f[0], setFouten = f[1];
    var m = React.useState(''), melding = m[0], setMelding = m[1];
    var bk = React.useState(''), berekend = bk[0], setBerekend = bk[1];
    var bezig = React.useRef(false), zelf = React.useRef({});
    function zet(k, v) { setW(function (o) { var n = A(o, {}); n[k] = v; return n; }); }
    function typ(k, v) {
      zet(k, v);
      zelf.current[k] = true;
      if (!volgt || k !== volgt[0] || zelf.current[volgt[1]]) return;
      var r = O.volgTijd({ oudBegin: begin.current[volgt[0]] || null, oudEind: begin.current[volgt[1]] || null,
        eindDagen: volgt[2] ? Number(begin.current[volgt[2]]) : 0, minuten: p.rij.leg_minuten, vervoer: p.rij.leg_vervoer, geenDagen: !volgt[2] }, v);
      if (!r) return setBerekend('');
      zet(volgt[1], r.eind);
      if (volgt[2]) zet(volgt[2], String(r.dagen));
      setBerekend('Meegeschoven: ' + (volgt[2] ? 'aankomst ' : 'eind ') + r.eind + (r.dagen ? ' (+' + r.dagen + (r.dagen === 1 ? ' dag)' : ' dagen)') : '') + '. Klopt het niet, pas het dan zelf aan.');
    }
    function opslaan(e) {
      e.preventDefault();
      if (bezig.current) return;
      var gewijzigd = {};
      velden.forEach(function (x) { if (p.nieuw || w[x[0]] !== begin.current[x[0]]) gewijzigd[x[0]] = w[x[0]]; });
      if (volgt && volgt[2] && w[volgt[2]] !== begin.current[volgt[2]]) gewijzigd[volgt[2]] = w[volgt[2]];
      var c = O.valideerWijziging(p.tabel, gewijzigd);
      if (!c.ok) return setFouten(c.fouten);
      bezig.current = true;
      // Lukt bewaren niet (uitgelogd, opslag vol), dan blijft het formulier open met je invoer.
      var uitslag = p.onOpslaan(c.schoon);
      if (uitslag && uitslag !== 'ok') {
        bezig.current = false;
        setMelding(uitslag === 'uitgelogd' ? 'Je bent niet ingelogd: niet bewaard. Log opnieuw in.' : 'De opslag van deze telefoon is vol: niet bewaard.');
      }
    }
    return h('form', { className: 'nv-wijzig', onSubmit: opslaan, noValidate: true },
      melding ? h('p', { className: 'nv-melding', role: 'alert' }, melding) : null,
      p.titel ? h('p', { className: 'nv-label' }, p.titel) : null,
      velden.map(function (x) {
        var k = x[0], soort = soorten[k], id = 'w-' + p.tabel + '-' + p.rij.id + '-' + k, fout = fouten[k];
        var veld = soort === 'status'
          ? h('fieldset', { className: 'nv-wijzig__status' }, h('legend', { className: 'nv-veld' }, x[1]),
            [['betaald', 'Betaald'], ['geboekt', 'Nog betalen'], ['', 'Onbekend']].map(function (o) {
              return h('button', { key: o[0], type: 'button', className: 'nv-tab', 'aria-pressed': w[k] === o[0], onClick: function () { zet(k, o[0]); } }, o[1]);
            }))
          : h('label', { className: 'nv-veld', htmlFor: id }, x[1],
            soort === 'notitie'
              ? h('textarea', { id: id, rows: 3, maxLength: 2000, value: w[k], onChange: function (e) { zet(k, e.target.value); }, 'aria-invalid': !!fout })
              : h('input', { id: id, value: w[k], 'aria-invalid': !!fout, onChange: function (e) { typ(k, e.target.value); },
                type: soort === 'tijd' ? 'time' : soort === 'datum' ? 'date' : soort === 'tel' ? 'tel' : 'text',
                inputMode: soort === 'tel' ? 'tel' : undefined, autoComplete: 'off', maxLength: soort === 'kort' ? 80 : 300 }));
        var dagen = volgt && volgt[2] && k === volgt[1] && Number(w[volgt[2]]) > 0 ? ' (+' + w[volgt[2]] + ')' : '';
        return h('div', { key: k, className: 'nv-wijzig__veld' }, veld,
          dagen ? h('p', { className: 'nv-muted' }, 'Aankomst ' + w[volgt[2]] + (Number(w[volgt[2]]) === 1 ? ' dag' : ' dagen') + ' na vertrek') : null,
          volgt && k === volgt[1] && berekend ? h('p', { className: 'nv-muted', role: 'status' }, berekend) : null,
          fout ? h('p', { className: 'nv-melding', role: 'alert' }, fout) : null);
      }),
      h('div', { className: 'nv-wijzig__knoppen' },
        h('button', { type: 'button', className: 'nv-knop', onClick: p.onAnnuleer }, 'Annuleren'),
        h('button', { type: 'submit', className: 'nv-hoofdknop' }, 'Opslaan')));
  }
  // Een blok dat een ouder kan wijzigen: inhoud plus knop "Wijzig", of het formulier.
  function Wijzigbaar(p) {
    var o = React.useState(false), open = o[0], setOpen = o[1];
    if (open) return h(WijzigForm, { tabel: p.tabel, rij: p.rij, onAnnuleer: function () { setOpen(false); },
      onOpslaan: function (velden) {
        var uitslag = Object.keys(velden).length ? p.wz.wijzig(p.tabel, p.rij.id, velden) : 'ok';
        if (uitslag === 'ok') setOpen(false);
        return uitslag;
      } });
    return h(React.Fragment, null, p.children,
      p.bewerk ? h('button', { type: 'button', className: 'nv-meer nv-wijzig__knop', onClick: function () { setOpen(true); }, 'aria-label': 'Wijzig ' + p.naam }, 'Wijzig') : null);
  }
  // Nieuwe activiteit (bijv. ter plekke geboekt); standaard op deze dag en deze plek.
  function NieuweActiviteit(p) {
    var o = React.useState(null), rij = o[0], setRij = o[1];
    if (!rij) return h('button', { type: 'button', className: 'nv-meer nv-vandaag__toevoegen', onClick: function () {
      setRij({ id: nieuwId(), datum: p.datum });
    } }, '+ Activiteit toevoegen');
    return h(VandaagBlok, { titel: 'Activiteit toevoegen', icoon: 'calendar' },
      h(WijzigForm, { tabel: 'activiteiten', rij: rij, nieuw: true, onAnnuleer: function () { setRij(null); },
        onOpslaan: function (velden) {
          // Geen volgorde meesturen: die kent de database toe (migratie …0022).
          var uitslag = p.wz.voegToe(A({ id: rij.id, reis_id: p.reisId, stop_id: p.plekId || null, icoon: 'calendar' }, velden));
          if (uitslag === 'ok') setRij(null);
          return uitslag;
        } }));
  }
  // UUID v4 (ook op toestellen zonder crypto.randomUUID).
  function nieuwId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var x = Array.prototype.map.call(b, function (n) { return (n + 256).toString(16).slice(1); }).join('');
    return x.slice(0, 8) + '-' + x.slice(8, 12) + '-' + x.slice(12, 16) + '-' + x.slice(16, 20) + '-' + x.slice(20);
  }
  // Nog open van gisteren (besluit gebruiker 2026-10-05): onbetaalde of onbekende ritten, verblijf en activiteiten
  // van gisteren, elk met Wijzig, en het eigen reisverslag van gisteren als dat nog leeg is. Alleen ouders; weg
  // als alles is afgehandeld.
  function VanGisteren(p) {
    var o = p.open, ik = mijnId(), leden = (p.gezin && p.gezin.leden) || [];
    var s = React.useState(false), schrijf = s[0], setSchrijf = s[1];
    var eigen = O.verslagVan(p.vs.rijen, o.gisteren, ik, leden).eigen;
    var verslagLeeg = !(eigen && eigen.tekst && eigen.tekst.trim());
    function regel(tabel, rij, icoon, naam, status) {
      return h('div', { key: tabel + rij.id, className: 'nv-vandaag__regel' },
        h(Wijzigbaar, { tabel: tabel, rij: rij, naam: naam, wz: p.wz, bewerk: true },
          h('p', { className: 'nv-vandaag__hoofd' }, h(G.Icon, { name: icoon, size: 18 }), naam),
          h(BetaalStatus, { status: status })));
    }
    var regels = o.routes.map(function (l) { return regel('route_punten', l, l.leg_vervoer || 'arrow', 'Rit naar ' + kortNaam(l.naam || '?'), l.leg_status); })
      .concat(o.verblijven.map(function (v) { return regel('verblijven', v, 'bed', v.naam, v.status); }))
      .concat(o.activiteiten.map(function (a) { return regel('activiteiten', a, a.icoon || 'calendar', a.naam, a.status); }));
    if (!regels.length && !verslagLeeg && !schrijf) return null;
    return h(VandaagBlok, { titel: 'Nog open van gisteren', icoon: 'clock' },
      h('p', { className: 'nv-muted nv-vandaag__uitleg' }, O.dagLabel(o.gisteren) + (regels.length ? ': nog niet betaald of onbekend' : '')),
      regels,
      schrijf ? h(VerslagDag, { vs: p.vs, gezin: p.gezin, reisId: p.reisId, datum: o.gisteren, plek: p.plekGisteren, schrijven: true })
        : verslagLeeg ? h('button', { type: 'button', className: 'nv-meer', onClick: function () { setSchrijf(true); } }, 'Schrijf je verslag van gisteren') : null);
  }
  // Notitie onderweg (wifi, deurcode, gate): regels behouden.
  function Notitie(p) { return p.tekst ? h('p', { className: 'nv-vandaag__notitie' }, p.tekst) : null; }
  // Betaalstatus op Vandaag (besluit gebruiker 2026-10-04): betaald, nog betalen, of onbekend ("Status ?").
  function BetaalStatus(p) {
    var label = p.status === 'betaald' ? 'Betaald' : p.status === 'geboekt' ? 'Nog betalen' : !p.status ? 'Status ?' : null;
    return label ? h('p', { className: 'nv-vandaag__status' }, h(G.StatusBadge, { status: p.status || undefined, label: label })) : null;
  }
  // Gepland op Vandaag (besluit gebruiker 2026-10-04): naam, tijd, ophaalpunt en contact; geen hartje (het is
  // al gepland) en geen prijs, wel of er nog betaald moet worden.
  function GeplandRegel(p) {
    var a = p.x;
    var tijd = [a.begin_tijd ? O.tijd(a.begin_tijd) : '', a.eind_tijd ? O.tijd(a.eind_tijd) : ''].filter(Boolean).join(' – ');
    var betaal = a.status === 'betaald' || a.status === 'geboekt';
    return h('div', { className: 'nv-vandaag__regel' },
      h(Wijzigbaar, { tabel: 'activiteiten', rij: a, naam: a.naam, wz: p.wz, bewerk: p.bewerk },
        h('p', { className: 'nv-vandaag__hoofd' }, h(G.Icon, { name: a.icoon || 'calendar', size: 18 }),
          O.veiligeLink(a.link) ? h('a', { href: a.link, target: '_blank', rel: 'noopener noreferrer' }, a.naam) : a.naam),
        tijd ? h('p', { className: 'nv-vandaag__tijd' }, tijd) : null,
        betaal ? h(BetaalStatus, { status: a.status }) : null,
        h(Notitie, { tekst: a.notitie }),
        h(Contact, { ophaalpunt: a.ophaalpunt, telefoon: a.telefoon, email: a.email, via: a.geboekt_via, boekingscode: a.boekingscode })));
  }

  function tijdVan(x) { var t = x && Date.parse(x.gewijzigd); return isNaN(t) ? 0 : t; }
  // Reisverslag (besluit gebruiker 2026-10-04): per dag schrijft elke ouder (bewerker) een eigen tekst; het hele
  // gezin leest mee. Stand per reispagina, gedeeld door Vandaag en het onderdeel Verslag. Je eigen tekst = de
  // nieuwste van wat de server gaf en wat op deze telefoon staat (de cache kan verouderd zijn).
  function useVerslagen(data) {
    var reisId = data.reis.id, ik = mijnId();
    var server = data.verslagen || [];
    var t = React.useState(0), setTik = t[1];
    var s = React.useState({}), bezig = s[0], setBezig = s[1];
    var u = React.useState('ok'), opslag = u[0], setOpslag = u[1]; // 'ok', 'uitgelogd' of 'vol' (zie zetVerslagConcept)
    function tik() { setTik(function (n) { return n + 1; }); }
    var w = leesWachtrij(), lokaal = {};
    Object.keys(w).forEach(function (k) { var x = w[k]; if (x.reis_id === reisId && x.user_id === ik) lokaal[x.datum] = x; });
    var rijen = server.filter(function (v) { return !(v.user_id === ik && lokaal[v.datum] && tijdVan(lokaal[v.datum]) >= tijdVan(v)); })
      .concat(Object.keys(lokaal).filter(function (d) {
        var sv = server.filter(function (v) { return v.user_id === ik && v.datum === d; })[0];
        return !sv || tijdVan(lokaal[d]) >= tijdVan(sv);
      }).map(function (d) { return lokaal[d]; }));
    // Typen: meteen op de telefoon (ook als de app daarna dicht gaat).
    function wijzig(datum, tekst) {
      var uitslag = zetVerslagConcept(reisId, datum, tekst);
      setOpslag(uitslag);
      tik();
      return uitslag === 'ok';
    }
    function verstuur(datum) {
      setBezig(function (o) { var n = A(o, {}); n[datum] = true; return n; });
      verstuurVerslagen().then(function () { setBezig(function (o) { var n = A(o, {}); delete n[datum]; return n; }); });
    }
    // Na een verzendronde (ook op de achtergrond): opnieuw tekenen met de stand uit de wachtrij.
    React.useEffect(function () {
      window.addEventListener('reis-verslag-verstuurd', tik);
      return function () { window.removeEventListener('reis-verslag-verstuurd', tik); };
    }, []);
    return { rijen: rijen, lokaal: lokaal, bezig: bezig, opslag: opslag, wijzig: wijzig, verstuur: verstuur, fout: data.verslagFout };
  }
  // Tekst van één dag om te kopiëren (Polarsteps, appje, fotoboek): datum · plek, dan de teksten met naam.
  function dagTekst(datum, plek, teksten) {
    var lijst = teksten.filter(function (x) { return x.tekst && x.tekst.trim(); });
    return O.dagLabel(datum) + (plek ? ' · ' + kortNaam(plek) : '') + '\n\n' +
      lijst.map(function (x) { return x.naam + ':\n' + x.tekst.trim(); }).join('\n\n');
  }
  function VerslagDag(p) {
    var vs = p.vs, ik = mijnId(), leden = (p.gezin && p.gezin.leden) || [];
    var van = O.verslagVan(vs.rijen, p.datum, ik, leden);
    var s = React.useState(function () { return van.eigen ? van.eigen.tekst : ''; }), tekst = s[0], setTekst = s[1];
    var k = React.useState(''), melding = k[0], setMelding = k[1];
    var wacht = React.useRef(null);
    // Kon het verslag niet geladen worden en staat er niets op deze telefoon, dan niet typen: je zou de
    // bestaande tekst op de server met een lege basis overschrijven.
    var geblokkeerd = vs.fout && !vs.lokaal[p.datum];
    React.useEffect(function () { return function () { if (wacht.current) { clearTimeout(wacht.current); verstuurVerslagen(); } }; }, []);
    function typ(e) {
      var t = e.target.value; setTekst(t); setMelding('');
      vs.wijzig(p.datum, t);
      if (wacht.current) clearTimeout(wacht.current);
      wacht.current = setTimeout(function () { wacht.current = null; vs.verstuur(p.datum); }, 1000);
    }
    function nu() { if (wacht.current) { clearTimeout(wacht.current); wacht.current = null; vs.verstuur(p.datum); } }
    function kopieer() {
      var zelf = leden.filter(function (l) { return l.user_id === ik; })[0];
      var t = dagTekst(p.datum, p.plek, [{ naam: (zelf && zelf.weergavenaam) || 'Ik', tekst: tekst }].concat(van.anderen).sort(function (a, b) { return a.naam.localeCompare(b.naam); }));
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { setMelding('Gekopieerd.'); }, function () { setMelding('Kopiëren lukt hier niet; selecteer de tekst zelf.'); });
    }
    var x = vs.lokaal[p.datum];
    var standTekst = vs.opslag === 'uitgelogd' ? 'Je bent niet ingelogd: deze tekst is níet bewaard. Kopieer hem en log opnieuw in.'
      : vs.opslag === 'vol' ? 'De opslag van deze telefoon is vol: deze tekst is níet bewaard. Kopieer hem naar een andere app.'
      : wacht.current ? '' : vs.bezig[p.datum] ? 'Opslaan…' : !x ? '' : x.verzonden ? 'Opgeslagen'
      : x.fout ? 'Niet opgeslagen (' + x.fout + '); het staat nog op deze telefoon. Pas de tekst aan om het opnieuw te proberen.' : 'Bewaard op deze telefoon; gaat mee zodra er verbinding is.';
    var id = 'verslag-' + p.datum;
    return h('div', { className: 'nv-verslagdag' },
      p.schrijven ? h(React.Fragment, null,
        h('label', { className: 'nv-onzichtbaar', htmlFor: id }, 'Jouw verslag van ' + O.dagLabel(p.datum)),
        geblokkeerd ? h('p', { className: 'nv-melding' }, 'Het verslag kon niet geladen worden. Schrijven kan weer zodra het opnieuw geladen is (herlaad de pagina met verbinding).') : null,
        h('textarea', { id: id, className: 'nv-verslag', rows: 5, value: tekst, maxLength: 20000, readOnly: geblokkeerd,
          placeholder: 'Wat deden we vandaag? Wat was het mooiste moment?', onChange: typ, onBlur: nu }),
        h('div', { className: 'nv-verslag__knoppen' },
          h('span', { className: 'nv-muted', role: 'status' }, standTekst),
          h('button', { type: 'button', className: 'nv-knop', disabled: !tekst.trim() && !van.anderen.length, onClick: kopieer }, 'Kopieer'))) : null,
      van.anderen.map(function (a, i) {
        return h('div', { key: i, className: 'nv-verslag__ander' }, h('p', { className: 'nv-label' }, a.naam), h('p', { className: 'nv-verslag__tekst' }, a.tekst));
      }),
      melding ? h('p', { className: 'nv-muted', role: 'status' }, melding) : null);
  }

  // Vandaag (besluit gebruiker 2026-10-04): waar zijn we, route, slapen, gepland of vrij (top 3 ideeën), morgen
  // en het reisverslag. Bewust niet: kosten, beschrijving, de hele route.
  function Vandaag(p) {
    var x = p.dag, m = x.morgen;
    var titel = x.dagNr === 0 ? 'Morgen vertrekken we' : x.laatsteDag ? 'Vandaag naar huis'
      : x.plek ? (x.slapen ? 'In ' : 'Onderweg naar ') + kortNaam(x.plek) : 'Onderweg';
    var sub = [O.dagLabel(x.datum), x.slapen && x.nachtenHier > 1 ? 'nacht ' + x.nachtNr + ' van ' + x.nachtenHier : null].filter(Boolean).join(' · ');
    var v = x.slapen;
    var morgen = [];
    if (m.uitchecken) morgen.push('Uitchecken bij ' + m.uitchecken.naam + (m.uitchecken.uitchecktijd ? ', uiterlijk ' + O.tijd(m.uitchecken.uitchecktijd) : ''));
    m.routes.forEach(function (r, i) { morgen.push((r.naar ? 'Route naar ' + kortNaam(r.naar) : 'Route') + (r.vertrek ? ', vertrek ' + r.vertrek : '')); });
    m.activiteiten.forEach(function (a) { morgen.push((a.begin_tijd ? O.tijd(a.begin_tijd) + ' ' : '') + a.naam); });
    return h('section', { className: 'nv-blok nv-vandaag', id: 'vandaag' },
      h('div', { className: 'nv-wrap', style: { maxWidth: '760px' } },
        h('div', { className: 'nv-kopblok' },
          h('span', { className: 'nv-label' }, x.dagNr === 0 ? 'Vandaag · de dag vóór vertrek' : 'Vandaag · dag ' + x.dagNr + ' van ' + x.dagen),
          h('h2', { className: 'nv-kop' }, titel),
          h('p', { className: 'nv-tekst nv-muted' }, sub)),
        p.beheerder ? h(WijzigStand, { wz: p.wz }) : null,
        p.beheerder && x.dagNr > 1 && p.open ? h(VanGisteren, { open: p.open, vs: p.vs, gezin: p.gezin, wz: p.wz, reisId: p.reisId, plekGisteren: p.plekGisteren }) : null,
        x.routes.length ? h(VandaagBlok, { titel: 'Route vandaag', icoon: 'arrow' }, x.routes.map(function (r) { return h(RouteRegel, { key: r.punt.id + (r.aankomst ? '-a' : ''), x: r, wz: p.wz, bewerk: p.beheerder }); })) : null,
        v ? h(VandaagBlok, { titel: 'Slapen vannacht', icoon: 'bed' },
          h('div', { className: 'nv-vandaag__regel' },
            h(Wijzigbaar, { tabel: 'verblijven', rij: v, naam: v.naam, wz: p.wz, bewerk: p.beheerder },
              h('p', { className: 'nv-vandaag__hoofd' }, O.veiligeLink(v.link) ? h('a', { href: v.link, target: '_blank', rel: 'noopener noreferrer' }, v.naam) : v.naam),
              O.verblijfKenmerken(v) ? h('p', { className: 'nv-vandaag__tijd' }, O.verblijfKenmerken(v)) : null,
              x.nachtNr === 1 && v.inchecktijd ? h('p', { className: 'nv-vandaag__tijd' }, 'inchecken vanaf ' + O.tijd(v.inchecktijd)) : null,
              h(BetaalStatus, { status: v.status }),
              h(Notitie, { tekst: v.notitie }),
              h(Contact, { adres: v.adres, telefoon: v.telefoon, email: v.email, via: v.geboekt_via, boekingscode: v.boekingscode })))) : null,
        x.activiteiten.length ? h(VandaagBlok, { titel: 'Gepland', icoon: 'calendar' }, x.activiteiten.map(function (a) { return h(GeplandRegel, { key: a.id, x: a, wz: p.wz, bewerk: p.beheerder }); })) : null,
        x.vrij ? h(VandaagBlok, { titel: 'Vrije dag', icoon: 'sun' },
          x.ideeen.length ? h(React.Fragment, null, h('p', { className: 'nv-muted nv-vandaag__uitleg' }, 'Niets gepland. Dit vinden jullie het leukst hier:'),
            x.ideeen.map(function (a) { return h(ActiviteitRij, { key: a.id, x: a, hart: p.hart }); }))
            : h('p', { className: 'nv-muted' }, 'Niets gepland: tijd om bij te komen.')) : null,
        p.beheerder ? h(NieuweActiviteit, { wz: p.wz, reisId: p.reisId, datum: x.datum, plekId: x.plekId }) : null,
        h(HartMelding, { hart: p.hart, stil: true }),
        x.laatsteDag ? null : h(VandaagBlok, { titel: 'Morgen', icoon: 'clock' },
          morgen.length ? h('ul', { className: 'nv-vandaag__morgen' }, morgen.map(function (t, i) { return h('li', { key: i }, t); }))
            : h('p', { className: 'nv-muted' }, 'Nog niets gepland.')),
        x.dagNr > 0 && (p.beheerder || O.verslagVan(p.vs.rijen, x.datum, mijnId(), (p.gezin && p.gezin.leden) || []).anderen.length)
          ? h(VandaagBlok, { titel: 'Reisverslag', icoon: 'check' },
            h(VerslagDag, { key: x.datum, vs: p.vs, gezin: p.gezin, reisId: p.reisId, datum: x.datum, plek: x.plek, schrijven: p.beheerder })) : null));
  }

  // Onderdeel Verslag: alle dagen van vertrek t/m vandaag (of t/m thuiskomst), per dag de teksten; een ouder
  // vult een dag aan met "Schrijf"/"Bewerk". Download = het hele verslag als tekstbestand (naslag, fotoboek).
  function Reisverslag(p) {
    var vs = p.vs, ik = mijnId(), leden = (p.gezin && p.gezin.leden) || [];
    var o = React.useState(null), open = o[0], setOpen = o[1];
    var heeftTekst = vs.rijen.some(function (v) { return v.tekst && v.tekst.trim(); });
    function download() {
      var tekst = '﻿' + O.verslagExport(p.reis, vs.rijen, leden, p.plekken);
      var url = URL.createObjectURL(new Blob([tekst], { type: 'text/plain;charset=utf-8' }));
      var a = document.createElement('a');
      a.href = url; a.download = 'Reisverslag ' + p.reis.titel + '.txt';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    return h('section', { className: 'nv-blok', id: 'verslag' },
      h('div', { className: 'nv-wrap', style: { maxWidth: '760px' } },
        h('div', { className: 'nv-kopblok' },
          h('span', { className: 'nv-label' }, 'Reisverslag'),
          h('h2', { className: 'nv-kop' }, 'Dag voor dag'),
          vs.fout ? h('p', { className: 'nv-melding' }, 'Het verslag kon niet geladen worden. Dagen zonder eigen kopie op deze telefoon kun je pas bewerken na herladen met verbinding.') : null,
          heeftTekst ? h('p', null, h('button', { type: 'button', className: 'nv-knop', onClick: download }, 'Download verslag')) : null),
        p.dagen.slice().reverse().map(function (d) {
          var van = O.verslagVan(vs.rijen, d, ik, leden);
          var eigen = van.eigen && van.eigen.tekst && van.eigen.tekst.trim() ? van.eigen.tekst : '';
          var onverzonden = !!van.eigen && van.eigen === vs.lokaal[d] && !vs.lokaal[d].verzonden;
          // Vandaag schrijf je bij Vandaag (één invoerveld per dag); hier alleen eerdere dagen bewerken.
          var isVandaag = p.vandaag === d;
          var bewerk = p.beheerder && open === d && !isVandaag;
          if (!p.beheerder && !van.anderen.length && !eigen) return null;
          return h('article', { key: d, className: 'nv-verslag__dag' },
            h('h3', { className: 'nv-doengroep__plek' }, O.dagLabel(d) + (p.plekken[d] ? ' · ' + kortNaam(p.plekken[d]) : '')),
            bewerk ? h(VerslagDag, { vs: vs, gezin: p.gezin, reisId: p.reis.id, datum: d, plek: p.plekken[d], schrijven: true }) : h(React.Fragment, null,
              eigen ? h('div', { className: 'nv-verslag__ander' }, h('p', { className: 'nv-label' }, onverzonden ? 'Jij · nog niet verstuurd' : 'Jij'), h('p', { className: 'nv-verslag__tekst' }, eigen)) : null,
              van.anderen.map(function (a, i) { return h('div', { key: i, className: 'nv-verslag__ander' }, h('p', { className: 'nv-label' }, a.naam), h('p', { className: 'nv-verslag__tekst' }, a.tekst)); }),
              p.beheerder ? h('button', { type: 'button', className: 'nv-meer', onClick: function () { if (isVandaag) naar('vandaag'); else setOpen(d); } },
                isVandaag ? 'Schrijf bij Vandaag' : eigen ? 'Bewerk' : 'Schrijf') : null));
        })));
  }

  // ═════════════ reispagina ═════════════
  function Opening(p) {
    var r = p.reis, f = p.foto(r.hero_foto_id);
    return h('header', { className: 'nv-hero' },
      f.image && h('img', { src: f.image, alt: '' }),
      h('div', { className: 'nv-scrim' }),
      h('div', { className: 'nv-hero__inner' },
        h('span', { className: 'nv-label' }, r.kicker || 'Reisgids'),
        h('h1', null, r.titel),
        h('p', { className: 'nv-hero__datum' },
          (r.start_datum ? O.langeDatum(r.start_datum) + ' – ' + (r.eind_datum ? O.langeDatum(r.eind_datum) : '?') : 'Data ?') +
          ' · ' + nachtenTekst(r.nachten))),
      h('button', { type: 'button', className: 'nv-omlaag', 'aria-label': 'Naar de reis', onClick: function () { naar('reis'); } },
        h(G.Icon, { name: 'arrow', size: 18, className: 'nv-omlaag__pijl' })),
      f.credit && h(G.PhotoCredit, { by: f.credit }));
  }

  function Balk(p) {
    return h('nav', { className: 'nv-bar', 'aria-label': 'Onderdelen van deze reis' },
      h('div', { className: 'nv-bar__rij' },
        h('a', { href: './', className: 'nv-bar__terug', 'aria-label': 'Terug naar alle reizen' }, '←'),
        p.secties.map(function (s) {
          return h('a', { key: s[0], href: '#' + s[0], className: p.actief === s[0] ? 'is-on' : '',
            onClick: function (e) { e.preventDefault(); naar(s[0]); } }, s[1]);
        })));
  }

  function Intro(p) {
    // Niet dezelfde foto als de opening of het citaat vlak eronder; dubbel met een tegel is onvermijdelijk.
    var r = p.reis, bezet = [r.hero_foto_id, r.quote_foto_id];
    var kandidaten = [r.kaart_foto_id].concat(p.stops.map(function (s) { return s.foto_id; }));
    var f = p.foto(kandidaten.filter(function (id) { return id && bezet.indexOf(id) < 0; })[0] || r.hero_foto_id);
    var kop = (r.secties && r.secties.plekken) || {};
    var feiten = O.reisFeiten(r, p.route || []);
    return h('section', { className: 'nv-intro', id: 'reis' },
      h('div', { className: 'nv-intro__foto' }, f.image && h('img', { src: f.image, alt: '' }), f.credit && h(G.PhotoCredit, { by: f.credit })),
      h('div', { className: 'nv-intro__tekst' },
        h('span', { className: 'nv-label' }, 'De reis'),
        h('h2', { className: 'nv-kop' }, kop.title || r.titel),
        r.lede && h('p', { className: 'nv-tekst' }, r.lede),
        feiten.length ? h('ul', { className: 'nv-feiten' }, feiten.map(function (x, i) {
          return h('li', { key: i }, h(G.Icon, { name: x[0], size: 18 }), x[1]);
        })) : null));
  }

  function Citaat(p) {
    var r = p.reis, f = p.foto(r.quote_foto_id);
    if (!r.quote_tekst) return null;
    return h('section', { className: 'nv-citaat' },
      f.image && h('img', { src: f.image, alt: '' }),
      h('div', { className: 'nv-scrim' }),
      h('div', null, h('blockquote', null, r.quote_tekst), r.quote_sub && h('span', { className: 'nv-label' }, r.quote_sub)),
      f.credit && h(G.PhotoCredit, { by: f.credit }));
  }

  // Zijwaartse strook: houdt bij of er links/rechts nog iets buiten beeld staat (voor vervaging en pijltjes).
  // Geeft { ref, el, l, r }: ref aan de strook hangen; el is de strook zelf (of null zolang die er niet is).
  function useRanden() {
    var e = React.useState(null), el = e[0], setEl = e[1];
    var s = React.useState({ l: false, r: false }), randen = s[0], setRanden = s[1];
    function meet() {
      if (!el) return;
      var l = el.scrollLeft > 2, r = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setRanden(function (o) { return o.l === l && o.r === r ? o : { l: l, r: r }; });
    }
    // Na elke weergave meten (inhoud kan veranderen), vóór het tekenen: geen verspringen.
    React.useLayoutEffect(meet);
    React.useEffect(function () {
      if (!el) return;
      // Opnieuw meten bij een andere breedte en zodra de lettertypes er zijn (namen worden dan breder).
      var ro = window.ResizeObserver ? new ResizeObserver(meet) : null;
      if (ro) ro.observe(el); else window.addEventListener('resize', meet);
      if (document.fonts) document.fonts.ready.then(meet);
      el.addEventListener('scroll', meet, { passive: true });
      return function () { el.removeEventListener('scroll', meet); if (ro) ro.disconnect(); else window.removeEventListener('resize', meet); };
    }, [el]);
    return { ref: setEl, el: el, l: randen.l, r: randen.r };
  }

  function Overzicht(p) {
    var r = p.reis;
    var randen = useRanden();
    function schuif(n) { var el = randen.el; if (el) el.scrollBy({ left: n * el.clientWidth * 0.8, behavior: 'smooth' }); }
    // Tijdlijn volgt de route (met heen- en terugreis); zonder route de plekken.
    var punten = p.route.length ? p.route.map(function (x) {
      return { naam: x.naam, stop: stopOpId(p.stops, x.stop_id), leg: x };
    }) : p.stops.map(function (s) { return { naam: s.naam, stop: s }; });
    // Slepen met de muis (vinger en touchpad scrollen vanzelf); na slepen geen klik doorlaten.
    function sleep(e) {
      var el = randen.el; if (e.pointerType !== 'mouse' || e.button !== 0 || !el) return;
      var x0 = e.clientX, s0 = el.scrollLeft, gesleept = false;
      e.preventDefault(); // geen tekst selecteren
      function beweeg(ev) {
        var dx = ev.clientX - x0; if (Math.abs(dx) > 4 && !gesleept) { gesleept = true; el.style.scrollSnapType = 'none'; el.style.cursor = 'grabbing'; }
        if (gesleept) el.scrollLeft = s0 - dx;
      }
      function los() {
        window.removeEventListener('pointermove', beweeg); window.removeEventListener('pointerup', los); window.removeEventListener('pointercancel', los);
        el.style.scrollSnapType = ''; el.style.cursor = '';
        if (!gesleept) return;
        function stop(ev) { ev.stopPropagation(); ev.preventDefault(); }
        window.addEventListener('click', stop, true);
        setTimeout(function () { window.removeEventListener('click', stop, true); }, 0);
      }
      window.addEventListener('pointermove', beweeg); window.addEventListener('pointerup', los); window.addEventListener('pointercancel', los);
    }
    return h('section', { className: 'nv-blok nv-blok--zand', id: 'overzicht' },
      h('div', { className: 'nv-wrap' },
        h('div', { className: 'nv-kopblok' },
          h('span', { className: 'nv-label' }, 'Reisoverzicht'),
          h('h2', { className: 'nv-kop' }, h('em', null, nachtenTekst(r.nachten)), ', ' + p.stops.length + (p.stops.length === 1 ? ' plek' : ' plekken'))),
        punten.length && (randen.l || randen.r) ? h('div', { className: 'nv-pijlen nv-pijlen--altijd' },
          h('button', { type: 'button', className: 'nv-pijl', 'aria-label': 'Eerder in de route', disabled: !randen.l, onClick: function () { schuif(-1); } }, '‹'),
          h('button', { type: 'button', className: 'nv-pijl', 'aria-label': 'Verder in de route', disabled: !randen.r, onClick: function () { schuif(1); } }, '›')) : null,
        punten.length ? h('ol', { ref: randen.ref, onPointerDown: sleep, className: 'nv-tijdlijn' + (randen.l ? ' meer-links' : '') + (randen.r ? ' meer-rechts' : ''), 'aria-label': 'Route in volgorde' }, punten.map(function (x, i) {
          // Plek die twee keer in de route staat: de dag van dít bezoek (route_punt_id, anders het hoeveelste bezoek).
          var keer = punten.slice(0, i).filter(function (y) { return x.stop && y.stop === x.stop; }).length;
          var l = x.leg, d = x.stop && (l ? dagVanBezoek(p.dagen, l, keer) : dagenVan(p.dagen, x.stop.id)[keer]), datum = d && d.datum_van;
          // Nachten van dít bezoek (route), anders die van de plek.
          var n = l && l.nachten != null ? l.nachten : x.stop ? x.stop.nachten : null;
          var nacht = nachtenTekst(n);
          // Begin- of eindpunt zonder plek is vertrek of thuiskomst: datum van de reis zelf.
          var rand = !x.stop && (i === 0 || i === punten.length - 1);
          if (rand) { nacht = i === 0 ? 'Vertrek' : 'Thuis'; datum = i === 0 ? r.start_datum : r.eind_datum; }
          // Vervoer nog niet gekozen maar wel opties: hun iconen en de reistijd van kortste tot langste.
          var opties = l ? O.vervoerOpties(l) : [];
          var onzeker = l && !p.herinnering && !l.leg_geverifieerd;
          return h('li', { key: i, className: rand ? 'is-thuis' : '' },
            h('span', { className: 'nv-tijdlijn__datum' }, datum ? O.kortDatum(datum) : '?'),
            h('span', { className: 'nv-tijdlijn__naam' }, kortNaam(x.naam)),
            h('span', { className: 'nv-tijdlijn__nacht' }, nacht),
            i > 0 && l && opties.length ? h('span', { className: 'nv-tijdlijn__reis' },
              h('span', { className: 'nv-opties__iconen', role: 'img', 'aria-label': opties.map(function (o) { return O.tekstOf(o.label) || VERVOER[o.vervoer]; }).join(' of ') },
                opties.map(function (o, k) { return h(G.Icon, { key: k, name: o.vervoer, size: 14 }); })),
              O.reistijdBereik(opties),
              h('span', { className: 'nv-tijdlijn__check nv-opties__kies' }, O.optiesKop(opties))) :
            i > 0 && l ? h('span', { className: 'nv-tijdlijn__reis' },
              h(G.Icon, { name: l.leg_vervoer || 'reis', size: 14 }),
              etappeTijdPrijs(l).join(' · '),
              onzeker ? h('span', { className: 'nv-tijdlijn__check' }, 'te verifiëren') : null) : null);
        })) : h(Leeg, { herinnering: p.herinnering, tekst: 'Nog geen route.' }),
        // Elke plek een sfeertegel (besluit gebruiker 2026-09-29).
        // Rechtsonder op de tegel: sterren (tieners) en hartjes (ouders) bij de activiteiten van die plek, als indicatie.
        h('div', { className: 'nv-tegels' }, p.stops.map(function (s) {
          var f = p.foto(s.foto_id), g = p.hart.g;
          var tel = g.werkt ? O.telVormen(p.hart.hartjes, p.activiteiten.filter(function (a) { return a.stop_id === s.id; }).map(function (a) { return a.id; }), g.leden) : null;
          var telt = tel && (tel.tiener || tel.volwassene);
          // Teken + aantal; voor schermlezers een gewone zin (een naam op een kale span wordt niet altijd voorgelezen).
          function teller(n, groep, een, meer, wie) {
            return n ? h('span', null, h('span', { 'aria-hidden': true }, O.hartVorm(groep) + ' ' + n),
              h('span', { className: 'nv-onzichtbaar' }, ', ' + n + ' ' + (n === 1 ? een : meer) + ' van ' + wie)) : null;
          }
          return h('button', { key: s.id, type: 'button', className: 'nv-tegel' + (telt ? ' nv-tegel--hart' : ''), onClick: function () { p.kiesPlek(s.id); } },
            f.image && h('img', { src: f.image, alt: '' }),
            h('span', { className: 'nv-tegel__tekst' },
              h('span', { className: 'nv-tegel__naam' }, kortNaam(s.naam)),
              h('span', { className: 'nv-tegel__meer' }, nachtenPlek(p.route, s) + ' →')),
            telt ? h('span', { className: 'nv-tegel__hart' },
              teller(tel.tiener, 'tiener', 'ster', 'sterren', 'tieners'),
              teller(tel.volwassene, 'volwassene', 'hartje', 'hartjes', 'ouders')) : null);
        }))));
  }

  var TE_DOEN_EERST = 4;
  function Programma(p) {
    var i = Math.max(0, p.stops.findIndex(function (s) { return s.id === p.plekId; }));
    var s = p.stops[i];
    var tabsRef = React.useRef(null);
    var sid = s && s.id;
    // Te doen: eerst de 4 bovenste, "toon nog …" voor de rest; bij een andere plek weer ingeklapt.
    var ta = React.useState(false), toonAlles = ta[0], setToonAlles = ta[1];
    React.useEffect(function () { setToonAlles(false); }, [sid]);
    React.useEffect(function () {
      var rij = tabsRef.current, knop = rij && rij.querySelector('[aria-selected="true"]');
      if (!knop) return;
      var l = knop.getBoundingClientRect().left - rij.getBoundingClientRect().left + rij.scrollLeft, r = l + knop.offsetWidth;
      if (l < rij.scrollLeft || r > rij.scrollLeft + rij.clientWidth) rij.scrollTo({ left: l - 16, behavior: 'smooth' });
    }, [sid]);
    var kopblok = h('div', { className: 'nv-kopblok' },
      h('span', { className: 'nv-label' }, 'Reisprogramma'),
      h('h2', { className: 'nv-kop' }, 'Plek voor ', h('em', null, 'plek')));
    if (!s) return h('section', { className: 'nv-blok', id: 'programma' },
      h('div', { className: 'nv-wrap' }, kopblok, h(Leeg, { herinnering: p.herinnering, tekst: 'Nog geen plekken.' })));

    var f = p.foto(s.foto_id);
    var dagen = dagenVan(p.dagen, s.id), d = dagen[0];
    var opties = p.verblijven.filter(function (x) { return x.stop_id === s.id && x.status !== 'open'; });
    function kies(id, focus) {
      p.kiesPlek(id, true);
      if (focus) setTimeout(function () { var k = document.getElementById('tab-' + id); if (k) k.focus(); }, 0);
    }
    function toets(e) {
      var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!n) return;
      e.preventDefault();
      kies(p.stops[(i + n + p.stops.length) % p.stops.length].id, true);
    }
    var vorige = p.stops[i - 1], volgende = p.stops[i + 1];
    var etappes = etappesVan(p.route, s.id);
    // Twee keer in de route (bijv. heen en terug via dezelfde stad): per bezoek datum, nachten en beleving.
    var bezoeken = p.route.filter(function (x) { return x.stop_id === s.id; }), meer = bezoeken.length > 1;
    // Tips: dagen.tips hoort bij één bezoek (besluit gebruiker 2026-10-01), dus bij meer
    // bezoeken in het blok van dat bezoek; het tipskader houdt dan stops.tips plus de tips
    // van een dag die aan geen bezoek hangt (niets stil weglaten).
    var bezoekDagen = bezoeken.map(function (v, k) { return dagVanBezoek(p.dagen, v, k); });
    var tips = tipsVan(s, meer ? dagen.filter(function (x) { return bezoekDagen.indexOf(x) < 0; }) : dagen);
    // Geboekte dingen eerst, dan de ideeën met de meeste sterren en hartjes (wat het gezin wil staat bovenaan).
    // Op de stand bij het laden, niet de live stand: anders springt een idee weg onder je vinger als je tikt.
    var hier = O.sorteerTeDoen(p.activiteiten.filter(function (a) { return a.stop_id === s.id; }), p.hart.g.hartjes || [], p.hart.smaak);
    // Tijden staan onder hun rit; alleen wat aan geen getoonde rit hangt blijft een losse notitie.
    var notities = dagen.filter(function (x) {
      return !etappes.some(function (e) { return e.naar.id === x.route_punt_id; });
    }).map(function (x) { return x.logistiek; }).filter(etappes.length ? meerDanAfstand : Boolean);
    // Chips alleen voor wat nergens anders in het paneel staat.
    var elders = ['Nachten', 'Accommodatie'].concat(etappes.length || (d && d.logistiek) ? ['Rit ervoor'] : []);
    var feiten = (s.feiten || []).filter(function (x) { return elders.indexOf(x[0]) < 0; });
    var geboekt = opties.filter(O.inSlapen)
      // Op incheckdatum; zonder datum achteraan.
      .sort(function (a, b) { return String(a.inchecken || '9999').localeCompare(String(b.inchecken || '9999')) || a.volgorde - b.volgorde; });
    var prijzen = opties.map(function (x) { return x.prijs; }).filter(function (x) { return x != null; }).map(Number);

    return h('section', { className: 'nv-blok', id: 'programma' },
      h('div', { className: 'nv-wrap' },
        kopblok,
        h('div', { className: 'nv-tabs', role: 'tablist', 'aria-label': 'Plekken', ref: tabsRef, onKeyDown: toets },
          p.stops.map(function (x) {
            var aan = x.id === s.id;
            return h('button', { key: x.id, id: 'tab-' + x.id, type: 'button', role: 'tab', className: 'nv-tab',
              'aria-selected': aan, 'aria-controls': 'plek-paneel', tabIndex: aan ? 0 : -1, onClick: function () { kies(x.id); } }, kortNaam(x.naam));
          })),
        h('article', { className: 'nv-plek', id: 'plek-paneel', role: 'tabpanel', 'aria-labelledby': 'tab-' + s.id },
          h('div', { className: 'nv-plek__foto' }, f.image && h('img', { src: f.image, alt: '' }), f.credit && h(G.PhotoCredit, { by: f.credit })),
          h('div', null,
            h('h3', { className: 'nv-plek__naam' }, kortNaam(s.naam)),
            h('span', { className: 'nv-plek__wanneer' }, meer ? bezoeken.length + ' bezoeken' : wanneerTekst(d, s)),
            h('ul', { className: 'nv-chips' },
              // Meer bezoeken: de nachten van alle bezoeken samen (onbekend bij één ervan = "?").
              h('li', null, nachtenPlek(p.route, s)),
              feiten.map(function (x, k) { return h('li', { key: k }, x[0] + ': ' + x[1]); })),
            s.lede && h('p', { className: 'nv-tekst' }, s.lede),
            meer ? h('ol', { className: 'nv-bezoeken' }, bezoeken.map(function (v, k) {
              // Wat al in het algemene tipskader staat niet nog eens per bezoek.
              var dv = bezoekDagen[k], eigen = dv ? tipsVan({}, [dv]).filter(function (t) { return tips.indexOf(t) < 0; }) : [];
              return h('li', { key: v.id },
                h('span', { className: 'nv-bezoeken__kop' }, (k + 1) + 'e bezoek · ' + wanneerTekst(dv) + ' · ' + nachtenTekst(v.nachten)),
                dv && dv.beleving && dv.beleving !== s.lede ? h('p', { className: 'nv-tekst nv-muted' }, dv.beleving) : null,
                eigen.length ? h(G.TipNote, { title: 'Tips ' + (k + 1) + 'e bezoek', items: eigen }) : null);
            })) :
            d && d.beleving && d.beleving !== s.lede && h('p', { className: 'nv-tekst nv-muted' }, d.beleving),
            !etappes.length && notities.length ? h('div', { className: 'nv-logistiek' }, h(G.Icon, { name: 'clock', size: 18 }), h('span', null, notities.join(' · '))) : null,
            tips.length ? h(G.TipNote, { title: 'Tips voor ' + kortNaam(s.naam), items: tips }) : null,
            // Bewerken onderweg: dezelfde melding als op Vandaag (nog niet verstuurd, geweigerd).
            p.bewerk ? h(WijzigStand, { wz: p.wz }) : null,
            // Alles rond een plek bij elkaar (besluit gebruiker 2026-10-04): de activiteiten van deze plek met hartjes.
            hier.length ? h('div', { className: 'nv-plekdoen' },
              h('span', { className: 'nv-label' }, p.herinnering ? 'Wat we deden' : 'Te doen in ' + kortNaam(s.naam)),
              h(HartMelding, { hart: p.hart, stil: true }),
              (toonAlles ? hier : hier.slice(0, TE_DOEN_EERST)).map(function (a) {
                // Geplande activiteiten kan een ouder onderweg wijzigen; ideeën niet (die hebben hartjes, geen tijden).
                return O.isIdee(a) || !p.bewerk ? h(ActiviteitRij, { key: a.id, x: a, hart: p.hart })
                  : h(Wijzigbaar, { key: a.id, tabel: 'activiteiten', rij: a, naam: a.naam, wz: p.wz, bewerk: true }, h(ActiviteitRij, { x: a, hart: p.hart }));
              }),
              hier.length > TE_DOEN_EERST ? h('button', { type: 'button', className: 'nv-meer', 'aria-expanded': toonAlles, onClick: function () { setToonAlles(!toonAlles); } },
                toonAlles ? 'Toon minder' : 'Toon nog ' + (hier.length - TE_DOEN_EERST)) : null) : null,
            // Geboekt of status onbekend (O.inSlapen): per verblijf naam, data en contact (onderweg in twee tikken). Anders de stand
            // van het zoeken; prijs is altijd het totaal van een verblijf (CLAUDE.md).
            geboekt.length ? h('div', { className: 'nv-verblijven' },
              h('span', { className: 'nv-label' }, 'Slapen'),
              geboekt.map(function (v) {
                return h('div', { key: v.id, className: 'nv-verblijf' },
                  h(Wijzigbaar, { tabel: 'verblijven', rij: v, naam: v.naam, wz: p.wz, bewerk: p.bewerk },
                    h('div', { className: 'nv-verblijf__kop' },
                      h('span', { className: 'nv-verblijf__naam' }, O.veiligeLink(v.link) ? h('a', { href: v.link, target: '_blank', rel: 'noopener noreferrer' }, v.naam) : v.naam),
                      h(G.StatusBadge, { status: v.status || undefined, label: O.statusLabel(v) })),
                    h('span', { className: 'nv-verblijf__wanneer' }, [O.verblijfPeriode(v), nachtenTekst(v.nachten),
                      O.tijd(v.inchecktijd) && 'inchecken ' + O.tijd(v.inchecktijd), O.tijd(v.uitchecktijd) && 'uitchecken ' + O.tijd(v.uitchecktijd)].filter(Boolean).join(' · ')),
                    h(Notitie, { tekst: v.notitie }),
                    // Alleen de contactvelden; de website staat al op de naam.
                    h(Contact, { adres: v.adres, telefoon: v.telefoon, email: v.email, via: v.geboekt_via, boekingscode: v.boekingscode })));
              })) :
            h('p', { className: 'nv-slapen' },
              h(G.StatusBadge, { status: opties.length ? 'optie' : 'open', label: opties.length ? 'Opties' : 'Nog te bepalen' }),
              opties.length ? h('span', null, opties.length + (opties.length === 1 ? ' verblijf' : ' verblijven') + ' bekeken, ' +
                (prijzen.length ? 'vanaf ' + O.euro(Math.min.apply(null, prijzen)) : 'prijs ?') + ' · ',
                h('a', { href: '#slapen', onClick: function (e) { e.preventDefault(); naar('slapen'); } }, 'bekijk')) :
                h('span', { className: 'nv-muted' }, 'Nog geen verblijf gekozen')),
            // Met route: het kader Onderweg is ook de navigatie naar de vorige/volgende plek.
            etappes.length ? h(Onderweg, { etappes: etappes, notities: notities, dagen: p.dagen, stops: p.stops, hier: s.id, herinnering: p.herinnering, kies: kies, wz: p.wz, bewerk: p.bewerk }) :
            h('div', { className: 'nv-bladeren' },
              vorige && h('button', { type: 'button', className: 'nv-knop', onClick: function () { kies(vorige.id); } }, '← ' + kortNaam(vorige.naam)),
              volgende && h('button', { type: 'button', className: 'nv-knop', onClick: function () { kies(volgende.id); } }, kortNaam(volgende.naam) + ' →'))))));
  }

  // Kader met de etappes van en naar een plek (van → naar, vervoer, km, reistijd, prijs behalve bij de auto).
  // Vervoer: eigen naam (leg_vervoer_label, bijv. "Privébusje") gaat voor de standaardnaam.
  // Een etappe naar/van een andere plek is een knop daarheen (besluit gebruiker 2026-10-01).
  // De tijden van elke dag staan onder de rit die op zijn routepunt aankomt; bij een heen- of
  // terugreisdag (dag zonder plek) ook de tekst (idem).
  function Onderweg(p) {
    return h('div', { className: 'nv-onderweg' },
      h('span', { className: 'nv-label' }, 'Onderweg'),
      p.etappes.map(function (e, k) {
        var l = e.naar, ander = e.aankomst ? e.van : e.naar;
        // Tijden van deze rit (en bij een heen- of terugreisdag ook de tekst) eronder.
        var dag = ritTekst(p.dagen, l);
        var doel = ander.stop_id && ander.stop_id !== p.hier && stopOpId(p.stops, ander.stop_id);
        // Vervoer nog niet gekozen maar wel opties (O.vervoerOpties): per optie icoon, naam, reistijd en toelichting.
        var opties = O.vervoerOpties(l);
        // Eén optie is een advies (geen keuze); de reistijd staat dan al bij die optie.
        var delen = opties.length === 1 ? ['Advies'] : opties.length ? ['Vervoer nog te kiezen', O.reistijdBereik(opties)] : [l.leg_vervoer_label || VERVOER[l.leg_vervoer] || 'Vervoer ?'];
        if (!opties.length) {
          if (l.leg_km != null) delen.push(Number(l.leg_km).toLocaleString('nl-NL') + ' km');
          else if (l.leg_vervoer === 'car') delen.push('? km');
          delen = delen.concat(etappeTijdPrijs(l));
        }
        var inhoud = [
          h(G.Icon, { key: 'i', name: l.leg_vervoer || 'arrow', size: 18 }),
          h('span', { key: 't', className: 'nv-onderweg__tekst' },
            doel ? h('span', { className: 'nv-onzichtbaar' }, e.aankomst ? 'Vorige plek: ' : 'Volgende plek: ') : null,
            h('span', { className: 'nv-onderweg__route' }, kortNaam(e.van.naam) + ' → ' + kortNaam(e.naar.naam)),
            h('span', { className: 'nv-onderweg__info' }, delen.join(' · ')),
            opties.length ? h('span', { className: 'nv-opties' }, opties.map(function (o, k) {
              return h('span', { key: k, className: 'nv-optie' },
                h(G.Icon, { name: o.vervoer, size: 16 }),
                h('span', null, h('span', { className: 'nv-optie__naam' }, O.optieTekst(o)),
                  O.tekstOf(o.toelichting) ? h('span', { className: 'nv-optie__uitleg' }, o.toelichting) : null));
            })) : null,
            dag ? h('span', { className: 'nv-onderweg__dag' }, dag) : null,
            !opties.length && !p.herinnering && !l.leg_geverifieerd ? h('span', { className: 'nv-tijdlijn__check' }, 'te verifiëren') : null),
          doel ? h('span', { key: 'p', className: 'nv-onderweg__pijl', 'aria-hidden': true }, e.aankomst ? '←' : '→') : null];
        // Contact van de rit (bijv. busje) los onder de rij: een link mag niet in een knop.
        var contact = h(Contact, { vertrekpunt: l.leg_adres, telefoon: l.leg_telefoon, email: l.leg_email, via: l.leg_geboekt_via, boekingscode: l.leg_boekingscode });
        // Onderweg kan een ouder de rit wijzigen (tijden, adres, code, betaalstatus, notitie).
        return h(Wijzigbaar, { key: l.id + (e.aankomst ? '-a' : '-v'), tabel: 'route_punten', rij: l, naam: 'route ' + kortNaam(e.van.naam) + ' → ' + kortNaam(e.naar.naam), wz: p.wz, bewerk: p.bewerk }, doel ?
          h('button', { type: 'button', className: 'nv-onderweg__rij', onClick: function () { p.kies(doel.id); } }, inhoud) :
          h('div', { className: 'nv-onderweg__rij' }, inhoud), h(Notitie, { tekst: l.leg_notitie }), contact);
      }),
      p.notities.length ? h('p', { className: 'nv-onderweg__notitie' }, h(G.Icon, { name: 'clock', size: 16 }), h('span', null, p.notities.join(' · '))) : null);
  }

  var KAMERINDELING = { twee_kamers_apart: '2 kamers apart', gezinskamer: 'Gezinskamer',
    appartement_2_slaapkamers: 'Appartement, 2 slaapkamers', anders: 'Andere indeling' };

  function Slapen(p) {
    var rij = React.useRef(null), r = p.reis, kop = (r.secties && r.secties.slapen) || {};
    function schuif(n) { var el = rij.current; if (el) el.scrollBy({ left: n * el.clientWidth * 0.8, behavior: 'smooth' }); }
    var heeft = p.verblijven.length > 0, stand = O.slaapStandTekst(O.slaapStand(p.stops, p.verblijven));
    return h('section', { className: 'nv-blok nv-blok--zand', id: 'slapen' },
      h('div', { className: 'nv-wrap' },
        h('div', { className: 'nv-kopblok' },
          h('span', { className: 'nv-label' }, 'Slapen'),
          // Vaste kop met de stand per plek (besluit gebruiker 2026-10-07); de oude titel in secties.slapen veranderde niet mee.
          h('h2', { className: 'nv-kop' }, 'Accommodatie'),
          stand ? h('p', { className: 'nv-tekst nv-slaapstand' }, stand) : null,
          kop.intro && h('p', { className: 'nv-tekst nv-muted' }, kop.intro)),
        heeft ? null : h(Leeg, { herinnering: p.herinnering, tekst: 'Nog geen verblijven gekozen of bekeken.' }),
        heeft ? h('div', { className: 'nv-pijlen' },
          h('button', { type: 'button', className: 'nv-pijl', 'aria-label': 'Vorige', onClick: function () { schuif(-1); } }, '‹'),
          h('button', { type: 'button', className: 'nv-pijl', 'aria-label': 'Volgende', onClick: function () { schuif(1); } }, '›')) : null,
        heeft ? h('div', { className: 'nv-rij', ref: rij, tabIndex: 0, 'aria-label': 'Verblijven, veeg voor meer' }, p.verblijven.map(function (v) {
          var s = stopOpId(p.stops, v.stop_id);
          // Geen foto van het verblijf: de foto van de plek (besluit gebruiker 2026-10-07), geen leeg gestreept vlak.
          return h(G.StayCard, A(p.foto(v.foto_id || (s && s.foto_id)), { key: v.id, name: v.naam, place: kortNaam(v.plaats || (s && s.naam) || '?'),
            nights: [nachtenTekst(v.nachten), v.geboekt_via && 'via ' + v.geboekt_via].filter(Boolean).join(' · '),
            price: v.prijs != null ? Number(v.prijs) : '€ ?',
            breakfast: v.ontbijt == null ? undefined : v.ontbijt, pool: v.zwembad == null ? undefined : v.zwembad,
            rooms: v.kamers == null ? undefined : v.kamers,
            layout: (v.kamerindeling === 'anders' && v.kamerindeling_toelichting) || KAMERINDELING[v.kamerindeling],
            rating: O.beoordelingTekst(v), status: v.status || undefined, statusLabel: O.statusLabel(v), href: O.veiligeLink(v.link) }));
        })) : null));
  }

  // Hartjes van het gezin (reis.hartjes), gedeeld door plek-paneel, tegels en Doen: één stand per reispagina.
  // wissel: meteen tonen, bij een fout alleen déze activiteit terugzetten (functioneel) en melden.
  // Twee momenten (2026-10-06): vooraf (lijkt me leuk; ideeën, tegels, Vandaag) en achteraf (was leuk; bij wat je
  // deed, na de reis of onderweg vanaf de dag zelf: O.magAchteraf). hartjes = vooraf, zoals altijd.
  function useHartjes(gezin, opties) {
    var g = gezin || { werkt: false, hartjes: [], achteraf: [], leden: [] }, o = opties || {};
    var hs = React.useState(g.hartjes || []), hartjes = hs[0], setHartjes = hs[1];
    var as = React.useState(g.achteraf || []), achteraf = as[0], setAchteraf = as[1];
    var ms = React.useState(''), melding = ms[0], setMelding = ms[1];
    var bezig = React.useRef({});
    function wissel(a, moment) {
      var na = moment === 'achteraf', sleutel = a.id + (na ? ':na' : '');
      if (bezig.current[sleutel]) return;
      var ik = O.hartjesVan(na ? achteraf : hartjes, a.id, g.leden, g.mijnId).ikOok;
      function zet(aan) {
        (na ? setAchteraf : setHartjes)(function (cur) {
          var zonder = cur.filter(function (x) { return !(x.activiteit_id === a.id && x.user_id === g.mijnId); });
          return aan ? zonder.concat([{ user_id: g.mijnId, activiteit_id: a.id, moment: na ? 'achteraf' : 'vooraf' }]) : zonder;
        });
      }
      zet(!ik);
      setMelding('');
      bezig.current[sleutel] = true;
      zetHartje(a.id, !ik, na ? 'achteraf' : 'vooraf').then(function (r) {
        bezig.current[sleutel] = false;
        if (isFout(r)) { zet(ik); setMelding(r.status === 0 ? 'Geen verbinding: je hartje is niet opgeslagen.' : 'Je hartje kon niet worden opgeslagen.'); }
      });
    }
    function magAchteraf(a) { return g.werkt && O.magAchteraf(a, !!o.herinnering, o.vandaag || null, o.aankomst); }
    return { g: g, hartjes: hartjes, achteraf: achteraf, wissel: wissel, magAchteraf: magAchteraf, smaak: o.smaak || {}, melding: melding };
  }

  // Eén activiteit met (als er gezinsdata is) je eigen knop in de vorm van jouw groep en wie er een gaf,
  // elk met het teken van zijn groep (O.hartVorm). De plek staat al erboven (plek-paneel of groep in Doen).
  function ActiviteitRij(p) {
    var x = p.x, hart = p.hart, g = hart.g;
    var ht = O.hartjesVan(hart.hartjes, x.id, g.leden, g.mijnId);
    var mijnVorm = O.hartVorm(g.groep);
    var knop = g.werkt ? h('button', { type: 'button', className: 'nv-hart' + (mijnVorm === '★' ? ' nv-hart--tiener' : ''), 'aria-pressed': ht.ikOok, disabled: !g.mijnId,
      'aria-label': (ht.ikOok ? 'Hartje weghalen bij ' : 'Hartje geven aan ') + x.naam, onClick: function () { hart.wissel(x); } },
      h(VormIcoon, { vorm: mijnVorm, vol: ht.ikOok })) : null;
    var gevers = g.werkt && ht.gevers.length ? h('ul', { className: 'nv-gevers', 'aria-label': 'Hartjes van ' + O.hartjesTekst(ht.namen) }, ht.gevers.map(function (v, k) {
      return h('li', { key: k, className: v.groep === 'tiener' ? 'nv-gever nv-gever--tiener' : 'nv-gever' },
        h('span', { 'aria-hidden': true }, O.hartVorm(v.groep)), ' ' + v.naam);
    })) : null;
    var io = React.useState(false), infoOpen = io[0], setInfoOpen = io[1];
    // Idee (voorstel): compact, zonder prijs en label (besluit gebruiker 2026-10-04); knoppen rechts, gevers onder de uitleg.
    // Een beoogde dag (datum/wanneer) blijft zichtbaar als die er is; anders niets (geen "?"). Meer info (tekst, feiten,
    // website, foto) zit achter de (i)-knop, alleen als er iets te tonen is (besluit gebruiker 2026-10-05).
    if (O.isIdee(x)) {
      var wanneer = O.activiteitWanneer(x), info = O.infoVan(x, g.groep);
      return h('div', { className: 'nv-idee' },
        h('span', { className: 'rg-act__icon' }, h(G.Icon, { name: x.icoon || 'sun', size: 18 })),
        h('div', { className: 'nv-idee__main' },
          h('p', { className: 'rg-act__name' }, x.naam),
          wanneer || x.notitie ? h('p', { className: 'rg-act__when' }, [wanneer, x.notitie].filter(Boolean).join(' · ')) : null,
          gevers),
        h('div', { className: 'nv-idee__knoppen' },
          info ? h('button', { type: 'button', className: 'nv-info', 'aria-haspopup': 'dialog', 'aria-label': 'Meer over ' + x.naam,
            onClick: function () { setInfoOpen(true); } }, h(InfoIcoon)) : null,
          knop),
        info && infoOpen ? h(InfoVenster, { x: x, info: info, knop: knop, gevers: gevers, onSluit: function () { setInfoOpen(false); } }) : null);
    }
    return h('div', { className: 'nv-activiteit' },
      h(G.ActivityRow, { name: x.naam, when: O.activiteitWanneer(x),
        price: x.prijs != null ? Number(x.prijs) : '€ ?',
        note: x.notitie || undefined, status: x.status || undefined, statusLabel: O.statusLabel(x), icon: x.icoon || undefined }),
      h(Contact, { ophaalpunt: x.ophaalpunt, telefoon: x.telefoon, email: x.email, via: x.geboekt_via, boekingscode: x.boekingscode, link: x.link, naam: x.naam }),
      hart.magAchteraf && hart.magAchteraf(x) ? h(Achteraf, { x: x, hart: hart, vooraf: ht.gevers, ikVooraf: ht.ikOok }) :
      g.werkt ? h('div', { className: 'nv-gezin' }, knop, gevers) : null);
  }
  // Achteraf (besluit gebruiker 2026-10-06): hetzelfde hartje of dezelfde ster, maar vanaf de dag zelf (O.magAchteraf)
  // betekent het "was leuk" in plaats van "lijkt me leuk". De kleur van je eigen knop toont hoe jij stemde (tiener en
  // ouder gelijk): alleen vooraf = rood, alleen achteraf = groen, allebei = goud. Daaronder twee regels met wie
  // het leuk vond en wie het vooraf leuk leek. De stem van vooraf blijft bewaard: deze knop raakt alleen achteraf.
  function Achteraf(p) {
    var x = p.x, hart = p.hart, g = hart.g;
    var ht = O.hartjesVan(hart.achteraf, x.id, g.leden, g.mijnId);
    var vorm = O.hartVorm(g.groep);
    var kleur = ht.ikOok ? (p.ikVooraf ? ' nv-hart--beide' : ' nv-hart--was') : p.ikVooraf ? ' nv-hart--leek' : '';
    var label = ht.ikOok ? (p.ikVooraf ? 'Leek leuk en was leuk: ' : 'Was leuk: ') + x.naam + '. Tik om "was leuk" weg te halen'
      : (p.ikVooraf ? 'Leek leuk: ' + x.naam + '. Tik als het ook leuk was' : 'Was leuk geven aan ' + x.naam);
    function regel(tekst, gevers) {
      return h('p', { className: 'nv-achteraf__regel' }, h('span', { className: 'nv-achteraf__label' }, tekst + ': '),
        gevers.map(function (v, k) {
          return h('span', { key: k, className: v.groep === 'tiener' ? 'nv-gever nv-gever--tiener' : 'nv-gever' }, h('span', { 'aria-hidden': true }, O.hartVorm(v.groep)), ' ' + v.naam + (k < gevers.length - 1 ? ', ' : ''));
        }));
    }
    return h('div', { className: 'nv-gezin nv-achteraf' },
      h('button', { type: 'button', className: 'nv-hart' + (vorm === '★' ? ' nv-hart--tiener' : '') + kleur, 'aria-pressed': ht.ikOok, disabled: !g.mijnId,
        'aria-label': label, onClick: function () { hart.wissel(x, 'achteraf'); } },
        h(VormIcoon, { vorm: vorm, vol: ht.ikOok || p.ikVooraf })),
      ht.gevers.length || p.vooraf.length ? h('div', { className: 'nv-achteraf__regels' },
        ht.gevers.length ? regel('Was leuk', ht.gevers) : null,
        p.vooraf.length ? regel('Leek leuk', p.vooraf) : null) : null);
  }
  // Hartje (ouder) of ster (tiener) in de knop als getekend icoon, niet als letterteken: een teken uit een lettertype
  // staat per apparaat net anders (± 2 px uit het midden, gemeten 2026-10-06); een SVG staat overal precies midden.
  // vol = aan (gevuld), anders alleen de omtrek.
  function VormIcoon(p) {
    var ster = p.vorm === '★';
    return h('svg', { className: 'nv-hart__icoon', width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': 'true',
      fill: p.vol ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round' },
      h('path', { d: ster ? 'M12 2.8l2.8 5.9 6.4.8-4.7 4.5 1.2 6.4L12 17.3l-5.7 3.1 1.2-6.4-4.7-4.5 6.4-.8z'
        : 'M12 20.3C7.4 17.2 2.8 13.4 2.8 8.9 2.8 6 5 3.8 7.7 3.8c1.8 0 3.3.9 4.3 2.4 1-1.5 2.5-2.4 4.3-2.4 2.7 0 4.9 2.2 4.9 5.1 0 4.5-4.6 8.3-9.2 11.4z' }));
  }
  // (i): cirkel met een i, in de lijnstijl van G.Icon (die heeft geen info-icoon).
  function InfoIcoon() {
    return h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.75', strokeLinecap: 'round', 'aria-hidden': 'true' },
      h('circle', { cx: 12, cy: 12, r: 9 }), h('path', { d: 'M12 11v6M12 7.5h.01' }));
  }
  // Pop-up met meer info bij een idee: onderblad op de telefoon, venster op een groot scherm. Sluiten met ×, Esc of
  // een tik naast het blad; de focus gaat terug naar de (i)-knop. Onderaan het hartje, want na het lezen weet je het.
  function InfoVenster(p) {
    var ref = React.useRef(null), x = p.x, info = p.info, f = React.useContext(FotoCtx)(x.foto_id), titelId = 'info-' + x.id;
    // Sluiten = het venster uit de boom halen (dat haalt het ook uit de bovenste laag). Niet wachten op het
    // close-event: dat komt niet altijd (bijv. in een tabblad op de achtergrond). Esc gaat via cancel.
    React.useEffect(function () {
      var d = ref.current, terug = document.activeElement;
      function esc(e) { e.preventDefault(); p.onSluit(); }
      d.addEventListener('cancel', esc);
      if (d.showModal && !d.open) d.showModal(); else d.setAttribute('open', '');
      return function () { d.removeEventListener('cancel', esc); if (terug && terug.focus) terug.focus(); };
    }, []);
    function sluit() { p.onSluit(); }
    return h('dialog', { ref: ref, className: 'nv-infovenster', 'aria-labelledby': titelId,
      onClick: function (e) { if (e.target === ref.current) sluit(); } },
      h('div', { className: 'nv-infovenster__kop' },
        h('span', { className: 'rg-act__icon' }, h(G.Icon, { name: x.icoon || 'sun', size: 18 })),
        h('h2', { id: titelId }, x.naam),
        h('button', { type: 'button', className: 'nv-infovenster__sluit', 'aria-label': 'Sluiten', onClick: sluit }, '×')),
      h('div', { className: 'nv-infovenster__inhoud' },
        f.image ? h('div', { className: 'nv-infoblok__foto' }, h('img', { src: f.image, alt: '' }), f.credit && h(G.PhotoCredit, { by: f.credit })) : null,
        info.alineas.map(function (t, i) { return h('p', { key: i }, t); }),
        info.feiten.length ? h('dl', { className: 'nv-infoblok__feiten' }, info.feiten.map(function (r) {
          return h(React.Fragment, { key: r[0] }, h('dt', null, r[0]), h('dd', null, r[1]));
        })) : null,
        info.link ? h('p', null, h('a', { href: info.link, target: '_blank', rel: 'noopener noreferrer' }, 'Meer informatie ↗')) : null,
        p.knop ? h('div', { className: 'nv-infovenster__hart' }, p.knop, p.gevers) : null));
  }

  // De melding staat zowel in het plek-paneel als in Doen (zichtbaar waar je klikte); alleen die in Doen
  // heeft role=status, zodat een schermlezer hem één keer voorleest.
  function HartMelding(p) {
    return p.hart.melding ? h('p', { className: 'nv-doenmelding', role: p.stil ? undefined : 'status' }, p.hart.melding) : null;
  }

  // Doen: overzicht van alle activiteiten, per plek gegroepeerd (volgorde van de route), met een filter op wie
  // er een hartje gaf. Dezelfde activiteiten staan ook in het plek-paneel (besluit gebruiker 2026-10-04:
  // alles rond een plek bij elkaar). Zonder gezinsdata (gezin.werkt false) de lijst zonder filter en hartjes.
  function Doen(p) {
    var kop = (p.reis.secties && p.reis.secties.doen) || {};
    var hart = p.hart, g = hart.g;
    var fs = React.useState('alles'), filter = fs[0], setFilter = fs[1];
    // Verlanglijstje: ideeën alleen met minstens één hartje of ster, geboekt e.d. altijd (besluit gebruiker 2026-10-04).
    // De stand bij het laden telt mee, zodat iets dat je hier ontzet niet meteen verdwijnt en je het kunt terugzetten.
    // Bij een afgeronde reis (Wat we deden) of zonder gezinsdata blijft alles staan.
    var lijst = p.herinnering || !g.werkt ? p.activiteiten : O.opVerlanglijst(p.activiteiten, (g.hartjes || []).concat(hart.hartjes));
    // Filter op wie er een hartje gaf: tieners (★) of ouders (♥); groep onbekend telt als ouder (zelfde vorm).
    var zichtbaar = lijst.filter(function (a) {
      if (filter === 'alles') return true;
      return O.hartjesVan(p.herinnering && !O.isIdee(a) ? hart.achteraf : hart.hartjes, a.id, g.leden, g.mijnId).gevers.some(function (x) { return (x.groep === 'tiener') === (filter === 'tiener'); });
    });
    // Groepen per plek in routevolgorde; zonder plek achteraan.
    var groepen = p.stops.map(function (s) { return { s: s, items: zichtbaar.filter(function (a) { return a.stop_id === s.id; }) }; })
      .concat([{ s: null, items: zichtbaar.filter(function (a) { return !a.stop_id; }) }])
      .filter(function (x) { return x.items.length; });
    var filters = [['alles', 'Alles'], ['tiener', O.hartVorm('tiener') + ' Tieners'], ['volwassene', O.hartVorm('volwassene') + ' Ouders']];
    return h('section', { className: 'nv-blok', id: 'doen' },
      h('div', { className: 'nv-wrap', style: { maxWidth: '760px' } },
        h('div', { className: 'nv-kopblok' },
          h('span', { className: 'nv-label' }, p.herinnering ? 'Wat we deden' : 'Wat we willen doen'),
          h('h2', { className: 'nv-kop' }, kop.title || (p.herinnering ? 'Wat we deden' : 'Op het verlanglijstje')),
          kop.intro && h('p', { className: 'nv-tekst nv-muted' }, kop.intro),
          p.herinnering && g.werkt && lijst.length ? h('p', { className: 'nv-tekst nv-muted' }, 'Wat was leuk? Geef je hartje of ster: vanaf de dag zelf betekent dat ‘was leuk’.') : null),
        g.werkt && lijst.length ? h('div', { className: 'nv-doenfilter', role: 'group', 'aria-label': 'Toon' }, filters.map(function (f) {
          return h('button', { key: f[0], type: 'button', className: 'nv-tab', 'aria-pressed': filter === f[0], onClick: function () { setFilter(f[0]); } }, f[1]);
        })) : null,
        h(HartMelding, { hart: hart }),
        !p.activiteiten.length ? h(Leeg, { herinnering: p.herinnering, tekst: 'Nog geen activiteiten gekozen.' }) :
        !lijst.length ? h('p', { className: 'nv-muted' }, 'Nog niets met een hartje of ster. Geef ze bij ‘Te doen’ in het programma.') :
        !groepen.length ? h('p', { className: 'nv-muted' }, filter === 'tiener' ? 'Nog geen ster van een tiener.' : 'Nog geen hartje van een ouder.') :
        groepen.map(function (x) {
          return h('div', { key: x.s ? x.s.id : 'los', className: 'nv-doengroep' },
            h('h3', { className: 'nv-doengroep__plek' }, x.s ? kortNaam(x.s.naam) : 'Overig'),
            x.items.map(function (a) { return h(ActiviteitRij, { key: a.id, x: a, hart: hart }); }));
        })));
  }

  function Kosten(p) {
    var r = p.reis, kop = (r.secties && r.secties.kosten) || {};
    return h('section', { className: 'nv-blok nv-blok--zand', id: 'kosten' },
      h('div', { className: 'nv-wrap', style: { maxWidth: '760px' } },
        h('div', { className: 'nv-kopblok' },
          h('span', { className: 'nv-label' }, 'Kosten'),
          h('h2', { className: 'nv-kop' }, kop.title || 'Wat het kost'),
          kop.intro && h('p', { className: 'nv-tekst nv-muted' }, kop.intro)),
        p.budget.length ? h(G.BudgetSummary, { categories: p.budget.map(O.budgetRegel), note: r.budget_notitie || undefined }) : h(Leeg, { herinnering: p.herinnering, tekst: 'Nog geen kosten bekend.' })));
  }

  // Elke reis dezelfde onderdelen, ook als er (nog) niets in staat.
  var SECTIES = [['overzicht', 'Overzicht'], ['programma', 'Programma'], ['slapen', 'Slapen'], ['doen', 'Doen'], ['kosten', 'Kosten']];

  // Bewerken onderweg: de reisdata met de wijzigingen uit de wachtrij erop (meteen zichtbaar, ook zonder bereik).
  // Stand van de pagina = de data bij het openen, plus wat er in deze sessie is opgeslagen (blijft staan na het
  // versturen), plus je eigen wijzigingen uit de wachtrij (nog niet verstuurd, of verstuurd maar nog niet opnieuw
  // opgehaald). Is er iets verstuurd, of staan er verstuurde kopieën: de reis opnieuw ophalen (dan staan ook de
  // wijzigingen van de andere ouder erin en heeft de offline kopie de nieuwste stand). Alleen het laatst gestarte
  // ophalen telt, en alleen als er sindsdien niets is opgeslagen.
  function useWijzigingen(data) {
    var b = React.useState(function () { return { route: data.route, verblijven: data.verblijven, activiteiten: data.activiteiten }; }), basis = b[0], setBasis = b[1];
    var t = React.useState(0), setTik = t[1];
    var u = React.useState('ok'), opslag = u[0], setOpslag = u[1];
    var volg = React.useRef(0), laatsteOpslag = React.useRef(0);
    function tik() { setTik(function (n) { return n + 1; }); }
    React.useEffect(function () {
      function bij(e) {
        tik();
        var verstuurd = (e && e.detail && e.detail.verstuurd) || 0;
        if (!navigator.onLine || (!verstuurd && !eigenWijzigingen(function (x) { return x.verzonden; }).length)) return;
        var mijn = ++volg.current, start = Date.now(), startIso = new Date(start).toISOString();
        haalReisVers(data.reis.id).then(function (vers) {
          if (mijn !== volg.current || laatsteOpslag.current > start || !vers || isFout(vers)) return;
          vergeetVerzondenWijzigingen(startIso);
          setBasis({ route: vers.route, verblijven: vers.verblijven, activiteiten: vers.activiteiten });
        });
      }
      window.addEventListener('reis-wijziging-verstuurd', bij);
      // Eén keer bij het openen: verstuurde kopieën uit een vorige sessie na een verse ophaalronde opruimen
      // (de gebeurtenis van de verzendronde bij het laden kan al voorbij zijn).
      bij({ detail: { verstuurd: 0 } });
      return function () { window.removeEventListener('reis-wijziging-verstuurd', bij); };
    }, []);
    var w = leesWijzigingen(), ik = mijnId();
    function klaar(uitslag) {
      setOpslag(uitslag);
      // De wijziging staat in de wachtrij (ook na versturen, tot de verse ophaalronde) en is zo meteen zichtbaar;
      // wordt ze geweigerd, dan verdwijnt ze weer uit beeld (de basis blijft de stand van de server).
      if (uitslag === 'ok') { laatsteOpslag.current = Date.now(); verstuurWijzigingen(); }
      tik();
      return uitslag;
    }
    var eigen = Object.keys(w).filter(function (k) { return ik && w[k].user_id === ik; });
    var fouten = eigen.filter(function (k) { return w[k].fout; }).length;
    var wachtend = eigen.filter(function (k) { return !w[k].fout && !w[k].verzonden; }).length;
    return {
      route: O.pasWijzigingenToe(basis.route, 'route_punten', w, ik),
      verblijven: O.pasWijzigingenToe(basis.verblijven, 'verblijven', w, ik),
      activiteiten: O.pasWijzigingenToe(basis.activiteiten, 'activiteiten', w, ik),
      wijzig: function (tabel, id, velden) { return klaar(zetWijziging(tabel, id, velden)); },
      voegToe: function (rij) { return klaar(nieuweActiviteit(rij)); },
      verwerp: function () { wisGeweigerdeWijzigingen(); setOpslag('ok'); tik(); },
      opslag: opslag, wachtend: wachtend, fouten: fouten
    };
  }
  // Melding over wijzigingen die nog niet (of niet) zijn aangekomen; geweigerde kun je verwerpen.
  function WijzigStand(p) {
    var wz = p.wz;
    var t = wz.opslag === 'uitgelogd' ? 'Je bent niet ingelogd: je laatste wijziging is níet bewaard.'
      : wz.opslag === 'vol' ? 'De opslag van deze telefoon is vol: je laatste wijziging is níet bewaard.'
      : wz.fouten ? wz.fouten + (wz.fouten === 1 ? ' wijziging is' : ' wijzigingen zijn') + ' geweigerd en niet opgeslagen.'
      : wz.wachtend ? wz.wachtend + (wz.wachtend === 1 ? ' wijziging staat' : ' wijzigingen staan') + ' op deze telefoon en gaan mee zodra er verbinding is.' : '';
    if (!t) return null;
    return h('div', { className: wz.opslag !== 'ok' || wz.fouten ? 'nv-melding nv-wijzig__stand' : 'nv-muted nv-wijzig__stand', role: 'status' }, t,
      wz.fouten ? h('button', { type: 'button', className: 'nv-knop', onClick: wz.verwerp }, 'Verwerpen') : null);
  }

  function Reispagina(props) {
    var data0 = props.data, r = data0.reis, stops = data0.stops;
    var wz = useWijzigingen(data0);
    var data = A(data0, { route: wz.route, verblijven: wz.verblijven, activiteiten: wz.activiteiten });
    // Onderweg: is deze reis actief (vanaf de dag vóór vertrek), dan staat Vandaag vooraan en opent Plek voor plek
    // op de plek van vandaag (besluit gebruiker 2026-10-04).
    var gezin = data.gezin || {};
    var vandaag = vandaagIso(!!gezin.beheerder);
    var onderweg = O.actieveReis([r], vandaag);
    var pk = React.useState(function () {
      var hier = onderweg && O.dagOverzicht({ reis: r, stops: stops, route: data.route, verblijven: data.verblijven }, vandaag).plekId;
      return hier || (stops[0] && stops[0].id);
    }), plekId = pk[0], setPlekId = pk[1];
    React.useEffect(function () { document.title = r.titel + ' · Onze reizen'; }, [r.titel]);
    // Vanuit een tegel: naar het programma. Binnen het programma: alleen terug naar het paneel als je al voorbij het begin bent.
    function kiesPlek(id, blijf) {
      setPlekId(id);
      if (!blijf) return naar('programma');
      var el = document.getElementById('plek-paneel');
      if (el && el.getBoundingClientRect().top < 0) naar('plek-paneel');
    }
    // Reisverslag: vanaf vertrek, voor de ouders (schrijven) of zodra er iets geschreven is (lezen).
    var vs = useVerslagen(data);
    var verslagDagen = O.verslagDagen(r, vandaag);
    var toonVerslag = verslagDagen.length > 0 && (!!gezin.beheerder || vs.rijen.some(function (v) { return v.tekst && v.tekst.trim(); }));
    var plekken = React.useMemo(function () {
      var uit = {}, d = { reis: r, stops: stops, route: data.route, verblijven: data.verblijven };
      verslagDagen.forEach(function (dag) { uit[dag] = O.dagOverzicht(d, dag).plek; });
      return uit;
    }, [verslagDagen.join()]);
    var secties = (onderweg ? [['vandaag', 'Vandaag']] : []).concat(SECTIES.slice(0, 4), toonVerslag ? [['verslag', 'Verslag']] : [], SECTIES.slice(4));
    var a = React.useState(null), actief = a[0], setActief = a[1];
    React.useEffect(function () {
      function bijScroll() {
        var huidige = null;
        secties.forEach(function (s) { var el = document.getElementById(s[0]); if (el && el.getBoundingClientRect().top < 140) huidige = s[0]; });
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) huidige = secties[secties.length - 1][0];
        setActief(huidige);
      }
      window.addEventListener('scroll', bijScroll, { passive: true });
      bijScroll();
      // Vanaf de kaart "Nu onderweg": meteen naar Vandaag.
      if (onderweg && location.hash === '#vandaag') setTimeout(function () { naar('vandaag'); }, 0);
      return function () { window.removeEventListener('scroll', bijScroll); };
    }, []);

    // Hartje = "was leuk" na de reis: afgerond (herinnering) of na thuiskomst (O.naReis); onderweg vanaf de dag of de plek.
    var hart = useHartjes(data.gezin, { herinnering: r.stemming === 'herinnering' || O.naReis(r, vandaag), vandaag: onderweg ? vandaag : null,
      aankomst: O.aankomstPlekken(data.verblijven), smaak: data.smaak });
    var p = { reis: r, herinnering: r.stemming === 'herinnering', stops: stops, dagen: data.dagen, route: data.route,
      verblijven: data.verblijven, budget: data.budget, activiteiten: data.activiteiten, hart: hart, foto: maakFoto(data.fotos), kiesPlek: kiesPlek,
      // Bewerken onderweg: alleen ouders en alleen tijdens een actieve reis (ervóór is de Excel leidend).
      wz: wz, bewerk: !!gezin.beheerder && !!onderweg };
    return h(FotoCtx.Provider, { value: p.foto },
      h(Opening, p),
      h(Balk, { secties: secties, actief: actief }),
      h('main', null,
        data.fotoFout && h('div', { className: 'nv-wrap' }, h(FotoMelding, { fout: data.fotoFout })),
        onderweg ? h(Vandaag, { dag: O.dagOverzicht({ reis: r, stops: stops, route: data.route, verblijven: data.verblijven, activiteiten: data.activiteiten,
          hartjes: hart.g.hartjes || [], smaak: data.smaak }, vandaag), hart: hart, beheerder: !!gezin.beheerder, reisId: r.id, vs: vs, gezin: gezin, wz: wz,
          open: O.openVanGisteren({ reis: r, route: data.route, verblijven: data.verblijven, activiteiten: data.activiteiten }, vandaag),
          plekGisteren: O.dagOverzicht({ reis: r, stops: stops, route: data.route, verblijven: data.verblijven }, O.plusDagen(vandaag, -1)).plek }) : null,
        h(Intro, p), h(Citaat, p), h(Overzicht, p), h(Programma, A(p, { plekId: plekId })), h(Slapen, p), h(Doen, p),
        toonVerslag ? h(Reisverslag, { reis: r, vs: vs, gezin: gezin, dagen: verslagDagen, plekken: plekken, beheerder: !!gezin.beheerder, vandaag: onderweg ? vandaag : null }) : null,
        h(Kosten, p)),
      h(Voet, { tekst: r.titel, onUitloggen: props.onUitloggen }));
  }

  // ═════════════ app: welk scherm ═════════════
  // Adres: ./ = startscherm, ?reis=<slug> = reispagina.
  // Het URL-fragment (uitnodigings- of resetlink) één keer verwerken, vóór het renderen.
  var FRAGMENT = verwerkAuthFragment();
  var LINK_KAPOT = 'De link werkt niet (meer). Vraag een nieuwe uitnodiging aan.';

  function App() {
    var s = React.useState(function () {
      if (FRAGMENT === 'invite' || FRAGMENT === 'recovery') return { scherm: 'wachtwoord' };
      if (FRAGMENT === 'fout') return isIngelogd() ? { scherm: 'fout', tekst: LINK_KAPOT } : { scherm: 'inloggen', melding: LINK_KAPOT };
      return { scherm: isIngelogd() ? 'laden' : 'inloggen' };
    }), st = s[0], zet = s[1];

    function haal(slug) { return slug ? haalReis(slug) : haalReizen(); }
    function laad() {
      var slug = new URLSearchParams(location.search).get('reis');
      zet({ scherm: 'laden' });
      haal(slug).then(function (res) {
        // 401: eerst één keer de sessie verversen en opnieuw proberen, pas daarna uitloggen.
        if (res && res._error && res.status === 401) return huidigeAuthToken(true).then(function (t) { return t ? haal(slug) : res; });
        return res;
      }).then(function (res) {
        if (!isIngelogd()) return zet({ scherm: 'inloggen' }); // intussen uitgelogd
        if (slug && res === null) return zet({ scherm: 'fout', tekst: 'Deze reis bestaat niet of is niet zichtbaar voor dit account.' });
        if (res._error && res.status === 401) { clearAuthSession(); return zet({ scherm: 'inloggen', melding: 'Je sessie is verlopen. Log opnieuw in.' }); }
        if (isFout(res)) return zet({ scherm: 'fout', tekst: res.status === 0 ? 'Geen verbinding. Controleer je internet en probeer het opnieuw.' : 'Laden mislukt: ' + res.message });
        zet({ scherm: slug ? 'reis' : 'start', data: res });
        verstuurAlles(); // wat zonder bereik geschreven of gewijzigd is, alsnog versturen
      });
    }
    React.useEffect(function () { if (st.scherm === 'laden') laad(); }, []);
    function uitloggen() {
      // Niet-verstuurd reisverslag blijft op deze telefoon staan (gaat mee als je weer inlogt); wel eerst waarschuwen.
      if ((heeftOnverzondenVerslag() || heeftOnverzondenWijziging()) && !window.confirm('Er staat nog een reisverslag of wijziging op deze telefoon die niet is verstuurd. Het blijft bewaard en gaat mee zodra je weer inlogt met verbinding. Toch uitloggen?')) return;
      signOut().then(function () { zet({ scherm: 'inloggen' }); });
    }

    if (st.scherm === 'inloggen') return h(Inloggen, { melding: st.melding, onIngelogd: laad });
    if (st.scherm === 'wachtwoord') return h(WachtwoordInstellen, { type: FRAGMENT, onKlaar: laad });
    if (st.scherm === 'laden') return h(Status, { tekst: 'Laden…' });
    if (st.scherm === 'fout') return h(Status, { fout: true, tekst: st.tekst, kinderen: h('p', { className: 'nv-status__knoppen' },
      h('button', { type: 'button', className: 'nv-knop', onClick: laad }, 'Opnieuw proberen'),
      h('a', { className: 'nv-knop', href: './' }, 'Alle reizen'),
      h('button', { type: 'button', className: 'nv-knop', onClick: uitloggen }, 'Uitloggen')) });
    if (st.scherm === 'start') return h(Startscherm, { data: st.data, onUitloggen: uitloggen });
    return h(Reispagina, { data: st.data, onUitloggen: uitloggen });
  }

  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
