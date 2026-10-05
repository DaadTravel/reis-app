// ═══════════════════════════════════════════════
// Reis-app — gedeelde logica: auth en Supabase-datalaag
// ═══════════════════════════════════════════════
// Rechtstreeks via de REST-API, zonder supabase-js (zelfde aanpak als
// fcp16-2). Alle lees- en schrijfacties naar Supabase staan hier als
// gedeelde functies; schermen roepen alleen deze functies aan.

// ─── SUPABASE ───
// Publieke client-sleutel: geen wachtwoord, de data is beschermd door RLS
// (alleen leden van reis.leden zien iets; anon heeft geen toegang tot
// schema reis). Daarom mag deze in de app-code staan.
const SB_URL = 'https://wvtvcfmdkyzuptnuawuy.supabase.co';
const SB_KEY = 'sb_publishable_7EU_azIeiW6MaJoQ6y9qnQ_TrtuNbTN';
const SCHEMA = 'reis';
const FOTO_BUCKET = 'reis-fotos';

// ─── AUTH ───
// Sessie in localStorage; de access-token wordt ruim vóór het verlopen
// ververst (60 s marge). Refresh-tokens zijn eenmalig bruikbaar, dus
// gelijktijdige aanroepen wachten op dezelfde verversing.
function leesOpslag(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
// Geeft false als bewaren niet lukte (geen opslag of opslag vol).
function zetOpslag(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); return true; } catch (e) { /* geen opslag: alleen deze sessie */ return false; } }

let AUTH_ACCESS_TOKEN = leesOpslag('reis_access_token');
let AUTH_REFRESH_TOKEN = leesOpslag('reis_refresh_token');
let AUTH_EXPIRES_AT = parseInt(leesOpslag('reis_expires_at'), 10) || 0;
let bezigMetVerversen = null;

function saveAuthSession(s) {
  AUTH_ACCESS_TOKEN = s.access_token;
  AUTH_REFRESH_TOKEN = s.refresh_token || '';
  AUTH_EXPIRES_AT = Math.floor(Date.now() / 1000) + (s.expires_in || 3600);
  zetOpslag('reis_access_token', AUTH_ACCESS_TOKEN);
  zetOpslag('reis_refresh_token', AUTH_REFRESH_TOKEN);
  zetOpslag('reis_expires_at', String(AUTH_EXPIRES_AT));
}
// Offline bewaarde reisdata en foto's (sw.js, zelfde namen als DATA en FOTOS
// daar) horen bij de sessie: weg bij uitloggen of een geweigerde sessie. De
// service worker krijgt ook een bericht, zodat een verzoek dat nog loopt de
// data niet alsnog terugzet.
const DATA_CACHES = ['reis-app-data', 'reis-app-fotos'];
function clearAuthSession() {
  AUTH_ACCESS_TOKEN = ''; AUTH_REFRESH_TOKEN = ''; AUTH_EXPIRES_AT = 0;
  zetOpslag('reis_access_token', ''); zetOpslag('reis_refresh_token', ''); zetOpslag('reis_expires_at', '');
  const sw = navigator.serviceWorker && navigator.serviceWorker.controller;
  if (sw) sw.postMessage({ type: 'wis-data' });
  if (!window.caches) return Promise.resolve();
  return Promise.all(DATA_CACHES.map(n => caches.delete(n).catch(() => {})));
}
function isIngelogd() { return !!(AUTH_ACCESS_TOKEN || AUTH_REFRESH_TOKEN); }

