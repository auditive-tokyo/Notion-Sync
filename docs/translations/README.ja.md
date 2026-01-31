# 📝 NotionSync

<!-- ⚠️ AI-generated translation. Native review needed! -->
<!-- この翻訳はAIによって生成されました。ネイティブスピーカーによるレビューが必要です。 -->

> Notion ワークスペースを GitHub に自動バックアップし、毎日スケジュールされた同期を実行します。

**なぜ？** 開発者は要件、アーキテクチャドキュメント、仕様書を Notion に保存することがよくあります。このツールはそれらをあなたのリポジトリに同期するため、VS Code ですべてを表示できます — 行ったり来たりする必要はありません！

📍 **現在:** 一方向同期（Notion → GitHub）  
🚀 **将来:** 双方向同期（GitHub → Notion）のPRを歓迎します！

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 機能

- 🔄 **自動日次同期** - GitHub Actions が毎日 0:00 UTC に実行
- 📄 **Markdown エクスポート** - Notion ページをクリーンな Markdown ファイルに変換
- 📊 **データベースサポート** - Notion データベースを CSV ファイルとしてエクスポート
- 🖼️ **画像ダウンロード** - 画像をローカルにダウンロードして保存
- 📁 **階層構造** - Notion ページの階層を保持
- 🚀 **手動トリガー** - workflow_dispatch でいつでも同期を実行

## 🚀 クイックスタート

### 1. このテンプレートを使用

緑色の **"Use this template"** ボタンをクリック → **"Create a new repository"**

> 💡 Notion コンテンツを安全に保つために **private** にすることができます！

### 2. Notion API 認証情報を取得

1. [Notion Integrations](https://www.notion.so/my-integrations) に移動
2. "New integration" をクリック
3. 名前を付ける（例：「GitHub Sync」）
4. **Internal Integration Token** をコピー

### 3. Notion ページをインテグレーションと共有

1. 同期したい Notion ページを開く
2. "..." メニュー → "Connections" → インテグレーションを追加
3. URL から **Page ID** をコピー：
   ```
   https://www.notion.so/Your-Page-Title-{PAGE_ID}
                                          ^^^^^^^^
   ```

### 4. GitHub Secrets を設定

フォークしたリポジトリ → Settings → Secrets and variables → Actions

以下のシークレットを追加：

| シークレット名        | 値                                |
| --------------------- | --------------------------------- |
| `NOTION_API_KEY`      | Notion インテグレーショントークン |
| `NOTION_ROOT_PAGE_ID` | 同期したいページ ID               |

### 5. 同期を実行

- **手動**: Actions → "Sync from Notion" → "Run workflow"
- **自動**: 毎日 0:00 UTC に実行

## 📁 出力構造

```
root_page/
├── Your Page Title {page_id}.md
└── Your Page Title/
    ├── Child Page {page_id}.md
    ├── Database {page_id}.csv
    └── images/
        └── downloaded_image.png
```

## ⚙️ 設定

### 環境変数

| 変数                  | デフォルト | 説明                              |
| --------------------- | ---------- | --------------------------------- |
| `NOTION_API_KEY`      | 必須       | Notion インテグレーショントークン |
| `NOTION_ROOT_PAGE_ID` | 必須       | 同期するルートページ ID           |
| `DOWNLOAD_IMAGES`     | `true`     | 画像をローカルにダウンロード      |

### スケジュールのカスタマイズ

`.github/workflows/sync-from-notion.yml` を編集：

```yaml
on:
  schedule:
    - cron: "0 0 * * *" # この cron 式を変更
```

## 🔧 サポートされている Notion ブロック

- ✅ 段落、見出し（H1、H2、H3）
- ✅ 箇条書き＆番号付きリスト
- ✅ チェックボックス付き To-do リスト
- ✅ シンタックスハイライト付きコードブロック
- ✅ 引用＆コールアウト
- ✅ テーブル
- ✅ 画像（ローカルダウンロード付き）
- ✅ ブックマーク＆リンク
- ✅ 区切り線
- ✅ トグルブロック
- ✅ 子ページ（再帰的）
- ✅ データベース（CSV として）

## 🤝 コントリビューション

コントリビューションを歓迎します！お気軽に：

1. リポジトリをフォーク
2. フィーチャーブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更をコミット（`git commit -m 'Add amazing feature'`）
4. ブランチにプッシュ（`git push origin feature/amazing-feature`）
5. Pull Request を開く

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下でライセンスされています - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🙏 謝辞

- [Notion API](https://developers.notion.com/)
- [@notionhq/client](https://github.com/makenotion/notion-sdk-js) - 公式 Notion SDK for JavaScript

---

⭐ 役に立つと思ったら、スターをください！
