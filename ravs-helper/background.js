// Opens (or reuses) a RAVS tab when the app sends work. Patient searches run in the background (focus: false) so the desk stays on the app.
const RAVS_URLS = ['https://ravs.england.nhs.uk/*', 'https://www.ravs.england.nhs.uk/*'];
const START = 'https://ravs.england.nhs.uk/record-vaccinations';

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
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
  if (msg && msg.type === 'open-ravs') {
    chrome.tabs.query({ url: RAVS_URLS }).then(tabs => {
      if (tabs.length) {
        const t = tabs[0];
        if (msg.focus !== false) {
          chrome.tabs.update(t.id, { active: true });
          chrome.windows.update(t.windowId, { focused: true });
        }
        chrome.tabs.sendMessage(t.id, { type: 'start-next' }).catch(e => {
          // The helper isn't running in that tab yet (it was open before the helper was installed or updated): reload it so it starts.
          if (/Receiving end does not exist/i.test(String(e && e.message))) chrome.tabs.reload(t.id);
        });
      } else {
        chrome.tabs.create({ url: START, active: msg.focus !== false });
      }
      reply({ ok: true });
    });
    return true;
  }
});