async function refreshAuthSession() {
  // Een ander tabblad (of de PWA naast de browser) kan al ververst hebben:
  // refresh-tokens zijn eenmalig, dus eerst de opgeslagen sessie overnemen.
  const opgeslagen = leesOpslag('reis_refresh_token');
  if (opgeslagen && opgeslagen !== AUTH_REFRESH_TOKEN) {
    AUTH_ACCESS_TOKEN = leesOpslag('reis_access_token');
    AUTH_REFRESH_TOKEN = opgeslagen;
    AUTH_EXPIRES_AT = parseInt(leesOpslag('reis_expires_at'), 10) || 0;
    if (AUTH_ACCESS_TOKEN && AUTH_EXPIRES_AT - Math.floor(Date.now() / 1000) > 60) return true;
  }
  if (!AUTH_REFRESH_TOKEN) return false;
  const verstuurd = AUTH_REFRESH_TOKEN;
  try {
    const r = await fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: verstuurd }),
    });
    if (!r.ok) {
      // Alleen een echte weigering (400/401) wist de sessie, en alleen als geen
      // ander tabblad intussen een nieuwe heeft opgeslagen. Offline, 429 of 5xx: laten staan.
      if ((r.status === 400 || r.status === 401) && leesOpslag('reis_refresh_token') === verstuurd) clearAuthSession();
      return false;
    }
    saveAuthSession(await r.json());
    return true;
  } catch (e) { return false; }
}
// Geldige access-token, of '' als er geen sessie (meer) is. forceer = ook
// verversen als de token nog niet verlopen lijkt (na een 401 van de server).
async function huidigeAuthToken(forceer) {
  const nu = Math.floor(Date.now() / 1000);
  if (!forceer && AUTH_ACCESS_TOKEN && AUTH_EXPIRES_AT - nu > 60) return AUTH_ACCESS_TOKEN;
  if (AUTH_REFRESH_TOKEN || leesOpslag('reis_refresh_token')) {
    if (!bezigMetVerversen) bezigMetVerversen = refreshAuthSession().finally(() => { bezigMetVerversen = null; });
    if (await bezigMetVerversen) return AUTH_ACCESS_TOKEN;
  }
  return AUTH_ACCESS_TOKEN || '';
}

async function signIn(email, wachtwoord) {
  try {
    const r = await fetch(SB_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: wachtwoord }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { _error: true, message: authMelding(r.status, j, 'Inloggen mislukt.') };
    saveAuthSession(j);
    return { ok: true };
  } catch (e) { return { _error: true, message: 'Geen verbinding. Probeer het zo nog eens.' }; }
}
// Nederlandse melding bij een auth-fout; nooit de Engelse servertekst.
function authMelding(status, j, standaard) {
  const code = j.error_code || j.error || '';
  if (code === 'email_not_confirmed') return 'Je e-mailadres is nog niet bevestigd. Gebruik eerst de link uit de uitnodiging.';
  if (code === 'weak_password' || code === 'same_password') return code === 'same_password' ? 'Kies een ander wachtwoord dan het huidige.' : 'Dit wachtwoord is te zwak. Kies een langer wachtwoord.';
  if (status === 400 && (code === 'invalid_grant' || code === 'invalid_credentials')) return 'E-mail of wachtwoord klopt niet.';
  if (status === 429) return 'Te veel pogingen. Wacht even en probeer het dan opnieuw.';
  if (status === 401 || status === 403) return 'Je sessie is verlopen. Vraag een nieuwe link aan.';
  return standaard;
}
async function signOut() {
  const token = AUTH_ACCESS_TOKEN;
  await clearAuthSession();
  // Alleen dit apparaat uitloggen (scope=local), niet ook de telefoon of laptop ernaast.
  if (token) { try { await fetch(SB_URL + '/auth/v1/logout?scope=local', { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token } }); } catch (e) { /* offline: lokaal is hij toch weg */ } }
}
// Wachtwoord instellen na een uitnodigings- of resetlink.
async function zetWachtwoord(wachtwoord) {
  try {
    const r = await fetch(SB_URL + '/auth/v1/user', {
      method: 'PUT', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + await huidigeAuthToken(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: wachtwoord }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { _error: true, message: authMelding(r.status, j, 'Wachtwoord instellen mislukt.') };
    return { ok: true };
  } catch (e) { return { _error: true, message: 'Geen verbinding. Probeer het zo nog eens.' }; }
}
// Na een klik op een uitnodigings- of resetlink komt Supabase terug met de
// sessie in het URL-fragment (#access_token=…&type=invite). Die bewaren en
// het fragment meteen uit de adresbalk halen (ook bij andere types: nooit
// een token in de adresbalk laten staan). Geeft het type terug.
function verwerkAuthFragment() {
  if (!location.hash || location.hash.length < 2) return null;
  const p = new URLSearchParams(location.hash.slice(1));
  const type = p.get('type'), token = p.get('access_token');
  if (!token && !p.get('error_description')) return null;
  history.replaceState(null, '', location.pathname + location.search);
  if (p.get('error_description')) return 'fout';
  if (type !== 'invite' && type !== 'recovery') return null;
  saveAuthSession({ access_token: token, refresh_token: p.get('refresh_token') || '', expires_in: parseInt(p.get('expires_in'), 10) || 3600 });
  return type;
}

// ─── REST ───
// Altijd schema reis (Accept-Profile/Content-Profile). Fouten komen terug
// als { _error, status, message }, nooit als stille lege lijst.
// opties.vers: langs de cache van de service worker heen (alleen het netwerk; geen bewaarde versie als terugval).
async function sbFetch(path, method, body, extraHeaders, opties) {
  method = method || 'GET';
  const token = await huidigeAuthToken();
  if (!token) return { _error: true, status: 401, message: 'Niet ingelogd.' };
  const headers = Object.assign({
    apikey: SB_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json',
    'Accept-Profile': SCHEMA, 'Content-Profile': SCHEMA,
  }, (method === 'POST' || method === 'PATCH') ? { Prefer: 'return=representation' } : {}, extraHeaders || {});
  try {
    const r = await fetch(SB_URL + '/rest/v1/' + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, cache: opties && opties.vers ? 'no-store' : 'default' });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return { _error: true, status: r.status, message: j.message || j.error || r.statusText };
    }
    const data = (r.headers.get('content-type') || '').indexOf('json') > -1 ? await r.json() : true;
    // Een PATCH die 0 rijen teruggeeft raakte niets (RLS of onbekend ID): dat is een fout, geen succes.
    if (method === 'PATCH' && Array.isArray(data) && data.length === 0) {
      return { _error: true, status: r.status, message: 'Wijziging raakte geen enkele rij (geen toegang of onbekend ID); niets opgeslagen.' };
    }
    return data;
  } catch (e) { return { _error: true, status: 0, message: 'Geen verbinding.' }; }
}
// Schrijven met een paar herhaalpogingen bij een kortstondige hapering.
async function sbWrite(path, method, body, pogingen, extraHeaders) {
  pogingen = pogingen || 3;
  let r;
  for (let i = 0; i < pogingen; i++) {
    r = await sbFetch(path, method, body, extraHeaders);
    if (!(r && r._error)) return r;
    if (r.status >= 400 && r.status < 500) return r; // geweigerd: opnieuw proberen helpt niet
    if (i < pogingen - 1) await new Promise(res => setTimeout(res, 700 * (i + 1)));
  }
  return r;
}
function isFout(r) { return !r || r._error === true; }

