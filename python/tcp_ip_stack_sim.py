import random
import time
from collections import deque
from enum import Enum, auto

# --- Custom TCP/IP Stack Simulator ---
class PacketType(Enum):
    SYN = auto()
    SYN_ACK = auto()
    ACK = auto()
    DATA = auto()
    FIN = auto()

class Packet:
    def __init__(self, src_ip: str, dest_ip: str, src_port: int, dest_port: int, 
                 seq_num: int, ack_num: int, p_type: PacketType, payload: str = ""):
        self.src_ip = src_ip
        self.dest_ip = dest_ip
        self.src_port = src_port
        self.dest_port = dest_port
        self.seq_num = seq_num
        self.ack_num = ack_num
        self.type = p_type
        self.payload = payload
        self.window_size = 5

    def __repr__(self):
        return f"[{self.type.name}] {self.src_ip}:{self.src_port} -> {self.dest_ip}:{self.dest_port} | Seq:{self.seq_num} Ack:{self.ack_num} | Data:'{self.payload}'"

class NetworkRouter:
    def __init__(self):
        self.endpoints = {}
        self.latency = 0.05
        self.drop_rate = 0.1 # 10% packet loss

    def register(self, endpoint):
        self.endpoints[endpoint.ip] = endpoint

    def route(self, packet: Packet):
        if random.random() < self.drop_rate:
            print(f"    [Router] DROPPED: {packet}")
            return
            
        if packet.dest_ip in self.endpoints:
            # Simulate latency synchronously for the sake of deterministic simulation testing
            # In a real environment, this would be threaded.
            self.endpoints[packet.dest_ip].receive_layer3(packet)

