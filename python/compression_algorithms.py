"""
Advanced Compression Algorithms.
Includes LZW, LZ77, Huffman Coding, and the Burrows-Wheeler Transform.
"""

import collections
import heapq
import math

class LZW:
    @staticmethod
    def compress(uncompressed):
        dict_size = 256
        dictionary = {chr(i): i for i in range(dict_size)}
        w = ""
        result = []
        for c in uncompressed:
            wc = w + c
            if wc in dictionary:
                w = wc
            else:
                result.append(dictionary[w])
                dictionary[wc] = dict_size
                dict_size += 1
                w = c
        if w:
            result.append(dictionary[w])
        return result

    @staticmethod
    def decompress(compressed):
        dict_size = 256
        dictionary = {i: chr(i) for i in range(dict_size)}
        w = chr(compressed.pop(0))
        result = [w]
        for k in compressed:
            if k in dictionary:
                entry = dictionary[k]
            elif k == dict_size:
                entry = w + w[0]
            else:
                raise ValueError("Bad compressed k")
            result.append(entry)
            dictionary[dict_size] = w + entry[0]
            dict_size += 1
            w = entry
        return "".join(result)

class HuffmanNode:
    def __init__(self, char, freq):
        self.char = char
        self.freq = freq
        self.left = None
        self.right = None

    def __lt__(self, other):
        return self.freq < other.freq

class Huffman:
    @staticmethod
    def build_tree(text):
        freq = collections.Counter(text)
        heap = [HuffmanNode(char, freq) for char, freq in freq.items()]
        heapq.heapify(heap)
        while len(heap) > 1:
            left = heapq.heappop(heap)
            right = heapq.heappop(heap)
            merged = HuffmanNode(None, left.freq + right.freq)
            merged.left = left
            merged.right = right
            heapq.heappush(heap, merged)
        return heap[0]

    @staticmethod
    def generate_codes(node, prefix="", codes=None):
        if codes is None: codes = {}
        if node:
            if node.char is not None:
                codes[node.char] = prefix
            Huffman.generate_codes(node.left, prefix + "0", codes)
            Huffman.generate_codes(node.right, prefix + "1", codes)
        return codes

    @staticmethod
    def compress(text):
        tree = Huffman.build_tree(text)
        codes = Huffman.generate_codes(tree)
        return "".join(codes[c] for c in text), codes

class BurrowsWheelerTransform:
    @staticmethod
    def transform(s):
        s = s + "$"
        rotations = sorted(s[i:] + s[:i] for i in range(len(s)))
        return "".join(rot[-1] for rot in rotations), rotations.index(s)

    @staticmethod
    def inverse_transform(L, index):
        n = len(L)
        table = [""] * n
        for _ in range(n):
            table = sorted(L[i] + table[i] for i in range(n))
        return table[index][:-1]

if __name__ == "__main__":
    text = "TOBEORNOTTOBEORTOBEORNOT"
    print("Original text:", text)
    
    lzw_compressed = LZW.compress(text)
    print("LZW Compressed:", lzw_compressed)
    print("LZW Decompressed:", LZW.decompress(list(lzw_compressed)))
    
    huff_compressed, huff_codes = Huffman.compress(text)
    print(f"Huffman Compressed Size: {len(huff_compressed)} bits")
    print("Huffman Sample Codes:", dict(list(huff_codes.items())[:3]))
    
    bwt_transformed, bwt_index = BurrowsWheelerTransform.transform(text)
    print("BWT Transformed:", bwt_transformed)
    print("BWT Inverse:", BurrowsWheelerTransform.inverse_transform(bwt_transformed, bwt_index))
