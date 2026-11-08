import socket
import threading
import json

class SimpleWebServer:
    def __init__(self, host='127.0.0.1', port=8080):
        self.host = host
        self.port = port
        self.routes = {}
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    def route(self, path, method='GET'):
        def decorator(func):
            self.routes[(method, path)] = func
            return func
        return decorator

    def handle_client(self, client_socket):
        try:
            request = client_socket.recv(4096).decode('utf-8')
            if not request:
                return
            lines = request.split('\r\n')
            method, path, _ = lines[0].split(' ')
            
            handler = self.routes.get((method, path))
            if handler:
                response_body = json.dumps(handler())
                response = f"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {len(response_body)}\r\n\r\n{response_body}"
            else:
                response_body = json.dumps({"error": "Not Found"})
                response = f"HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\nContent-Length: {len(response_body)}\r\n\r\n{response_body}"
                
            client_socket.sendall(response.encode('utf-8'))
        finally:
            client_socket.close()

    def start(self):
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen(5)
        print(f"Server listening on {self.host}:{self.port}")
        try:
            while True:
                client_socket, addr = self.server_socket.accept()
                thread = threading.Thread(target=self.handle_client, args=(client_socket,))
                thread.start()
        except KeyboardInterrupt:
            print("\nShutting down server.")
        finally:
            self.server_socket.close()

if __name__ == "__main__":
    app = SimpleWebServer()
    
    @app.route('/api/hello')
    def hello():
        return {"message": "Hello from Pure Python Web Server!"}
        
    @app.route('/api/users')
    def users():
        return [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]
        
    print("Routes registered:")
    for route in app.routes:
        print(f"  {route[0]} {route[1]}")
    print("To test, run app.start() in a script.")
