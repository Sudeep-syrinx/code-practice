import hashlib
import time
import json
import threading
import random
from typing import List, Dict

class Transaction:
    def __init__(self, sender: str, receiver: str, amount: float):
        self.sender = sender
        self.receiver = receiver
        self.amount = amount
        self.timestamp = time.time()
        self.tx_id = self.hash()

    def hash(self) -> str:
        tx_string = f"{self.sender}{self.receiver}{self.amount}{self.timestamp}"
        return hashlib.sha256(tx_string.encode()).hexdigest()

class Block:
    def __init__(self, index: int, transactions: List[Transaction], previous_hash: str):
        self.index = index
        self.transactions = transactions
        self.previous_hash = previous_hash
        self.timestamp = time.time()
        self.nonce = 0
        self.hash = self.compute_hash()

    def compute_hash(self) -> str:
        tx_hashes = "".join([tx.tx_id for tx in self.transactions])
        block_string = f"{self.index}{tx_hashes}{self.previous_hash}{self.timestamp}{self.nonce}"
        return hashlib.sha256(block_string.encode()).hexdigest()

    def mine(self, difficulty: int):
        target = "0" * difficulty
        while not self.hash.startswith(target):
            self.nonce += 1
            self.hash = self.compute_hash()

class Blockchain:
    def __init__(self, difficulty: int = 4):
        self.chain: List[Block] = []
        self.unconfirmed_transactions: List[Transaction] = []
        self.difficulty = difficulty
        self.create_genesis_block()

    def create_genesis_block(self):
        genesis_block = Block(0, [], "0")
        genesis_block.mine(self.difficulty)
        self.chain.append(genesis_block)

    def get_last_block(self) -> Block:
        return self.chain[-1]

    def add_transaction(self, tx: Transaction) -> bool:
        self.unconfirmed_transactions.append(tx)
        return True

    def mine_pending_transactions(self, miner_address: str):
        # Reward transaction
        reward_tx = Transaction("Network", miner_address, 12.5)
        self.unconfirmed_transactions.append(reward_tx)

        new_block = Block(len(self.chain), self.unconfirmed_transactions, self.get_last_block().hash)
        new_block.mine(self.difficulty)
        self.chain.append(new_block)
        self.unconfirmed_transactions = []
        return new_block

    def is_chain_valid(self) -> bool:
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]
            if current.hash != current.compute_hash():
                return False
            if current.previous_hash != previous.hash:
                return False
        return True

class P2PNode:
    def __init__(self, node_id: str, blockchain: Blockchain):
        self.node_id = node_id
        self.blockchain = blockchain
        self.peers: List['P2PNode'] = []
        self.mempool: Dict[str, Transaction] = {}

    def connect(self, peer: 'P2PNode'):
        if peer not in self.peers:
            self.peers.append(peer)
            peer.peers.append(self)

    def broadcast_transaction(self, tx: Transaction):
        if tx.tx_id not in self.mempool:
            self.mempool[tx.tx_id] = tx
            self.blockchain.add_transaction(tx)
            for peer in self.peers:
                peer.receive_transaction(tx)

    def receive_transaction(self, tx: Transaction):
        if tx.tx_id not in self.mempool:
            self.mempool[tx.tx_id] = tx
            self.blockchain.add_transaction(tx)
            # Gossip protocol
            for peer in self.peers:
                peer.receive_transaction(tx)

    def broadcast_block(self, block: Block):
        for peer in self.peers:
            peer.receive_block(block)

    def receive_block(self, block: Block):
        if block.index > self.blockchain.get_last_block().index:
            if block.previous_hash == self.blockchain.get_last_block().hash:
                self.blockchain.chain.append(block)
                # Clear mempool of mined txs
                for tx in block.transactions:
                    if tx.tx_id in self.mempool:
                        del self.mempool[tx.tx_id]
                self.broadcast_block(block)

def miner_thread(node: P2PNode, stop_event: threading.Event):
    while not stop_event.is_set():
        if node.blockchain.unconfirmed_transactions:
            print(f"[{node.node_id}] Mining block...")
            block = node.blockchain.mine_pending_transactions(node.node_id)
            print(f"[{node.node_id}] Mined Block {block.index} [Hash: {block.hash[:10]}...]")
            node.broadcast_block(block)
        time.sleep(1)

if __name__ == "__main__":
    print("--- P2P BLOCKCHAIN NETWORK SIMULATOR ---")
    
    # Initialize Blockchain with low difficulty for fast simulation
    bc = Blockchain(difficulty=3)
    
    # Create network nodes
    node_a = P2PNode("AliceNode", Blockchain(difficulty=3))
    node_b = P2PNode("BobNode", Blockchain(difficulty=3))
    node_c = P2PNode("CharlieNode", Blockchain(difficulty=3))
    
    # Sync genesis block
    node_b.blockchain.chain = list(node_a.blockchain.chain)
    node_c.blockchain.chain = list(node_a.blockchain.chain)
    
    # Connect P2P Mesh
    node_a.connect(node_b)
    node_b.connect(node_c) # A-B-C Topology (Gossip will bridge A and C)
    
    # Start miner threads
    stop_event = threading.Event()
    t1 = threading.Thread(target=miner_thread, args=(node_a, stop_event))
    t2 = threading.Thread(target=miner_thread, args=(node_c, stop_event))
    t1.start(); t2.start()
    
    # Simulate network activity
    print("Simulating Transactions...")
    tx1 = Transaction("Alice", "Bob", 50.0)
    node_a.broadcast_transaction(tx1)
    time.sleep(2)
    
    tx2 = Transaction("Bob", "Charlie", 10.0)
    node_b.broadcast_transaction(tx2)
    time.sleep(3)
    
    stop_event.set()
    t1.join(); t2.join()
    
    print("\nNetwork Consensus Check:")
    print(f"Alice Chain Length: {len(node_a.blockchain.chain)}, Valid: {node_a.blockchain.is_chain_valid()}")
    print(f"Bob   Chain Length: {len(node_b.blockchain.chain)}, Valid: {node_b.blockchain.is_chain_valid()}")
    print(f"Alice Last Hash: {node_a.blockchain.get_last_block().hash[:15]}...")
    print(f"Bob   Last Hash: {node_b.blockchain.get_last_block().hash[:15]}...")
