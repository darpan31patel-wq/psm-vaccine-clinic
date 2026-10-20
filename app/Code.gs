/**
 * PSM Vaccine Clinic: Google Apps Script back end.
 * Stores one row per vaccine dose in the "Records" sheet of the spreadsheet this script is attached to.
 * Settings live in the "Settings" sheet (cell A2, JSON) so they are visible and backed up with the sheet.
 */

const RECORDS = 'Records';
const SETTINGS = 'Settings';
const TZ = 'Europe/London';
const COLS = ['id', 'visitId', 'date', 'time', 'source', 'nhs', 'surname', 'given', 'dob', 'postcode', 'phone',
  'vaccine', 'product', 'batch', 'eligibility', 'eligNote', 'consent', 'site', 'vaccinator', 'deskBy', 'location',
  'status', 'givenAt', 'enteredAt', 'enteredBy', 'note', 'updatedAt', 'address', 'gp'];

// Where the latest screen (Index.html) is published. Changes only go live once merged into this branch on GitHub.
// Leave UPDATE_URL empty to always use the Index file pasted into this project.
const UPDATE_URL = 'https://raw.githubusercontent.com/darpan31patel-wq/psm-vaccine-clinic/main/app/Index.html';

function doGet() {
  setup_();
  return HtmlService.createHtmlOutput(screenHtml_())
    .setTitle('PSM Vaccine Clinic')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** The latest screen from GitHub (cached for 5 minutes), or the pasted Index file if GitHub can't be reached. */
function screenHtml_() {
  const local = () => HtmlService.createHtmlOutputFromFile('Index').getContent();
  if (!UPDATE_URL) return local();
  const cache = CacheService.getScriptCache();
  const hit = cache.get('screen');
  if (hit) return hit;
  try {
    const res = UrlFetchApp.fetch(UPDATE_URL, { muteHttpExceptions: true });
    const html = res.getContentText();
    if (res.getResponseCode() !== 200 || html.indexOf('psm-clinic-app') < 0) return local();
    if (html.length < 90000) cache.put('screen', html, 300); // cache values are capped at 100KB
    return html;
  } catch (e) {
    return local();
  }
}

/** Run once from the editor (or it runs on first open) to create the sheets. */
function setup_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(RECORDS);
  if (!sh) {
    sh = ss.insertSheet(RECORDS);
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:AC').setNumberFormat('@'); // keep NHS numbers, dates and batches as plain text
  }
  let st = ss.getSheetByName(SETTINGS);
  if (!st) {
    st = ss.insertSheet(SETTINGS);
    st.getRange('A1').setValue('Settings are edited from the app. Do not change cell A2 by hand.');
    st.getRange('A2').setValue('{}');
  }
}

function lock_(fn) {
  const l = LockService.getScriptLock();
  l.waitLock(20000);
  try { const out = fn(); bump_(); return out; } finally { l.releaseLock(); }
}
function bump_() {
  const p = PropertiesService.getScriptProperties();
  p.setProperty('version', String(Number(p.getProperty('version') || 0) + 1));
}
function version_() { return Number(PropertiesService.getScriptProperties().getProperty('version') || 0); }

function sheet_() { setup_(); return SpreadsheetApp.getActive().getSheetByName(RECORDS); }
function readAll_() {
  const sh = sheet_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, COLS.length).getDisplayValues().map(row => {
    const o = {}; COLS.forEach((c, i) => o[c] = row[i]); return o;
  });
}
function toRow_(o) { return COLS.map(c => o[c] == null ? '' : String(o[c])); }
function settings_() {
  const st = SpreadsheetApp.getActive().getSheetByName(SETTINGS);
  try { return JSON.parse(st.getRange('A2').getValue() || '{}'); } catch (e) { return {}; }
}
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }

/* ---------- API used by Index.html ---------- */

