/**
 * index.ts エントリーポイントのテスト
 * MSWを使用してNotion APIをモック
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type {
  PageObjectResponse,
  DatabaseObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

// ============================================================
// モックデータ生成ヘルパー
// ============================================================

function createRichText(plainText: string): RichTextItemResponse {
  return {
    type: "text",
    text: {
      content: plainText,
      link: null,
    },
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: "default",
    },
    plain_text: plainText,
    href: null,
  };
}

function createMockPage(
  id: string,
  title: string,
  properties: Record<string, unknown> = {},
): PageObjectResponse {
  return {
    object: "page",
    id,
    created_time: "2024-01-01T00:00:00.000Z",
    last_edited_time: "2024-01-01T00:00:00.000Z",
    created_by: { object: "user", id: "user-id" },
    last_edited_by: { object: "user", id: "user-id" },
    cover: null,
    icon: null,
    parent: { type: "workspace", workspace: true },
    archived: false,
    in_trash: false,
    is_locked: false,
    properties: {
      title: {
        id: "title",
        type: "title",
        title: [createRichText(title)],
      },
      ...properties,
    },
    url: `https://notion.so/${id}`,
    public_url: null,
  } as PageObjectResponse;
}

function createMockBlock(
  id: string,
  type: string,
  content: Record<string, unknown> = {},
) {
  return {
    object: "block" as const,
    id,
    parent: { type: "page_id", page_id: "parent-page-id" },
    created_time: "2024-01-01T00:00:00.000Z",
    last_edited_time: "2024-01-01T00:00:00.000Z",
    created_by: { object: "user", id: "user-id" },
    last_edited_by: { object: "user", id: "user-id" },
    has_children: false,
    archived: false,
    in_trash: false,
    type,
    ...content,
  };
}

function createMockDatabase(id: string, title: string): DatabaseObjectResponse {
  return {
    object: "database",
    id,
    created_time: "2024-01-01T00:00:00.000Z",
    last_edited_time: "2024-01-01T00:00:00.000Z",
    created_by: { object: "user", id: "user-id" },
    last_edited_by: { object: "user", id: "user-id" },
    title: [createRichText(title)],
    description: [],
    icon: null,
    cover: null,
    properties: {},
    parent: { type: "workspace", workspace: true },
    url: `https://notion.so/${id}`,
    public_url: null,
    archived: false,
    in_trash: false,
    is_inline: false,
    is_locked: false,
    data_sources: [{ id: `ds-${id}`, name: "Default" }],
  } as DatabaseObjectResponse;
}

// ============================================================
// MSWサーバー設定
// ============================================================

const NOTION_API_BASE = "https://api.notion.com/v1";

const defaultHandlers = [
  http.get(`${NOTION_API_BASE}/pages/:pageId`, ({ params }) => {
    const { pageId } = params;
    return HttpResponse.json(createMockPage(pageId as string, "Test Page"));
  }),
  http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
    return HttpResponse.json({
      object: "list",
      results: [],
      has_more: false,
      next_cursor: null,
    });
  }),
  http.get(`${NOTION_API_BASE}/databases/:databaseId`, ({ params }) => {
    const { databaseId } = params;
    return HttpResponse.json(
      createMockDatabase(databaseId as string, "Test Database"),
    );
  }),
  http.post(`${NOTION_API_BASE}/data_sources/:dataSourceId/query`, () => {
    return HttpResponse.json({
      object: "list",
      results: [],
      has_more: false,
      next_cursor: null,
    });
  }),
];

const server = setupServer(...defaultHandlers);

// ============================================================
// テストセットアップ
// ============================================================

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});

// ============================================================
// テストケース
// ============================================================

describe("index.ts - Entry Point Integration Test", () => {
  const originalCwd = process.cwd();
  let tempDir: string;
  const rootPageId = "root-page-12345678901234567890123456";

  beforeAll(async () => {
    // 一時ディレクトリを作成してそこに移動
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "notion-sync-index-"));
    process.chdir(tempDir);

    // 環境変数を設定
    process.env.NOTION_API_KEY = "test-api-key-for-msw";
    process.env.NOTION_ROOT_PAGE_ID = rootPageId;
    process.env.DOWNLOAD_IMAGES = "false";
  });

  afterAll(async () => {
    // 元のディレクトリに戻る
    process.chdir(originalCwd);
    // 一時ディレクトリを削除
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should run main() and export root page with child pages and databases", async () => {
    const childPageId = "child-page-1234567890123456789012345";
    const childDbId = "child-db-123456789012345678901234567";

    // 複雑なページ構造をモック
    server.use(
      // ルートページ
      http.get(`${NOTION_API_BASE}/pages/:pageId`, ({ params }) => {
        const { pageId } = params;
        if (pageId === rootPageId) {
          return HttpResponse.json(createMockPage(rootPageId, "Root Page"));
        }
        if (pageId === childPageId) {
          return HttpResponse.json(createMockPage(childPageId, "Child Page"));
        }
        // DBレコード
        return HttpResponse.json(
          createMockPage(pageId as string, "DB Record", {
            Status: {
              id: "status",
              type: "select",
              select: { id: "done", name: "Done", color: "green" },
            },
          }),
        );
      }),

      // ブロック（子ページ・子DBを含む）
      http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, ({ params }) => {
        const { blockId } = params;
        if (blockId === rootPageId) {
          // ルートページには子ページと子DBがある
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("para-1", "paragraph", {
                paragraph: {
                  rich_text: [createRichText("Root page content")],
                  color: "default",
                },
              }),
              {
                ...createMockBlock(childPageId, "child_page", {
                  child_page: { title: "Child Page" },
                }),
                has_children: true,
              },
              {
                ...createMockBlock(childDbId, "child_database", {
                  child_database: { title: "Task DB" },
                }),
                has_children: true,
              },
            ],
            has_more: false,
            next_cursor: null,
          });
        }
        if (blockId === childPageId) {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("child-para", "paragraph", {
                paragraph: {
                  rich_text: [createRichText("Child page content")],
                  color: "default",
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }
        return HttpResponse.json({
          object: "list",
          results: [],
          has_more: false,
          next_cursor: null,
        });
      }),

      // データベース取得
      http.get(`${NOTION_API_BASE}/databases/:databaseId`, () => {
        return HttpResponse.json(createMockDatabase(childDbId, "Task DB"));
      }),

      // データソースクエリ
      http.post(`${NOTION_API_BASE}/data_sources/:dataSourceId/query`, () => {
        return HttpResponse.json({
          object: "list",
          results: [
            createMockPage("record-1-23456789012345678901234567", "Task 1", {
              Status: {
                id: "status",
                type: "select",
                select: { id: "done", name: "Done", color: "green" },
              },
            }),
          ],
          has_more: false,
          next_cursor: null,
        });
      }),
    );

    // index.tsをインポートして実行
    vi.resetModules();
    await import("../index.js");

    // root_pageディレクトリが作成されているか
    const rootDir = path.join(tempDir, "root_page");
    const rootExists = await fs
      .access(rootDir)
      .then(() => true)
      .catch(() => false);
    expect(rootExists).toBe(true);

    // ルートページのMarkdownファイル
    const rootFiles = await fs.readdir(rootDir);
    const rootMd = rootFiles.find((f) => f.endsWith(".md"));
    expect(rootMd).toBeDefined();

    const rootContent = await fs.readFile(path.join(rootDir, rootMd!), "utf-8");
    expect(rootContent).toContain("# Root Page");
    expect(rootContent).toContain("Root page content");

    // 子ページ用ディレクトリ
    const childDir = rootFiles.find(
      (f) => !f.endsWith(".md") && !f.endsWith(".csv"),
    );
    expect(childDir).toBeDefined();
  });
});

// ============================================================
// 異常系テスト
// ============================================================

describe("index.ts - Error Cases", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // 環境変数を元に戻す
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("should exit with code 1 when NOTION_ROOT_PAGE_ID is not set", async () => {
    // process.exitをモック（実際に終了しないように）
    const mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const mockConsoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // 環境変数をクリア
    delete process.env.NOTION_ROOT_PAGE_ID;

    // モジュールキャッシュをクリアして再インポート
    vi.resetModules();

    // index.tsをインポート（main()が実行される）
    await import("../index.js");

    // process.exit(1)が呼ばれたことを確認
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalledWith(
      "Error: NOTION_ROOT_PAGE_ID is not set",
    );
  });

  it("should exit with code 1 when NOTION_ROOT_PAGE_ID is empty string", async () => {
    const mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const mockConsoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // 空文字列を設定
    process.env.NOTION_ROOT_PAGE_ID = "";

    vi.resetModules();
    await import("../index.js");

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalledWith(
      "Error: NOTION_ROOT_PAGE_ID is not set",
    );
  });
});
