/**
 * Notion Sync ユニットテスト
 */
import { describe, it, expect } from "vitest";
import { richTextToMarkdown, getUserDisplayName, extractFormulaValue, extractRollupValue, sanitizeFilename, extractPropertyValue, getPageTitle } from "../utils.js";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

/**
 * RichTextItemResponse のモックを作成するヘルパー
 */
function createRichText(
  plainText: string,
  options: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    code?: boolean;
    underline?: boolean;
    href?: string | null;
  } = {}
): RichTextItemResponse {
  return {
    type: "text",
    text: {
      content: plainText,
      link: options.href ? { url: options.href } : null,
    },
    annotations: {
      bold: options.bold ?? false,
      italic: options.italic ?? false,
      strikethrough: options.strikethrough ?? false,
      underline: options.underline ?? false,
      code: options.code ?? false,
      color: "default",
    },
    plain_text: plainText,
    href: options.href ?? null,
  };
}

describe("sanitizeFilename", () => {
  // 正常系
  it("should return original string when no dangerous chars", () => {
    expect(sanitizeFilename("hello world")).toBe("hello world");
  });

  it("should handle Japanese characters", () => {
    expect(sanitizeFilename("日本語ファイル名")).toBe("日本語ファイル名");
  });

  // 危険な文字の除去
  it("should remove < and > characters", () => {
    expect(sanitizeFilename("file<name>")).toBe("filename");
  });

  it("should remove colon character", () => {
    expect(sanitizeFilename("file:name")).toBe("filename");
  });

  it("should remove double quote character", () => {
    expect(sanitizeFilename('file"name')).toBe("filename");
  });

  it("should remove forward slash character", () => {
    expect(sanitizeFilename("file/name")).toBe("filename");
  });

  it("should remove backslash character", () => {
    expect(sanitizeFilename("file\\name")).toBe("filename");
  });

  it("should remove pipe character", () => {
    expect(sanitizeFilename("file|name")).toBe("filename");
  });

  it("should remove question mark character", () => {
    expect(sanitizeFilename("file?name")).toBe("filename");
  });

  it("should remove asterisk character", () => {
    expect(sanitizeFilename("file*name")).toBe("filename");
  });

  it("should remove multiple dangerous characters", () => {
    expect(sanitizeFilename('<file:"name*>?')).toBe("filename");
  });

  // トリム
  it("should trim leading whitespace", () => {
    expect(sanitizeFilename("  filename")).toBe("filename");
  });

  it("should trim trailing whitespace", () => {
    expect(sanitizeFilename("filename  ")).toBe("filename");
  });

  it("should trim both leading and trailing whitespace", () => {
    expect(sanitizeFilename("  filename  ")).toBe("filename");
  });

  // エッジケース
  it("should return empty string for empty input", () => {
    expect(sanitizeFilename("")).toBe("");
  });

  it("should return empty string when only dangerous chars", () => {
    expect(sanitizeFilename('<>:"/\\|?*')).toBe("");
  });
});

