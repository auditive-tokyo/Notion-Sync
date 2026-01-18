# scripts/fetch_from_notion.py
"""
Notion APIからページを取得してMarkdownに変換するスクリプト
"""
import os
import re
import csv
import hashlib
import requests
from pathlib import Path
from urllib.parse import urlparse, unquote
from notion_client import Client

notion = Client(auth=os.environ["NOTION_API_KEY"])
ROOT_PAGE_ID = os.environ.get("NOTION_ROOT_PAGE_ID", "")
OUTPUT_DIR = Path("root_page")
DOWNLOAD_IMAGES = os.environ.get("DOWNLOAD_IMAGES", "true").lower() == "true"


def get_page_title(page: dict) -> str:
    """ページタイトルを取得"""
    props = page.get("properties", {})
    
    # タイトルプロパティを探す
    for prop in props.values():
        if prop.get("type") == "title":
            title_list = prop.get("title", [])
            if title_list:
                return title_list[0].get("plain_text", "Untitled")
    
    return "Untitled"


def extract_property_value(prop: dict) -> str:
    """プロパティの値を文字列として抽出"""
    prop_type = prop.get("type")
    
    if prop_type == "title":
        titles = prop.get("title", [])
        return "".join([t.get("plain_text", "") for t in titles])
    
    elif prop_type == "rich_text":
        texts = prop.get("rich_text", [])
        return "".join([t.get("plain_text", "") for t in texts])
    
    elif prop_type == "number":
        num = prop.get("number")
        return str(num) if num is not None else ""
    
    elif prop_type == "select":
        select = prop.get("select")
        return select.get("name", "") if select else ""
    
    elif prop_type == "multi_select":
        options = prop.get("multi_select", [])
        return ", ".join([o.get("name", "") for o in options])
    
    elif prop_type == "status":
        status = prop.get("status")
        return status.get("name", "") if status else ""
    
    elif prop_type == "date":
        date = prop.get("date")
        if date:
            start = date.get("start", "")
            end = date.get("end")
            if end:
                return f"{start} → {end}"
            return start
        return ""
    
    elif prop_type == "people":
        people = prop.get("people", [])
        names = []
        for p in people:
            name = p.get("name") or p.get("person", {}).get("email", "")
            if name:
                names.append(name)
        return ", ".join(names)
    
    elif prop_type == "checkbox":
        checked = prop.get("checkbox", False)
        return "✅" if checked else "☐"
    
    elif prop_type == "url":
        return prop.get("url", "") or ""
    
    elif prop_type == "email":
        return prop.get("email", "") or ""
    
    elif prop_type == "phone_number":
        return prop.get("phone_number", "") or ""
    
    elif prop_type == "formula":
        formula = prop.get("formula", {})
        formula_type = formula.get("type")
        if formula_type == "string":
            return formula.get("string", "") or ""
        elif formula_type == "number":
            num = formula.get("number")
            return str(num) if num is not None else ""
        elif formula_type == "boolean":
            return "✅" if formula.get("boolean") else "☐"
        elif formula_type == "date":
            date = formula.get("date")
            return date.get("start", "") if date else ""
        return ""
    
    elif prop_type == "relation":
        relations = prop.get("relation", [])
        return f"({len(relations)} items)"
    
    elif prop_type == "rollup":
        rollup = prop.get("rollup", {})
        rollup_type = rollup.get("type")
        if rollup_type == "number":
            num = rollup.get("number")
            return str(num) if num is not None else ""
        elif rollup_type == "array":
            return f"({len(rollup.get('array', []))} items)"
        return ""
    
    elif prop_type == "created_time":
        return prop.get("created_time", "")[:10]  # 日付部分のみ
    
    elif prop_type == "created_by":
        user = prop.get("created_by", {})
        return user.get("name", "") or user.get("id", "")
    
    elif prop_type == "last_edited_time":
        return prop.get("last_edited_time", "")[:10]  # 日付部分のみ
    
    elif prop_type == "last_edited_by":
        user = prop.get("last_edited_by", {})
        return user.get("name", "") or user.get("id", "")
    
    elif prop_type == "files":
        files = prop.get("files", [])
        return f"({len(files)} files)"
    
    else:
        return f"[{prop_type}]"