// ─── FOTO'S ───
// De bucket is privé: per foto een tijdelijke, ondertekende URL (één
// aanroep voor alle paden). Het opslagpad blijft de vaste sleutel.
const FOTO_GELDIG_SEC = 24 * 3600;
async function tekenFotoUrls(paden) {
  if (!paden.length) return {};
  // Bij een fout: null (niet {}), zodat de app kan melden dat de foto's ontbreken.
  try {
    const r = await fetch(SB_URL + '/storage/v1/object/sign/' + FOTO_BUCKET, {
      method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + await huidigeAuthToken(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: FOTO_GELDIG_SEC, paths: paden }),
    });
    if (!r.ok) return null;
    const lijst = await r.json(), uit = {};
    lijst.forEach(x => { if (x.signedURL && !x.error) uit[x.path] = SB_URL + '/storage/v1' + x.signedURL; });
    return uit;
  } catch (e) { return null; }
}
// fotos-rijen ophalen voor een lijst ID's → { fotos: { id: rij + url }, fout }.
// fout = true als (een deel van) de foto's niet op te halen was; de pagina
// werkt dan zonder die foto's, maar meldt het.
async function haalFotos(ids) {
  ids = ids.filter((x, i) => x && ids.indexOf(x) === i);
  if (!ids.length) return { fotos: {}, fout: false };
  const rijen = await sbFetch('fotos?select=id,opslag_pad,fotograaf,bron,bron_url&id=in.(' + ids.join(',') + ')');
  if (isFout(rijen)) return { fotos: {}, fout: true };
  const urls = await tekenFotoUrls(rijen.map(f => f.opslag_pad));
  const fotos = {};
  rijen.forEach(f => { fotos[f.id] = Object.assign({}, f, { url: urls && urls[f.opslag_pad] }); });
  return { fotos: fotos, fout: !urls || rijen.some(f => !urls[f.opslag_pad]) };
}

