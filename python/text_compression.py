import heapq
import collections


class HuffmanNode:
    def __init__(self, char, freq):
        self.char = char
        self.freq = freq
        self.left = None
        self.right = None

    def __lt__(self, other):
        return self.freq < other.freq


def build_frequency_table(text):
    return collections.Counter(text)


def build_huffman_tree(freq_table):
    heap = [HuffmanNode(char, freq) for char, freq in freq_table.items()]
    heapq.heapify(heap)
    
    while len(heap) > 1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        merged = HuffmanNode(None, left.freq + right.freq)
        merged.left = left
        merged.right = right
        heapq.heappush(heap, merged)
    
    return heap[0] if heap else None


def build_codes(node, prefix="", codebook=None):
    if codebook is None:
        codebook = {}
    if node is not None:
        if node.char is not None:
            codebook[node.char] = prefix or "0"
        build_codes(node.left, prefix + "0", codebook)
        build_codes(node.right, prefix + "1", codebook)
    return codebook


def compress(text):
    freq_table = build_frequency_table(text)
    tree = build_huffman_tree(freq_table)
    codes = build_codes(tree)
    encoded = "".join(codes[ch] for ch in text)
    return encoded, codes, tree


def decompress(encoded, tree):
    result = []
    node = tree
    for bit in encoded:
        node = node.left if bit == "0" else node.right
        if node.char is not None:
            result.append(node.char)
            node = tree
    return "".join(result)


if __name__ == "__main__":
    text = "this is an example of huffman coding"
    encoded, codes, tree = compress(text)
    
    print("Original text:", text)
    print(f"Original length: {len(text) * 8} bits")
    print(f"Encoded length: {len(encoded)} bits")
    print(f"Compression ratio: {len(encoded) / (len(text) * 8):.2%}")
    
    print("\nCodes:")
    for char, code in sorted(codes.items())[:5]:
        print(f"  '{char}': {code}")
    
    decoded = decompress(encoded, tree)
    print(f"\nDecoded successfully: {decoded == text}")
