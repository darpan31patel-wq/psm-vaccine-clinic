// Opens (or reuses) a RAVS tab when the app sends work.
const RAVS_URLS = ['https://ravs.england.nhs.uk/*', 'https://www.ravs.england.nhs.uk/*'];
const START = 'https://www.ravs.england.nhs.uk/record-vaccinations';

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg && msg.type === 'open-ravs') {
    chrome.tabs.query({ url: RAVS_URLS }).then(tabs => {
      if (tabs.length) {
        const t = tabs[0];
        chrome.tabs.update(t.id, { active: true });
        chrome.windows.update(t.windowId, { focused: true });
        chrome.tabs.sendMessage(t.id, { type: 'start-next' }).catch(e => {
          // Only reload when the helper isn't running in that tab (for example, the tab was open before it was installed).
          if (/Receiving end does not exist/i.test(String(e && e.message))) chrome.tabs.update(t.id, { url: START });
        });
      } else {
        chrome.tabs.create({ url: START });
      }
      reply({ ok: true });
    });
    return true;
  }
});
