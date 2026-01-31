/**
 * Notion Client ユニットテスト
 * MSWを使用してNotion APIをモック
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type {
  BlockObjectResponse,
  PageObjectResponse,
  DatabaseObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

// ============================================================
// モックデータ生成ヘルパー
// ============================================================

/**
 * RichTextItemResponseのモックを作成
 */
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

/**
 * PageObjectResponseのモックを作成
 */
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

/**
 * BlockObjectResponseのモックを作成
 */
function createMockBlock(
  id: string,
  type: string,
  content: Record<string, unknown> = {},
): BlockObjectResponse {
  const base = {
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

  return base as unknown as BlockObjectResponse;
}

/**
 * DatabaseObjectResponseのモックを作成
 */
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

// デフォルトのハンドラー（テスト毎にオーバーライド可能）
const defaultHandlers = [
  // pages.retrieve
  http.get(`${NOTION_API_BASE}/pages/:pageId`, ({ params }) => {
    const { pageId } = params;
    return HttpResponse.json(createMockPage(pageId as string, "Test Page"));
  }),

  // blocks.children.list
  http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
    return HttpResponse.json({
      object: "list",
      results: [],
      has_more: false,
      next_cursor: null,
    });
  }),

  // databases.retrieve
  http.get(`${NOTION_API_BASE}/databases/:databaseId`, ({ params }) => {
    const { databaseId } = params;
    return HttpResponse.json(
      createMockDatabase(databaseId as string, "Test Database"),
    );
  }),

  // dataSources.query (v5 API)
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

