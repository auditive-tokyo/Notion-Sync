/**
 * Notion APIからページを取得してMarkdownに変換するスクリプト
 * エントリーポイント
 */
import * as fs from "node:fs/promises";
import { processPage } from "./notion-client.js";

// ============================================================
// 設定
// ============================================================
const ROOT_PAGE_ID = process.env.NOTION_ROOT_PAGE_ID ?? "";
const OUTPUT_DIR = "root_page";

// ============================================================
// メイン
// ============================================================
async function main() {
  if (!ROOT_PAGE_ID) {
    console.error("Error: NOTION_ROOT_PAGE_ID is not set");
    process.exit(1);
  }

  console.log(`Fetching from Notion (root: ${ROOT_PAGE_ID})`);
  console.log("=".repeat(50));

  // 出力ディレクトリを作成
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // ルートページから再帰的に取得
  await processPage(ROOT_PAGE_ID, OUTPUT_DIR);

  console.log("=".repeat(50));
  console.log("Done!");
}

await main();