describe("richTextToMarkdown", () => {
  // ============================================================
  // 基本ケース
  // ============================================================
  describe("basic cases", () => {
    it("should return empty string for empty array", () => {
      expect(richTextToMarkdown([])).toBe("");
    });

    it("should convert plain text without annotations", () => {
      const input = [createRichText("Hello World")];
      expect(richTextToMarkdown(input)).toBe("Hello World");
    });

    it("should join multiple text elements", () => {
      const input = [
        createRichText("Hello "),
        createRichText("World"),
      ];
      expect(richTextToMarkdown(input)).toBe("Hello World");
    });
  });

  // ============================================================
  // 単一アノテーション
  // ============================================================
  describe("single annotations", () => {
    it("should convert bold text", () => {
      const input = [createRichText("bold", { bold: true })];
      expect(richTextToMarkdown(input)).toBe("**bold**");
    });

    it("should convert italic text", () => {
      const input = [createRichText("italic", { italic: true })];
      expect(richTextToMarkdown(input)).toBe("*italic*");
    });

    it("should convert strikethrough text", () => {
      const input = [createRichText("deleted", { strikethrough: true })];
      expect(richTextToMarkdown(input)).toBe("~~deleted~~");
    });

    it("should convert code text", () => {
      const input = [createRichText("code", { code: true })];
      expect(richTextToMarkdown(input)).toBe("`code`");
    });

    it("should convert link", () => {
      const input = [createRichText("click here", { href: "https://example.com" })];
      expect(richTextToMarkdown(input)).toBe("[click here](https://example.com)");
    });
  });

  // ============================================================
  // 複合アノテーション（C1カバレッジ）
  // ============================================================
  describe("combined annotations", () => {
    it("should convert bold + italic text", () => {
      const input = [createRichText("bold italic", { bold: true, italic: true })];
      expect(richTextToMarkdown(input)).toBe("***bold italic***");
    });

    it("should convert bold + strikethrough text", () => {
      const input = [createRichText("bold deleted", { bold: true, strikethrough: true })];
      expect(richTextToMarkdown(input)).toBe("~~**bold deleted**~~");
    });

    it("should convert bold + code text", () => {
      const input = [createRichText("bold code", { bold: true, code: true })];
      expect(richTextToMarkdown(input)).toBe("`**bold code**`");
    });

    it("should convert italic + code text", () => {
      const input = [createRichText("italic code", { italic: true, code: true })];
      expect(richTextToMarkdown(input)).toBe("`*italic code*`");
    });

    it("should convert all annotations combined", () => {
      const input = [createRichText("all", { 
        bold: true, 
        italic: true, 
        strikethrough: true, 
        code: true 
      })];
      expect(richTextToMarkdown(input)).toBe("`~~***all***~~`");
    });

    it("should convert bold text with link", () => {
      const input = [createRichText("bold link", { bold: true, href: "https://example.com" })];
      expect(richTextToMarkdown(input)).toBe("[**bold link**](https://example.com)");
    });
  });

  // ============================================================
  // 複数要素の組み合わせ
  // ============================================================
  describe("multiple elements", () => {
    it("should handle mixed plain and formatted text", () => {
      const input = [
        createRichText("Hello "),
        createRichText("bold", { bold: true }),
        createRichText(" world"),
      ];
      expect(richTextToMarkdown(input)).toBe("Hello **bold** world");
    });

    it("should handle multiple links", () => {
      const input = [
        createRichText("Link1", { href: "https://a.com" }),
        createRichText(" and "),
        createRichText("Link2", { href: "https://b.com" }),
      ];
      expect(richTextToMarkdown(input)).toBe("[Link1](https://a.com) and [Link2](https://b.com)");
    });
  });
});

describe("getUserDisplayName", () => {
  it("should return name when name exists", () => {
    const user = { id: "user-123", name: "John Doe" };
    expect(getUserDisplayName(user)).toBe("John Doe");
  });

  it("should return email when name is null but person.email exists", () => {
    const user = { id: "user-123", name: null, person: { email: "john@example.com" } };
    expect(getUserDisplayName(user)).toBe("john@example.com");
  });

  it("should return email when name is undefined but person.email exists", () => {
    const user = { id: "user-123", person: { email: "john@example.com" } };
    expect(getUserDisplayName(user)).toBe("john@example.com");
  });

  it("should return id when name is empty string", () => {
    const user = { id: "user-123", name: "" };
    expect(getUserDisplayName(user)).toBe("user-123");
  });

  it("should return id when neither name nor email exists", () => {
    const user = { id: "user-123" };
    expect(getUserDisplayName(user)).toBe("user-123");
  });

  it("should return id when person exists but email is undefined", () => {
    const user = { id: "user-123", person: {} };
    expect(getUserDisplayName(user)).toBe("user-123");
  });
});