// ─── DATALAAG: REIZEN ───
// Alle reizen voor het startscherm, met kaartfoto.
async function haalReizen() {
  const reizen = await sbFetch('reizen?select=id,slug,titel,jaar_label,ondertitel,stemming,status,status_label,kaart_status_label,nachten,start_datum,eind_datum,feiten,kaart_foto_id,hero_foto_id,volgorde&order=volgorde');
  if (isFout(reizen)) return reizen;
  const [f, rol] = await Promise.all([haalFotos(reizen.map(r => r.kaart_foto_id || r.hero_foto_id)), haalRol()]);
  const beheerder = rol === 'bewerker';
  const vergelijk = beheerder ? await haalVergelijk(reizen) : null;
  // Onderweg: de actieve reis (vanaf de dag vóór vertrek) bovenaan, en alvast helemaal op de telefoon.
  const actief = Opmaak.actieveReis(reizen, vandaagIso(beheerder));
  if (actief) voorlaadReis(actief.reis.slug);
  return { reizen: reizen, fotos: f.fotos, fotoFout: f.fout, vergelijk: vergelijk, actief: actief, beheerder: beheerder };
}
// Eigen rol (bewerker = beheerder, kijker); onbekend of fout → null.
async function haalRol() {
  const ik = mijnId();
  if (!ik) return null;
  const zelf = await sbFetch('leden?select=rol&user_id=eq.' + ik);
  return isFout(zelf) || !zelf[0] ? null : zelf[0].rol;
}
// Vergelijkingstabel op het startscherm, alleen voor de beheerder (haalReizen vraagt de rol).
// Gaat iets mis, dan null: het startscherm werkt gewoon zonder tabel.
async function haalVergelijk(reizen) {
  if (!reizen.length) return null;
  const delen = await Promise.all(['budget_posten?select=reis_id,label,totaal', 'stops?select=reis_id', 'route_punten?select=reis_id,volgorde,nachten,leg_vervoer,leg_opties,leg_minuten,leg_benadering',
    'activiteiten?select=id,reis_id', 'hartjes?select=user_id,activiteit_id', 'leden?select=user_id,groep'].map(p => sbFetch(p)));
  if (delen.some(isFout)) return null;
  // Een fout in het rekenen mag het startscherm nooit blokkeren.
  try {
    return Opmaak.vergelijk(reizen, { budget: delen[0], stops: delen[1], route: delen[2], activiteiten: delen[3], hartjes: delen[4], leden: delen[5] });
  } catch (e) { return null; }
}

// ─── ONDERWEG ───
// "Vandaag" = de datum op de klok van de telefoon, in de tijdzone waar je bent. Testen kan met
// ?vandaag=JJJJ-MM-DD, alleen lokaal of voor de beheerder; er wordt niets opgeslagen.
function vandaagIso(beheerder) {
  const p = new URLSearchParams(location.search).get('vandaag');
  const lokaal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (p && Opmaak.plusDagen(p, 0) && (lokaal || beheerder)) return p;
  return Opmaak.datumIn(new Date());
}
// Offline (besluit gebruiker 2026-10-04): tijdens een actieve reis, vanaf de dag vóór vertrek, de hele reis
// en al haar foto's op de achtergrond ophalen; de service worker bewaart ze. Mislukt het: de volgende keer.
// Hooguit één keer per dag per reis (stempel in localStorage); de reispagina zelf haalt altijd vers op.
async function voorlaadReis(slug) {
  const stempel = slug + '|' + Opmaak.datumIn(new Date());
  if (leesOpslag('reis-voorgeladen') === stempel) return;
  try {
    const d = await haalReis(slug);
    if (!d || isFout(d)) return;
    const fotos = await Promise.all(Object.keys(d.fotos).map(id => d.fotos[id].url ? fetch(d.fotos[id].url, { mode: 'cors', credentials: 'omit' }).then(r => r.ok, () => false) : true));
    if (!d.fotoFout && fotos.every(Boolean)) zetOpslag('reis-voorgeladen', stempel);
  } catch (e) { /* geen verbinding: de volgende keer */ }
}
// Blijft de app over middernacht open (of komt hij de volgende dag terug uit de achtergrond), dan opnieuw laden,
// zodat Vandaag meeschuift. Niet bij een tijdreis (?vandaag=), die staat vast.
const DAG_BIJ_START = Opmaak.datumIn(new Date());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !/[?&]vandaag=/.test(location.search) && Opmaak.datumIn(new Date()) !== DAG_BIJ_START) location.reload();
});

// Alleen route, verblijven en activiteiten van een reis, vers van het netwerk (na het versturen van wijzigingen).
// Dezelfde adressen als haalReis, zodat de service worker ook de offline kopie bijwerkt. Geen netwerk → fout.
async function haalReisVers(reisId) {
  const delen = await Promise.all(['route_punten', 'verblijven', 'activiteiten']
    .map(t => sbFetch(t + '?select=*&reis_id=eq.' + reisId + '&order=volgorde', 'GET', null, null, { vers: true })));
  const fout = delen.filter(isFout)[0];
  if (fout) return fout;
  return { route: delen[0], verblijven: delen[1], activiteiten: delen[2] };
}

