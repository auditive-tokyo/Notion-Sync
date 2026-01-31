/**
 * Notion APIからページを取得してMarkdownに変換するスクリプト
 * エントリーポイント
 */
import "dotenv/config";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  processPage,
  getProcessedIds,
  clearProcessedIds,
} from "./notion-client.js";

// ============================================================
// 設定
// ============================================================
const ROOT_PAGE_ID = process.env.NOTION_ROOT_PAGE_ID ?? "";
const OUTPUT_DIR = "root_page";

// ============================================================
// 削除検出
// ============================================================

/**
 * ファイル/フォルダ名からNotion IDを抽出
 * 形式: "タイトル {32文字のID}.md" または "タイトル {32文字のID}/"
 */
function extractIdFromName(name: string): string | null {
  // .md ファイル: 末尾の " {ID}.md" からIDを抽出
  const mdMatch = name.match(/\s([a-f0-9]{32})\.md$/);
  if (mdMatch) {
    return mdMatch[1];
  }

  // .csv ファイル: 末尾の " {ID}.csv" からIDを抽出
  const csvMatch = name.match(/\s([a-f0-9]{32})\.csv$/);
  if (csvMatch) {
    return csvMatch[1];
  }

  // フォルダ: 末尾の " {ID}" からIDを抽出
  const dirMatch = name.match(/\s([a-f0-9]{32})$/);
  if (dirMatch) {
    return dirMatch[1];
  }

  return null;
}

/**
 * 削除されたページ（処理されなかったID）のファイル/フォルダを削除
 */
async function removeDeletedPages(
  dir: string,
  processedIds: Set<string>,
): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      // imagesフォルダはスキップ
      if (entry.name === "images") {
        continue;
      }

      const id = extractIdFromName(entry.name);
      const fullPath = path.join(dir, entry.name);

      if (id && !processedIds.has(id)) {
        // このIDは処理されなかった = Notionから削除された
        if (entry.isDirectory()) {
          await fs.rm(fullPath, { recursive: true });
          console.log(`🗑️  Deleted (removed from Notion): ${entry.name}/`);
        } else {
          await fs.unlink(fullPath);
          console.log(`🗑️  Deleted (removed from Notion): ${entry.name}`);
        }
      } else if (entry.isDirectory()) {
        // フォルダ内を再帰的に確認
        await removeDeletedPages(fullPath, processedIds);
      }
    }

    // 空になったフォルダを削除
    const remainingEntries = await fs.readdir(dir);
    if (remainingEntries.length === 0) {
      await fs.rmdir(dir);
      console.log(`🗑️  Deleted (empty directory): ${path.basename(dir)}/`);
    }
  } catch {
    // エラーはスキップ
  }
}

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

  // 処理済みIDをクリア
  clearProcessedIds();

  // ルートページから再帰的に取得
  await processPage(ROOT_PAGE_ID, OUTPUT_DIR);

  // 処理済みIDを取得
  const processedIds = getProcessedIds();

  console.log("=".repeat(50));
  console.log(`Processed ${processedIds.size} pages/databases`);

  // 削除されたページを検出して削除
  console.log("Checking for deleted pages...");
  await removeDeletedPages(OUTPUT_DIR, processedIds);

  console.log("=".repeat(50));
  console.log("Done!");
}

await main();
