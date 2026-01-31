# 📝 NotionSync

<!-- ⚠️ AI-generated translation. Native review needed! -->
<!-- Diese Übersetzung wurde von KI generiert und benötigt eine native Überprüfung. -->

> Sichere deinen Notion-Arbeitsbereich automatisch auf GitHub mit täglich geplanten Synchronisierungen.

**Warum?** Entwickler speichern oft Anforderungen, Architekturdokumente und Spezifikationen in Notion. Dieses Tool synchronisiert sie mit deinem Repository, sodass du alles in VS Code ansehen kannst — kein Hin- und Herwechseln mehr!

📍 **Aktuell:** Einseitige Synchronisierung (Notion → GitHub)  
🚀 **Zukunft:** PRs für bidirektionale Synchronisierung (GitHub → Notion) sind willkommen!

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Funktionen

- 🔄 **Automatische Tägliche Synchronisierung** - GitHub Actions läuft täglich um 0:00 UTC
- 📄 **Markdown-Export** - Konvertiert Notion-Seiten in saubere Markdown-Dateien
- 📊 **Datenbank-Unterstützung** - Exportiert Notion-Datenbanken als CSV-Dateien
- 🖼️ **Bild-Download** - Lädt Bilder herunter und speichert sie lokal
- 📁 **Hierarchische Struktur** - Bewahrt die Hierarchie deiner Notion-Seiten
- 🚀 **Manueller Trigger** - Führe die Synchronisierung jederzeit mit workflow_dispatch aus

## 🚀 Schnellstart

### 1. Diese Vorlage verwenden

Klicke auf den grünen **"Use this template"**-Button → **"Create a new repository"**

> 💡 Du kannst es **privat** machen, um deinen Notion-Inhalt sicher zu halten!

### 2. Notion API-Anmeldedaten erhalten

1. Gehe zu [Notion Integrations](https://www.notion.so/my-integrations)
2. Klicke auf "New integration"
3. Benenne sie (z.B. "GitHub Sync")
4. Kopiere den **Internal Integration Token**

### 3. Teile deine Notion-Seite mit der Integration

1. Öffne deine Notion-Seite, die du synchronisieren möchtest
2. Klicke auf das "..."-Menü → "Connections" → Füge deine Integration hinzu
3. Kopiere die **Page ID** aus der URL:
   ```
   https://www.notion.so/Your-Page-Title-{PAGE_ID}
                                          ^^^^^^^^
   ```

### 4. GitHub Secrets einrichten

Gehe zu deinem geforkten Repository → Settings → Secrets and variables → Actions

Füge diese Secrets hinzu:

| Secret-Name           | Wert                                  |
| --------------------- | ------------------------------------- |
| `NOTION_API_KEY`      | Dein Notion-Integrationstoken         |
| `NOTION_ROOT_PAGE_ID` | Die Seiten-ID, die du synchronisieren möchtest |

### 5. Synchronisierung ausführen

- **Manuell**: Actions → "Sync from Notion" → "Run workflow"
- **Automatisch**: Läuft täglich um 0:00 UTC

## 📁 Ausgabestruktur

```
root_page/
├── Your Page Title {page_id}.md
└── Your Page Title/
    ├── Child Page {page_id}.md
    ├── Database {page_id}.csv
    └── images/
        └── downloaded_image.png
```

## ⚙️ Konfiguration

### Umgebungsvariablen

| Variable              | Standard    | Beschreibung                           |
| --------------------- | ----------- | -------------------------------------- |
| `NOTION_API_KEY`      | Erforderlich | Notion-Integrationstoken              |
| `NOTION_ROOT_PAGE_ID` | Erforderlich | Root-Seiten-ID zum Synchronisieren    |
| `DOWNLOAD_IMAGES`     | `true`      | Bilder lokal herunterladen             |

### Zeitplan anpassen

Bearbeite `.github/workflows/sync-from-notion.yml`:

```yaml
on:
  schedule:
    - cron: "0 0 * * *" # Ändere diesen Cron-Ausdruck
```

## 🔧 Unterstützte Notion-Blöcke

- ✅ Absätze, Überschriften (H1, H2, H3)
- ✅ Aufzählungs- und nummerierte Listen
- ✅ To-Do-Listen mit Kontrollkästchen
- ✅ Codeblöcke mit Syntaxhervorhebung
- ✅ Zitate & Callouts
- ✅ Tabellen
- ✅ Bilder (mit lokalem Download)
- ✅ Lesezeichen & Links
- ✅ Trennlinien
- ✅ Toggle-Blöcke
- ✅ Unterseiten (rekursiv)
- ✅ Datenbanken (als CSV)

## 🤝 Beiträge

Beiträge sind willkommen! Fühle dich frei zu:

1. Repository forken
2. Feature-Branch erstellen (`git checkout -b feature/amazing-feature`)
3. Änderungen committen (`git commit -m 'Add amazing feature'`)
4. Zum Branch pushen (`git push origin feature/amazing-feature`)
5. Pull Request öffnen

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe die [LICENSE](LICENSE)-Datei für Details.

## 🙏 Danksagungen

- [Notion API](https://developers.notion.com/)
- [@notionhq/client](https://github.com/makenotion/notion-sdk-js) - Offizielles Notion SDK für JavaScript

---

⭐ Wenn du dies nützlich findest, gib ihm bitte einen Stern!
