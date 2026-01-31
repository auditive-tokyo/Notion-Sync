/**
 * VS Code（ローカルMarkdown）からNotionへの同期
 */
import { Client } from "@notionhq/client";
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import * as fs from "node:fs/promises";
import * as path from "node:path";

// ============================================================
// 定数
// ============================================================
const PAGE_ID_PATTERN = /\s([a-f0-9]{32})\.md$/;
const HEADING_PATTERN = /^#+ /;

// 子ページ/データベースへのリンク行を検出するパターン
const CHILD_LINK_PATTERN = /^(?:📄|🗄️)\s*\[.+\]\(.+\)$/u;

// 保持すべきブロックタイプ（削除しない）
const PRESERVE_BLOCK_TYPES = new Set(["child_page", "child_database"]);

// ============================================================
// Notionクライアント
// ============================================================
let notion: Client;

function initNotion(apiKey: string): void {
  notion = new Client({ auth: apiKey });
}

// ============================================================
// 型定義
// ============================================================
interface MarkdownContent {
  title: string;
  body: string;
}

interface TextBlock {
  type: "paragraph";
  paragraph: {
    rich_text: Array<{
      type: "text";
      text: {
        content: string;
      };
    }>;
  };
}

// ============================================================
// Markdownパース
// ============================================================

/**
 * ファイル名からNotion Page IDを抽出
 */
function extractPageIdFromFilename(filename: string): string | null {
  const match = filename.match(PAGE_ID_PATTERN);
  return match?.[1] ?? null;
}

/**
 * Markdownファイルをタイトルと本文に分割
 */
function parseMarkdown(content: string): MarkdownContent {
  const lines = content.split("\n");

  // 最初の行がヘッダーをチェック
  let title = "Untitled";
  let bodyStartIndex = 0;

  if (lines[0] && HEADING_PATTERN.test(lines[0])) {
    title = lines[0].replace(/^#+\s+/, "").trim();
    bodyStartIndex = 1;
  }

  // 本文を取得してトリム
  const body = lines.slice(bodyStartIndex).join("\n").trim();

  return { title, body };
}

// ============================================================
// ブロック生成
// ============================================================

/**
 * テキストからNotionブロックを生成
 */
function createRichText(text: string): {
  type: "text";
  text: {
    content: string;
  };
} {
  return {
    type: "text",
    text: {
      content: text,
    },
  };
}

/**
 * Markdownテキストをブロック配列に変換
 * 子ページリンク行はスキップする
 */
function createBlocksFromMarkdown(text: string): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [];
  const paragraphs = text.split(/\n\s*\n/);

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (trimmed.length === 0) continue;

    // 子ページ/データベースリンク行はスキップ
    // 複数行の段落の場合、各行をチェック
    const lines = trimmed.split("\n");
    const filteredLines = lines.filter(
      (line) => !CHILD_LINK_PATTERN.test(line.trim()),
    );

    if (filteredLines.length === 0) continue;

    const filteredText = filteredLines.join("\n").trim();
    if (filteredText.length === 0) continue;

    const block: TextBlock = {
      type: "paragraph",
      paragraph: {
        rich_text: [createRichText(filteredText)],
      },
    };

    blocks.push(block as BlockObjectRequest);
  }

  return blocks;
}

// ============================================================
// Notion更新
// ============================================================

/**
 * 既存の全ブロックを取得
 */
async function getAllBlocks(pageId: string): Promise<
  Array<{
    id: string;
    type: string;
    isChild: boolean;
  }>
> {
  try {
    const response = await notion.blocks.children.list({
      block_id: pageId,
    });

    const blocks: Array<{ id: string; type: string; isChild: boolean }> = [];

    for (const block of response.results) {
      if ("id" in block && "type" in block) {
        blocks.push({
          id: block.id,
          type: block.type,
          isChild: PRESERVE_BLOCK_TYPES.has(block.type),
        });
      }
    }

    return blocks;
  } catch (error) {
    console.error(`Failed to get blocks for ${pageId}:`, error);
    return [];
  }
}

/**
 * ページの内容を更新（順序を保持）
 */
async function updatePageContent(
  pageId: string,
  blocks: BlockObjectRequest[],
): Promise<void> {
  // 既存ブロックを取得
  const existingBlocks = await getAllBlocks(pageId);

  // テキストブロックのみ削除（child_page/child_databaseは保持）
  for (const block of existingBlocks) {
    if (!block.isChild) {
      try {
        await notion.blocks.delete({ block_id: block.id });
      } catch {
        // 削除失敗は無視
      }
    }
  }

  // 新しいブロックを追加
  // 子ブロックがない場合は単純に追加
  const childBlocks = existingBlocks.filter((b) => b.isChild);
  if (childBlocks.length === 0) {
    // 一括で追加（最大100ブロック）
    if (blocks.length <= 100) {
      await notion.blocks.children.append({
        block_id: pageId,
        children: blocks,
      });
    } else {
      // 100ブロックずつ分割
      for (let i = 0; i < blocks.length; i += 100) {
        const chunk = blocks.slice(i, i + 100);
        await notion.blocks.children.append({
          block_id: pageId,
          children: chunk,
        });
      }
    }
    return;
  }

  // 子ブロックがある場合は、先頭に追加（afterパラメータなし）
  // 逆順で追加することで正しい順序になる
  for (let i = blocks.length - 1; i >= 0; i--) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: [blocks[i]],
    });
  }
}

// ============================================================
// ファイルスキャン
// ============================================================

/**
 * ディレクトリ内のMarkdownファイルを再帰検索
 */
async function scanMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === "images") continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await scanMarkdownFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  } catch {
    // ディレクトリ読み込みエラーは無視
  }

  return files;
}

// ============================================================
// メイン同期ロジック
// ============================================================

/**
 * Markdownファイルを走査してNotionに同期
 */
export async function syncMarkdownToNotion(
  rootDir: string,
  apiKey: string,
): Promise<void> {
  initNotion(apiKey);

  const files = await scanMarkdownFiles(rootDir);
  console.log(`Found ${files.length} Markdown files`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const pageId = extractPageIdFromFilename(path.basename(file));

    if (!pageId) {
      console.log(`⏭️  Skipped (no ID): ${path.relative(rootDir, file)}`);
      skipCount++;
      continue;
    }

    try {
      const content = await fs.readFile(file, "utf-8");
      const { title, body } = parseMarkdown(content);

      console.log(`📝 Updating: ${title}`);

      const blocks = createBlocksFromMarkdown(body);
      if (blocks.length === 0) {
        console.log(`⚠️  Empty content: ${title}`);
        skipCount++;
        continue;
      }

      await updatePageContent(pageId, blocks);
      console.log(`✅ Updated: ${title}`);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(
        `❌ Error updating ${path.relative(rootDir, file)}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // サマリー
  console.log(`\nSync Summary:`);
  console.log(`  ✅ Updated: ${successCount}`);
  console.log(`  ⏭️  Skipped: ${skipCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
}
