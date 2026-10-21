// PSM Vaccine Clinic: the app code. Index.html loads this file from GitHub (see the loader at the end of Index.html).
/* ===================== constants ===================== */
const VACCINES = {
  'Flu':            { short: 'Flu', ravs: 'Flu', target: 'RAVS', main: true },
  'COVID-19':       { short: 'COVID', ravs: 'COVID-19', target: 'RAVS', main: true },
  'Nasal flu':      { short: 'Nasal', ravs: 'Flu', target: 'RAVS' },
  'MMR':            { short: 'MMR', ravs: 'MMR', target: 'RAVS' },
  'MenB':           { short: 'MenB', ravs: 'MenB', target: 'RAVS' },
  'Pneumococcal':   { short: 'PPV', ravs: '', target: 'PPV record' },
  'Private flu':    { short: 'Private flu', ravs: '', target: 'Private', private: true, nhs: 'Flu' },
  'Private COVID':  { short: 'Private COVID', ravs: '', target: 'Private', private: true, nhs: 'COVID-19' },
};
const PRIV_BY = 'Private, not for RAVS';
const isPriv = r => !!VACCINES[typeof r === 'string' ? r : r.vaccine]?.private;
const priceOf = (v, st = S) => +((st.prices || {})[v] ?? DEFAULT_SETTINGS.prices[v] ?? 0);
const money = n => '£' + (Math.round(n * 100) / 100).toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0 });
const RAVS_REASONS = ['Based on age', 'Healthcare worker', 'Pregnant', 'In a clinical risk group', 'Resident in a care home', 'Carer', 'Social care worker', 'Household contact of someone immunosuppressed', 'Homeless'];
const FLU_UNDER_REASONS = RAVS_REASONS.slice(1);
const COVID_UNDER_REASONS = ['In a clinical risk group', 'Resident in a care home'];
const SITES = ['Left upper arm', 'Right upper arm', 'Somewhere else'];
const CONSENTS = ['Patient', "Clinician acting in the patient's best interests", 'Person with lasting power of attorney for health and welfare', 'Parent or guardian', 'Independent mental capacity advocate', 'Court appointed deputy'];
const STATUS_LABEL = { booked: 'Booked', waiting: 'Waiting', given: 'Given', entered: 'On record', notgiven: 'Not given', checkedin: 'Checked in' };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* ===================== small helpers ===================== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayIso = () => isoDate(new Date());
const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

function ukDate(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
function longDate(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; }
function parseDob(s) {
  s = String(s || '').trim();
  let m = s.match(/^(\d{1,2})[\/\.\-\s](\d{1,2})[\/\.\-\s](\d{2,4})$/) || s.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) { const t = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/); if (t) { const mi = MONTHS.findIndex(x => x.toLowerCase().startsWith(t[2].toLowerCase().slice(0, 3))); if (mi >= 0) m = [0, t[1], mi + 1, t[3]]; } }
  if (!m) return null;
  let [_, d, mo, y] = m; d = +d; mo = +mo; y = +y;
  if (y < 100) y += y > (new Date().getFullYear() % 100) ? 1900 : 2000;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  if (dt > new Date()) return null;
  return isoDate(dt);
}
function ageOn(dobIso, onIso) {
  if (!dobIso) return null;
  const [by, bm, bd] = dobIso.split('-').map(Number), [y, m, d] = onIso.split('-').map(Number);
  let a = y - by; if (m < bm || (m === bm && d < bd)) a--; return a;
}
function cleanNhs(s) { return String(s || '').replace(/\D/g, ''); }
function fmtNhs(s) { s = cleanNhs(s); return s.length === 10 ? `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}` : s; }
function nhsValid(s) {
  s = cleanNhs(s); if (!/^\d{10}$/.test(s)) return false;
  let sum = 0; for (let i = 0; i < 9; i++) sum += +s[i] * (10 - i);
  let c = 11 - (sum % 11); if (c === 11) c = 0; if (c === 10) return false; return c === +s[9];
}
function fmtPostcode(s) { s = String(s || '').toUpperCase().replace(/\s+/g, ''); return s.length > 3 ? s.slice(0, -3) + ' ' + s.slice(-3) : s; }
function daysBetween(aIso, bIso) { return Math.round((new Date(bIso) - new Date(aIso)) / 86400000); }
function fullName(r) { return `${(r.surname || '').toUpperCase()}${r.given ? ', ' + r.given : ''}`; }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2600); }
async function copyText(text, btn) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch (e2) {} ta.remove();
  }
  if (btn) { btn.textContent = ok ? 'Copied' : 'Select'; btn.classList.toggle('done', ok); setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('done'); }, 1500); }
}

/* ===================== eligibility ===================== */
function checkEligibility(vaccine, dobIso, S) {
  const today = todayIso();
  const ageNow = ageOn(dobIso, today);
  if (!dobIso) return { state: 'unknown', text: 'Enter date of birth to check' };
  if (vaccine === 'Flu') {
    const a = ageOn(dobIso, S.fluDate);
    if (a >= S.fluAge) return { state: 'age', text: `${a} by ${ukDate(S.fluDate)}, eligible by age`, product: 'aTIV' };
    if (ageNow < 18) return { state: 'blocked', text: `Age ${ageNow}. The adult service is 18 and over.` };
    return { state: 'reason', text: `Age ${ageNow}, under ${S.fluAge}. The patient needs to give a reason.`, reasons: FLU_UNDER_REASONS, product: 'TIVc' };
  }
  if (vaccine === 'COVID-19') {
    const a = ageOn(dobIso, S.covDate);
    if (a >= S.covAge) return { state: 'age', text: `${a} by ${ukDate(S.covDate)}, eligible by age` };
    if (ageNow < 18) return { state: 'blocked', text: `Age ${ageNow}. Pharmacy COVID vaccination is 18 and over.` };
    return { state: 'reason', text: `Age ${ageNow}, under ${S.covAge}. Only immunosuppressed patients or care home residents qualify.`, reasons: COVID_UNDER_REASONS };
  }
  if (VACCINES[vaccine]?.private) {
    if (ageNow < 18) return { state: 'blocked', text: `Age ${ageNow}. Private vaccination is 18 and over.` };
    return { state: 'age', text: `Private, ${money(priceOf(vaccine, S))} · age ${ageNow}` };
  }
  if (vaccine === 'Nasal flu') {
    if (S.nasalFrom && S.nasalTo && (dobIso < S.nasalFrom || dobIso > S.nasalTo)) return { state: 'blocked', short: 'born outside the age range', text: `Born outside ${ukDate(S.nasalFrom)} to ${ukDate(S.nasalTo)}, so not eligible by age.` };
    return { state: 'age', text: 'Date of birth is in the 2 to 3 year old range' };
  }
  return { state: 'free', text: '' };
}
function defaultProduct(vaccine, dobIso, S) {
  const prods = (S.products || []).filter(p => p.vaccine === vaccine && p.active);
  if (vaccine === 'Flu') {
    const a = dobIso ? ageOn(dobIso, S.fluDate) : null;
    const want = a != null && a >= S.fluAge ? /aTIV|adjuvant/i : /TIVc|cell/i;
    return (prods.find(p => want.test(p.product)) || prods[0] || {}).product || '';
  }
  return (prods[0] || {}).product || '';
}
function batchFor(product, S, vaccine) { const ps = (S.products || []).filter(p => p.product === product && p.active); const p = ps.find(x => x.vaccine === vaccine) || ps[0]; return p ? p.batch : ''; }

/* ===================== booking paste parser ===================== */
// The day heading in a copied page ("Monday 19 October 2026"), so the date doesn't have to be picked by hand.
function bookingsDate(text) {
  const m = String(text).match(/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})\b/);
  return m ? parseDob(m[1]) : '';
}
function parseBookings(text, dateIso) {
  const out = [];
  const lines = String(text).replace(/\r/g, '').split('\n').map(l => l.replace(/\t+/g, ' | ').trim()).filter(Boolean);
  const joined = lines.join(' \u0001 ');
  const parts = joined.split(/(?:^|\u0001)\s*(?=\d{2}:\d{2}\b)/);
  for (const raw of parts) {
    const p = raw.replace(/\u0001/g, ' ').replace(/\s+/g, ' ').trim();
    const tm = p.match(/^(\d{2}:\d{2})\b/); if (!tm) continue;
    const nhs = p.match(/\b(\d{3}\s?\d{3}\s?\d{4})\b/);
    const dobm = p.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i);
    if (!dobm) continue;
    const dob = parseDob(`${dobm[1]} ${dobm[2]} ${dobm[3]}`);
    const nameEnd = nhs ? p.indexOf(nhs[0]) : p.indexOf(dobm[0]);
    let name = p.slice(tm[0].length, nameEnd).replace(/\|/g, ' ').trim();
    const words = name.split(/\s+/).filter(Boolean);
    const surname = words.length > 1 ? words.pop() : (words[0] || '');
    const given = words.join(' ');
    const svc = p.slice(p.indexOf(dobm[0]) + dobm[0].length);
    const vax = [];
    const s = svc.toLowerCase();
    if (/flu 2 to 3/.test(s)) vax.push('Nasal flu');
    else if (/flu/.test(s)) vax.push('Flu');
    if (/covid/.test(s)) vax.push('COVID-19');
    const service = (svc.match(/(Flu and COVID[^|]*?(?:65\+|18 to 64)|Flu 65\+|Flu 18 to 64|Flu 2 to 3|COVID 18\+|COVID 12 to 17)/i) || [''])[0];
    const ph = svc.match(/(?:\+44\s?|0)7\d{3}\s?\d{6}\b/);
    const phone = ph ? ph[0].replace(/\s/g, '').replace(/^\+44/, '0') : '';
    out.push({ time: tm[1], given: titleCase(given), surname: surname.toUpperCase(), nhs: nhs ? cleanNhs(nhs[1]) : '', dob, phone, vaccines: vax.length ? vax : ['Flu'], service, date: dateIso });
  }
  return out;
}
function titleCase(s) { return String(s || '').toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()); }

/* ===================== data layer ===================== */
const DEFAULT_SETTINGS = {
  products: [
    { vaccine: 'Flu', product: 'Adjuvanted Trivalent Influenza Vaccine (aTIV)', batch: '', expiry: '', active: true },
    { vaccine: 'Flu', product: 'Cell-based Trivalent Influenza Vaccine (TIVc)', batch: '', expiry: '', active: true },
    { vaccine: 'COVID-19', product: 'COVID-19 vaccine (set product)', batch: '', expiry: '', active: true },
    { vaccine: 'Nasal flu', product: 'Fluenz (LAIV)', batch: '', expiry: '', active: true },
    { vaccine: 'Private flu', product: 'Private flu vaccine', batch: '', expiry: '', active: true },
    { vaccine: 'Private COVID', product: 'Private COVID vaccine', batch: '', expiry: '', active: true },
  ],
  prices: { 'Private flu': 25, 'Private COVID': 98 },
  vaccinators: [], staff: [], vaccinator: '', site: 'Left upper arm', consent: 'Patient',
  locations: ['Pharmacy', 'Off-site: Kingston Council'],
  fluAge: 65, fluDate: '2027-03-31', covAge: 75, covDate: '2027-01-31', seasonStart: '2026-09-01',
  nasalFrom: '2022-09-01', nasalTo: '2024-08-31',
};

const hasGas = typeof google !== 'undefined' && google.script && google.script.run;
function gas(fn, ...args) {
  return new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn](...args));
}

