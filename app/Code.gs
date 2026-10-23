/**
 * PSM Vaccine Clinic: Google Apps Script back end.
 * Stores one row per vaccine dose in the "Records" sheet of the spreadsheet this script is attached to.
 * Settings live in the "Settings" sheet (cell A2, JSON) so they are visible and backed up with the sheet.
 */

const RECORDS = 'Records';
const SETTINGS = 'Settings';
const CHANGES = 'Changes';
const CHANGE_COLS = ['When', 'Operator', 'Action', 'Entry id', 'Patient', 'Vaccine', 'Field', 'Was', 'Now'];
const BACKUP_FOLDER = 'PSM Clinic backups';
const KEEP_BACKUPS = 30;
const TZ = 'Europe/London';
const COLS = ['id', 'visitId', 'date', 'time', 'source', 'nhs', 'surname', 'given', 'dob', 'postcode', 'phone',
  'vaccine', 'product', 'batch', 'eligibility', 'eligNote', 'consent', 'site', 'vaccinator', 'deskBy', 'location',
  'status', 'givenAt', 'enteredAt', 'enteredBy', 'note', 'updatedAt', 'address', 'gp'];

// Where the latest screen (Index.html) is published. Changes only go live once merged into this branch on GitHub.
// Leave UPDATE_URL empty to always use the Index file pasted into this project.
const UPDATE_URL = 'https://raw.githubusercontent.com/darpan31patel-wq/psm-vaccine-clinic/main/app/Index.html';
const CODE_URL = 'https://raw.githubusercontent.com/darpan31patel-wq/psm-vaccine-clinic/main/app/app.js';
const HELPER_MANIFEST_URL = 'https://raw.githubusercontent.com/darpan31patel-wq/psm-vaccine-clinic/main/ravs-helper/manifest.json';
const REPO_ZIP_URL = 'https://github.com/darpan31patel-wq/psm-vaccine-clinic/archive/refs/heads/main.zip';

function doGet() {
  setup_();
  return HtmlService.createHtmlOutput(screenHtml_())
    .setTitle('PSM Vaccine Clinic')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * The latest screen from GitHub (cached for 5 minutes). If GitHub can't be reached: the copy saved in Drive,
 * then the pasted Index file.
 */
function screenHtml_() {
  const local = () => driveCopy_('Index.html') || HtmlService.createHtmlOutputFromFile('Index').getContent();
  if (!UPDATE_URL) return HtmlService.createHtmlOutputFromFile('Index').getContent();
  const cache = CacheService.getScriptCache();
  const hit = cache.get('screen');
  if (hit) return hit;
  try {
    const res = UrlFetchApp.fetch(UPDATE_URL, { muteHttpExceptions: true });
    const html = res.getContentText();
    if (res.getResponseCode() !== 200 || html.indexOf('psm-clinic-app') < 0) return local();
    if (html.length < 90000) cache.put('screen', html, 300); // cache values are capped at 100KB
    if (!cache.get('copyChecked')) { cache.put('copyChecked', '1', 600); try { saveAppCopy_(html); } catch (e) { console.warn(e); } try { saveHelperCopy_(); } catch (e) { console.warn(e); } }
    return html;
  } catch (e) {
    return local();
  }
}

/* ---------- Copy of the app in Drive, so it still opens when GitHub is down ---------- */

function backupFolder_() {
  const p = PropertiesService.getScriptProperties();
  const id = p.getProperty('backupFolder');
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  const found = DriveApp.getFoldersByName(BACKUP_FOLDER);
  const f = found.hasNext() ? found.next() : DriveApp.createFolder(BACKUP_FOLDER);
  p.setProperty('backupFolder', f.getId());
  return f;
}
function copyFile_(folder, name) {
  const files = folder.getFilesByName('App copy - ' + name);
  return files.hasNext() ? files.next() : null;
}
function driveCopy_(name) {
  try { const f = copyFile_(backupFolder_(), name); return f ? f.getBlob().getDataAsString() : ''; } catch (e) { return ''; }
}
/** Saves the screen and code from GitHub into Drive together, so the two copies always match. */
function saveAppCopy_(html) {
  if (!html) {
    const res = UrlFetchApp.fetch(UPDATE_URL, { muteHttpExceptions: true });
    html = res.getResponseCode() === 200 ? res.getContentText() : '';
  }
  const res = UrlFetchApp.fetch(CODE_URL, { muteHttpExceptions: true });
  const code = res.getResponseCode() === 200 ? res.getContentText() : '';
  if (html.indexOf('psm-clinic-app') < 0 || code.indexOf('PSM Vaccine Clinic') < 0) return false;
  const p = PropertiesService.getScriptProperties();
  const sum = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, html + code));
  const folder = backupFolder_();
  if (p.getProperty('copySum') === sum && copyFile_(folder, 'Index.html') && copyFile_(folder, 'app.js')) return true;
  [['Index.html', html, 'text/html'], ['app.js', code, 'text/plain']].forEach(([name, text, type]) => {
    const f = copyFile_(folder, name);
    if (f) f.setContent(text); else folder.createFile('App copy - ' + name, text, type);
  });
  p.setProperty('copySum', sum);
  p.setProperty('copyAt', new Date().toISOString());
  return true;
}
/**
 * Keeps the latest RAVS Helper in the backups folder as "PSM RAVS Helper <version>.zip", ready to install on any
 * computer. Only downloads when the helper's version on GitHub changes; older helper zips are moved to the bin.
 */
