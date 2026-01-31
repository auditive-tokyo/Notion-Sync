/**
 * ユーティリティ関数（純粋関数）
 * テスト可能な関数をここに集約
 */
import type {
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

// プロパティの型定義
export type PropertyValueType = PageObjectResponse["properties"][string];

// ============================================================
// 文字列操作
// ============================================================

/**
 * ファイル名として安全な文字列に変換
 */
export function sanitizeFilename(name: string): string {
  // 危険な文字を除去
  return name.replace(/[<>:"/\\|?*]/g, "").trim();
}

// ============================================================
// リッチテキスト変換
// ============================================================

/**
 * リッチテキストをMarkdownに変換
 */
export function richTextToMarkdown(richTexts: RichTextItemResponse[]): string {
  const result: string[] = [];

  for (const text of richTexts) {
    let content = text.plain_text;
    const annotations = text.annotations;

    if (annotations.bold) {
      content = `**${content}**`;
    }
    if (annotations.italic) {
      content = `*${content}*`;
    }
    if (annotations.strikethrough) {
      content = `~~${content}~~`;
    }
    if (annotations.code) {
      content = `\`${content}\``;
    }

    if (text.href) {
      content = `[${content}](${text.href})`;
    }

    result.push(content);
  }

  return result.join("");
}

// ============================================================
// プロパティ値抽出
// ============================================================

/**
 * ユーザー情報から名前を取得
 */
export function getUserDisplayName(user: { id: string; name?: string | null; person?: { email?: string } }): string {
  if ("name" in user && user.name) {
    return user.name;
  }
  if ("person" in user && user.person?.email) {
    return user.person.email;
  }
  return user.id;
}

/**
 * Formula型プロパティの値を抽出
 */
export function extractFormulaValue(formula: { type: string; string?: string | null; number?: number | null; boolean?: boolean | null; date?: { start: string } | null }): string {
  switch (formula.type) {
    case "string":
      return formula.string ?? "";
    case "number":
      return formula.number !== null ? String(formula.number) : "";
    case "boolean":
      return formula.boolean ? "✅" : "☐";
    case "date":
      return formula.date?.start ?? "";
    default:
      return "";
  }
}

/**
 * Rollup型プロパティの値を抽出
 */
export function extractRollupValue(rollup: { type: string; number?: number | null; array?: unknown[] }): string {
  switch (rollup.type) {
    case "number":
      return rollup.number !== null ? String(rollup.number) : "";
    case "array":
      return `(${rollup.array?.length ?? 0} items)`;
    default:
      return "";
  }
}

/**
 * プロパティの値を文字列として抽出
 */
export function extractPropertyValue(prop: PropertyValueType): string {
  switch (prop.type) {
    case "title":
      return prop.title.map((t) => t.plain_text).join("");
    case "rich_text":
      return prop.rich_text.map((t) => t.plain_text).join("");
    case "number":
      return prop.number !== null ? String(prop.number) : "";
    case "select":
      return prop.select?.name ?? "";
    case "multi_select":
      return prop.multi_select.map((o) => o.name).join(", ");
    case "status":
      return prop.status?.name ?? "";
    case "date": {
      if (!prop.date) return "";
      return prop.date.end ? `${prop.date.start} → ${prop.date.end}` : prop.date.start;
    }
    case "people":
      return prop.people.map(getUserDisplayName).filter(Boolean).join(", ");
    case "checkbox":
      return prop.checkbox ? "✅" : "☐";
    case "url":
      return prop.url ?? "";
    case "email":
      return prop.email ?? "";
    case "phone_number":
      return prop.phone_number ?? "";
    case "formula":
      return extractFormulaValue(prop.formula);
    case "relation":
      return `(${prop.relation.length} items)`;
    case "rollup":
      return extractRollupValue(prop.rollup);
    case "created_time":
      return prop.created_time.slice(0, 10);
    case "created_by":
      return getUserDisplayName(prop.created_by);
    case "last_edited_time":
      return prop.last_edited_time.slice(0, 10);
    case "last_edited_by":
      return getUserDisplayName(prop.last_edited_by);
    case "files":
      return `(${prop.files.length} files)`;
    default:
      return `[${(prop as { type: string }).type}]`;
  }
}

// ============================================================
// ページ情報取得
// ============================================================

/**
 * ページタイトルを取得
 */
export function getPageTitle(page: PageObjectResponse): string {
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