/* Demo backend: same calls as Code.gs, kept in this browser only. */
const Demo = (() => {
  const KEY = 'psmClinicDemo.v3';
  let db = store.get(KEY, null);
  function save() { db.version++; store.set(KEY, db); }
  function nhsWithCheck(base9) { for (;;) { let sum = 0; for (let i = 0; i < 9; i++) sum += +base9[i] * (10 - i); let c = 11 - (sum % 11); if (c === 11) c = 0; if (c !== 10) return base9 + c; base9 = String(+base9 + 1); } }
  function seed() {
    const t = todayIso(), y = isoDate(new Date(Date.now() - 86400000)), old = isoDate(new Date(Date.now() - 11 * 86400000));
    const S = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    S.products[0].batch = 'DEMO-A101'; S.products[0].expiry = '2027-05-01';
    S.products[1].batch = 'DEMO-C202'; S.products[1].expiry = '2027-04-01';
    S.products[2].product = 'Comirnaty (demo)'; S.products[2].batch = 'DEMO-P303'; S.products[2].expiry = '2027-02-01';
    S.products[3].batch = 'DEMO-L404'; S.products[3].expiry = '2027-01-15';
    S.products[4].batch = 'DEMO-PF55'; S.products[4].expiry = '2027-04-30';
    S.products[5].batch = 'DEMO-PC66'; S.products[5].expiry = '2027-02-28';
    S.vaccinators = ['A. Vaccinator', 'B. Pharmacist']; S.vaccinator = 'A. Vaccinator'; S.staff = ['Front desk 1', 'Front desk 2'];
    const people = [
      ['Sample', 'Alice', '1948-02-14', 'KT6 1AA', ['Flu', 'COVID-19'], 'entered', y],
      ['Example', 'Brian', '1955-07-30', 'KT6 2BB', ['Flu'], 'given', y],
      ['Testcase', 'Carol', '1950-11-02', 'KT5 3CC', ['Flu', 'COVID-19'], 'given', old],
      ['Dummy', 'David', '1944-03-09', 'KT6 4DD', ['Flu', 'COVID-19'], 'given', t],
      ['Placeholder', 'Erin', '1986-05-21', 'KT6 5EE', ['Flu'], 'given', t],
      ['Mockford', 'Frank', '1952-09-17', 'KT5 6FF', ['Flu'], 'given', t],
      ['Fakeley', 'Grace', '1979-12-03', 'KT6 7GG', ['Flu', 'COVID-19'], 'given', t],
      ['Notreal', 'Harry', '1940-06-25', 'KT6 8HH', ['Flu', 'COVID-19'], 'booked', t],
      ['Pretend', 'Isla', '1962-01-11', 'KT5 9JJ', ['Flu'], 'booked', t],
      ['Madeup', 'Jack', '1947-04-22', 'KT6 1KK', ['Flu', 'COVID-19'], 'entered', t],
      ['Sampleton', 'Kate', '1958-08-05', 'KT5 2LL', ['Flu'], 'entered', t],
      ['Trialson', 'Liam', '1949-10-19', 'KT6 3MM', ['COVID-19'], 'entered', t],
      ['Exemplar', 'Mona', '1953-02-27', 'KT6 4NN', ['Flu'], 'entered', t],
      ['Fictional', 'Ned', '1945-12-12', 'KT5 5PP', ['Flu', 'COVID-19'], 'entered', t],
      ['Privateer', 'Olive', '1990-06-14', 'KT6 6QQ', ['Private flu'], 'entered', t],
      ['Paidfor', 'Paul', '1972-03-03', 'KT5 7RR', ['Private flu', 'Private COVID'], 'entered', t],
      ['Selfpay', 'Rita', '1981-09-09', 'KT6 8SS', ['Private COVID'], 'entered', y],
    ];
    const rows = [];
    people.forEach((p, i) => {
      const visitId = uid() + i, nhs = nhsWithCheck('99900' + String(1000 + i * 37).padStart(4, '0'));
      p[4].forEach(v => {
        const prod = defaultProduct(v, p[2], S);
        const e = checkEligibility(v, p[2], S);
        const tm = p[5] === 'booked' ? `1${i % 5}:${i % 2 ? '30' : '00'}` : `${pad(9 + Math.floor(i / 3))}:${pad((i * 17) % 60)}`;
        rows.push({ id: uid() + i + v.length, visitId, date: p[6], time: tm, source: p[5] === 'booked' ? 'Booked' : 'Walk-in',
          nhs, surname: p[0].toUpperCase(), given: p[1], dob: p[2], postcode: p[3], phone: '', vaccine: v, product: prod,
          batch: ['given', 'entered'].includes(p[5]) ? batchFor(prod, S, v) : '', eligibility: VACCINES[v].private ? 'Private' : e.state === 'age' ? 'Based on age' : 'In a clinical risk group', eligNote: e.state === 'age' ? '' : 'Asthma (demo)',
          consent: 'Patient', site: 'Left upper arm', vaccinator: ['given', 'entered'].includes(p[5]) ? 'A. Vaccinator' : '', deskBy: 'Front desk 1', location: 'Pharmacy',
          status: p[5], givenAt: ['given', 'entered'].includes(p[5]) ? `${p[6]} ${tm}` : '', enteredAt: p[5] === 'entered' ? (p[6] === t ? `${t} ${pad(10 + Math.floor(i / 3))}:${pad((i * 17 + 5) % 60)}` : p[6] + ' 17:40') : '', enteredBy: p[5] === 'entered' ? (VACCINES[v].private ? PRIV_BY : 'Front desk 2') : '', note: '', updatedAt: new Date().toISOString() });
      });
    });
    // a few earlier days for the season table
    for (let k = 2; k <= 9; k++) {
      const d = isoDate(new Date(Date.now() - k * 86400000));
      const n = 40 + ((k * 23) % 60);
      for (let j = 0; j < n; j++) {
        const v = j % 3 === 0 ? 'COVID-19' : 'Flu';
        rows.push({ id: uid() + k + '_' + j, visitId: 'h' + k + '_' + j, date: d, time: '10:00', source: j % 4 ? 'Walk-in' : 'Booked', nhs: '', surname: 'HISTORIC', given: 'Demo', dob: '1950-01-01', postcode: '', phone: '', vaccine: v, product: '', batch: '', eligibility: 'Based on age', eligNote: '', consent: 'Patient', site: 'Left upper arm', vaccinator: j % 2 ? 'A. Vaccinator' : 'B. Pharmacist', deskBy: '', location: 'Pharmacy', status: k === 11 ? 'given' : 'entered', givenAt: d + ' 10:00', enteredAt: d + ' 18:00', enteredBy: '', note: '', updatedAt: '' });
      }
    }
    db = { version: 1, settings: S, rows };
    store.set(KEY, db);
  }
  if (!db || !db.rows) seed();
  const api = {
    async board(version, today) {
      if (version === db.version) return { unchanged: true, version };
      return boardFrom(db.rows, db.settings, db.version, today);
    },
    async register(visit) {
      if (visit.bookingVisitId) db.rows.forEach(r => { if (r.visitId === visit.bookingVisitId && r.status === 'booked') { r.status = 'checkedin'; r.updatedAt = new Date().toISOString(); } });
      visit.rows.forEach(r => db.rows.push(r)); save(); return { ok: true, version: db.version };
    },
    async update(ids, patch) { db.rows.forEach(r => { if (ids.includes(r.id)) { Object.assign(r, patch); r.updatedAt = new Date().toISOString(); } }); save(); return { ok: true }; },
    async updateEach(changes) { changes.forEach(c => { const r = db.rows.find(x => x.id === c.id); if (r) { Object.assign(r, c.patch); r.updatedAt = new Date().toISOString(); } }); save(); return { ok: true }; },
    async importBookings(rows) { const have = new Set(db.rows.filter(r => r.status === 'booked' || r.status === 'checkedin').map(r => r.date + '|' + r.nhs + '|' + r.dob)); let n = 0; const seen = new Set(); rows.forEach(r => { const k = r.date + '|' + r.nhs + '|' + r.dob; if (have.has(k)) return; db.rows.push(r); seen.add(r.visitId); }); n = seen.size; save(); return { added: n }; },
    async search(q, seasonStart) { return searchRows(db.rows, q, seasonStart); },
    async saveSettings(s) { db.settings = s; save(); return { ok: true }; },
    async exportRows(from, to) { return db.rows.filter(r => r.date >= from && r.date <= to && r.status !== 'checkedin'); },
  };
  return api;
})();

/* Shared by both backends (Code.gs has the same logic for the real sheet). */
function boardFrom(rows, settings, version, today) {
  const live = rows.filter(r => r.date === today || r.status === 'given');
  const byDay = {};
  rows.forEach(r => {
    if (r.status === 'checkedin') return;
    const d = byDay[r.date] || (byDay[r.date] = { date: r.date, booked: 0, given: 0, entered: 0, notgiven: 0, waiting: 0, byVax: {} });
    if (r.status === 'booked') d.booked++;
    else if (r.status === 'waiting') d.waiting++;
    else if (r.status === 'notgiven') d.notgiven++;
    else if (r.status === 'given' || r.status === 'entered') { d.given++; d.byVax[r.vaccine] = (d.byVax[r.vaccine] || 0) + 1; if (r.status === 'entered') d.entered++; }
  });
  return { version, settings, rows: live, days: Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date)) };
}
function searchRows(rows, q, seasonStart) {
  q = String(q || '').trim().toLowerCase(); if (q.length < 2) return [];
  const qn = cleanNhs(q), qd = parseDob(q);
  return rows.filter(r => r.status !== 'checkedin' && r.date >= (seasonStart || '') && (
    (qn.length >= 6 && r.nhs.includes(qn)) || (qd && r.dob === qd) ||
    (`${r.surname} ${r.given}`.toLowerCase().includes(q)) || (`${r.given} ${r.surname}`.toLowerCase().includes(q))
  )).slice(-80).reverse();
}

const API = hasGas ? {
  board: (v, t) => gas('apiBoard', v, t),
  register: v => gas('apiRegister', v),
  update: (ids, p) => gas('apiUpdate', ids, p),
  updateEach: c => gas('apiUpdateEach', c),
  importBookings: r => gas('apiImportBookings', r),
  search: (q, s) => gas('apiSearch', q, s),
  saveSettings: s => gas('apiSaveSettings', s),
  exportRows: (f, t) => gas('apiExport', f, t),
} : Demo;

/* ===================== state ===================== */
let S = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
let ROWS = [], DAYS = [], VERSION = -1;
// The operator is kept for the day on this computer; a new day starts with the box empty.
let me = store.get('psm.meDay', '') === todayIso() ? store.get('psm.me', '') : '';
let form = { vaccines: ['Flu'], elig: {}, source: 'Walk-in', bookingVisitId: '', step: 'find' };
// Offline mode (RAVS down) stays on for this computer until it is switched off.
let offline = !!store.get('psm.offline', false);
let todoFilter = 'All';
let editing = null;

async function refresh(force) {
  try {
    const b = await API.board(force ? -1 : VERSION, todayIso());
    setSync(true);
    if (b.unchanged) return;
    const sj = JSON.stringify(b.settings || {}), settingsChanged = sj !== refresh._sj; refresh._sj = sj;
    VERSION = b.version; S = Object.assign({}, DEFAULT_SETTINGS, b.settings || {}); ROWS = b.rows || []; DAYS = b.days || [];
    // Settings saved before private vaccines existed have no private stock rows yet.
    DEFAULT_SETTINGS.products.filter(p => VACCINES[p.vaccine]?.private && !S.products.some(x => x.vaccine === p.vaccine)).forEach(p => S.products = S.products.concat([Object.assign({}, p)]));
    await loadMore();
    renderAll(settingsChanged);
  } catch (e) { setSync(false, e); }
}
// The board only carries today and anything still to record. Other days the screens need (the bookings date picked,
// and earlier days with patients still to record) are fetched separately.
let MORE = [];
async function loadMore() {
  const t = todayIso(), bk = $('#bkDate').value || t;
  const dates = [t, bk, ...ROWS.filter(r => r.status === 'given').map(r => r.date)].sort();
  const from = dates[0], to = dates[dates.length - 1];
  if (from === t && to === t) { MORE = []; return; }
  try { MORE = (await API.exportRows(from, to)).filter(r => r.date !== t); } catch (e) { console.warn(e); MORE = []; }
}
function allRows() { const have = new Set(ROWS.map(r => r.id)); return ROWS.concat(MORE.filter(r => !have.has(r.id))); }
// Private vaccinations for the whole season, fetched when the Private tab is opened or the data changes.
let PRIV = null;
async function loadPrivate() {
  try { PRIV = (await API.exportRows(S.seasonStart || '2000-01-01', todayIso())).filter(r => isPriv(r) && r.status === 'entered'); }
  catch (e) { console.warn(e); PRIV = PRIV || []; }
  renderPrivate();
}
function renderPrivate() {
  const t = todayIso();
  const have = new Set((PRIV || []).map(r => r.id));
  const rows = (PRIV || []).concat(ROWS.filter(r => isPriv(r) && r.status === 'entered' && !have.has(r.id)));
  const today = rows.filter(r => r.date === t);
  const n = (list, v) => list.filter(r => r.vaccine === v).length;
  const take = list => list.reduce((a, r) => a + priceOf(r.vaccine), 0);
  setCount('#cPriv', today.length);
  const tile = (k, v, cls) => `<div class="tile priv ${cls || ''}"><div class="k">${k}</div><div class="n">${v}</div></div>`;
  $('#privTiles').innerHTML = tile('Private flu today', n(today, 'Private flu')) + tile('Private COVID today', n(today, 'Private COVID')) + tile('Taken today', money(take(today))) +
    tile('Private flu this season', n(rows, 'Private flu')) + tile('Private COVID this season', n(rows, 'Private COVID')) + tile('Taken this season', money(take(rows)));
  if (PRIV === null) { $('#privList').innerHTML = '<div class="panel empty">Loading…</div>'; return; }
  const dates = [...new Set(rows.map(r => r.date))].sort().reverse();
  $('#privList').innerHTML = dates.length ? dates.map(d => {
    const day = rows.filter(r => r.date === d).sort((a, b) => (b.givenAt || '').localeCompare(a.givenAt || ''));
    return `<div class="dayhead"><h3>${d === t ? 'Today' : esc(longDate(d))}</h3><span class="small muted">${n(day, 'Private flu')} flu · ${n(day, 'Private COVID')} COVID · ${money(take(day))}</span></div>
      <div class="panel list" style="padding-block:6px">${day.map(r => `<div class="row"><div class="time">${esc((r.givenAt || '').slice(11) || r.time)}</div><div class="who"><div class="nm">${esc(fullName(r))}</div>
        <div class="sub"><span class="mono f f-dob">${esc(ukDate(r.dob))}</span>${r.nhs ? `<span class="mono f f-nhs">${esc(fmtNhs(r.nhs))}</span>` : ''}${r.postcode ? `<span class="mono f f-pc">${esc(r.postcode)}</span>` : ''}${r.vaccinator ? `<span class="f f-vac">${esc(r.vaccinator)}</span>` : ''}</div></div>
        <div class="right">${vaxTag(r)}<span class="mono small">${esc(r.batch || 'no batch')}</span><span class="small muted">${money(priceOf(r.vaccine))}</span></div></div>`).join('')}</div>`;
  }).join('') : '<div class="panel empty">No private vaccinations yet this season.</div>';
}
function setSync(ok, e) { $('#syncDot').classList.toggle('off', !ok); $('#syncBox').classList.toggle('bad', !ok); $('#syncText').textContent = ok ? 'Live' : 'Not saving, retrying'; if (!ok) { console.warn(e); showError(e); } }
// Any error is shown at the top in words, so a screenshot says what went wrong.
function showError(e) { const m = String((e && (e.message || e)) || 'Unknown error'); const b = $('#appError'); b.innerHTML = `<div class="wrap">Something went wrong: ${esc(m)}. Reload this page (Cmd+R). If it keeps happening, send a screenshot of this line.</div>`; b.hidden = false; }
window.addEventListener('error', ev => showError(ev.error || ev.message));
window.addEventListener('unhandledrejection', ev => showError(ev.reason));

function visits(rows) {
  const m = new Map();
  rows.forEach(r => { if (!m.has(r.visitId)) m.set(r.visitId, []); m.get(r.visitId).push(r); });
  return [...m.values()];
}

/* ===================== rendering ===================== */
function renderAll(settingsChanged) {
  // Each part draws on its own, so a problem in one screen can't leave the operator box or the clinic form blank.
  const parts = [renderMe, renderFind, () => { $('#todayLabel').textContent = longDate(todayIso()); }];
  if (settingsChanged || !renderAll._f) parts.push(renderDeskForm, renderSettings);
  parts.push(renderDeskLists, renderVax, renderTodo, renderRecords, () => ($('#tab-private').classList.contains('on') ? loadPrivate() : renderPrivate()), updateGive);
  if (!renderAll._f) renderAll._f = true; else parts.splice(1, 1);
  let failed = null;
  parts.forEach(fn => { try { fn(); } catch (e) { console.error(e); failed = failed || e; } });
  if (failed) showError(failed);
}
function renderMe() {
  // Operators come only from the Operators list in Settings; vaccinators are a separate list.
  const people = [...new Set(S.staff || [])];
  if (me && !people.includes(me)) { me = ''; store.set('psm.me', ''); }
  const html = (people.length ? '<option value="">Choose your name</option>' : '<option value="">No names yet: add them in Settings</option>') + people.map(p => `<option ${p === me ? 'selected' : ''}>${esc(p)}</option>`).join('');
  $('#meSel').innerHTML = html; $('#sOperator').innerHTML = html;
  $('#opBox').classList.toggle('empty', !me);
}
// Nothing can be entered until the operator box has a name. Trying anyway makes the box flash red.
function flashOperator() {
  // No names set up yet: take them to Settings to add one.
  if (!$$('#meSel option').some(o => o.value)) { showTab('settings'); toast('Add your name under Operators in Settings, press Save, then choose it in the Operator box.'); const st = $('#sStaff'); if (st) st.focus(); return; }
  const box = $('#opBox'); box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
  window.scrollTo({ top: 0, behavior: 'smooth' }); $('#meSel').focus();
  toast('Choose the operator first (top right).');
}
['pointerdown', 'focusin', 'keydown'].forEach(type => document.addEventListener(type, ev => {
  if (me) return;
  const t = ev.target;
  if (!(t instanceof Element) || !t.closest('main, .scrim')) return;
  // Settings always stays open, so names can be added and batches changed.
  if (t.closest('#tab-settings')) return;
  if (type === 'keydown' && ev.key === 'Tab') return;
  ev.preventDefault(); ev.stopPropagation(); if (t.blur) t.blur();
  flashOperator();
}, true));
// Private vaccinations never go to RAVS: saved as done straight away and kept off To enter onto RAVS.
const vaxKind = v => /^Private/.test(v) ? 'priv' : /COVID/.test(v) ? 'covid' : /flu/i.test(v) ? 'flu' : '';
const vaxTag = (d, withProduct) => `<span class="vtag ${vaxKind(d.vaccine)}">${esc(VACCINES[d.vaccine]?.short || d.vaccine)}${withProduct && d.product && !isPriv(d) ? ` <span class="pr">${esc(shortProduct(d.product))}</span>` : ''}</span>`;
function statusPill(st, extra = '') { return `<span class="pill p-${st}">${STATUS_LABEL[st] || st}${extra}</span>`; }
function vaxPills(vs) { return vs.map(r => `<span class="pill p-${r.status}" title="${esc(STATUS_LABEL[r.status])}">${esc(VACCINES[r.vaccine]?.short || r.vaccine)}</span>`).join(' '); }

