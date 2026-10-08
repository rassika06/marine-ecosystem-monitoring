"""Launch the screenshot-matched Marine Ecosystem Monitoring dashboard.

Uses an available local port instead of 5500 so a previously running
MarineScope demo cannot hijack the browser tab.
Requires only Python's standard library.
"""
from __future__ import annotations

import functools
import http.server
import pathlib
import threading
import webbrowser
import sys

ROOT = pathlib.Path(__file__).resolve().parent
INDEX = ROOT / "index.html"

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

def main() -> int:
    if not INDEX.is_file():
        print("ERROR: index.html missing. Extract the entire new ZIP before running.")
        return 1

    text = INDEX.read_text(encoding="utf-8")
    expected = [
        "assets/classic.css",
        "assets/classic.js",
        "Marine Ecosystem Monitoring",
    ]
    absent = [name for name in expected if name not in text]
    if absent:
        print("ERROR: This folder does not contain the NEW screenshot-matched UI.")
        print("Missing:", ", ".join(absent))
        print("Please extract the newest GitHub ZIP to a separate folder.")
        return 2

    files = [
        ROOT / "assets" / "classic.css",
        ROOT / "assets" / "classic.js",
        ROOT / "assets" / "reference" / "hero.jpg",
        ROOT / "assets" / "reference" / "disease.jpg",
        ROOT / "assets" / "reference" / "coral.jpg",
        ROOT / "assets" / "reference" / "debris.jpg",
        ROOT / "assets" / "reference" / "fish.jpg",
        ROOT / "assets" / "reference" / "camera.jpg",
    ]
    missing = [str(path.relative_to(ROOT)) for path in files if not path.is_file()]
    if missing:
        print("ERROR: New dashboard assets are missing:")
        for path in missing:
            print(" -", path)
        print("Extract the entire ZIP, not just RUN_DEMO.bat.")
        return 3

    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        port = server.server_address[1]
        url = f"http://127.0.0.1:{port}/?ui=screenshot-matched"
        print()
        print("=" * 62)
        print("  MARINE ECOSYSTEM MONITORING - SCREENSHOT-MATCHED UI")
        print("=" * 62)
        print(f"Serving folder: {ROOT}")
        print(f"Verified new classic.css / classic.js and ocean photo assets.")
        print(f"Opening NEW dashboard: {url}")
        print("Do not type localhost:5500: that may still show the OLD UI.")
        print("Leave this black window open. Press Ctrl+C to stop.")
        print("=" * 62)
        print()
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
        try:
            server.serve_forever(poll_interval=0.25)
        except KeyboardInterrupt:
            print("\nServer stopped.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