class TCPEndpoint:
    class State(Enum):
        CLOSED = auto()
        LISTEN = auto()
        SYN_SENT = auto()
        SYN_RCVD = auto()
        ESTABLISHED = auto()
        FIN_WAIT_1 = auto()
        FIN_WAIT_2 = auto()
        TIME_WAIT = auto()

    def __init__(self, ip: str, router: NetworkRouter):
        self.ip = ip
        self.router = router
        self.router.register(self)
        
        self.state = self.State.CLOSED
        self.seq_num = random.randint(1000, 9000)
        self.ack_num = 0
        
        self.remote_ip = None
        self.remote_port = None
        self.local_port = random.randint(1024, 65535)
        
        self.recv_buffer = {}
        self.send_buffer = deque()
        self.unacked_packets = {}
        
        self.bytes_read = 0

    def listen(self, port: int):
        self.local_port = port
        self.state = self.State.LISTEN
        print(f"{self.ip}:{self.local_port} is LISTENING")

    def connect(self, target_ip: str, target_port: int):
        self.remote_ip = target_ip
        self.remote_port = target_port
        self.state = self.State.SYN_SENT
        
        syn_pkt = Packet(self.ip, target_ip, self.local_port, target_port,
                         self.seq_num, 0, PacketType.SYN)
        
        print(f"{self.ip} sending SYN...")
        self._send(syn_pkt)
        self.seq_num += 1

    def send_data(self, data: str):
        if self.state != self.State.ESTABLISHED:
            print(f"Cannot send data, connection state is {self.state.name}")
            return
            
        # Segment data
        chunk_size = 4
        for i in range(0, len(data), chunk_size):
            chunk = data[i:i+chunk_size]
            pkt = Packet(self.ip, self.remote_ip, self.local_port, self.remote_port,
                         self.seq_num, self.ack_num, PacketType.DATA, chunk)
            self.send_buffer.append(pkt)
            self.seq_num += len(chunk)
            
        self._flush_send_buffer()

    def _flush_send_buffer(self):
        # Very simplified sliding window
        while self.send_buffer and len(self.unacked_packets) < 5:
            pkt = self.send_buffer.popleft()
            self.unacked_packets[pkt.seq_num] = pkt
            print(f"{self.ip} sending DATA: {pkt.payload}")
            self._send(pkt)

    def _send(self, packet: Packet):
        self.router.route(packet)

    def receive_layer3(self, packet: Packet):
        if self.state == self.State.CLOSED: return
        
        if self.state == self.State.LISTEN and packet.type == PacketType.SYN:
            self.remote_ip = packet.src_ip
            self.remote_port = packet.src_port
            self.ack_num = packet.seq_num + 1
            self.state = self.State.SYN_RCVD
            
            syn_ack = Packet(self.ip, self.remote_ip, self.local_port, self.remote_port,
                             self.seq_num, self.ack_num, PacketType.SYN_ACK)
            print(f"{self.ip} received SYN, sending SYN_ACK...")
            self._send(syn_ack)
            self.seq_num += 1
            
        elif self.state == self.State.SYN_SENT and packet.type == PacketType.SYN_ACK:
            if packet.ack_num == self.seq_num:
                self.ack_num = packet.seq_num + 1
                self.state = self.State.ESTABLISHED
                
                ack = Packet(self.ip, self.remote_ip, self.local_port, self.remote_port,
                             self.seq_num, self.ack_num, PacketType.ACK)
                print(f"{self.ip} received SYN_ACK, sending ACK. Connection ESTABLISHED.")
                self._send(ack)
                
        elif self.state == self.State.SYN_RCVD and packet.type == PacketType.ACK:
            if packet.ack_num == self.seq_num:
                self.state = self.State.ESTABLISHED
                print(f"{self.ip} received ACK. Connection ESTABLISHED.")
                
        elif self.state == self.State.ESTABLISHED:
            if packet.type == PacketType.DATA:
                if packet.seq_num == self.ack_num:
                    self.recv_buffer[packet.seq_num] = packet.payload
                    self.ack_num += len(packet.payload)
                    
                    # Handle out-of-order packets that are now valid
                    while self.ack_num in self.recv_buffer and self.recv_buffer[self.ack_num] != "":
                        self.ack_num += len(self.recv_buffer[self.ack_num])
                        
                    print(f"{self.ip} received DATA '{packet.payload}', sending ACK {self.ack_num}")
                    ack = Packet(self.ip, self.remote_ip, self.local_port, self.remote_port,
                                 self.seq_num, self.ack_num, PacketType.ACK)
                    self._send(ack)
                elif packet.seq_num > self.ack_num:
                    # Out of order, buffer it but send old ACK (Fast Retransmit trigger in real TCP)
                    self.recv_buffer[packet.seq_num] = packet.payload
                    ack = Packet(self.ip, self.remote_ip, self.local_port, self.remote_port,
                                 self.seq_num, self.ack_num, PacketType.ACK)
                    self._send(ack)
                    
            elif packet.type == PacketType.ACK:
                # Remove acknowledged packets from unacked window
                to_remove = [seq for seq in self.unacked_packets if seq < packet.ack_num]
                for seq in to_remove:
                    del self.unacked_packets[seq]
                self._flush_send_buffer()

    def get_assembled_data(self) -> str:
        keys = sorted(self.recv_buffer.keys())
        return "".join(self.recv_buffer[k] for k in keys)

if __name__ == "__main__":
    print("--- CUSTOM TCP/IP STACK SIMULATOR ---")
    router = NetworkRouter()
    
    server = TCPEndpoint("192.168.1.100", router)
    client = TCPEndpoint("10.0.0.5", router)
    
    # 1. Three-way Handshake
    server.listen(80)
    client.connect("192.168.1.100", 80)
    
    print("\n--- Sending Data ---")
    message = "Hello TCP World!"
    client.send_data(message)
    
    # Simulate network processing time
    time.sleep(0.5)
    
    # Re-transmit logic (Manual trigger for simulation purposes)
    if client.unacked_packets:
        print("\n--- Simulating Retransmission for dropped packets ---")
        for pkt in list(client.unacked_packets.values()):
            print(f"Retransmitting: {pkt}")
            client._send(pkt)
            
    print("\n--- Final State ---")
    print(f"Server Assembled Data: '{server.get_assembled_data()}'")
