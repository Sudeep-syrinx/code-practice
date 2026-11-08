def huffman_encoding(data):
    freq = {}
    for char in data:
        freq[char] = freq.get(char, 0) + 1
        
    heap = [[weight, [char, ""]] for char, weight in freq.items()]
    import heapq
    heapq.heapify(heap)
    
    while len(heap) > 1:
        lo = heapq.heappop(heap)
        hi = heapq.heappop(heap)
        for pair in lo[1:]:
            pair[1] = '0' + pair[1]
        for pair in hi[1:]:
            pair[1] = '1' + pair[1]
        heapq.heappush(heap, [lo[0] + hi[0]] + lo[1:] + hi[1:])
        
    return sorted(heap[0][1:], key=lambda p: (len(p[-1]), p))

if __name__ == "__main__":
    text = "this is an example of huffman coding"
    codes = huffman_encoding(text)
    print("Huffman Codes:")
    for char, code in codes:
        print(f"  '{char}': {code}")
    print("Test passed:", len(codes) > 0)