def download_image(url: str, output_dir: Path) -> str:
    """画像をダウンロードしてローカルパスを返す"""
    try:
        # URLから画像情報を抽出
        parsed = urlparse(url)
        path_parts = parsed.path.split("/")
        
        # Notion S3 URLの形式: /.../uuid/filename
        if len(path_parts) >= 2:
            image_uuid = path_parts[-2] if len(path_parts) >= 2 else "unknown"
            original_name = unquote(path_parts[-1])
        else:
            # フォールバック: URLのハッシュを使用
            image_uuid = hashlib.md5(url.encode()).hexdigest()[:12]
            original_name = "image.png"
        
        # ファイル名を生成: uuid_originalname
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', original_name)
        filename = f"{image_uuid}_{safe_name}"
        
        # imagesディレクトリを作成
        images_dir = output_dir / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        
        image_path = images_dir / filename
        
        # 既に存在する場合はダウンロードをスキップ
        if image_path.exists():
            print(f"    ⏭️ 画像スキップ（既存）: {filename}")
            return f"images/{filename}"
        
        # ダウンロード
        print(f"    📥 画像ダウンロード: {filename}")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        with open(image_path, "wb") as f:
            f.write(response.content)
        
        return f"images/{filename}"
    
    except Exception as e:
        print(f"    ⚠️ 画像ダウンロードエラー: {e}")
        return url  # 失敗時は元のURLを返す


def get_page_properties_markdown(page: dict) -> str:
    """ページのプロパティをMarkdownテーブルとして取得（横並び形式）"""
    props = page.get("properties", {})
    
    if not props:
        return ""
    
    # タイトル以外のプロパティを抽出（名前でソート）
    prop_items = []
    for name, prop in props.items():
        if prop.get("type") == "title":
            continue  # タイトルはスキップ（見出しで表示済み）
        
        value = extract_property_value(prop)
        if value:  # 値があるものだけ表示
            # テーブル内のパイプをエスケープ
            name = name.replace("|", "\\|")
            value = value.replace("|", "\\|")
            prop_items.append((name, value))
    
    if not prop_items:
        return ""
    
    # プロパティ名でソート
    prop_items.sort(key=lambda x: x[0])
    
    # 横並びMarkdownテーブル形式
    headers = [item[0] for item in prop_items]
    values = [item[1] for item in prop_items]
    
    header_row = "| " + " | ".join(headers) + " |"
    separator = "| " + " | ".join(["---"] * len(headers)) + " |"
    value_row = "| " + " | ".join(values) + " |"
    
    table = f"{header_row}\n{separator}\n{value_row}\n\n---\n"
    
    return table


def get_page_children(page_id: str) -> list:
    """子ページ一覧を取得"""
    children = []
    cursor = None
    
    while True:
        response = notion.blocks.children.list(
            block_id=page_id,
            start_cursor=cursor
        )
        children.extend(response.get("results", []))
        
        if not response.get("has_more"):
            break
        cursor = response.get("next_cursor")
    
    return children


def get_page_comments(page_id: str) -> str:
    """ページのコメントを取得してMarkdownに変換"""
    try:
        comments = []
        cursor = None
        
        while True:
            response = notion.comments.list(
                block_id=page_id,
                start_cursor=cursor
            )
            comments.extend(response.get("results", []))
            
            if not response.get("has_more"):
                break
            cursor = response.get("next_cursor")
        
        if not comments:
            return ""
        
        # コメントをMarkdown形式に変換
        comment_lines = ["## 💬 コメント\n"]
        
        for comment in comments:
            # ユーザー情報
            created_by = comment.get("created_by", {})
            user_name = created_by.get("name") or created_by.get("id", "Unknown")
            
            # 日時
            created_time = comment.get("created_time", "")[:10]
            
            # コメント本文
            rich_text = comment.get("rich_text", [])
            content = "".join([t.get("plain_text", "") for t in rich_text])
            
            # 複数行コメントの場合、各行を引用形式に
            content_lines = content.split("\n")
            formatted_content = "\n> ".join(content_lines)
            
            comment_lines.append(f"> **{user_name}** ({created_time}): {formatted_content}\n")
        
        comment_lines.append("\n---\n")
        return "\n".join(comment_lines)
    
    except Exception as e:
        # コメント取得に失敗しても処理を続行
        print(f"    ⚠️ Could not fetch comments: {e}")
        return ""


