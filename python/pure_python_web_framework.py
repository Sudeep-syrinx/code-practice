import socket
import threading
import re
import urllib.parse
import os
from email.utils import formatdate

# --- HTTP Request & Response ---
class Request:
    def __init__(self, method, path, headers, body):
        self.method = method
        self.path = urllib.parse.unquote(path.split('?')[0])
        self.query_string = path.split('?')[1] if '?' in path else ""
        self.query = urllib.parse.parse_qs(self.query_string)
        self.headers = headers
        self.body = body
        self.params = {}

class Response:
    STATUS_CODES = {200: "OK", 201: "Created", 400: "Bad Request", 404: "Not Found", 500: "Internal Server Error"}
    
    def __init__(self, body="", status=200, content_type="text/html"):
        self.body = body.encode('utf-8') if isinstance(body, str) else body
        self.status = status
        self.headers = {
            "Content-Type": content_type,
            "Content-Length": len(self.body),
            "Server": "PurePythonWeb/1.0",
            "Date": formatdate(timeval=None, localtime=False, usegmt=True)
        }

    def render(self):
        status_text = self.STATUS_CODES.get(self.status, "Unknown")
        resp = f"HTTP/1.1 {self.status} {status_text}\r\n"
        for k, v in self.headers.items():
            resp += f"{k}: {v}\r\n"
        resp += "\r\n"
        return resp.encode('utf-8') + self.body

# --- Template Engine ---
class TemplateEngine:
    @staticmethod
    def render(template_str: str, context: dict) -> str:
        # Resolve {{ variables }}
        def var_replacer(match):
            var_name = match.group(1).strip()
            return str(eval(var_name, {}, context))
        rendered = re.sub(r'\{\{(.*?)\}\}', var_replacer, template_str)
        
        # Resolve {% for var in list %} ... {% endfor %}
        for_pattern = re.compile(r'\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}(.*?)\{%\s*endfor\s*%\}', re.DOTALL)
        def for_replacer(match):
            item_var = match.group(1)
            list_var = match.group(2)
            inner_block = match.group(3)
            iterable = context.get(list_var, [])
            res = ""
            for item in iterable:
                ctx = context.copy()
                ctx[item_var] = item
                res += TemplateEngine.render(inner_block, ctx)
            return res
        
        rendered = for_pattern.sub(for_replacer, rendered)
        return rendered

# --- Router ---
class Router:
    def __init__(self):
        self.routes = []

    def add_route(self, method, path, handler):
        # Convert /users/<id> to regex ^/users/(?P<id>[^/]+)$
        regex_path = re.sub(r'<(\w+)>', r'(?P<\1>[^/]+)', path)
        self.routes.append({
            "method": method,
            "pattern": re.compile(f"^{regex_path}$"),
            "handler": handler
        })

    def match(self, method, path):
        for route in self.routes:
            if route["method"] == method:
                match = route["pattern"].match(path)
                if match:
                    return route["handler"], match.groupdict()
        return None, None

# --- Application Server ---
class App:
    def __init__(self):
        self.router = Router()

    def route(self, path, method="GET"):
        def decorator(handler):
            self.router.add_route(method, path, handler)
            return handler
        return decorator

    def __call__(self, client_sock):
        try:
            req_data = b""
            while b"\r\n\r\n" not in req_data:
                chunk = client_sock.recv(4096)
                if not chunk: break
                req_data += chunk
            
            if not req_data: return

            headers_raw, _, body = req_data.partition(b"\r\n\r\n")
            headers_lines = headers_raw.decode('utf-8').split('\r\n')
            request_line = headers_lines[0].split()
            if len(request_line) < 3: return
            method, path, protocol = request_line
            
            headers = {}
            for line in headers_lines[1:]:
                if ':' in line:
                    k, v = line.split(':', 1)
                    headers[k.strip().lower()] = v.strip()
                    
            content_length = int(headers.get("content-length", 0))
            while len(body) < content_length:
                body += client_sock.recv(4096)

            request = Request(method, path, headers, body.decode('utf-8'))
            handler, params = self.router.match(method, request.path)
            
            if handler:
                request.params = params
                response = handler(request)
                if isinstance(response, str):
                    response = Response(response)
            else:
                response = Response("404 Not Found", status=404)
                
            client_sock.sendall(response.render())
        except Exception as e:
            err_resp = Response(f"500 Internal Error: {str(e)}", status=500)
            client_sock.sendall(err_resp.render())
        finally:
            client_sock.close()

    def run(self, host="127.0.0.1", port=8000):
        server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_sock.bind((host, port))
        server_sock.listen(100)
        print(f"--- PURE PYTHON WEB SERVER ---")
        print(f"Listening on http://{host}:{port}/")
        
        while True:
            client, addr = server_sock.accept()
            threading.Thread(target=self, args=(client,), daemon=True).start()

