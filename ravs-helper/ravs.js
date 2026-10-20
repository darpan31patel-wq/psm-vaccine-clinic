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
  async function state() { return get({ queue: [], current: null, stage: null, paused: false, captured: {}, done: [] }); }

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
  function fmtNhs(s) { s = String(s || '').replace(/\D/g, ''); return s.length === 10 ? `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}` : s; }
  function todayIso() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

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
    async start() {
      const a = [...document.querySelectorAll('main a, main button')].find(x => /record (a )?vaccination|start/i.test(x.textContent));
      if (a) { a.click(); return { done: true }; }
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
      const want = norm(job.vaccinator);
      if (!want) return { wait: 'Choose the vaccinator. The app has none set for this vaccination.' };
      const r = radioWhere(l => l === want || l.startsWith(want + ' (') || l.includes('(' + want + ')') || l.includes(want));
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
        ['Vaccinator', rows['vaccinator'], v => norm(v).includes(norm(job.vaccinator))],
        ['Eligibility', rows['eligibility'], v => norm(v) === norm(job.eligibility)],
        ['Injection site', rows['injection site'], v => norm(v) === norm(job.site)],
        ['Date of birth', rows['date of birth'], v => longToIso(v) === job.dob],
      ];
      const bad = checks.filter(([, v, ok]) => v != null && !ok(v)).map(([k]) => k);
      const btn = [...document.querySelectorAll('button, input[type=submit]')].find(b => /confirm and save/i.test(b.textContent || b.value || ''));
      if (btn && !btn.__psm) {
        btn.__psm = true;
        btn.addEventListener('click', () => set({ stage: 'submitted', submittedAt: Date.now() }), true);
      }
      return { wait: bad.length ? `Check these before saving: ${bad.join(', ')}.` : 'Everything matches the app. Check the page, then press Confirm and save.', bad: bad.length > 0, final: true };
    },
    async unknown() { return { wait: 'Your turn on this page. The helper carries on from the next page it recognises.' }; },
  };

  /* ---------- main loop ---------- */
  let lastKey = '', busy = false, message = '', messageBad = false;

  async function run() {
    if (busy) return; busy = true;
    try {
      let st = await state();
      // A vaccination was just submitted: decide whether it saved.
      if (st.stage === 'submitted' && st.current) {
        if (step() === 'confirm' || hasError()) {
          if (hasError()) { await set({ stage: null }); message = 'RAVS showed a problem. Fix it and press Confirm and save again.'; messageBad = true; }
        } else {
          const job = st.queue.find(j => j.id === st.current);
          const cap = st.captured[st.current] || {};
          const done = st.done.concat([{ id: st.current, at: new Date().toISOString(), address: cap.address || '', gp: cap.gp || '', nhs: cap.nhs || '' }]);
          const captured = Object.assign({}, st.captured); delete captured[st.current];
          await set({ done, captured, queue: st.queue.filter(j => j.id !== st.current), current: null, stage: null });
          message = job ? `Saved ${job.given} ${job.surname} (${job.vaccine}). The app will mark it as recorded.` : 'Saved.'; messageBad = false;
          st = await state();
          lastKey = '';
          if (st.queue.length && !st.paused) { await sleep(800); return startNext(); }
        }
        return render(st);
      }
      if (!st.current && st.queue.length && !st.paused) return startNext();
      const job = st.queue.find(j => j.id === st.current);
      if (!job || st.paused) return render(st);
      const s = step();
      const key = `${job.id}|${s}|${path()}|${h1()}|${hasError()}`;
      if (key === lastKey) return render(st);
      lastKey = key;
      if (hasError() && s !== 'confirm') { message = 'RAVS showed a problem on this page. Fix it, then press Continue.'; messageBad = true; return render(st); }
      const res = await H[s](job, st);
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
    await set({ current: next.id, stage: null });
    lastKey = ''; message = `Starting ${next.given} ${next.surname} (${next.vaccine})`; messageBad = false;
    const s = step();
    if (s === 'nhs') { busy = false; return run(); }
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
    host.style.display = (st.queue.length || message) ? '' : 'none';
    const final = step() === 'confirm' && job;
    b.innerHTML = (job ? `<div><div class="who">${esc(job.surname)}, ${esc(job.given)}</div><div class="sub">${esc(job.vaccine)} · ${esc(job.product.replace(/^.*\(([^)]+)\)$/, '$1'))} · batch ${esc(job.batch)} · ${st.queue.length} in queue</div></div>`
      : `<div class="sub">${st.queue.length ? st.queue.length + ' waiting' : 'Nothing waiting. Send vaccinations from the To record tab in the app.'}</div>`) +
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

  chrome.runtime.onMessage.addListener((msg, _s, reply) => { if (msg && msg.type === 'start-next') { lastKey = ''; state().then(st => (st.current ? run() : startNext())); reply({ ok: true }); } });
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.queue) state().then(st => { if (!st.current && st.queue.length && !st.paused) startNext(); else render(st); }); });

  // RAVS may change pages without a full reload, so watch for the URL or heading changing.
  let lastSeen = '';
  new MutationObserver(() => {
    const k = location.href + '|' + h1();
    if (k !== lastSeen) { lastSeen = k; clearTimeout(run._t); run._t = setTimeout(run, 250); }
  }).observe(document.documentElement, { childList: true, subtree: true });
  run();
})();
