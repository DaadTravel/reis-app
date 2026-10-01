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
function zetOpslag(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* geen opslag: alleen deze sessie */ } }

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
async function sbFetch(path, method, body, extraHeaders) {
  method = method || 'GET';
  const token = await huidigeAuthToken();
  if (!token) return { _error: true, status: 401, message: 'Niet ingelogd.' };
  const headers = Object.assign({
    apikey: SB_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json',
    'Accept-Profile': SCHEMA, 'Content-Profile': SCHEMA,
  }, (method === 'POST' || method === 'PATCH') ? { Prefer: 'return=representation' } : {}, extraHeaders || {});
  try {
    const r = await fetch(SB_URL + '/rest/v1/' + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
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
async function sbWrite(path, method, body, pogingen) {
  pogingen = pogingen || 3;
  let r;
  for (let i = 0; i < pogingen; i++) {
    r = await sbFetch(path, method, body);
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
  const reizen = await sbFetch('reizen?select=id,slug,titel,jaar_label,ondertitel,stemming,status,status_label,kaart_status_label,nachten,kaart_foto_id,hero_foto_id,volgorde&order=volgorde');
  if (isFout(reizen)) return reizen;
  const f = await haalFotos(reizen.map(r => r.kaart_foto_id || r.hero_foto_id));
  return { reizen: reizen, fotos: f.fotos, fotoFout: f.fout };
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
    .concat(d.stops.map(s => s.foto_id), d.verblijven.map(v => v.foto_id));
  const f = await haalFotos(fotoIds);
  return {
    reis: reis, stops: d.stops, dagen: d.dagen, route: d.route_punten, verblijven: d.verblijven,
    activiteiten: d.activiteiten, budget: d.budget_posten, fotos: f.fotos, fotoFout: f.fout,
  };
}
