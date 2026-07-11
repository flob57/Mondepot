# Déploiement rapide

## 1. GitHub

Créez un dépôt vide, puis copiez **le contenu de ce dossier à la racine** du dépôt.

## 2. Cloudflare Pages

- Framework preset : Vite
- Build command : `npm run build`
- Build output directory : `dist`
- Root directory : `/`
- Version Node recommandée : 20 ou 22

## 3. Première ouverture

1. Ouvrez **Paramètres**.
2. Indiquez le compteur initial d’heures supplémentaires.
3. Indiquez les soldes de congés payés N-1 et N.
4. Ajustez la liste des véhicules.
5. Collez les liens des bases Notion utiles.
6. Enregistrez.

## Données

La version initiale stocke les données dans le navigateur (`localStorage`).
Elles restent après fermeture ou actualisation sur le même appareil et le même navigateur.

Les liens Notion sont enregistrés comme raccourcis. Une synchronisation réelle en lecture/écriture demandera ultérieurement un Worker Cloudflare sécurisé et une intégration Notion ; les liens seuls ne permettent pas à un site public de lire une base privée.
