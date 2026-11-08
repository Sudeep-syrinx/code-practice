import random
from collections import defaultdict

class LZ77:
    def __init__(self, window=4096, lookahead=16):
        self.window = window
        self.lookahead = lookahead

    def compress(self, data: bytes):
        i = 0
        tokens = []
        n = len(data)
        while i < n:
            match_offset = 0
            match_len = 0
            start = max(0, i - self.window)
            max_len = min(self.lookahead, n - i)
            # search for longest match
            for j in range(start, i):
                length = 0
                while length < max_len and data[j + length] == data[i + length]:
                    length += 1
                if length > match_len:
                    match_len = length
                    match_offset = i - j
            if match_len >= 3:
                next_byte = data[i + match_len] if i + match_len < n else 0
                tokens.append((match_offset, match_len, next_byte))
                i += match_len + 1
            else:
                tokens.append((0, 0, data[i]))
                i += 1
        return tokens

    def decompress(self, tokens):
        out = bytearray()
        for offset, length, literal in tokens:
            if length > 0:
                start = len(out) - offset
                for k in range(length):
                    out.append(out[start + k])
            if isinstance(literal, int) and not (offset == 0 and length == 0 and literal == 0 and len(out) > 0):
                # always append literal except special end case
                out.append(literal)
            elif offset == 0 and length == 0:
                out.append(literal)
        return bytes(out)

def rle_encode(data: bytes):
    if not data:
        return []
    result = []
    count = 1
    prev = data[0]
    for b in data[1:]:
        if b == prev and count < 255:
            count += 1
        else:
            result.append((count, prev))
            prev = b
            count = 1
    result.append((count, prev))
    return result

def rle_decode(tokens):
    out = bytearray()
    for count, byte in tokens:
        out.extend([byte] * count)
    return bytes(out)

def huffman_like_freq(data: bytes):
    freq = defaultdict(int)
    for b in data:
        freq[b] += 1
    return dict(sorted(freq.items(), key=lambda x: -x[1]))

if __name__ == "__main__":
    random.seed(5)
    samples = [
        b"A" * 100,
        b"ABCABCABCABCABCABCABCABC",
        b"the quick brown fox jumps over the lazy dog " * 10,
        bytes([random.randint(0, 255) for _ in range(200)]),
        b"mississippi river " * 20,
    ]
    lz = LZ77(window=1024, lookahead=32)
    for i, data in enumerate(samples):
        tokens = lz.compress(data)
        restored = lz.decompress(tokens)
        ratio = len(tokens) * 3 / max(1, len(data))  # rough
        print(f"Sample {i+1}")
        print(f"  original     : {len(data)} bytes")
        print(f"  tokens       : {len(tokens)}")
        print(f"  round-trip   : {restored == data}")
        print(f"  rough ratio  : {ratio:.2f}")
        print()

    print("RLE on repeated data")
    data = b"A" * 50 + b"B" * 30 + b"C" * 20
    encoded = rle_encode(data)
    decoded = rle_decode(encoded)
    print("  encoded tokens:", encoded[:6], "...")
    print("  round-trip    :", decoded == data)
    print("  token count   :", len(encoded), "vs original", len(data))
    print()

    text = b"abracadabra abracadabra abracadabra"
    print("Frequency analysis:")
    freq = huffman_like_freq(text)
    for b, c in list(freq.items())[:8]:
        print(f"  {chr(b)!r}: {c}")
    print()

    # larger stress
    big = (b"Hello World! " * 500) + bytes(range(256)) * 5
    tokens = lz.compress(big)
    restored = lz.decompress(tokens)
    print("Large text + binary")
    print("  original :", len(big))
    print("  tokens   :", len(tokens))
    print("  correct  :", restored == big)
