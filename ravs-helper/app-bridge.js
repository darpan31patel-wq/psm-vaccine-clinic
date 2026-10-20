// Runs inside the PSM Vaccine Clinic app page. Passes RAVS jobs to the helper and results back to the app.
(function () {
  if (window.__psmBridge) return;
  window.__psmBridge = true;
  const isApp = () => !!document.getElementById('psm-clinic-app');

  function announce() { if (isApp()) window.postMessage({ psm: 'ext-ready', version: chrome.runtime.getManifest().version }, '*'); }
  function sendDone() {
    if (!isApp()) return;
    chrome.storage.local.get({ done: [] }, ({ done }) => {
      if (done.length) window.postMessage({ psm: 'ext-done', results: done }, '*');
    });
  }

  window.addEventListener('message', ev => {
    if (ev.source !== window || !ev.data || !isApp()) return;
    const d = ev.data;
    if (d.psm === 'app-hello') { announce(); sendDone(); }
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
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.done) sendDone(); });
  announce();
  setTimeout(() => { announce(); sendDone(); }, 1500);
})();