def block_to_markdown(block: dict, output_dir: Path = None, parent_title: str = None) -> str:
    """ブロックをMarkdownに変換"""
    block_type = block.get("type")
    
    if block_type == "paragraph":
        texts = block.get("paragraph", {}).get("rich_text", [])
        return rich_text_to_markdown(texts) + "\n"
    
    elif block_type == "heading_1":
        texts = block.get("heading_1", {}).get("rich_text", [])
        return f"# {rich_text_to_markdown(texts)}\n"
    
    elif block_type == "heading_2":
        texts = block.get("heading_2", {}).get("rich_text", [])
        return f"## {rich_text_to_markdown(texts)}\n"
    
    elif block_type == "heading_3":
        texts = block.get("heading_3", {}).get("rich_text", [])
        return f"### {rich_text_to_markdown(texts)}\n"
    
    elif block_type == "bulleted_list_item":
        texts = block.get("bulleted_list_item", {}).get("rich_text", [])
        return f"- {rich_text_to_markdown(texts)}\n"
    
    elif block_type == "numbered_list_item":
        texts = block.get("numbered_list_item", {}).get("rich_text", [])
        return f"1. {rich_text_to_markdown(texts)}\n"
    
    elif block_type == "to_do":
        texts = block.get("to_do", {}).get("rich_text", [])
        checked = block.get("to_do", {}).get("checked", False)
        checkbox = "[x]" if checked else "[ ]"
        return f"- {checkbox} {rich_text_to_markdown(texts)}\n"
    
    elif block_type == "toggle":
        texts = block.get("toggle", {}).get("rich_text", [])
        return f"<details><summary>{rich_text_to_markdown(texts)}</summary>\n</details>\n"
    
    elif block_type == "code":
        texts = block.get("code", {}).get("rich_text", [])
        language = block.get("code", {}).get("language", "")
        code = rich_text_to_markdown(texts)
        return f"```{language}\n{code}\n```\n"
    
    elif block_type == "quote":
        texts = block.get("quote", {}).get("rich_text", [])
        return f"> {rich_text_to_markdown(texts)}\n"
    
    elif block_type == "divider":
        return "---\n"
    
    elif block_type == "callout":
        texts = block.get("callout", {}).get("rich_text", [])
        icon = block.get("callout", {}).get("icon", {})
        emoji = icon.get("emoji", "💡") if icon else "💡"
        return f"> {emoji} {rich_text_to_markdown(texts)}\n"
    
    elif block_type == "child_page":
        title = block.get("child_page", {}).get("title", "Untitled")
        child_id = block.get("id", "").replace("-", "")
        if parent_title and child_id:
            safe_parent = sanitize_filename(parent_title)
            safe_title = sanitize_filename(title)
            # スペースを%20にエンコード
            link_path = f"{safe_parent}/{safe_title}%20{child_id}.md"
            return f"📄 [{title}]({link_path})\n"
        return f"📄 [{title}]\n"
    
    elif block_type == "child_database":
        title = block.get("child_database", {}).get("title", "Untitled")
        child_id = block.get("id", "").replace("-", "")
        if parent_title and child_id:
            safe_parent = sanitize_filename(parent_title)
            safe_title = sanitize_filename(title)
            # DBのCSVファイルへのリンク
            link_path = f"{safe_parent}/{safe_title}%20{child_id}.csv"
            return f"🗄️ [{title}]({link_path})\n"
        return f"🗄️ [{title}]\n"
    
    elif block_type == "image":
        image = block.get("image", {})
        image_type = image.get("type")
        if image_type == "external":
            url = image.get("external", {}).get("url", "")
            # 外部URLはそのまま使用
            image_path = url
        else:
            url = image.get("file", {}).get("url", "")
            # Notion内部画像はダウンロード（有効時）
            if DOWNLOAD_IMAGES and output_dir and url:
                image_path = download_image(url, output_dir)
            else:
                image_path = url
        caption = rich_text_to_markdown(image.get("caption", []))
        return f"![{caption}]({image_path})\n"
    
    elif block_type == "bookmark":
        url = block.get("bookmark", {}).get("url", "")
        return f"🔗 {url}\n"
    
    elif block_type == "table":
        # テーブルの子行を取得してMarkdownテーブルに変換
        return convert_table_block(block)
    
    else:
        return f"[{block_type}]\n"