describe("extractFormulaValue", () => {
  // string type
  it("should return string value when type is string", () => {
    expect(extractFormulaValue({ type: "string", string: "hello" })).toBe("hello");
  });

  it("should return empty string when string is null", () => {
    expect(extractFormulaValue({ type: "string", string: null })).toBe("");
  });

  it("should return empty string when string is undefined", () => {
    expect(extractFormulaValue({ type: "string" })).toBe("");
  });

  // number type
  it("should return number as string when type is number", () => {
    expect(extractFormulaValue({ type: "number", number: 42 })).toBe("42");
  });

  it("should return '0' when number is 0", () => {
    expect(extractFormulaValue({ type: "number", number: 0 })).toBe("0");
  });

  it("should return empty string when number is null", () => {
    expect(extractFormulaValue({ type: "number", number: null })).toBe("");
  });

  // boolean type
  it("should return ✅ when boolean is true", () => {
    expect(extractFormulaValue({ type: "boolean", boolean: true })).toBe("✅");
  });

  it("should return ☐ when boolean is false", () => {
    expect(extractFormulaValue({ type: "boolean", boolean: false })).toBe("☐");
  });

  // date type
  it("should return date start when type is date", () => {
    expect(extractFormulaValue({ type: "date", date: { start: "2024-01-15" } })).toBe("2024-01-15");
  });

  it("should return empty string when date is null", () => {
    expect(extractFormulaValue({ type: "date", date: null })).toBe("");
  });

  // default case
  it("should return empty string for unknown type", () => {
    expect(extractFormulaValue({ type: "unknown" })).toBe("");
  });
});

describe("extractRollupValue", () => {
  // number type
  it("should return number as string when type is number", () => {
    expect(extractRollupValue({ type: "number", number: 42 })).toBe("42");
  });

  it("should return '0' when number is 0", () => {
    expect(extractRollupValue({ type: "number", number: 0 })).toBe("0");
  });

  it("should return empty string when number is null", () => {
    expect(extractRollupValue({ type: "number", number: null })).toBe("");
  });

  // array type
  it("should return item count when type is array", () => {
    expect(extractRollupValue({ type: "array", array: [1, 2, 3] })).toBe("(3 items)");
  });

  it("should return '(0 items)' for empty array", () => {
    expect(extractRollupValue({ type: "array", array: [] })).toBe("(0 items)");
  });

  it("should return '(0 items)' when array is undefined", () => {
    expect(extractRollupValue({ type: "array" })).toBe("(0 items)");
  });

  // default case
  it("should return empty string for unknown type", () => {
    expect(extractRollupValue({ type: "unknown" })).toBe("");
  });
});

