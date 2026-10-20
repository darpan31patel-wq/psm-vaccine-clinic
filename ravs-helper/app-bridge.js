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

  window.addEventListener('message', ev => {
    if (ev.source !== window || !ev.data || !isApp()) return;
    const d = ev.data;
    if (d.psm === 'app-hello') { announce(); sendDone(); sendLookups(); }
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
  });
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.done) sendDone(); if (area === 'local' && ch.lookups) sendLookups();
    const ls = area === 'local' && ch.lookupStatus && ch.lookupStatus.newValue;
    if (ls && isApp()) window.postMessage({ psm: 'ext-lookup-status', id: ls.id, text: ls.text }, '*');
  });
  announce();
  setTimeout(() => { announce(); sendDone(); sendLookups(); }, 1500);
})();