def convert_table_block(block: dict) -> str:
    """テーブルブロックをMarkdownテーブルに変換"""
    block_id = block.get("id")
    table_info = block.get("table", {})
    has_column_header = table_info.get("has_column_header", False)
    has_row_header = table_info.get("has_row_header", False)
    
    try:
        # テーブルの子ブロック（table_row）を取得
        rows_response = notion.blocks.children.list(block_id=block_id)
        rows = rows_response.get("results", [])
        
        if not rows:
            return "[Empty Table]\n"
        
        md_rows = []
        for i, row in enumerate(rows):
            if row.get("type") != "table_row":
                continue
            
            cells = row.get("table_row", {}).get("cells", [])
            cell_texts = []
            for cell in cells:
                cell_text = rich_text_to_markdown(cell)
                # パイプ文字をエスケープ
                cell_text = cell_text.replace("|", "\\|")
                cell_texts.append(cell_text)
            
            md_row = "| " + " | ".join(cell_texts) + " |"
            md_rows.append(md_row)
            
            # 1行目の後にヘッダー区切りを追加
            if i == 0:
                separator = "| " + " | ".join(["---"] * len(cell_texts)) + " |"
                md_rows.append(separator)
        
        return "\n".join(md_rows) + "\n\n"
    
    except Exception as e:
        print(f"  ⚠️ テーブル変換エラー: {e}")
        return "[Table conversion error]\n"


def rich_text_to_markdown(rich_texts: list) -> str:
    """リッチテキストをMarkdownに変換"""
    result = []
    for text in rich_texts:
        content = text.get("plain_text", "")
        annotations = text.get("annotations", {})
        
        if annotations.get("bold"):
            content = f"**{content}**"
        if annotations.get("italic"):
            content = f"*{content}*"
        if annotations.get("strikethrough"):
            content = f"~~{content}~~"
        if annotations.get("code"):
            content = f"`{content}`"
        
        href = text.get("href")
        if href:
            content = f"[{content}]({href})"
        
        result.append(content)
    
    return "".join(result)


def sanitize_filename(name: str) -> str:
    """ファイル名として安全な文字列に変換"""
    # 危険な文字を除去
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    return name.strip()


def fetch_page_content(page_id: str, output_dir: Path = None, parent_title: str = None) -> str:
    """ページの本文を取得してMarkdownに変換"""
    blocks = get_page_children(page_id)
    content_lines = []
    
    for block in blocks:
        md = block_to_markdown(block, output_dir, parent_title)
        content_lines.append(md)
    
    return "\n".join(content_lines)


