// Contexte ISOLÉ. Reçoit les médias captés par inject.js (via postMessage),
// fait défiler ton profil pour tout charger, et déclenche les téléchargements.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sanitize = (s) => s.replace(/[^A-Za-z0-9._-]/g, "_");

let session = null;

function report(kind, text) {
  chrome.runtime.sendMessage({ type: "ecureuil-progress", kind, text }).catch(() => {});
  chrome.storage.local.set({ lastStatus: text });
  console.log("[Écureuil]", text);
}

async function handleItems(items) {
  if (!session) return;
  for (const a of items) {
    if (!a.url || session.done.has(a.code)) {
      if (a.url && session.done.has(a.code)) session.skipped++;
      continue;
    }
    if (session.skipVideos && a.kind === "video") continue;
    session.done.add(a.code); // marqué tôt : évite les doublons de réponses répétées
    const filename = `ecureuil/instagram/${session.account}/${a.date}_${sanitize(a.code)}.${a.ext}`;
    const resp = await chrome.runtime.sendMessage({ type: "download", url: a.url, filename });
    if (resp && resp.ok) {
      session.manifest.push({
        code: a.code,
        date: a.date,
        kind: a.kind,
        caption: a.caption,
        url: a.url,
        file: filename,
      });
      session.copied++;
    }
    report("progress", `${session.copied} téléchargé(s), ${session.skipped} déjà présent(s)…`);
  }
  const obj = {};
  session.done.forEach((c) => (obj[c] = 1));
  chrome.storage.local.set({ ["done:" + session.account]: obj });
}

window.addEventListener("message", (ev) => {
  if (ev.source !== window) return;
  const d = ev.data;
  if (d && d.__ecureuil && Array.isArray(d.items)) handleItems(d.items);
});

async function autoScroll() {
  let lastH = 0;
  let stable = 0;
  for (let i = 0; i < 500 && stable < 4; i++) {
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(1200);
    const h = document.body.scrollHeight;
    if (h === lastH) stable++;
    else {
      stable = 0;
      lastH = h;
    }
  }
}

async function start(opts) {
  if (session) {
    report("status", "Déjà en cours…");
    return;
  }
  const account = sanitize(opts.account || "me");
  const store = (await chrome.storage.local.get("done:" + account))["done:" + account] || {};
  session = {
    account,
    skipVideos: !!opts.skipVideos,
    done: new Set(Object.keys(store)),
    manifest: [],
    copied: 0,
    skipped: 0,
  };

  report("status", "Défilement de ton profil pour tout charger…");
  await autoScroll();
  await sleep(3000); // laisse arriver les dernières réponses

  const json = encodeURIComponent(JSON.stringify(session.manifest, null, 2));
  await chrome.runtime.sendMessage({
    type: "download",
    url: "data:application/json;charset=utf-8," + json,
    filename: `ecureuil/instagram/${account}/manifest.json`,
  });

  report("done", `Terminé : ${session.copied} téléchargé(s), ${session.skipped} déjà présent(s).`);
  session = null;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "start") start(msg.opts || {});
});
