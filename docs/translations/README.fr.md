# 📝 NotionSync

<!-- ⚠️ AI-generated translation. Native review needed! -->
<!-- Cette traduction a été générée par IA et nécessite une révision native. -->

> Sauvegardez automatiquement votre espace de travail Notion sur GitHub avec des synchronisations quotidiennes programmées.

**Pourquoi ?** Les développeurs stockent souvent des exigences, des documents d'architecture et des spécifications dans Notion. Cet outil les synchronise avec votre dépôt afin que vous puissiez tout visualiser dans VS Code — plus besoin de basculer !

📍 **Actuel :** Synchronisation unidirectionnelle (Notion → GitHub)  
🚀 **Futur :** Les PRs pour la synchronisation bidirectionnelle (GitHub → Notion) sont les bienvenues !

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Fonctionnalités

- 🔄 **Synchronisation Quotidienne Automatique** - GitHub Actions s'exécute quotidiennement à 0h00 UTC
- 📄 **Export Markdown** - Convertit les pages Notion en fichiers Markdown propres
- 📊 **Support des Bases de Données** - Exporte les bases de données Notion sous forme de fichiers CSV
- 🖼️ **Téléchargement d'Images** - Télécharge et stocke les images localement
- 📁 **Structure Hiérarchique** - Préserve la hiérarchie de vos pages Notion
- 🚀 **Déclenchement Manuel** - Exécutez la synchronisation à tout moment avec workflow_dispatch

## 🚀 Démarrage Rapide

### 1. Utilisez ce modèle

Cliquez sur le bouton vert **"Use this template"** → **"Create a new repository"**

> 💡 Vous pouvez le rendre **privé** pour garder votre contenu Notion sécurisé !

### 2. Obtenez les identifiants API Notion

1. Allez sur [Notion Integrations](https://www.notion.so/my-integrations)
2. Cliquez sur "New integration"
3. Nommez-la (par ex. "GitHub Sync")
4. Copiez le **Internal Integration Token**

### 3. Partagez votre page Notion avec l'intégration

1. Ouvrez votre page Notion que vous souhaitez synchroniser
2. Cliquez sur le menu "..." → "Connections" → Ajoutez votre intégration
3. Copiez le **Page ID** depuis l'URL :
   ```
   https://www.notion.so/Your-Page-Title-{PAGE_ID}
                                          ^^^^^^^^
   ```

### 4. Configurez les GitHub Secrets

Allez dans votre dépôt forké → Settings → Secrets and variables → Actions

Ajoutez ces secrets :

| Nom du Secret         | Valeur                                       |
| --------------------- | -------------------------------------------- |
| `NOTION_API_KEY`      | Votre token d'intégration Notion             |
| `NOTION_ROOT_PAGE_ID` | L'ID de page que vous souhaitez synchroniser |

### 5. Exécutez la synchronisation

- **Manuel** : Actions → "Sync from Notion" → "Run workflow"
- **Automatique** : S'exécute quotidiennement à 0h00 UTC

## 📁 Structure de Sortie

```
root_page/
├── Your Page Title {page_id}.md
└── Your Page Title/
    ├── Child Page {page_id}.md
    ├── Database {page_id}.csv
    └── images/
        └── downloaded_image.png
```

## ⚙️ Configuration

### Variables d'Environnement

| Variable              | Par Défaut | Description                       |
| --------------------- | ---------- | --------------------------------- |
| `NOTION_API_KEY`      | Requis     | Token d'intégration Notion        |
| `NOTION_ROOT_PAGE_ID` | Requis     | ID de page racine à synchroniser  |
| `DOWNLOAD_IMAGES`     | `true`     | Télécharger les images localement |

### Personnaliser le Planning

Modifiez `.github/workflows/sync-from-notion.yml` :

```yaml
on:
  schedule:
    - cron: "0 0 * * *" # Changez cette expression cron
```

## 🔧 Blocs Notion Supportés

- ✅ Paragraphes, Titres (H1, H2, H3)
- ✅ Listes à puces et numérotées
- ✅ Listes de tâches avec cases à cocher
- ✅ Blocs de code avec coloration syntaxique
- ✅ Citations et Callouts
- ✅ Tableaux
- ✅ Images (avec téléchargement local)
- ✅ Signets et Liens
- ✅ Séparateurs
- ✅ Blocs déroulants
- ✅ Pages enfants (récursif)
- ✅ Bases de données (en CSV)

## 🤝 Contributions

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Forker le dépôt
2. Créer votre branche de fonctionnalité (`git checkout -b feature/amazing-feature`)
3. Commiter vos changements (`git commit -m 'Add amazing feature'`)
4. Pousser vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT - consultez le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- [Notion API](https://developers.notion.com/)
- [@notionhq/client](https://github.com/makenotion/notion-sdk-js) - SDK officiel Notion pour JavaScript

---

⭐ Si vous trouvez cela utile, donnez-lui une étoile !
