import base64
import random
import zlib

MORSE = {
    "A": ".-", "B": "-...", "C": "-.-.", "D": "-..", "E": ".", "F": "..-.",
    "G": "--.", "H": "....", "I": "..", "J": ".---", "K": "-.-", "L": ".-..",
    "M": "--", "N": "-.", "O": "---", "P": ".--.", "Q": "--.-", "R": ".-.",
    "S": "...", "T": "-", "U": "..-", "V": "...-", "W": ".--", "X": "-..-",
    "Y": "-.--", "Z": "--..",
    "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
    "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
}
REVERSE_MORSE = {v: k for k, v in MORSE.items()}
B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"


def vigenere(text, key, decrypt=False):
    if not key or not key.isalpha():
        raise ValueError("Key must contain letters only")
    out = []
    k = 0
    for ch in text:
        if ch.isascii() and ch.isalpha():
            base = ord("A") if ch.isupper() else ord("a")
            shift = ord(key[k % len(key)].lower()) - ord("a")
            if decrypt:
                shift = -shift
            out.append(chr((ord(ch) - base + shift) % 26 + base))
            k += 1
        else:
            out.append(ch)
    return "".join(out)


def atbash(text):
    out = []
    for ch in text:
        if ch.isascii() and ch.isalpha():
            base = ord("A") if ch.isupper() else ord("a")
            out.append(chr(base + 25 - (ord(ch) - base)))
        else:
            out.append(ch)
    return "".join(out)


def rail_pattern(n, rails):
    pattern = []
    row = 0
    step = 1
    for _ in range(n):
        pattern.append(row)
        if rails == 1:
            continue
        if row == 0:
            step = 1
        elif row == rails - 1:
            step = -1
        row += step
    return pattern


def rail_encrypt(text, rails):
    pattern = rail_pattern(len(text), rails)
    order = sorted(range(len(text)), key=lambda i: (pattern[i], i))
    return "".join(text[i] for i in order)


def rail_decrypt(cipher, rails):
    pattern = rail_pattern(len(cipher), rails)
    order = sorted(range(len(cipher)), key=lambda i: (pattern[i], i))
    out = [""] * len(cipher)
    for pos, i in enumerate(order):
        out[i] = cipher[pos]
    return "".join(out)


def xor_bytes(data, key):
    return bytes(b ^ key[i % len(key)] for i, b in enumerate(data))


def b64_encode(data):
    out = []
    for i in range(0, len(data), 3):
        chunk = data[i:i + 3]
        n = int.from_bytes(chunk.ljust(3, b"\0"), "big")
        chars = [B64[(n >> s) & 63] for s in (18, 12, 6, 0)]
        pad = 3 - len(chunk)
        if pad:
            chars[4 - pad:] = "=" * pad
        out.append("".join(chars))
    return "".join(out)


def b64_decode(text):
    text = text.strip()
    if len(text) % 4:
        raise ValueError("Length must be a multiple of 4")
    out = bytearray()
    for i in range(0, len(text), 4):
        block = text[i:i + 4]
        pad = block.count("=")
        n = 0
        for ch in block.replace("=", "A"):
            n = n * 64 + B64.index(ch)
        out.extend(n.to_bytes(3, "big")[:3 - pad])
    return bytes(out)


def make_crc_table():
    table = []
    for n in range(256):
        c = n
        for _ in range(8):
            c = (c >> 1) ^ 0xEDB88320 if c & 1 else c >> 1
        table.append(c)
    return table


CRC_TABLE = make_crc_table()


def crc32(data):
    c = 0xFFFFFFFF
    for b in data:
        c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >> 8)
    return c ^ 0xFFFFFFFF


def adler32(data):
    a, b = 1, 0
    for byte in data:
        a = (a + byte) % 65521
        b = (b + a) % 65521
    return (b << 16) | a


def hamming_encode(nibble):
    d = [(nibble >> i) & 1 for i in (3, 2, 1, 0)]
    code = [0] * 8
    code[3], code[5], code[6], code[7] = d
    code[1] = code[3] ^ code[5] ^ code[7]
    code[2] = code[3] ^ code[6] ^ code[7]
    code[4] = code[5] ^ code[6] ^ code[7]
    return code[1:]


