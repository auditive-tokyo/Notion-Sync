# 📝 NotionSync

<!-- ⚠️ AI-generated translation. Native review needed! -->
<!-- 此翻译由AI生成，需要母语者审核。 -->

> 自动备份您的 Notion 工作区到 GitHub，每日自动同步。

**为什么？** 开发者经常在 Notion 中存储需求、架构文档和规范。此工具将它们同步到您的仓库，以便您可以在 VS Code 中查看所有内容 — 无需来回切换！

📍 **当前:** 单向同步（Notion → GitHub）  
🚀 **未来:** 欢迎提交双向同步（GitHub → Notion）的 PR！

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 功能

- 🔄 **自动每日同步** - GitHub Actions 在每天 0:00 UTC 运行
- 📄 **Markdown 导出** - 将 Notion 页面转换为清晰的 Markdown 文件
- 📊 **数据库支持** - 将 Notion 数据库导出为 CSV 文件
- 🖼️ **图片下载** - 下载并本地存储图片
- 📁 **层次结构** - 保留您的 Notion 页面层次结构
- 🚀 **手动触发** - 随时使用 workflow_dispatch 运行同步

## 🚀 快速开始

### 1. 使用此模板

点击绿色的 **"Use this template"** 按钮 → **"Create a new repository"**

> 💡 您可以将其设为 **private** 以保护您的 Notion 内容安全！

### 2. 获取 Notion API 凭证

1. 前往 [Notion Integrations](https://www.notion.so/my-integrations)
2. 点击 "New integration"
3. 命名（例如："GitHub Sync"）
4. 复制 **Internal Integration Token**

### 3. 与集成共享您的 Notion 页面

1. 打开您想要同步的 Notion 页面
2. 点击 "..." 菜单 → "Connections" → 添加您的集成
3. 从 URL 复制 **Page ID**：
   ```
   https://www.notion.so/Your-Page-Title-{PAGE_ID}
                                          ^^^^^^^^
   ```

### 4. 设置 GitHub Secrets

前往您的 forked 仓库 → Settings → Secrets and variables → Actions

添加这些 secrets：

| Secret 名称           | 值                   |
| --------------------- | -------------------- |
| `NOTION_API_KEY`      | 您的 Notion 集成令牌 |
| `NOTION_ROOT_PAGE_ID` | 您想要同步的页面 ID  |

### 5. 运行同步

- **手动**: Actions → "Sync from Notion" → "Run workflow"
- **自动**: 每天 0:00 UTC 运行

## 📁 输出结构

```
root_page/
├── Your Page Title {page_id}.md
└── Your Page Title/
    ├── Child Page {page_id}.md
    ├── Database {page_id}.csv
    └── images/
        └── downloaded_image.png
```

## ⚙️ 配置

### 环境变量

| 变量                  | 默认值 | 描述              |
| --------------------- | ------ | ----------------- |
| `NOTION_API_KEY`      | 必需   | Notion 集成令牌   |
| `NOTION_ROOT_PAGE_ID` | 必需   | 要同步的根页面 ID |
| `DOWNLOAD_IMAGES`     | `true` | 本地下载图片      |

### 自定义计划

编辑 `.github/workflows/sync-from-notion.yml`：

```yaml
on:
  schedule:
    - cron: "0 0 * * *" # 更改此 cron 表达式
```

## 🔧 支持的 Notion 块

- ✅ 段落、标题（H1、H2、H3）
- ✅ 项目符号和编号列表
- ✅ 带复选框的待办事项列表
- ✅ 带语法高亮的代码块
- ✅ 引用和标注
- ✅ 表格
- ✅ 图片（带本地下载）
- ✅ 书签和链接
- ✅ 分隔线
- ✅ 切换块
- ✅ 子页面（递归）
- ✅ 数据库（作为 CSV）

## 🤝 贡献

欢迎贡献！请随意：

1. Fork 仓库
2. 创建您的功能分支（`git checkout -b feature/amazing-feature`）
3. 提交您的更改（`git commit -m 'Add amazing feature'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 打开 Pull Request

## 📄 许可证

此项目根据 MIT 许可证授权 - 详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [Notion API](https://developers.notion.com/)
- [@notionhq/client](https://github.com/makenotion/notion-sdk-js) - Notion SDK for JavaScript 官方版

---

⭐ 如果您觉得有用，请给个星！
