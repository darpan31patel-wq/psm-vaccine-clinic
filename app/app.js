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
const STATUS_LABEL = { deleted: 'Deleted', booked: 'Booked', waiting: 'Waiting', given: 'Given', entered: 'On RAVS', notgiven: 'Not given', checkedin: 'Checked in' };
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
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, Math.max(2600, String(msg).length * 60)); }
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
  if (db) db.rows.forEach(r => { if (r.status === 'waiting') { r.status = 'given'; r.givenAt = r.givenAt || `${r.date} ${r.time}`; } });
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
    async recallGet() { if (!db.recall) { db.recall = demoRecall(db.rows); store.set(KEY, db); } return db.recall.map(p => Object.assign({}, p)); },
    async recallSave(people) { const at = new Map((db.recall || []).map((p, i) => [p.key, i])); people.forEach(p => at.has(p.key) ? Object.assign(db.recall[at.get(p.key)], p) : db.recall.push(p)); save(); return { ok: true }; },
    async recallContact(key, patch) { const p = (db.recall || []).find(x => x.key === key); if (p) Object.assign(p, patch); save(); return { ok: true }; },
  };
  // Made-up past patients: some who came back this season, the rest not yet.
  function demoRecall(rows) {
    const first = ['Amy', 'Bob', 'Cara', 'Dev', 'Ella', 'Finn', 'Gail', 'Hugo', 'Iris', 'Joe', 'Kim', 'Leo', 'Maya', 'Noel', 'Opal', 'Pete', 'Rosa', 'Sam', 'Tess', 'Vic'];
    const last = ['Testwell', 'Mockley', 'Samplin', 'Dummett', 'Fakeham', 'Notley', 'Pretendo', 'Madeson', 'Examply', 'Trialby'];
    const out = [];
    rows.filter(r => r.surname !== 'HISTORIC' && r.nhs && !isPriv(r)).forEach(r => { if (!out.some(p => p.key === r.nhs)) out.push({ key: r.nhs, nhs: r.nhs, surname: r.surname, given: r.given, dob: r.dob, gender: '', postcode: r.postcode, address: '', phone: '', history: '2025-26 Flu, COVID; 2024-25 Flu', reason: '', source: 'Old sheets', contact: '', contactAt: '', contactBy: '', contactNote: '' }); });
    for (let i = 0; i < 46; i++) {
      const y = i % 3 === 0 ? 1980 + (i % 15) : 1932 + (i * 7) % 28, nhs = nhsWithCheck('99950' + String(2000 + i * 53).padStart(4, '0'));
      const hist = i % 5 === 0 ? '2023-24 Flu' : i % 4 === 0 ? '2025-26 Flu; 2024-25 Flu, COVID; 2023-24 Flu' : i % 2 ? '2025-26 Flu, COVID' : '2025-26 Flu';
      const contact = i === 3 ? 'called' : i === 8 ? 'texted' : i === 13 ? 'declined' : i === 21 ? 'elsewhere' : '';
      out.push({ key: nhs, nhs, surname: last[i % 10].toUpperCase(), given: first[(i * 3) % 20], dob: `${y}-${pad(1 + i % 12)}-${pad(1 + (i * 5) % 28)}`, gender: '', postcode: `KT${5 + i % 2} ${i % 9}${'ABDEFGHJ'[i % 8]}${'LNPQRSTU'[i % 8]}`,
        address: '', phone: i % 3 ? `07700 900${String(100 + i).slice(-3)}` : '', history: hist, reason: y > 1960 ? ['Clinical Risk Group', 'Carer', 'Pregnant'][i % 3] : '', source: 'Old sheets',
        contact, contactAt: contact ? `${todayIso()} 10:${pad(10 + i)}` : '', contactBy: contact ? 'Front desk 1' : '', contactNote: '' });
    }
    return out;
  }
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
  return rows.filter(r => r.status !== 'checkedin' && r.status !== 'deleted' && r.date >= (seasonStart || '') && (
    (qn.length >= 6 && r.nhs.includes(qn)) || (qd && r.dob === qd) ||
    (`${r.surname} ${r.given}`.toLowerCase().includes(q)) || (`${r.given} ${r.surname}`.toLowerCase().includes(q))
  )).slice(-80).reverse();
}

/* Save queue: a patient save that can't reach Google (internet or Google down) is kept in this computer's Chrome and
   sent again, in order, as soon as it can be. Each save carries the operator's name for the Changes tab. */
const OUTBOX_KEY = 'psm.outbox';
let outboxErr = '', flushing = false;
const outbox = () => store.get(OUTBOX_KEY, []);
function setOutbox(list) { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)); }
function queued(fn) {
  return (...args) => {
    const job = { id: uid(), fn, args, who: me, at: new Date().toISOString() };
    const keep = e => {
      setOutbox(outbox().concat([job])); // throws if Chrome won't store it, so the save shows as failed instead of vanishing
      outboxErr = String((e && (e.message || e)) || '');
      applyOutbox(); renderAll(false); renderOutbox();
      setTimeout(() => toast('No connection to Google. Saved on this computer and it will be sent automatically.'), 1200);
      return { ok: true, queued: true };
    };
    // Saves already waiting go first, so changes reach Google in the order they were made.
    if (outbox().length) { const out = keep(null); flushOutbox(); return Promise.resolve(out); }
    return gas(fn, ...args, { who: me }).catch(keep);
  };
}
async function flushOutbox() {
  if (!hasGas || flushing || !outbox().length) return;
  flushing = true;
  let sent = 0;
  try {
    for (let job = outbox()[0]; job; job = outbox()[0]) {
      await gas(job.fn, ...job.args, { who: job.who });
      setOutbox(outbox().filter(j => j.id !== job.id)); sent++;
    }
    outboxErr = '';
  } catch (e) { outboxErr = String((e && (e.message || e)) || ''); }
  finally { flushing = false; renderOutbox(); }
  if (sent && !outbox().length) { toast(`Connection back: ${sent === 1 ? 'the waiting save was' : `${sent} waiting saves were`} sent to Google`); refresh(true); }
}
// Shows saves still waiting on this computer in the board's rows, so nobody thinks they're lost.
function applyOutbox() {
  outbox().forEach(j => {
    if (j.fn === 'apiRegister') (j.args[0].rows || []).forEach(r => { if (!ROWS.some(x => x.id === r.id)) ROWS.push(Object.assign({}, r)); });
    const changes = j.fn === 'apiUpdate' ? j.args[0].map(id => ({ id, patch: j.args[1] })) : j.fn === 'apiUpdateEach' ? j.args[0] : [];
    changes.forEach(c => { const r = ROWS.find(x => x.id === c.id); if (r) Object.assign(r, c.patch); });
  });
  ROWS = ROWS.filter(r => r.status !== 'deleted');
}
function renderOutbox() {
  const n = outbox().length;
  if (!n) return;
  $('#syncDot').classList.add('off'); $('#syncBox').classList.add('bad');
  $('#syncText').textContent = `${n} waiting to save`;
  $('#syncBox').title = `${n} ${n === 1 ? 'save is' : 'saves are'} kept on this computer and will be sent to Google automatically when the connection is back. Don't clear Chrome's browsing data until this goes.` + (outboxErr ? ` Last problem: ${outboxErr}` : '');
}
setInterval(flushOutbox, 15000);
window.addEventListener('online', flushOutbox);

const meta = () => ({ who: me });
const API = hasGas ? {
  board: (v, t) => gas('apiBoard', v, t),
  register: queued('apiRegister'),
  update: queued('apiUpdate'),
  updateEach: queued('apiUpdateEach'),
  importBookings: r => gas('apiImportBookings', r, meta()),
  search: (q, s) => gas('apiSearch', q, s),
  saveSettings: s => gas('apiSaveSettings', s, meta()),
  exportRows: (f, t) => gas('apiExport', f, t),
  recallGet: () => gas('apiRecallGet'),
  recallSave: p => gas('apiRecallSave', p, meta()),
  recallContact: (k, p) => gas('apiRecallContact', k, p, meta()),
} : Demo;

/* ===================== state ===================== */
let S = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
let ROWS = [], DAYS = [], VERSION = -1;
// The operator is kept for the day on this computer; a new day starts with the box empty.
let me = store.get('psm.meDay', '') === todayIso() ? store.get('psm.me', '') : '';
let form = { vaccines: ['Flu'], elig: {}, source: 'Walk-in', bookingVisitId: '', step: 'find' };
// Offline mode (RAVS down) stays on for this computer until it is switched off.
let offline = !!store.get('psm.offline', false);
// Vaccinator on duty is chosen per computer (two vaccinators can work at once); the shared setting is only the default.
let myVax = store.get('psm.vax', '');
const vaxOnDuty = () => (myVax && (S.vaccinators || []).includes(myVax)) ? myVax : (S.vaccinator || '');
let todoFilter = 'All';
let editing = null;

