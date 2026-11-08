import heapq

class Node:
    def __init__(self, char, freq):
        self.char = char
        self.freq = freq
        self.left = None
        self.right = None

    def __lt__(self, other):
        return self.freq < other.freq

def build_huffman_tree(text):
    frequency = {}
    for char in text:
        frequency[char] = frequency.get(char, 0) + 1
        
    heap = [Node(char, freq) for char, freq in frequency.items()]
    heapq.heapify(heap)
    
    while len(heap) > 1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        merged = Node(None, left.freq + right.freq)
        merged.left = left
        merged.right = right
        heapq.heappush(heap, merged)
        
    return heap[0]

def generate_codes(node, prefix="", code_dict={}):
    if node is not None:
        if node.char is not None:
            code_dict[node.char] = prefix
        generate_codes(node.left, prefix + "0", code_dict)
        generate_codes(node.right, prefix + "1", code_dict)
    return code_dict

if __name__ == "__main__":
    text = "this is a test text for huffman encoding"
    tree = build_huffman_tree(text)
    codes = generate_codes(tree)
    print("Huffman Codes:")
    for char, code in sorted(codes.items(), key=lambda x: len(x[1])):
        print(f"  '{char}': {code}")
    print("Test passed:", len(codes) > 0)