# --- Example App Usage ---
if __name__ == "__main__":
    app = App()

    @app.route("/")
    def index(req):
        html = """
        <html><body>
        <h1>Welcome to PurePythonWeb!</h1>
        <p>Go to <a href="/users/123">User Profile</a></p>
        <p>Go to <a href="/template">Template Test</a></p>
        </body></html>
        """
        return Response(html)

    @app.route("/users/<id>")
    def user_profile(req):
        return f"<h1>Profile for user: {req.params['id']}</h1>"

    @app.route("/template")
    def template_test(req):
        tpl = """
        <h1>{{ title }}</h1>
        <ul>
        {% for item in items %}
            <li>Item: {{ item }}</li>
        {% endfor %}
        </ul>
        """
        ctx = {"title": "My Shopping List", "items": ["Apples", "Bananas", "Code"]}
        rendered = TemplateEngine.render(tpl, ctx)
        return Response(rendered)
        
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "run":
        app.run()
    else:
        print("Web framework defined. Run with 'python pure_python_web_framework.py run' to start the server.")

# ==============================================================================
# MASSIVE EXPANSION: PURE PYTHON WEB FRAMEWORK (PART 3)
# ==============================================================================

import json
import re

class HTTPRequest:
    def __init__(self, method, path, headers, body):
        self.method = method
        self.path = path
        self.headers = headers
        self.body = body

class HTTPResponse:
    def __init__(self, status_code=200, headers=None, body=""):
        self.status_code = status_code
        self.headers = headers or {"Content-Type": "text/html"}
        self.body = body

    def to_bytes(self):
        status_line = f"HTTP/1.1 {self.status_code} OK\r\n"
        header_lines = "".join(f"{k}: {v}\r\n" for k, v in self.headers.items())
        return (status_line + header_lines + "\r\n" + self.body).encode()

class Router:
    def __init__(self):
        self.routes = []

    def add_route(self, method, path, handler):
        self.routes.append((method, re.compile(f"^{path}$"), handler))

    def resolve(self, method, path):
        for m, pattern, handler in self.routes:
            if m == method:
                match = pattern.match(path)
                if match:
                    return handler, match.groupdict()
        return None, None

class Application:
    def __init__(self):
        self.router = Router()
        self.middleware = []

    def route(self, path, method="GET"):
        def decorator(func):
            self.router.add_route(method, path, func)
            return func
        return decorator

    def use(self, middleware_func):
        self.middleware.append(middleware_func)

    def handle_request(self, request):
        handler, params = self.router.resolve(request.method, request.path)
        if handler:
            try:
                for mw in self.middleware:
                    mw(request)
                response = handler(request, **params)
                if isinstance(response, dict):
                    return HTTPResponse(200, {"Content-Type": "application/json"}, json.dumps(response))
                return HTTPResponse(200, body=str(response))
            except Exception as e:
                return HTTPResponse(500, body=f"Internal Server Error: {str(e)}")
        return HTTPResponse(404, body="Not Found")

def test_web_framework():
    app = Application()

    @app.route("/hello")
    def hello(request):
        return "Hello, World!"

    @app.route("/api/data")
    def api_data(request):
        return {"status": "success", "data": [1, 2, 3]}

    @app.route("/users/<user_id>")
    def get_user(request, user_id):
        return f"User ID: {user_id}"

    req1 = HTTPRequest("GET", "/hello", {}, "")
    res1 = app.handle_request(req1)
    print("Test 1:", res1.body)

    req2 = HTTPRequest("GET", "/api/data", {}, "")
    res2 = app.handle_request(req2)
    print("Test 2:", res2.body)

    req3 = HTTPRequest("GET", "/users/42", {}, "")
    res3 = app.handle_request(req3)
    print("Test 3:", res3.body)

if __name__ == "__main__":
    test_web_framework()