let BACKUP = {};
async function refresh(force) {
  try {
    const b = await API.board(force ? -1 : VERSION, todayIso());
    setSync(true);
    if (outbox().length) VERSION = -1; // keep fetching fresh rows until the waiting saves are in
    if (b.unchanged) return;
    const sj = JSON.stringify(b.settings || {}), settingsChanged = sj !== refresh._sj; refresh._sj = sj;
    VERSION = b.version; S = Object.assign({}, DEFAULT_SETTINGS, b.settings || {}); ROWS = (b.rows || []).filter(r => r.status !== 'deleted'); DAYS = b.days || [];
    if (hasGas) applyOutbox();
    BACKUP = { at: b.backupAt || '', copyAt: b.copyAt || '', helper: b.helperVersion || '' }; renderBuild();
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
  try { MORE = (await API.exportRows(from, to)).filter(r => r.date !== t && r.status !== 'deleted'); } catch (e) { console.warn(e); MORE = []; }
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
function setSync(ok, e) {
  $('#syncDot').classList.toggle('off', !ok); $('#syncBox').classList.toggle('bad', !ok); $('#syncText').textContent = ok ? 'Live' : 'Not saving, retrying'; $('#syncBox').title = 'Live sync';
  // While saves are waiting on this computer, the header badge says so; the red banner is only for other problems.
  if (!ok) { console.warn(e); if (!outbox().length) { showError(e); setSync.shown = true; } }
  else if (setSync.shown) { $('#appError').hidden = true; setSync.shown = false; }
  renderOutbox();
}
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
  parts.push(renderDeskLists, renderVax, renderTodo, renderRecords, () => ($('#tab-private').classList.contains('on') ? loadPrivate() : renderPrivate()), () => { if (RECALL) renderRecall(); }, updateGive);
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
  if (form.vaccines.some(isPriv)) vaxView = 'private';
  const tile = (v, label, extraCls = '') => {
    const t = tileElig(v, dob), on = form.vaccines.includes(v);
    return `<button type="button" class="vtile ${vaxKind(v)} ${extraCls} ${t.cls ? 'e-' + t.cls : ''}" data-vax="${esc(v)}" aria-pressed="${on}">
      <span class="vt-name">${esc(label || v)}</span><span class="vt-state">${t.cls === 'ok' && !VACCINES[v].private ? '✓ ' : ''}${esc(t.text)}</span>${on ? '<span class="vt-tick" aria-hidden="true">✓</span>' : ''}</button>`;
  };
  const blocked = dob ? (vaxView === 'private' ? PRIV_VAX() : ['Flu', 'COVID-19']).filter(v => checkEligibility(v, dob, S).state === 'blocked') : [];
  const stop = blocked.length ? `<div class="notelig" role="alert"><span class="ni">✕</span><div><b>NOT ELIGIBLE BY AGE</b><span>Age ${age}. ${vaxView === 'private' ? 'Private vaccination is 18 and over.' : 'Flu and COVID at the pharmacy are 18 and over.'} Do not vaccinate unless you write the reason in its eligibility box.</span></div></div>` : '';
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
  $('#editBanner').innerHTML = form.editVisit ? `<div class="editbanner"><span>Changing <b>${esc(form.editName)}</b>'s entry from ${esc(ukDate(form.editDate))}</span><span class="sp"></span><button type="button" class="btn sm ghost" data-editcancel>Cancel</button></div>` : '';
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
    if (e.state === 'blocked') return `<div class="rcard over ${(cur.note || '').trim() ? 'done' : ''}"><div class="rc-head"><b>${esc(VACCINES[v].short)}</b><span>NOT ELIGIBLE BY AGE. ${esc(e.text)} To give it anyway, write the reason.</span></div>
      ${VACCINES[v].private ? '' : `<select data-elig-reason="${esc(v)}" aria-label="RAVS reason for ${esc(v)}"><option value="">Choose the RAVS reason…</option>${RAVS_REASONS.slice(1).map(r => `<option ${cur.reason === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>`}
      <input data-elig-note="${esc(v)}" placeholder="Eligibility: why are you giving it? (required)" value="${esc(cur.note || '')}" aria-label="Why ${esc(v)} is being given"></div>`;
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
  const done = vs.filter(v => v.some(r => r.status === 'given' || r.status === 'entered')).length;
  $('#deskSummary').innerHTML = `<span><b>${done}</b> vaccinated</span>`;
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
  if (res && recallCheck && res.id === recallCheck.id) return onRecallLookup(res);
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
    const el = form.elig[v] || {};
    if (e.state === 'blocked' && !(el.note || '').trim()) errs.push(`${v}: not eligible by age. Write the reason in its eligibility box to give it anyway.`);
    if (e.state === 'blocked' && !isPriv(v) && !el.reason) errs.push(`${v}: choose the RAVS reason.`);
    if (e.state === 'reason' && !(form.elig[v] || {}).reason) errs.push(`${v}: choose the reason the patient gives.`);
  });
  return errs;
}
// The Vaccinated and waiting-list buttons only work once the patient is confirmed and everything below is filled in.
function giveProblems() {
  if (form.step !== 'confirmed') return ['Find and confirm the patient first.'];
  const errs = validateForm(readForm());
  if (!vaxOnDuty()) errs.push('Choose the vaccinator on duty (Change, at the top).');
  if (!me) errs.push('Choose the operator (top right).');
  return errs;
}
function updateGive() {
  // Before the patient is confirmed the buttons are hidden, and Enter in Find patient still starts the search.
  const errs = form.step === 'confirmed' ? giveProblems() : [];
  $('#regBtn').disabled = errs.length > 0;
  $('#giveHint').textContent = form.step === 'confirmed' && errs.length ? 'Still needed: ' + errs.join(' ') : '';
  $('#regBtn .bl').textContent = form.editVisit ? 'Save changes' : 'Vaccinated';
  $('#regNeed').textContent = form.step === 'confirmed' && errs.length ? 'Still needed: ' + errs[0].replace(/\.$/, '') : '';
}
['input', 'change', 'click'].forEach(type => document.addEventListener(type, () => setTimeout(updateGive), true));
// What goes in the eligibility columns for a vaccine, from the age check and the reason the desk picked or wrote.
function eligFields(v, dob) {
  const e = checkEligibility(v, dob, S), el = form.elig[v] || {};
  return {
    eligibility: VACCINES[v].private ? 'Private' : e.state === 'age' ? (VACCINES[v].ravs ? 'Based on age' : '') : (el.reason || ''),
    eligNote: e.state === 'blocked' ? `Not eligible by age, given because: ${(el.note || '').trim()}` : (el.note || ''),
  };
}
async function submitDesk(ev) {
  ev.preventDefault();
  if (form.step !== 'confirmed') { if (form.step === 'find' || form.step === 'error') { canSearch() ? startFind() : confirmPatient(false); } return; }
  const mode = ev.submitter?.dataset.mode || 'given';
  const f = readForm(); const errs = validateForm(f);
  if (mode === 'given' && !vaxOnDuty()) errs.push('Choose the vaccinator on duty first (Change, at the top).');
  if (errs.length) { $('#dupBox').innerHTML = `<div class="alert bad">${errs.map(esc).join('<br>')}</div>`; return; }
  if (form.editVisit) return saveEntryEdit(f);
  const visitId = uid(), now = new Date().toISOString(), t = f.vaxDate || todayIso(), time = nowTime(), given = mode === 'given';
  const rows = form.vaccines.map(v => {
    return { id: uid(), visitId, date: t, time, source: offline ? 'Offline' : form.source, nhs: f.nhs, surname: f.surname, given: f.given, dob: f.dob, postcode: f.postcode, phone: f.phone,
      address: f.address, gp: f.gp,
      vaccine: v, product: defaultProduct(v, f.dob, S), batch: given ? batchFor(defaultProduct(v, f.dob, S), S, v) : '', ...eligFields(v, f.dob),
      consent: S.consent, site: S.site, vaccinator: given ? vaxOnDuty() : '', deskBy: me, location: f.location, status: given ? (isPriv(v) ? 'entered' : 'given') : 'waiting', givenAt: given ? `${t} ${time}` : '', enteredAt: given && isPriv(v) ? `${t} ${time}` : '', enteredBy: given && isPriv(v) ? PRIV_BY : '', note: f.note, updatedAt: now };
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
    let hits = (await API.search(q, S.seasonStart)).filter(r => r.status !== 'deleted');
    hits = hits.filter(r => (f.nhs && r.nhs === f.nhs) || (f.dob && r.dob === f.dob && r.surname === f.surname));
    hits = hits.filter(r => r.visitId !== form.bookingVisitId && r.visitId !== form.editVisit);
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
  $('#defaultsBar').innerHTML = `<span><b>Today</b></span><span>Vaccinator <b>${esc(vaxOnDuty() || 'not set')}</b></span><span>Site <b>${esc(S.site)}</b></span><span>Consent <b>${esc(S.consent)}</b></span>` +
    `<span title="${esc(prods.map(p => `${shortProduct(p.product)}: ${p.batch || 'no batch'}`).join('\n'))}">${noBatch.length ? `<span class="warnx">${noBatch.length} batch${noBatch.length > 1 ? 'es' : ''} not set</span>` : `Batches <b>${prods.length} set</b>`}</span>` +
    `<button class="btn sm ghost" data-goto="settings" type="button">Change</button>`;
  const t = todayIso();
  const vs = visits(ROWS.filter(r => r.date === t));
  // There is no waiting list any more: every registration is saved as vaccinated.
  const given = vs.filter(v => v.some(r => ['given', 'entered', 'notgiven'].includes(r.status))).sort((a, b) => (b[0].givenAt || '').localeCompare(a[0].givenAt || ''));
  $('#givenCount').textContent = given.length ? '· ' + given.length : '';
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
// One short label per entry: is it on RAVS yet? Private entries never go to RAVS.
function ravsPill(v) {
  const nhs = v.filter(d => !isPriv(d));
  if (!nhs.length) return '<span class="pill p-private">Private</span>';
  if (nhs.some(d => d.status === 'notgiven')) return statusPill('notgiven');
  return nhs.every(d => d.status === 'entered') ? '<span class="pill p-entered">✓ On RAVS</span>' : '<span class="pill p-notravs">Not on RAVS yet</span>';
}
function givenRow(v) {
  const r = v[0];
  return `<div class="row"><div class="time">${esc((r.givenAt || '').slice(11) || r.time)}</div><div class="who"><div class="nm">${esc(fullName(r))}</div><div class="sub vx">${v.map(d => vaxTag(d, true)).join('')}</div>
    <div class="sub"><span class="mono f f-dob">${esc(ukDate(r.dob))}</span>${r.nhs ? `<span class="mono f f-nhs">${esc(fmtNhs(r.nhs))}</span>` : ''}${r.postcode ? `<span class="mono f f-pc">${esc(r.postcode)}</span>` : ''}</div></div>
    <div class="right"><span class="pills">${ravsPill(v)}</span><button type="button" class="btn sm" data-entrymenu="${esc(r.visitId)}">Edit</button></div></div>`;
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
  const changes = ROWS.filter(r => r.visitId === visitId && r.status === 'waiting').map(r => ({ id: r.id, patch: { status: isPriv(r) ? 'entered' : 'given', givenAt: stamp, ...(isPriv(r) ? { enteredAt: stamp, enteredBy: PRIV_BY } : {}), batch: r.batch || batchFor(r.product, S, r.vaccine), vaccinator: r.vaccinator || vaxOnDuty(), site: r.site || S.site, consent: r.consent || S.consent } }));
  if (!vaxOnDuty()) toast('Set the vaccinator on duty in Settings');
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
    return `<div class="dayhead"><h3>${d === todayIso() ? 'Today' : esc(longDate(d))}</h3><span class="small muted">${todo.length} to enter onto RAVS · ${done.length} entered</span>${age > 0 && todo.length ? `<span class="pill ${age >= 10 ? 'p-late' : 'p-waiting'}">${age} day${age > 1 ? 's' : ''} ago</span>` : ''}</div>` +
      (todo.length ? todo.map(todoCard).join('') : '<div class="panel empty">Everything given on this day has been recorded.</div>') +
      (done.length ? `<div class="panel list donelist">${done.map(doneRow).join('')}</div>` : '');
  }).join('');
  const ravsPending = pending.filter(r => targetOf(r) === 'RAVS');
  $('#fillAll').hidden = !ravsPending.length; $('#fillAll').textContent = `Fill all in RAVS (${ravsPending.length})`;
  $('#extNote').hidden = !EXT.ready; $('#extNote').textContent = `RAVS Helper is connected. It fills each RAVS page, you check the summary and press Confirm and save, and it's marked here automatically.`;
}
function doneRow(v) {
  const r = v[0];
  return `<div class="row"><div class="time">${esc((r.givenAt || '').slice(11) || r.time)}</div><div class="who"><div class="nm">${esc(fullName(r))}</div><div class="sub"><span class="mono f f-dob">${esc(ukDate(r.dob))}</span>${r.nhs ? `<span class="mono f f-nhs">${esc(fmtNhs(r.nhs))}</span>` : ''}${r.postcode ? `<span class="mono f f-pc">${esc(r.postcode)}</span>` : ''}</div></div>
    <div class="right">${v.map(vaxTag).join('')}<span class="small muted">Entered ${esc((r.enteredAt || '').slice(11))}</span><button type="button" class="btn sm" data-entrymenu="${esc(r.visitId)}">Edit</button></div></div>`;
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
      <span class="rvact"><button type="button" class="btn sm ghost" data-entrymenu="${esc(d.visitId)}">Edit</button>${target === 'RAVS' ? `<button type="button" class="btn primary sm" data-fill="${esc(d.id)}">Fill in RAVS</button>` : ''}<button type="button" class="btn go sm" data-entered="${esc(d.id)}">Entered on ${esc(target)}</button></span></div>`;
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
let searchTimer, recallSearchTimer;
function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const q = $('#searchBox').value; const hits = (await API.search(q, S.seasonStart)).filter(r => r.status !== 'deleted');
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
      const rows = (await API.exportRows(from, to)).filter(r => r.status !== 'deleted');
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

/* ---------- RAVS check ---------- */
// Compare a RAVS export (CSV or Excel) with the app's NHS doses. The file is read in this browser only and never saved or sent anywhere.
const RC_FIELDS = [
  ['nhs', 'NHS number', /nhs/],
  ['date', 'Vaccination date', /(vacc|administ|event|given|appointment).*(date|time)|^date( ?(and|&) ?time)?( of vaccination)?$|date.*(vacc|administ|given)/],
  ['vaccine', 'Vaccine', /vacc.*(type|program|name|product|given|brand)|programme|^vaccine$|^product$|disease|procedure/],
  ['dob', 'Date of birth', /birth|dob/],
  ['surname', 'Last name', /surname|last ?name|family ?name/],
  ['given', 'First name', /forename|first ?name|given ?name/],
  ['name', 'Full name (if no first/last)', /^(patient ?|person ?)?(full ?)?name$/],
];
const rcKind = v => { const s = String(v || '').toLowerCase(); return /covid|sars|comirnaty|spikevax|nuvaxovid|kostaive/.test(s) ? 'covid' : /flu|influenza|laiv|tiv|qiv/.test(s) ? 'flu' : /mmr|measles/.test(s) ? 'mmr' : /menb|mening|bexsero/.test(s) ? 'menb' : /pneum|ppv/.test(s) ? 'ppv' : s ? 'other' : ''; };
const RC_KIND_LABEL = { flu: 'Flu', covid: 'COVID', mmr: 'MMR', menb: 'MenB', ppv: 'PPV', other: 'Other', '': '' };
const RC_EXTRA = { postcode: /^postcode$/, address: /^address$/, phone: /^(contactdetails|phone|telephone|mobile)$/, gp: /^registeredgp(odscode)?$/, gender: /^gender$/,
  product: /^vaccineproduct$/, batch: /^batch(number)?$/, eligibility: /^eligibilitytype$/, vaccinator: /^vaccinatingclinician$/, entered: /^dateentered$/, comments: /^vaccinationcomments$/ };
let RC = null; // { head, rows, map, from, to, result }

function rcCell(v) {
  if (v == null) return '';
  if (v instanceof Date) return isoDate(new Date(v.getTime() + v.getTimezoneOffset() * 60000));
  if (typeof v === 'object') return v.richText ? v.richText.map(t => t.text).join('') : v.text != null ? String(v.text) : v.result != null ? rcCell(v.result) : '';
  return String(v).trim();
}
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  const sep = (text.split('\n')[0].match(/\t/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? '\t' : ',';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cur.trim()); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur.trim()); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur.trim()); rows.push(row); }
  return rows.filter(r => r.some(x => x));
}
async function rcReadFile(file) {
  if (/\.(xlsx|xlsm)$/i.test(file.name)) {
    const ExcelJS = await loadExcelJs();
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await file.arrayBuffer());
    // Use the sheet with the most rows.
    const ws = wb.worksheets.slice().sort((a, b) => b.actualRowCount - a.actualRowCount)[0];
    const out = []; ws.eachRow({ includeEmpty: false }, r => { const a = []; for (let i = 1; i <= ws.columnCount; i++) a.push(rcCell(r.getCell(i).value)); out.push(a); });
    return out.filter(r => r.some(x => x));
  }
  if (/\.xls$/i.test(file.name)) throw new Error('This is an old-style .xls file. Open it in Excel and save it as .xlsx or .csv, then try again.');
  return parseCsv((await file.text()).replace(/^﻿/, ''));
}
// Dates in RAVS files may be 21/10/2026, 2026-10-21, 21-Oct-2026, with or without a time, or an Excel day number.
function rcDate(s) {
  s = String(s || '').trim(); if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/); if (m) { const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; return `${y}-${pad(+m[2])}-${pad(+m[1])}`; }
  m = s.match(/^(\d{1,2})[\s\-]([A-Za-z]{3,})[\s\-,]+(\d{4})/); if (m) { const mi = MONTHS.findIndex(x => x.slice(0, 3).toLowerCase() === m[2].slice(0, 3).toLowerCase()); if (mi >= 0) return `${m[3]}-${pad(mi + 1)}-${pad(+m[1])}`; }
  if (/^\d{5}(\.\d+)?$/.test(s)) return isoDate(new Date(Math.round((+s - 25569) * 86400000) + new Date().getTimezoneOffset() * 60000));
  const d = new Date(s); return isNaN(d) ? '' : isoDate(d);
}
function rcGuess(rows) {
  // The heading row is the first of the top 15 rows that names an NHS number or date of birth.
  const hi = Math.max(0, rows.slice(0, 15).findIndex(r => r.some(c => /nhs|birth|dob/i.test(c))));
  const head = rows[hi].map(h => String(h || '').trim());
  const map = {}, used = new Set();
  RC_FIELDS.forEach(([k, , re]) => { const i = head.findIndex((h, j) => !used.has(j) && re.test(h.toLowerCase().replace(/[_\-]+/g, ' '))); if (i >= 0) { map[k] = i; used.add(i); } });
  // RAVS reports can include "not given" and deleted entries: those aren't vaccinations to match.
  const col = re => head.findIndex(h => re.test(h.toLowerCase().replace(/[\s_\-]+/g, '')));
  const vi = col(/^vaccinated$/), ai = col(/^audittype$/);
  const data = rows.slice(hi + 1).filter(r => !(vi >= 0 && /^(no|false|n)$/i.test(String(r[vi] || '').trim())) && !(ai >= 0 && /delet/i.test(String(r[ai] || ''))));
  // Extra RAVS columns, used when copying RAVS entries into the app.
  const extra = {}; Object.entries(RC_EXTRA).forEach(([k, re]) => { const i = col(re); if (i >= 0) extra[k] = i; });
  return { head, data, map, extra };
}
function rcRecords() {
  const { data, map } = RC, get = (r, k) => map[k] == null ? '' : String(r[map[k]] ?? '').trim();
  return data.map(r => {
    let surname = get(r, 'surname'), given = get(r, 'given');
    if (!surname && get(r, 'name')) { const n = get(r, 'name'); if (n.includes(',')) [surname, given] = n.split(',').map(x => x.trim()); else { const p = n.split(/\s+/); surname = p.pop() || ''; given = p.join(' '); } }
    const x = {}; Object.entries(RC.extra || {}).forEach(([k, i]) => x[k] = String(r[i] ?? '').trim());
    return { nhs: cleanNhs(get(r, 'nhs')), date: rcDate(get(r, 'date')), dob: rcDate(get(r, 'dob')) || parseDob(get(r, 'dob')) || '', surname: surname.toUpperCase(), given: titleCase(given), vaccineText: get(r, 'vaccine'), kind: rcKind(get(r, 'vaccine')), x };
  }).filter(r => r.date && (r.nhs || r.surname));
}
const rcSamePerson = (a, b) => (a.nhs && b.nhs) ? a.nhs === b.nhs : !!(a.surname && a.dob && a.surname.toUpperCase() === b.surname.toUpperCase() && a.dob === b.dob);
function rcCompare(ravs, app) {
  const left = ravs.slice(), matched = [], appOnly = [], moved = [];
  const pass = (dose, sameDay) => left.findIndex(x => rcSamePerson(x, dose) && (!x.kind || !dose.kind || x.kind === dose.kind) && (!sameDay || x.date === dose.date));
  const rest = [];
  app.forEach(d => { const i = pass(d, true); if (i >= 0) matched.push({ app: d, ravs: left.splice(i, 1)[0] }); else rest.push(d); });
  rest.forEach(d => { const i = pass(d, false); if (i >= 0) moved.push({ app: d, ravs: left.splice(i, 1)[0] }); else appOnly.push(d); });
  const byDate = (a, b) => b.date.localeCompare(a.date) || a.surname.localeCompare(b.surname);
  appOnly.sort(byDate); left.sort(byDate);
  return { matched, moved, appOnly, ravsOnly: left, notMarked: matched.concat(moved).filter(m => m.app.status === 'given') };
}
function openRavsCheck() {
  RC = null;
  openModal(`<div class="rcwrap"><h2>RAVS check</h2>
    <p class="small muted" style="margin:0">Drop in the export from RAVS. The app lists anyone who is in one but not the other, so you can fix it before claiming on MYS. Private vaccinations are left out. The file stays on this computer and is not saved.</p>
    <div class="rcget"><div class="rcget-t"><b>Get it from RAVS</b><span>The RAVS Helper makes the report on RAVS for you (up to 90 days).</span></div>
      <div class="f"><label for="rcFrom">From</label><input type="date" id="rcFrom" value="${esc(rcDefaultFrom())}"></div><div class="f"><label for="rcTo">To</label><input type="date" id="rcTo" value="${todayIso()}"></div>
      <button type="button" class="btn primary" id="rcGet">Get RAVS export</button></div>
    <div id="rcGetMsg"></div>
    <label class="rcdrop" id="rcDrop"><input type="file" id="rcFile" accept=".csv,.xlsx,.xlsm,.txt,text/csv"><b>Or choose a RAVS export file</b><span>or drag the file here (CSV or Excel)</span></label>
    <div id="rcOut"></div>
    <div class="actions"><button type="button" class="btn ghost" data-close>Close</button></div></div>`);
  $('.modal').classList.add('wide');
  const drop = $('#rcDrop');
  ['dragover', 'dragenter'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(e => drop.addEventListener(e, () => drop.classList.remove('over')));
  drop.addEventListener('drop', ev => { ev.preventDefault(); const f = ev.dataTransfer.files[0]; if (f) rcLoad(f); });
  $('#rcFile').addEventListener('change', ev => { const f = ev.target.files[0]; if (f) rcLoad(f); });
  $('#rcGet').addEventListener('click', rcRequest);
  if (RC_EXPORT.id) rcGetMsg('info', RC_EXPORT.text || 'The RAVS Helper is making the report…');
  if (RC_EXPORT.file) { const f = RC_EXPORT.file; RC_EXPORT.file = null; rcLoad(f); }
}
// Asking the RAVS Helper (0.6.0 or later) to fetch the report from RAVS's Reports pages.
const RC_EXPORT = { id: '', text: '', file: null };
const rcDefaultFrom = () => { const d = new Date(); d.setDate(d.getDate() - 89); const f = isoDate(d); return S.seasonStart && S.seasonStart > f ? S.seasonStart : f; };
function rcGetMsg(cls, html) { const el = $('#rcGetMsg'); if (el) el.innerHTML = html ? `<div class="alert ${cls}">${html}</div>` : ''; }
function rcRequest() {
  const from = $('#rcFrom').value, to = $('#rcTo').value;
  if (!EXT.ready) return rcGetMsg('warn', 'The RAVS Helper isn\'t installed on this computer. Download the RAVS export from RAVS (Reports, Create report) and drop the file in the box below.');
  if (verLt(EXT.version, '0.6.0')) return rcGetMsg('warn', `This needs RAVS Helper 0.6.0 or later (this computer has ${esc(EXT.version)}). Update the helper, or drop the RAVS export file in the box below.`);
  if (!from || !to || from > to) return rcGetMsg('warn', 'Pick a From date before the To date.');
  if (daysBetween(from, to) > 89) return rcGetMsg('warn', 'RAVS only makes reports for up to 90 days. Pick a shorter range, or do it in two goes.');
  if (to > todayIso()) return rcGetMsg('warn', "The To date can't be in the future.");
  RC_EXPORT.id = uid(); RC_EXPORT.text = 'Sending to the RAVS Helper…';
  window.postMessage({ psm: 'app-export', job: { id: RC_EXPORT.id, from, to, vaccines: ['COVID-19', 'Flu'] } }, '*');
  rcGetMsg('info', RC_EXPORT.text + ' <button type="button" class="btn sm ghost" id="rcCancel">Stop</button>');
  $('#rcCancel')?.addEventListener('click', () => { window.postMessage({ psm: 'app-export-cancel' }, '*'); RC_EXPORT.id = ''; rcGetMsg('', ''); });
  clearTimeout(rcRequest._t);
  rcRequest._t = setTimeout(() => { if (RC_EXPORT.id && RC_EXPORT.text.startsWith('Sending')) rcGetMsg('warn', "The RAVS Helper didn't answer. Reload this page (Cmd+R) and try again, or drop the RAVS export file in the box below."); }, 15000);
}
function onExportStatus(d) {
  if (!RC_EXPORT.id || d.id !== RC_EXPORT.id) return;
  RC_EXPORT.text = d.text || '';
  rcGetMsg('info', esc(RC_EXPORT.text) + '…');
}
function onExport(d) {
  window.postMessage({ psm: 'app-export-ack' }, '*');
  if (RC_EXPORT.id && d.id !== RC_EXPORT.id) return;
  RC_EXPORT.id = '';
  if (!d.ok) return $('#rcGetMsg') ? rcGetMsg('bad', esc(d.error || 'The RAVS export stopped.')) : toast(d.error || 'The RAVS export stopped.');
  if (!d.data) return $('#rcGetMsg') ? rcGetMsg('ok', `RAVS made the report and saved it to <b>Downloads</b>${d.name ? ` as <b>${esc(d.name)}</b>` : ''}. Drag it from Downloads into the box below.`) : toast('RAVS export saved to Downloads. Open Records > RAVS check and drop it in.');
  const bin = atob(d.data), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const file = new File([bytes], d.name || 'ravs-report.csv', { type: d.type || '' });
  if ($('#rcGetMsg')) { rcGetMsg('ok', 'RAVS export received.'); rcLoad(file); }
  else { RC_EXPORT.file = file; toast('RAVS export ready. Open Records > RAVS check to see it.'); }
}
async function rcLoad(file) {
  $('#rcOut').innerHTML = '<p class="small muted">Reading the file…</p>';
  try {
    const rows = await rcReadFile(file);
    if (rows.length < 2) throw new Error('The file looks empty');
    RC = { file: file.name, ...rcGuess(rows) };
    rcRun();
  } catch (e) { console.warn(e); $('#rcOut').innerHTML = `<div class="alert bad">Couldn't read that file: ${esc(e && e.message || e)}.</div>`; }
}
async function rcRun() {
  const missing = ['date'].concat(RC.map.nhs == null ? ['dob'] : []).filter(k => RC.map[k] == null);
  const noPatient = RC.map.nhs == null && RC.map.surname == null && RC.map.name == null;
  const ravs = (missing.length || noPatient) ? [] : rcRecords();
  const pick = `<details class="rcmap" ${missing.length || noPatient || !ravs.length ? 'open' : ''}><summary>Columns used from ${esc(RC.file)}</summary><div class="editgrid">${RC_FIELDS.map(([k, label]) => `<div class="f"><label>${esc(label)}</label><select data-rcmap="${k}"><option value="">Not in file</option>${RC.head.map((h, i) => `<option value="${i}" ${RC.map[k] === i ? 'selected' : ''}>${esc(h || 'Column ' + (i + 1))}</option>`).join('')}</select></div>`).join('')}</div></details>`;
  if (missing.length || noPatient || !ravs.length) {
    $('#rcOut').innerHTML = `<div class="alert warn">${missing.length || noPatient ? "The app couldn't tell which column is which. Pick them below." : 'No vaccinations found with these columns. Check them below.'}</div>${pick}`;
    return rcBindMap();
  }
  const dates = ravs.map(r => r.date).sort(), from = dates[0], to = dates[dates.length - 1];
  $('#rcOut').innerHTML = '<p class="small muted">Comparing with the app…</p>';
  const app = (await API.exportRows(from, to)).filter(r => !isPriv(r) && (r.status === 'given' || r.status === 'entered') && (VACCINES[r.vaccine]?.target || 'RAVS') === 'RAVS')
    .map(r => ({ ...r, kind: rcKind(VACCINES[r.vaccine]?.ravs || r.vaccine) }));
  const res = RC.result = rcCompare(ravs, app);
  // Patients from before the app was used are in the old season sheet (Possible opportunity tab). Those count as accounted for.
  let recall = []; try { recall = await API.recallGet(); } catch (e) { console.warn(e); }
  const inSheet = rcInOldSheet(recall);
  res.oldSheet = res.ravsOnly.filter(inSheet); res.ravsOnly = res.ravsOnly.filter(p => !inSheet(p));
  const addable = res.ravsOnly.concat(res.oldSheet).filter(p => RC_KIND_VAX[p.kind]);
  const t = todayIso(), late = d => daysBetween(d.date, t) > 15;
  const tile = (k, n, c) => `<div class="tile ${c}"><div class="k">${k}</div><div class="n">${n}</div></div>`;
  const line = (p, extra = '') => `<div class="row"><div class="time">${esc(ukDate(p.date).slice(0, 5))}</div><div class="who"><div class="nm">${esc(fullName(p))}</div><div class="sub"><span class="mono f f-dob">${esc(ukDate(p.dob))}</span><span class="mono f f-nhs">${esc(fmtNhs(p.nhs) || 'No NHS number')}</span>${extra}</div></div><div class="right">${p.kind ? `<span class="vtag ${p.kind}">${esc(RC_KIND_LABEL[p.kind])}</span>` : ''}</div></div>`;
  const appLine = d => line(d, `${d.vaccinator ? `<span class="f f-vac">${esc(d.vaccinator)}</span>` : ''}${late(d) ? '<span class="f" style="color:var(--bad);font-weight:700">Over 15 days, can\'t be claimed</span>' : ''}`);
  const group = (title, cls, items, render, help) => `<div class="rcgroup ${cls}"><h3>${title} <span class="count">${items.length}</span></h3><p class="small muted">${help}</p><div class="list">${items.map(render).join('')}</div></div>`;
  const issues = res.appOnly.length + res.ravsOnly.length + res.moved.length;
  const addBtn = (items, label) => items.length ? `<div class="rcadd"><button type="button" class="btn sm primary" data-rcadd="${items === res.oldSheet ? 'old' : 'ravs'}">${label}</button><span class="small muted">They're added as already On RAVS, with the details from the RAVS file.</span></div>` : '';
  $('#rcOut').innerHTML = `<div class="statusline ${issues ? 'off' : 'on'}">${ukDate(from)} to ${ukDate(to)}: ${issues ? `${issues} to look at` : 'everything matches'}</div>
    <div class="tiles rctiles">${tile('Matched', res.matched.length + res.moved.length, 'ok')}${tile('In the app, not on RAVS', res.appOnly.length, res.appOnly.length ? 'bad' : 'ok')}${tile('On RAVS, not in the app', res.ravsOnly.length, res.ravsOnly.length ? 'warn' : 'ok')}${tile('Different date', res.moved.length, res.moved.length ? 'warn' : 'ok')}${res.oldSheet.length ? tile('In your old sheet', res.oldSheet.length, '') : ''}</div>
    ${res.appOnly.length ? group('In the app, not on RAVS', 'bad', res.appOnly, appLine, 'Given here but missing from the RAVS file. Enter these on RAVS (Edit, then Fill in RAVS again).') : ''}
    ${res.ravsOnly.length ? group('On RAVS, not in the app', 'warn', res.ravsOnly, p => line(p, p.vaccineText ? `<span class="f">${esc(p.vaccineText)}</span>` : ''), 'On RAVS but not registered in the app (or the old sheet). If they were vaccinated here, add them to the app.') + addBtn(res.ravsOnly.filter(p => RC_KIND_VAX[p.kind]), `Add ${res.ravsOnly.length === 1 ? 'it' : 'all ' + res.ravsOnly.length} to the app`) : ''}
    ${res.oldSheet.length ? `<details class="rcgroup rcold"><summary><h3>In your old sheet, not in the app <span class="count">${res.oldSheet.length}</span></h3></summary><p class="small muted">On RAVS and in the old season sheet (Possible opportunity tab), from before you used the app. Nothing missing. Add them so the app has the whole season.</p><div class="list">${res.oldSheet.map(p => line(p)).join('')}</div></details>${addBtn(res.oldSheet, `Add ${res.oldSheet.length === 1 ? 'it' : 'all ' + res.oldSheet.length} to the app`)}` : ''}
    ${res.moved.length ? group('Different date', 'warn', res.moved, m => line(m.app, `<span class="f">App ${esc(ukDate(m.app.date))}, RAVS ${esc(ukDate(m.ravs.date))}</span>`), 'Same patient and vaccine, but the dates differ. Check which one is right.') : ''}
    ${res.notMarked.length ? `<div class="alert info rcmark"><span>${res.notMarked.length} matched ${res.notMarked.length === 1 ? 'vaccination shows' : 'vaccinations show'} "Not on RAVS yet" in the app.</span><button type="button" class="btn sm" id="rcMark">Mark ${res.notMarked.length === 1 ? 'it' : 'them'} as On RAVS</button></div>` : ''}
    ${pick}`;
  rcBindMap();
  $$('[data-rcadd]').forEach(b => b.addEventListener('click', () => rcAdd(b, (b.dataset.rcadd === 'old' ? res.oldSheet : res.ravsOnly).filter(p => RC_KIND_VAX[p.kind]))));
  $('#rcMark')?.addEventListener('click', async () => {
    $('#rcMark').disabled = true;
    await API.update(res.notMarked.map(m => m.app.id), { status: 'entered', enteredAt: `${todayIso()} ${nowTime()}`, enteredBy: me || 'RAVS check' });
    toast('Marked as On RAVS'); await refresh(true); rcRun();
  });
}
const RC_KIND_VAX = { flu: 'Flu', covid: 'COVID-19', mmr: 'MMR', menb: 'MenB' };
// Recall people with this vaccine in the same season, by NHS number or surname + date of birth.
function rcInOldSheet(recall) {
  const by = new Map();
  (recall || []).forEach(p => { const h = historyMap(p.history); [cleanNhs(p.nhs), nameKey(p)].forEach(k => { if (k && k.length > 2) by.set(k, h); }); });
  return p => { const h = by.get(p.nhs) || by.get(nameKey(p)); const set = h && h[seasonOf(p.date)]; return !!set && set.has(RC_KIND_VAX[p.kind] || ''); };
}
// Copies RAVS entries into the app as vaccinations already on RAVS. Doses for the same person on the same day are one visit.
async function rcAdd(btn, items) {
  if (!me) return flashOperator();
  if (!items.length) return;
  btn.disabled = true; btn.textContent = `Adding ${items.length}…`;
  const visits = {}, now = new Date().toISOString();
  const rows = items.map(p => {
    const x = p.x || {}, vk = (p.nhs || nameKey(p)) + '|' + p.date;
    const ent = rcDate(x.entered), entTime = (String(x.entered || '').match(/(\d{1,2}:\d{2})/) || [])[1] || '';
    const note = [x.gender ? `Gender: ${x.gender}.` : '', x.comments, 'Added from the RAVS export.'].filter(Boolean).join(' ');
    return { id: uid(), visitId: visits[vk] ||= uid(), date: p.date, time: '', source: 'From RAVS', nhs: p.nhs, surname: p.surname, given: p.given, dob: p.dob,
      postcode: fmtPostcode(x.postcode || ''), phone: x.phone || '', vaccine: RC_KIND_VAX[p.kind], product: x.product || p.vaccineText, batch: x.batch || '',
      eligibility: x.eligibility || '', eligNote: '', consent: '', site: '', vaccinator: x.vaccinator || '', deskBy: me, location: 'Pharmacy', status: 'entered',
      givenAt: p.date, enteredAt: ent ? `${ent} ${entTime}`.trim() : `${p.date}`, enteredBy: 'RAVS export', note, updatedAt: now, address: x.address || '', gp: x.gp || '' };
  });
  try {
    const byVisit = {}; rows.forEach(r => (byVisit[r.visitId] ||= []).push(r));
    const groups = Object.values(byVisit);
    for (let i = 0; i < groups.length; i += 150) await API.register({ rows: groups.slice(i, i + 150).flat() });
    toast(`${rows.length} added to the app from RAVS`); await refresh(true); rcRun();
  } catch (e) { console.warn(e); btn.disabled = false; btn.textContent = 'Try again'; toast("Couldn't add them: " + (e && e.message || e)); }
}
function rcBindMap() { $$('[data-rcmap]').forEach(s => s.onchange = () => { s.value === '' ? delete RC.map[s.dataset.rcmap] : RC.map[s.dataset.rcmap] = +s.value; rcRun(); }); }

/* ---------- settings ---------- */
function renderSettings() {
  const opt = (list, cur) => list.map(x => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join('');
  $('#sVaccinator').innerHTML = '<option value=""></option>' + opt(S.vaccinators || [], vaxOnDuty());
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
// Edit on any saved entry: change the details, fill RAVS again, mark it entered, or delete it.
function entryRows(visitId) { return allRows().filter(r => r.visitId === visitId && r.status !== 'deleted' && r.status !== 'booked' && r.status !== 'checkedin'); }
function openEntryMenu(visitId) {
  const v = entryRows(visitId); if (!v.length) return;
  const r = v[0], onRavs = v.some(d => d.status === 'entered' && !isPriv(d)), nhs = v.filter(d => !isPriv(d));
  const opt = (data, title, sub, cls = '') => `<button type="button" class="menuopt ${cls}" ${data}><b>${esc(title)}</b><span>${esc(sub)}</span></button>`;
  openModal(`<h2>Edit entry</h2><p class="small muted" style="margin-top:4px">${esc(fullName(r))} · ${esc(ukDate(r.date))} · ${v.map(d => esc(d.vaccine)).join(', ')}</p>
    <p class="statusline ${onRavs ? 'on' : 'off'}">${onRavs ? `✓ Already entered on RAVS${v.find(d => d.enteredAt) ? ' at ' + esc(v.find(d => d.enteredAt).enteredAt.slice(11)) : ''}` : 'Not entered on RAVS yet'}</p>
    <div class="menuopts">
      ${opt(`data-entryedit="${esc(visitId)}"`, '1. Change patient details or vaccines', onRavs ? 'Already on RAVS: this only corrects the app. Change it on RAVS as well (or delete it there and use Fill in RAVS again).' : 'Opens it in Register patient to correct the name, date of birth, NHS number or vaccines.')}
      ${nhs.length ? opt(`data-entryrefill="${esc(visitId)}"`, '2. Fill in RAVS again', onRavs ? 'Moves it back to To enter onto RAVS and sends it to the RAVS Helper. Only if it is not on RAVS, or RAVS will have it twice.' : 'Sends it to the RAVS Helper to fill in RAVS.') : ''}
      ${nhs.length ? opt(`data-entrymark="${esc(visitId)}"`, '3. Entered on RAVS', onRavs ? 'Marks it entered on RAVS again, with the time now.' : 'Marks it as entered on RAVS by hand.') : ''}
      ${opt(`data-entrydelete="${esc(visitId)}"`, '4. Delete entry', 'Removes it from the app. Nothing on RAVS changes.', 'danger')}
      <button type="button" class="linkbtn" data-entrydoses="${esc(visitId)}">Change batch, site, consent or vaccinator instead</button>
    </div><div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button></div>`);
}
function confirmDelete(visitId) {
  const v = entryRows(visitId); if (!v.length) return closeModal();
  const r = v[0];
  openModal(`<h2>Delete this entry?</h2><p>${esc(fullName(r))}, ${esc(ukDate(r.date))}: ${v.map(d => esc(d.vaccine)).join(', ')}.</p>
    <p class="small muted">It disappears from every list, count and export in this app. ${v.some(d => d.status === 'entered' && !isPriv(d)) ? 'It stays on RAVS: delete it there separately if it is wrong.' : ''}</p>
    <div class="actions"><button type="button" class="btn danger" id="delGo">Delete entry</button><button type="button" class="btn ghost" data-close>Cancel</button></div>`);
  $('#delGo').onclick = async () => {
    const stamp = `${todayIso()} ${nowTime()}`;
    await API.updateEach(v.map(d => ({ id: d.id, patch: { status: 'deleted', note: [d.note, `Deleted by ${me || 'unknown'} ${stamp}`].filter(Boolean).join(' · ') } })));
    closeModal(); toast('Entry deleted'); await refresh(true);
  };
}
// Load a saved entry back into Register patient; Save changes then updates it instead of adding a new one.
function loadEntryForEdit(visitId) {
  const v = entryRows(visitId); if (!v.length) return;
  const r = v[0], from = curTab;
  clearForm();
  $('#fNhs').value = fmtNhs(r.nhs); $('#fDob').value = ukDate(r.dob); $('#fGiven').value = r.given || ''; $('#fSurname').value = r.surname || ''; $('#fPostcode').value = r.postcode || '';
  $('#fPhone').value = r.phone || ''; $('#fNote').value = r.note || ''; if (r.location) $('#fLocation').value = r.location;
  form.vaccines = v.map(d => d.vaccine); form.source = r.source || 'Walk-in'; form.editVisit = visitId; form.editFrom = from; form.editName = fullName(r); form.editDate = r.date;
  form.elig = {}; v.forEach(d => { form.elig[d.vaccine] = { reason: ['Based on age', 'Private'].includes(d.eligibility) ? '' : d.eligibility, note: String(d.eligNote || '').replace(/^Not eligible by age, given because: /, '') }; });
  form.ravs = { address: r.address || '', gp: r.gp || '' };
  vaxView = form.vaccines.some(isPriv) ? 'private' : 'main';
  showTab('desk'); confirmPatient(false); renderDeskForm();
}
async function saveEntryEdit(f) {
  const old = entryRows(form.editVisit), base = old[0];
  if (!base) { toast('That entry no longer exists.'); return clearForm(); }
  const patient = { nhs: f.nhs, surname: f.surname, given: f.given, dob: f.dob, postcode: f.postcode, phone: f.phone, location: f.location, note: f.note };
  const changes = old.map(d => form.vaccines.includes(d.vaccine)
    ? { id: d.id, patch: Object.assign({}, patient, eligFields(d.vaccine, f.dob)) }
    : { id: d.id, patch: { status: 'deleted', note: [d.note, `Removed by ${me || 'unknown'} ${todayIso()} ${nowTime()}`].filter(Boolean).join(' · ') } });
  const add = form.vaccines.filter(v => !old.some(d => d.vaccine === v)).map(v => Object.assign({}, base, patient, eligFields(v, f.dob), {
    id: uid(), vaccine: v, product: defaultProduct(v, f.dob, S), batch: batchFor(defaultProduct(v, f.dob, S), S, v), deskBy: me,
    status: isPriv(v) ? 'entered' : 'given', enteredAt: isPriv(v) ? (base.givenAt || `${base.date} ${base.time}`) : '', enteredBy: isPriv(v) ? PRIV_BY : '', updatedAt: new Date().toISOString() }));
  const wasOnRavs = old.some(d => d.status === 'entered' && !isPriv(d)), back = form.editFrom;
  $('#regBtn').disabled = true;
  try {
    if (changes.length) await API.updateEach(changes);
    if (add.length) await API.register({ rows: add });
    toast(wasOnRavs ? 'Changes saved. It was already on RAVS, so correct it on RAVS too.' : 'Changes saved');
    clearForm(); if (back && back !== 'desk') showTab(back); await refresh(true);
  } catch (e) { $('#dupBox').innerHTML = `<div class="alert bad">Could not save. Check the connection and try again. (${esc(e.message || e)})</div>`; }
  finally { updateGive(); }
}
function openNotGiven(visitId) {
  openModal(`<h2>Not given</h2><div class="f"><label for="ngWhy">Reason</label><select id="ngWhy"><option>Patient declined</option><option>Unwell today</option><option>Not eligible</option><option>Had it elsewhere</option><option>Left before vaccination</option><option>Other</option></select></div>
    <div class="f"><label for="ngNote">Detail (optional)</label><input id="ngNote"></div><div class="actions"><button type="button" class="btn primary" id="ngGo">Save</button><button type="button" class="btn ghost" data-close>Cancel</button></div>`);
  $('#ngGo').onclick = async () => { const ids = ROWS.filter(r => r.visitId === visitId && r.status === 'waiting').map(r => r.id); await API.update(ids, { status: 'notgiven', note: [$('#ngWhy').value, $('#ngNote').value].filter(Boolean).join(': ') }); closeModal(); toast('Marked as not given'); await refresh(true); };
}

/* ---------- recall list ---------- */
// Everyone vaccinated with us in past seasons (read from the old season Excel files), checked against this season's
// records so staff can contact anyone who hasn't come back. Kept in the Recall sheet only, never in this browser.
let RECALL = null, RECALL_ERR = '', THIS_SEASON = [];
let recallView = { status: 'todo', who: 'all', seen: 'last', q: '', show: 200 };
const CONTACT_LABEL = { called: 'Called', texted: 'Texted', declined: 'Not interested', elsewhere: 'Had it elsewhere' };
const NOT_COMING = ['declined', 'elsewhere'];
function seasonOf(iso) { const y = +iso.slice(0, 4), m = +iso.slice(5, 7), s = m >= 8 ? y : y - 1; return `${s}-${String(s + 1).slice(2)}`; }
const seasonNow = () => seasonOf(S.seasonStart || todayIso());
const seasonBefore = s => `${+s.slice(0, 4) - 1}-${s.slice(2, 4)}`;
const nameKey = p => `${String(p.surname || '').toUpperCase().replace(/[^A-Z]/g, '')}|${p.dob}`;
// "2025-26 Flu, COVID; 2024-25 Flu" <-> { '2025-26': Set(['Flu', 'COVID-19']), ... }
function historyMap(s) { const m = {}; String(s || '').split(';').map(x => x.trim()).filter(Boolean).forEach(x => { const [season, ...v] = x.split(' '); m[season] = new Set(v.join(' ').split(',').map(t => t.trim()).filter(Boolean).map(t => t === 'COVID' ? 'COVID-19' : t)); }); return m; }
function historyText(m) { return Object.keys(m).sort().reverse().map(s => `${s} ${[...m[s]].map(v => v === 'COVID-19' ? 'COVID' : v).join(', ')}`).join('; '); }

async function loadRecall() {
  try {
    const [people, rows] = await Promise.all([API.recallGet(), API.exportRows(S.seasonStart || todayIso(), '9999-12-31')]);
    RECALL = people; THIS_SEASON = rows.filter(r => !['deleted', 'notgiven'].includes(r.status)); RECALL_ERR = '';
  } catch (e) {
    console.warn(e); RECALL = RECALL || [];
    RECALL_ERR = /not found|apiRecall/i.test(String(e && (e.message || e))) ? 'update' : String(e && (e.message || e));
  }
  renderRecall();
}
// One person as the list shows them: what they've had before, what they're due by age, and whether they're back.
function recallState(p, back) {
  const hist = historyMap(p.history), now = seasonNow();
  const past = Object.keys(hist).filter(s => s < now).sort().reverse();
  const age = p.dob ? ageOn(p.dob, todayIso()) : null;
  const flu = !!p.dob && ageOn(p.dob, S.fluDate) >= S.fluAge, covid = !!p.dob && ageOn(p.dob, S.covDate) >= S.covAge;
  const k = back.byNhs.get(p.nhs) || back.byName.get(nameKey(p)) || (hist[now] ? 'back' : '');
  const status = k === 'back' ? 'back' : k === 'booked' ? 'booked' : NOT_COMING.includes(p.contact) ? 'gone' : p.contact ? 'contacted' : 'todo';
  return { p, hist, past, last: past[0] || '', age, flu, covid, status };
}
function recallList() {
  const back = { byNhs: new Map(), byName: new Map() };
  THIS_SEASON.concat(ROWS).forEach(r => {
    const k = ['given', 'entered'].includes(r.status) ? 'back' : ['booked', 'checkedin'].includes(r.status) ? 'booked' : '';
    if (!k) return;
    [[back.byNhs, cleanNhs(r.nhs)], [back.byName, nameKey(r)]].forEach(([m, key]) => { if (key && key.length > 2 && m.get(key) !== 'back') m.set(key, k); });
  });
  return (RECALL || []).map(p => recallState(p, back)).filter(x => x.past.length && (x.age == null || x.age >= 18));
}
function renderRecall() {
  if (!$('#recallList')) return;
  if (RECALL === null) { $('#recallList').innerHTML = '<div class="panel empty">Loading…</div>'; return; }
  if (RECALL_ERR === 'update') {
    $('#recallTiles').innerHTML = ''; $('#recallList').innerHTML = `<div class="panel"><h2>One-time update needed</h2><ol class="steps">
      <li>Open the app data sheet (Vaccine Clinic 2026-27), click <b>Extensions → Apps Script</b>.</li>
      <li>Open <b>Code.gs</b>, select everything (Cmd+A), delete it, and paste in the new Code.gs from GitHub: <a href="https://github.com/darpan31patel-wq/psm-vaccine-clinic/blob/main/app/Code.gs" target="_blank" rel="noopener">app/Code.gs</a> (press the copy icon at the top right of the code).</li>
      <li>Click <b>Save</b> (the disk icon).</li>
      <li>Click <b>Deploy → Manage deployments</b>, the pencil, set <b>Version: New version</b>, then <b>Deploy</b>.</li>
      <li>Reload this page (Cmd+R).</li></ol></div>`;
    return;
  }
  const list = recallList(), last = seasonBefore(seasonNow());
  const inSeen = x => recallView.seen === 'any' || x.last === last;
  const inWho = x => recallView.who === 'all' || (recallView.who === 'flu' ? x.flu : recallView.who === 'covid' ? x.covid : !x.flu);
  const seen = list.filter(inSeen);
  const n = st => seen.filter(x => x.status === st && inWho(x)).length;
  setCount('#cRecall', list.filter(x => x.last === last && x.status === 'todo' && (x.flu || x.covid)).length);
  const tile = (k, v, cls) => `<div class="tile ${cls || ''}"><div class="k">${k}</div><div class="n">${v.toLocaleString('en-GB')}</div></div>`;
  const lastAll = list.filter(x => x.last === last);
  $('#recallTiles').innerHTML = tile(`Came in ${last}`, lastAll.length) + tile('Back this season', lastAll.filter(x => x.status === 'back').length, 'ok') +
    tile('Not back yet', lastAll.filter(x => ['todo', 'contacted'].includes(x.status)).length, 'warn') +
    tile(`Flu ${S.fluAge}+ not back`, lastAll.filter(x => x.flu && ['todo', 'contacted'].includes(x.status)).length, 'flu') +
    tile(`COVID ${S.covAge}+ not back`, lastAll.filter(x => x.covid && ['todo', 'contacted'].includes(x.status)).length, 'covid') +
    tile('Contacted', lastAll.filter(x => x.status === 'contacted').length);
  const chip = (attr, val, cur, label, cls = '') => `<button type="button" class="chip small ${cls}" data-${attr}="${val}" aria-pressed="${cur === val}">${label}</button>`;
  $('#recallFilters').innerHTML = `<div class="vaxpick">${[['todo', 'To contact'], ['contacted', 'Contacted'], ['booked', 'Booked'], ['back', 'Back this season'], ['gone', 'Not coming']].map(([v, l]) => chip('rstatus', v, recallView.status, `${l} <span class="pr">${n(v).toLocaleString('en-GB')}</span>`)).join('')}</div>
    <div class="vaxpick">${chip('rwho', 'all', recallView.who, 'Everyone')}${chip('rwho', 'flu', recallView.who, `Flu ${S.fluAge}+`, 'flu')}${chip('rwho', 'covid', recallView.who, `COVID ${S.covAge}+`, 'covid')}${chip('rwho', 'young', recallView.who, `Under ${S.fluAge}`)}
    <span class="vsep"></span>${chip('rseen', 'last', recallView.seen, `Came in ${last}`)}${chip('rseen', 'any', recallView.seen, 'Any year')}</div>`;
  const q = recallView.q.trim().toLowerCase(), qn = cleanNhs(q), qd = parseDob(q);
  const rows = seen.filter(x => x.status === recallView.status && inWho(x) && (!q || (qn.length >= 6 && x.p.nhs.includes(qn)) || (qd && x.p.dob === qd) || `${x.p.given} ${x.p.surname} ${x.p.surname} ${x.p.postcode}`.toLowerCase().includes(q)))
    .sort((a, b) => b.last.localeCompare(a.last) || (b.covid - a.covid) || (b.flu - a.flu) || a.p.surname.localeCompare(b.p.surname) || a.p.given.localeCompare(b.p.given));
  recallList._shown = rows;
  if (!RECALL.length) { $('#recallList').innerHTML = `<div class="panel empty">No past patients yet. Press <b>Add old season files</b> and choose the Excel files of your old flu and COVID sheets.</div>`; return; }
  const due = x => [x.flu ? `<span class="vtag flu">Flu ${S.fluAge}+</span>` : '', x.covid ? `<span class="vtag covid">COVID ${S.covAge}+</span>` : '', !x.flu ? `<span class="pill p-waiting" title="Under ${S.fluAge}: needs a reason this season">Needs a reason${x.p.reason ? `: ${esc(x.p.reason)}` : ''}</span>` : ''].join('');
  const had = x => x.past.slice(0, 3).map(s => `<span class="hseason"><b>${esc(s)}</b> ${[...x.hist[s]].map(v => esc(VACCINES[v]?.short || v)).join(' + ')}</span>`).join('') + (x.past.length > 3 ? `<span class="small muted">+${x.past.length - 3} more</span>` : '');
  const act = x => x.status === 'back' ? '<span class="pill p-entered">✓ Back</span>' : x.status === 'booked' ? '<span class="pill p-booked">Booked</span>' :
    (x.p.contact ? `<span class="pill ${NOT_COMING.includes(x.p.contact) ? 'p-neutral' : 'p-given'}" title="${esc(x.p.contactBy)}">${esc(CONTACT_LABEL[x.p.contact] || x.p.contact)} ${esc(ukDate((x.p.contactAt || '').slice(0, 10)).slice(0, 5))}</span><button type="button" class="btn ghost sm" data-rcontact="" data-key="${esc(x.p.key)}">Undo</button>` : '') +
      (x.p.contactNote && /^RAVS/.test(x.p.contactNote) && !NOT_COMING.includes(x.p.contact) ? `<span class="pill p-notravs" title="${esc(x.p.contactNote)}">${esc(x.p.contactNote.replace(/^RAVS (\S+): /, 'RAVS $1: '))}</span>` : '') +
      (x.p.contact && NOT_COMING.includes(x.p.contact) ? '' : `<button type="button" class="btn sm rcheck" data-rcheck="${esc(x.p.key)}" ${recallCheck ? 'disabled' : ''}>${recallCheck && recallCheck.key === x.p.key ? 'Checking…' : 'Check on RAVS'}</button><button type="button" class="btn sm" data-rcontact="called" data-key="${esc(x.p.key)}">Called</button><button type="button" class="btn sm" data-rcontact="texted" data-key="${esc(x.p.key)}">Texted</button><button type="button" class="btn sm" data-rmore="${esc(x.p.key)}">More</button>`);
  $('#recallList').innerHTML = `<div class="panel list rlist" style="padding-block:6px">${rows.length ? rows.slice(0, recallView.show).map(x => `<div class="row">
      <div class="time" title="Age today">${x.age ?? '?'}</div>
      <div class="who"><div class="nm">${esc(fullName(x.p))}</div><div class="sub"><span class="mono f f-dob">${esc(ukDate(x.p.dob))}</span>${x.p.nhs ? `<span class="mono f f-nhs">${esc(fmtNhs(x.p.nhs))}</span>` : ''}${x.p.postcode ? `<span class="mono f f-pc">${esc(x.p.postcode)}</span>` : ''}${x.p.phone ? `<span class="mono f f-phone">${esc(x.p.phone)}</span>` : ''}<span class="f f-had"><span class="hs">${had(x)}</span></span></div></div>
      <div class="right">${due(x)}${act(x)}<button type="button" class="btn sm primary" data-rfind="${esc(x.p.key)}" title="Fill in Find patient on Register patient">Find patient</button></div></div>`).join('') +
    (rows.length > recallView.show ? `<div class="row" style="grid-template-columns:1fr"><button type="button" class="btn" data-rshowmore>Show more (${(rows.length - recallView.show).toLocaleString('en-GB')} left)</button></div>` : '')
    : '<div class="empty">Nobody here.</div>'}</div>`;
}
async function setContact(key, contact) {
  const p = (RECALL || []).find(x => x.key === key); if (!p) return;
  const patch = { contact, contactAt: contact ? `${todayIso()} ${nowTime()}` : '', contactBy: contact ? me : '' };
  if (!contact) patch.contactNote = '';
  Object.assign(p, patch); closeModal(); renderRecall();
  try { await API.recallContact(key, patch); } catch (e) { showError(e); }
}
// Check on RAVS: a staff member asks the helper to look up one recall patient and read their vaccination history.
// One at a time, only when someone presses the button.
let recallCheck = null;
function startRecallCheck(key) {
  const p = (RECALL || []).find(x => x.key === key); if (!p) return;
  if (recallCheck) return toast('Already checking someone on RAVS. Wait for that one to finish.');
  if (form.step === 'searching') return toast('Find patient is using RAVS right now. Try again in a moment.');
  if (hasGas && !EXT.ready) return toast('The RAVS Helper is not connected on this computer. Open RAVS and press Check RAVS first.');
  if (!p.nhs && !(p.dob && p.surname)) return toast('Not enough details to search RAVS for this patient.');
  const job = { id: 'rc' + uid(), nhs: p.nhs, given: p.given, surname: p.surname, dob: p.dob, postcode: p.postcode };
  recallCheck = { id: job.id, key, timer: setTimeout(() => { if (recallCheck && recallCheck.id === job.id) { if (EXT.ready) window.postMessage({ psm: 'app-lookup-cancel', id: job.id }, '*'); recallCheck = null; toast("RAVS didn't answer within a minute. Look at the RAVS tab, then try again."); renderRecall(); } }, 60000) };
  renderRecall();
  if (EXT.ready) window.postMessage({ psm: 'app-lookup', job }, '*');
  else setTimeout(() => onLookup(demoRecallLookup(job)), 1200);
}
function demoRecallLookup(job) {
  const had = +job.nhs.slice(-1) % 3;
  const hist = ['Date\tVaccine\tProduct', had ? `${longDate(isoDate(new Date(Date.now() - 9 * 86400000)))}\tFlu\tAdjuvanted trivalent influenza vaccine` : '', had === 2 ? `${longDate(isoDate(new Date(Date.now() - 9 * 86400000)))}\tCOVID-19\tComirnaty` : '', '14 October 2025\tFlu\tAdjuvanted trivalent influenza vaccine'].filter(Boolean).join('\n');
  return { id: job.id, ok: true, patient: { name: `${job.given} ${job.surname}`, dob: job.dob, nhs: job.nhs, history: hist } };
}
async function onRecallLookup(res) {
  const { key, timer } = recallCheck; clearTimeout(timer); recallCheck = null;
  const p = (RECALL || []).find(x => x.key === key); if (!p) return;
  if (!res.ok) { toast(res.error || 'RAVS could not find this patient.'); return renderRecall(); }
  const r = res.patient || {};
  if ((p.nhs && r.nhs && cleanNhs(r.nhs) !== p.nhs) || (p.dob && r.dob && r.dob !== p.dob)) { toast('RAVS found a different patient, so nothing was saved. Use Find patient to check by hand.'); return renderRecall(); }
  const start = S.seasonStart || todayIso();
  const got = new Set(parseHistory(r.history).rows.map(h => ({ d: parseDob(h.date), v: /covid/i.test(h.vaccine) ? 'COVID-19' : /flu/i.test(h.vaccine) ? 'Flu' : '' })).filter(h => h.d && h.d >= start && h.v).map(h => h.v));
  const x = recallState(p, { byNhs: new Map(), byName: new Map() });
  const due = [x.flu && 'Flu', x.covid && 'COVID-19'].filter(Boolean);
  const want = due.length ? due : [...new Set(x.past.flatMap(s => [...x.hist[s]].filter(v => v === 'Flu' || v === 'COVID-19')))];
  const missing = want.filter(v => !got.has(v));
  const when = ukDate(todayIso()).slice(0, 5);
  const note = got.size ? `RAVS ${when}: had ${[...got].map(v => VACCINES[v].short).join(' + ')} this season${missing.length ? `, ${missing.map(v => VACCINES[v].short).join(' + ')} still due` : ''}` : `RAVS ${when}: nothing yet this season`;
  const patch = !missing.length && got.size ? { contact: 'elsewhere', contactAt: `${todayIso()} ${nowTime()}`, contactBy: me, contactNote: note } : { contactNote: note };
  Object.assign(p, patch); renderRecall();
  toast(note.replace(/^RAVS \S+: /, 'RAVS: '));
  try { await API.recallContact(key, patch); } catch (e) { showError(e); }
}
function recallMore(key) {
  const p = (RECALL || []).find(x => x.key === key); if (!p) return;
  openModal(`<h2>${esc(fullName(p))}</h2><p class="small muted" style="margin-top:0">${esc(ukDate(p.dob))}${p.address ? ' · ' + esc(p.address) : ''}<br>Had with us: ${esc(p.history)}${p.reason ? `<br>Reason given before: ${esc(p.reason)}` : ''}</p>
    <div class="actions" style="flex-wrap:wrap"><button type="button" class="btn" data-rcontact="declined" data-key="${esc(key)}">Not interested</button><button type="button" class="btn" data-rcontact="elsewhere" data-key="${esc(key)}">Had it elsewhere</button><button type="button" class="btn ghost" data-close>Close</button></div>`);
}
function recallFind(key) {
  const p = (RECALL || []).find(x => x.key === key); if (!p) return;
  clearForm();
  $('#fNhs').value = fmtNhs(p.nhs); $('#fDob').value = ukDate(p.dob); $('#fGiven').value = p.given; $('#fSurname').value = p.surname; $('#fPostcode').value = p.postcode || ''; $('#fPhone').value = p.phone || '';
  showTab('desk'); renderDeskForm(); onDobInput(); onNhsInput(); checkDuplicates();
  if (canSearch() && (p.nhs || p.dob)) startFind(); else renderFind();
}
async function exportRecall() {
  const rows = recallList._shown || [];
  if (!rows.length) return toast('Nothing in this list to download.');
  try {
    const ExcelJS = await loadExcelJs(), wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('Possible opportunity');
    const cols = [['Surname', x => x.p.surname, 16], ['First name', x => x.p.given, 14], ['Date of birth', x => ukDate(x.p.dob), 12], ['Age', x => x.age ?? '', 6], ['NHS number', x => fmtNhs(x.p.nhs), 14],
      ['Phone', x => x.p.phone, 14], ['Postcode', x => x.p.postcode, 10], ['Address', x => x.p.address, 36], ['Due by age', x => [x.flu && 'Flu', x.covid && 'COVID'].filter(Boolean).join(', ') || 'Needs a reason', 14],
      ['Reason before', x => x.p.reason, 18], ['Had with us', x => x.p.history, 34], ['Contact', x => CONTACT_LABEL[x.p.contact] || '', 14], ['Contacted on', x => ukDate((x.p.contactAt || '').slice(0, 10)), 12], ['By', x => x.p.contactBy, 12]];
    const h = ws.addRow(cols.map(c => c[0])); h.font = { bold: true, color: { argb: 'FFFFFFFF' } }; h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_FILL.head } };
    cols.forEach((c, i) => { ws.getColumn(i + 1).width = c[2]; });
    rows.forEach(x => ws.addRow(cols.map(c => c[1](x) ?? '')));
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    const blob = new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `PSM possible opportunity ${ukDate(todayIso()).replace(/\//g, '-')}.xlsx`; document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { console.warn(e); toast("Couldn't make the Excel file. Check the internet connection and try again."); }
}

/* old season files: the daily card sheets (Family Name:, Given Name(s):, ...) or any table with a header row */
function loadSheetJs() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  const urls = ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'];
  return urls.reduce((p, u) => p.catch(() => new Promise((res, rej) => { const el = document.createElement('script'); el.src = u; el.onload = () => window.XLSX ? res(window.XLSX) : rej(); el.onerror = rej; document.head.appendChild(el); })), Promise.reject());
}
const RC_SKIP_TAB = /TEMPLATE|AUDIT|TO CHECK|^LIST$|LFT|PPV|NASAL|^x+$|yyyy/i;
function cellIso(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) return isNaN(v) ? '' : isoDate(new Date(v.getTime() + 12 * 3600e3));
  if (typeof v === 'number') { if (v < 600 || v > 80000) return ''; const d = new Date(Math.round((v - 25569) * 86400e3)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
  const s = String(v).trim(); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : parseDob(s) || '';
}
// "Family Name:", including ones with the first letters cut off ("amily Name:").
const isFamilyLabel = l => /name:\s*$/.test(l) && !/given|en name|\(s\)|first|full/.test(l);
const cellText = v => v == null ? '' : v instanceof Date ? '' : String(v).replace(/\s+/g, ' ').trim();
// The clinic date of a daily tab: "1010" (month and day, year from the file name), "511" (day and month), "101125", "11022025",
// or else the first date near the top. Tab names come first because copied tabs often keep an old date.
function tabDate(name, fileYear, grid) {
  const s = name.trim().split(' ')[0];
  let m = s.match(/^(\d{2})(\d{2})(\d{4})$/); if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{2})(\d{2})(\d{2})$/); if (m) return `20${m[3]}-${m[2]}-${m[1]}`;
  const mmdd = (mo, d) => fileYear && mo >= 1 && mo <= 12 && d >= 1 && d <= 31 ? `${mo >= 8 ? fileYear : fileYear + 1}-${pad(mo)}-${pad(d)}` : '';
  m = s.match(/^(\d{2})(\d{2})$/); if (m && mmdd(+m[1], +m[2])) return mmdd(+m[1], +m[2]);
  m = s.match(/^(\d)(\d{2})$/); if (m && mmdd(+m[2], +m[1])) return mmdd(+m[2], +m[1]);
  for (let r = 0; r < Math.min(25, grid.length); r++) for (const v of grid[r] || []) if (v instanceof Date) { const d = cellIso(v); if (d >= '2015') return d; }
  return fileYear ? `${fileYear}-10-01` : '';
}
function parseOldWorkbook(XLSX, wb, fileName) {
  const fileYear = +((fileName.match(/20\d\d/) || [])[0]) || 0;
  const out = [];
  wb.SheetNames.forEach(sn => {
    if (RC_SKIP_TAB.test(sn.trim())) return;
    const grid = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: null, blankrows: true });
    const date = tabDate(sn, fileYear, grid);
    const priv = /PRIV/i.test(sn) ? (/COV/i.test(sn) ? 'Private COVID' : 'Private flu') : '';
    const heads = [];
    grid.forEach((row, r) => (row || []).forEach((v, c) => { const t = cellText(v).toUpperCase(); if (t === 'FLU' || t === 'COVID' || t === 'COVID-19') heads.push({ r, c, v: t === 'FLU' ? 'Flu' : 'COVID-19' }); }));
    const val = (r, c) => { for (const dc of [2, 1, 3]) { const v = (grid[r] || [])[c + dc]; if (v != null && typeof v !== 'boolean' && (v instanceof Date || cellText(v) !== '')) return v; } return null; };
    let cards = 0;
    grid.forEach((row, r) => (row || []).forEach((v, c) => {
      const lab = cellText(v).toLowerCase();
      if (!isFamilyLabel(lab)) return;
      const p = { surname: cellText(val(r, c)), given: '', dob: '', gender: '', nhs: '', address: '', postcode: '', reason: '', phone: '', date };
      for (let k = r + 1; k < r + 14 && k < grid.length; k++) {
        const l = cellText((grid[k] || [])[c]).toLowerCase(); if (!l) continue;
        if (isFamilyLabel(l)) break;
        const x = val(k, c);
        if (/given|\(s\)/.test(l)) p.given = cellText(x);
        else if (/birth/.test(l)) p.dob = cellIso(x);
        else if (/gender/.test(l)) p.gender = cellText(x);
        else if (/^nhs number/.test(l)) p.nhs = cleanNhs(cellText(x));
        else if (/address/.test(l)) p.address = cellText(x);
        else if (/postcode/.test(l)) p.postcode = fmtPostcode(cellText(x));
        else if (/exemption/.test(l)) p.reason = cellText(x);
        else if (/contact|phone|mobile|tel/.test(l)) p.phone = cellText(x);
        else if (/date of jab|date of vac/.test(l)) { const d = [1, 2].map(dc => cellIso((grid[k] || [])[c + dc])).find(Boolean); if (d) p.date = d; }
      }
      if (!p.surname || (!p.dob && p.nhs.length !== 10)) return;
      const h = heads.filter(x => x.r <= r && x.c <= c).sort((a, b) => b.c - a.c || b.r - a.r)[0];
      p.vaccine = priv || (h ? h.v : 'Flu');
      out.push(p); cards++;
    }));
    if (!cards) parseTable(grid, date, fileYear).forEach(p => out.push(p));
  });
  return out;
}
// Any sheet with a header row (a RAVS export, a list someone typed up): find the columns by their names.
function parseTable(grid, date, fileYear) {
  const out = [];
  const hr = grid.findIndex((row, i) => i < 15 && (row || []).filter(v => /nhs|surname|family|forename|first name|birth|dob/i.test(cellText(v))).length >= 2);
  if (hr < 0) return out;
  const H = (grid[hr] || []).map(v => cellText(v).toLowerCase());
  const col = re => H.findIndex(h => re.test(h));
  const c = { nhs: col(/nhs/), surname: col(/surname|family|last ?name/), given: col(/forename|given|first ?name/), name: col(/^(patient )?name$|full name/), dob: col(/birth|dob/),
    postcode: col(/post ?code/), phone: col(/phone|mobile|tel/), address: col(/address/), vaccine: col(/vaccine|product|programme|type/), date: col(/^(vaccination |event )?date(?! of birth)|date given|vaccinated on/), reason: col(/eligib|reason|exemption/) };
  for (let r = hr + 1; r < grid.length; r++) {
    const row = grid[r] || [], g = k => c[k] >= 0 ? row[c[k]] : null;
    let surname = cellText(g('surname')), given = cellText(g('given'));
    if (!surname && c.name >= 0) { const w = cellText(g('name')).split(/,\s*|\s+/).filter(Boolean); if (/,/.test(cellText(g('name')))) { surname = w.shift() || ''; given = w.join(' '); } else { surname = w.pop() || ''; given = w.join(' '); } }
    const p = { surname, given, dob: cellIso(g('dob')), nhs: cleanNhs(cellText(g('nhs'))), postcode: fmtPostcode(cellText(g('postcode'))), phone: cellText(g('phone')), address: cellText(g('address')), reason: cellText(g('reason')), gender: '', date: cellIso(g('date')) || date };
    if (!p.surname || (!p.dob && p.nhs.length !== 10)) continue;
    const vt = cellText(g('vaccine')).toLowerCase();
    p.vaccine = /covid/.test(vt) ? 'COVID-19' : 'Flu';
    if (!p.date && fileYear) p.date = `${fileYear}-10-01`;
    out.push(p);
  }
  return out;
}
// Folds the cards into one entry per person, matched by NHS number, or by surname and date of birth.
function mergeRecall(existing, cards) {
  const byNhs = new Map(), byName = new Map(), changed = new Set();
  existing.forEach(p => { if (p.nhs) byNhs.set(p.nhs, p); byName.set(nameKey(p), p); });
  cards.forEach(c => {
    if (!c.date) return;
    let p = (c.nhs.length === 10 && byNhs.get(c.nhs)) || (c.dob && byName.get(nameKey(c)));
    if (!p) { p = { key: c.nhs.length === 10 ? c.nhs : nameKey(c), nhs: '', surname: '', given: '', dob: '', gender: '', postcode: '', address: '', phone: '', history: '', reason: '', source: 'Old sheets', contact: '', contactAt: '', contactBy: '', contactNote: '' }; existing.push(p); }
    const newer = !p._latest || c.date >= p._latest;
    ['nhs', 'surname', 'given', 'dob', 'gender', 'postcode', 'address', 'phone', 'reason'].forEach(k => { const v = k === 'surname' ? c.surname.toUpperCase() : k === 'given' ? titleCase(c.given) : c[k]; if (v && (newer || !p[k])) p[k] = v; });
    if (newer) p._latest = c.date;
    const h = historyMap(p.history), s = seasonOf(c.date);
    (h[s] ||= new Set()).add(c.vaccine);
    p.history = historyText(h);
    if (p.nhs) byNhs.set(p.nhs, p); byName.set(nameKey(p), p);
    changed.add(p);
  });
  return [...changed].map(p => { const o = Object.assign({}, p); delete o._latest; return o; });
}
function openRecallImport() {
  openModal(`<h2>Add old season files</h2>
    <p class="small" style="margin-top:0">In each old Google Sheet, click <b>File → Download → Microsoft Excel (.xlsx)</b>. Then choose the downloaded files here (you can pick several at once). They're read on this computer; only the patients found are saved, in the app data sheet.</p>
    <input type="file" id="rcFiles" accept=".xlsx,.xls,.csv" multiple>
    <div id="rcOut" style="margin-top:12px"></div>
    <div class="actions"><button type="button" class="btn primary" id="rcSave" disabled>Add to the list</button><button type="button" class="btn ghost" data-close>Close</button></div>`);
  let cards = [];
  $('#rcFiles').onchange = async ev => {
    const files = [...ev.target.files]; cards = []; $('#rcSave').disabled = true;
    const out = $('#rcOut'); out.innerHTML = '<p class="small muted">Loading the Excel reader…</p>';
    let XLSX; try { XLSX = await loadSheetJs(); } catch (e) { out.innerHTML = '<div class="alert bad">The Excel reader did not load. Check the internet connection and try again.</div>'; return; }
    const lines = [];
    for (const f of files) {
      out.innerHTML = lines.join('') + `<p class="small muted">Reading ${esc(f.name)}… (big files take up to a minute)</p>`;
      await new Promise(r => setTimeout(r, 30));
      try {
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true, cellFormula: false, cellStyles: false });
        const got = parseOldWorkbook(XLSX, wb, f.name); cards = cards.concat(got);
        const seasons = {}; got.forEach(c => { if (c.date) { const s = seasonOf(c.date); seasons[s] = (seasons[s] || 0) + 1; } });
        lines.push(`<div class="alert ${got.length ? 'ok' : 'warn'}"><b>${esc(f.name)}</b>: ${got.length ? `${got.length.toLocaleString('en-GB')} vaccinations (${Object.keys(seasons).sort().map(s => `${s}: ${seasons[s].toLocaleString('en-GB')}`).join(', ')})` : 'no patients found in this file'}</div>`);
      } catch (e) { console.warn(e); lines.push(`<div class="alert bad"><b>${esc(f.name)}</b>: couldn't read this file (${esc(e.message || e)})</div>`); }
    }
    const people = new Set(cards.map(c => c.nhs.length === 10 ? c.nhs : nameKey(c))).size;
    out.innerHTML = lines.join('') + (cards.length ? `<p class="small" style="margin-bottom:0">About ${people.toLocaleString('en-GB')} different patients.</p>` : '');
    $('#rcSave').disabled = !cards.length;
  };
  $('#rcSave').onclick = async () => {
    $('#rcSave').disabled = true; const out = $('#rcOut');
    try {
      const existing = (await API.recallGet()).map(p => Object.assign({}, p));
      const changed = mergeRecall(existing, cards);
      for (let i = 0; i < changed.length; i += 1000) {
        out.insertAdjacentHTML('beforeend', `<p class="small muted">Saving ${Math.min(i + 1000, changed.length).toLocaleString('en-GB')} of ${changed.length.toLocaleString('en-GB')}…</p>`);
        await API.recallSave(changed.slice(i, i + 1000));
      }
      closeModal(); toast(`${changed.length.toLocaleString('en-GB')} patients added or updated`); loadRecall();
    } catch (e) {
      console.warn(e);
      out.insertAdjacentHTML('beforeend', /not found|apiRecall/i.test(String(e && (e.message || e))) ? '<div class="alert bad">The app needs a one-time update first. Close this and follow the steps on the Recall tab.</div>' : `<div class="alert bad">Couldn't save (${esc(e.message || e)}). Try again.</div>`);
      $('#rcSave').disabled = false;
      if (/not found|apiRecall/i.test(String(e && (e.message || e)))) { RECALL_ERR = 'update'; renderRecall(); }
    }
  };
}

