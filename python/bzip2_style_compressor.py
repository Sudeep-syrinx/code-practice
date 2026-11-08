import heapq
from collections import defaultdict, Counter
from typing import List, Tuple, Dict

# --- 1. BURROWS-WHEELER TRANSFORM (BWT) ---
def bwt_transform(s: str) -> Tuple[str, int]:
    # Appending EOF marker (using a non-printable char for internal simulation)
    s = s + '\0'
    table = sorted(s[i:] + s[:i] for i in range(len(s)))
    last_column = "".join([row[-1] for row in table])
    primary_index = table.index(s)
    return last_column, primary_index

def bwt_inverse(bwt_str: str, primary_index: int) -> str:
    table = [""] * len(bwt_str)
    for _ in range(len(bwt_str)):
        table = sorted([bwt_str[i] + table[i] for i in range(len(bwt_str))])
    return table[primary_index].rstrip('\0')

# --- 2. MOVE-TO-FRONT (MTF) CODING ---
def mtf_encode(s: str) -> List[int]:
    alphabet = list(set(s))
    alphabet.sort()
    
    encoded = []
    for char in s:
        idx = alphabet.index(char)
        encoded.append(idx)
        # Move to front
        alphabet.pop(idx)
        alphabet.insert(0, char)
    return encoded, alphabet # Returning initial alphabet for decoding

def mtf_decode(encoded: List[int], alphabet: List[str]) -> str:
    alphabet = alphabet.copy()
    decoded = []
    for idx in encoded:
        char = alphabet[idx]
        decoded.append(char)
        alphabet.pop(idx)
        alphabet.insert(0, char)
    return "".join(decoded)

# --- 3. RUN-LENGTH ENCODING (RLE) ON MTF ---
def rle_encode(data: List[int]) -> List[int]:
    # Specifically good for sequences of 0s produced by MTF
    if not data: return []
    encoded = []
    current_val = data[0]
    count = 1
    
    for val in data[1:]:
        if val == current_val:
            count += 1
        else:
            encoded.extend([current_val, count])
            current_val = val
            count = 1
    encoded.extend([current_val, count])
    return encoded

def rle_decode(data: List[int]) -> List[int]:
    decoded = []
    for i in range(0, len(data), 2):
        val, count = data[i], data[i+1]
        decoded.extend([val] * count)
    return decoded

# --- 4. HUFFMAN CODING ---
class Node:
    def __init__(self, char, freq):
        self.char = char
        self.freq = freq
        self.left = None
        self.right = None

    def __lt__(self, other):
        return self.freq < other.freq

def build_huffman_tree(data: List[int]) -> Node:
    frequency = Counter(data)
    heap = [Node(sym, freq) for sym, freq in frequency.items()]
    heapq.heapify(heap)

    while len(heap) > 1:
        node1 = heapq.heappop(heap)
        node2 = heapq.heappop(heap)
        merged = Node(None, node1.freq + node2.freq)
        merged.left = node1
        merged.right = node2
        heapq.heappush(heap, merged)
        
    return heap[0] if heap else None

def build_codes(node: Node, current_code: str, codes: Dict[int, str]):
    if node is None: return
    if node.char is not None:
        codes[node.char] = current_code
    build_codes(node.left, current_code + "0", codes)
    build_codes(node.right, current_code + "1", codes)

def huffman_encode(data: List[int]) -> Tuple[str, Node]:
    root = build_huffman_tree(data)
    codes = {}
    build_codes(root, "", codes)
    encoded_bits = "".join([codes[val] for val in data])
    return encoded_bits, root

def huffman_decode(encoded_bits: str, root: Node) -> List[int]:
    decoded_data = []
    current = root
    for bit in encoded_bits:
        if bit == '0': current = current.left
        else: current = current.right
        
        if current.char is not None:
            decoded_data.append(current.char)
            current = root
    return decoded_data

# --- COMPRESSION PIPELINE ---
def compress(text: str):
    # 1. BWT
    bwt_str, bwt_idx = bwt_transform(text)
    # 2. MTF
    mtf_data, mtf_alphabet = mtf_encode(bwt_str)
    # 3. RLE
    rle_data = rle_encode(mtf_data)
    # 4. Huffman
    huff_bits, huff_tree = huffman_encode(rle_data)
    
    return {
        'bits': huff_bits,
        'bwt_idx': bwt_idx,
        'mtf_alphabet': mtf_alphabet,
        'huff_tree': huff_tree,
        'original_len': len(text)
    }

def decompress(compressed: dict) -> str:
    # 4. Inverse Huffman
    rle_data = huffman_decode(compressed['bits'], compressed['huff_tree'])
    # 3. Inverse RLE
    mtf_data = rle_decode(rle_data)
    # 2. Inverse MTF
    bwt_str = mtf_decode(mtf_data, compressed['mtf_alphabet'])
    # 1. Inverse BWT
    original_text = bwt_inverse(bwt_str, compressed['bwt_idx'])
    
    return original_text

if __name__ == "__main__":
    print("--- ADVANCED DATA COMPRESSION PIPELINE ---")
    print("(BWT -> MTF -> RLE -> Huffman)\n")
    
    original_text = "abracadabraabracadabraabracadabra... repeating data compresses well! " * 5
    print(f"Original Text Length: {len(original_text)} chars")
    
    # Compress
    compressed = compress(original_text)
    bit_length = len(compressed['bits'])
    print(f"Compressed Binary String Length: {bit_length} bits")
    print(f"Estimated Compression Ratio (vs 8-bit ASCII): {(len(original_text)*8) / bit_length:.2f}x")
    
    # Decompress
    decompressed_text = decompress(compressed)
    print("\nDecompression Verification:")
    print("Matches Original:", decompressed_text == original_text)
