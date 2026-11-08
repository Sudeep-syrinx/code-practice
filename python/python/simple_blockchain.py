import hashlib
import json
import time
from typing import List, Dict, Any

class Block:
    def __init__(self, index: int, timestamp: float, data: Any, previous_hash: str, nonce: int = 0):
        self.index = index
        self.timestamp = timestamp
        self.data = data
        self.previous_hash = previous_hash
        self.nonce = nonce
        self.hash = self.calculate_hash()

    def calculate_hash(self) -> str:
        payload = f"{self.index}{self.timestamp}{json.dumps(self.data, sort_keys=True)}{self.previous_hash}{self.nonce}"
        return hashlib.sha256(payload.encode()).hexdigest()

    def to_dict(self):
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "data": self.data,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce,
            "hash": self.hash,
        }

class Blockchain:
    def __init__(self, difficulty: int = 3):
        self.chain: List[Block] = []
        self.difficulty = difficulty
        self.pending: List[Dict] = []
        self.mining_reward = 50
        self.create_genesis()

    def create_genesis(self):
        genesis = Block(0, time.time(), {"message": "Genesis Block"}, "0")
        self.chain.append(genesis)

    def get_latest(self) -> Block:
        return self.chain[-1]

    def proof_of_work(self, block: Block) -> Block:
        target = "0" * self.difficulty
        while not block.hash.startswith(target):
            block.nonce += 1
            block.hash = block.calculate_hash()
        return block

    def add_transaction(self, sender: str, recipient: str, amount: float):
        self.pending.append({
            "sender": sender,
            "recipient": recipient,
            "amount": amount,
        })

    def mine_pending(self, miner_address: str):
        self.pending.append({
            "sender": "network",
            "recipient": miner_address,
            "amount": self.mining_reward,
        })
        block = Block(
            index=len(self.chain),
            timestamp=time.time(),
            data=self.pending.copy(),
            previous_hash=self.get_latest().hash,
        )
        block = self.proof_of_work(block)
        self.chain.append(block)
        self.pending = []
        return block

    def get_balance(self, address: str) -> float:
        balance = 0.0
        for block in self.chain:
            if isinstance(block.data, list):
                for tx in block.data:
                    if tx["sender"] == address:
                        balance -= tx["amount"]
                    if tx["recipient"] == address:
                        balance += tx["amount"]
        return balance

    def is_valid(self) -> bool:
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]
            if current.hash != current.calculate_hash():
                return False
            if current.previous_hash != previous.hash:
                return False
            if not current.hash.startswith("0" * self.difficulty):
                return False
        return True

    def print_chain(self):
        for block in self.chain:
            print(f"Block {block.index} | hash={block.hash[:16]}... | nonce={block.nonce}")
            if isinstance(block.data, list):
                for tx in block.data:
                    print(f"   {tx['sender']} -> {tx['recipient']}: {tx['amount']}")
            else:
                print(f"   {block.data}")
            print()

if __name__ == "__main__":
    bc = Blockchain(difficulty=3)
    print("Mining genesis done. Difficulty =", bc.difficulty)
    print()

    bc.add_transaction("Alice", "Bob", 40)
    bc.add_transaction("Bob", "Charlie", 15)
    print("Mining block 1...")
    block1 = bc.mine_pending("Miner1")
    print(f"  Mined with nonce {block1.nonce}, hash {block1.hash[:20]}...")

    bc.add_transaction("Charlie", "Alice", 5)
    bc.add_transaction("Alice", "Bob", 10)
    print("Mining block 2...")
    block2 = bc.mine_pending("Miner2")
    print(f"  Mined with nonce {block2.nonce}, hash {block2.hash[:20]}...")
    print()

    print("Balances:")
    for name in ["Alice", "Bob", "Charlie", "Miner1", "Miner2"]:
        print(f"  {name:8}: {bc.get_balance(name)}")
    print()
    print("Chain valid:", bc.is_valid())
    print()
    bc.print_chain()

    # Tamper test
    print("Tampering with block 1 data...")
    bc.chain[1].data[0]["amount"] = 999
    print("Chain valid after tamper:", bc.is_valid())