// Eén reis met alles erbij, of null als die niet bestaat (of niet zichtbaar is).
const REIS_TABELLEN = ['stops', 'dagen', 'route_punten', 'verblijven', 'activiteiten', 'budget_posten'];
async function haalReis(slug) {
  const rij = await sbFetch('reizen?select=*&slug=eq.' + encodeURIComponent(slug));
  if (isFout(rij)) return rij;
  const reis = rij[0];
  if (!reis) return null;
  const delen = await Promise.all(REIS_TABELLEN.map(t => sbFetch(t + '?select=*&reis_id=eq.' + reis.id + '&order=volgorde')));
  const fout = delen.filter(isFout)[0];
  if (fout) return fout;
  const d = {};
  REIS_TABELLEN.forEach((t, i) => { d[t] = delen[i]; });
  // Plek-ID's moeten bij deze reis horen (de database dwingt dat nog niet af).
  const eigen = {};
  d.stops.forEach(s => { eigen[s.id] = true; });
  ['dagen', 'route_punten', 'verblijven', 'activiteiten'].forEach(t => {
    d[t].forEach(x => { if (x.stop_id && !eigen[x.stop_id]) x.stop_id = null; });
  });
  // Idem voor het routepunt van een dag (migratie 0012); een verblijfdag moet bij een bezoek aan zijn eigen plek horen.
  const punten = {};
  d.route_punten.forEach(p => { punten[p.id] = p; });
  d.dagen.forEach(x => {
    const p = x.route_punt_id && punten[x.route_punt_id];
    if (x.route_punt_id && (!p || (x.stop_id && p.stop_id !== x.stop_id))) x.route_punt_id = null;
  });
  const fotoIds = [reis.hero_foto_id, reis.quote_foto_id, reis.kaart_foto_id]
    .concat(d.stops.map(s => s.foto_id), d.verblijven.map(v => v.foto_id), d.activiteiten.map(a => a.foto_id));
  const [f, gezin, verslagen] = await Promise.all([haalFotos(fotoIds), haalGezin(d.activiteiten.map(a => a.id)),
    sbFetch('verslagen?select=datum,user_id,tekst,gewijzigd&reis_id=eq.' + reis.id + '&order=datum')]);
  return {
    reis: reis, stops: d.stops, dagen: d.dagen, route: d.route_punten, verblijven: d.verblijven,
    activiteiten: d.activiteiten, budget: d.budget_posten, fotos: f.fotos, fotoFout: f.fout, gezin: gezin,
    // Het verslag is een extra: lukt ophalen niet, dan werkt de reispagina gewoon (en meldt het verslag dat).
    verslagen: isFout(verslagen) ? [] : verslagen, verslagFout: isFout(verslagen),
  };
}