/* ---------- front desk ---------- */
// Select vaccine shows four big choices: Flu, COVID, Private and Other. Private opens its own view (with Back) and replaces any NHS choice.
let vaxView = 'main';
const OTHER_VAX = () => Object.keys(VACCINES).filter(v => !VACCINES[v].main && !VACCINES[v].private);
const PRIV_VAX = () => Object.keys(VACCINES).filter(v => VACCINES[v].private);
// What a tile says about the patient's age for that vaccine.
function tileElig(v, dob) {
  if (!dob) return { cls: '', text: 'Enter date of birth' };
  const e = checkEligibility(v, dob, S);
  if (e.state === 'blocked') return { cls: 'bad', text: `NOT ELIGIBLE: ${e.short || 'under 18'}`, e };
  if (e.state === 'age') return { cls: 'ok', text: VACCINES[v].private ? money(priceOf(v)) : 'Eligible by age', e };
  if (e.state === 'reason') return { cls: 'warn', text: v === 'Flu' ? `Under ${S.fluAge}: needs a reason` : `Under ${S.covAge}: only some reasons`, e };
  if (e.state === 'warn') return { cls: 'warn', text: 'Check age range', e };
  return { cls: '', text: '', e };
}
function setCount(id, n) { const c = $(id); c.textContent = n || ''; c.dataset.n = n || 0; return c; }
function renderDeskForm() {
  const dob = parseDob($('#fDob').value), age = dob ? ageOn(dob, todayIso()) : null;
  // A vaccine the patient is too young for can't stay chosen.
  if (dob) form.vaccines = form.vaccines.filter(v => checkEligibility(v, dob, S).state !== 'blocked');
  if (form.vaccines.some(isPriv)) vaxView = 'private';
  const tile = (v, label, extraCls = '') => {
    const t = tileElig(v, dob), on = form.vaccines.includes(v), no = t.cls === 'bad';
    return `<button type="button" class="vtile ${vaxKind(v)} ${extraCls} ${t.cls ? 'e-' + t.cls : ''}" data-vax="${esc(v)}" aria-pressed="${on}" ${no ? 'disabled' : ''}>
      <span class="vt-name">${esc(label || v)}</span><span class="vt-state">${t.cls === 'ok' && !VACCINES[v].private ? '✓ ' : ''}${esc(t.text)}</span>${on ? '<span class="vt-tick" aria-hidden="true">✓</span>' : ''}</button>`;
  };
  const blocked = dob ? (vaxView === 'private' ? PRIV_VAX() : ['Flu', 'COVID-19']).filter(v => checkEligibility(v, dob, S).state === 'blocked') : [];
  const stop = blocked.length ? `<div class="notelig" role="alert"><span class="ni">✕</span><div><b>NOT ELIGIBLE BY AGE</b><span>Age ${age}. ${vaxView === 'private' ? 'Private vaccination is 18 and over.' : 'Flu and COVID at the pharmacy are 18 and over.'} Do not vaccinate.</span></div></div>` : '';
  const ageChip = age != null ? `<span class="agechip ${age < 18 ? 'bad' : ''}">Age ${age}</span>` : '';
  let html;
  if (vaxView === 'private') {
    html = `<div class="vhead"><button type="button" class="btn sm" data-vaxback>← Back</button><b class="vtitle priv">Private vaccination</b><span class="small muted">not recorded on RAVS</span><span class="sp"></span>${ageChip}</div>${stop}
      <div class="vtiles two">${PRIV_VAX().map(v => tile(v, v, 'priv')).join('')}</div>`;
  } else if (vaxView === 'other') {
    html = `<div class="vhead"><button type="button" class="btn sm" data-vaxback>← Back</button><b class="vtitle">Other vaccines</b><span class="sp"></span>${ageChip}</div>
      <div class="vtiles">${OTHER_VAX().map(v => tile(v)).join('')}</div>`;
  } else {
    const others = form.vaccines.filter(v => OTHER_VAX().includes(v));
    html = `<div class="vhead"><span class="small muted">Choose one or more</span><span class="sp"></span>${ageChip}</div>${stop}
      <div class="vtiles">${tile('Flu')}${tile('COVID-19', 'COVID')}
        <button type="button" class="vtile priv" data-vaxview="private"><span class="vt-name">Private</span><span class="vt-state">${PRIV_VAX().map(v => `${esc(VACCINES[v].nhs === 'Flu' ? 'Flu' : 'COVID')} ${money(priceOf(v))}`).join(' · ')}</span></button>
        <button type="button" class="vtile other" data-vaxview="other" aria-pressed="${others.length > 0}"><span class="vt-name">Other</span><span class="vt-state">${others.length ? esc(others.join(', ')) : esc(OTHER_VAX().map(v => VACCINES[v].short).join(', '))}</span>${others.length ? '<span class="vt-tick" aria-hidden="true">✓</span>' : ''}</button></div>`;
  }
  $('#vaxArea').innerHTML = html;
  const locs = S.locations || ['Pharmacy'], loc = $('#fLocation').value || store.get('psm.loc', locs[0]);
  $('#fLocation').innerHTML = locs.map(l => `<option ${l === loc ? 'selected' : ''}>${esc(l)}</option>`).join('');
  $('#srcPill').textContent = form.source; $('#srcPill').className = 'pill ' + (form.source === 'Booked' ? 'p-booked' : 'p-neutral');
  renderExtraSum(); renderElig();
}
function renderExtraSum() {
  const locs = S.locations || ['Pharmacy'], bits = [];
  if ($('#fLocation').value && $('#fLocation').value !== locs[0]) bits.push($('#fLocation').value);
  if ($('#fPhone').value.trim()) bits.push('phone added');
  if ($('#fNote').value.trim()) bits.push('note added');
  $('#extraSum').textContent = bits.length ? '· ' + bits.join(', ') : '';
}
// Only what still needs doing shows under the tiles: a reason to pick, or an age range to check.
function renderElig() {
  const dob = parseDob($('#fDob').value);
  const box = $('#eligBox');
  if (!dob || !form.vaccines.length) { box.innerHTML = ''; return; }
  box.innerHTML = form.vaccines.map(v => {
    const e = checkEligibility(v, dob, S); const cur = form.elig[v] || {}, kind = vaxKind(v);
    if (e.state === 'reason') return `<div class="rcard ${kind} ${cur.reason ? 'done' : ''}"><div class="rc-head"><b>${esc(VACCINES[v].short)}</b><span>${esc(e.text)}</span></div>
      <select data-elig-reason="${esc(v)}" aria-label="Reason for ${esc(v)}"><option value="">Choose the reason the patient gives…</option>${e.reasons.map(r => `<option ${cur.reason === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
      <input data-elig-note="${esc(v)}" placeholder="Detail, e.g. condition (optional)" value="${esc(cur.note || '')}" aria-label="Detail for ${esc(v)}"></div>`;
    if (e.state === 'warn') return `<div class="rcard warnc"><div class="rc-head"><b>${esc(VACCINES[v].short)}</b><span>${esc(e.text)}</span></div></div>`;
    if (e.state === 'free') return `<div class="rcard freec"><div class="rc-head"><b>${esc(v)}</b><span>No age rule</span></div><input data-elig-note="${esc(v)}" placeholder="Eligibility or reason (optional)" value="${esc(cur.note || '')}" aria-label="Eligibility for ${esc(v)}"></div>`;
    return '';
  }).join('');
}
function renderDeskLists() {
  const t = todayIso();
  const today = ROWS.filter(r => r.date === t && r.status !== 'checkedin');
  const vs = visits(today);
  const booked = vs.filter(v => v.every(r => r.status === 'booked')).sort((a, b) => a[0].time.localeCompare(b[0].time));
  const reg = vs.filter(v => !v.every(r => r.status === 'booked')).sort((a, b) => b[0].time.localeCompare(a[0].time));
  const waiting = vs.filter(v => v.some(r => r.status === 'waiting')).length;
  const done = vs.filter(v => v.some(r => r.status === 'given' || r.status === 'entered')).length;
  $('#deskSummary').innerHTML = `<span><b>${done}</b> vaccinated</span>${waiting ? `<span><b>${waiting}</b> waiting</span>` : ''}`;
  setCount('#cDesk', reg.length); setCount('#cBook', booked.length);
  renderBookings();
}
// Bookings tab: one date at a time. Each booking can fill Find patient, or be copied and pasted there.
function renderBookings() {
  const date = $('#bkDate').value || ($('#bkDate').value = todayIso());
  const vs = visits(allRows().filter(r => r.date === date && (r.status === 'booked' || r.status === 'checkedin'))).sort((a, b) => a[0].time.localeCompare(b[0].time));
  // A booking counts as registered once anyone with the same NHS number, or the same name and date of birth, is registered that day.
  const reg = allRows().filter(x => x.date === date && !['booked', 'checkedin'].includes(x.status));
  const norm = t => String(t || '').trim().toUpperCase();
  const same = (a, x) => (a.nhs && x.nhs && a.nhs === x.nhs) || (a.dob === x.dob && norm(a.surname) === norm(x.surname));
  $('#bookedList').innerHTML = vs.length ? vs.map(v => {
    const r = v[0], arrived = v.some(x => x.status === 'checkedin') || reg.some(x => same(r, x));
    return `<div class="row"><div class="time">${esc(r.time)}</div><div class="who"><div class="nm">${esc(fullName(r))}</div><div class="sub"><span class="mono f f-dob">${esc(ukDate(r.dob))}</span>${r.nhs ? `<span class="mono f f-nhs">${esc(fmtNhs(r.nhs))}</span>` : ''}${r.postcode ? `<span class="mono f f-pc">${esc(r.postcode)}</span>` : ''}</div><div class="sub vx">${v.map(x => vaxTag(x)).join('')}</div></div>
      <div class="right">${arrived ? '<span class="pill p-entered">Registered</span>' : '<span class="pill p-booked">Booked</span>'}${arrived ? '' : `<button type="button" class="btn sm ghost" data-copybk="${esc(r.visitId)}">Copy</button><button type="button" class="btn sm primary" data-checkin="${esc(r.visitId)}">Find patient</button>`}</div></div>`;
  }).join('') : `<div class="empty">No bookings for ${esc(longDate(date))}. Use Paste bookings to bring them in.</div>`;
}
// One line with everything Find patient needs; pasting it into Find patient fills every box.
const bookingText = r => [`${r.surname}, ${r.given}`, ukDate(r.dob), r.nhs ? 'NHS ' + fmtNhs(r.nhs) : '', r.postcode || ''].filter(Boolean).join('  ');
function pastePatient(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim(), got = {};
  let rest = t;
  const take = (re, key, fn) => { const m = rest.match(re); if (m) { got[key] = fn ? fn(m) : m[0]; rest = rest.replace(m[0], ' '); } };
  take(/\b\d{3} ?\d{3} ?\d{4}\b/, 'nhs');
  take(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/, 'dob');
  take(/\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b/i, 'postcode');
  rest = rest.replace(/\bNHS\b/i, ' ').replace(/\s+/g, ' ').trim();
  const nm = rest.match(/^([^,]+),\s*(.+)$/);
  if (nm) { got.surname = nm[1].trim(); got.given = nm[2].trim(); }
  else if (rest) { const w = rest.split(' '); if (w.length > 1) { got.given = w.slice(0, -1).join(' '); got.surname = w[w.length - 1]; } }
  return Object.keys(got).length >= 2 ? got : null;
}
function readForm() {
  return {
    nhs: cleanNhs($('#fNhs').value), dob: parseDob($('#fDob').value), given: titleCase($('#fGiven').value.trim()), surname: $('#fSurname').value.trim().toUpperCase(),
    postcode: fmtPostcode($('#fPostcode').value), phone: $('#fPhone').value.trim(), location: $('#fLocation').value, note: $('#fNote').value.trim(),
    address: form.ravs?.address || '', gp: form.ravs?.gp || '',
    ...(offline ? offlineDetails() : {}),
  };
}
// Offline registrations keep the extra details in existing fields: gender and email go in the note, marked so the export can split them out.
function offlineDetails() {
  const g = $('#fGender').value, e = $('#fEmail').value.trim(), extra = $('#fOffNote').value.trim(), desk = $('#fNote').value.trim();
  return {
    address: $('#fAddress').value.trim(), phone: $('#fOffPhone').value.trim() || $('#fPhone').value.trim(), vaxDate: $('#fVaxDate').value || todayIso(),
    note: ['Offline registration', g && `Gender: ${g}`, e && `Email: ${e}`, extra, desk].filter(Boolean).join('. '),
  };
}

/* ---------- box 1: find the patient on RAVS, then confirm ---------- */
// form.step: find -> searching -> found | error -> confirmed. Box 2 only opens once confirmed.
const canSearch = () => EXT.ready || !hasGas;
function findErrors(f) {
  const errs = [];
  if (f.nhs && !nhsValid(f.nhs)) errs.push('The NHS number is not valid. Check the digits.');
  if ($('#fDob').value && !f.dob) errs.push('Enter the date of birth as dd/mm/yyyy.');
  else if (!f.nhs) {
    const missing = [['first name', f.given], ['last name', f.surname], ['date of birth', f.dob]].filter(([, v]) => !v).map(([k]) => k);
    if (missing.length === 3) errs.push('Enter the NHS number, or the first name, last name and date of birth.');
    else if (missing.length) errs.push(`Add the ${missing.join(' and ')} to search, or enter the NHS number instead.`);
  }
  return errs;
}
function startFind() {
  const f = readForm(), errs = findErrors(f);
  if (errs.length) { form.step = 'find'; form.findMsg = errs.join(' '); return renderFind(); }
  if (EXT.ready && verLt(EXT.version, '0.2.0')) {
    form.step = 'error'; form.findMsg = `The RAVS Helper on this computer is an old version (${EXT.version || 'unknown'}) that can't search RAVS. Update it, then search again.`; return renderFind();
  }
  form.lookupId = 'lk' + uid(); form.step = 'searching'; form.findMsg = ''; form.findStatus = ''; form.lookupStarted = false; form.lookupHeard = false; renderFind();
  const job = { id: form.lookupId, nhs: f.nhs, given: f.given, surname: f.surname, dob: f.dob, postcode: f.postcode };
  findTimers.forEach(clearTimeout); findTimers = [];
  // A search must never spin forever: each check below gives up with a plain reason.
  const giveUp = (ms, test, msg) => findTimers.push(setTimeout(() => { if (form.step === 'searching' && form.lookupId === job.id && test()) { cancelFind(); form.step = 'error'; form.findMsg = msg; renderFind(); } }, ms));
  if (EXT.ready && !verLt(EXT.version, '0.3.0')) {
    giveUp(6000, () => !form.lookupStarted, "The RAVS Helper didn't pick up the search. Reload this page (Cmd+R) and search again.");
    giveUp(25000, () => !form.lookupHeard, "The RAVS tab isn't answering. Click the RAVS tab in Chrome, press Cmd+R to reload it, check you're logged in, then search again.");
    giveUp(60000, () => true, "RAVS didn't answer within a minute. Look at the RAVS tab to see where it stopped, then search again.");
  } else giveUp(45000, () => true, "RAVS didn't answer. Check RAVS is open and logged in in Chrome. If it still doesn't work, update the RAVS Helper on this computer.");
  if (EXT.ready) window.postMessage({ psm: 'app-lookup', job }, '*');
  else setTimeout(() => onLookup(demoLookup(job)), 1200);
}
let findTimers = [];
const verLt = (a, b) => { const x = String(a || '0').split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== y[i]) return (x[i] || 0) < y[i]; return false; };
function cancelFind() { if (form.lookupId && EXT.ready) window.postMessage({ psm: 'app-lookup-cancel', id: form.lookupId }, '*'); form.lookupId = ''; findTimers.forEach(clearTimeout); findTimers = []; }
// Demo only: pretends to be RAVS so the flow can be tried without the helper.
const DEMO_HISTORY = ['Information:', 'This shows NHS vaccinations given in England.', 'Date\tVaccine\tProduct',
  '14 October 2025\tFlu\tAdjuvanted trivalent influenza vaccine (surface antigen, inactivated) 0.5ml pre-filled syringes',
  '2 November 2025\tCOVID-19\tComirnaty JN.1 COVID-19 mRNA Vaccine 30micrograms/0.3ml dose dispersion for injection',
  '20 October 2024\tFlu\tCell-based trivalent influenza vaccine (surface antigen, inactivated) 0.5ml pre-filled syringes',
  '5 April 2024\tCOVID-19\tComirnaty Omicron XBB.1.5 COVID-19 mRNA Vaccine 30micrograms/0.3ml dose',
  '11 October 2023\tFlu\tAdjuvanted quadrivalent influenza vaccine 0.5ml pre-filled syringes',
  '21 September 2023\tCOVID-19\tComirnaty Original/Omicron BA.4-5 COVID-19 mRNA Vaccine',
  '3 March 2022\tPneumococcal\tPneumovax 23 solution for injection 0.5ml pre-filled syringes', 'Continue'].join('\n');
function demoLookup(job) {
  const known = ROWS.find(r => (job.nhs && r.nhs === job.nhs) || (job.dob && r.dob === job.dob && r.surname === job.surname));
  if (job.nhs && !known && job.nhs !== '9434765919') return { id: job.id, ok: false, error: 'RAVS could not find this patient. (Demo: try an NHS number from the list.)' };
  const p = known || job;
  return { id: job.id, ok: true, patient: { name: `${(p.given || 'Demo').toUpperCase()} ${p.surname || 'PATIENT'}`, dob: p.dob || '1950-01-01', nhs: p.nhs || '9434765919',
    address: `12 Example Road, Surbiton, ${p.postcode || 'KT6 4AA'}`, gp: 'Demo Surgery, 1 High Street', history: DEMO_HISTORY } };
}
function onLookup(res) {
  if (!res || res.id !== form.lookupId || form.step !== 'searching') return;
  findTimers.forEach(clearTimeout); findTimers = [];
  if (res.ok) { form.step = 'found'; form.found = res.patient; } else { form.step = 'error'; form.findMsg = res.error || 'RAVS could not find this patient.'; }
  renderFind();
}
// RAVS lists past vaccinations as a table: each row reads "date<tab>vaccine<tab>product".
// Its information paragraph, the header row and the Continue link are dropped.
const VACCINE_NAMES = ['COVID-19', 'Flu (London)', 'Flu', 'MMR', 'MenB', 'MenACWY', 'Pneumococcal', 'Pertussis', 'RSV', 'Shingles', 'HPV', 'Hepatitis B'];
function parseHistory(text) {
  const rows = [], dateRe = /^(\d{1,2} [A-Za-z]+ \d{4}|\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)$/;
  String(text || '').split('\n').forEach(line => {
    const cells = line.split('\t').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 3 && dateRe.test(cells[0] + ' x')) return rows.push({ date: cells[0], vaccine: cells[1], product: cells.slice(2).join(' ') });
    const m = line.trim().match(dateRe); if (!m) return;
    const rest = m[2], v = VACCINE_NAMES.find(n => rest.toLowerCase().startsWith(n.toLowerCase() + ' ') || rest.toLowerCase() === n.toLowerCase());
    rows.push(v ? { date: m[1], vaccine: v, product: rest.slice(v.length).trim() } : { date: m[1], vaccine: rest.split(' ')[0], product: rest.split(' ').slice(1).join(' ') });
  });
  return { rows, text: rows.length ? '' : String(text || '').trim() };
}
function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/);
  return { given: titleCase(parts.slice(0, -1).join(' ')), surname: (parts.slice(-1)[0] || '').toUpperCase() };
}
function postcodeFrom(address) { const m = String(address || '').toUpperCase().match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\s*$/); return m ? fmtPostcode(m[1]) : ''; }
function differences(f, p) {
  const out = [];
  if (f.nhs && p.nhs && f.nhs !== p.nhs) out.push(`NHS number on RAVS is ${fmtNhs(p.nhs)}, you typed ${fmtNhs(f.nhs)}`);
  if (f.dob && p.dob && f.dob !== p.dob) out.push(`date of birth on RAVS is ${ukDate(p.dob)}, you typed ${ukDate(f.dob)}`);
  if (f.surname && p.name && !p.name.toUpperCase().includes(f.surname)) out.push(`name on RAVS is ${p.name}`);
  return out;
}
function confirmPatient(checked) {
  const p = form.found || {};
  if (checked) {
    const nm = splitName(p.name);
    $('#fNhs').value = fmtNhs(p.nhs || cleanNhs($('#fNhs').value));
    if (p.dob) $('#fDob').value = ukDate(p.dob);
    if (nm.surname) { $('#fSurname').value = nm.surname; if (!$('#fGiven').value.trim() || !$('#fGiven').value.toUpperCase().startsWith(nm.given.split(' ')[0].toUpperCase())) $('#fGiven').value = nm.given; }
    const pc = postcodeFrom(p.address); if (pc) $('#fPostcode').value = pc;
    form.ravs = { address: p.address || '', gp: p.gp || '' };
  } else {
    const f = readForm(), errs = [];
    if (!f.dob) errs.push('Enter the date of birth, it is needed for the age check.');
    if (f.nhs && !nhsValid(f.nhs)) errs.push('The NHS number is not valid. Check the digits.');
    if (!f.nhs && !(f.given && f.surname)) errs.push('Enter the NHS number, or first and last name.');
    if (offline && !(f.given && f.surname)) errs.push('In offline mode, enter the first and last name.');
    if (errs.length) { form.findMsg = errs.join(' '); return renderFind(); }
    form.ravs = null;
  }
  form.checked = !!checked; form.step = 'confirmed'; form.findMsg = '';
  onDobInput(); onNhsInput(); checkDuplicates(); renderFind();
  $('#box2').scrollIntoView({ block: 'nearest' });
}
function renderFind() {
  const st = form.step || 'find', area = $('#findArea'), f = readForm();
  const confirmed = st === 'confirmed';
  $('#findFields').hidden = confirmed || st === 'found' || st === 'searching';
  $('#box1').classList.toggle('done', confirmed);
  $('#box2').classList.toggle('locked', !confirmed);
  $('#box2Body').hidden = !confirmed; $('#box2Locked').hidden = confirmed; updateGive();
  const msg = form.findMsg ? `<div class="alert ${st === 'error' ? 'bad' : 'warn'}">${esc(form.findMsg)}</div>` : '';
  const skip = `<button type="button" class="btn ghost sm" data-findskip>Continue without checking RAVS</button>`;
  const kv = (k, v, cls = '') => `<div class="kv"><span class="k">${esc(k)}</span><span class="v ${cls}">${v}</span></div>`;
  $('#box1').classList.toggle('offline', offline); $('#offlineBtn').setAttribute('aria-pressed', String(offline)); $('#offlineNote').hidden = !offline || confirmed;
  if (offline && !$('#fVaxDate').value) $('#fVaxDate').value = todayIso();
  if ((st === 'find' || st === 'error') && offline) {
    area.innerHTML = msg + '<div class="actions" style="margin-top:0"><button type="button" class="btn primary lg" data-findskip>Continue</button></div>';
  } else if (st === 'find' || st === 'error') {
    area.innerHTML = msg + (canSearch()
      ? `<div class="actions" style="margin-top:0"><button type="button" class="btn primary lg" data-find>${st === 'error' ? 'Search again' : 'Search RAVS'}</button>${st === 'error' && EXT.ready && !verLt(EXT.version, '0.3.0') ? '<button type="button" class="btn" data-showravs>Show RAVS tab</button>' : ''}${skip}</div>${!EXT.ready ? '<p class="small muted" style="margin:0">Demo: RAVS answers are made up here. On your Macs the RAVS Helper looks the patient up in the RAVS tab.</p>' : ''}`
      : `<div class="alert info">The RAVS Helper isn't installed in Chrome on this computer, so the patient can't be checked on RAVS from here.</div><div class="actions" style="margin-top:0"><button type="button" class="btn primary lg" data-findskip>Continue</button></div>`);
  } else if (st === 'searching') {
    area.innerHTML = `<div class="searching"><span class="spin"></span><span>Searching RAVS for ${esc(f.nhs ? fmtNhs(f.nhs) : `${f.given} ${f.surname}`)}…${form.findStatus ? `<br><span class="small">${esc(form.findStatus)}</span>` : ''}</span><span class="sp" style="flex:1"></span><button type="button" class="btn ghost sm" data-findcancel>Cancel</button></div>`;
  } else if (st === 'found') {
    const p = form.found, diffs = differences(f, p);
    const hist = parseHistory(p.history);
    area.innerHTML = `<div class="foundhead"><span class="glabel" style="margin:0">Found on RAVS. Check these with the patient.</span>
      <div class="actions" style="margin-top:0"><button type="button" class="btn go" data-findok>Confirm patient</button><button type="button" class="btn ghost" data-findno>Not the right patient</button></div></div>
      <div class="profile">${kv('Name', esc(p.name || '–'))}${kv('Date of birth', p.dob ? `<span class="mono">${esc(ukDate(p.dob))}</span> <span class="muted" style="font-weight:400">age ${ageOn(p.dob, todayIso())}</span>` : '<span class="muted">not shown</span>')}${kv('NHS number', p.nhs ? `<span class="mono">${esc(fmtNhs(p.nhs))}</span>` : '<span class="muted">not shown</span>')}${kv('Address', esc(p.address || 'not shown'))}${kv('GP', esc(p.gp || 'not shown'))}</div>
      <div class="glabel" style="margin:4px 0 0">Past vaccinations${hist.rows.length ? ` <span class="muted" style="font-weight:400">(${hist.rows.length})</span>` : ''}</div>
      ${hist.rows.length ? `<div class="histbox"><table class="histtable"><thead><tr><th>Date</th><th>Vaccine</th><th>Product</th></tr></thead><tbody>${hist.rows.map(r => `<tr><td class="nowrap">${esc(r.date)}</td><td class="nowrap"><span class="vtag ${vaxKind(r.vaccine)}">${esc(r.vaccine)}</span></td><td>${esc(r.product)}</td></tr>`).join('')}</tbody></table></div>`
        : hist.text ? `<div class="histbox hist">${esc(hist.text)}</div>` : '<p class="small muted" style="margin:0">None shown on RAVS.</p>'}
      ${diffs.length ? `<div class="alert warn">Check: ${esc(diffs.join('; '))}.</div>` : ''}${!(p.nhs && p.address && p.gp) ? '<div class="alert warn">Some details are missing, so this may not be the full patient record.</div>' : ''}`;
  } else {
    const age = f.dob ? ageOn(f.dob, todayIso()) : '';
    area.innerHTML = `<div class="confirmed"><span class="nm">${esc(fullName(f) || 'Name not given')}</span><span class="meta">${f.dob ? `<span class="mono">${esc(ukDate(f.dob))}</span><span>age ${age}</span>` : ''}${f.nhs ? `<span class="mono">${esc(fmtNhs(f.nhs))}</span>` : ''}${f.gp ? `<span>${esc(f.gp)}</span>` : ''}</span></div>
      <div class="actions" style="margin-top:0">${form.checked ? '<span class="pill p-entered">Checked on RAVS</span>' : '<span class="pill p-waiting">Not checked on RAVS</span>'}<span style="flex:1"></span><button type="button" class="btn ghost sm" data-findchange>Change patient</button></div>`;
  }
}
function validateForm(f) {
  const errs = [];
  if (!f.dob) errs.push('Enter a valid date of birth.');
  if (f.nhs && !nhsValid(f.nhs)) errs.push('The NHS number is not valid. Check the digits.');
  if (!f.nhs && !(f.surname && f.given)) errs.push('Enter the NHS number, or first and last name.');
  if (!form.vaccines.length) errs.push('Choose at least one vaccine.');
  form.vaccines.forEach(v => {
    const e = checkEligibility(v, f.dob, S);
    if (e.state === 'blocked') errs.push(`${v}: ${e.text}`);
    if (e.state === 'reason' && !(form.elig[v] || {}).reason) errs.push(`${v}: choose the reason the patient gives.`);
  });
  return errs;
}
// The Vaccinated and waiting-list buttons only work once the patient is confirmed and everything below is filled in.
function giveProblems() {
  if (form.step !== 'confirmed') return ['Find and confirm the patient first.'];
  const errs = validateForm(readForm());
  if (!S.vaccinator) errs.push('Choose the vaccinator on duty (Change, at the top).');
  if (!me) errs.push('Choose the operator (top right).');
  return errs;
}
function updateGive() {
  // Before the patient is confirmed the buttons are hidden, and Enter in Find patient still starts the search.
  const errs = form.step === 'confirmed' ? giveProblems() : [];
  $('#regBtn').disabled = errs.length > 0;
  $('#giveHint').textContent = form.step === 'confirmed' && errs.length ? 'Still needed: ' + errs.join(' ') : '';
  $('#regNeed').textContent = form.step === 'confirmed' && errs.length ? 'Still needed: ' + errs[0].replace(/\.$/, '') : '';
}
['input', 'change', 'click'].forEach(type => document.addEventListener(type, () => setTimeout(updateGive), true));
async function submitDesk(ev) {
  ev.preventDefault();
  if (form.step !== 'confirmed') { if (form.step === 'find' || form.step === 'error') { canSearch() ? startFind() : confirmPatient(false); } return; }
  const mode = ev.submitter?.dataset.mode || 'given';
  const f = readForm(); const errs = validateForm(f);
  if (mode === 'given' && !S.vaccinator) errs.push('Choose the vaccinator on duty first (Change, at the top).');
  if (errs.length) { $('#dupBox').innerHTML = `<div class="alert bad">${errs.map(esc).join('<br>')}</div>`; return; }
  const visitId = uid(), now = new Date().toISOString(), t = f.vaxDate || todayIso(), time = nowTime(), given = mode === 'given';
  const rows = form.vaccines.map(v => {
    const e = checkEligibility(v, f.dob, S), el = form.elig[v] || {};
    return { id: uid(), visitId, date: t, time, source: offline ? 'Offline' : form.source, nhs: f.nhs, surname: f.surname, given: f.given, dob: f.dob, postcode: f.postcode, phone: f.phone,
      address: f.address, gp: f.gp,
      vaccine: v, product: defaultProduct(v, f.dob, S), batch: given ? batchFor(defaultProduct(v, f.dob, S), S, v) : '', eligibility: VACCINES[v].private ? 'Private' : e.state === 'age' ? (VACCINES[v].ravs ? 'Based on age' : '') : (el.reason || ''), eligNote: el.note || '',
      consent: S.consent, site: S.site, vaccinator: given ? S.vaccinator : '', deskBy: me, location: f.location, status: given ? (isPriv(v) ? 'entered' : 'given') : 'waiting', givenAt: given ? `${t} ${time}` : '', enteredAt: given && isPriv(v) ? `${t} ${time}` : '', enteredBy: given && isPriv(v) ? PRIV_BY : '', note: f.note, updatedAt: now };
  });
  $('#regBtn').disabled = true;
  try {
    await API.register({ rows, bookingVisitId: form.bookingVisitId });
    toast(`${f.given || f.surname || 'Patient'} ${given ? 'saved as vaccinated' : 'added to the waiting list'}`);
    clearForm(); await refresh(true);
  } catch (e) { $('#dupBox').innerHTML = `<div class="alert bad">Could not save. Check the connection and try again. (${esc(e.message || e)})</div>`; }
  finally { updateGive(); }
}
function clearForm() {
  cancelFind(); findTimers.forEach(clearTimeout); findTimers = [];
  $('#deskForm').reset(); form = { vaccines: ['Flu'], elig: {}, source: 'Walk-in', bookingVisitId: '', step: 'find' }; vaxView = 'main';
  $('#nhsHint').textContent = ''; $('#dobHint').textContent = ''; $('#dupBox').innerHTML = '';
  renderDeskForm(); renderFind(); $('#fNhs').focus();
}
let dupTimer;
function checkDuplicates() {
  clearTimeout(dupTimer);
  dupTimer = setTimeout(async () => {
    const f = readForm(); const box = $('#dupBox');
    const q = f.nhs.length === 10 ? f.nhs : (f.dob && f.surname ? f.surname : '');
    if (!q) { box.innerHTML = ''; return; }
    let hits = await API.search(q, S.seasonStart);
    hits = hits.filter(r => (f.nhs && r.nhs === f.nhs) || (f.dob && r.dob === f.dob && r.surname === f.surname));
    hits = hits.filter(r => r.visitId !== form.bookingVisitId);
    const booking = hits.find(r => r.status === 'booked' && r.date === todayIso());
    const had = hits.filter(r => ['given', 'entered', 'waiting'].includes(r.status));
    let html = '';
    if (booking && !form.bookingVisitId) html += `<div class="alert info">This patient has a booking today at ${esc(booking.time)}. <button type="button" class="btn sm" data-checkin="${esc(booking.visitId)}">Use the booking</button></div>`;
    if (had.length) html += `<div class="alert warn">Already seen this season: ${had.map(r => `${esc(r.vaccine)} on ${esc(ukDate(r.date))} (${esc(STATUS_LABEL[r.status])})`).join(', ')}</div>`;
    box.innerHTML = html;
  }, 350);
}
function checkInBooking(visitId) {
  const v = allRows().filter(r => r.visitId === visitId);
  if (!v.length) return;
  const r = v[0];
  clearForm();
  $('#fNhs').value = fmtNhs(r.nhs); $('#fDob').value = ukDate(r.dob); $('#fGiven').value = r.given; $('#fSurname').value = r.surname; $('#fPostcode').value = r.postcode || ''; $('#fPhone').value = r.phone || '';
  form.vaccines = v.map(x => x.vaccine); form.source = 'Booked'; form.bookingVisitId = visitId; vaxView = form.vaccines.some(isPriv) ? 'private' : 'main';
  showTab('desk'); renderDeskForm(); onDobInput(); onNhsInput(); checkDuplicates();
  if (canSearch()) startFind(); else renderFind();
}
function onNhsInput() {
  const n = cleanNhs($('#fNhs').value), h = $('#nhsHint');
  if (!n) { h.textContent = ''; h.className = 'hint'; return; }
  if (n.length < 10) { h.textContent = `${n.length} of 10 digits`; h.className = 'hint'; return; }
  const ok = nhsValid(n); h.textContent = ok ? 'Valid NHS number' : 'Not a valid NHS number'; h.className = 'hint ' + (ok ? 'ok' : 'bad');
}
function onDobInput() {
  const d = parseDob($('#fDob').value), h = $('#dobHint');
  if (!$('#fDob').value) { h.textContent = ''; } else if (!d) { h.textContent = 'Use dd/mm/yyyy'; h.className = 'hint bad'; } else { h.textContent = `${longDate(d)}, age ${ageOn(d, todayIso())}`; h.className = 'hint ok'; }
  renderDeskForm();
}

