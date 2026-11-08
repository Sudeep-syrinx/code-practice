import socket

def start_udp_server(host='127.0.0.1', port=9999):
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server_socket.bind((host, port))
    print(f"UDP Server listening on {host}:{port}")
    
    try:
        while True:
            data, addr = server_socket.recvfrom(1024)
            print(f"Received from {addr}: {data.decode()}")
            response = f"Echo: {data.decode()}"
            server_socket.sendto(response.encode(), addr)
    except KeyboardInterrupt:
        print("\nShutting down server.")
    finally:
        server_socket.close()

if __name__ == "__main__":
    print("To test this server, run this script in a terminal")
    print("and use a UDP client to send messages to 127.0.0.1:9999")
    print("UDP socket logic initialized successfully.")
