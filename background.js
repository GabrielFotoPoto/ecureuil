// Service worker : seul endroit d'où déclencher les téléchargements.
// Le content script lui envoie chaque média {url, filename} à enregistrer.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "download") {
    chrome.downloads
      .download({
        url: msg.url,
        filename: msg.filename,
        conflictAction: "uniquify",
        saveAs: false,
      })
      .then((id) => sendResponse({ ok: true, id }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // réponse asynchrone
  }
});
