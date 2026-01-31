/**
 * Notion API関連の関数
 * 外部API依存があるため、テスト時はモックが必要
 */
import { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  DatabaseObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  extractPropertyValue,
  getPageTitle,
  richTextToMarkdown,
  sanitizeFilename,
} from "./utils.js";

// ============================================================
// Notionクライアント
// ============================================================
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// ============================================================
// 設定
// ============================================================
const DOWNLOAD_IMAGES =
  (process.env.DOWNLOAD_IMAGES ?? "true").toLowerCase() === "true";

// ============================================================
// 画像ダウンロード
// ============================================================

/**
 * 画像をダウンロードしてローカルパスを返す
 */
async function downloadImage(url: string, outputDir: string): Promise<string> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const crypto = await import("node:crypto");

  try {
    // URLから画像情報を抽出
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/");

    let imageUuid: string;
    let originalName: string;

    // Notion S3 URLの形式: /.../uuid/filename
    if (pathParts.length >= 2) {
      imageUuid = pathParts[pathParts.length - 2] ?? "unknown";
      originalName = decodeURIComponent(
        pathParts[pathParts.length - 1] ?? "image.png",
      );
    } else {
      // フォールバック: URLのハッシュを使用
      imageUuid = crypto
        .createHash("md5")
        .update(url)
        .digest("hex")
        .slice(0, 12);
      originalName = "image.png";
    }

    // ファイル名を生成: uuid_originalname
    const safeName = originalName.replace(/[<>:"/\\|?*]/g, "_");
    const filename = `${imageUuid}_${safeName}`;

    // imagesディレクトリを作成
    const imagesDir = path.join(outputDir, "images");
    await fs.mkdir(imagesDir, { recursive: true });

    const imagePath = path.join(imagesDir, filename);

    // 既に存在する場合はダウンロードをスキップ
    try {
      await fs.access(imagePath);
      console.log(`    ⏭️ Skip (exists): ${filename}`);
      return `images/${filename}`;
    } catch {
      // ファイルが存在しない場合は続行
    }

    // ダウンロード
    console.log(`    📥 Downloading: ${filename}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(imagePath, buffer);

    return `images/${filename}`;
  } catch (e) {
    console.error(`    ⚠️ Image download error: ${e}`);
    return url; // 失敗時は元のURLを返す
  }
}

// ============================================================
// プロパティ・ブロック処理
// ============================================================

/**
 * ページのプロパティをMarkdown形式で取得（縦並び形式）
 */
function getPagePropertiesMarkdown(page: PageObjectResponse): string {
  const props = page.properties;

  if (!props || Object.keys(props).length === 0) {
    return "";
  }

  // タイトル以外のプロパティを抽出
  const propItems: [string, string][] = [];

  for (const [name, prop] of Object.entries(props)) {
    if (prop.type === "title") {
      continue; // タイトルはスキップ（見出しで表示済み）
    }

    const value = extractPropertyValue(prop);
    if (value) {
      propItems.push([name, value]);
    }
  }

  if (propItems.length === 0) {
    return "";
  }

  // プロパティ名でソート
  propItems.sort((a, b) => a[0].localeCompare(b[0]));

  // 縦並び形式（プロパティ名: 値）
  const lines = propItems.map(([name, value]) => `**${name}**: ${value}`);

  return lines.join("\n") + "\n\n---\n";
}

/**
 * 子ブロック一覧を取得
 */
async function getPageChildren(pageId: string): Promise<BlockObjectResponse[]> {
  const children: BlockObjectResponse[] = [];
  let cursor: string | undefined;

  while (true) {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
    });

    for (const block of response.results) {
      if ("type" in block) {
        children.push(block);
      }
    }

    if (!response.has_more) {
      break;
    }
    cursor = response.next_cursor ?? undefined;
  }

  return children;
}

/**
 * テーブルブロックをMarkdownテーブルに変換
 */
async function convertTableBlock(block: BlockObjectResponse): Promise<string> {
  if (block.type !== "table") {
    return "[Not a table]\n";
  }

  const blockId = block.id;

  try {
    // テーブルの子ブロック（table_row）を取得
    const rowsResponse = await notion.blocks.children.list({
      block_id: blockId,
    });
    const rows = rowsResponse.results;

    if (rows.length === 0) {
      return "[Empty Table]\n";
    }

    const mdRows: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!("type" in row) || row.type !== "table_row") {
        continue;
      }

      const cells = row.table_row.cells;
      const cellTexts: string[] = [];

      for (const cell of cells) {
        let cellText = richTextToMarkdown(cell);
        // パイプ文字をエスケープ
        cellText = cellText.replace(/\|/g, "\\|");
        cellTexts.push(cellText);
      }

      const mdRow = "| " + cellTexts.join(" | ") + " |";
      mdRows.push(mdRow);

      // 1行目の後にヘッダー区切りを追加
      if (i === 0) {
        const separator = "| " + cellTexts.map(() => "---").join(" | ") + " |";
        mdRows.push(separator);
      }
    }

    return mdRows.join("\n") + "\n\n";
  } catch (e) {
    console.error(`  ⚠️ Table conversion error: ${e}`);
    return "[Table conversion error]\n";
  }
}

/**
 * 子ページ/子データベースのリンクを生成
 */
function formatChildLink(
  title: string,
  blockId: string,
  parentTitle: string | undefined,
  icon: string,
  extension: string
): string {
  const childId = blockId.replace(/-/g, "");
  if (parentTitle && childId) {
    const safeParent = sanitizeFilename(parentTitle).replace(/ /g, "%20");
    const safeTitle = sanitizeFilename(title).replace(/ /g, "%20");
    const linkPath = `${safeParent}/${safeTitle}%20${childId}.${extension}`;
    return `${icon} [${title}](${linkPath})\n`;
  }
  return `${icon} [${title}]\n`;
}

/**
 * 画像ブロックを処理
 */
async function processImageBlock(
  block: BlockObjectResponse & { type: "image" },
  outputDir?: string
): Promise<string> {
  const imageData = block.image;
  let imageUrl: string;

  if (imageData.type === "external") {
    imageUrl = imageData.external.url;
  } else {
    imageUrl = imageData.file.url;
    if (DOWNLOAD_IMAGES && outputDir && imageUrl) {
      imageUrl = await downloadImage(imageUrl, outputDir);
    }
  }

  const caption = richTextToMarkdown(imageData.caption);
  return `![${caption}](${imageUrl})\n`;
}

/**
 * ブロックをMarkdownに変換
 */
async function blockToMarkdown(
  block: BlockObjectResponse,
  outputDir?: string,
  parentTitle?: string,
): Promise<string> {
  const blockType = block.type;

  // 各ブロックタイプに対応するrich_textを取得するヘルパー
  const getRichText = (key: string): RichTextItemResponse[] => {
    const data = (block as Record<string, unknown>)[key] as
      | { rich_text?: RichTextItemResponse[] }
      | undefined;
    return data?.rich_text ?? [];
  };

  // シンプルなテキストブロックのマッピング
  const simpleTextBlocks: Record<string, string> = {
    paragraph: "",
    heading_1: "# ",
    heading_2: "## ",
    heading_3: "### ",
    bulleted_list_item: "- ",
    numbered_list_item: "1. ",
    quote: "> ",
    toggle: "<details><summary>",
  };

  if (blockType in simpleTextBlocks) {
    const prefix = simpleTextBlocks[blockType];
    const text = richTextToMarkdown(getRichText(blockType));
    if (blockType === "toggle") {
      return `${prefix}${text}</summary>\n</details>\n`;
    }
    return `${prefix}${text}\n`;
  }

  switch (blockType) {
    case "to_do": {
      const checkbox = block.to_do.checked ? "[x]" : "[ ]";
      return `- ${checkbox} ${richTextToMarkdown(block.to_do.rich_text)}\n`;
    }
    case "code": {
      const language = block.code.language || "";
      return `\`\`\`${language}\n${richTextToMarkdown(block.code.rich_text)}\n\`\`\`\n`;
    }
    case "divider":
      return "---\n";
    case "callout": {
      const icon = block.callout.icon;
      const emoji = icon?.type === "emoji" ? icon.emoji : "💡";
      return `> ${emoji} ${richTextToMarkdown(block.callout.rich_text)}\n`;
    }
    case "child_page":
      return formatChildLink(block.child_page.title || "Untitled", block.id, parentTitle, "📄", "md");
    case "child_database":
      return formatChildLink(block.child_database.title || "Untitled", block.id, parentTitle, "🗄️", "csv");
    case "image":
      return processImageBlock(block as BlockObjectResponse & { type: "image" }, outputDir);
    case "bookmark":
      return `🔗 ${block.bookmark.url || ""}\n`;
    case "table":
      return convertTableBlock(block);
    default:
      return `[${blockType}]\n`;
  }
}

/**
 * ページの本文を取得してMarkdownに変換
 */
async function fetchPageContent(
  pageId: string,
  outputDir?: string,
  parentTitle?: string,
): Promise<string> {
  const blocks = await getPageChildren(pageId);
  const contentLines: string[] = [];

  for (const block of blocks) {
    const md = await blockToMarkdown(block, outputDir, parentTitle);
    contentLines.push(md);
  }

  return contentLines.join("\n");
}

// ============================================================
// CSV エクスポート
// ============================================================

/**
 * データベースをCSVとしてエクスポート
 */
async function exportDatabaseToCsv(
  records: PageObjectResponse[],
  title: string,
  dbId: string,
  outputPath: string,
): Promise<void> {
  if (records.length === 0) {
    return;
  }

  // プロパティ名（ヘッダー）を取得
  const firstRecord = records[0];
  const props = firstRecord.properties;

  // タイトルプロパティを先頭にするためソート
  const headers: string[] = [];
  let titleProp: string | null = null;

  for (const [name, prop] of Object.entries(props)) {
    if (prop.type === "title") {
      titleProp = name;
    } else {
      headers.push(name);
    }
  }

  if (titleProp) {
    headers.unshift(titleProp);
  }

  // CSVファイルパス
  const csvFilename = `${sanitizeFilename(title)} ${dbId}.csv`;
  const csvPath = path.join(outputPath, csvFilename);

  // CSVエスケープ（必要な場合のみクォート）
  const escapeCsvField = (field: string): string => {
    // カンマ、改行、ダブルクォートを含む場合のみクォートで囲む
    if (field.includes(",") || field.includes("\n") || field.includes('"')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  // CSVデータを作成
  const csvRows: string[] = [];

  // ヘッダー行
  csvRows.push(headers.map(escapeCsvField).join(","));

  // データ行
  for (const record of records) {
    const row: string[] = [];
    for (const name of headers) {
      const prop = record.properties[name];
      const value = prop ? extractPropertyValue(prop) : "";
      row.push(escapeCsvField(value));
    }
    csvRows.push(row.join(","));
  }

  await fs.writeFile(csvPath, csvRows.join("\n") + "\n", "utf-8");
  console.log(`  📊 CSV exported: ${csvFilename}`);
}

// ============================================================
// ページ・データベース処理
// ============================================================

/**
 * ページを処理して保存
 */
export async function processPage(
  pageId: string,
  outputPath: string,
  depth: number = 0,
  includeProperties: boolean = false,
): Promise<void> {
  let page: PageObjectResponse;
  try {
    page = (await notion.pages.retrieve({
      page_id: pageId,
    })) as PageObjectResponse;
  } catch (e) {
    console.error(`  Error fetching page ${pageId}: ${e}`);
    return;
  }

  const title = getPageTitle(page);
  const pageIdShort = pageId.replace(/-/g, "");

  // 同じIDを持つ古いファイルを削除（タイトル変更に対応）
  try {
    const files = await fs.readdir(outputPath);
    for (const file of files) {
      if (file.endsWith(` ${pageIdShort}.md`) && file !== `${sanitizeFilename(title)} ${pageIdShort}.md`) {
        const oldFilePath = path.join(outputPath, file);
        await fs.unlink(oldFilePath);
        console.log(`  🗑️  Removed old file: ${file}`);
      }
    }
  } catch {
    // ディレクトリが存在しない場合などはスキップ
  }

  // ファイル名: タイトル + page_id
  const filename = `${sanitizeFilename(title)} ${pageIdShort}.md`;
  const filepath = path.join(outputPath, filename);

  const indent = "  ".repeat(depth);
  console.log(`${indent}📄 ${title}`);

  // ページ内容を取得
  const content = await fetchPageContent(pageId, outputPath, title);

  // プロパティテーブルを追加（DBレコードの場合）
  let propertiesMd = "";
  if (includeProperties) {
    propertiesMd = getPagePropertiesMarkdown(page);
  }

  const markdown = `# ${title}\n\n${propertiesMd}${content}`;

  // フォルダを作成してファイル保存
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, markdown, "utf-8");

  // 子ページを探索
  const blocks = await getPageChildren(pageId);
  const childPages = blocks.filter(
    (b) => b.type === "child_page" || b.type === "child_database",
  );

  if (childPages.length > 0) {
    // 子ページ用のフォルダを作成
    const childDir = path.join(outputPath, sanitizeFilename(title));
    await fs.mkdir(childDir, { recursive: true });

    for (const child of childPages) {
      const childId = child.id;
      if (child.type === "child_page") {
        await processPage(childId, childDir, depth + 1);
      } else if (child.type === "child_database") {
        await processDatabase(childId, childDir, depth + 1);
      }
    }
  }
}

/**
 * データベースを処理
 */
export async function processDatabase(
  databaseId: string,
  outputPath: string,
  depth: number = 0,
): Promise<void> {
  let db: DatabaseObjectResponse;
  try {
    const response = await notion.databases.retrieve({
      database_id: databaseId,
    });
    // PartialDatabaseObjectResponse でないことを確認
    if (!("title" in response)) {
      console.error(`  Database ${databaseId} is not fully accessible`);
      return;
    }
    db = response;
  } catch (e) {
    console.error(`  Error fetching database ${databaseId}: ${e}`);
    return;
  }

  const title =
    db.title && db.title.length > 0 ? db.title[0].plain_text : "Untitled";
  const dbIdShort = databaseId.replace(/-/g, "");

  const indent = "  ".repeat(depth);
  console.log(`${indent}🗄️ ${title}`);

  // データソースIDを取得（v5 API: DatabaseにはData Sourcesが紐づく）
  const dataSourceId = db.data_sources?.[0]?.id;
  if (!dataSourceId) {
    console.error(`  No data source found for database ${databaseId}`);
    return;
  }

  // データベースのレコードを取得（v5: dataSources.queryを使用）
  const records: PageObjectResponse[] = [];
  let cursor: string | undefined;

  while (true) {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
    });

    for (const result of response.results) {
      if ("properties" in result) {
        records.push(result as PageObjectResponse);
      }
    }

    if (!response.has_more) {
      break;
    }
    cursor = response.next_cursor ?? undefined;
  }

  // フォルダ作成
  const dbDir = path.join(outputPath, sanitizeFilename(title));
  await fs.mkdir(dbDir, { recursive: true });

  // 同じDBの古いディレクトリ・CSVを削除（タイトル変更に対応）
  // レコードIDを使って、このDBに属するディレクトリを特定する
  const recordIds = new Set(records.map(r => r.id.replace(/-/g, "")));
  
  try {
    const entries = await fs.readdir(outputPath, { withFileTypes: true });
    
    for (const entry of entries) {
      // ディレクトリのみ対象（現在のタイトルと同じなら新しいのでスキップ）
      if (!entry.isDirectory() || entry.name === sanitizeFilename(title)) {
        continue;
      }
      
      const dirPath = path.join(outputPath, entry.name);
      
      // ディレクトリ内のファイルを確認
      try {
        const dirFiles = await fs.readdir(dirPath);
        
        // このディレクトリ内のmdファイルが現在のDBレコードIDを持つか確認
        const belongsToThisDb = dirFiles.some(file => {
          if (!file.endsWith(".md")) return false;
          // ファイル名からIDを抽出（末尾32文字）
          const match = file.match(/([a-f0-9]{32})\.md$/);
          return match && recordIds.has(match[1]);
        });
        
        if (belongsToThisDb) {
          // このDBに属する古いディレクトリなので削除
          await fs.rm(dirPath, { recursive: true });
          console.log(`  🗑️  Removed old directory: ${entry.name}/`);
        }
      } catch {
        // ディレクトリ読み取りエラーはスキップ
      }
    }
    
    // 古いCSVファイルを削除
    for (const entry of entries) {
      if (entry.isFile() && 
          entry.name.endsWith(` ${dbIdShort}.csv`) && 
          entry.name !== `${sanitizeFilename(title)} ${dbIdShort}.csv`) {
        const oldFilePath = path.join(outputPath, entry.name);
        await fs.unlink(oldFilePath);
        console.log(`  🗑️  Removed old CSV: ${entry.name}`);
      }
    }
  } catch {
    // エラーはスキップ
  }

  // CSVエクスポート
  await exportDatabaseToCsv(records, title, dbIdShort, outputPath);

  // 各レコードを処理（プロパティ付きで）
  for (const record of records) {
    const recordId = record.id;
    await processPage(recordId, dbDir, depth + 1, true);
  }
}
