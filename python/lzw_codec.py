import random
import struct
import time


def lzw_encode(data):
    table = {bytes([i]): i for i in range(256)}
    nxt = 256
    cur = b""
    out = []
    for b in data:
        cand = cur + bytes([b])
        if cand in table:
            cur = cand
        else:
            out.append(table[cur])
            table[cand] = nxt
            nxt += 1
            cur = bytes([b])
    if cur:
        out.append(table[cur])
    return out


def lzw_decode(codes):
    if not codes:
        return b""
    if not 0 <= codes[0] < 256:
        raise ValueError("bad first code %d" % codes[0])
    table = {i: bytes([i]) for i in range(256)}
    nxt = 256
    prev = table[codes[0]]
    out = [prev]
    for code in codes[1:]:
        if code in table:
            entry = table[code]
        elif code == nxt:
            entry = prev + prev[:1]
        else:
            raise ValueError("bad code %d" % code)
        out.append(entry)
        table[nxt] = prev + entry[:1]
        nxt += 1
        prev = entry
    return b"".join(out)


def code_width(i):
    return max(9, (255 + i).bit_length())


def pack(codes):
    acc = 0
    nbits = 0
    out = bytearray()
    for i, c in enumerate(codes):
        w = code_width(i)
        acc = (acc << w) | c
        nbits += w
        while nbits >= 8:
            nbits -= 8
            out.append((acc >> nbits) & 0xFF)
        acc &= (1 << nbits) - 1
    if nbits:
        out.append((acc << (8 - nbits)) & 0xFF)
    return struct.pack(">I", len(codes)) + bytes(out)


def unpack(blob):
    if len(blob) < 4:
        raise ValueError("blob too short")
    count = struct.unpack(">I", blob[:4])[0]
    acc = 0
    nbits = 0
    pos = 4
    codes = []
    for i in range(count):
        w = code_width(i)
        while nbits < w:
            if pos >= len(blob):
                raise ValueError("truncated data")
            acc = (acc << 8) | blob[pos]
            pos += 1
            nbits += 8
        nbits -= w
        codes.append((acc >> nbits) & ((1 << w) - 1))
        acc &= (1 << nbits) - 1
    return codes


def compress(data):
    return pack(lzw_encode(data))


def decompress(blob):
    return lzw_decode(unpack(blob))


def raises(fn, exc):
    try:
        fn()
    except exc:
        return True
    except Exception:
        return False
    return False


if __name__ == "__main__":
    results = []

    def check(name, actual, expected):
        ok = actual == expected
        results.append(ok)
        print(f"{name:<26}{str(actual)[:40]:<42}{'ok' if ok else 'MISMATCH expected ' + str(expected)}")

    sample = b"TOBEORNOTTOBEORTOBEORNOT"
    codes = lzw_encode(sample)
    check("classic codes", codes, [84, 79, 66, 69, 79, 82, 78, 79, 84, 256, 258, 260, 265, 259, 261, 263])
    check("classic decode", lzw_decode(codes), sample)
    check("empty input", decompress(compress(b"")), b"")
    check("one byte", decompress(compress(b"x")), b"x")
    check("repeated byte", decompress(compress(b"a" * 1000)), b"a" * 1000)
    check("all 256 values", decompress(compress(bytes(range(256)))), bytes(range(256)))

    text = b"the quick brown fox " * 500
    blob = compress(text)
    check("text round trip", decompress(blob), text)
    check("text shrinks a lot", len(blob) < len(text) // 10, True)
    print(f"  {len(text)} bytes -> {len(blob)} bytes")

    print()
    check("bad first code", raises(lambda: lzw_decode([300]), ValueError), True)
    check("bad later code", raises(lambda: lzw_decode([97, 999]), ValueError), True)
    check("truncated blob", raises(lambda: decompress(compress(b"hello world")[:-2]), ValueError), True)
    check("tiny blob", raises(lambda: decompress(b"\x00"), ValueError), True)

    rng = random.Random(7)
    ok = True
    for _ in range(300):
        alphabet = rng.choice([2, 4, 16, 256])
        data = bytes(rng.randrange(alphabet) for _ in range(rng.randint(0, 3000)))
        if decompress(compress(data)) != data:
            ok = False
    print()
    print("300 random inputs round trip :", ok)
    results.append(ok)

    big = bytes(rng.randrange(3) for _ in range(200000))
    start = time.perf_counter()
    packed = compress(big)
    back = decompress(packed)
    elapsed = time.perf_counter() - start
    print("200000 byte stress test      :", back == big, f"({elapsed:.2f}s, {len(packed)} bytes)")
    results.append(back == big)

    print()
    print("Passed         :", sum(results), "of", len(results))
    print("All correct    :", all(results))
