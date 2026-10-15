// S'exécute dans le contexte PAGE (world MAIN), au plus tôt. Observe les réponses
// JSON que l'app Instagram récupère elle-même (fetch + XHR) et en extrait les
// médias, qu'il poste au content script. On ne force aucun endpoint : on lit
// seulement ce que la page charge déjà quand tu fais défiler ton profil.

(function () {
  const send = (items) => {
    if (items && items.length) {
      console.log("[Écureuil/inject] " + items.length + " média(s) capté(s)");
      window.postMessage({ __ecureuil: true, items }, "*");
    }
  };

  // Instagram sert souvent son JSON en content-type « text/javascript », parfois
  // préfixé par « for (;;); » (anti-hijack). On ignore donc le content-type et on
  // tente de parser tout ce qui ressemble à du JSON.
  function tryParse(text) {
    if (typeof text !== "string" || text.length < 2) return null;
    let t = text;
    if (t.startsWith("for (;;);")) t = t.slice(9);
    const c = t.trimStart()[0];
    if (c !== "{" && c !== "[") return null;
    try {
      return JSON.parse(t);
    } catch (e) {
      return null;
    }
  }

  function bestImg(node) {
    if (node.display_resources && node.display_resources.length) {
      const b = node.display_resources.reduce((a, c) =>
        (c.config_width || 0) > (a.config_width || 0) ? c : a
      );
      return b.src || node.display_url || null;
    }
    return node.display_url || null;
  }

  // Forme « GraphQL web » : node.shortcode, display_url/display_resources,
  // edge_sidecar_to_children, is_video/video_url, edge_media_to_caption.
  function pushA(node, out) {
    const code = node.shortcode;
    const ts = node.taken_at_timestamp || null;
    let caption = null;
    try {
      caption = node.edge_media_to_caption.edges[0].node.text;
    } catch (e) {}
    const date = ts ? new Date(ts * 1000).toISOString().slice(0, 10) : "undated";
    let children = [node];
    if (node.edge_sidecar_to_children && node.edge_sidecar_to_children.edges) {
      children = node.edge_sidecar_to_children.edges.map((e) => e.node);
    }
    children.forEach((c, i) => {
      const suffix = children.length > 1 ? `_${i + 1}` : "";
      if (c.is_video && c.video_url) {
        out.push({ code: code + suffix, date, caption, url: c.video_url, ext: "mp4", kind: "video" });
      } else {
        const u = bestImg(c);
        if (u) out.push({ code: code + suffix, date, caption, url: u, ext: "jpg", kind: "image" });
      }
    });
  }

  // Forme « api/v1 » : node.code, image_versions2.candidates, video_versions,
  // carousel_media, caption.text, taken_at.
  function pushB(node, out) {
    const code = node.code;
    const ts = node.taken_at || null;
    const caption = node.caption && node.caption.text ? node.caption.text : null;
    const date = ts ? new Date(ts * 1000).toISOString().slice(0, 10) : "undated";
    const carousel = node.carousel_media && node.carousel_media.length;
    const nodes = carousel ? node.carousel_media : [node];
    nodes.forEach((n, i) => {
      const suffix = carousel ? `_${i + 1}` : "";
      if (n.video_versions && n.video_versions.length) {
        out.push({ code: code + suffix, date, caption, url: n.video_versions[0].url, ext: "mp4", kind: "video" });
      } else if (n.image_versions2 && n.image_versions2.candidates && n.image_versions2.candidates.length) {
        const best = n.image_versions2.candidates.reduce((a, c) =>
          (c.width || 0) > (a.width || 0) ? c : a
        );
        out.push({ code: code + suffix, date, caption, url: best.url, ext: "jpg", kind: "image" });
      }
    });
  }

  function harvest(root) {
    const out = [];
    (function walk(o) {
      if (!o || typeof o !== "object") return;
      if (Array.isArray(o)) {
        o.forEach(walk);
        return;
      }
      if (o.shortcode && (o.display_url || o.display_resources || o.edge_sidecar_to_children)) {
        pushA(o, out);
        return; // post traité : ne pas descendre dans ses enfants
      }
      if (o.code && (o.image_versions2 || o.video_versions || o.carousel_media)) {
        pushB(o, out);
        return;
      }
      for (const k in o) walk(o[k]);
    })(root);
    return out;
  }

  const origFetch = window.fetch;
  window.fetch = function () {
    return origFetch.apply(this, arguments).then((res) => {
      try {
        res
          .clone()
          .text()
          .then((t) => {
            const j = tryParse(t);
            if (j) send(harvest(j));
          })
          .catch(() => {});
      } catch (e) {}
      return res;
    });
  };

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener("load", function () {
      try {
        let text = null;
        try {
          if (this.responseType === "" || this.responseType === "text") text = this.responseText;
        } catch (e) {}
        if (text) {
          const j = tryParse(text);
          if (j) send(harvest(j));
        } else if (this.response && typeof this.response === "object") {
          send(harvest(this.response));
        }
      } catch (e) {}
    });
    return origSend.apply(this, arguments);
  };
})();
