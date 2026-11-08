import heapq

def merge_k_sorted_lists(lists):
    heap = []
    for i, lst in enumerate(lists):
        if lst:
            heapq.heappush(heap, (lst[0], i, 0))
            
    result = []
    while heap:
        val, list_idx, element_idx = heapq.heappop(heap)
        result.append(val)
        if element_idx + 1 < len(lists[list_idx]):
            next_val = lists[list_idx][element_idx + 1]
            heapq.heappush(heap, (next_val, list_idx, element_idx + 1))
            
    return result

if __name__ == "__main__":
    lists = [
        [1, 4, 5],
        [1, 3, 4],
        [2, 6]
    ]
    merged = merge_k_sorted_lists(lists)
    print("Merged List:", merged)
    print("Expected:", [1, 1, 2, 3, 4, 4, 5, 6])
    print("Match:", merged == [1, 1, 2, 3, 4, 4, 5, 6])