describe("extractPropertyValue", () => {
  // title
  it("should extract title property", () => {
    const prop = { 
      type: "title" as const, 
      title: [createRichText("Hello"), createRichText(" World")], 
      id: "1" 
    };
    expect(extractPropertyValue(prop)).toBe("Hello World");
  });

  it("should return empty string for empty title", () => {
    const prop = { type: "title" as const, title: [], id: "1" };
    expect(extractPropertyValue(prop)).toBe("");
  });

  // rich_text
  it("should extract rich_text property", () => {
    const prop = { 
      type: "rich_text" as const, 
      rich_text: [createRichText("Some text")], 
      id: "1" 
    };
    expect(extractPropertyValue(prop)).toBe("Some text");
  });

  // number
  it("should extract number property", () => {
    const prop = { type: "number" as const, number: 42, id: "1" };
    expect(extractPropertyValue(prop)).toBe("42");
  });

  it("should return '0' for number 0", () => {
    const prop = { type: "number" as const, number: 0, id: "1" };
    expect(extractPropertyValue(prop)).toBe("0");
  });

  it("should return empty string for null number", () => {
    const prop = { type: "number" as const, number: null, id: "1" };
    expect(extractPropertyValue(prop)).toBe("");
  });

  // select
  it("should extract select property", () => {
    const prop = { type: "select" as const, select: { id: "1", name: "Option A", color: "blue" as const }, id: "1" };
    expect(extractPropertyValue(prop)).toBe("Option A");
  });

  it("should return empty string for null select", () => {
    const prop = { type: "select" as const, select: null, id: "1" };
    expect(extractPropertyValue(prop)).toBe("");
  });

  // multi_select
  it("should extract multi_select property", () => {
    const prop = { 
      type: "multi_select" as const, 
      multi_select: [
        { id: "1", name: "Tag1", color: "blue" as const },
        { id: "2", name: "Tag2", color: "red" as const }
      ], 
      id: "1" 
    };
    expect(extractPropertyValue(prop)).toBe("Tag1, Tag2");
  });

  // status
  it("should extract status property", () => {
    const prop = { type: "status" as const, status: { id: "1", name: "In Progress", color: "blue" as const }, id: "1" };
    expect(extractPropertyValue(prop)).toBe("In Progress");
  });

  it("should return empty string for null status", () => {
    const prop = { type: "status" as const, status: null, id: "1" };
    expect(extractPropertyValue(prop)).toBe("");
  });

  // date
  it("should return empty string for null date", () => {
    const prop = { type: "date" as const, date: null, id: "1" };
    expect(extractPropertyValue(prop)).toBe("");
  });

  it("should extract date with start only", () => {
    const prop = { type: "date" as const, date: { start: "2024-01-15", end: null, time_zone: null }, id: "1" };
    expect(extractPropertyValue(prop)).toBe("2024-01-15");
  });

  it("should extract date range with start and end", () => {
    const prop = { type: "date" as const, date: { start: "2024-01-15", end: "2024-01-20", time_zone: null }, id: "1" };
    expect(extractPropertyValue(prop)).toBe("2024-01-15 → 2024-01-20");
  });

  // checkbox
  it("should return ✅ for checked checkbox", () => {
    const prop = { type: "checkbox" as const, checkbox: true, id: "1" };
    expect(extractPropertyValue(prop)).toBe("✅");
  });

  it("should return ☐ for unchecked checkbox", () => {
    const prop = { type: "checkbox" as const, checkbox: false, id: "1" };
    expect(extractPropertyValue(prop)).toBe("☐");
  });

  // url
  it("should extract url property", () => {
    const prop = { type: "url" as const, url: "https://example.com", id: "1" };
    expect(extractPropertyValue(prop)).toBe("https://example.com");
  });

  it("should return empty string for null url", () => {
    const prop = { type: "url" as const, url: null, id: "1" };
    expect(extractPropertyValue(prop)).toBe("");
  });

  // email
  it("should extract email property", () => {
    const prop = { type: "email" as const, email: "test@example.com", id: "1" };
    expect(extractPropertyValue(prop)).toBe("test@example.com");
  });

  it("should return empty string for null email", () => {
    const prop = { type: "email" as const, email: null, id: "1" };
    expect(extractPropertyValue(prop)).toBe("");
  });

  // phone_number
  it("should extract phone_number property", () => {
    const prop = { type: "phone_number" as const, phone_number: "+1-234-567-8900", id: "1" };
    expect(extractPropertyValue(prop)).toBe("+1-234-567-8900");
  });

  it("should return empty string for null phone_number", () => {
    const prop = { type: "phone_number" as const, phone_number: null, id: "1" };
    expect(extractPropertyValue(prop)).toBe("");
  });

  // relation
  it("should return relation count", () => {
    const prop = { type: "relation" as const, relation: [{ id: "a" }, { id: "b" }], has_more: false, id: "1" };
    expect(extractPropertyValue(prop)).toBe("(2 items)");
  });

  // people
  it("should extract people names", () => {
    const prop = { 
      type: "people" as const, 
      people: [
        { object: "user" as const, id: "user-1", name: "Alice" },
        { object: "user" as const, id: "user-2", name: "Bob" }
      ], 
      id: "1" 
    };
    expect(extractPropertyValue(prop)).toBe("Alice, Bob");
  });

  it("should return empty string for empty people array", () => {
    const prop = { type: "people" as const, people: [], id: "1" };
    expect(extractPropertyValue(prop)).toBe("");
  });

  // formula (via extractPropertyValue)
  it("should extract formula string value", () => {
    const prop = { 
      type: "formula" as const, 
      formula: { type: "string" as const, string: "calculated" }, 
      id: "1" 
    };
    expect(extractPropertyValue(prop)).toBe("calculated");
  });

  it("should extract formula number value", () => {
    const prop = { 
      type: "formula" as const, 
      formula: { type: "number" as const, number: 100 }, 
      id: "1" 
    };
    expect(extractPropertyValue(prop)).toBe("100");
  });

  // rollup (via extractPropertyValue)
  it("should extract rollup number value", () => {
    const prop = { 
      type: "rollup" as const, 
      rollup: { type: "number" as const, number: 50, function: "sum" as const }, 
      id: "1" 
    };
    expect(extractPropertyValue(prop)).toBe("50");
  });

  it("should extract rollup array count", () => {
    const prop = { 
      type: "rollup" as const, 
      rollup: { 
        type: "array" as const, 
        array: [
          { type: "number" as const, number: 1 },
          { type: "number" as const, number: 2 },
          { type: "number" as const, number: 3 }
        ], 
        function: "show_original" as const 
      }, 
      id: "1" 
    };
    expect(extractPropertyValue(prop)).toBe("(3 items)");
  });

  // created_by
  it("should extract created_by user name", () => {
    const prop = { 
      type: "created_by" as const, 
      created_by: { object: "user" as const, id: "user-123", name: "Creator" }, 
      id: "1" 
    };
    expect(extractPropertyValue(prop)).toBe("Creator");
  });

  // last_edited_by
  it("should extract last_edited_by user name", () => {
    const prop = { 
      type: "last_edited_by" as const, 
      last_edited_by: { object: "user" as const, id: "user-456", name: "Editor" }, 
      id: "1" 
    };
    expect(extractPropertyValue(prop)).toBe("Editor");
  });

  // created_time
  it("should extract created_time (first 10 chars)", () => {
    const prop = { type: "created_time" as const, created_time: "2024-01-15T10:30:00.000Z", id: "1" };
    expect(extractPropertyValue(prop)).toBe("2024-01-15");
  });

  // last_edited_time
  it("should extract last_edited_time (first 10 chars)", () => {
    const prop = { type: "last_edited_time" as const, last_edited_time: "2024-01-20T15:45:00.000Z", id: "1" };
    expect(extractPropertyValue(prop)).toBe("2024-01-20");
  });

  // files
  it("should return files count", () => {
    const prop = { 
      type: "files" as const, 
      files: [
        { name: "a.pdf", type: "external" as const, external: { url: "https://example.com/a.pdf" } },
        { name: "b.png", type: "external" as const, external: { url: "https://example.com/b.png" } }
      ], 
      id: "1" 
    };
    expect(extractPropertyValue(prop)).toBe("(2 files)");
  });

  // default (unknown type)
  it("should return type name in brackets for unknown type", () => {
    const prop = { type: "unknown_type" } as unknown as Parameters<typeof extractPropertyValue>[0];
    expect(extractPropertyValue(prop)).toBe("[unknown_type]");
  });
});