function saveHelperCopy_() {
  const res = UrlFetchApp.fetch(HELPER_MANIFEST_URL, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return false;
  const version = String(JSON.parse(res.getContentText()).version || '');
  const name = 'PSM RAVS Helper ' + version + '.zip';
  const folder = backupFolder_();
  if (!version || folder.getFilesByName(name).hasNext()) return true;
  const zip = UrlFetchApp.fetch(REPO_ZIP_URL, { muteHttpExceptions: true });
  if (zip.getResponseCode() !== 200) return false;
  // The GitHub zip holds the whole project in one top folder; keep only its ravs-helper folder.
  const files = Utilities.unzip(zip.getBlob()).filter(b => /^[^/]+\/ravs-helper\/.+[^/]$/.test(b.getName()))
    .map(b => b.setName(b.getName().replace(/^[^/]+\//, '')));
  if (!files.some(b => b.getName() === 'ravs-helper/manifest.json')) return false;
  folder.createFile(Utilities.zip(files, name));
  const it = folder.getFiles();
  while (it.hasNext()) { const f = it.next(); if (f.getName().indexOf('PSM RAVS Helper ') === 0 && f.getName() !== name) f.setTrashed(true); }
  PropertiesService.getScriptProperties().setProperty('helperVersion', version);
  return true;
}
/** The app code from the Drive copy, for when GitHub and jsDelivr can't be reached from the computer. */
function apiAppCode() { return driveCopy_('app.js'); }

/* ---------- Backups ---------- */

const BACKUP_PREFIX = 'Vaccine Clinic backup ';

/**
 * Run this once from the editor (choose it in the list at the top, then press Run). From then on, every hour Google
 * checks the data sheet and backs it up to Drive if anything changed. Running it again is safe.
 */
function turnOnBackups() {
  ScriptApp.getProjectTriggers().filter(t => ['nightlyBackup', 'backupIfChanged'].indexOf(t.getHandlerFunction()) >= 0).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('backupIfChanged').timeBased().everyHours(1).create();
  backupIfChanged(true);
}
/** Older setups call this every night. It now only backs up when something changed too. */
function nightlyBackup() { backupIfChanged(); }
/**
 * Backs up the data sheet to the Drive folder "PSM Clinic backups", only when something changed since the last backup:
 * a save in the app, or an edit made straight in the sheet. Also puts back the app copy and helper zip if they're missing.
 */
function backupIfChanged(force) {
  const p = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.getActive();
  const v = String(version_());
  const edited = DriveApp.getFileById(ss.getId()).getLastUpdated().getTime();
  if (force === true || p.getProperty('backupVersion') !== v || edited > Number(p.getProperty('backupEdited') || 0)) backup_(ss, v);
  try { saveAppCopy_(); } catch (e) { console.warn(e); }
  try { saveHelperCopy_(); } catch (e) { console.warn(e); }
}
/**
 * Copies every tab into a new sheet named for today. Later changes the same day replace that day's backup (the one it
 * replaces goes to Drive's bin), so there is one backup per day that had changes. The newest 30 days are kept.
 */
function backup_(ss, v) {
  const folder = backupFolder_();
  const day = BACKUP_PREFIX + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const copy = SpreadsheetApp.create(day);
  const blank = copy.getSheets()[0].setName('__blank__'); // the empty sheet a new spreadsheet starts with
  ss.getSheets().forEach(sh => sh.copyTo(copy).setName(sh.getName()));
  copy.deleteSheet(blank);
  DriveApp.getFileById(copy.getId()).moveTo(folder);
  const older = [];
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getId() === copy.getId() || f.getName().indexOf(BACKUP_PREFIX) !== 0) continue;
    if (f.getName().indexOf(day) === 0) f.setTrashed(true); else older.push(f);
  }
  older.sort((a, b) => b.getDateCreated() - a.getDateCreated()).slice(KEEP_BACKUPS - 1).forEach(f => f.setTrashed(true));
  const p = PropertiesService.getScriptProperties();
  p.setProperty('backupAt', new Date().toISOString());
  p.setProperty('backupVersion', v);
  p.setProperty('backupEdited', String(DriveApp.getFileById(ss.getId()).getLastUpdated().getTime()));
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
  if (!ss.getSheetByName(CHANGES)) {
    const ch = ss.insertSheet(CHANGES);
    ch.getRange(1, 1, 1, CHANGE_COLS.length).setValues([CHANGE_COLS]).setFontWeight('bold');
    ch.setFrozenRows(1);
    ch.getRange('A:I').setNumberFormat('@');
  }
}

/* ---------- Change log: who changed what, and when ---------- */

let changeBuf_ = [];
function logChange_(who, action, row, field, was, now) {
  row = row || {};
  changeBuf_.push([Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'), who || '', action, row.id || '',
    [row.given, row.surname].filter(String).join(' '), row.vaccine || '', field || '', cut_(was), cut_(now)]);
}
function cut_(v) { v = v == null ? '' : String(v); return v.length > 2000 ? v.slice(0, 2000) + '…' : v; }
function flushChanges_() {
  if (!changeBuf_.length) return;
  const rows = changeBuf_; changeBuf_ = [];
  const ch = SpreadsheetApp.getActive().getSheetByName(CHANGES);
  ch.getRange(ch.getLastRow() + 1, 1, rows.length, CHANGE_COLS.length).setValues(rows);
}
const who_ = meta => String((meta && meta.who) || '');

function lock_(fn) {
  const l = LockService.getScriptLock();
  l.waitLock(20000);
  changeBuf_ = [];
  try { const out = fn(); bump_(); try { flushChanges_(); } catch (e) { console.warn(e); } return out; } finally { l.releaseLock(); }
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
  const p = PropertiesService.getScriptProperties();
  return { version: v, settings: settings_(), rows: live, days: days, backupAt: p.getProperty('backupAt') || '', copyAt: p.getProperty('copyAt') || '', helperVersion: p.getProperty('helperVersion') || '' };
}

function apiRegister(visit, meta) {
  return lock_(() => {
    const sh = sheet_();
    // A save sent again after a dropped connection may already be in: skip rows that are, so nothing is doubled.
    const n = sh.getLastRow() - 1;
    const have = new Set(n > 0 ? sh.getRange(2, 1, n, 1).getValues().map(r => String(r[0])) : []);
    const fresh = visit.rows.filter(r => !have.has(String(r.id)));
    if (!fresh.length) return { ok: true, already: true };
    if (visit.bookingVisitId) markBooking_(sh, visit.bookingVisitId);
    const now = new Date().toISOString();
    const rows = fresh.map(r => { r.updatedAt = now; logChange_(who_(meta), 'Added', r, 'status', '', r.status); return toRow_(r); });
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

function apiUpdate(ids, patch, meta) {
  return apiUpdateEach(ids.map(id => ({ id: id, patch: patch })), meta);
}
function apiUpdateEach(changes, meta) {
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
      const before = {}; COLS.forEach((k, j) => before[k] = row[j]);
      const deleting = c.patch.status === 'deleted' && before.status !== 'deleted';
      Object.keys(c.patch).forEach(k => {
        const col = COLS.indexOf(k);
        if (col < 0 || k === 'id' || k === 'updatedAt') return;
        const val = String(c.patch[k] == null ? '' : c.patch[k]);
        if (row[col] === val) return;
        if (!deleting || k === 'status') logChange_(who_(meta), deleting ? 'Deleted' : 'Changed', before, k, row[col], val);
        row[col] = val;
      });
      row[COLS.indexOf('updatedAt')] = now;
      range.setValues([row]);
      updated++;
    });
    return { ok: true, updated: updated };
  };
  return lock_(run);
}

function apiImportBookings(rows, meta) {
  return lock_(() => {
    const sh = sheet_();
    const have = {};
    readAll_().forEach(r => { if (r.status === 'booked' || r.status === 'checkedin') have[r.date + '|' + r.nhs + '|' + r.dob] = true; });
    const fresh = rows.filter(r => !have[r.date + '|' + r.nhs + '|' + r.dob]);
    if (fresh.length) sh.getRange(sh.getLastRow() + 1, 1, fresh.length, COLS.length).setValues(fresh.map(toRow_));
    const visitsAdded = {}; fresh.forEach(r => visitsAdded[r.visitId] = true);
    if (fresh.length) logChange_(who_(meta), 'Bookings pasted', {}, 'bookings', '', Object.keys(visitsAdded).length);
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

function apiSaveSettings(s, meta) {
  return lock_(() => {
    const was = settings_();
    Object.keys(s).forEach(k => {
      const a = JSON.stringify(was[k]), b = JSON.stringify(s[k]);
      if (a !== b) logChange_(who_(meta), 'Settings', {}, k, a == null ? '' : a, b == null ? '' : b);
    });
    SpreadsheetApp.getActive().getSheetByName(SETTINGS).getRange('A2').setValue(JSON.stringify(s));
    return { ok: true };
  });
}

function apiExport(from, to) {
  return readAll_().filter(r => r.date >= from && r.date <= to && r.status !== 'checkedin');
}

/* ---------- Recall list: past patients, one row per person ---------- */
const RECALL = 'Recall';
const RCOLS = ['key', 'nhs', 'surname', 'given', 'dob', 'gender', 'postcode', 'address', 'phone', 'history', 'reason', 'source',
  'contact', 'contactAt', 'contactBy', 'contactNote', 'updatedAt'];

function recallSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(RECALL);
  if (!sh) {
    sh = ss.insertSheet(RECALL);
    sh.getRange(1, 1, 1, RCOLS.length).setValues([RCOLS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:Q').setNumberFormat('@');
  }
  return sh;
}
function recallAll_() {
  const sh = recallSheet_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, RCOLS.length).getDisplayValues().map(row => {
    const o = {}; RCOLS.forEach((c, i) => o[c] = row[i]); return o;
  });
}

function apiRecallGet() { return recallAll_(); }

/** Adds or replaces people by key. The screen has already merged them with what was there. */
function apiRecallSave(people, meta) {
  return lock_(() => {
    const sh = recallSheet_();
    const all = recallAll_();
    const at = {}; all.forEach((r, i) => at[r.key] = i);
    const now = new Date().toISOString();
    people.forEach(p => {
      p.updatedAt = now;
      if (p.key in at) all[at[p.key]] = Object.assign(all[at[p.key]], p);
      else { at[p.key] = all.length; all.push(p); }
    });
    if (all.length) sh.getRange(2, 1, all.length, RCOLS.length).setValues(all.map(o => RCOLS.map(c => o[c] == null ? '' : String(o[c]))));
    if (people.length) logChange_(who_(meta), 'Recall list updated', {}, 'people', '', people.length);
    return { ok: true, total: all.length };
  });
}

/** Records a contact outcome (called, texted, declined, elsewhere, or '' to clear) for one person. */
function apiRecallContact(key, patch, meta) {
  return lock_(() => {
    const sh = recallSheet_();
    const n = sh.getLastRow() - 1;
    if (n < 1) return { ok: false };
    const i = sh.getRange(2, 1, n, 1).getValues().map(r => String(r[0])).indexOf(key);
    if (i < 0) return { ok: false };
    const range = sh.getRange(i + 2, 1, 1, RCOLS.length);
    const row = range.getDisplayValues()[0];
    const who = {}; RCOLS.forEach((c, j) => who[c] = row[j]);
    ['contact', 'contactAt', 'contactBy', 'contactNote'].forEach(k => {
      if (!(k in patch)) return;
      const val = String(patch[k] == null ? '' : patch[k]), col = RCOLS.indexOf(k);
      if (row[col] !== val) logChange_(who_(meta), 'Recall contact', { id: key, given: who.given, surname: who.surname }, k, row[col], val);
      row[col] = val;
    });
    row[RCOLS.indexOf('updatedAt')] = new Date().toISOString();
    range.setValues([row]);
    return { ok: true };
  });
}