/* ---------- vaccinator ---------- */
function renderVax() {
  const prods = (S.products || []).filter(p => p.active);
  const noBatch = prods.filter(p => !p.batch);
  $('#defaultsBar').innerHTML = `<span><b>Today</b></span><span>Vaccinator <b>${esc(S.vaccinator || 'not set')}</b></span><span>Site <b>${esc(S.site)}</b></span><span>Consent <b>${esc(S.consent)}</b></span>` +
    `<span title="${esc(prods.map(p => `${shortProduct(p.product)}: ${p.batch || 'no batch'}`).join('\n'))}">${noBatch.length ? `<span class="warnx">${noBatch.length} batch${noBatch.length > 1 ? 'es' : ''} not set</span>` : `Batches <b>${prods.length} set</b>`}</span>` +
    `<button class="btn sm ghost" data-goto="settings" type="button">Change</button>`;
  const t = todayIso();
  const vs = visits(ROWS.filter(r => r.date === t));
  const waiting = vs.filter(v => v.some(r => r.status === 'waiting')).sort((a, b) => a[0].time.localeCompare(b[0].time));
  const given = vs.filter(v => v.some(r => ['given', 'entered', 'notgiven'].includes(r.status)) && !v.some(r => r.status === 'waiting')).sort((a, b) => (b[0].givenAt || '').localeCompare(a[0].givenAt || ''));
  $('#waitWrap').hidden = !waiting.length;
  $('#waitCount').textContent = waiting.length ? `· ${waiting.length}, oldest first` : '';
  $('#givenCount').textContent = given.length ? '· ' + given.length : '';
  $('#waitList').innerHTML = waiting.length ? waiting.map(v => editing === v[0].visitId ? visitCard(v, false) : waitRow(v)).join('') : '';
  if (editing && !vs.some(v => v[0].visitId === editing)) { const ev = ROWS.filter(r => r.visitId === editing); if (ev.length) given.unshift(ev); }
  $('#givenList').innerHTML = given.length ? given.map(v => editing === v[0].visitId ? `<div class="row" style="display:block">${visitCard(v, false, true)}</div>` : givenRow(v)).join('') : '<div class="empty">Nobody vaccinated yet today.</div>';
}
function shortProduct(p) { const m = String(p).match(/\(([^)]+)\)\s*$/); return m ? m[1] : p; }
function doseLine(d) {
  const defBatch = batchFor(d.product, S), batch = d.batch || defBatch;
  const bits = [`<b>${esc(shortProduct(d.product) || '–')}</b>`];
  if (!batch) bits.push('<span class="warnx" style="color:var(--warn)">no batch</span>'); else if (d.batch && d.batch !== defBatch) bits.push(`Batch <b class="mono">${esc(d.batch)}</b>`);
  if (d.eligibility && d.eligibility !== 'Based on age') bits.push(`${esc(d.eligibility)}${d.eligNote ? ': ' + esc(d.eligNote) : ''}`);
  else if (d.eligNote) bits.push(esc(d.eligNote));
  if (d.site !== S.site) bits.push(esc(d.site));
  if (d.consent !== 'Patient') bits.push(`Consent: ${esc(d.consent)}`);
  return `<div class="dose"><span class="vx">${vaxTag(d)}</span><span class="det">${bits.map(x => `<span>${x}</span>`).join('')}</span></div>`;
}
function visitCard(v, next, inGiven) {
  const r = v[0], age = ageOn(r.dob, todayIso());
  const isEdit = editing === r.visitId;
  const doses = v.map(d => isEdit ? doseEditor(d) : doseLine(d)).join('');
  const btns = isEdit
    ? `<button type="button" class="btn primary" data-save-edit="${esc(r.visitId)}">Save changes</button><button type="button" class="btn ghost" data-cancel-edit>Cancel</button>`
    : `<button type="button" class="btn go" data-give="${esc(r.visitId)}">Vaccinated</button><button type="button" class="btn" data-edit="${esc(r.visitId)}">Edit</button><button type="button" class="btn ghost" data-notgiven="${esc(r.visitId)}">Not given</button>`;
  const meta = [`Age ${age}`, `<span class="mono f f-dob">${esc(ukDate(r.dob))}</span>`, r.nhs ? `<span class="mono f f-nhs">${esc(fmtNhs(r.nhs))}</span>` : '', `${esc(r.source)} ${esc(r.time)}`, r.location !== 'Pharmacy' ? esc(r.location) : ''].filter(Boolean);
  const body = `<div class="head"><span class="nm">${esc(fullName(r))}</span><span class="meta">${meta.map(m => `<span>${m}</span>`).join('')}</span></div>
    ${r.note ? `<div class="alert info small">${esc(r.note)}</div>` : ''}<div class="doses">${doses}</div><div class="actions">${btns}</div>`;
  return inGiven ? `<div style="display:grid;gap:14px">${body}</div>` : `<div class="card ${next ? 'next' : ''}">${body}</div>`;
}
// Waiting patients as one compact row each; Edit opens the full card in place.
function waitRow(v) {
  const r = v[0];
  return `<div class="row"><div class="time">${esc(r.time)}</div><div class="who"><div class="nm">${esc(fullName(r))}</div><div class="sub vx">${v.map(d => vaxTag(d, true)).join('')}</div>
    <div class="sub"><span class="mono f f-dob">${esc(ukDate(r.dob))}</span>${r.nhs ? `<span class="mono f f-nhs">${esc(fmtNhs(r.nhs))}</span>` : ''}${r.note ? `<span class="f f-note">${esc(r.note)}</span>` : ''}</div></div>
    <div class="right"><button type="button" class="btn sm go" data-give="${esc(r.visitId)}">Vaccinated</button><button type="button" class="btn sm" data-edit="${esc(r.visitId)}">Edit</button><button type="button" class="btn sm ghost" data-notgiven="${esc(r.visitId)}">Not given</button></div></div>`;
}
function givenRow(v) {
  const r = v[0];
  return `<div class="row"><div class="time">${esc((r.givenAt || '').slice(11) || r.time)}</div><div class="who"><div class="nm">${esc(fullName(r))}</div><div class="sub vx">${v.map(d => vaxTag(d, true)).join('')}</div>
    <div class="sub"><span class="mono f f-dob">${esc(ukDate(r.dob))}</span>${r.nhs ? `<span class="mono f f-nhs">${esc(fmtNhs(r.nhs))}</span>` : ''}${r.postcode ? `<span class="mono f f-pc">${esc(r.postcode)}</span>` : ''}</div></div>
    <div class="right"><span class="pills">${[...new Set(v.filter(d => !isPriv(d)).map(d => d.status))].map(st => st === 'given' ? '' : statusPill(st)).join('')}</span><button type="button" class="btn sm" data-edit="${esc(r.visitId)}">Edit</button></div></div>`;
}
function doseEditor(d) {
  const prods = (S.products || []).filter(p => p.vaccine === d.vaccine);
  const opt = (list, cur) => list.map(x => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join('');
  const reasons = d.vaccine === 'COVID-19' ? ['Based on age', ...COVID_UNDER_REASONS] : RAVS_REASONS;
  return `<div class="doseedit" data-dose="${esc(d.id)}"><div class="vx">${esc(d.vaccine)}</div><div class="editgrid">
    <div class="f"><label>Product</label><select data-k="product">${opt(prods.map(p => p.product).concat(prods.some(p => p.product === d.product) || !d.product ? [] : [d.product]), d.product)}</select></div>
    <div class="f"><label>Batch</label><input class="mono" data-k="batch" value="${esc(d.batch || batchFor(d.product, S))}"></div>
    <div class="f"><label>Eligibility</label><select data-k="eligibility"><option value=""></option>${opt(reasons, d.eligibility)}</select></div>
    <div class="f"><label>Detail</label><input data-k="eligNote" value="${esc(d.eligNote)}"></div>
    <div class="f"><label>Site</label><select data-k="site">${opt(SITES, d.site)}</select></div>
    <div class="f"><label>Consent</label><select data-k="consent">${opt(CONSENTS, d.consent)}</select></div>
    <div class="f"><label>Vaccinator</label><select data-k="vaccinator"><option value=""></option>${opt(S.vaccinators || [], d.vaccinator)}</select></div>
    <div class="f"><label>Status</label><select data-k="status">${[...(d.status === 'waiting' ? ['waiting'] : []), 'given', 'entered', 'notgiven'].map(s => `<option value="${s}" ${s === d.status ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}</select></div>
  </div></div>`;
}
async function giveVisit(visitId) {
  const now = new Date(); const stamp = `${todayIso()} ${nowTime()}`;
  const changes = ROWS.filter(r => r.visitId === visitId && r.status === 'waiting').map(r => ({ id: r.id, patch: { status: isPriv(r) ? 'entered' : 'given', givenAt: stamp, ...(isPriv(r) ? { enteredAt: stamp, enteredBy: PRIV_BY } : {}), batch: r.batch || batchFor(r.product, S, r.vaccine), vaccinator: r.vaccinator || S.vaccinator, site: r.site || S.site, consent: r.consent || S.consent } }));
  if (!S.vaccinator) toast('Set the vaccinator on duty in Settings');
  await API.updateEach(changes); toast('Marked as vaccinated'); await refresh(true);
}

/* ---------- to record ---------- */
const openTodo = new Set();
function renderTodo() {
  const pending = ROWS.filter(r => r.status === 'given').sort((a, b) => (a.givenAt || a.date).localeCompare(b.givenAt || b.date));
  const targetOf = r => VACCINES[r.vaccine]?.target || 'RAVS';
  const targets = ['All', ...new Set(pending.map(targetOf))];
  if (!targets.includes(todoFilter)) todoFilter = 'All';
  $('#todoFilter').innerHTML = targets.length > 2 ? targets.map(t => `<button type="button" class="chip small" data-todofilter="${esc(t)}" aria-pressed="${t === todoFilter}">${esc(t)} ${t === 'All' ? pending.length : pending.filter(r => targetOf(r) === t).length}</button>`).join('') : '';
  const late = pending.filter(r => r.date < todayIso()).length;
  setCount('#cTodo', pending.length).classList.toggle('hot', late > 0);
  const list = pending.filter(r => todoFilter === 'All' || targetOf(r) === todoFilter);
  // One section per date (oldest first, today always shown): still to record, then that day's patients already recorded.
  const dates = [...new Set(list.map(r => r.date).concat(todayIso()))].sort();
  $('#todoList').innerHTML = dates.map(d => {
    const todo = visits(list.filter(r => r.date === d));
    const done = visits(allRows().filter(r => r.status === 'entered' && r.date === d && !isPriv(r))).sort((a, b) => (b[0].enteredAt || '').localeCompare(a[0].enteredAt || ''));
    const age = daysBetween(d, todayIso());
    return `<div class="dayhead"><h3>${d === todayIso() ? 'Today' : esc(longDate(d))}</h3><span class="small muted">${todo.length} to enter onto RAVS · ${done.length} entered</span>${age > 0 && todo.length ? `<span class="pill ${age >= 10 ? 'p-late' : 'p-waiting'}">${age} day${age > 1 ? 's' : ''} ago · ${15 - age > 0 ? 15 - age + ' left to claim' : 'claim window passed'}</span>` : ''}</div>` +
      (todo.length ? todo.map(todoCard).join('') : '<div class="panel empty">Everything given on this day has been recorded.</div>') +
      (done.length ? `<div class="panel list donelist">${done.map(doneRow).join('')}</div>` : '');
  }).join('');
  const ravsPending = pending.filter(r => targetOf(r) === 'RAVS');
  $('#fillAll').hidden = !EXT.ready || !ravsPending.length; $('#fillAll').textContent = `Fill all in RAVS (${ravsPending.length})`;
  $('#extNote').hidden = !EXT.ready; $('#extNote').textContent = `RAVS Helper is connected. It fills each RAVS page, you check the summary and press Confirm and save, and it's marked here automatically.`;
}
function doneRow(v) {
  const r = v[0];
  return `<div class="row"><div class="time">${esc((r.givenAt || '').slice(11) || r.time)}</div><div class="who"><div class="nm">${esc(fullName(r))}</div><div class="sub"><span class="mono f f-dob">${esc(ukDate(r.dob))}</span>${r.nhs ? `<span class="mono f f-nhs">${esc(fmtNhs(r.nhs))}</span>` : ''}${r.postcode ? `<span class="mono f f-pc">${esc(r.postcode)}</span>` : ''}</div></div>
    <div class="right">${v.map(vaxTag).join('')}<span class="small muted">Recorded ${esc((r.enteredAt || '').slice(11))}</span></div></div>`;
}
function todoCard(v) {
  const r = v[0], open = openTodo.has(r.visitId);
  const age = daysBetween(r.date, todayIso()), left = 15 - age;
  const tag = ''; // the date heading above shows how late it is
  const copyVal = (v, show, mono) => v ? `<button class="copy ${mono ? 'mono' : ''}" type="button" data-copy="${esc(v)}">${esc(show || v)}</button>` : '<span class="muted">–</span>';
  const kv = (k, val) => `<div class="kv"><span class="k">${esc(k)}</span><span class="v">${val}</span></div>`;
  const pickVal = val => val ? `${esc(val)}<span class="pick">pick</span>` : '<span class="muted">–</span>';
  const doseRow = d => {
    const target = VACCINES[d.vaccine]?.target || 'RAVS';
    return `<div class="dose" style="justify-content:space-between;gap:10px 16px"><span style="display:flex;flex-wrap:wrap;gap:2px 12px;align-items:baseline"><span class="vx">${vaxTag(d)}</span><span class="det"><span><b>${esc(shortProduct(d.product))}</b></span><span class="mono">${esc(d.batch || 'no batch')}</span>${d.eligibility && d.eligibility !== 'Based on age' ? `<span>${esc(d.eligibility)}</span>` : ''}</span></span>
      <span class="rvact"><button type="button" class="btn sm ghost" data-edit-todo="${esc(d.visitId)}">Edit</button>${EXT.ready && target === 'RAVS' ? `<button type="button" class="btn primary sm" data-fill="${esc(d.id)}">Fill in RAVS</button>` : ''}<button type="button" class="btn go sm" data-entered="${esc(d.id)}">Entered on ${esc(target)}</button></span></div>`;
  };
  const doseFields = d => {
    const target = VACCINES[d.vaccine]?.target || 'RAVS';
    const rows = target === 'RAVS'
      ? [kv('Vaccination date', copyVal(ukDate(d.date), '', true)), kv('Vaccinator', copyVal(d.vaccinator)), kv('Vaccine', pickVal(`${VACCINES[d.vaccine]?.ravs || d.vaccine}: ${shortProduct(d.product)}`)), kv('Batch', copyVal(d.batch, '', true)), kv('Eligibility', pickVal(d.eligibility)), kv('Consent', pickVal(d.consent)), kv('Site', pickVal(d.site))]
      : [kv('Date', copyVal(ukDate(d.date), '', true)), kv('Product', copyVal(d.product)), kv('Batch', copyVal(d.batch, '', true)), kv('Vaccinator', copyVal(d.vaccinator)), kv('Phone', copyVal(d.phone, '', true))];
    return `<div><h4>${esc(d.vaccine)} · ${esc(target)}</h4>${rows.join('')}${d.eligNote ? `<div class="note" style="margin-top:8px">Note: ${esc(d.eligNote)}</div>` : ''}</div>`;
  };
  const patient = `<div><h4>Patient</h4>${kv('NHS number', copyVal(r.nhs, fmtNhs(r.nhs), true))}${kv('First name', copyVal(r.given))}${kv('Last name', copyVal(r.surname))}${kv('Date of birth', copyVal(ukDate(r.dob), '', true))}${kv('Postcode', copyVal(r.postcode, '', true))}</div>`;
  return `<div class="rv"><div class="rvh"><div class="who"><div class="nm">${esc(fullName(r))}</div><div class="meta"><span class="mono f f-dob">${esc(ukDate(r.dob))}</span>${r.nhs ? `<span class="mono f f-nhs">${esc(fmtNhs(r.nhs))}</span>` : ''}<span>Given ${esc(age === 0 ? 'today ' + (r.givenAt || '').slice(11) : ukDate(r.date))}</span>${r.location !== 'Pharmacy' ? `<span>${esc(r.location)}</span>` : ''}${tag}</div></div>
    <button class="toggle" type="button" data-toggle-todo="${esc(r.visitId)}" aria-expanded="${open}">${open ? 'Hide fields' : 'Show RAVS fields'}</button></div>
    <div style="padding:0 20px 16px;display:grid;gap:10px">${v.map(doseRow).join('')}</div>
    ${open ? `<div class="rvbody"><div class="cols">${patient}${v.map(doseFields).join('')}</div></div>` : ''}</div>`;
}

/* ---------- records ---------- */
function renderRecords() {
  // DAYS counts private doses as given and recorded; NHS numbers leave them out.
  const t = todayIso(), blank = { given: 0, entered: 0, waiting: 0, booked: 0, notgiven: 0, byVax: {} };
  const split = x => { const pf = x.byVax['Private flu'] || 0, pc = x.byVax['Private COVID'] || 0, nhs = x.given - pf - pc;
    return { nhs, onRavs: x.entered - pf - pc, flu: x.byVax['Flu'] || 0, covid: x.byVax['COVID-19'] || 0, pf, pc, takings: pf * priceOf('Private flu') + pc * priceOf('Private COVID') }; };
  const d = split(DAYS.find(x => x.date === t) || blank);
  const all = DAYS.reduce((a, x) => { const y = split(x); Object.keys(y).forEach(k => a[k] = (a[k] || 0) + y[k]); return a; }, {});
  const outstanding = ROWS.filter(r => r.status === 'given').length;
  const late = ROWS.filter(r => r.status === 'given' && r.date < t).length;
  const patients = new Set(ROWS.filter(r => r.date === t && !['booked', 'checkedin'].includes(r.status)).map(r => r.visitId)).size;
  const tile = ([k, n, c]) => `<div class="tile ${c}"><div class="k">${k}</div><div class="n">${n}</div></div>`;
  $('#tiles').innerHTML = `<h3 class="tilehead">Today</h3>` + [
    ['Patients registered', patients, ''], ['NHS flu', d.flu, 'flu'], ['NHS COVID', d.covid, 'covid'], ['Entered on RAVS', d.onRavs, 'ok'], ['Still to enter onto RAVS', outstanding, outstanding ? 'warn' : 'ok'],
    ['Private', d.pf + d.pc, 'priv'], ['Private taken', money(d.takings), 'priv'],
  ].map(tile).join('') + `<h3 class="tilehead">This season</h3>` + [
    ['NHS vaccinations', all.nhs || 0, ''], ['NHS flu', all.flu || 0, 'flu'], ['NHS COVID', all.covid || 0, 'covid'], ['From earlier days, not on RAVS', late, late ? 'bad' : 'ok'],
    ['Private', (all.pf || 0) + (all.pc || 0), 'priv'], ['Private taken', money(all.takings || 0), 'priv'],
  ].map(tile).join('');
  const vaxCols = ['Flu', 'COVID-19', 'Nasal flu', 'MMR', 'MenB', 'Pneumococcal', 'Private flu', 'Private COVID'].filter(v => DAYS.some(x => x.byVax[v]));
  const max = Math.max(1, ...DAYS.map(x => split(x).nhs));
  $('#dayTable').innerHTML = `<thead><tr><th>Date</th>${vaxCols.map(v => `<th class="n">${esc(VACCINES[v].short)}</th>`).join('')}<th class="n">NHS given</th><th class="n">On RAVS</th><th class="n">Missing</th><th style="width:24%"></th></tr></thead><tbody>` +
    (DAYS.length ? DAYS.map(x => { const y = split(x), miss = y.nhs - y.onRavs; return `<tr><td class="mono">${esc(ukDate(x.date))}</td>${vaxCols.map(v => `<td class="n">${x.byVax[v] || ''}</td>`).join('')}<td class="n">${y.nhs}</td><td class="n">${y.onRavs}</td><td class="n" ${miss ? 'style="color:var(--warn);font-weight:700"' : ''}>${miss || ''}</td><td><div class="bar" style="width:${Math.round(y.nhs / max * 100)}%"></div></td></tr>`; }).join('') : '<tr><td colspan="9" class="empty">Nothing yet.</td></tr>') + '</tbody>';
}
let searchTimer;
function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const q = $('#searchBox').value; const hits = await API.search(q, S.seasonStart);
    $('#searchList').innerHTML = q.trim().length < 2 ? '<div class="empty">Type at least two characters.</div>' : hits.length ? hits.map(r => `<div class="row"><div class="time">${esc(ukDate(r.date).slice(0, 5))}</div><div class="who"><div class="nm">${esc(fullName(r))}</div><div class="sub"><span class="mono f f-dob">${esc(ukDate(r.dob))}</span><span class="mono f f-nhs">${esc(fmtNhs(r.nhs))}</span><span class="f">${esc(shortProduct(r.product))}</span><span class="mono f f-batch">${esc(r.batch)}</span><span class="f f-vac">${esc(r.vaccinator)}</span></div></div><div class="right"><span class="pill p-neutral">${esc(r.vaccine)}</span>${statusPill(r.status)}</div></div>`).join('') : '<div class="empty">No matches this season.</div>';
  }, 300);
}
/* ---------- Excel export ---------- */
// One Summary tab with the numbers, one tab per clinic day (NHS), and one Private tab split by date.
const EXPORT_COLS = [
  ['Time', r => (r.givenAt || '').slice(11) || r.time, 8], ['Surname', r => r.surname, 16], ['First name', r => r.given, 14], ['Date of birth', r => ukDate(r.dob), 12],
  ['Age', r => r.dob ? ageOn(r.dob, r.date) : '', 6], ['NHS number', r => r.nhs ? fmtNhs(r.nhs) : '', 14], ['Postcode', r => r.postcode, 10], ['Address', r => r.address, 36],
  ['GP', r => r.gp, 28], ['Phone', r => r.phone, 14], ['Vaccine', r => r.vaccine, 14], ['Product', r => r.product, 34], ['Batch', r => r.batch, 12],
  ['Eligibility', r => r.eligibility, 22], ['Detail', r => r.eligNote, 18], ['Consent', r => r.consent, 12], ['Injection site', r => r.site, 15],
  ['Vaccinator', r => r.vaccinator, 16], ['Desk', r => r.deskBy, 12], ['Location', r => r.location, 12], ['Booked or walk-in', r => r.source, 12],
  ['Status', r => isPriv(r) ? 'Private' : STATUS_LABEL[r.status] || r.status, 11], ['On RAVS at', r => isPriv(r) ? '' : (r.enteredAt || '').slice(11), 10], ['Entered by', r => isPriv(r) ? '' : r.enteredBy, 16],
  ['Gender', r => (String(r.note || '').match(/Gender: ([^.]+)/) || [])[1] || '', 9], ['Email', r => (String(r.note || '').match(/Email: ([^ ]+?)\.?(?: |$)/) || [])[1] || '', 22],
  ['Price', r => isPriv(r) ? priceOf(r.vaccine) : '', 8], ['Note', r => r.note, 24],
];
const XL_FILL = { flu: 'FFE3EDFA', covid: 'FFEFE7FA', priv: 'FFFBE6F0', other: 'FFE2F0EE', head: 'FF0A6464', day: 'FFF2F5F7', warn: 'FFFCF0DC' };
function loadExcelJs() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  const urls = ['https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js', 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'];
  return urls.reduce((p, u) => p.catch(() => new Promise((res, rej) => { const el = document.createElement('script'); el.src = u; el.onload = () => window.ExcelJS ? res(window.ExcelJS) : rej(); el.onerror = rej; document.head.appendChild(el); })), Promise.reject());
}
// Counts for one set of rows (one day, or the whole range). Patients are visits; vaccinations are doses.
function dayNumbers(rows) {
  const done = rows.filter(r => r.status === 'given' || r.status === 'entered');
  const nhs = done.filter(r => !isPriv(r)), priv = done.filter(isPriv);
  const n = v => done.filter(r => r.vaccine === v).length;
  return {
    patients: new Set(rows.filter(r => !['booked', 'checkedin'].includes(r.status)).map(r => r.visitId)).size,
    booked: new Set(rows.filter(r => r.source === 'Booked' || r.status === 'booked').map(r => r.visitId)).size,
    vaccinations: done.length, nhs: nhs.length, flu: n('Flu'), covid: n('COVID-19'), other: nhs.filter(r => !['Flu', 'COVID-19'].includes(r.vaccine)).length,
    onRavs: nhs.filter(r => r.status === 'entered').length, toRecord: nhs.filter(r => r.status === 'given').length,
    privFlu: n('Private flu'), privCovid: n('Private COVID'), takings: priv.reduce((a, r) => a + priceOf(r.vaccine), 0),
    notGiven: rows.filter(r => r.status === 'notgiven').length, waiting: rows.filter(r => r.status === 'waiting').length,
  };
}
const NUM_COLS = [['Patients registered', 'patients'], ['Booked', 'booked'], ['Vaccinations given', 'vaccinations'], ['NHS flu', 'flu'], ['NHS COVID', 'covid'], ['Other NHS', 'other'],
  ['Entered on RAVS', 'onRavs'], ['Not yet on RAVS', 'toRecord'], ['Private flu', 'privFlu'], ['Private COVID', 'privCovid'], ['Private £', 'takings'], ['Not given', 'notGiven'], ['Waiting', 'waiting']];