describe("getPageTitle", () => {
  /**
   * PageObjectResponse のモックを作成するヘルパー
   */
  function createMockPage(properties: PageObjectResponse["properties"]): PageObjectResponse {
    return {
      object: "page",
      id: "page-123",
      created_time: "2024-01-15T00:00:00.000Z",
      last_edited_time: "2024-01-15T00:00:00.000Z",
      created_by: { object: "user", id: "user-1" },
      last_edited_by: { object: "user", id: "user-1" },
      cover: null,
      icon: null,
      parent: { type: "workspace", workspace: true },
      archived: false,
      in_trash: false,
      properties,
      url: "https://notion.so/page-123",
      public_url: null,
    } as PageObjectResponse;
  }

  it("should return title when title property exists with content", () => {
    const page = createMockPage({
      Name: {
        type: "title",
        title: [createRichText("My Page Title")],
        id: "title-prop",
      },
    });
    expect(getPageTitle(page)).toBe("My Page Title");
  });

  it("should return first title element's plain_text only", () => {
    const page = createMockPage({
      Name: {
        type: "title",
        title: [createRichText("First"), createRichText(" Second")],
        id: "title-prop",
      },
    });
    expect(getPageTitle(page)).toBe("First");
  });

  it("should return 'Untitled' when title array is empty", () => {
    const page = createMockPage({
      Name: {
        type: "title",
        title: [],
        id: "title-prop",
      },
    });
    expect(getPageTitle(page)).toBe("Untitled");
  });

  it("should return 'Untitled' when plain_text is empty string", () => {
    const page = createMockPage({
      Name: {
        type: "title",
        title: [createRichText("")],
        id: "title-prop",
      },
    });
    expect(getPageTitle(page)).toBe("Untitled");
  });

  it("should return 'Untitled' when no title property exists", () => {
    const page = createMockPage({
      Status: {
        type: "status",
        status: { id: "1", name: "Done", color: "green" },
        id: "status-prop",
      },
    });
    expect(getPageTitle(page)).toBe("Untitled");
  });

  it("should return 'Untitled' when properties is empty", () => {
    const page = createMockPage({});
    expect(getPageTitle(page)).toBe("Untitled");
  });
});

describe("blockToMarkdown", () => {
  it.todo("should convert paragraph block");
  it.todo("should convert heading blocks");
  it.todo("should convert list items");
  it.todo("should convert code block");
});