def process_page(page_id: str, output_path: Path, depth: int = 0, include_properties: bool = False):
    """ページを処理して保存"""
    try:
        page = notion.pages.retrieve(page_id=page_id)
    except Exception as e:
        print(f"  Error fetching page {page_id}: {e}")
        return
    
    title = get_page_title(page)
    page_id_short = page_id.replace("-", "")
    
    # ファイル名: タイトル + page_id（Notionエクスポート形式に合わせる）
    filename = f"{sanitize_filename(title)} {page_id_short}.md"
    filepath = output_path / filename
    
    print(f"{'  ' * depth}📄 {title}")
    
    # ページ内容を取得（output_pathとtitleを渡してリンク生成用に）
    content = fetch_page_content(page_id, output_path, title)
    
    # コメントを取得
    comments_md = get_page_comments(page_id)
    
    # プロパティテーブルを追加（DBレコードの場合）
    properties_md = ""
    if include_properties:
        properties_md = get_page_properties_markdown(page)
    
    markdown = f"# {title}\n\n{properties_md}{comments_md}{content}"
    
    # ファイル保存
    filepath.parent.mkdir(parents=True, exist_ok=True)
    filepath.write_text(markdown, encoding="utf-8")
    
    # 子ページを探索
    blocks = get_page_children(page_id)
    child_pages = [b for b in blocks if b.get("type") in ("child_page", "child_database")]
    
    if child_pages:
        # 子ページ用のフォルダを作成
        child_dir = output_path / sanitize_filename(title)
        child_dir.mkdir(parents=True, exist_ok=True)
        
        for child in child_pages:
            child_id = child.get("id")
            if child.get("type") == "child_page":
                process_page(child_id, child_dir, depth + 1)
            elif child.get("type") == "child_database":
                process_database(child_id, child_dir, depth + 1)


def process_database(database_id: str, output_path: Path, depth: int = 0):
    """データベースを処理"""
    try:
        db = notion.databases.retrieve(database_id=database_id)
    except Exception as e:
        print(f"  Error fetching database {database_id}: {e}")
        return
    
    title = db.get("title", [{}])[0].get("plain_text", "Untitled")
    db_id_short = database_id.replace("-", "")
    
    print(f"{'  ' * depth}🗄️ {title}")
    
    # データベースのレコードを取得
    records = []
    cursor = None
    
    while True:
        response = notion.databases.query(
            database_id=database_id,
            start_cursor=cursor
        )
        records.extend(response.get("results", []))
        
        if not response.get("has_more"):
            break
        cursor = response.get("next_cursor")
    
    # フォルダ作成
    db_dir = output_path / sanitize_filename(title)
    db_dir.mkdir(parents=True, exist_ok=True)
    
    # CSVエクスポート
    export_database_to_csv(records, title, db_id_short, output_path)
    
    # 各レコードを処理（プロパティ付きで）
    for record in records:
        record_id = record.get("id")
        process_page(record_id, db_dir, depth + 1, include_properties=True)


def export_database_to_csv(records: list, title: str, db_id: str, output_path: Path):
    """データベースをCSVとしてエクスポート"""
    if not records:
        return
    
    # プロパティ名（ヘッダー）を取得
    first_record = records[0]
    props = first_record.get("properties", {})
    
    # タイトルプロパティを先頭にするためソート
    headers = []
    title_prop = None
    for name, prop in props.items():
        if prop.get("type") == "title":
            title_prop = name
        else:
            headers.append(name)
    
    if title_prop:
        headers.insert(0, title_prop)
    
    # CSVファイルパス（Notionエクスポート形式に合わせる）
    csv_filename = f"{sanitize_filename(title)} {db_id}.csv"
    csv_path = output_path / csv_filename
    
    # CSV書き出し
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        
        for record in records:
            row = {}
            for name in headers:
                prop = record.get("properties", {}).get(name, {})
                row[name] = extract_property_value(prop)
            writer.writerow(row)
    
    print(f"{'  '}📊 CSV exported: {csv_filename}")


def main():
    if not ROOT_PAGE_ID:
        print("Error: NOTION_ROOT_PAGE_ID is not set")
        return
    
    print(f"Fetching from Notion (root: {ROOT_PAGE_ID})")
    print("=" * 50)
    
    # 出力ディレクトリをクリア（オプション）
    # shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # ルートページから再帰的に取得
    process_page(ROOT_PAGE_ID, OUTPUT_DIR)
    
    print("=" * 50)
    print("Done!")


if __name__ == "__main__":
    main()