// ─── DATALAAG: REISVERSLAG ───
// Elke wijziging gaat meteen naar de telefoon (wachtrij in localStorage), ook als de app daarna dicht gaat;
// versturen gebeurt daarna: bij typen (na een korte pauze), bij het openen van de app, als er weer verbinding
// is en als de app naar de achtergrond gaat. Na aankomst blijft je laatste versie als eigen kopie staan
// (verzonden: true), zodat een verouderde kopie uit de cache je tekst nooit vervangt; de database laat een
// oudere versie een nieuwere ook nooit overschrijven (migratie …0020).
const VERSLAG_WACHT = 'reis-verslag-wachtrij';
function leesWachtrij() { return Opmaak.wachtrijLees(leesOpslag(VERSLAG_WACHT)); }
function bewaarWachtrij(w) { return zetOpslag(VERSLAG_WACHT, Object.keys(w).length ? JSON.stringify(w) : ''); }
function wachtSleutel(reisId, datum, ik) { return reisId + '|' + datum + '|' + ik; }
// Je eigen laatste versie van deze dag op dit toestel (verstuurd of niet), of null.
function verslagConcept(reisId, datum) {
  const ik = mijnId();
  return ik ? leesWachtrij()[wachtSleutel(reisId, datum, ik)] || null : null;
}
// Meteen op de telefoon bewaren. Uitslag: 'ok', 'uitgelogd' (kan niet aan jou gekoppeld worden) of 'vol'
// (opslag van de telefoon vol of geblokkeerd: niet bewaard).
function zetVerslagConcept(reisId, datum, tekst) {
  const ik = mijnId();
  if (!ik) return 'uitgelogd';
  const w = leesWachtrij(), k = wachtSleutel(reisId, datum, ik);
  w[k] = { reis_id: reisId, datum: datum, user_id: ik, tekst: tekst, gewijzigd: new Date().toISOString(), verzonden: false, fout: null };
  if (!bewaarWachtrij(w)) return 'vol';
  const terug = leesWachtrij()[k];
  return terug && terug.tekst === tekst ? 'ok' : 'vol';
}
// Staat er van jou nog iets dat nog kan aankomen? (waarschuwing bij uitloggen; geweigerde items tellen niet)
function heeftOnverzondenVerslag() {
  const ik = mijnId(), w = leesWachtrij();
  return !!ik && Object.keys(w).some(k => w[k].user_id === ik && !w[k].verzonden && !w[k].fout);
}
// Eén verzendronde tegelijk; komt er intussen iets bij, dan nog een ronde. Items van een ander account op dit
// toestel blijven staan tot die weer inlogt. Per item wordt bijgehouden of het is aangekomen of geweigerd.
// Geweigerd (4xx, behalve een verlopen sessie) wordt niet opnieuw geprobeerd tot je de tekst aanpast.
// Verstuurde kopieën ouder dan 60 dagen worden opgeruimd (de server heeft ze; de wachtrij blijft klein).
const OPRUIMEN_NA_MS = 60 * 24 * 3600 * 1000;
let versturen = null, nogEenRonde = false;
async function verzendRonde() {
  const ik = mijnId();
  let w = leesWachtrij();
  const oud = Object.keys(w).filter(k => w[k].verzonden && Date.now() - Date.parse(w[k].gewijzigd) > OPRUIMEN_NA_MS);
  if (oud.length) { oud.forEach(k => { delete w[k]; }); bewaarWachtrij(w); }
  for (const k of Object.keys(w)) {
    const x = w[k];
    if (!ik || x.user_id !== ik || x.verzonden || x.fout) continue;
    const r = await sbWrite('verslagen?on_conflict=reis_id,datum,user_id', 'POST',
      { reis_id: x.reis_id, datum: x.datum, tekst: x.tekst, gewijzigd: x.gewijzigd }, 2, { Prefer: 'resolution=merge-duplicates,return=minimal' });
    if (isFout(r) && (r.status === 0 || r.status === 401 || r.status >= 500)) break; // later opnieuw
    const nu = leesWachtrij();
    if (nu[k] && nu[k].gewijzigd === x.gewijzigd && nu[k].tekst === x.tekst) {
      nu[k] = Object.assign({}, nu[k], isFout(r) ? { fout: r.message || ('fout ' + r.status) } : { verzonden: true, fout: null });
      bewaarWachtrij(nu);
    }
  }
}
function verstuurVerslagen() {
  if (versturen) { nogEenRonde = true; return versturen; }
  nogEenRonde = false;
  // Altijd asynchroon (ook met een lege wachtrij), zodat "bezig" pas na de ronde vrijkomt.
  versturen = Promise.resolve().then(verzendRonde).catch(() => {})
    .then(() => {
      versturen = null;
      if (nogEenRonde) return verstuurVerslagen();
      // Schermen laten weten dat de wachtrij is bijgewerkt (ook na versturen op de achtergrond).
      window.dispatchEvent(new CustomEvent('reis-verslag-verstuurd'));
    });
  return versturen;
}
window.addEventListener('online', () => { if (isIngelogd()) verstuurVerslagen(); });
// App naar de achtergrond of dicht: nog één poging (het concept staat al op de telefoon).
window.addEventListener('pagehide', () => { if (isIngelogd()) verstuurVerslagen(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && isIngelogd()) verstuurVerslagen(); });