function apiBoard(clientVersion, today) {
  const v = version_();
  if (clientVersion === v) return { unchanged: true, version: v };
  today = today || today_();
  const rows = readAll_();
  const live = rows.filter(r => r.date === today || r.status === 'given');
  const byDay = {};
  rows.forEach(r => {
    if (r.status === 'checkedin') return;
    const d = byDay[r.date] || (byDay[r.date] = { date: r.date, booked: 0, given: 0, entered: 0, notgiven: 0, waiting: 0, byVax: {} });
    if (r.status === 'booked') d.booked++;
    else if (r.status === 'waiting') d.waiting++;
    else if (r.status === 'notgiven') d.notgiven++;
    else if (r.status === 'given' || r.status === 'entered') {
      d.given++; d.byVax[r.vaccine] = (d.byVax[r.vaccine] || 0) + 1;
      if (r.status === 'entered') d.entered++;
    }
  });
  const days = Object.keys(byDay).map(k => byDay[k]).sort((a, b) => b.date.localeCompare(a.date));
  return { version: v, settings: settings_(), rows: live, days: days };
}

function apiRegister(visit) {
  return lock_(() => {
    const sh = sheet_();
    if (visit.bookingVisitId) markBooking_(sh, visit.bookingVisitId);
    const now = new Date().toISOString();
    const rows = visit.rows.map(r => { r.updatedAt = now; return toRow_(r); });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, COLS.length).setValues(rows);
    return { ok: true };
  });
}
function markBooking_(sh, visitId) {
  const data = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), COLS.length).getValues();
  const vCol = COLS.indexOf('visitId'), sCol = COLS.indexOf('status');
  data.forEach((row, i) => {
    if (row[vCol] === visitId && row[sCol] === 'booked') sh.getRange(i + 2, sCol + 1).setValue('checkedin');
  });
}

function apiUpdate(ids, patch) {
  return apiUpdateEach(ids.map(id => ({ id: id, patch: patch })));
}
function apiUpdateEach(changes) {
  const run = () => {
    const sh = sheet_();
    const n = sh.getLastRow() - 1;
    if (n < 1) return { ok: true, updated: 0 };
    const ids = sh.getRange(2, 1, n, 1).getValues().map(r => String(r[0]));
    const now = new Date().toISOString();
    let updated = 0;
    changes.forEach(c => {
      const i = ids.indexOf(c.id);
      if (i < 0) return;
      const range = sh.getRange(i + 2, 1, 1, COLS.length);
      const row = range.getDisplayValues()[0];
      Object.keys(c.patch).forEach(k => { const col = COLS.indexOf(k); if (col >= 0 && k !== 'id') row[col] = String(c.patch[k] == null ? '' : c.patch[k]); });
      row[COLS.indexOf('updatedAt')] = now;
      range.setValues([row]);
      updated++;
    });
    return { ok: true, updated: updated };
  };
  return lock_(run);
}

function apiImportBookings(rows) {
  return lock_(() => {
    const sh = sheet_();
    const have = {};
    readAll_().forEach(r => { if (r.status === 'booked' || r.status === 'checkedin') have[r.date + '|' + r.nhs + '|' + r.dob] = true; });
    const fresh = rows.filter(r => !have[r.date + '|' + r.nhs + '|' + r.dob]);
    if (fresh.length) sh.getRange(sh.getLastRow() + 1, 1, fresh.length, COLS.length).setValues(fresh.map(toRow_));
    const visitsAdded = {}; fresh.forEach(r => visitsAdded[r.visitId] = true);
    return { added: Object.keys(visitsAdded).length };
  });
}

function apiSearch(q, seasonStart) {
  q = String(q || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const qn = q.replace(/\D/g, '');
  const qd = parseDob_(q);
  return readAll_().filter(r => r.status !== 'checkedin' && r.date >= (seasonStart || '') && (
    (qn.length >= 6 && r.nhs.indexOf(qn) >= 0) || (qd && r.dob === qd) ||
    (r.surname + ' ' + r.given).toLowerCase().indexOf(q) >= 0 || (r.given + ' ' + r.surname).toLowerCase().indexOf(q) >= 0
  )).slice(-80).reverse();
}
function parseDob_(s) {
  const m = String(s).match(/^(\d{1,2})[\/\.\-\s](\d{1,2})[\/\.\-\s](\d{4})$/) || String(s).match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) return null;
  const pad = n => ('0' + n).slice(-2);
  return m[3] + '-' + pad(m[2]) + '-' + pad(m[1]);
}

function apiSaveSettings(s) {
  return lock_(() => {
    SpreadsheetApp.getActive().getSheetByName(SETTINGS).getRange('A2').setValue(JSON.stringify(s));
    return { ok: true };
  });
}

function apiExport(from, to) {
  return readAll_().filter(r => r.date >= from && r.date <= to && r.status !== 'checkedin');
}