/* ===================== events ===================== */
let curTab = 'desk';
function showTab(name) {
  if (!$('#tab-' + name)) name = 'desk';
  curTab = name;
  $$('nav.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name));
  $$('section.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + name));
  store.set('psm.tab', name);
  if (name === 'private') loadPrivate();
  if (name === 'recall') loadRecall();
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
  if (d.entrymenu) return openEntryMenu(d.entrymenu);
  if (d.entryedit) { closeModal(); return loadEntryForEdit(d.entryedit); }
  if (d.entrydelete) return confirmDelete(d.entrydelete);
  if (d.entrydoses) { closeModal(); editing = d.entrydoses; showTab('desk'); renderVax(); return $(`[data-dose]`)?.scrollIntoView({ block: 'center' }); }
  if (d.entrymark) { closeModal(); const ids = entryRows(d.entrymark).filter(x => !isPriv(x)).map(x => x.id); await API.update(ids, { status: 'entered', enteredAt: `${todayIso()} ${nowTime()}`, enteredBy: me }); toast('Marked as entered on RAVS'); return refresh(true); }
  if (d.entryrefill) {
    closeModal(); const rows = entryRows(d.entryrefill).filter(x => !isPriv(x));
    if (rows.some(x => x.status === 'entered')) { await API.update(rows.map(x => x.id), { status: 'given', enteredAt: '', enteredBy: '' }); rows.forEach(x => { x.status = 'given'; x.enteredAt = ''; }); await refresh(true); }
    return sendToRavs(rows);
  }
  if ('editcancel' in d) { const back = form.editFrom; clearForm(); if (back && back !== 'desk') showTab(back); return; }
  if (d.fill) return sendToRavs(ROWS.filter(r => r.id === d.fill));
  if (b.id === 'fillAll') return sendToRavs(ROWS.filter(r => r.status === 'given' && (VACCINES[r.vaccine]?.target || 'RAVS') === 'RAVS').sort((a, b) => (a.givenAt || a.date).localeCompare(b.givenAt || b.date) || a.visitId.localeCompare(b.visitId)));
  if (d.todofilter) { todoFilter = d.todofilter; return renderTodo(); }
  if ('close' in d) return closeModal();
  if (b.id === 'pasteBtn') return openPaste();
  if (b.id === 'clearForm') return clearForm();
  if (b.id === 'offlineBtn') { offline = !offline; store.set('psm.offline', offline); form.findMsg = ''; if (!['find', 'error'].includes(form.step)) clearForm(); return renderFind(); }
  if (b.id === 'exportBtn') return exportExcel();
  if (b.id === 'recallAdd') return openRecallImport();
  if (b.id === 'recallExport') return exportRecall();
  if (d.rstatus) { recallView.status = d.rstatus; recallView.show = 200; return renderRecall(); }
  if (d.rwho) { recallView.who = d.rwho; recallView.show = 200; return renderRecall(); }
  if (d.rseen) { recallView.seen = d.rseen; recallView.show = 200; return renderRecall(); }
  if ('rshowmore' in d) { recallView.show += 200; return renderRecall(); }
  if (d.rcontact !== undefined && d.key) return setContact(d.key, d.rcontact);
  if (d.rmore) return recallMore(d.rmore);
  if (d.rfind) return recallFind(d.rfind);
  if (d.rcheck) return startRecallCheck(d.rcheck);
  if (b.id === 'ravsCheckBtn') return openRavsCheck();
  if (b.id === 'addProd') { S.products = readProducts().concat([{ vaccine: 'Flu', product: '', batch: '', expiry: '', active: true }]); renderProdTable(); }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.dataset.eligReason) { (form.elig[t.dataset.eligReason] ||= {}).reason = t.value; }
  if (t.id === 'sVaccinator') { myVax = t.value; store.set('psm.vax', myVax); renderVax(); updateGive(); }
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
  if (t.id === 'recallSearch') { recallView.q = t.value; recallView.show = 200; clearTimeout(recallSearchTimer); recallSearchTimer = setTimeout(renderRecall, 250); }
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
const BUILD = '21 Oct 2026, 6';
const whenUk = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${ukDate(isoDate(d))} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function renderBuild() {
  const backup = !hasGas ? '' : BACKUP.at ? ` · Last backup ${whenUk(BACKUP.at)} (Google Drive, folder "PSM Clinic backups")` : ' · Nightly backup not turned on yet';
  const helperZip = BACKUP.helper ? ` · Helper to install: "PSM RAVS Helper ${BACKUP.helper}.zip" in that folder${EXT.ready && verLt(EXT.version, BACKUP.helper) ? ' (newer than this computer\'s, please update)' : ''}` : '';
  $('#buildInfo').textContent = `App version ${BUILD}${window.PSM_LOADED_FROM ? ` (from the ${window.PSM_LOADED_FROM}: GitHub could not be reached)` : ''} · RAVS Helper ${EXT.ready ? EXT.version + (EXT.error ? ' (not reachable, reload this page)' : '') : EXT.error ? EXT.error : 'not installed on this computer'}${backup}${helperZip}`;
}
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
  if (!EXT.ready) return toast("The RAVS Helper isn't connected here. Use Chrome with the RAVS Helper installed, open RAVS, then press Check RAVS.");
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
  if (d.psm === 'ext-export-status') onExportStatus(d);
  if (d.psm === 'ext-export') onExport(d);
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
flushOutbox();
