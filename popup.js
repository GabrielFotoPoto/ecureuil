const $ = (id) => document.getElementById(id);

function updateBtn() {
  $("start").disabled = !$("accept").checked;
}

async function init() {
  const { accepted, lastStatus } = await chrome.storage.local.get([
    "accepted",
    "lastStatus",
  ]);
  $("accept").checked = !!accepted;
  if (lastStatus) $("status").textContent = lastStatus;
  updateBtn();
}

$("accept").addEventListener("change", async () => {
  await chrome.storage.local.set({ accepted: $("accept").checked });
  updateBtn();
});

$("start").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/www\.instagram\.com\//.test(tab.url || "")) {
    $("status").textContent = "Ouvre d'abord ton profil sur www.instagram.com.";
    return;
  }
  const opts = {
    account: $("account").value.trim() || "me",
    skipVideos: $("skipv").checked,
  };
  $("status").textContent = "Lancement…";
  chrome.tabs.sendMessage(tab.id, { type: "start", opts });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "ecureuil-progress") $("status").textContent = msg.text;
});

init();
