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
  var VERVOER = { car: 'Auto', plane: 'Vliegtuig', boat: 'Boot', bus: 'Bus', train: 'Trein' };
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
        })),
      h(Voet, { onUitloggen: p.onUitloggen }));
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
    return h('section', { className: 'nv-intro', id: 'reis' },
      h('div', { className: 'nv-intro__foto' }, f.image && h('img', { src: f.image, alt: '' }), f.credit && h(G.PhotoCredit, { by: f.credit })),
      h('div', { className: 'nv-intro__tekst' },
        h('span', { className: 'nv-label' }, 'De reis'),
        h('h2', { className: 'nv-kop' }, kop.title || r.titel),
        r.lede && h('p', { className: 'nv-tekst' }, r.lede),
        (r.feiten || []).length ? h('ul', { className: 'nv-feiten' }, r.feiten.map(function (x, i) {
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
          var onzeker = l && !p.herinnering && !l.leg_geverifieerd;
          return h('li', { key: i, className: rand ? 'is-thuis' : '' },
            h('span', { className: 'nv-tijdlijn__datum' }, datum ? O.kortDatum(datum) : '?'),
            h('span', { className: 'nv-tijdlijn__naam' }, kortNaam(x.naam)),
            h('span', { className: 'nv-tijdlijn__nacht' }, nacht),
            i > 0 && l ? h('span', { className: 'nv-tijdlijn__reis' },
              h(G.Icon, { name: l.leg_vervoer || 'reis', size: 14 }),
              etappeTijdPrijs(l).join(' · '),
              onzeker ? h('span', { className: 'nv-tijdlijn__check' }, 'te verifiëren') : null) : null);
        })) : h(Leeg, { herinnering: p.herinnering, tekst: 'Nog geen route.' }),
        // Elke plek een sfeertegel (besluit gebruiker 2026-09-29).
        h('div', { className: 'nv-tegels' }, p.stops.map(function (s) {
          var f = p.foto(s.foto_id);
          return h('button', { key: s.id, type: 'button', className: 'nv-tegel', onClick: function () { p.kiesPlek(s.id); } },
            f.image && h('img', { src: f.image, alt: '' }),
            h('span', { className: 'nv-tegel__tekst' },
              h('span', { className: 'nv-tegel__naam' }, kortNaam(s.naam)),
              h('span', { className: 'nv-tegel__meer' }, nachtenPlek(p.route, s) + ' →')));
        }))));
  }

  function Programma(p) {
    var i = Math.max(0, p.stops.findIndex(function (s) { return s.id === p.plekId; }));
    var s = p.stops[i];
    var tabsRef = React.useRef(null);
    var sid = s && s.id;
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
            // Geboekt of status onbekend (O.inSlapen): per verblijf naam, data en contact (onderweg in twee tikken). Anders de stand
            // van het zoeken; prijs is altijd het totaal van een verblijf (CLAUDE.md).
            geboekt.length ? h('div', { className: 'nv-verblijven' },
              h('span', { className: 'nv-label' }, 'Slapen'),
              geboekt.map(function (v) {
                return h('div', { key: v.id, className: 'nv-verblijf' },
                  h('div', { className: 'nv-verblijf__kop' },
                    h('span', { className: 'nv-verblijf__naam' }, O.veiligeLink(v.link) ? h('a', { href: v.link, target: '_blank', rel: 'noopener noreferrer' }, v.naam) : v.naam),
                    h(G.StatusBadge, { status: v.status || undefined, label: O.statusLabel(v) })),
                  h('span', { className: 'nv-verblijf__wanneer' }, [O.verblijfPeriode(v), nachtenTekst(v.nachten),
                    O.tijd(v.inchecktijd) && 'inchecken ' + O.tijd(v.inchecktijd), O.tijd(v.uitchecktijd) && 'uitchecken ' + O.tijd(v.uitchecktijd)].filter(Boolean).join(' · ')),
                  // Alleen de contactvelden; de website staat al op de naam.
                  h(Contact, { adres: v.adres, telefoon: v.telefoon, email: v.email, via: v.geboekt_via, boekingscode: v.boekingscode }));
              })) :
            h('p', { className: 'nv-slapen' },
              h(G.StatusBadge, { status: opties.length ? 'optie' : 'open', label: opties.length ? 'Opties' : 'Nog te bepalen' }),
              opties.length ? h('span', null, opties.length + (opties.length === 1 ? ' verblijf' : ' verblijven') + ' bekeken, ' +
                (prijzen.length ? 'vanaf ' + O.euro(Math.min.apply(null, prijzen)) : 'prijs ?') + ' · ',
                h('a', { href: '#slapen', onClick: function (e) { e.preventDefault(); naar('slapen'); } }, 'bekijk')) :
                h('span', { className: 'nv-muted' }, 'Nog geen verblijf gekozen')),
            // Met route: het kader Onderweg is ook de navigatie naar de vorige/volgende plek.
            etappes.length ? h(Onderweg, { etappes: etappes, notities: notities, dagen: p.dagen, stops: p.stops, hier: s.id, herinnering: p.herinnering, kies: kies }) :
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
        var delen = [l.leg_vervoer_label || VERVOER[l.leg_vervoer] || 'Vervoer ?'];
        if (l.leg_km != null) delen.push(Number(l.leg_km).toLocaleString('nl-NL') + ' km');
        else if (l.leg_vervoer === 'car') delen.push('? km');
        delen = delen.concat(etappeTijdPrijs(l));
        var inhoud = [
          h(G.Icon, { key: 'i', name: l.leg_vervoer || 'arrow', size: 18 }),
          h('span', { key: 't', className: 'nv-onderweg__tekst' },
            doel ? h('span', { className: 'nv-onzichtbaar' }, e.aankomst ? 'Vorige plek: ' : 'Volgende plek: ') : null,
            h('span', { className: 'nv-onderweg__route' }, kortNaam(e.van.naam) + ' → ' + kortNaam(e.naar.naam)),
            h('span', { className: 'nv-onderweg__info' }, delen.join(' · ')),
            dag ? h('span', { className: 'nv-onderweg__dag' }, dag) : null,
            !p.herinnering && !l.leg_geverifieerd ? h('span', { className: 'nv-tijdlijn__check' }, 'te verifiëren') : null),
          doel ? h('span', { key: 'p', className: 'nv-onderweg__pijl', 'aria-hidden': true }, e.aankomst ? '←' : '→') : null];
        // Contact van de rit (bijv. busje) los onder de rij: een link mag niet in een knop.
        var contact = h(Contact, { vertrekpunt: l.leg_adres, telefoon: l.leg_telefoon, email: l.leg_email, via: l.leg_geboekt_via, boekingscode: l.leg_boekingscode });
        return h(React.Fragment, { key: k }, doel ?
          h('button', { type: 'button', className: 'nv-onderweg__rij', onClick: function () { p.kies(doel.id); } }, inhoud) :
          h('div', { className: 'nv-onderweg__rij' }, inhoud), contact);
      }),
      p.notities.length ? h('p', { className: 'nv-onderweg__notitie' }, h(G.Icon, { name: 'clock', size: 16 }), h('span', null, p.notities.join(' · '))) : null);
  }

  var KAMERINDELING = { twee_kamers_apart: '2 kamers apart', gezinskamer: 'Gezinskamer',
    appartement_2_slaapkamers: 'Appartement, 2 slaapkamers', anders: 'Andere indeling' };

  function Slapen(p) {
    var rij = React.useRef(null), r = p.reis, kop = (r.secties && r.secties.slapen) || {};
    function schuif(n) { var el = rij.current; if (el) el.scrollBy({ left: n * el.clientWidth * 0.8, behavior: 'smooth' }); }
    var heeft = p.verblijven.length > 0;
    return h('section', { className: 'nv-blok nv-blok--zand', id: 'slapen' },
      h('div', { className: 'nv-wrap' },
        h('div', { className: 'nv-kopblok' },
          h('span', { className: 'nv-label' }, 'Accommodatie'),
          h('h2', { className: 'nv-kop' }, kop.title || 'Waar we slapen'),
          kop.intro && h('p', { className: 'nv-tekst nv-muted' }, kop.intro)),
        heeft ? null : h(Leeg, { herinnering: p.herinnering, tekst: 'Nog geen verblijven gekozen of bekeken.' }),
        heeft ? h('div', { className: 'nv-pijlen' },
          h('button', { type: 'button', className: 'nv-pijl', 'aria-label': 'Vorige', onClick: function () { schuif(-1); } }, '‹'),
          h('button', { type: 'button', className: 'nv-pijl', 'aria-label': 'Volgende', onClick: function () { schuif(1); } }, '›')) : null,
        heeft ? h('div', { className: 'nv-rij', ref: rij, tabIndex: 0, 'aria-label': 'Verblijven, veeg voor meer' }, p.verblijven.map(function (v) {
          var s = stopOpId(p.stops, v.stop_id);
          return h(G.StayCard, A(p.foto(v.foto_id), { key: v.id, name: v.naam, place: kortNaam(v.plaats || (s && s.naam) || '?'),
            nights: [nachtenTekst(v.nachten), v.geboekt_via && 'via ' + v.geboekt_via].filter(Boolean).join(' · '),
            price: v.prijs != null ? Number(v.prijs) : '€ ?',
            breakfast: v.ontbijt == null ? undefined : v.ontbijt, pool: v.zwembad == null ? undefined : v.zwembad,
            rooms: v.kamers == null ? undefined : v.kamers,
            layout: (v.kamerindeling === 'anders' && v.kamerindeling_toelichting) || KAMERINDELING[v.kamerindeling],
            rating: O.beoordelingTekst(v), status: v.status || undefined, statusLabel: O.statusLabel(v), href: O.veiligeLink(v.link) }));
        })) : null));
  }

  function Doen(p) {
    var kop = (p.reis.secties && p.reis.secties.doen) || {};
    return h('section', { className: 'nv-blok', id: 'doen' },
      h('div', { className: 'nv-wrap', style: { maxWidth: '760px' } },
        h('div', { className: 'nv-kopblok' },
          h('span', { className: 'nv-label' }, p.herinnering ? 'Wat we deden' : 'Wat we willen doen'),
          h('h2', { className: 'nv-kop' }, kop.title || (p.herinnering ? 'Wat we deden' : 'Op het verlanglijstje')),
          kop.intro && h('p', { className: 'nv-tekst nv-muted' }, kop.intro)),
        p.activiteiten.length ? p.activiteiten.map(function (x) {
          // Met datum (migratie 0013): plek + datum + tijden; anders de oude tekst `wanneer`.
          var s = x.datum && stopOpId(p.stops, x.stop_id);
          return h('div', { key: x.id, className: 'nv-activiteit' },
            h(G.ActivityRow, { name: x.naam, when: [s && kortNaam(s.naam), O.activiteitWanneer(x)].filter(Boolean).join(' · '),
              price: x.prijs != null ? Number(x.prijs) : '€ ?',
              note: x.notitie || undefined, status: x.status || undefined, statusLabel: O.statusLabel(x), icon: x.icoon || undefined }),
            h(Contact, { ophaalpunt: x.ophaalpunt, telefoon: x.telefoon, email: x.email, via: x.geboekt_via, boekingscode: x.boekingscode, link: x.link, naam: x.naam }));
        }) : h(Leeg, { herinnering: p.herinnering, tekst: 'Nog geen activiteiten gekozen.' })));
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

  function Reispagina(props) {
    var data = props.data, r = data.reis, stops = data.stops;
    var pk = React.useState(stops[0] && stops[0].id), plekId = pk[0], setPlekId = pk[1];
    React.useEffect(function () { document.title = r.titel + ' · Onze reizen'; }, [r.titel]);
    // Vanuit een tegel: naar het programma. Binnen het programma: alleen terug naar het paneel als je al voorbij het begin bent.
    function kiesPlek(id, blijf) {
      setPlekId(id);
      if (!blijf) return naar('programma');
      var el = document.getElementById('plek-paneel');
      if (el && el.getBoundingClientRect().top < 0) naar('plek-paneel');
    }
    var a = React.useState(null), actief = a[0], setActief = a[1];
    React.useEffect(function () {
      function bijScroll() {
        var huidige = null;
        SECTIES.forEach(function (s) { var el = document.getElementById(s[0]); if (el && el.getBoundingClientRect().top < 140) huidige = s[0]; });
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) huidige = SECTIES[SECTIES.length - 1][0];
        setActief(huidige);
      }
      window.addEventListener('scroll', bijScroll, { passive: true });
      bijScroll();
      return function () { window.removeEventListener('scroll', bijScroll); };
    }, []);

    var p = { reis: r, herinnering: r.stemming === 'herinnering', stops: stops, dagen: data.dagen, route: data.route,
      verblijven: data.verblijven, budget: data.budget, activiteiten: data.activiteiten, foto: maakFoto(data.fotos), kiesPlek: kiesPlek };
    return h(React.Fragment, null,
      h(Opening, p),
      h(Balk, { secties: SECTIES, actief: actief }),
      h('main', null,
        data.fotoFout && h('div', { className: 'nv-wrap' }, h(FotoMelding, { fout: data.fotoFout })),
        h(Intro, p), h(Citaat, p), h(Overzicht, p), h(Programma, A(p, { plekId: plekId })), h(Slapen, p), h(Doen, p), h(Kosten, p)),
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
      });
    }
    React.useEffect(function () { if (st.scherm === 'laden') laad(); }, []);
    function uitloggen() { signOut().then(function () { zet({ scherm: 'inloggen' }); }); }

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
