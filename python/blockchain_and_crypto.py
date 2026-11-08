"""
A complete Blockchain simulation with Blocks, Transactions, 
Merkle Trees, Proof of Work, and Wallets.
"""

import hashlib
import time
import json
import random

class Transaction:
    def __init__(self, sender, receiver, amount):
        self.sender = sender
        self.receiver = receiver
        self.amount = amount
        self.timestamp = time.time()

    def to_dict(self):
        return {
            "sender": self.sender,
            "receiver": self.receiver,
            "amount": self.amount,
            "timestamp": self.timestamp
        }

    def __repr__(self):
        return f"{self.sender} -> {self.receiver}: {self.amount}"

class MerkleTree:
    def __init__(self, transactions):
        self.transactions = transactions
        self.root = self.build_tree()

    def build_tree(self):
        if not self.transactions:
            return None
        leaves = [hashlib.sha256(json.dumps(tx.to_dict(), sort_keys=True).encode()).hexdigest() for tx in self.transactions]
        while len(leaves) > 1:
            if len(leaves) % 2 != 0:
                leaves.append(leaves[-1])
            new_leaves = []
            for i in range(0, len(leaves), 2):
                combined = leaves[i] + leaves[i+1]
                new_leaves.append(hashlib.sha256(combined.encode()).hexdigest())
            leaves = new_leaves
        return leaves[0]

class Block:
    def __init__(self, index, transactions, previous_hash, difficulty=2):
        self.index = index
        self.transactions = transactions
        self.timestamp = time.time()
        self.previous_hash = previous_hash
        self.merkle_root = MerkleTree(transactions).root
        self.nonce = 0
        self.difficulty = difficulty
        self.hash = self.mine_block()

    def calculate_hash(self):
        block_string = json.dumps({
            "index": self.index,
            "merkle_root": self.merkle_root,
            "timestamp": self.timestamp,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce
        }, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()

    def mine_block(self):
        target = "0" * self.difficulty
        while True:
            block_hash = self.calculate_hash()
            if block_hash.startswith(target):
                return block_hash
            self.nonce += 1

class Wallet:
    def __init__(self, name):
        self.name = name
        self.balance = 100

    def create_transaction(self, receiver, amount):
        if amount > self.balance:
            raise ValueError("Insufficient funds")
        self.balance -= amount
        receiver.balance += amount
        return Transaction(self.name, receiver.name, amount)

class Blockchain:
    def __init__(self, difficulty=2):
        self.chain = []
        self.difficulty = difficulty
        self.pending_transactions = []
        self.create_genesis_block()

    def create_genesis_block(self):
        genesis = Block(0, [], "0", self.difficulty)
        self.chain.append(genesis)

    def add_block(self, block):
        if len(self.chain) > 0:
            if block.previous_hash != self.chain[-1].hash:
                raise ValueError("Invalid previous hash")
        self.chain.append(block)

    def mine_pending_transactions(self):
        if not self.pending_transactions:
            return None
        new_block = Block(len(self.chain), self.pending_transactions, self.chain[-1].hash, self.difficulty)
        self.add_block(new_block)
        self.pending_transactions = []
        return new_block

    def is_chain_valid(self):
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i-1]
            if current.hash != current.calculate_hash():
                return False
            if current.previous_hash != previous.hash:
                return False
        return True

if __name__ == "__main__":
    alice = Wallet("Alice")
    bob = Wallet("Bob")
    
    print("Alice initial balance:", alice.balance)
    print("Bob initial balance:", bob.balance)
    
    tx1 = alice.create_transaction(bob, 30)
    tx2 = alice.create_transaction(bob, 20)
    
    blockchain = Blockchain(difficulty=2)
    blockchain.pending_transactions.extend([tx1, tx2])
    
    print("Mining block...")
    mined_block = blockchain.mine_pending_transactions()
    print("Block mined! Hash:", mined_block.hash)
    
    print("Alice new balance:", alice.balance)
    print("Bob new balance:", bob.balance)
    
    print("Is chain valid?", blockchain.is_chain_valid())
