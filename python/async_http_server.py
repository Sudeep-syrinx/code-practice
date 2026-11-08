import socket
import selectors
import urllib.parse
import json
import base64
import hashlib
import struct
from typing import Callable, Dict, Any, List

class HttpRequest:
    def __init__(self, method: str, path: str, headers: dict, body: bytes):
        self.method = method
        self.path = path
        self.headers = headers
        self.body = body
        self.params = {}
        if "?" in path:
            self.path, query_string = path.split("?", 1)
            self.params = urllib.parse.parse_qs(query_string)

class HttpResponse:
    def __init__(self, status: int = 200, body: bytes = b"", content_type: str = "text/plain"):
        self.status = status
        self.body = body
        self.headers = {
            "Content-Type": content_type,
            "Content-Length": str(len(body)),
            "Connection": "keep-alive"
        }

    def to_bytes(self) -> bytes:
        status_texts = {200: "OK", 400: "Bad Request", 404: "Not Found", 500: "Internal Server Error"}
        reason = status_texts.get(self.status, "OK")
        header_lines = [f"HTTP/1.1 {self.status} {reason}"]
        for k, v in self.headers.items():
            header_lines.append(f"{k}: {v}")
        header_str = "\r\n".join(header_lines) + "\r\n\r\n"
        return header_str.encode('utf-8') + self.body

class AsyncHttpServer:
    def __init__(self, host: str = "127.0.0.1", port: int = 8080):
        self.host = host
        self.port = port
        self.sel = selectors.DefaultSelector()
        self.routes: Dict[str, Callable] = {}
        self.ws_routes: Dict[str, Callable] = {}

    def route(self, path: str):
        def decorator(func):
            self.routes[path] = func
            return func
        return decorator

    def websocket(self, path: str):
        def decorator(func):
            self.ws_routes[path] = func
            return func
        return decorator

    def run(self):
        server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_sock.bind((self.host, self.port))
        server_sock.listen(128)
        server_sock.setblocking(False)
        
        self.sel.register(server_sock, selectors.EVENT_READ, data=None)
        print(f"AsyncHttpServer running at http://{self.host}:{self.port}")

        try:
            while True:
                events = self.sel.select(timeout=0.1)
                for key, mask in events:
                    if key.data is None:
                        self._accept(key.fileobj)
                    else:
                        self._serve(key, mask)
        except KeyboardInterrupt:
            print("\nShutting down server.")
        finally:
            self.sel.close()

    def _accept(self, sock):
        conn, addr = sock.accept()
        conn.setblocking(False)
        self.sel.register(conn, selectors.EVENT_READ, data=bytearray())

    def _serve(self, key, mask):
        sock = key.fileobj
        buffer = key.data
        try:
            chunk = sock.recv(4096)
            if not chunk:
                self._close(sock)
                return
            buffer.extend(chunk)
            
            # Check for HTTP headers termination
            if b"\r\n\r\n" in buffer:
                header_data, body_data = buffer.split(b"\r\n\r\n", 1)
                lines = header_data.decode('utf-8', errors='ignore').split("\r\n")
                request_line = lines[0].split()
                if len(request_line) < 2:
                    self._close(sock)
                    return
                method, path = request_line[0], request_line[1]
                
                headers = {}
                for line in lines[1:]:
                    if ":" in line:
                        k, v = line.split(":", 1)
                        headers[k.strip().lower()] = v.strip()

                # Handle WebSocket Upgrade
                if headers.get("upgrade") == "websocket":
                    self._handle_websocket_handshake(sock, headers, path)
                    return

                # Handle HTTP Route
                req = HttpRequest(method, path, headers, body_data)
                handler = self.routes.get(path)
                if handler:
                    res = handler(req)
                else:
                    res = HttpResponse(404, b"Not Found", "text/plain")
                
                sock.sendall(res.to_bytes())
                self.sel.modify(sock, selectors.EVENT_READ, data=bytearray())
        except Exception as e:
            err_res = HttpResponse(500, f"Internal Error: {e}".encode(), "text/plain")
            try: sock.sendall(err_res.to_bytes())
            except: pass
            self._close(sock)

    def _handle_websocket_handshake(self, sock, headers, path):
        sec_key = headers.get("sec-websocket-key")
        if not sec_key:
            self._close(sock)
            return
        guid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
        accept_key = base64.b64encode(hashlib.sha1((sec_key + guid).encode()).digest()).decode()
        
        response = (
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Accept: {accept_key}\r\n\r\n"
        )
        sock.sendall(response.encode())
        handler = self.ws_routes.get(path)
        if handler:
            handler(sock)
        else:
            self._close(sock)

    def _close(self, sock):
        try:
            self.sel.unregister(sock)
        except:
            pass
        sock.close()

if __name__ == "__main__":
    server = AsyncHttpServer(port=8081)

    @server.route("/")
    def index(req: HttpRequest):
        return HttpResponse(200, b"Hello from Pure Python Async Server!", "text/plain")

    @server.route("/json")
    def json_endpoint(req: HttpRequest):
        data = {"status": "success", "engine": "AsyncHttpServer", "params": req.params}
        return HttpResponse(200, json.dumps(data).encode(), "application/json")

    # Run in test mode or launch
    print("Async HTTP Server framework initialized successfully.")