def hamming_decode(bits):
    code = [0] + list(bits)
    s1 = code[1] ^ code[3] ^ code[5] ^ code[7]
    s2 = code[2] ^ code[3] ^ code[6] ^ code[7]
    s4 = code[4] ^ code[5] ^ code[6] ^ code[7]
    error = s1 + 2 * s2 + 4 * s4
    if error:
        code[error] ^= 1
    nibble = (code[3] << 3) | (code[5] << 2) | (code[6] << 1) | code[7]
    return nibble, error


def morse_encode(text):
    words = []
    for word in text.upper().split():
        words.append(" ".join(MORSE[ch] for ch in word))
    return " / ".join(words)


def morse_decode(code):
    words = code.split(" / ")
    return " ".join("".join(REVERSE_MORSE[s] for s in w.split()) for w in words)


if __name__ == "__main__":
    plain = "ATTACKATDAWN"
    secret = vigenere(plain, "LEMON")
    print("Vigenere           :", secret)
    print("Known answer       :", secret == "LXFOPVEFRNHR")
    print("Decrypted          :", vigenere(secret, "LEMON", decrypt=True))
    mixed = "Hello, World! 123"
    print("Mixed case round trip:", vigenere(vigenere(mixed, "Key"), "Key", decrypt=True) == mixed)
    try:
        vigenere("abc", "k3y")
    except ValueError as e:
        print("Error              :", e)

    print()
    print("Atbash             :", atbash("Hello, World!"))
    print("Atbash twice       :", atbash(atbash("Hello, World!")))

    print()
    text = "WEAREDISCOVEREDFLEEATONCE"
    fence = rail_encrypt(text, 3)
    print("Rail fence         :", fence)
    print("Known answer       :", fence == "WECRLTEERDSOEEFEAOCAIVDEN")
    print("Decrypted          :", rail_decrypt(fence, 3))
    rails_ok = all(
        rail_decrypt(rail_encrypt(text[:n], r), r) == text[:n]
        for n in range(1, len(text) + 1)
        for r in range(1, 7)
    )
    print("Round trip, all sizes:", rails_ok)

    print()
    message = "Secret message".encode()
    key = b"k3y"
    encrypted = xor_bytes(message, key)
    print("XOR hex            :", encrypted.hex())
    print("XOR round trip     :", xor_bytes(encrypted, key) == message)

    print()
    rng = random.Random(3)
    b64_ok = True
    for length in range(0, 60):
        data = bytes(rng.randrange(256) for _ in range(length))
        if b64_encode(data) != base64.b64encode(data).decode():
            b64_ok = False
        if b64_decode(b64_encode(data)) != data:
            b64_ok = False
    print("Base64 of Man      :", b64_encode(b"Man"))
    print("Base64 of Ma, M    :", b64_encode(b"Ma"), b64_encode(b"M"))
    print("Base64 matches module:", b64_ok)
    try:
        b64_decode("abc")
    except ValueError as e:
        print("Error              :", e)

    print()
    samples = [b"", b"a", b"hello world", bytes(range(256)) * 20]
    print("CRC32 matches zlib   :", all(crc32(s) == zlib.crc32(s) for s in samples))
    print("Adler32 matches zlib :", all(adler32(s) == zlib.adler32(s) for s in samples))
    print("CRC32 of hello world :", hex(crc32(b"hello world")))

    print()
    clean = True
    fixed = True
    for nibble in range(16):
        word = hamming_encode(nibble)
        value, error = hamming_decode(word)
        if value != nibble or error != 0:
            clean = False
        for pos in range(7):
            damaged = word[:]
            damaged[pos] ^= 1
            value, error = hamming_decode(damaged)
            if value != nibble or error != pos + 1:
                fixed = False
    print("Hamming(7,4) clean words     :", clean)
    print("Hamming(7,4) fixes any 1-bit error:", fixed)

    print()
    code = morse_encode("SOS")
    print("Morse SOS          :", code)
    sentence = "Hello World 2026"
    code = morse_encode(sentence)
    print("Morse              :", code)
    print("Morse round trip   :", morse_decode(code) == sentence.upper())
    try:
        morse_encode("hi!")
    except KeyError as e:
        print("Error              : no Morse code for", e)
