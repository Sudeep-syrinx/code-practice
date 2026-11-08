"""
Zero-Knowledge Proofs (ZKP) and Cryptographic Protocols.
Includes Schnorr Protocol and Fiat-Shamir Heuristic.
"""

import random
import hashlib

class SchnorrProtocol:
    def __init__(self, p, q, g):
        self.p = p
        self.q = q
        self.g = g
        self.x = random.randint(1, q - 1)
        self.y = pow(g, self.x, p)

    def generate_commitment(self):
        self.r = random.randint(1, self.q - 1)
        self.t = pow(self.g, self.r, self.p)
        return self.t

    def generate_response(self, challenge):
        self.c = challenge
        self.s = (self.r + self.c * self.x) % self.q
        return self.s

    def verify(self, commitment, challenge, response):
        left = pow(self.g, response, self.p)
        right = (commitment * pow(self.y, challenge, self.p)) % self.p
        return left == right

class FiatShamirSchnorr:
    def __init__(self, p, q, g):
        self.p = p
        self.q = q
        self.g = g
        self.x = random.randint(1, q - 1)
        self.y = pow(g, self.x, p)

    def prove(self, message):
        r = random.randint(1, self.q - 1)
        t = pow(self.g, r, self.p)
        
        hash_input = str(t) + message
        hash_output = hashlib.sha256(hash_input.encode()).hexdigest()
        c = int(hash_output, 16) % self.q
        
        s = (r + c * self.x) % self.q
        return (t, s)

    def verify(self, message, proof):
        t, s = proof
        
        hash_input = str(t) + message
        hash_output = hashlib.sha256(hash_input.encode()).hexdigest()
        c = int(hash_output, 16) % self.q
        
        left = pow(self.g, s, self.p)
        right = (t * pow(self.y, c, self.p)) % self.p
        return left == right

if __name__ == "__main__":
    print("Testing Zero Knowledge Proofs...")
    p = 23
    q = 11
    g = 4
    
    prover = SchnorrProtocol(p, q, g)
    commitment = prover.generate_commitment()
    challenge = random.randint(1, q - 1)
    response = prover.generate_response(challenge)
    
    is_valid = prover.verify(commitment, challenge, response)
    print("Schnorr Interactive ZKP Valid:", is_valid)
    
    fs = FiatShamirSchnorr(p, q, g)
    msg = "I am Alice"
    proof = fs.prove(msg)
    is_fs_valid = fs.verify(msg, proof)
    print("Fiat-Shamir Non-Interactive ZKP Valid:", is_fs_valid)
    print("Protocol implementation complete.")
