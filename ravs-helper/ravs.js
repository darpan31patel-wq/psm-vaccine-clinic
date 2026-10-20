// PSM RAVS Helper: fills each Record a vaccination page from the job the clinic app sent.
// It never presses "Confirm and save". Staff check the summary page and press it themselves.
(function () {
  if (window.__psmRavs) return;
  window.__psmRavs = true;

  const STEP_DELAY = 450; // ms pause so staff can see each page before it moves on
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const OTHER_CONSENTS = ["clinician acting in the patient's best interests", 'person with lasting power of attorney for health and welfare', 'parent or guardian', 'independent mental capacity advocate', 'court appointed deputy'];

  /* ---------- storage ---------- */
  const get = keys => new Promise(r => chrome.storage.local.get(keys, r));
  const set = obj => new Promise(r => chrome.storage.local.set(obj, r));
  async function state() { return get({ queue: [], current: null, stage: null, startingAt: 0, paused: false, captured: {}, done: [], lookups: [], keptAliveAt: 0 }); }
  // Tells the app what a patient search is doing, so it never just spins.
  let lastStatus = '';
  function lookupStatus(job, text) {
    if (!job || !job.lookup || lastStatus === job.id + text) return;
    lastStatus = job.id + text; set({ lookupStatus: { id: job.id, text, at: Date.now() } });
  }
  const STATUS = { start: 'Opening Record vaccinations on RAVS', nhs: 'Entering the NHS number on RAVS', search: 'Entering the name and date of birth on RAVS', history: 'Reading the patient details' };
  const LOGIN_MSG = 'RAVS needs you to log in. Open the RAVS tab in Chrome, log in, then search again.';

  /* ---------- page helpers ---------- */
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const h1 = () => norm((document.querySelector('main h1, h1') || {}).textContent);
  const path = () => location.pathname.replace(/\/+$/, '');
  function labelText(input) {
    const l = (input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`)) || input.closest('label');
    if (!l) return '';
    const clone = l.cloneNode(true);
    clone.querySelectorAll('.nhsuk-hint, .nhsuk-radios__hint, span.hint').forEach(x => x.remove());
    return norm(clone.textContent);
  }
  function radios() { return [...document.querySelectorAll('input[type=radio]')].filter(r => !r.disabled); }
  function radioWhere(pred) { return radios().find(r => pred(labelText(r), r)); }
  // RAVS shows user names as typed (e.g. lower case, a letter short), so match each word on its first letters.
  const nameLike = (label, want) => { const ws = want.split(' ').filter(Boolean); return ws.length > 1 && ws.every(w => label.includes(w.slice(0, Math.max(3, Math.min(w.length, 5))))); };
  function radioLabel(text) { const t = norm(text); return radioWhere(l => l === t); }
  function setValue(el, v) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }
  function inputByLabel(re) {
    for (const l of document.querySelectorAll('label')) {
      if (!re.test(norm(l.textContent))) continue;
      const el = (l.htmlFor && document.getElementById(l.htmlFor)) || l.querySelector('input') || l.parentElement.querySelector('input:not([type=radio]):not([type=checkbox])');
      if (el && el.type !== 'radio') return el;
    }
    return null;
  }
  function choose(r) { if (r && !r.checked) r.click(); return !!r; }
  function continueButton() {
    const btns = [...document.querySelectorAll('main button, main input[type=submit], form button, form input[type=submit]')];
    return btns.find(b => /^(continue|search)$/i.test((b.textContent || b.value || '').trim())) || null;
  }
  function looksLikeLogin() { return !!document.querySelector('input[type=password]') || /\b(log ?in|sign ?in)\b/.test(h1() + ' ' + norm(document.title)); }
  function hasError() { return !!document.querySelector('.nhsuk-error-summary, [role=alert].nhsuk-error-summary, .govuk-error-summary'); }
  function ukDateParts(iso) { const [y, m, d] = iso.split('-'); return { d: String(+d), m: String(+m), y }; }
  function longToIso(s) {
    const m = norm(s).match(/(\d{1,2}) ([a-z]+) (\d{4})/);
    if (!m) return null; const mi = MONTHS.indexOf(m[2]); if (mi < 0) return null;
    return `${m[3]}-${String(mi + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  function summaryRows() {
    const out = {};
    document.querySelectorAll('.nhsuk-summary-list__row, dl > div, tr').forEach(row => {
      const k = row.querySelector('dt, th'); const v = row.querySelector('dd, td');
      if (k && v) out[norm(k.textContent)] = v.innerText.replace(/\n?Change\s*$/i, '').trim();
    });
    return out;
  }
  // Text under any "vaccination history" style heading on the patient page, so the desk can see past doses.
  function historyText() {
    const out = [];
    document.querySelectorAll('main h2, main h3').forEach(h => {
      if (!/vaccination|history/i.test(h.textContent)) return;
      for (let el = h.nextElementSibling; el && !/^H[1-3]$/.test(el.tagName); el = el.nextElementSibling) out.push(el.innerText.trim());
    });
    return out.filter(Boolean).join('\n').slice(0, 8000);
  }
  function fmtNhs(s) { s = String(s || '').replace(/\D/g, ''); return s.length === 10 ? `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}` : s; }
  function todayIso() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

  // The names RAVS lists under "Who is the vaccinator?", spelt exactly as RAVS shows them, so the app can only use those.
  async function saveVaccinators() {
    const names = radios().map(r => {
      const l = (r.id && document.querySelector(`label[for="${CSS.escape(r.id)}"]`)) || r.closest('label');
      const t = String(l ? l.textContent : '').replace(/\s+/g, ' ').trim();
      const me = t.match(/^Me \((.+)\)$/i);
      return me ? me[1].trim() : t.replace(/\s*\([^)]*@[^)]*\)\s*$/, '').trim();
    }).filter(Boolean);
    if (!names.length) return;
    const { ravsVaccinators } = await get({ ravsVaccinators: null });
    if (!ravsVaccinators || JSON.stringify(ravsVaccinators.names) !== JSON.stringify(names)) await set({ ravsVaccinators: { names, at: new Date().toISOString() } });
  }

  /* ---------- which page are we on ---------- */
  function step() {
    const p = path().split('/').pop(), h = h1();
    const byPath = { 'patient-nhs-number': 'nhs', 'patient-search': 'search', 'patient-history': 'history', 'vaccination-date': 'date', 'vaccinator': 'vaccinator', 'vaccines': 'vaccines', 'vaccine-batch': 'batch', 'eligibility': 'eligibility', 'consent': 'consent', 'injection-site': 'site', 'check-confirm': 'confirm' };
    if (byPath[p]) return byPath[p];
    if (/patient's nhs number/.test(h)) return 'nhs';
    if (/search for the patient/.test(h)) return 'search';
    if (/^check .*details/.test(h)) return 'history';
    if (/is the vaccination today/.test(h)) return 'date';
    if (/when was the vaccination|date of vaccination/.test(h)) return 'dateEntry';
    if (/who is the vaccinator/.test(h)) return 'vaccinator';
    if (/which vaccine/.test(h)) return 'vaccines';
    if (/which batch/.test(h)) return 'batch';
    if (/why are you giving/.test(h)) return 'eligibility';
    if (/who is giving consent/.test(h)) return 'consent';
    if (/where did you give/.test(h)) return 'site';
    if (/check and confirm/.test(h)) return 'confirm';
    if (/^\/record-vaccinations$/.test(path())) return 'start';
    return 'unknown';
  }

  /* ---------- handlers: return {go:true} to press Continue, or {wait:'message'} ---------- */
  const H = {
    async start(job) {
      const a = [...document.querySelectorAll('main a, main button')].find(x => /record (a )?vaccination|start/i.test(x.textContent));
      if (a) { a.click(); return { done: true }; }
      if (job.lookup) return finishLookup(job, { ok: false, error: `RAVS is showing a page the helper doesn't recognise ("${h1() || 'no heading'}"). Look at the RAVS tab, then search again.` });
      return { wait: 'Open the first Record vaccinations page to begin.' };
    },
    async nhs(job) {
      if (job.nhs) {
        choose(radioLabel('Yes')); await sleep(150);
        const el = inputByLabel(/nhs number/) || document.querySelector('input[name*=nhs i]:not([type=radio])');
        if (!el) return { wait: 'Could not find the NHS number box.' };
        setValue(el, fmtNhs(job.nhs));
      } else choose(radioLabel('No'));
      return { go: true };
    },
    async search(job) {
      const f = [[/^first name/, job.given], [/^last name/, job.surname], [/^day$/, ukDateParts(job.dob).d], [/^month$/, ukDateParts(job.dob).m], [/^year$/, ukDateParts(job.dob).y], [/^postcode/, job.postcode]];
      for (const [re, v] of f) { const el = inputByLabel(re); if (el && v) setValue(el, v); }
      return { go: true };
    },
    async history(job, st) {
      const rows = summaryRows();
      if (job.lookup) {
        return finishLookup(job, { ok: true, patient: {
          name: (rows['name'] || '').split('\n')[0], dob: longToIso(rows['date of birth'] || ''), nhs: String(rows['nhs number'] || '').replace(/\D/g, ''),
          address: (rows['address'] || '').replace(/,?\s*\n\s*/g, ', '), gp: (rows['registered gp'] || '').replace(/\s*\n\s*/g, ', '), history: historyText(),
        } });
      }
      const pageNhs = String(rows['nhs number'] || '').replace(/\D/g, '');
      const pageDob = longToIso(rows['date of birth'] || '');
      const problems = [];
      if (job.nhs && pageNhs && pageNhs !== job.nhs) problems.push(`NHS number is ${fmtNhs(pageNhs)}, app has ${fmtNhs(job.nhs)}`);
      if (pageDob && pageDob !== job.dob) problems.push(`date of birth is ${rows['date of birth'].split('\n')[0]}`);
      if (!job.nhs && rows.name && !norm(rows.name).includes(norm(job.surname))) problems.push(`name is ${rows.name}`);
      const missing = [['NHS number', pageNhs], ['date of birth', pageDob], ['address', rows['address']], ['GP', rows['registered gp']]].filter(([, v]) => !String(v || '').trim()).map(([k]) => k);
      if (missing.length) problems.push(`the record shows no ${missing.join(', ')}, so it may not be the full patient profile`);
      const captured = Object.assign({}, st.captured);
      captured[job.id] = { address: (rows['address'] || '').replace(/,?\s*\n\s*/g, ', '), gp: (rows['registered gp'] || '').split('\n')[0], nhs: pageNhs };
      await set({ captured });
      if (problems.length) return { wait: 'Check this patient: ' + problems.join('; ') + '. Carry on by hand once you are sure it is the right person.', bad: true };
      return { go: true };
    },
    async date(job) {
      if (job.date === todayIso()) choose(radioLabel('Yes'));
      else {
        choose(radioWhere(l => l.startsWith('no'))); await sleep(200);
        const p = ukDateParts(job.date);
        [[/^day$/, p.d], [/^month$/, p.m], [/^year$/, p.y]].forEach(([re, v]) => { const el = inputByLabel(re); if (el) setValue(el, v); });
      }
      return { go: true };
    },
    async dateEntry(job) {
      const p = ukDateParts(job.date);
      [[/^day$/, p.d], [/^month$/, p.m], [/^year$/, p.y]].forEach(([re, v]) => { const el = inputByLabel(re); if (el) setValue(el, v); });
      return { go: true };
    },
    async vaccinator(job) {
      await saveVaccinators();
      const want = norm(job.vaccinator);
      if (!want) return { wait: 'Choose the vaccinator. The app has none set for this vaccination.' };
      const r = radioWhere(l => l === want || l.startsWith(want + ' (') || l.includes('(' + want + ')') || l.includes(want)) || radioWhere(l => nameLike(l, want));
      if (!choose(r)) return { wait: `Couldn't find "${job.vaccinator}" in the vaccinator list. Pick them, then press Continue.` };
      return { go: true };
    },
    async vaccines(job) {
      if (!choose(radioLabel(job.ravsVaccine))) return { wait: `Couldn't find "${job.ravsVaccine}". Pick the vaccine, then press Continue.` };
      await sleep(250);
      const top = new Set(['covid-19', 'flu', 'flu (london)', 'menb', 'mmr', 'rsv', 'pertussis']);
      const products = radios().filter(r => !top.has(labelText(r)) && r.offsetParent !== null);
      const want = norm(job.product), code = (want.match(/\(([^)]+)\)\s*$/) || [])[1];
      let r = products.find(x => labelText(x) === want) || (code && products.find(x => labelText(x).includes('(' + code + ')'))) || products.find(x => want && (labelText(x).includes(want) || want.includes(labelText(x))));
      if (!r && products.length === 1) r = products[0];
      if (products.length && !choose(r)) return { wait: `Couldn't match the product "${job.product}". Pick it, then press Continue.` };
      return { go: true };
    },
    async batch(job) {
      const want = norm(job.batch).replace(/\s/g, '');
      const r = want && radioWhere(l => l.replace(/\s/g, '').startsWith(want));
      if (!choose(r)) return { wait: `Batch ${job.batch || '(none set)'} isn't listed in RAVS. Add it under Vaccines in RAVS or pick the right batch.`, bad: true };
      return { go: true };
    },
    async eligibility(job) {
      if (!choose(radioLabel(job.eligibility))) return { wait: `Pick the reason (app says "${job.eligibility || 'none'}"), then press Continue.` };
      return { go: true };
    },
    async consent(job) {
      let r;
      if (norm(job.consent) === 'patient') r = radios().find(x => !OTHER_CONSENTS.includes(labelText(x)));
      else r = radioLabel(job.consent);
      if (!choose(r)) return { wait: 'Pick who is giving consent, then press Continue.' };
      return { go: true };
    },
    async site(job) {
      if (!choose(radioLabel(job.site || 'Left upper arm'))) return { wait: 'Pick the injection site, then press Continue.' };
      return { go: true };
    },
    async confirm(job) {
      const rows = summaryRows();
      const checks = [
        ['Vaccine', rows['vaccine'], v => norm(v).includes(norm(job.ravsVaccine === 'COVID-19' ? 'covid' : job.ravsVaccine))],
        ['Batch', rows['batch'], v => norm(v).replace(/\s/g, '').includes(norm(job.batch).replace(/\s/g, ''))],
        ['Vaccinator', rows['vaccinator'], v => norm(v).includes(norm(job.vaccinator)) || nameLike(norm(v), norm(job.vaccinator))],
        ['Eligibility', rows['eligibility'], v => norm(v) === norm(job.eligibility)],
        ['Injection site', rows['injection site'], v => norm(v) === norm(job.site)],
        ['Date of birth', rows['date of birth'], v => longToIso(v) === job.dob],
      ];
      const bad = checks.filter(([, v, ok]) => v != null && !ok(v)).map(([k]) => k);
      const note = document.querySelector('textarea');
      if (note && job.note && !note.value) setValue(note, job.note);
      const btn = [...document.querySelectorAll('button, input[type=submit]')].find(b => /confirm and save/i.test(b.textContent || b.value || ''));
      if (btn && !btn.__psm) {
        btn.__psm = true;
        btn.addEventListener('click', () => set({ stage: 'submitted', submittedAt: Date.now() }), true);
      }
      return { wait: bad.length ? `Check these before saving: ${bad.join(', ')}.` : 'Everything matches the app. Check the page, then press Confirm and save.', bad: bad.length > 0, final: true };
    },
    async unknown(job) {
      if (job.lookup && looksLikeLogin()) return finishLookup(job, { ok: false, error: LOGIN_MSG });
      if (job.lookup) return finishLookup(job, { ok: false, error: `RAVS showed a page the helper doesn't recognise ("${h1() || 'no heading'}"). Check the RAVS tab: you may need to log in, or pick the patient there.` });
      return { wait: 'Your turn on this page. The helper carries on from the next page it recognises.' }; },
  };

  // A patient search stops on the patient's details page: nothing is recorded. The result goes back to the app.
  async function finishLookup(job, result) {
    const st = await state();
    const lookups = st.lookups.filter(x => x.id !== job.id).concat([Object.assign({ id: job.id, at: new Date().toISOString() }, result)]);
    await set({ lookups, queue: st.queue.filter(j => j.id !== job.id), current: null, stage: null });
    message = result.ok ? `Found ${result.patient.name || 'the patient'}. Details sent to the app to confirm.` : 'Patient search stopped. The app shows why.';
    messageBad = !result.ok; lastKey = '';
    const now = await state();
    if (now.queue.length && !now.paused) setTimeout(startNext, 800); else render(now);
    return { done: true };
  }

  /* ---------- main loop ---------- */
  let lastKey = '', busy = false, message = '', messageBad = false;

  async function run() {
    if (busy) return; busy = true;
    try {
      if (step() === 'vaccinator') await saveVaccinators();
      let st = await state();
      // A vaccination was just submitted: decide whether it saved.
      if (st.stage === 'submitted' && st.current) {
        if (step() === 'confirm' || hasError()) {
          if (hasError()) { await set({ stage: null }); message = 'RAVS showed a problem. Fix it and press Confirm and save again.'; messageBad = true; }
        } else if (!/vaccination saved/.test(norm(document.body.innerText))) {
          // Only RAVS's own "Vaccination saved" message counts. Give the page a few seconds to show it.
          if (Date.now() - (st.submittedAt || 0) < 8000) { clearTimeout(run._w); run._w = setTimeout(run, 1000); }
          else { message = 'RAVS moved on without showing "Vaccination saved". Check Records in RAVS for this patient. It stays on To record in the app until you mark it.'; messageBad = true; }
        } else {
          const job = st.queue.find(j => j.id === st.current);
          const cap = st.captured[st.current] || {};
          const done = st.done.concat([{ id: st.current, at: new Date().toISOString(), address: cap.address || '', gp: cap.gp || '', nhs: cap.nhs || '' }]);
          const captured = Object.assign({}, st.captured); delete captured[st.current];
          await set({ done, captured, queue: st.queue.filter(j => j.id !== st.current), current: null, stage: null });
          message = job ? `RAVS says "Vaccination saved" for ${job.given} ${job.surname} (${job.vaccine}). Marked as recorded in the app.` : 'Saved.'; messageBad = false;
          st = await state();
          lastKey = '';
          if (st.queue.length && !st.paused) { await sleep(800); return startNext(); }
        }
        return render(st);
      }
      if (!st.current && st.queue.length && !st.paused) return startNext();
      const job = st.queue.find(j => j.id === st.current);
      if (!job || st.paused) return render(st);
      if (looksLikeLogin()) {
        if (job.lookup) return finishLookup(job, { ok: false, error: LOGIN_MSG });
        message = 'Log in to RAVS. The helper carries on once you are in.'; messageBad = true; return render(st);
      }
      if (st.stage === 'starting') {
        const s0 = step();
        if (!((s0 === 'nhs' && !hasError()) || s0 === 'start')) {
          // Waiting for a new record to open. A search gives up with a reason rather than waiting for ever.
          if (job.lookup && s0 === 'unknown' && Date.now() - (st.startingAt || 0) > 15000) {
            return finishLookup(job, { ok: false, error: `RAVS is showing a page the helper doesn't recognise ("${h1() || 'no heading'}"). Look at the RAVS tab, then search again.` });
          }
          lookupStatus(job, STATUS.start); setTimeout(run, 3000);
          return render(st);
        }
        await set({ stage: null });
      }
      const s = step();
      const key = `${job.id}|${s}|${path()}|${h1()}|${hasError()}`;
      if (key === lastKey) return render(st);
      lastKey = key;
      if (STATUS[s]) lookupStatus(job, STATUS[s]);
      if (job.lookup && hasError()) {
        const err = (document.querySelector('.nhsuk-error-summary, .govuk-error-summary') || {}).innerText || '';
        return finishLookup(job, { ok: false, error: 'RAVS could not find this patient. ' + err.replace(/^there is a problem\s*/i, '').replace(/\s+/g, ' ').trim() });
      }
      if (hasError() && s !== 'confirm') { message = 'RAVS showed a problem on this page. Fix it, then press Continue.'; messageBad = true; return render(st); }
      const res = await H[s](job, st);
      if (res.done) return;
      if (res.wait) { message = res.wait; messageBad = !!res.bad; return render(st); }
      message = `Filled: ${s === 'nhs' ? 'NHS number' : s}`; messageBad = false; render(st);
      if (res.go && !st.paused) {
        await sleep(STEP_DELAY);
        const now = await state();
        if (now.paused || now.current !== job.id) return render(now);
        const b = continueButton(); if (b) b.click();
      }
    } finally { busy = false; }
  }

  async function startNext() {
    const st = await state();
    const next = st.queue[0];
    if (!next) return render(st);
    lastKey = ''; message = `Starting ${next.given || ''} ${next.surname || ''} (${next.vaccine})`; messageBad = false;
    const s = step();
    if (s === 'nhs' && !hasError()) { await set({ current: next.id, stage: null }); busy = false; return run(); }
    // Until the first page of a new record loads, ignore the page that is still showing (it may be the last patient's).
    await set({ current: next.id, stage: 'starting', startingAt: Date.now() });
    const nav = [...document.querySelectorAll('a')].find(a => /record vaccinations/i.test(a.textContent));
    if (nav) nav.click(); else location.href = location.origin + '/record-vaccinations';
    setTimeout(run, 1200);
  }

  /* ---------- floating panel ---------- */
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    .p{font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;background:#fff;color:#14232a;border:2px solid #0a6464;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.18);width:330px;overflow:hidden}
    .h{background:#0a6464;color:#fff;padding:8px 12px;display:flex;align-items:center;gap:8px;font-weight:700}
    .h span{flex:1}.h button{background:transparent;border:0;color:#fff;cursor:pointer;font-size:13px}
    .b{padding:10px 12px;display:grid;gap:8px}.who{font-weight:700}.sub{color:#56676c;font-size:13px}
    .m{padding:8px 10px;border-radius:8px;background:#dcefe2;color:#1d7340}.m.bad{background:#f8dedb;color:#b02a21}.m.final{background:#fbecd2;color:#9a5800}
    .row{display:flex;gap:6px;flex-wrap:wrap}.row button{border:1px solid #d5dfde;background:#f6f8f8;border-radius:7px;padding:5px 9px;cursor:pointer;font:inherit;font-size:13px}
    .row button.pri{background:#0a6464;color:#fff;border-color:#0a6464}.min .b{display:none}
  </style><div class="p"><div class="h"><span>RAVS Helper</span><button id="min">Hide</button></div><div class="b" id="b"></div></div>`;
  (document.body || document.documentElement).appendChild(host);
  root.getElementById('min').onclick = () => { root.querySelector('.p').classList.toggle('min'); root.getElementById('min').textContent = root.querySelector('.p').classList.contains('min') ? 'Show' : 'Hide'; };

  function render(st) {
    const b = root.getElementById('b');
    const job = st.queue.find(j => j.id === st.current);
    const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    host.style.display = '';
    const final = step() === 'confirm' && job;
    b.innerHTML = (job ? `<div><div class="who">${esc(job.surname)}, ${esc(job.given)}</div><div class="sub">${job.lookup ? 'Patient search, nothing is recorded' : `${esc(job.vaccine)} · ${esc(String(job.product || '').replace(/^.*\(([^)]+)\)$/, '$1'))} · batch ${esc(job.batch)}`} · ${st.queue.length} in queue</div></div>`
      : `<div class="sub">${st.queue.length ? st.queue.length + ' waiting' : looksLikeLogin() ? 'Log in to RAVS, then the helper is ready.' : 'Connected and ready. Patient searches and vaccinations from the clinic app appear here.' + (st.keptAliveAt ? ` Kept logged in (last refreshed ${new Date(st.keptAliveAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}).` : '')}</div>`) +
      (message ? `<div class="m ${messageBad ? 'bad' : final ? 'final' : ''}">${esc(message)}</div>` : '') +
      `<div class="row">${st.paused ? '<button class="pri" id="resume">Resume</button>' : (st.queue.length ? '<button id="pause">Pause</button>' : '')}
       ${job ? '<button id="skip">Skip this one</button><button id="refill">Fill this page again</button>' : ''}${st.queue.length ? '<button id="clear">Clear queue</button>' : ''}</div>`;
    const on = (id, fn) => { const el = root.getElementById(id); if (el) el.onclick = fn; };
    on('pause', async () => { await set({ paused: true }); message = 'Paused. Nothing will be filled until you press Resume.'; messageBad = false; render(await state()); });
    on('resume', async () => { await set({ paused: false }); lastKey = ''; message = ''; run(); });
    on('skip', async () => { const s = await state(); await set({ queue: s.queue.filter(j => j.id !== s.current), current: null, stage: null }); message = 'Skipped. It stays on the To record list in the app.'; lastKey = ''; run(); });
    on('refill', () => { lastKey = ''; run(); });
    on('clear', async () => { await set({ queue: [], current: null, stage: null, captured: {} }); message = 'Queue cleared.'; render(await state()); });
  }

  chrome.runtime.onMessage.addListener((msg, _s, reply) => { if (msg && msg.type === 'ping') reply({ login: looksLikeLogin() }); if (msg && msg.type === 'start-next') { lastKey = ''; state().then(st => (st.current ? run() : startNext())); reply({ ok: true }); } });
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.queue) state().then(st => { if (!st.current && st.queue.length && !st.paused) startNext(); else render(st); }); });

  /* ---------- keep RAVS logged in ---------- */
  // While the clinic app is open (7am to 8pm), refresh RAVS after 10 quiet minutes so it doesn't time out mid-clinic.
  // Overnight, or with the app closed, RAVS times out as normal.
  const IDLE_MS = 10 * 60 * 1000;
  let lastActive = Date.now();
  ['pointerdown', 'keydown', 'wheel'].forEach(t => addEventListener(t, () => { lastActive = Date.now(); }, true));
  const stayButton = () => [...document.querySelectorAll('button, a, input[type=submit]')]
    .find(b => /^(stay (signed|logged) in|continue (session|working)|extend (my )?session|keep me (signed|logged) in|i'?m still here)$/.test(norm(b.textContent || b.value)));
  // A page staff could have typed on is fetched in the background instead of reloaded, so nothing they entered is lost.
  const safeToReload = () => !document.querySelector('input[type=radio]:checked, input[type=checkbox]:checked') &&
    ![...document.querySelectorAll('input[type=text], input:not([type]), input[type=number], input[type=search], textarea')].some(el => el.value.trim());
  async function keepAlive() {
    const stay = stayButton();
    if (stay) { stay.click(); lastActive = Date.now(); return set({ keptAliveAt: Date.now() }); }
    if (Date.now() - lastActive < IDLE_MS || looksLikeLogin()) return;
    const hour = new Date().getHours();
    if (hour < 7 || hour >= 20) return;
    const st = await get({ queue: [], current: null, appSeenAt: 0 });
    if (st.current || st.queue.length || Date.now() - st.appSeenAt > 3 * 60 * 1000) return;
    lastActive = Date.now();
    await set({ keptAliveAt: Date.now() });
    if (safeToReload()) location.reload();
    else fetch(location.origin + '/', { credentials: 'include', cache: 'no-store' }).catch(() => {});
  }
  setInterval(keepAlive, 60 * 1000);

  // RAVS may change pages without a full reload, so watch for the URL or heading changing.
  let lastSeen = '';
  new MutationObserver(() => {
    const k = location.href + '|' + h1();
    if (k !== lastSeen) { lastSeen = k; clearTimeout(run._t); run._t = setTimeout(run, 250); }
  }).observe(document.documentElement, { childList: true, subtree: true });
  run();
})();