async function buildWorkbook(rows, from, to) {
  const ExcelJS = await loadExcelJs();
  const wb = new ExcelJS.Workbook(); wb.creator = 'PSM Vaccine Clinic';
  const bold = { bold: true }, headFont = { bold: true, color: { argb: 'FFFFFFFF' } };
  const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const kindFill = r => fill(XL_FILL[vaxKind(r.vaccine) || 'other']);
  rows = rows.filter(r => r.status !== 'checkedin').sort((a, b) => (a.date + (a.givenAt || a.time)).localeCompare(b.date + (b.givenAt || b.time)));
  const dates = [...new Set(rows.map(r => r.date))].sort();

  // Summary: totals, then one row per day
  const sum = wb.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 6 }] });
  sum.addRow([`PSM Pharmacy vaccinations, ${longDate(from)} to ${longDate(to)}`]).font = { bold: true, size: 14 };
  sum.addRow([`Exported ${longDate(todayIso())} ${nowTime()}`]).font = { color: { argb: 'FF5D6E72' } };
  sum.addRow([]);
  const tot = dayNumbers(rows);
  const tr = sum.addRow(['Whole range', ...NUM_COLS.map(([, k]) => tot[k])]); tr.font = bold; tr.fill = fill(XL_FILL.day);
  sum.addRow([]);
  const sh = sum.addRow(['Date', ...NUM_COLS.map(([h]) => h)]); sh.font = headFont; sh.fill = fill(XL_FILL.head);
  dates.forEach(d => { const x = dayNumbers(rows.filter(r => r.date === d)); const row = sum.addRow([longDate(d), ...NUM_COLS.map(([, k]) => x[k])]); if (x.toRecord) row.getCell(1 + NUM_COLS.findIndex(c => c[1] === 'toRecord') + 1).fill = fill(XL_FILL.warn); });
  sum.getColumn(1).width = 20; NUM_COLS.forEach((c, i) => { sum.getColumn(i + 2).width = Math.max(10, c[0].length + 2); });
  sum.getColumn(1 + NUM_COLS.findIndex(c => c[1] === 'takings') + 1).numFmt = '"£"#,##0.00';

  // One tab per day: NHS vaccinations
  const headRow = ws => { const h = ws.addRow(EXPORT_COLS.map(c => c[0])); h.font = headFont; h.fill = fill(XL_FILL.head); EXPORT_COLS.forEach((c, i) => { ws.getColumn(i + 1).width = c[2]; }); };
  const used = new Set();
  dates.forEach(d => {
    const dayRows = rows.filter(r => r.date === d && !isPriv(r));
    if (!dayRows.length) return;
    let name = new Date(d + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' }).replace(/,/g, '');
    while (used.has(name)) name += ' ';
    used.add(name);
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 3 }] });
    const x = dayNumbers(rows.filter(r => r.date === d));
    ws.addRow([longDate(d)]).font = { bold: true, size: 13 };
    ws.addRow([`${x.patients} patients · ${x.flu} flu · ${x.covid} COVID${x.other ? ` · ${x.other} other` : ''} · ${x.onRavs} on RAVS · ${x.toRecord} not yet on RAVS${x.privFlu + x.privCovid ? ` · ${x.privFlu + x.privCovid} private (see Private tab)` : ''}`]);
    headRow(ws);
    dayRows.forEach(r => { const row = ws.addRow(EXPORT_COLS.map(c => c[1](r) ?? '')); row.getCell(11).fill = kindFill(r); if (r.status === 'given') row.getCell(22).fill = fill(XL_FILL.warn); });
  });

  // Private: one tab, a heading row per date
  const priv = rows.filter(isPriv);
  const pw = wb.addWorksheet('Private');
  pw.addRow(['Private vaccinations (not recorded on RAVS)']).font = { bold: true, size: 13 };
  const pt = dayNumbers(priv);
  pw.addRow([`${pt.privFlu} private flu · ${pt.privCovid} private COVID · £${pt.takings.toFixed(2)} taken`]);
  headRow(pw);
  [...new Set(priv.map(r => r.date))].sort().forEach(d => {
    const dr = priv.filter(r => r.date === d), x = dayNumbers(dr);
    const h = pw.addRow([`${longDate(d)}: ${x.privFlu} flu, ${x.privCovid} COVID, £${x.takings.toFixed(2)}`]); h.font = bold; h.fill = fill(XL_FILL.priv);
    dr.forEach(r => { const row = pw.addRow(EXPORT_COLS.map(c => c[1](r) ?? '')); row.getCell(11).fill = kindFill(r); });
  });
  pw.getColumn(EXPORT_COLS.findIndex(c => c[0] === 'Price') + 1).numFmt = '"£"#,##0.00';
  return wb;
}
async function exportExcel() {
  const season = S.seasonStart || todayIso();
  openModal(`<h2>Export to Excel</h2>
    <div class="vaxpick"><button type="button" class="chip small" data-exrange="season" aria-pressed="true">Whole season</button><button type="button" class="chip small" data-exrange="range" aria-pressed="false">Pick dates</button></div>
    <div class="editgrid" id="exDates" hidden><div class="f"><label for="exFrom">From</label><input type="date" id="exFrom" value="${esc(season)}"></div><div class="f"><label for="exTo">To</label><input type="date" id="exTo" value="${todayIso()}"></div></div>
    <p class="small muted" style="margin:0">You get a Summary tab with the numbers for each day, a tab for each clinic day, and a Private tab.</p>
    <div class="actions"><button type="button" class="btn primary" id="exGo">Download Excel file</button><button type="button" class="btn ghost" data-close>Close</button></div><div id="exOut"></div>`);
  $$('[data-exrange]').forEach(b => b.onclick = () => { $$('[data-exrange]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('#exDates').hidden = b.dataset.exrange !== 'range'; if (b.dataset.exrange === 'season') { $('#exFrom').value = season; $('#exTo').value = todayIso(); } });
  $('#exGo').onclick = async () => {
    const from = $('#exFrom').value || season, to = $('#exTo').value || todayIso();
    $('#exGo').disabled = true; $('#exOut').innerHTML = '<p class="small muted">Making the file…</p>';
    try {
      const rows = await API.exportRows(from, to);
      const wb = await buildWorkbook(rows, from, to);
      const blob = new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob), name = `PSM vaccinations ${ukDate(from).replace(/\//g, '-')} to ${ukDate(to).replace(/\//g, '-')}.xlsx`;
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      $('#exOut').innerHTML = `<p class="small">${rows.filter(r => r.status !== 'checkedin').length} rows. If it didn't download, <a href="${url}" download="${esc(name)}" target="_blank" rel="noopener">click here to save the file</a>.</p>`;
    } catch (e) {
      console.warn(e);
      $('#exOut').innerHTML = `<div class="alert bad">Couldn't make the Excel file (${esc(e && e.message || 'the Excel tool did not load')}). Check the internet connection and try again.</div>`;
    } finally { $('#exGo').disabled = false; }
  };
}

/* ---------- settings ---------- */
function renderSettings() {
  const opt = (list, cur) => list.map(x => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join('');
  $('#sVaccinator').innerHTML = '<option value=""></option>' + opt(S.vaccinators || [], S.vaccinator);
  $('#sSite').innerHTML = opt(SITES, S.site); $('#sConsent').innerHTML = opt(CONSENTS, S.consent);
  // Once the helper has read RAVS's "Who is the vaccinator?" page, names can only be picked from RAVS, never typed.
  const fromRavs = (S.ravsVaccinators || []).length > 0;
  $('#sVaccinators').hidden = fromRavs;
  $('#sVaxRavs').hidden = !fromRavs;
  $('#sVaxRavs').innerHTML = (S.ravsVaccinators || []).map(n => `<button type="button" class="chip small" data-ravsvax="${esc(n)}" aria-pressed="${(S.vaccinators || []).includes(n)}">${esc(n)}</button>`).join('');
  $('#sVaxHint').textContent = fromRavs ? `Names as RAVS shows them (read ${S.ravsVaccinatorsAt ? ukDate(S.ravsVaccinatorsAt.slice(0, 10)) : ''}). Tap to choose who vaccinates here.`
    : "One per line, exactly as RAVS shows them under \"Who is the vaccinator?\". After the RAVS Helper has been on that page once, this becomes a list from RAVS and can't be mistyped.";
  $('#sVaccinators').value = (S.vaccinators || []).join('\n'); $('#sStaff').value = (S.staff || []).join('\n'); $('#sLocations').value = (S.locations || []).join('\n');
  $('#sPrivFlu').value = priceOf('Private flu'); $('#sPrivCov').value = priceOf('Private COVID');
  $('#sFluAge').value = S.fluAge; $('#sFluDate').value = S.fluDate; $('#sCovAge').value = S.covAge; $('#sCovDate').value = S.covDate; $('#sSeason').value = S.seasonStart; $('#sNasalFrom').value = S.nasalFrom; $('#sNasalTo').value = S.nasalTo;
  renderProdTable();
}
function renderProdTable() {
  $('#prodTable').innerHTML = `<thead><tr><th>Vaccine</th><th>Product (as RAVS names it)</th><th>Batch</th><th>Expiry</th><th>In use</th></tr></thead><tbody>` +
    (S.products || []).map((p, i) => `<tr data-prod="${i}"><td><select data-pk="vaccine">${Object.keys(VACCINES).map(v => `<option ${v === p.vaccine ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></td>
      <td><input data-pk="product" value="${esc(p.product)}" style="min-width:260px"></td><td><input class="mono" data-pk="batch" value="${esc(p.batch)}" style="width:130px"></td>
      <td><input type="date" data-pk="expiry" value="${esc(p.expiry)}"></td><td><input type="checkbox" data-pk="active" ${p.active ? 'checked' : ''} aria-label="In use"></td></tr>`).join('') + '</tbody>';
  $$('#prodTable input:not([type=checkbox]), #prodTable select').forEach(el => { el.style.padding = '6px 8px'; el.style.border = '1px solid var(--line)'; el.style.borderRadius = '6px'; el.style.background = 'var(--surface)'; });
}
function readProducts() {
  return $$('#prodTable tr[data-prod]').map(tr => ({ vaccine: $('[data-pk=vaccine]', tr).value, product: $('[data-pk=product]', tr).value.trim(), batch: $('[data-pk=batch]', tr).value.trim().toUpperCase(), expiry: $('[data-pk=expiry]', tr).value, active: $('[data-pk=active]', tr).checked })).filter(p => p.product);
}
async function saveSettings(ev) {
  ev.preventDefault();
  const lines = id => $(id).value.split('\n').map(s => s.trim()).filter(Boolean);
  const s = Object.assign({}, S, { products: readProducts(), vaccinators: (S.ravsVaccinators || []).length ? $$('#sVaxRavs [aria-pressed="true"]').map(b => b.dataset.ravsvax) : lines('#sVaccinators'), staff: lines('#sStaff'), locations: lines('#sLocations'),
    vaccinator: $('#sVaccinator').value, site: $('#sSite').value, consent: $('#sConsent').value,
    prices: { 'Private flu': +$('#sPrivFlu').value || 0, 'Private COVID': +$('#sPrivCov').value || 0 },
    fluAge: +$('#sFluAge').value, fluDate: $('#sFluDate').value, covAge: +$('#sCovAge').value, covDate: $('#sCovDate').value, seasonStart: $('#sSeason').value, nasalFrom: $('#sNasalFrom').value, nasalTo: $('#sNasalTo').value });
  if (!s.vaccinators.includes(s.vaccinator)) s.vaccinator = s.vaccinators[0] || '';
  await API.saveSettings(s); toast('Settings saved'); await refresh(true);
}

/* ---------- modal ---------- */
function openModal(html) { $('#modalHost').innerHTML = `<div class="scrim" data-scrim><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; }
function closeModal() { $('#modalHost').innerHTML = ''; }
function openPaste() {
  openModal(`<h2>Paste bookings</h2>
    <p class="small muted">In Manage your appointments, open the day, select everything from the date heading to the last appointment (or press Cmd+A), copy, and paste it here. The date is picked up from the page. Nothing is read from the website directly.</p>
    <div class="editgrid"><div class="f"><label for="pDate">Appointments are for</label><input type="date" id="pDate" value="${$('#bkDate').value || todayIso()}"></div></div>
    <textarea id="pText" placeholder="09:06	SURNAME FIRSTNAME 1234567890	18 May 1957	07…	Flu 65+	Cancel"></textarea>
    <div id="pPrev"></div>
    <div class="actions"><button type="button" class="btn primary" id="pImport" disabled>Add bookings</button><button type="button" class="btn ghost" data-close>Cancel</button></div>`);
  const prev = () => {
    const list = parseBookings($('#pText').value, $('#pDate').value);
    $('#pImport').disabled = !list.length;
    $('#pPrev').innerHTML = list.length ? `<p class="small"><b>${list.length} appointments found.</b> Check a few before adding.</p><div class="tablewrap" style="max-height:240px"><table><thead><tr><th>Time</th><th>Name</th><th>NHS number</th><th>DOB</th><th>Vaccines</th></tr></thead><tbody>${list.map(b => `<tr><td class="mono">${esc(b.time)}</td><td>${esc(b.surname)}, ${esc(b.given)}</td><td class="mono">${esc(fmtNhs(b.nhs))}</td><td class="mono">${esc(ukDate(b.dob))}</td><td>${esc(b.vaccines.join(' + '))}</td></tr>`).join('')}</tbody></table></div>` : ($('#pText').value.trim() ? '<div class="alert warn">No appointments recognised yet. Make sure the copy includes the time, name, NHS number and date of birth columns.</div>' : '');
    return list;
  };
  $('#pText').addEventListener('input', () => { const d = bookingsDate($('#pText').value); if (d) $('#pDate').value = d; prev(); }); $('#pDate').addEventListener('change', prev);
  $('#pImport').onclick = async () => {
    const list = prev(); const now = new Date().toISOString();
    const rows = []; list.forEach(b => { const visitId = uid(); b.vaccines.forEach(v => rows.push({ id: uid(), visitId, date: b.date, time: b.time, source: 'Booked', nhs: b.nhs, surname: b.surname, given: b.given, dob: b.dob, postcode: '', phone: b.phone || '', vaccine: v, product: defaultProduct(v, b.dob, S), batch: '', eligibility: '', eligNote: '', consent: S.consent, site: S.site, vaccinator: '', deskBy: me, location: 'Pharmacy', status: 'booked', givenAt: '', enteredAt: '', enteredBy: '', note: b.service, updatedAt: now })); });
    $('#bkDate').value = $('#pDate').value;
    const res = await API.importBookings(rows); closeModal(); toast(`${res.added} bookings added${list.length - res.added ? `, ${list.length - res.added} were already in` : ''}`); await refresh(true);
  };
}
function openNotGiven(visitId) {
  openModal(`<h2>Not given</h2><div class="f"><label for="ngWhy">Reason</label><select id="ngWhy"><option>Patient declined</option><option>Unwell today</option><option>Not eligible</option><option>Had it elsewhere</option><option>Left before vaccination</option><option>Other</option></select></div>
    <div class="f"><label for="ngNote">Detail (optional)</label><input id="ngNote"></div><div class="actions"><button type="button" class="btn primary" id="ngGo">Save</button><button type="button" class="btn ghost" data-close>Cancel</button></div>`);
  $('#ngGo').onclick = async () => { const ids = ROWS.filter(r => r.visitId === visitId && r.status === 'waiting').map(r => r.id); await API.update(ids, { status: 'notgiven', note: [$('#ngWhy').value, $('#ngNote').value].filter(Boolean).join(': ') }); closeModal(); toast('Marked as not given'); await refresh(true); };
}

/* ===================== events ===================== */
function showTab(name) {
  if (!$('#tab-' + name)) name = 'desk';
  $$('nav.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name));
  $$('section.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + name));
  store.set('psm.tab', name);
  if (name === 'private') loadPrivate();
}
document.addEventListener('click', async ev => {
  if (ev.target.closest('#ravsCheck')) return checkRavs();
  // A helper that is answering brings the RAVS tab to the front (or opens it); otherwise open RAVS in a new tab.
  if (ev.target.closest('#ravsBtn')) {
    ev.preventDefault();
    const scr = { left: screen.availLeft || 0, top: screen.availTop || 0, width: screen.availWidth, height: screen.availHeight };
    if (helperAnswering() && !verLt(EXT.version, '0.5.0')) { window.postMessage({ psm: 'app-side-by-side', screen: scr }, '*'); return setTimeout(askRavs, 2500); }
    if (helperAnswering()) { window.postMessage({ psm: 'app-show-ravs' }, '*'); return setTimeout(askRavs, 2500); }
    // No helper: open RAVS in its own window on the right half of the screen.
    const half = Math.floor(scr.width / 2);
    const w = window.open($('#ravsBtn').href, 'psm-ravs', `popup,left=${scr.left + half},top=${scr.top},width=${half},height=${scr.height}`);
    if (!w) toast("Chrome didn't open RAVS from here. Use your RAVS bookmark.");
    return;
  }
  const b = ev.target.closest('button, [data-scrim]'); if (!b) return;
  const d = b.dataset;
  if (b.matches('[data-scrim]') && ev.target === b) return closeModal();
  if (d.tab) return showTab(d.tab);
  if (d.goto) return showTab(d.goto);
  if (d.vax) {
    const v = d.vax;
    // Private and NHS vaccines are never mixed in one visit.
    form.vaccines = form.vaccines.includes(v) ? form.vaccines.filter(x => x !== v) : [...form.vaccines.filter(x => isPriv(x) === isPriv(v)), v];
    return renderDeskForm();
  }
  if ('find' in d) return startFind();
  if ('showravs' in d) return window.postMessage({ psm: 'app-show-ravs' }, '*');
  if ('findcancel' in d) { cancelFind(); form.step = 'find'; return renderFind(); }
  if ('findok' in d) return confirmPatient(true);
  if ('findskip' in d) return confirmPatient(false);
  if ('findno' in d) { form.step = 'find'; form.found = null; form.findMsg = 'Not the right patient. Check the details with the patient and search again.'; renderFind(); return $('#fNhs').focus(); }
  if ('findchange' in d) { form.step = 'find'; form.found = null; form.ravs = null; form.checked = false; renderFind(); return $('#fNhs').focus(); }
  if (d.vaxview) { if (d.vaxview === 'private') form.vaccines = []; vaxView = d.vaxview; return renderDeskForm(); }
  if ('vaxback' in d) { if (vaxView === 'private') form.vaccines = []; vaxView = 'main'; return renderDeskForm(); }
  if (d.toggleTodo) { openTodo.has(d.toggleTodo) ? openTodo.delete(d.toggleTodo) : openTodo.add(d.toggleTodo); return renderTodo(); }
  if (d.checkin) return checkInBooking(d.checkin);
  if (d.ravsvax) { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); return; }
  if (d.copybk) { const r = allRows().find(x => x.visitId === d.copybk); if (r) copyText(bookingText(r), b); return; }
  if (d.give) return giveVisit(d.give);
  if (d.notgiven) return openNotGiven(d.notgiven);
  if (d.edit) { editing = d.edit; return renderVax(); }
  if (d.editTodo) { editing = d.editTodo; showTab('desk'); renderVax(); return $(`[data-dose]`)?.scrollIntoView({ block: 'center' }); }
  if ('cancelEdit' in d) { editing = null; return renderVax(); }
  if (d.saveEdit) {
    const changes = $$(`[data-dose]`).map(el => { const patch = {}; $$('[data-k]', el).forEach(i => patch[i.dataset.k] = i.value); if (patch.status === 'given' && !patch.batch) patch.batch = batchFor(patch.product, S); return { id: el.dataset.dose, patch }; });
    await API.updateEach(changes); editing = null; toast('Changes saved'); return refresh(true);
  }
  if (d.undo) { await API.update(ROWS.filter(r => r.visitId === d.undo && (r.status === 'given' || (isPriv(r) && r.status === 'entered'))).map(r => r.id), { status: 'waiting', givenAt: '', enteredAt: '', enteredBy: '' }); return refresh(true); }
  if (d.copy !== undefined) return copyText(d.copy, b);
  if (d.entered) { await API.update([d.entered], { status: 'entered', enteredAt: `${todayIso()} ${nowTime()}`, enteredBy: me }); toast('Marked as recorded'); return refresh(true); }
  if (d.fill) return sendToRavs(ROWS.filter(r => r.id === d.fill));
  if (b.id === 'fillAll') return sendToRavs(ROWS.filter(r => r.status === 'given' && (VACCINES[r.vaccine]?.target || 'RAVS') === 'RAVS').sort((a, b) => (a.givenAt || a.date).localeCompare(b.givenAt || b.date) || a.visitId.localeCompare(b.visitId)));
  if (d.todofilter) { todoFilter = d.todofilter; return renderTodo(); }
  if ('close' in d) return closeModal();
  if (b.id === 'pasteBtn') return openPaste();
  if (b.id === 'clearForm') return clearForm();
  if (b.id === 'offlineBtn') { offline = !offline; store.set('psm.offline', offline); form.findMsg = ''; if (!['find', 'error'].includes(form.step)) clearForm(); return renderFind(); }
  if (b.id === 'exportBtn') return exportExcel();
  if (b.id === 'addProd') { S.products = readProducts().concat([{ vaccine: 'Flu', product: '', batch: '', expiry: '', active: true }]); renderProdTable(); }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.dataset.eligReason) { (form.elig[t.dataset.eligReason] ||= {}).reason = t.value; }
  if (t.id === 'meSel' || t.id === 'sOperator') { me = t.value; $('#meSel').value = $('#sOperator').value = me; store.set('psm.me', me); store.set('psm.meDay', todayIso()); $('#opBox').classList.toggle('empty', !me); $('#opBox').classList.remove('flash'); }
  if (t.id === 'fLocation') { store.set('psm.loc', t.value); renderExtraSum(); }
});
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.dataset.eligNote) { (form.elig[t.dataset.eligNote] ||= {}).note = t.value; }
  if (t.id === 'fNhs') { onNhsInput(); checkDuplicates(); }
  if (t.id === 'fDob') { onDobInput(); checkDuplicates(); }
  if (t.id === 'fSurname') checkDuplicates();
  if (t.id === 'searchBox') onSearch();
  if (t.id === 'fPhone' || t.id === 'fNote') renderExtraSum();
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeModal(); });
$('#fNhs').addEventListener('blur', () => { const n = cleanNhs($('#fNhs').value); if (n.length === 10) $('#fNhs').value = fmtNhs(n); });
$('#fDob').addEventListener('blur', () => { const d = parseDob($('#fDob').value); if (d) $('#fDob').value = ukDate(d); });
$('#fPostcode').addEventListener('blur', () => { $('#fPostcode').value = fmtPostcode($('#fPostcode').value); });
// A copied booking pasted into any Find patient box fills all of them.
['#fNhs', '#fDob', '#fGiven', '#fSurname', '#fPostcode'].forEach(id => $(id).addEventListener('paste', ev => {
  const got = pastePatient((ev.clipboardData || window.clipboardData)?.getData('text'));
  if (!got) return;
  ev.preventDefault();
  if (got.nhs) $('#fNhs').value = fmtNhs(cleanNhs(got.nhs));
  if (got.dob) $('#fDob').value = got.dob;
  if (got.given) $('#fGiven').value = titleCase(got.given);
  if (got.surname) $('#fSurname').value = got.surname.toUpperCase();
  if (got.postcode) $('#fPostcode').value = fmtPostcode(got.postcode);
  onNhsInput(); onDobInput(); checkDuplicates();
  toast('Patient details pasted. Press Search RAVS.');
}));
$('#bkDate').addEventListener('change', async () => { await loadMore(); renderBookings(); });
$('#deskForm').addEventListener('submit', submitDesk);
$('#setForm').addEventListener('submit', saveSettings);

/* ===================== RAVS Helper link ===================== */
const EXT = { ready: false, version: '', ravs: '', error: '' };
const BUILD = '21 Oct 2026, 1';
function renderBuild() { $('#buildInfo').textContent = `App version ${BUILD} · RAVS Helper ${EXT.ready ? EXT.version + (EXT.error ? ' (not reachable, reload this page)' : '') : 'not installed on this computer'}`; }
renderBuild();
// Header: Open RAVS, and a connection button that shows (and on click checks) whether RAVS and the helper are ready.
const canAskRavs = () => EXT.ready && !verLt(EXT.version, '0.4.0');
// A helper removed or updated while this page was open stops answering until the page is reloaded.
const helperAnswering = () => canAskRavs() && Date.now() - (EXT.answeredAt || 0) < 25000;
function askRavs() { if (canAskRavs() && document.visibilityState === 'visible') window.postMessage({ psm: 'app-ravs-status' }, '*'); }
setInterval(() => { askRavs(); renderRavs(); }, 10000);
setTimeout(renderRavs, 3000); // by then the helper has said hello if it is installed
document.addEventListener('visibilitychange', askRavs);
function renderRavs() {
  const [dot, text, title] = !EXT.ready ? ['wait', 'Helper not found', "This page can't see the RAVS Helper. If it is installed (chrome://extensions), reload this page (Cmd+R)."]
    : EXT.error ? ['wait', 'Not connected', "This page can't reach the RAVS Helper. Reload this page (Cmd+R)."]
    : !canAskRavs() ? ['wait', 'Check RAVS', 'Update the RAVS Helper to check the connection here.']
    : EXT.answeredAt && !helperAnswering() ? ['wait', 'Not connected', 'The RAVS Helper stopped answering. Reload this page (Cmd+R).']
    : ({ ready: ['', 'Connected', 'RAVS is open and logged in, and the RAVS Helper is running there.'],
         login: ['wait', 'RAVS: log in', 'RAVS is open but needs you to log in.'],
         reload: ['wait', 'RAVS: reload', 'The RAVS Helper is not running in the RAVS tab yet. Reload the RAVS tab (Cmd+R).'] }[EXT.ravs]
       || ['idle', 'RAVS not open', 'RAVS is not open. Press Open RAVS and log in.']);
  $('#ravsDot').className = 'dot ' + dot; $('#ravsText').textContent = text; $('#ravsCheck').title = title;
  return title;
}
// Check connection: ask the helper now and say the answer in words.
function checkRavs() {
  if (!EXT.ready) return toast("The RAVS Helper isn't installed in Chrome on this computer.");
  if (!canAskRavs()) return toast('Update the RAVS Helper on this computer to check the connection.');
  const asked = Date.now(); $('#ravsText').textContent = 'Checking…';
  window.postMessage({ psm: 'app-ravs-status' }, '*');
  setTimeout(() => {
    if ((EXT.answeredAt || 0) < asked) { EXT.error = EXT.error || 'no answer'; renderRavs(); renderBuild(); return toast("No answer from the RAVS Helper. Reload this page (Cmd+R) and check again."); }
    toast(renderRavs());
  }, 2500);
}
// RAVS's own vaccinator names replace typed ones; a typed name close to a RAVS name (case, a letter short) takes the RAVS spelling.
async function onRavsVaccinators(names, at) {
  if (JSON.stringify(names) === JSON.stringify(S.ravsVaccinators || [])) return;
  const low = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const close = (a, b) => { const ws = low(a).split(' '); return low(a) === low(b) || (ws.length > 1 && ws.every(w => low(b).includes(w.slice(0, Math.max(3, Math.min(w.length, 5)))))); };
  const pick = n => names.find(x => x === n) || names.find(x => close(n, x));
  const vaccinators = [...new Set((S.vaccinators || []).map(pick).filter(Boolean))];
  const s = Object.assign({}, S, { ravsVaccinators: names, ravsVaccinatorsAt: at || new Date().toISOString(), vaccinators, vaccinator: pick(S.vaccinator) || vaccinators[0] || '' });
  await API.saveSettings(s); await refresh(true);
  toast('Vaccinator names updated from RAVS. Check them in Settings.');
}
function ravsJob(r) {
  return { id: r.id, visitId: r.visitId, nhs: r.nhs, given: r.given, surname: r.surname, dob: r.dob, postcode: r.postcode, date: r.date,
    vaccine: r.vaccine, ravsVaccine: VACCINES[r.vaccine]?.ravs || r.vaccine, product: r.product, batch: r.batch, vaccinator: r.vaccinator,
    eligibility: r.eligibility, consent: r.consent, site: r.site, note: r.note || '' };
}
function sendToRavs(rows) {
  const bad = rows.filter(r => !r.batch || !r.vaccinator || !r.eligibility);
  if (bad.length) toast(`${bad.length} need a batch, vaccinator or reason first. Use Edit.`);
  const ok = rows.filter(r => !bad.includes(r));
  if (!ok.length) return;
  window.postMessage({ psm: 'app-queue', jobs: ok.map(ravsJob) }, '*');
}
window.addEventListener('message', async ev => {
  if (ev.source !== window || !ev.data) return;
  const d = ev.data;
  if (d.psm === 'ext-ready') { EXT.version = d.version || ''; renderBuild(); if (!EXT.ready) { EXT.ready = true; renderTodo(); renderFind(); } renderRavs(); askRavs(); }
  if (d.psm === 'ext-ravs-status') { EXT.ravs = d.state; EXT.answeredAt = Date.now(); EXT.error = ''; renderRavs(); renderBuild(); }
  if (d.psm === 'ext-side-by-side-failed') { console.warn('RAVS Helper:', d.message); toast("Couldn't put RAVS beside the app, so it's shown in its own tab."); }
  if (d.psm === 'ext-error') {
    EXT.error = d.message || 'unknown'; EXT.answeredAt = 0; console.warn('RAVS Helper:', EXT.error); renderRavs(); renderBuild();
    if (form.step === 'searching') { cancelFind(); form.step = 'error'; form.findMsg = "This page can't reach the RAVS Helper (it was probably updated after the page opened). Reload this page (Cmd+R) and search again."; renderFind(); }
  }
  if (d.psm === 'ext-lookup-started' && d.id === form.lookupId) { form.lookupStarted = true; if (d.status) { form.findStatus = d.status; renderFind(); } }
  if (d.psm === 'ext-lookup-status' && d.id === form.lookupId && form.step === 'searching') { form.lookupStarted = form.lookupHeard = true; form.findStatus = d.text || ''; renderFind(); }
  if (d.psm === 'ext-lookup' && Array.isArray(d.results)) { d.results.forEach(onLookup); window.postMessage({ psm: 'app-lookup-ack', ids: d.results.map(x => x.id) }, '*'); }
  if (d.psm === 'ext-vaccinators' && Array.isArray(d.names) && d.names.length) onRavsVaccinators(d.names, d.at);
  if (d.psm === 'ext-queued') toast(`${d.added} sent to RAVS Helper (${d.total} in its queue)`);
  if (d.psm === 'ext-done' && Array.isArray(d.results) && d.results.length) {
    const changes = d.results.map(x => {
      const patch = { status: 'entered', enteredAt: x.at ? `${isoDate(new Date(x.at))} ${pad(new Date(x.at).getHours())}:${pad(new Date(x.at).getMinutes())}` : `${todayIso()} ${nowTime()}`, enteredBy: 'RAVS Helper' + (me ? ' (' + me + ')' : '') };
      if (x.address) patch.address = x.address; if (x.gp) patch.gp = x.gp;
      const row = ROWS.find(r => r.id === x.id); if (x.nhs && row && !row.nhs) patch.nhs = x.nhs;
      return { id: x.id, patch };
    });
    try { await API.updateEach(changes); window.postMessage({ psm: 'app-ack', ids: d.results.map(x => x.id) }, '*'); toast(`${changes.length} marked as recorded on RAVS`); refresh(true); } catch (e) { console.warn(e); }
  }
});

/* ===================== boot ===================== */
$('#demoBanner').hidden = hasGas;
showTab(store.get('psm.tab', 'desk'));
refresh(true);
window.postMessage({ psm: 'app-hello' }, '*');
setInterval(() => { if (!editing && document.visibilityState === 'visible') refresh(false); }, hasGas ? 12000 : 4000);