describe("Notion Client - MSW Mock Tests", () => {
  describe("pages.retrieve のモック", () => {
    it("should mock page retrieval successfully", async () => {
      const mockPageId = "test-page-id-12345";
      const mockTitle = "モックされたページ";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(mockPageId, mockTitle));
        }),
      );

      // Notion クライアントを動的にインポート（モック適用後）
      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      const page = await notion.pages.retrieve({ page_id: mockPageId });

      expect(page).toBeDefined();
      expect(page.id).toBe(mockPageId);
      expect((page as PageObjectResponse).properties.title).toBeDefined();
    });

    it("should return 404 for non-existent page", async () => {
      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(
            {
              object: "error",
              status: 404,
              code: "object_not_found",
              message: "Page not found",
            },
            { status: 404 },
          );
        }),
      );

      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      await expect(
        notion.pages.retrieve({ page_id: "non-existent-id" }),
      ).rejects.toThrow();
    });
  });

  describe("blocks.children.list のモック", () => {
    it("should return empty block list", async () => {
      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      const response = await notion.blocks.children.list({
        block_id: "test-block-id",
      });

      expect(response.results).toEqual([]);
      expect(response.has_more).toBe(false);
    });

    it("should return blocks with pagination", async () => {
      const paragraphBlock = createMockBlock("block-1", "paragraph", {
        paragraph: {
          rich_text: [createRichText("テスト段落")],
          color: "default",
        },
      });

      const headingBlock = createMockBlock("block-2", "heading_1", {
        heading_1: {
          rich_text: [createRichText("テスト見出し")],
          color: "default",
        },
      });

      server.use(
        http.get(
          `${NOTION_API_BASE}/blocks/:blockId/children`,
          ({ request }) => {
            const url = new URL(request.url);
            const cursor = url.searchParams.get("start_cursor");

            if (!cursor) {
              // 最初のリクエスト
              return HttpResponse.json({
                object: "list",
                results: [paragraphBlock],
                has_more: true,
                next_cursor: "cursor-page-2",
              });
            } else {
              // 2回目のリクエスト
              return HttpResponse.json({
                object: "list",
                results: [headingBlock],
                has_more: false,
                next_cursor: null,
              });
            }
          },
        ),
      );

      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      // 1回目のリクエスト
      const firstResponse = await notion.blocks.children.list({
        block_id: "test-block-id",
      });

      expect(firstResponse.results).toHaveLength(1);
      expect(firstResponse.has_more).toBe(true);
      expect(firstResponse.next_cursor).toBe("cursor-page-2");

      // 2回目のリクエスト（カーソル付き）
      const secondResponse = await notion.blocks.children.list({
        block_id: "test-block-id",
        start_cursor: firstResponse.next_cursor!,
      });

      expect(secondResponse.results).toHaveLength(1);
      expect(secondResponse.has_more).toBe(false);
    });

    it("should return various block types", async () => {
      const blocks = [
        createMockBlock("block-paragraph", "paragraph", {
          paragraph: {
            rich_text: [createRichText("段落テキスト")],
            color: "default",
          },
        }),
        createMockBlock("block-heading", "heading_1", {
          heading_1: {
            rich_text: [createRichText("見出し1")],
            color: "default",
          },
        }),
        createMockBlock("block-bulleted", "bulleted_list_item", {
          bulleted_list_item: {
            rich_text: [createRichText("箇条書き")],
            color: "default",
          },
        }),
        createMockBlock("block-code", "code", {
          code: {
            rich_text: [createRichText("console.log('Hello');")],
            language: "javascript",
          },
        }),
        createMockBlock("block-divider", "divider", { divider: {} }),
        createMockBlock("block-callout", "callout", {
          callout: {
            rich_text: [createRichText("コールアウト")],
            icon: { type: "emoji", emoji: "💡" },
            color: "default",
          },
        }),
      ];

      server.use(
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: blocks,
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      const response = await notion.blocks.children.list({
        block_id: "test-block-id",
      });

      expect(response.results).toHaveLength(6);

      const resultTypes = response.results.map((b) =>
        "type" in b ? b.type : "unknown",
      );
      expect(resultTypes).toContain("paragraph");
      expect(resultTypes).toContain("heading_1");
      expect(resultTypes).toContain("bulleted_list_item");
      expect(resultTypes).toContain("code");
      expect(resultTypes).toContain("divider");
      expect(resultTypes).toContain("callout");
    });
  });

  describe("databases.retrieve のモック", () => {
    it("should mock database retrieval successfully", async () => {
      const mockDbId = "test-db-id-12345";
      const mockTitle = "タスク管理DB";

      server.use(
        http.get(`${NOTION_API_BASE}/databases/:databaseId`, () => {
          return HttpResponse.json(createMockDatabase(mockDbId, mockTitle));
        }),
      );

      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      const db = await notion.databases.retrieve({ database_id: mockDbId });

      expect(db).toBeDefined();
      expect(db.id).toBe(mockDbId);
      expect("title" in db && db.title[0].plain_text).toBe(mockTitle);
    });
  });

  describe("dataSources.query のモック (v5 API)", () => {
    it("should return empty results", async () => {
      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      const response = await notion.dataSources.query({
        data_source_id: "test-datasource-id",
      });

      expect(response.results).toEqual([]);
      expect(response.has_more).toBe(false);
    });

    it("should return paginated records", async () => {
      const records = [
        createMockPage("record-1", "タスクA", {
          Status: {
            id: "status",
            type: "select",
            select: { id: "done", name: "完了", color: "green" },
          },
        }),
        createMockPage("record-2", "タスクB", {
          Status: {
            id: "status",
            type: "select",
            select: { id: "progress", name: "進行中", color: "yellow" },
          },
        }),
      ];

      server.use(
        http.post(`${NOTION_API_BASE}/data_sources/:dataSourceId/query`, () => {
          return HttpResponse.json({
            object: "list",
            results: records,
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      const response = await notion.dataSources.query({
        data_source_id: "test-datasource-id",
      });

      expect(response.results).toHaveLength(2);
    });
  });

  describe("テーブルブロックのモック", () => {
    it("should return table rows for table block", async () => {
      const tableRows = [
        createMockBlock("row-1", "table_row", {
          table_row: {
            cells: [
              [createRichText("ヘッダー1")],
              [createRichText("ヘッダー2")],
            ],
          },
        }),
        createMockBlock("row-2", "table_row", {
          table_row: {
            cells: [[createRichText("データ1")], [createRichText("データ2")]],
          },
        }),
      ];

      server.use(
        http.get(
          `${NOTION_API_BASE}/blocks/:blockId/children`,
          ({ params }) => {
            const { blockId } = params;
            if (blockId === "table-block-id") {
              return HttpResponse.json({
                object: "list",
                results: tableRows,
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
          },
        ),
      );

      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      const response = await notion.blocks.children.list({
        block_id: "table-block-id",
      });

      expect(response.results).toHaveLength(2);
      const firstRow = response.results[0];
      expect("type" in firstRow && firstRow.type).toBe("table_row");
    });
  });

  describe("画像ブロックのモック", () => {
    it("should return image block with file URL", async () => {
      const imageBlock = createMockBlock("image-block", "image", {
        image: {
          type: "file",
          file: {
            url: "https://s3.us-west-2.amazonaws.com/secure.notion-static.com/uuid/image.png",
            expiry_time: "2024-01-01T01:00:00.000Z",
          },
          caption: [createRichText("画像キャプション")],
        },
      });

      server.use(
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [imageBlock],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      const response = await notion.blocks.children.list({
        block_id: "test-block-id",
      });

      expect(response.results).toHaveLength(1);
      const block = response.results[0];
      expect("type" in block && block.type).toBe("image");
    });

    it("should return image block with external URL", async () => {
      const imageBlock = createMockBlock("image-block", "image", {
        image: {
          type: "external",
          external: {
            url: "https://example.com/image.png",
          },
          caption: [],
        },
      });

      server.use(
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [imageBlock],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      const response = await notion.blocks.children.list({
        block_id: "test-block-id",
      });

      expect(response.results).toHaveLength(1);
      const block = response.results[0];
      if ("type" in block && block.type === "image") {
        const imageData = (
          block as BlockObjectResponse & { image: { type: string } }
        ).image;
        expect(imageData.type).toBe("external");
      }
    });
  });

  describe("子ページ・子データベースブロックのモック", () => {
    it("should return child_page block", async () => {
      const childPageBlock = createMockBlock("child-page-block", "child_page", {
        child_page: {
          title: "子ページタイトル",
        },
        has_children: true,
      });

      server.use(
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [childPageBlock],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      const response = await notion.blocks.children.list({
        block_id: "parent-page-id",
      });

      expect(response.results).toHaveLength(1);
      const block = response.results[0];
      expect("type" in block && block.type).toBe("child_page");
    });

    it("should return child_database block", async () => {
      const childDbBlock = createMockBlock("child-db-block", "child_database", {
        child_database: {
          title: "子データベースタイトル",
        },
        has_children: true,
      });

      server.use(
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [childDbBlock],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      const response = await notion.blocks.children.list({
        block_id: "parent-page-id",
      });

      expect(response.results).toHaveLength(1);
      const block = response.results[0];
      expect("type" in block && block.type).toBe("child_database");
    });
  });

  describe("エラーハンドリング", () => {
    it("should handle 401 unauthorized error", async () => {
      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(
            {
              object: "error",
              status: 401,
              code: "unauthorized",
              message: "API token is invalid.",
            },
            { status: 401 },
          );
        }),
      );

      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "invalid-api-key" });

      await expect(
        notion.pages.retrieve({ page_id: "test-page-id" }),
      ).rejects.toThrow();
    });

    it("should handle 429 rate limit error", async () => {
      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(
            {
              object: "error",
              status: 429,
              code: "rate_limited",
              message: "Rate limited",
            },
            { status: 429 },
          );
        }),
      );

      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      await expect(
        notion.pages.retrieve({ page_id: "test-page-id" }),
      ).rejects.toThrow();
    });

    it("should handle 500 server error", async () => {
      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(
            {
              object: "error",
              status: 500,
              code: "internal_server_error",
              message: "Internal server error",
            },
            { status: 500 },
          );
        }),
      );

      const { Client } = await import("@notionhq/client");
      const notion = new Client({ auth: "test-api-key" });

      await expect(
        notion.pages.retrieve({ page_id: "test-page-id" }),
      ).rejects.toThrow();
    });
  });
});

