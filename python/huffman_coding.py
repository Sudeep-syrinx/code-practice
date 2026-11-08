import heapq
import math
from collections import Counter


class HuffNode:
    def __init__(self, char, freq, left=None, right=None, order=0):
        self.char = char
        self.freq = freq
        self.left = left
        self.right = right
        self.order = order

    def __lt__(self, other):
        return (self.freq, self.order) < (other.freq, other.order)


def build_tree(text):
    if not text:
        return None
    freq = Counter(text)
    heap = []
    order = 0
    for ch, f in sorted(freq.items()):
        heap.append(HuffNode(ch, f, order=order))
        order += 1
    heapq.heapify(heap)
    if len(heap) == 1:
        only = heapq.heappop(heap)
        return HuffNode(None, only.freq, only, None, order)
    while len(heap) > 1:
        a = heapq.heappop(heap)
        b = heapq.heappop(heap)
        heapq.heappush(heap, HuffNode(None, a.freq + b.freq, a, b, order))
        order += 1
    return heap[0]


def build_codes(node, prefix="", codes=None):
    if codes is None:
        codes = {}
    if node.char is not None:
        codes[node.char] = prefix or "0"
        return codes
    if node.left:
        build_codes(node.left, prefix + "0", codes)
    if node.right:
        build_codes(node.right, prefix + "1", codes)
    return codes


def encode(text, codes):
    return "".join(codes[ch] for ch in text)


def decode(bits, root):
    out = []
    node = root
    for b in bits:
        node = node.left if b == "0" else node.right
        if node.char is not None:
            out.append(node.char)
            node = root
    return "".join(out)


def pack(bits):
    padding = (8 - len(bits) % 8) % 8
    padded = bits + "0" * padding
    data = bytes(int(padded[i:i + 8], 2) for i in range(0, len(padded), 8))
    return data, padding


def unpack(data, padding):
    bits = "".join(format(b, "08b") for b in data)
    return bits[:len(bits) - padding] if padding else bits


def entropy(text):
    freq = Counter(text)
    n = len(text)
    value = -sum(f / n * math.log2(f / n) for f in freq.values())
    return abs(value)


def average_code_length(text, codes):
    freq = Counter(text)
    return sum(f * len(codes[ch]) for ch, f in freq.items()) / len(text)


def is_prefix_free(codes):
    values = list(codes.values())
    for i, a in enumerate(values):
        for j, b in enumerate(values):
            if i != j and b.startswith(a):
                return False
    return True


def tree_height(node):
    if node is None:
        return 0
    return 1 + max(tree_height(node.left), tree_height(node.right))


def show_codes(text, codes):
    freq = Counter(text)
    for ch in sorted(codes, key=lambda c: (len(codes[c]), c)):
        shown = repr(ch)
        print(f"  {shown:<6} freq {freq[ch]:>3}  code {codes[ch]}")


if __name__ == "__main__":
    samples = [
        "abracadabra",
        "this is an example of a huffman tree",
        "aaaaaaaa",
        "mississippi river",
        "to be or not to be that is the question",
    ]
    for text in samples:
        root = build_tree(text)
        codes = build_codes(root)
        bits = encode(text, codes)
        data, padding = pack(bits)
        restored = decode(unpack(data, padding), root)
        original_bits = len(text) * 8
        print(f"Text            : {text!r}")
        show_codes(text, codes)
        print("  Original bits :", original_bits)
        print("  Encoded bits  :", len(bits))
        print("  Packed bytes  :", len(data), "padding", padding)
        print("  Saved         :", f"{(1 - len(bits) / original_bits) * 100:.1f}%")
        print("  Entropy       :", round(entropy(text), 3))
        print("  Avg code len  :", round(average_code_length(text, codes), 3))
        print("  Prefix free   :", is_prefix_free(codes))
        print("  Tree height   :", tree_height(root))
        print("  Round trip    :", restored == text)
        print()
    print("Empty text tree :", build_tree(""))
