# 🐿️ Écureuil

Extension Chrome pour **sauvegarder localement vos propres médias Instagram**,
pour un **usage privé**. Elle s'exécute dans votre session déjà connectée et
récupère vos publications au fil du défilement de votre profil.

> **Usage privé.** Les contenus récupérés restent protégés par le droit d'auteur
> de leurs auteurs. Leur **rediffusion ou exploitation publique est interdite**
> sans autorisation. Écureuil est fait pour sauvegarder **votre** compte ; il
> n'accède pas à des contenus privés d'autrui.

## Pourquoi cette approche

- **Pas de cookie à extraire, pas de mot de passe** : l'extension est *dans*
  votre session Chrome.
- **Aucune usurpation, aucun contournement** : elle lit seulement les réponses
  que la page Instagram récupère **déjà** quand vous faites défiler votre profil
  (requêtes *same-origin*). C'est votre navigateur qui fait ce qu'il fait.
- Donc : ni l'**App-Bound Encryption** de Chrome, ni les murs de l'API privée ne
  sont un obstacle.

## Installation (non empaquetée)

1. Ouvrez `chrome://extensions`.
2. Activez le **Mode développeur** (coin supérieur droit).
3. **Charger l'extension non empaquetée** → sélectionnez ce dossier.

## Utilisation

1. Ouvrez **votre profil** sur `https://www.instagram.com/` (connecté).
2. Cliquez l'icône Écureuil, cochez l'usage privé, éventuellement « Images
   seulement », donnez un nom de dossier, puis **Sauvegarder mon compte**.
3. La page défile automatiquement pour tout charger. Les médias arrivent dans
   `Téléchargements/ecureuil/instagram/<compte>/`, nommés
   `AAAA-MM-JJ_<code>.<ext>`, avec un `manifest.json` (légendes, dates, types,
   URLs). Laissez l'onglet au premier plan pendant l'opération.

Relancer ne re-télécharge pas l'existant (index de reprise dans `chrome.storage`).

## Fonctionnement

- `inject.js` (contexte page) observe `fetch` et `XMLHttpRequest`, repère les
  réponses JSON contenant des médias et les transmet.
- `content.js` fait défiler le profil, déduplique, et déclenche les
  téléchargements ; il écrit le `manifest.json` final.
- `background.js` enregistre chaque fichier via l'API `chrome.downloads`.

## Portée & limites

- Conçu pour **votre** compte Instagram. Ne rediffusez pas les contenus récupérés.
- Les photos Instagram étant stockées en ~1080 px, les URLs récupérées sont, pour
  les images, l'équivalent de l'original. Les vidéos en pleine résolution
  nécessiteraient d'ouvrir chaque publication (évolution possible).
- Outil non officiel : si Instagram modifie ses réponses, l'extension peut
  casser. Le statut du popup (et la console de la page) indiquent toute erreur.

## Développement

Développé avec l'assistance de l'IA **Claude** (Anthropic) : conception et
génération du code. Les choix, la validation et les tests restent sous la
responsabilité de l'auteur du dépôt.

## Licence

[MIT](LICENSE).
