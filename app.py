from __future__ import annotations

import argparse
import json
import mimetypes
import os
import posixpath
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

ROOT = Path(__file__).resolve().parent
SITE_FILES = {"app.py", "index.html", "style.css", "script.js", "README.md", "start.bat"}

CATEGORIES = {
    "glb": ("3D-модели", "model"),
    "gif": ("Анимации", "image"),
    "svg": ("Графики", "image"),
}
OTHER_SUFFIXES: set[str] = set()


def get_category(suffix: str) -> tuple[str, str]:
    if suffix in CATEGORIES:
        return CATEGORIES[suffix]
    if suffix in OTHER_SUFFIXES:
        names = {
            ".typ": ("Документы", "document"),
            ".txt": ("Тексты", "document"),
            ".pdf": ("Документы", "document"),
            ".png": ("Изображения", "image"),
            ".jpg": ("Изображения", "image"),
            ".jpeg": ("Изображения", "image"),
            ".webp": ("Изображения", "image"),
        }
        return names[suffix]
    return "Другие файлы", "document"


def create_file_entry(path: Path) -> dict:
    relative = path.relative_to(ROOT)
    url_path = "/".join(quote(part) for part in relative.parts)
    suffix = path.suffix.lower()
    category, kind = get_category(suffix)
    stat = path.stat()
    return {
        "name": path.name,
        "path": relative.as_posix(),
        "url": "/" + url_path,
        "type": suffix.lstrip("."),
        "category": category,
        "kind": kind,
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
    }


def collect_files() -> list[dict]:
    entries: list[dict] = []
    for current, directories, files in os.walk(ROOT):
        directories[:] = [name for name in directories if not name.startswith(".") and name != "__pycache__"]
        for filename in files:
            if filename.startswith(".") or filename.endswith(".lock") or filename in SITE_FILES:
                continue
            path = Path(current) / filename
            if path.is_file() and path.suffix.lower() in set(CATEGORIES) | OTHER_SUFFIXES:
                entries.append(create_file_entry(path))
    return sorted(entries, key=lambda item: (item["category"], item["path"].lower()))


class ResultsHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".glb": "model/gltf-binary",
        ".svg": "image/svg+xml",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if urlparse(self.path).path == "/api/files":
            self.send_json({"files": collect_files()})
            return
        super().do_GET()

    def send_json(self, data):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def translate_path(self, path: str) -> str:
        """Serve only files located inside ROOT."""
        parsed = unquote(urlparse(path).path)
        requested = Path(posixpath.normpath(parsed).lstrip("/"))
        candidate = (ROOT / requested).resolve()
        try:
            candidate.relative_to(ROOT)
        except ValueError:
            return str(ROOT)
        return str(candidate)

    def end_headers(self):
        if urlparse(self.path).path == "/":
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")


def main():
    parser = argparse.ArgumentParser(description="Локальный просмотр результатов COMSOL")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8000, type=int)
    args = parser.parse_args()

    mimetypes.add_type("model/gltf-binary", ".glb")
    server = ThreadingHTTPServer((args.host, args.port), ResultsHandler)
    print(f"Сайт результатов запущен: http://{args.host}:{args.port}")
    print("Для остановки нажмите Ctrl+C")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nСервер остановлен.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
