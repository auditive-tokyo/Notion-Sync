[![Open Source Love](https://firstcontributions.github.io/open-source-badges/badges/open-source-v1/open-source.svg)](https://github.com/firstcontributions/open-source-badges)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

#### Read this in other languages

<kbd>[<img title="日本語" alt="日本語" src="https://cdn.jsdelivr.net/gh/hampusborgos/country-flags@main/svg/jp.svg" width="22">](docs/translations/README.ja.md)</kbd>
<kbd>[<img title="中文 (Simplified)" alt="中文 (Simplified)" src="https://cdn.jsdelivr.net/gh/hampusborgos/country-flags@main/svg/cn.svg" width="22">](docs/translations/README.zh-cn.md)</kbd>
<kbd>[<img title="Español" alt="Español" src="https://cdn.jsdelivr.net/gh/hampusborgos/country-flags@main/svg/es.svg" width="22">](docs/translations/README.es.md)</kbd>
<kbd>[<img title="Français" alt="Français" src="https://cdn.jsdelivr.net/gh/hampusborgos/country-flags@main/svg/fr.svg" width="22">](docs/translations/README.fr.md)</kbd>
<kbd>[<img title="Deutsch" alt="Deutsch" src="https://cdn.jsdelivr.net/gh/hampusborgos/country-flags@main/svg/de.svg" width="22">](docs/translations/README.de.md)</kbd>

# 📝 NotionSync

> Automatically backup your Notion workspace to GitHub with daily scheduled syncs.

**Why?** Developers often store requirements, architecture docs, and specs in Notion. This tool syncs them to your repo so you can view everything in VS Code — no more switching back and forth!

📍 **Current:** One-way sync (Notion → GitHub)  
🚀 **Future:** PRs for two-way sync (GitHub → Notion) are welcome!

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🔄 **Automatic Daily Sync** - GitHub Actions runs daily at 0:00 UTC
- 📄 **Markdown Export** - Converts Notion pages to clean Markdown files
- 📊 **Database Support** - Exports Notion databases as CSV files
- 🖼️ **Image Download** - Downloads and stores images locally
- 📁 **Hierarchical Structure** - Preserves your Notion page hierarchy
- 🚀 **Manual Trigger** - Run sync anytime with workflow_dispatch

## 🎯 Demo

See the actual Notion page being synced and its output:

| Source | Output |
|--------|--------|
| [📘 Demo Notion Page](https://slime-form-23b.notion.site/Notion-Sync-Demo-2ecb9a687adc801dad71fa43a6416020) | [📁 Synced Files](root_page/) |

## 🚀 Quick Start

### 1. Use this template

Click the green **"Use this template"** button → **"Create a new repository"**

> 💡 You can make it **private** to keep your Notion content secure!

### 2. Get Notion API credentials

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it (e.g., "GitHub Sync")
4. Copy the **Internal Integration Token**

### 3. Share your Notion page with the integration

1. Open your Notion page you want to sync
2. Click "..." menu → "Connections" → Add your integration
3. Copy the **Page ID** from the URL:
   ```
   https://www.notion.so/Your-Page-Title-{PAGE_ID}
                                          ^^^^^^^^
   ```

### 4. Set up GitHub Secrets

Go to your forked repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name           | Value                         |
| --------------------- | ----------------------------- |
| `NOTION_API_KEY`      | Your Notion integration token |
| `NOTION_ROOT_PAGE_ID` | The page ID you want to sync  |

### 5. Run the sync

- **Manual**: Go to Actions → "Sync from Notion" → "Run workflow"
- **Automatic**: Runs daily at 0:00 UTC

## 📁 Output Structure

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

### Environment Variables

| Variable              | Default  | Description              |
| --------------------- | -------- | ------------------------ |
| `NOTION_API_KEY`      | Required | Notion integration token |
| `NOTION_ROOT_PAGE_ID` | Required | Root page ID to sync     |
| `DOWNLOAD_IMAGES`     | `true`   | Download images locally  |

### Customize Schedule

Edit `.github/workflows/sync-from-notion.yml`:

```yaml
on:
  schedule:
    - cron: "0 0 * * *" # Change this cron expression
```

## 🔧 Supported Notion Blocks

- ✅ Paragraphs, Headings (H1, H2, H3)
- ✅ Bulleted & Numbered lists
- ✅ To-do lists with checkboxes
- ✅ Code blocks with syntax highlighting
- ✅ Quotes & Callouts
- ✅ Tables
- ✅ Images (with local download)
- ✅ Bookmarks & Links
- ✅ Dividers
- ✅ Toggle blocks
- ✅ Child pages (recursive)
- ✅ Databases (as CSV)

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Notion API](https://developers.notion.com/)
- [@notionhq/client](https://github.com/makenotion/notion-sdk-js) - Official Notion SDK for JavaScript

---

⭐ If you find this useful, please give it a star!
