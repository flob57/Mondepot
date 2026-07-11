# DepotDash

Application locale-first de suivi du temps de travail, conduite, carburant, heures supplémentaires et congés.

## Déploiement Cloudflare Pages

- Commande de build : `npm run build`
- Dossier de sortie : `dist`
- Répertoire racine : `/`

## Important

La V1 fonctionne immédiatement dans le navigateur grâce à `localStorage`.
Les liens Notion saisis dans Paramètres sont enregistrés localement et servent de raccourcis.
Une synchronisation réelle avec Notion nécessitera ultérieurement un Worker sécurisé et un secret d'intégration.
