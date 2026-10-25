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
        self._handle_icegate(parsed.query)

    def do_POST(self):
        payload, err = self._parse_json_body()
        if err:
            status = 413 if "Payload Too Large" in err else 400
            self._send_json({"error": err}, status=status)
            return
        self._handle_icegate_tracking(payload)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
