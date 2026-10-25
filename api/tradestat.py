import os
import sys
import urllib.parse
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))
os.environ["VERCEL"] = "1"

from api.index import handler as BaseHandler

class handler(BaseHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        self._handle_tradestat(parsed.query)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
