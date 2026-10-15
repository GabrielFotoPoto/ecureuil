# Spécification — Écureuil (extension Chrome)

## Objectif

Permettre à un utilisateur de **sauvegarder en local ses propres médias
Instagram** (photos en priorité, vidéos accessoirement), pour un **usage
strictement privé**, directement depuis son navigateur connecté.

## Cadre (usage privé)

- Télécharger ses propres contenus, ou des contenus publics, pour un usage
  **personnel** relève de la copie privée (en droit français, art. L122-5 CPI) ;
  l'usage strictement domestique échappe par ailleurs au RGPD.
- La **ligne rouge est la rediffusion** : republier ou exploiter publiquement les
  contenus récupérés exige l'autorisation de leurs auteurs. Le popup affiche un
  rappel que l'utilisateur doit accepter avant de lancer une sauvegarde.
- **Pas de contournement** : l'extension n'usurpe aucun client et ne force aucun
  endpoint ; elle lit uniquement ce que la page charge déjà dans la session de
  l'utilisateur (requêtes *same-origin*). Elle n'accède pas à des contenus privés
  d'autrui.

## Principe retenu

Plutôt que de reproduire des endpoints Instagram (fragiles, à identifiants
tournants) depuis un programme externe, l'extension **observe passivement** les
réponses que l'application Instagram récupère elle-même pendant que l'utilisateur
fait défiler son profil, et en extrait les médias. C'est robuste (indépendant de
l'endpoint exact) et déontologiquement net (le navigateur fait ce qu'il fait).

## Architecture (Manifest V3)

- **`inject.js`** — injecté dans le contexte *page* (`world: MAIN`,
  `document_start`). Remplace `window.fetch` et `XMLHttpRequest.send` par des
  enrobages qui, sur chaque réponse, tentent un `JSON.parse` (sans se fier au
  *content-type* — Instagram sert souvent du JSON en `text/javascript`, parfois
  préfixé `for (;;);`) puis parcourent récursivement l'objet pour en extraire les
  nœuds médias. Deux formes reconnues : « GraphQL web » (`shortcode`,
  `display_url`/`display_resources`, `edge_sidecar_to_children`) et « api/v1 »
  (`code`, `image_versions2.candidates`, `video_versions`, `carousel_media`).
  Les médias trouvés sont transmis par `window.postMessage`.
- **`content.js`** — contexte isolé. Reçoit les médias, **déduplique** (clé =
  code + indice de carrousel), fait **défiler le profil automatiquement** pour
  déclencher le chargement de toutes les publications, et demande chaque
  téléchargement au service worker. Écrit un `manifest.json` récapitulatif.
  Maintient l'index de reprise dans `chrome.storage.local`.
- **`background.js`** — service worker. Enregistre chaque fichier via
  `chrome.downloads` (`conflictAction: uniquify`).
- **`popup.html` / `popup.js`** — acceptation de l'usage privé, nom de dossier,
  option « images seulement », bouton de lancement, affichage du statut.

## Sortie

```
Téléchargements/ecureuil/instagram/<compte>/
  AAAA-MM-JJ_<code>.jpg          # photo (≈ original, Instagram stocke en ~1080 px)
  AAAA-MM-JJ_<code>_2.jpg        # élément de carrousel
  manifest.json                  # code, date, type, légende, URL, fichier
```

Reprise : la clé de chaque média est mémorisée ; relancer ne retélécharge que le
nouveau.

## Permissions

- `downloads` : enregistrer les fichiers.
- `storage` : index de reprise et préférences.
- `host_permissions: https://www.instagram.com/*` : injecter les scripts sur le
  site.

## Limites assumées

- **Vidéos** : la grille de profil n'expose souvent que l'image de la vidéo ;
  récupérer le `.mp4` en pleine résolution demanderait d'ouvrir chaque
  publication (évolution possible).
- **Fragilité** : outil non officiel ; un changement du format des réponses
  d'Instagram peut casser l'extraction. Un log `[Écureuil/inject]` et le statut
  du popup aident au diagnostic.

## Évolutions possibles

- Vidéos en pleine résolution (ouverture de chaque publication).
- Autres réseaux (X, TikTok) par la même technique de capture passive.
- Export d'un dossier horodaté / fichiers annexes par média plutôt qu'un manifest
  unique.
