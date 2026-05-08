"""
================================================================================
  MAPAFISH LOCAL INGESTION BACKEND
  ProyectoMAPAfish | CIIMAR
================================================================================
  This Python script acts as a local proxy backend that bypasses all CORS
  browser limits, logging directly into Wikibase Cloud via API and creating
  items automatically.

  RUNNING:
      python backend.py
================================================================================
"""

import json
import urllib.parse
import urllib.request
import http.cookiejar
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 8001
WIKIBASE_URL = "https://rodrigo-test-ciimar.wikibase.cloud"
API_URL = f"{WIKIBASE_URL}/w/api.php"

def make_claim(prop, value):
    """Format claims correctly for MediaWiki Action API."""
    if isinstance(value, str) and value.strip().startswith('Q'):
        return {
            "mainsnak": {
                "snaktype": "value",
                "property": prop,
                "datavalue": {
                    "value": {
                        "entity-type": "item",
                        "id": value.strip()
                    },
                    "type": "wikibase-entityid"
                }
            },
            "type": "statement",
            "rank": "normal"
        }
    elif isinstance(value, (int, float)):
        amount_str = f"+{value}"
        return {
            "mainsnak": {
                "snaktype": "value",
                "property": prop,
                "datavalue": {
                    "value": {
                        "amount": amount_str,
                        "unit": "1"
                    },
                    "type": "quantity"
                }
            },
            "type": "statement",
            "rank": "normal"
        }
    elif isinstance(value, dict) and 'latitude' in value:
        return {
            "mainsnak": {
                "snaktype": "value",
                "property": prop,
                "datavalue": {
                    "value": {
                        "latitude": value['latitude'],
                        "longitude": value['longitude'],
                        "altitude": None,
                        "precision": 0.00001,
                        "globe": "http://www.wikidata.org/entity/Q2"
                    },
                    "type": "globecoordinate"
                }
            },
            "type": "statement",
            "rank": "normal"
        }
    else:
        return {
            "mainsnak": {
                "snaktype": "value",
                "property": prop,
                "datavalue": {
                    "value": str(value),
                    "type": "string"
                }
            },
            "type": "statement",
            "rank": "normal"
        }


class IngestionServer(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            req_data = json.loads(post_data.decode('utf-8'))
            username = req_data.get('username')
            password = req_data.get('password')
            samples = req_data.get('samples', [])

            if not username or not password or not samples:
                self.rfile.write(json.dumps({"error": "Missing username, password, or samples data."}).encode('utf-8'))
                return

            # Setup urllib with cookie handling
            cj = http.cookiejar.CookieJar()
            opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

            # STEP 1: Get Login Token
            token_url = f"{API_URL}?action=query&meta=tokens&type=login&format=json"
            res = opener.open(token_url).read()
            token_data = json.loads(res.decode('utf-8'))
            login_token = token_data["query"]["tokens"]["logintoken"]

            # STEP 2: Execute login
            login_payload = urllib.parse.urlencode({
                'action': 'login',
                'lgname': username,
                'lgpassword': password,
                'lgtoken': login_token,
                'format': 'json'
            }).encode('utf-8')

            res_login = opener.open(API_URL, data=login_payload).read()
            login_res = json.loads(res_login.decode('utf-8'))

            if login_res.get("login", {}).get("result") != "Success":
                err_msg = login_res.get("login", {}).get("reason", "Unknown login error.")
                self.wfile.write(json.dumps({"error": f"Login failed: {err_msg}"}).encode('utf-8'))
                return

            # STEP 3: Get CSRF Token
            csrf_url = f"{API_URL}?action=query&meta=tokens&type=csrf&format=json"
            res_csrf = opener.open(csrf_url).read()
            csrf_data = json.loads(res_csrf.decode('utf-8'))
            csrf_token = csrf_data["query"]["tokens"]["csrftoken"]

            # STEP 4: Insert entities
            created_ids = []
            for sample in samples:
                # Format claims array
                claims = {}
                for p_id, val in sample.get('claims', {}).items():
                    claims[p_id] = [make_claim(p_id, val)]

                # Build data object
                entity_data = {
                    "labels": {
                        "en": {"language": "en", "value": sample["label"]}
                    },
                    "descriptions": {
                        "en": {"language": "en", "value": sample["desc"]}
                    },
                    "claims": claims
                }

                edit_payload = urllib.parse.urlencode({
                    'action': 'wbeditentity',
                    'new': 'item',
                    'data': json.dumps(entity_data),
                    'token': csrf_token,
                    'format': 'json'
                }).encode('utf-8')

                res_edit = opener.open(API_URL, data=edit_payload).read()
                edit_res = json.loads(res_edit.decode('utf-8'))

                if "entity" in edit_res:
                    created_id = edit_res["entity"]["id"]
                    created_ids.append({"label": sample["label"], "id": created_id})
                else:
                    print(f"Error creating item for {sample['label']}: {edit_res}")

            self.wfile.write(json.dumps({"success": True, "created": created_ids}).encode('utf-8'))

        except Exception as e:
            self.wfile.write(json.dumps({"error": f"Internal Error: {str(e)}"}).encode('utf-8'))


if __name__ == '__main__':
    print(f"============================================================")
    print(f"  Ingestion direct backend server running on port {PORT}")
    print(f"  Press Ctrl+C to terminate.")
    print(f"============================================================")
    server = HTTPServer(('127.0.0.1', PORT), IngestionServer)
    server.serve_forever()
