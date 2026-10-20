// Runs inside the PSM Vaccine Clinic app page. Passes RAVS jobs to the helper and results back to the app.
(function () {
  if (window.__psmBridge) return;
  window.__psmBridge = true;
  const isApp = () => !!document.getElementById('psm-clinic-app');

  function announce() { if (isApp()) window.postMessage({ psm: 'ext-ready', version: chrome.runtime.getManifest().version }, '*'); }
  function sendLookups() {
    if (!isApp()) return;
    chrome.storage.local.get({ lookups: [] }, ({ lookups }) => {
      if (lookups.length) window.postMessage({ psm: 'ext-lookup', results: lookups }, '*');
    });
  }
  function sendDone() {
    if (!isApp()) return;
    chrome.storage.local.get({ done: [] }, ({ done }) => {
      if (done.length) window.postMessage({ psm: 'ext-done', results: done }, '*');
    });
  }

  function sendVaccinators() {
    if (!isApp()) return;
    chrome.storage.local.get({ ravsVaccinators: null }, ({ ravsVaccinators }) => {
      if (ravsVaccinators) window.postMessage({ psm: 'ext-vaccinators', names: ravsVaccinators.names, at: ravsVaccinators.at }, '*');
    });
  }

  function onMessage(ev) {
    if (ev.source !== window || !ev.data || !isApp()) return;
    try { handle(ev.data); } catch (e) {
      // After the helper is updated or reloaded, this copy can no longer reach it until the page is reloaded.
      window.postMessage({ psm: 'ext-error', message: String(e && e.message || e) }, '*');
    }
  }
  // Apps Script writes the app into this frame with document.write, which removes listeners added before it.
  // Adding the same listener again does nothing while it is still attached, so keep re-adding it.
  window.addEventListener('message', onMessage);
  setInterval(() => window.addEventListener('message', onMessage), 500);
  function handle(d) {
    if (d.psm === 'app-hello') { announce(); sendDone(); sendLookups(); sendVaccinators(); }
    // A patient search: goes ahead of waiting vaccinations, but never interrupts one already being filled.
    if (d.psm === 'app-lookup' && d.job && d.job.id) {
      chrome.storage.local.get({ queue: [], current: null }, ({ queue, current }) => {
        const job = Object.assign({}, d.job, { lookup: true, vaccine: 'Patient search' });
        const rest = queue.filter(j => j.id !== job.id && !j.lookup);
        const at = current ? rest.findIndex(j => j.id === current) + 1 : 0;
        rest.splice(at, 0, job);
        const busy = current && current !== job.id && !(queue.find(j => j.id === current) || {}).lookup;
        chrome.storage.local.set({ queue: rest, paused: false }, () => {
          window.postMessage({ psm: 'ext-lookup-started', id: job.id, status: busy ? 'Waiting: the RAVS Helper is filling in a vaccination. The search starts once that one is saved or skipped.' : '' }, '*');
          chrome.runtime.sendMessage({ type: 'open-ravs', focus: false });
        });
      });
    }
    if (d.psm === 'app-show-ravs') chrome.runtime.sendMessage({ type: 'open-ravs', focus: true });
    if (d.psm === 'app-side-by-side') chrome.runtime.sendMessage({ type: 'side-by-side', screen: d.screen }, res => { if (res && !res.ok) window.postMessage({ psm: 'ext-side-by-side-failed', message: res.error }, '*'); });
    if (d.psm === 'app-ravs-status') chrome.runtime.sendMessage({ type: 'ravs-status' }, res => window.postMessage({ psm: 'ext-ravs-status', state: (res && res.state) || 'closed' }, '*'));
    if (d.psm === 'app-lookup-cancel' && d.id) {
      chrome.storage.local.get({ queue: [], current: null }, ({ queue, current }) => {
        chrome.storage.local.set(Object.assign({ queue: queue.filter(j => j.id !== d.id) }, current === d.id ? { current: null, stage: null } : {}));
      });
    }
    if (d.psm === 'app-lookup-ack' && Array.isArray(d.ids)) {
      chrome.storage.local.get({ lookups: [] }, ({ lookups }) => {
        chrome.storage.local.set({ lookups: lookups.filter(x => !d.ids.includes(x.id)) });
      });
    }
    if (d.psm === 'app-queue' && Array.isArray(d.jobs)) {
      chrome.storage.local.get({ queue: [] }, ({ queue }) => {
        const have = new Set(queue.map(j => j.id));
        const add = d.jobs.filter(j => !have.has(j.id));
        chrome.storage.local.set({ queue: queue.concat(add), paused: false }, () => {
          window.postMessage({ psm: 'ext-queued', added: add.length, total: queue.length + add.length }, '*');
          chrome.runtime.sendMessage({ type: 'open-ravs' });
        });
      });
    }
    if (d.psm === 'app-ack' && Array.isArray(d.ids)) {
      chrome.storage.local.get({ done: [] }, ({ done }) => {
        chrome.storage.local.set({ done: done.filter(x => !d.ids.includes(x.id)) });
      });
    }
  }
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.done) sendDone(); if (area === 'local' && ch.lookups) sendLookups(); if (area === 'local' && ch.ravsVaccinators) sendVaccinators();
    const ls = area === 'local' && ch.lookupStatus && ch.lookupStatus.newValue;
    if (ls && isApp()) window.postMessage({ psm: 'ext-lookup-status', id: ls.id, text: ls.text }, '*');
  });
  // Lets the RAVS tab know the clinic app is open, so it keeps RAVS logged in only while it is.
  const seen = () => { if (isApp()) chrome.storage.local.set({ appSeenAt: Date.now() }); };
  seen(); setInterval(seen, 60 * 1000);
  announce();
  setTimeout(() => { announce(); sendDone(); sendLookups(); }, 1500);
})();
