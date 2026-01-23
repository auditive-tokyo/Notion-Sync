/**
 * Notion APIからページを取得してMarkdownに変換するスクリプト
 */
import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

// ============================================================
// 設定
// ============================================================
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const ROOT_PAGE_ID = process.env.NOTION_ROOT_PAGE_ID ?? "";
const OUTPUT_DIR = "root_page";
const DOWNLOAD_IMAGES =
  (process.env.DOWNLOAD_IMAGES ?? "true").toLowerCase() === "true";

// ============================================================
// ユーティリティ関数
// ============================================================

/**
 * ページタイトルを取得
 */
function getPageTitle(page: PageObjectResponse): string {
  const props = page.properties;

  for (const prop of Object.values(props)) {
    if (prop.type === "title") {
      const titleList = prop.title;
      if (titleList.length > 0) {
        return titleList[0].plain_text || "Untitled";
      }
    }
  }

  return "Untitled";
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

  // テスト: ルートページのタイトルを取得
  const page = (await notion.pages.retrieve({
    page_id: ROOT_PAGE_ID,
  })) as PageObjectResponse;

  const title = getPageTitle(page);
  console.log(`📄 Root page title: ${title}`);

  console.log("=".repeat(50));
  console.log("Done!");
}

main().catch(console.error);
