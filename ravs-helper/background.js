// Opens (or reuses) a RAVS tab when the app sends work. Patient searches run in the background (focus: false) so the desk stays on the app.
const RAVS_URLS = ['https://ravs.england.nhs.uk/*', 'https://www.ravs.england.nhs.uk/*'];
const START = 'https://www.ravs.england.nhs.uk/';

// Puts the app on the left half of the screen and RAVS on the right half.
async function sideBySide(appTab, screen) {
  const half = Math.floor(screen.width / 2), box = { top: screen.top, height: screen.height, width: half };
  const place = async (windowId, left) => {
    const w = await chrome.windows.get(windowId);
    if (w.state !== 'normal') { await chrome.windows.update(windowId, { state: 'normal' }); await new Promise(r => setTimeout(r, 700)); }
    await chrome.windows.update(windowId, Object.assign({ left, focused: true }, box));
  };
  const tabs = await chrome.tabs.query({ url: RAVS_URLS });
  const ravs = tabs.find(t => t.windowId !== appTab.windowId) || tabs[0];
  await place(appTab.windowId, screen.left);
  if (!ravs) return chrome.windows.create(Object.assign({ url: START, left: screen.left + half, focused: true }, box));
  if (ravs.windowId === appTab.windowId) await chrome.windows.create(Object.assign({ tabId: ravs.id, left: screen.left + half, focused: true }, box));
  else { await chrome.tabs.update(ravs.id, { active: true }); await place(ravs.windowId, screen.left + half); }
  chrome.tabs.sendMessage(ravs.id, { type: 'start-next' }).catch(e => { if (/Receiving end does not exist/i.test(String(e && e.message))) chrome.tabs.reload(ravs.id); });
}

// The clinic app's address. The helper links itself to the first copy of the app it sees and from then on only
// passes patient details to that one, never to another page hosted by Google.
const APP_URL = /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+\/|macros\/)s\/([\w-]+)\/exec(?:[?#/]|$)/;

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg && msg.type === 'check-app') {
    const m = APP_URL.exec((sender.tab && sender.tab.url) || '');
    if (!m) { reply({ ok: false }); return; }
    chrome.storage.local.get({ appId: '' }, ({ appId }) => {
      if (!appId) chrome.storage.local.set({ appId: m[1] }, () => reply({ ok: true }));
      else if (appId === m[1]) reply({ ok: true });
      else reply({ ok: false, why: 'This RAVS Helper is linked to a different copy of the clinic app. To link it to this one, remove the helper in chrome://extensions and load it again.' });
    });
    return true;
  }
  if (msg && msg.type === 'side-by-side' && sender.tab) {
    // If the windows can't be placed (an unusual screen layout), fall back to showing the RAVS tab.
    sideBySide(sender.tab, msg.screen).then(() => reply({ ok: true }), e => { console.warn(e); showRavs(true); reply({ ok: false, error: String(e && e.message || e) }); });
    return true;
  }
  // For the RAVS button in the app: closed, reload (helper not running in the tab), login or ready.
  if (msg && msg.type === 'ravs-status') {
    chrome.tabs.query({ url: RAVS_URLS }).then(async tabs => {
      if (!tabs.length) return reply({ state: 'closed' });
      let state = 'reload';
      for (const t of tabs) {
        const r = await chrome.tabs.sendMessage(t.id, { type: 'ping' }).catch(() => null);
        if (r && r.login) state = state === 'ready' ? state : 'login';
        else if (r) state = 'ready';
      }
      reply({ state });
    });
    return true;
  }
  if (msg && msg.type === 'open-ravs') { showRavs(msg.focus !== false).then(() => reply({ ok: true })); return true; }
});

function showRavs(focus) {
  return chrome.tabs.query({ url: RAVS_URLS }).then(tabs => {
    if (tabs.length) {
      const t = tabs[0];
      if (focus) {
        chrome.tabs.update(t.id, { active: true });
        chrome.windows.update(t.windowId, { focused: true });
      }
      chrome.tabs.sendMessage(t.id, { type: 'start-next' }).catch(e => {
        // The helper isn't running in that tab yet (it was open before the helper was installed or updated): reload it so it starts.
        if (/Receiving end does not exist/i.test(String(e && e.message))) chrome.tabs.reload(t.id);
      });
    } else {
      chrome.tabs.create({ url: START, active: focus });
    }
  });
}