// ============================================================
// processPage / processDatabase 統合テスト
// ============================================================

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

describe("Notion Client - Integration Tests (processPage/processDatabase)", () => {
  let tempDir: string;

  beforeAll(() => {
    // NOTION_API_KEY環境変数を設定（MSWがモックするので実際のキーは不要）
    process.env.NOTION_API_KEY = "test-api-key-for-msw";
    // 画像ダウンロードを無効化
    process.env.DOWNLOAD_IMAGES = "false";
  });

  beforeEach(async () => {
    // 各テスト用の一時ディレクトリを作成
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "notion-sync-test-"));
  });

  afterEach(async () => {
    // 一時ディレクトリを削除
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("processPage", () => {
    it("should export a simple page to markdown file", async () => {
      const pageId = "test-page-12345678901234567890123456789012";
      const pageTitle = "テストページ";

      // MSWハンドラーを設定
      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("block-1", "paragraph", {
                paragraph: {
                  rich_text: [createRichText("これはテスト段落です。")],
                  color: "default",
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      // モジュールキャッシュをクリアして再インポート
      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      // ファイルが作成されたか確認
      const files = await fs.readdir(tempDir);
      expect(files.length).toBeGreaterThan(0);

      const mdFile = files.find((f) => f.endsWith(".md"));
      expect(mdFile).toBeDefined();

      // ファイル内容を確認
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");
      expect(content).toContain(`# ${pageTitle}`);
      expect(content).toContain("これはテスト段落です。");
    });

    it("should export page with various block types", async () => {
      const pageId = "test-page-various-blocks-1234567890";
      const pageTitle = "Various Blocks Page";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("block-h1", "heading_1", {
                heading_1: {
                  rich_text: [createRichText("見出し1")],
                  color: "default",
                },
              }),
              createMockBlock("block-h2", "heading_2", {
                heading_2: {
                  rich_text: [createRichText("見出し2")],
                  color: "default",
                },
              }),
              createMockBlock("block-para", "paragraph", {
                paragraph: {
                  rich_text: [createRichText("本文テキスト")],
                  color: "default",
                },
              }),
              createMockBlock("block-bullet", "bulleted_list_item", {
                bulleted_list_item: {
                  rich_text: [createRichText("箇条書き項目")],
                  color: "default",
                },
              }),
              createMockBlock("block-num", "numbered_list_item", {
                numbered_list_item: {
                  rich_text: [createRichText("番号付きリスト")],
                  color: "default",
                },
              }),
              createMockBlock("block-code", "code", {
                code: {
                  rich_text: [createRichText("const x = 1;")],
                  language: "typescript",
                },
              }),
              createMockBlock("block-quote", "quote", {
                quote: {
                  rich_text: [createRichText("引用テキスト")],
                  color: "default",
                },
              }),
              createMockBlock("block-divider", "divider", {
                divider: {},
              }),
              createMockBlock("block-callout", "callout", {
                callout: {
                  rich_text: [createRichText("コールアウト")],
                  icon: { type: "emoji", emoji: "💡" },
                  color: "default",
                },
              }),
              createMockBlock("block-todo", "to_do", {
                to_do: {
                  rich_text: [createRichText("TODOアイテム")],
                  checked: true,
                  color: "default",
                },
              }),
              createMockBlock("block-bookmark", "bookmark", {
                bookmark: {
                  url: "https://example.com",
                  caption: [],
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");

      // 各ブロックタイプが正しく変換されているか
      expect(content).toContain("# 見出し1");
      expect(content).toContain("## 見出し2");
      expect(content).toContain("本文テキスト");
      expect(content).toContain("- 箇条書き項目");
      expect(content).toContain("1. 番号付きリスト");
      expect(content).toContain("```typescript");
      expect(content).toContain("const x = 1;");
      expect(content).toContain("> 引用テキスト");
      expect(content).toContain("---");
      expect(content).toContain("💡 コールアウト");
      expect(content).toContain("[x] TODOアイテム");
      expect(content).toContain("https://example.com");
    });

    it("should export page with child pages", async () => {
      const parentPageId = "parent-page-12345678901234567890123";
      const childPageId = "child-page-123456789012345678901234";
      const parentTitle = "親ページ";
      const childTitle = "子ページ";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, ({ params }) => {
          const { pageId } = params;
          if (pageId === parentPageId) {
            return HttpResponse.json(createMockPage(parentPageId, parentTitle));
          }
          return HttpResponse.json(createMockPage(childPageId, childTitle));
        }),
        http.get(
          `${NOTION_API_BASE}/blocks/:blockId/children`,
          ({ params }) => {
            const { blockId } = params;
            if (blockId === parentPageId) {
              // 親ページには子ページブロックがある
              return HttpResponse.json({
                object: "list",
                results: [
                  createMockBlock("block-para", "paragraph", {
                    paragraph: {
                      rich_text: [createRichText("親ページの内容")],
                      color: "default",
                    },
                  }),
                  {
                    ...createMockBlock(childPageId, "child_page", {
                      child_page: { title: childTitle },
                    }),
                    has_children: true,
                  },
                ],
                has_more: false,
                next_cursor: null,
              });
            }
            // 子ページの内容
            return HttpResponse.json({
              object: "list",
              results: [
                createMockBlock("child-block", "paragraph", {
                  paragraph: {
                    rich_text: [createRichText("子ページの内容")],
                    color: "default",
                  },
                }),
              ],
              has_more: false,
              next_cursor: null,
            });
          },
        ),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(parentPageId, tempDir);

      // 親ページのファイル
      const parentFiles = await fs.readdir(tempDir);
      const parentMd = parentFiles.find((f) => f.endsWith(".md"));
      expect(parentMd).toBeDefined();

      const parentContent = await fs.readFile(
        path.join(tempDir, parentMd!),
        "utf-8",
      );
      expect(parentContent).toContain(`# ${parentTitle}`);
      expect(parentContent).toContain("親ページの内容");

      // 子ページ用のディレクトリ
      const childDir = parentFiles.find((f) => !f.endsWith(".md"));
      expect(childDir).toBeDefined();

      const childFiles = await fs.readdir(path.join(tempDir, childDir!));
      const childMd = childFiles.find((f) => f.endsWith(".md"));
      expect(childMd).toBeDefined();

      const childContent = await fs.readFile(
        path.join(tempDir, childDir!, childMd!),
        "utf-8",
      );
      expect(childContent).toContain(`# ${childTitle}`);
      expect(childContent).toContain("子ページの内容");
    });

    it("should handle page with properties (database record)", async () => {
      const pageId = "record-page-1234567890123456789012";
      const pageTitle = "タスクレコード";

      const pageWithProps = createMockPage(pageId, pageTitle, {
        Status: {
          id: "status",
          type: "select",
          select: { id: "done", name: "完了", color: "green" },
        },
        Priority: {
          id: "priority",
          type: "select",
          select: { id: "high", name: "高", color: "red" },
        },
      });

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(pageWithProps);
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      // includeProperties=trueでプロパティを含める
      await processPage(pageId, tempDir, 0, true);

      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");

      expect(content).toContain(`# ${pageTitle}`);
      expect(content).toContain("**Priority**: 高");
      expect(content).toContain("**Status**: 完了");
    });

    it("should handle table block", async () => {
      const pageId = "table-page-12345678901234567890123456";
      const pageTitle = "Table Test Page";
      const tableBlockId = "table-block-id-123";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(
          `${NOTION_API_BASE}/blocks/:blockId/children`,
          ({ params }) => {
            const { blockId } = params;
            if (blockId === pageId) {
              // ページ内にテーブルブロック
              return HttpResponse.json({
                object: "list",
                results: [
                  {
                    ...createMockBlock(tableBlockId, "table", {
                      table: {
                        table_width: 2,
                        has_column_header: true,
                        has_row_header: false,
                      },
                    }),
                    has_children: true,
                  },
                ],
                has_more: false,
                next_cursor: null,
              });
            }
            if (blockId === tableBlockId) {
              // テーブルの行
              return HttpResponse.json({
                object: "list",
                results: [
                  createMockBlock("row-1", "table_row", {
                    table_row: {
                      cells: [
                        [createRichText("ヘッダー1")],
                        [createRichText("ヘッダー2")],
                      ],
                    },
                  }),
                  createMockBlock("row-2", "table_row", {
                    table_row: {
                      cells: [
                        [createRichText("データ1")],
                        [createRichText("データ2")],
                      ],
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
          },
        ),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");

      // Markdownテーブル形式で出力されているか
      expect(content).toContain("| ヘッダー1 | ヘッダー2 |");
      expect(content).toContain("| --- | --- |");
      expect(content).toContain("| データ1 | データ2 |");
    });

    it("should handle image block with external URL", async () => {
      const pageId = "image-page-1234567890123456789012345";
      const pageTitle = "Image Test Page";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("image-block", "image", {
                image: {
                  type: "external",
                  external: { url: "https://example.com/image.png" },
                  caption: [createRichText("画像キャプション")],
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");

      expect(content).toContain(
        "![画像キャプション](https://example.com/image.png)",
      );
    });

    it("should handle page retrieval error gracefully", async () => {
      const pageId = "error-page-123456789012345678901234";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(
            {
              object: "error",
              status: 404,
              code: "object_not_found",
              message: "Page not found",
            },
            { status: 404 },
          );
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      // エラーが発生してもクラッシュしない
      await expect(processPage(pageId, tempDir)).resolves.toBeUndefined();

      // ファイルは作成されない
      const files = await fs.readdir(tempDir);
      expect(files.length).toBe(0);
    });

    it("should handle toggle block", async () => {
      const pageId = "toggle-page-1234567890123456789012345";
      const pageTitle = "Toggle Test Page";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("toggle-block", "toggle", {
                toggle: {
                  rich_text: [createRichText("トグルの見出し")],
                  color: "default",
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");

      expect(content).toContain("<details><summary>トグルの見出し</summary>");
      expect(content).toContain("</details>");
    });
  });

  describe("processDatabase", () => {
    it("should export database to CSV and process records", async () => {
      const databaseId = "test-db-123456789012345678901234567";
      const dbTitle = "タスク管理DB";

      const records = [
        createMockPage("record-1-234567890123456789012345", "タスクA", {
          Status: {
            id: "status",
            type: "select",
            select: { id: "done", name: "完了", color: "green" },
          },
        }),
        createMockPage("record-2-234567890123456789012345", "タスクB", {
          Status: {
            id: "status",
            type: "select",
            select: { id: "progress", name: "進行中", color: "yellow" },
          },
        }),
      ];

      server.use(
        http.get(`${NOTION_API_BASE}/databases/:databaseId`, () => {
          return HttpResponse.json(createMockDatabase(databaseId, dbTitle));
        }),
        http.post(`${NOTION_API_BASE}/data_sources/:dataSourceId/query`, () => {
          return HttpResponse.json({
            object: "list",
            results: records,
            has_more: false,
            next_cursor: null,
          });
        }),
        http.get(`${NOTION_API_BASE}/pages/:pageId`, ({ params }) => {
          const { pageId } = params;
          const record = records.find((r) => r.id === pageId);
          return HttpResponse.json(
            record || createMockPage(pageId as string, "Unknown"),
          );
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processDatabase } = await import("../notion-client.js");

      await processDatabase(databaseId, tempDir);

      // CSVファイルが作成されたか
      const files = await fs.readdir(tempDir);
      const csvFile = files.find((f) => f.endsWith(".csv"));
      expect(csvFile).toBeDefined();

      const csvContent = await fs.readFile(
        path.join(tempDir, csvFile!),
        "utf-8",
      );
      // ヘッダー行
      expect(csvContent).toContain("title");
      expect(csvContent).toContain("Status");
      // データ行
      expect(csvContent).toContain("タスクA");
      expect(csvContent).toContain("タスクB");

      // レコード用のディレクトリ
      const recordDir = files.find((f) => !f.endsWith(".csv"));
      expect(recordDir).toBeDefined();

      const recordFiles = await fs.readdir(path.join(tempDir, recordDir!));
      expect(recordFiles.length).toBe(2);

      // 各レコードのMarkdownファイル
      const mdFiles = recordFiles.filter((f) => f.endsWith(".md"));
      expect(mdFiles.length).toBe(2);
    });

    it("should handle empty database", async () => {
      const databaseId = "empty-db-12345678901234567890123456";
      const dbTitle = "空のDB";

      server.use(
        http.get(`${NOTION_API_BASE}/databases/:databaseId`, () => {
          return HttpResponse.json(createMockDatabase(databaseId, dbTitle));
        }),
        http.post(`${NOTION_API_BASE}/data_sources/:dataSourceId/query`, () => {
          return HttpResponse.json({
            object: "list",
            results: [],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processDatabase } = await import("../notion-client.js");

      await processDatabase(databaseId, tempDir);

      // ディレクトリは作成されるがCSVは空なので作成されない
      const files = await fs.readdir(tempDir);
      const dbDir = files.find((f) => f === "空のDB");
      expect(dbDir).toBeDefined();
    });

    it("should handle database retrieval error", async () => {
      const databaseId = "error-db-12345678901234567890123456";

      server.use(
        http.get(`${NOTION_API_BASE}/databases/:databaseId`, () => {
          return HttpResponse.json(
            {
              object: "error",
              status: 404,
              code: "object_not_found",
              message: "Database not found",
            },
            { status: 404 },
          );
        }),
      );

      vi.resetModules();
      const { processDatabase } = await import("../notion-client.js");

      // エラーが発生してもクラッシュしない
      await expect(
        processDatabase(databaseId, tempDir),
      ).resolves.toBeUndefined();
    });

    it("should handle CSV with special characters", async () => {
      const databaseId = "csv-special-123456789012345678901234";
      const dbTitle = "Special CSV DB";

      const records = [
        createMockPage(
          "record-special-12345678901234567890",
          "タスク,カンマ付き",
          {
            Note: {
              id: "note",
              type: "rich_text",
              rich_text: [createRichText('メモに"引用符"と\n改行')],
            },
          },
        ),
      ];

      server.use(
        http.get(`${NOTION_API_BASE}/databases/:databaseId`, () => {
          return HttpResponse.json(createMockDatabase(databaseId, dbTitle));
        }),
        http.post(`${NOTION_API_BASE}/data_sources/:dataSourceId/query`, () => {
          return HttpResponse.json({
            object: "list",
            results: records,
            has_more: false,
            next_cursor: null,
          });
        }),
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(records[0]);
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processDatabase } = await import("../notion-client.js");

      await processDatabase(databaseId, tempDir);

      const files = await fs.readdir(tempDir);
      const csvFile = files.find((f) => f.endsWith(".csv"));
      const csvContent = await fs.readFile(
        path.join(tempDir, csvFile!),
        "utf-8",
      );

      // カンマを含むフィールドは引用符で囲まれる
      expect(csvContent).toContain('"タスク,カンマ付き"');
      // 引用符はエスケープされる
      expect(csvContent).toContain('""引用符""');
    });
  });
});

// ============================================================
// downloadImage 関数のテスト（DOWNLOAD_IMAGES=true）
// ============================================================

describe("Notion Client - Image Download Tests", () => {
  let tempDir: string;

  beforeAll(() => {
    process.env.NOTION_API_KEY = "test-api-key-for-msw";
    // 画像ダウンロードを有効化
    process.env.DOWNLOAD_IMAGES = "true";
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "notion-sync-image-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("downloadImage via processPage", () => {
    it("should download image from Notion S3 URL", async () => {
      const pageId = "image-download-page-123456789012345";
      const pageTitle = "Image Download Test";
      const imageUuid = "abc123def456";
      const imageName = "test-image.png";
      const s3Url = `https://prod-files-secure.s3.us-west-2.amazonaws.com/workspace/${imageUuid}/${imageName}?X-Amz-Signature=xxx`;

      // 画像データ（1x1 PNG）
      const pngData = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
        0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("image-block", "image", {
                image: {
                  type: "file",
                  file: {
                    url: s3Url,
                    expiry_time: "2099-01-01T00:00:00.000Z",
                  },
                  caption: [createRichText("テスト画像")],
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
        // 画像ダウンロードのモック
        http.get("https://prod-files-secure.s3.us-west-2.amazonaws.com/*", () => {
          return new HttpResponse(pngData, {
            headers: { "Content-Type": "image/png" },
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      // imagesディレクトリが作成されているか
      const imagesDir = path.join(tempDir, "images");
      const imagesDirExists = await fs
        .access(imagesDir)
        .then(() => true)
        .catch(() => false);
      expect(imagesDirExists).toBe(true);

      // 画像ファイルが保存されているか
      const imageFiles = await fs.readdir(imagesDir);
      expect(imageFiles.length).toBe(1);
      expect(imageFiles[0]).toContain(imageName);

      // Markdownに相対パスが含まれているか
      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");
      expect(content).toContain("![テスト画像](images/");
    });

    it("should skip download if image already exists", async () => {
      const pageId = "image-skip-page-1234567890123456789";
      const pageTitle = "Image Skip Test";
      const imageUuid = "existing123";
      const imageName = "existing.png";
      const s3Url = `https://prod-files-secure.s3.us-west-2.amazonaws.com/workspace/${imageUuid}/${imageName}`;

      // 事前にimagesディレクトリと画像ファイルを作成
      const imagesDir = path.join(tempDir, "images");
      await fs.mkdir(imagesDir, { recursive: true });
      const existingImagePath = path.join(imagesDir, `${imageUuid}_${imageName}`);
      await fs.writeFile(existingImagePath, "existing image data");

      let downloadCalled = false;

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("image-block", "image", {
                image: {
                  type: "file",
                  file: {
                    url: s3Url,
                    expiry_time: "2099-01-01T00:00:00.000Z",
                  },
                  caption: [],
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
        http.get("https://prod-files-secure.s3.us-west-2.amazonaws.com/*", () => {
          downloadCalled = true;
          return new HttpResponse(Buffer.from("new image"), {
            headers: { "Content-Type": "image/png" },
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      // ダウンロードが呼ばれていないことを確認
      expect(downloadCalled).toBe(false);

      // 元のファイルがそのままか確認
      const content = await fs.readFile(existingImagePath, "utf-8");
      expect(content).toBe("existing image data");
    });

    it("should handle download error and return original URL", async () => {
      const pageId = "image-error-page-12345678901234567";
      const pageTitle = "Image Error Test";
      const s3Url = "https://prod-files-secure.s3.us-west-2.amazonaws.com/workspace/uuid/error.png";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("image-block", "image", {
                image: {
                  type: "file",
                  file: {
                    url: s3Url,
                    expiry_time: "2099-01-01T00:00:00.000Z",
                  },
                  caption: [],
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
        // 404エラーを返す
        http.get("https://prod-files-secure.s3.us-west-2.amazonaws.com/*", () => {
          return new HttpResponse(null, { status: 404 });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      // Markdownに元のURLが含まれているか（ダウンロード失敗時）
      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");
      expect(content).toContain(s3Url);
    });

    it("should handle URL with encoded filename", async () => {
      const pageId = "image-encoded-page-1234567890123456";
      const pageTitle = "Encoded Filename Test";
      const imageUuid = "encoded456";
      const encodedName = "%E6%97%A5%E6%9C%AC%E8%AA%9E.png"; // "日本語.png" encoded
      const s3Url = `https://prod-files-secure.s3.us-west-2.amazonaws.com/workspace/${imageUuid}/${encodedName}`;

      const pngData = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("image-block", "image", {
                image: {
                  type: "file",
                  file: {
                    url: s3Url,
                    expiry_time: "2099-01-01T00:00:00.000Z",
                  },
                  caption: [],
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
        http.get("https://prod-files-secure.s3.us-west-2.amazonaws.com/*", () => {
          return new HttpResponse(pngData, {
            headers: { "Content-Type": "image/png" },
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      // imagesディレクトリを確認
      const imagesDir = path.join(tempDir, "images");
      const imageFiles = await fs.readdir(imagesDir);
      expect(imageFiles.length).toBe(1);
      // デコードされた日本語ファイル名が含まれるか
      expect(imageFiles[0]).toContain("日本語.png");
    });

    it("should handle short URL path with fallback hash", async () => {
      const pageId = "image-short-url-page-123456789012";
      const pageTitle = "Short URL Test";
      // パスが短いURL（フォールバックでハッシュを使用）
      const shortUrl = "https://example.com/image.png";

      const pngData = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("image-block", "image", {
                image: {
                  type: "file",
                  file: {
                    url: shortUrl,
                    expiry_time: "2099-01-01T00:00:00.000Z",
                  },
                  caption: [],
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
        http.get("https://example.com/*", () => {
          return new HttpResponse(pngData, {
            headers: { "Content-Type": "image/png" },
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      // imagesディレクトリを確認
      const imagesDir = path.join(tempDir, "images");
      const imageFiles = await fs.readdir(imagesDir);
      expect(imageFiles.length).toBe(1);
      // ファイル名にimage.pngが含まれる
      expect(imageFiles[0]).toContain("image.png");
    });

    it("should sanitize dangerous characters in filename", async () => {
      const pageId = "image-sanitize-page-12345678901234";
      const pageTitle = "Sanitize Filename Test";
      const imageUuid = "sanitize789";
      // 危険な文字を含むファイル名
      const dangerousName = 'file<name>:"test*.png';
      const s3Url = `https://prod-files-secure.s3.us-west-2.amazonaws.com/workspace/${imageUuid}/${encodeURIComponent(dangerousName)}`;

      const pngData = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("image-block", "image", {
                image: {
                  type: "file",
                  file: {
                    url: s3Url,
                    expiry_time: "2099-01-01T00:00:00.000Z",
                  },
                  caption: [],
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
        http.get("https://prod-files-secure.s3.us-west-2.amazonaws.com/*", () => {
          return new HttpResponse(pngData, {
            headers: { "Content-Type": "image/png" },
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      // imagesディレクトリを確認
      const imagesDir = path.join(tempDir, "images");
      const imageFiles = await fs.readdir(imagesDir);
      expect(imageFiles.length).toBe(1);
      // 危険な文字がアンダースコアに置換されている
      expect(imageFiles[0]).not.toContain("<");
      expect(imageFiles[0]).not.toContain(">");
      expect(imageFiles[0]).not.toContain(":");
      expect(imageFiles[0]).not.toContain('"');
      expect(imageFiles[0]).not.toContain("*");
    });
  });
});

// ============================================================
// 追加のブランチカバレッジテスト
// ============================================================

describe("Notion Client - Additional Branch Coverage Tests", () => {
  let tempDir: string;

  beforeAll(() => {
    process.env.NOTION_API_KEY = "test-api-key-for-msw";
    process.env.DOWNLOAD_IMAGES = "false";
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "notion-sync-branch-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("getPagePropertiesMarkdown branches", () => {
    it("should return empty string when page has only title property", async () => {
      const pageId = "title-only-page-123456789012345678";
      const pageTitle = "Title Only Page";

      // タイトルのみのページ（他のプロパティなし）
      const pageWithOnlyTitle = createMockPage(pageId, pageTitle);
      // 余分なプロパティを削除（titleのみ残す）

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(pageWithOnlyTitle);
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      // includeProperties=true でもタイトルのみならプロパティ表示なし
      await processPage(pageId, tempDir, 0, true);

      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");

      // プロパティセクションの区切り線がない（タイトルのみなので）
      expect(content).not.toContain("---\n");
    });

    it("should handle page with properties that have empty values", async () => {
      const pageId = "empty-props-page-12345678901234567";
      const pageTitle = "Empty Props Page";

      // 値が空のプロパティを持つページ
      const pageWithEmptyProps = createMockPage(pageId, pageTitle, {
        EmptyText: {
          id: "empty-text",
          type: "rich_text",
          rich_text: [], // 空の配列
        },
        EmptySelect: {
          id: "empty-select",
          type: "select",
          select: null, // null
        },
      });

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(pageWithEmptyProps);
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir, 0, true);

      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");

      // 空のプロパティは表示されない
      expect(content).not.toContain("EmptyText");
      expect(content).not.toContain("EmptySelect");
    });
  });

  describe("convertTableBlock branches", () => {
    it("should handle empty table (no rows)", async () => {
      const pageId = "empty-table-page-1234567890123456";
      const pageTitle = "Empty Table Page";
      const tableBlockId = "empty-table-block-123";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(
          `${NOTION_API_BASE}/blocks/:blockId/children`,
          ({ params }) => {
            const { blockId } = params;
            if (blockId === pageId) {
              return HttpResponse.json({
                object: "list",
                results: [
                  {
                    ...createMockBlock(tableBlockId, "table", {
                      table: {
                        table_width: 2,
                        has_column_header: true,
                        has_row_header: false,
                      },
                    }),
                    has_children: true,
                  },
                ],
                has_more: false,
                next_cursor: null,
              });
            }
            if (blockId === tableBlockId) {
              // 空のテーブル（行がない）
              return HttpResponse.json({
                object: "list",
                results: [],
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
          },
        ),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");

      expect(content).toContain("[Empty Table]");
    });
  });

  describe("callout icon branches", () => {
    it("should use default emoji when callout has no icon", async () => {
      const pageId = "callout-no-icon-page-123456789012";
      const pageTitle = "Callout No Icon Page";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("callout-block", "callout", {
                callout: {
                  rich_text: [createRichText("アイコンなしコールアウト")],
                  icon: null, // アイコンなし
                  color: "default",
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");

      // デフォルトの💡が使われる
      expect(content).toContain("> 💡 アイコンなしコールアウト");
    });

    it("should use default emoji when callout icon is external type", async () => {
      const pageId = "callout-external-icon-page-12345";
      const pageTitle = "Callout External Icon Page";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("callout-block", "callout", {
                callout: {
                  rich_text: [createRichText("外部アイコンコールアウト")],
                  icon: {
                    type: "external",
                    external: { url: "https://example.com/icon.png" },
                  },
                  color: "default",
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");

      // 外部アイコンの場合もデフォルト💡が使われる
      expect(content).toContain("> 💡 外部アイコンコールアウト");
    });
  });

  describe("formatChildLink branches", () => {
    it("should handle child page without parent title", async () => {
      const pageId = "no-parent-title-page-123456789012";
      const childPageId = "child-page-no-parent-1234567890";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, ({ params }) => {
          const { pageId: pid } = params;
          if (pid === pageId) {
            // 空タイトルのページ
            return HttpResponse.json({
              ...createMockPage(pageId, ""),
              properties: {
                title: {
                  id: "title",
                  type: "title",
                  title: [], // 空のタイトル
                },
              },
            });
          }
          return HttpResponse.json(createMockPage(childPageId, "Child Page"));
        }),
        http.get(
          `${NOTION_API_BASE}/blocks/:blockId/children`,
          ({ params }) => {
            const { blockId } = params;
            if (blockId === pageId) {
              return HttpResponse.json({
                object: "list",
                results: [
                  {
                    ...createMockBlock(childPageId, "child_page", {
                      child_page: { title: "Child Page" },
                    }),
                    has_children: true,
                  },
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
          },
        ),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      // エラーなく完了することを確認
      const files = await fs.readdir(tempDir);
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe("processDatabase branches", () => {
    it("should handle database without data_sources", async () => {
      const databaseId = "no-datasource-db-12345678901234";
      const dbTitle = "No DataSource DB";

      // data_sourcesがないデータベース
      const dbWithoutDataSources = {
        object: "database",
        id: databaseId,
        created_time: "2024-01-01T00:00:00.000Z",
        last_edited_time: "2024-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-id" },
        last_edited_by: { object: "user", id: "user-id" },
        title: [createRichText(dbTitle)],
        description: [],
        icon: null,
        cover: null,
        properties: {},
        parent: { type: "workspace", workspace: true },
        url: `https://notion.so/${databaseId}`,
        public_url: null,
        archived: false,
        in_trash: false,
        is_inline: false,
        is_locked: false,
        data_sources: [], // 空の配列
      };

      server.use(
        http.get(`${NOTION_API_BASE}/databases/:databaseId`, () => {
          return HttpResponse.json(dbWithoutDataSources);
        }),
      );

      vi.resetModules();
      const { processDatabase } = await import("../notion-client.js");

      // エラーなく完了（data_sourcesがないのでスキップ）
      await expect(
        processDatabase(databaseId, tempDir),
      ).resolves.toBeUndefined();
    });

    it("should handle partial database response (no title)", async () => {
      const databaseId = "partial-db-123456789012345678901";

      // PartialDatabaseObjectResponse（titleがない）
      const partialDb = {
        object: "database",
        id: databaseId,
        // titleがない = PartialDatabaseObjectResponse
      };

      server.use(
        http.get(`${NOTION_API_BASE}/databases/:databaseId`, () => {
          return HttpResponse.json(partialDb);
        }),
      );

      vi.resetModules();
      const { processDatabase } = await import("../notion-client.js");

      // エラーなく完了（アクセス不可としてスキップ）
      await expect(
        processDatabase(databaseId, tempDir),
      ).resolves.toBeUndefined();
    });

    it("should handle database with Untitled name", async () => {
      const databaseId = "untitled-db-12345678901234567890";

      // タイトルが空のデータベース
      const dbWithEmptyTitle = {
        ...createMockDatabase(databaseId, ""),
        title: [], // 空の配列
      };

      server.use(
        http.get(`${NOTION_API_BASE}/databases/:databaseId`, () => {
          return HttpResponse.json(dbWithEmptyTitle);
        }),
        http.post(`${NOTION_API_BASE}/data_sources/:dataSourceId/query`, () => {
          return HttpResponse.json({
            object: "list",
            results: [],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processDatabase } = await import("../notion-client.js");

      await processDatabase(databaseId, tempDir);

      // "Untitled" フォルダが作成される
      const files = await fs.readdir(tempDir);
      expect(files).toContain("Untitled");
    });
  });

  describe("blocks.children.list pagination", () => {
    it("should handle pagination with multiple pages of blocks", async () => {
      const pageId = "paginated-blocks-page-12345678901";
      const pageTitle = "Paginated Blocks Page";

      let requestCount = 0;

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(
          `${NOTION_API_BASE}/blocks/:blockId/children`,
          ({ request }) => {
            const url = new URL(request.url);
            const cursor = url.searchParams.get("start_cursor");
            requestCount++;

            if (!cursor) {
              // 1ページ目
              return HttpResponse.json({
                object: "list",
                results: [
                  createMockBlock("block-1", "paragraph", {
                    paragraph: {
                      rich_text: [createRichText("段落1")],
                      color: "default",
                    },
                  }),
                ],
                has_more: true,
                next_cursor: "cursor-page-2",
              });
            } else if (cursor === "cursor-page-2") {
              // 2ページ目
              return HttpResponse.json({
                object: "list",
                results: [
                  createMockBlock("block-2", "paragraph", {
                    paragraph: {
                      rich_text: [createRichText("段落2")],
                      color: "default",
                    },
                  }),
                ],
                has_more: true,
                next_cursor: "cursor-page-3",
              });
            } else {
              // 3ページ目（最後）
              return HttpResponse.json({
                object: "list",
                results: [
                  createMockBlock("block-3", "paragraph", {
                    paragraph: {
                      rich_text: [createRichText("段落3")],
                      color: "default",
                    },
                  }),
                ],
                has_more: false,
                next_cursor: null,
              });
            }
          },
        ),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");

      // 3つの段落すべてが含まれている
      expect(content).toContain("段落1");
      expect(content).toContain("段落2");
      expect(content).toContain("段落3");

      // ページネーションが発生した（2回以上のリクエスト）
      // getPageChildrenが2回呼ばれる（fetchPageContentとchildPages取得）ので
      // 各呼び出しで3回ずつ = 6回以上
      expect(requestCount).toBeGreaterThanOrEqual(6);
    });
  });

  describe("unchecked todo block", () => {
    it("should handle unchecked todo item", async () => {
      const pageId = "unchecked-todo-page-123456789012345";
      const pageTitle = "Unchecked Todo Page";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("todo-block", "to_do", {
                to_do: {
                  rich_text: [createRichText("未完了タスク")],
                  checked: false, // 未チェック
                  color: "default",
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");

      // 未チェックのチェックボックス
      expect(content).toContain("[ ] 未完了タスク");
    });
  });

  describe("heading_3 block", () => {
    it("should handle heading_3 block", async () => {
      const pageId = "heading3-page-12345678901234567890";
      const pageTitle = "Heading3 Page";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("h3-block", "heading_3", {
                heading_3: {
                  rich_text: [createRichText("見出し3")],
                  color: "default",
                },
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");

      expect(content).toContain("### 見出し3");
    });
  });

  describe("unknown block type", () => {
    it("should handle unknown block type", async () => {
      const pageId = "unknown-block-page-1234567890123456";
      const pageTitle = "Unknown Block Page";

      server.use(
        http.get(`${NOTION_API_BASE}/pages/:pageId`, () => {
          return HttpResponse.json(createMockPage(pageId, pageTitle));
        }),
        http.get(`${NOTION_API_BASE}/blocks/:blockId/children`, () => {
          return HttpResponse.json({
            object: "list",
            results: [
              createMockBlock("unknown-block", "unsupported_block_type", {
                unsupported_block_type: {},
              }),
            ],
            has_more: false,
            next_cursor: null,
          });
        }),
      );

      vi.resetModules();
      const { processPage } = await import("../notion-client.js");

      await processPage(pageId, tempDir);

      const files = await fs.readdir(tempDir);
      const mdFile = files.find((f) => f.endsWith(".md"));
      const content = await fs.readFile(path.join(tempDir, mdFile!), "utf-8");

      // 不明なブロックタイプが括弧付きで表示される
      expect(content).toContain("[unsupported_block_type]");
    });
  });
});