// ─── DATALAAG: BEWERKEN ONDERWEG (besluit gebruiker 2026-10-05) ───
// Ouders wijzigen onderweg tijden, adres, contact, codes, betaalstatus en notities, en voegen activiteiten toe.
// Zelfde patroon als het reisverslag: eerst op de telefoon (wachtrij per veld), dan versturen; zonder bereik
// later. De laatste synchronisatie overschrijft (besluit gebruiker). Per veld, zodat twee ouders die elk een
// ander veld wijzigen elkaar niet overschrijven. Wijzigingen in de app winnen van de Excel (CLAUDE.md).
const WIJZIG_WACHT = 'reis-wijziging-wachtrij';
function leesWijzigingen() { return Opmaak.wijzigWachtrijLees(leesOpslag(WIJZIG_WACHT)); }
function bewaarWijzigingen(w) { return zetOpslag(WIJZIG_WACHT, Object.keys(w).length ? JSON.stringify(w) : ''); }
// Items van jou (elk item onthoudt van wie het is: een ander account op dit toestel verstuurt of ziet het niet).
function eigenWijzigingen(filter) {
  const ik = mijnId(), w = leesWijzigingen();
  return Object.keys(w).filter(k => ik && w[k].user_id === ik && (!filter || filter(w[k])));
}
// Velden opslaan (al gecontroleerd met Opmaak.valideerWijziging). Uitslag 'ok', 'uitgelogd' of 'vol'.
function zetWijziging(tabel, id, velden) {
  const ik = mijnId();
  if (!ik) return 'uitgelogd';
  const w = leesWijzigingen(), nu = new Date().toISOString();
  Object.keys(velden).forEach(veld => { w[tabel + '|' + id + '|' + veld] = { tabel: tabel, id: id, veld: veld, waarde: velden[veld], gewijzigd: nu, user_id: ik, verzonden: false, fout: null }; });
  return bewaarWijzigingen(w) ? 'ok' : 'vol';
}
// Nieuwe activiteit; het ID maakt de app zelf (opnieuw versturen geeft nooit een dubbele rij), de volgorde de
// database (migratie …0022), zodat twee nieuwe activiteiten nooit botsen.
function nieuweActiviteit(rij) {
  const ik = mijnId();
  if (!ik) return 'uitgelogd';
  const w = leesWijzigingen();
  w['nieuw|' + rij.id] = { tabel: 'activiteiten', id: rij.id, nieuw: true, rij: rij, gewijzigd: new Date().toISOString(), user_id: ik, verzonden: false, fout: null };
  return bewaarWijzigingen(w) ? 'ok' : 'vol';
}
function heeftOnverzondenWijziging() { return eigenWijzigingen(x => !x.verzonden && !x.fout).length > 0; }
// Geweigerde wijzigingen weggooien (knop "Verwerpen"); de waarde op de server blijft dan staan.
function wisGeweigerdeWijzigingen() {
  const w = leesWijzigingen();
  eigenWijzigingen(x => !!x.fout).forEach(k => { delete w[k]; });
  bewaarWijzigingen(w);
}
// Verstuurde kopieën van vóór dit moment zijn overbodig zodra de reis opnieuw van de server is gehaald.
function vergeetVerzondenWijzigingen(voor) {
  const w = leesWijzigingen();
  eigenWijzigingen(x => x.verzonden && x.gewijzigd < voor).forEach(k => { delete w[k]; });
  bewaarWijzigingen(w);
}
// Eén ronde: eerst nieuwe rijen (een wijziging kan erover gaan), dan per rij alle gewijzigde velden in één PATCH.
// Geslaagd → verzonden (kopie blijft staan tot de volgende verse ophaalronde, max. 2 dagen); geweigerd → fout;
// geen verbinding, verlopen sessie of serverfout → stoppen en later opnieuw. Uitslag: aantal verstuurde items.
let wijzigVersturen = null, wijzigNogEens = false;
async function wijzigRonde() {
  let w = leesWijzigingen(), verstuurd = 0;
  const oud = Object.keys(w).filter(k => w[k].verzonden && Date.now() - Date.parse(w[k].verzondenOp || w[k].gewijzigd) > 2 * 24 * 3600 * 1000);
  if (oud.length) { oud.forEach(k => { delete w[k]; }); bewaarWijzigingen(w); }
  const open = eigenWijzigingen(x => !x.verzonden && !x.fout);
  const perRij = {};
  open.filter(k => !w[k].nieuw).forEach(k => { const r = w[k].tabel + '|' + w[k].id; (perRij[r] = perRij[r] || []).push(k); });
  const klaar = (sleutels, r, versie) => {
    const nu = leesWijzigingen();
    sleutels.forEach(k => {
      if (!nu[k] || nu[k].gewijzigd !== versie[k]) return; // intussen opnieuw gewijzigd: die versie gaat de volgende ronde
      nu[k] = Object.assign({}, nu[k], isFout(r) ? { fout: r.message || ('fout ' + r.status) } : { verzonden: true, verzondenOp: new Date().toISOString(), fout: null });
      if (!isFout(r)) verstuurd++;
    });
    bewaarWijzigingen(nu);
  };
  const later = r => isFout(r) && (r.status === 0 || r.status === 401 || r.status >= 500);
  for (const k of open.filter(k => w[k].nieuw)) {
    const x = w[k];
    const r = await sbWrite('activiteiten?on_conflict=id', 'POST', x.rij, 2, { Prefer: 'resolution=ignore-duplicates,return=minimal' });
    if (later(r)) return verstuurd;
    klaar([k], r, { [k]: x.gewijzigd });
  }
  for (const rij of Object.keys(perRij)) {
    const sleutels = perRij[rij], eerste = w[sleutels[0]], velden = {}, versie = {};
    sleutels.forEach(k => { velden[w[k].veld] = w[k].waarde; versie[k] = w[k].gewijzigd; });
    const r = await sbWrite(eerste.tabel + '?id=eq.' + encodeURIComponent(eerste.id), 'PATCH', velden, 2);
    if (later(r)) return verstuurd;
    klaar(sleutels, r, versie);
  }
  return verstuurd;
}
// Na de ronde een gebeurtenis met het aantal verstuurde items (de reispagina haalt dan, en alleen dan, opnieuw op).
function verstuurWijzigingen() {
  if (wijzigVersturen) { wijzigNogEens = true; return wijzigVersturen; }
  wijzigNogEens = false;
  wijzigVersturen = Promise.resolve().then(wijzigRonde).catch(() => 0)
    .then(n => {
      wijzigVersturen = null;
      if (wijzigNogEens) return verstuurWijzigingen();
      window.dispatchEvent(new CustomEvent('reis-wijziging-verstuurd', { detail: { verstuurd: n || 0 } }));
    });
  return wijzigVersturen;
}
function verstuurAlles() { verstuurVerslagen(); verstuurWijzigingen(); }
window.addEventListener('online', () => { if (isIngelogd()) verstuurWijzigingen(); });
window.addEventListener('pagehide', () => { if (isIngelogd()) verstuurWijzigingen(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && isIngelogd()) verstuurWijzigingen(); });

