import random
import math

# --- RSA Public-Key Cryptography ---
class RSA:
    @staticmethod
    def is_prime(n, k=5):
        if n == 2 or n == 3: return True
        if n < 2 or n % 2 == 0: return False
        r, s = 0, n - 1
        while s % 2 == 0:
            r += 1
            s //= 2
        for _ in range(k):
            a = random.randrange(2, n - 1)
            x = pow(a, s, n)
            if x == 1 or x == n - 1:
                continue
            for _ in range(r - 1):
                x = pow(x, 2, n)
                if x == n - 1:
                    break
            else:
                return False
        return True

    @staticmethod
    def generate_prime(bits):
        while True:
            p = random.getrandbits(bits)
            # Ensure p is odd and has the correct bit length
            p |= (1 << bits - 1) | 1
            if RSA.is_prime(p):
                return p

    @staticmethod
    def extended_gcd(a, b):
        if a == 0:
            return b, 0, 1
        else:
            gcd, x, y = RSA.extended_gcd(b % a, a)
            return gcd, y - (b // a) * x, x

    @staticmethod
    def mod_inverse(e, phi):
        gcd, x, y = RSA.extended_gcd(e, phi)
        if gcd != 1:
            raise Exception('Modular inverse does not exist')
        else:
            return x % phi

    @classmethod
    def generate_keypair(cls, keysize=512):
        print(f"Generating RSA {keysize*2}-bit keys...")
        p = cls.generate_prime(keysize)
        q = cls.generate_prime(keysize)
        n = p * q
        phi = (p - 1) * (q - 1)
        e = 65537 # Standard public exponent
        d = cls.mod_inverse(e, phi)
        return ((e, n), (d, n))

    @staticmethod
    def encrypt(public_key, plaintext):
        e, n = public_key
        # Convert text to integer array
        cipher = [pow(ord(char), e, n) for char in plaintext]
        return cipher

    @staticmethod
    def decrypt(private_key, ciphertext):
        d, n = private_key
        # Decrypt to integer and convert to text
        plain = [chr(pow(char, d, n)) for char in ciphertext]
        return ''.join(plain)

# --- AES-128 Implementation (Advanced Encryption Standard) ---
class AES128:
    SBOX = [
        0x63, 0x7C, 0x77, 0x7B, 0xF2, 0x6B, 0x6F, 0xC5, 0x30, 0x01, 0x67, 0x2B, 0xFE, 0xD7, 0xAB, 0x76,
        0xCA, 0x82, 0xC9, 0x7D, 0xFA, 0x59, 0x47, 0xF0, 0xAD, 0xD4, 0xA2, 0xAF, 0x9C, 0xA4, 0x72, 0xC0,
        0xB7, 0xFD, 0x93, 0x26, 0x36, 0x3F, 0xF7, 0xCC, 0x34, 0xA5, 0xE5, 0xF1, 0x71, 0xD8, 0x31, 0x15,
        0x04, 0xC7, 0x23, 0xC3, 0x18, 0x96, 0x05, 0x9A, 0x07, 0x12, 0x80, 0xE2, 0xEB, 0x27, 0xB2, 0x75,
        0x09, 0x83, 0x2C, 0x1A, 0x1B, 0x6E, 0x5A, 0xA0, 0x52, 0x3B, 0xD6, 0xB3, 0x29, 0xE3, 0x2F, 0x84,
        0x53, 0xD1, 0x00, 0xED, 0x20, 0xFC, 0xB1, 0x5B, 0x6A, 0xCB, 0xBE, 0x39, 0x4A, 0x4C, 0x58, 0xCF,
        0xD0, 0xEF, 0xAA, 0xFB, 0x43, 0x4D, 0x33, 0x85, 0x45, 0xF9, 0x02, 0x7F, 0x50, 0x3C, 0x9F, 0xA8,
        0x51, 0xA3, 0x40, 0x8F, 0x92, 0x9D, 0x38, 0xF5, 0xBC, 0xB6, 0xDA, 0x21, 0x10, 0xFF, 0xF3, 0xD2,
        0xCD, 0x0C, 0x13, 0xEC, 0x5F, 0x97, 0x44, 0x17, 0xC4, 0xA7, 0x7E, 0x3D, 0x64, 0x5D, 0x19, 0x73,
        0x60, 0x81, 0x4F, 0xDC, 0x22, 0x2A, 0x90, 0x88, 0x46, 0xEE, 0xB8, 0x14, 0xDE, 0x5E, 0x0B, 0xDB,
        0xE0, 0x32, 0x3A, 0x0A, 0x49, 0x06, 0x24, 0x5C, 0xC2, 0xD3, 0xAC, 0x62, 0x91, 0x95, 0xE4, 0x79,
        0xE7, 0xC8, 0x37, 0x6D, 0x8D, 0xD5, 0x4E, 0xA9, 0x6C, 0x56, 0xF4, 0xEA, 0x65, 0x7A, 0xAE, 0x08,
        0xBA, 0x78, 0x25, 0x2E, 0x1C, 0xA6, 0xB4, 0xC6, 0xE8, 0xDD, 0x74, 0x1F, 0x4B, 0xBD, 0x8B, 0x8A,
        0x70, 0x3E, 0xB5, 0x66, 0x48, 0x03, 0xF6, 0x0E, 0x61, 0x35, 0x57, 0xB9, 0x86, 0xC1, 0x1D, 0x9E,
        0xE1, 0xF8, 0x98, 0x11, 0x69, 0xD9, 0x8E, 0x94, 0x9B, 0x1E, 0x87, 0xE9, 0xCE, 0x55, 0x28, 0xDF,
        0x8C, 0xA1, 0x89, 0x0D, 0xBF, 0xE6, 0x42, 0x68, 0x41, 0x99, 0x2D, 0x0F, 0xB0, 0x54, 0xBB, 0x16
    ]

    RCON = [
        0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1B, 0x36
    ]

    def __init__(self, key):
        if len(key) != 16:
            raise ValueError("AES-128 requires a 16-byte key")
        self.round_keys = self._key_expansion(list(key))

    def _sub_word(self, word):
        return [self.SBOX[b] for b in word]

    def _rot_word(self, word):
        return word[1:] + word[:1]

    def _key_expansion(self, key):
        expanded = [list(key[i:i+4]) for i in range(0, 16, 4)]
        for i in range(4, 44):
            temp = expanded[i-1]
            if i % 4 == 0:
                temp = self._sub_word(self._rot_word(temp))
                temp[0] ^= self.RCON[i // 4]
            word = [expanded[i-4][j] ^ temp[j] for j in range(4)]
            expanded.append(word)
        return expanded

    def _add_round_key(self, state, round_idx):
        for c in range(4):
            for r in range(4):
                state[r][c] ^= self.round_keys[round_idx * 4 + c][r]

    def _sub_bytes(self, state):
        for r in range(4):
            for c in range(4):
                state[r][c] = self.SBOX[state[r][c]]

    def _shift_rows(self, state):
        state[1] = state[1][1:] + state[1][:1]
        state[2] = state[2][2:] + state[2][:2]
        state[3] = state[3][3:] + state[3][:3]

    def _galois_mult(self, a, b):
        p = 0
        for _ in range(8):
            if b & 1: p ^= a
            hi_bit_set = a & 0x80
            a <<= 1
            if hi_bit_set: a ^= 0x1b
            b >>= 1
        return p % 256

    def _mix_columns(self, state):
        for c in range(4):
            a = [state[r][c] for r in range(4)]
            state[0][c] = self._galois_mult(a[0],2) ^ self._galois_mult(a[1],3) ^ a[2] ^ a[3]
            state[1][c] = a[0] ^ self._galois_mult(a[1],2) ^ self._galois_mult(a[2],3) ^ a[3]
            state[2][c] = a[0] ^ a[1] ^ self._galois_mult(a[2],2) ^ self._galois_mult(a[3],3)
            state[3][c] = self._galois_mult(a[0],3) ^ a[1] ^ a[2] ^ self._galois_mult(a[3],2)

    def encrypt_block(self, block):
        if len(block) != 16:
            raise ValueError("Block must be 16 bytes")
        
        # State array: 4x4 column-major order
        state = [[block[r + 4*c] for c in range(4)] for r in range(4)]
        
        self._add_round_key(state, 0)
        
        for rnd in range(1, 10):
            self._sub_bytes(state)
            self._shift_rows(state)
            self._mix_columns(state)
            self._add_round_key(state, rnd)
            
        self._sub_bytes(state)
        self._shift_rows(state)
        self._add_round_key(state, 10)
        
        out = bytearray(16)
        for c in range(4):
            for r in range(4):
                out[r + 4*c] = state[r][c]
        return bytes(out)

if __name__ == "__main__":
    print("--- ADVANCED CRYPTOGRAPHY SUITE ---")
    
    # Test RSA
    print("\n[RSA Public-Key Encryption]")
    public, private = RSA.generate_keypair(keysize=256) # Small key for speed demo
    msg = "TOP SECRET DATA"
    print(f"Original Msg: {msg}")
    
    encrypted = RSA.encrypt(public, msg)
    print(f"Encrypted (first 3 ints): {encrypted[:3]}...")
    
    decrypted = RSA.decrypt(private, encrypted)
    print(f"Decrypted Msg: {decrypted}")
    
    # Test AES-128
    print("\n[AES-128 Block Encryption]")
    key = b"This is a key123"
    cipher = AES128(key)
    
    plaintext_block = b"16 bytes exactly"
    print(f"Key: {key}")
    print(f"Plaintext Block: {plaintext_block}")
    
    encrypted_block = cipher.encrypt_block(plaintext_block)
    print(f"Encrypted Hex: {encrypted_block.hex()}")
