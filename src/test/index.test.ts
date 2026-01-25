/**
 * Notion Sync ユニットテスト
 */
import { describe, it, expect } from "vitest";
import { richTextToMarkdown } from "../utils.js";
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
  it.todo("should remove dangerous characters");
  it.todo("should trim whitespace");
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

describe("extractPropertyValue", () => {
  it.todo("should extract title property");
  it.todo("should extract rich_text property");
  it.todo("should extract number property");
  it.todo("should extract select property");
  it.todo("should extract date property");
  it.todo("should extract checkbox property");
});

describe("blockToMarkdown", () => {
  it.todo("should convert paragraph block");
  it.todo("should convert heading blocks");
  it.todo("should convert list items");
  it.todo("should convert code block");
});