// ─── DATALAAG: GEZIN (groep per lid en hartjes) ───
// Eigen user-ID uit de access-token (JWT, veld sub); geen geldige token → null.
function mijnId() {
  try {
    const deel = (AUTH_ACCESS_TOKEN || '').split('.')[1];
    return deel ? JSON.parse(atob(deel.replace(/-/g, '+').replace(/_/g, '/'))).sub || null : null;
  } catch (e) { return null; }
}
// Leden (naam, groep) en de hartjes bij deze activiteiten. Lukt dat niet, dan
// werkt de reispagina gewoon zonder hartjes (werkt: false), want dit is een extra.
async function haalGezin(activiteitIds) {
  const ik = mijnId();
  const leden = await sbFetch('leden?select=user_id,weergavenaam,groep,rol');
  const hartjes = activiteitIds.length
    ? await sbFetch('hartjes?select=user_id,activiteit_id,aangemaakt&activiteit_id=in.(' + activiteitIds.join(',') + ')&order=aangemaakt')
    : [];
  if (isFout(leden) || isFout(hartjes)) return { werkt: false, leden: [], hartjes: [], mijnId: ik, groep: null, beheerder: false };
  const zelf = leden.filter(l => l.user_id === ik)[0];
  return { werkt: true, leden: leden, hartjes: hartjes, mijnId: ik, groep: (zelf && zelf.groep) || null, beheerder: !!zelf && zelf.rol === 'bewerker' };
}
// Hartje geven (aan) of weghalen bij een activiteit; alleen het eigen hartje (RLS).
// Bestaat het al (herhaalpoging na een hapering, of verouderde data uit de offline-cache),
// dan is dat geen fout: dubbel wordt genegeerd. Weghalen van iets dat er niet is, is ook goed.
async function zetHartje(activiteitId, aan) {
  if (aan) return sbWrite('hartjes?on_conflict=user_id,activiteit_id', 'POST', { activiteit_id: activiteitId }, 3,
    { Prefer: 'return=representation,resolution=ignore-duplicates' });
  const ik = mijnId();
  if (!ik) return { _error: true, status: 401, message: 'Niet ingelogd.' };
  return sbWrite('hartjes?activiteit_id=eq.' + activiteitId + '&user_id=eq.' + ik, 'DELETE');
}
