/**
 * ローカルMarkdownをNotionに同期するスクリプト
 * エントリーポイント
 */
import "dotenv/config";
import { syncMarkdownToNotion } from "./vscode-client.js";

// ============================================================
// 設定
// ============================================================
const INPUT_DIR = "root_page";

// ============================================================
// メイン
// ============================================================
async function main() {
  const notionApiKey = process.env.NOTION_API_KEY ?? "";
  if (!notionApiKey) {
    console.error("Error: NOTION_API_KEY is not set");
    process.exit(1);
  }

  console.log(`Syncing Markdown files to Notion (source: ${INPUT_DIR})`);
  console.log("=".repeat(50));

  try {
    await syncMarkdownToNotion(INPUT_DIR, notionApiKey);
  } catch (error) {
    console.error("Error during sync:", error);
    process.exit(1);
  }

  console.log("=".repeat(50));
  console.log("Done!");
}

await main();
