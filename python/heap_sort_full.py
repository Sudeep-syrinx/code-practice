class MaxHeap:
    def __init__(self):
        self.heap = []

    def push(self, val):
        self.heap.append(val)
        self._sift_up(len(self.heap) - 1)

    def pop(self):
        if not self.heap: return None
        if len(self.heap) == 1: return self.heap.pop()
        root = self.heap[0]
        self.heap[0] = self.heap.pop()
        self._sift_down(0)
        return root

    def _sift_up(self, i):
        parent = (i - 1) // 2
        if parent >= 0 and self.heap[i] > self.heap[parent]:
            self.heap[i], self.heap[parent] = self.heap[parent], self.heap[i]
            self._sift_up(parent)

    def _sift_down(self, i):
        largest = i
        left = 2 * i + 1
        right = 2 * i + 2
        n = len(self.heap)
        if left < n and self.heap[left] > self.heap[largest]:
            largest = left
        if right < n and self.heap[right] > self.heap[largest]:
            largest = right
        if largest != i:
            self.heap[i], self.heap[largest] = self.heap[largest], self.heap[i]
            self._sift_down(largest)

def heap_sort(arr):
    heap = MaxHeap()
    for x in arr:
        heap.push(x)
    return [heap.pop() for _ in range(len(arr))]

if __name__ == "__main__":
    arr = [12, 11, 13, 5, 6, 7]
    print("Original:", arr)
    sorted_arr = heap_sort(arr)
    print("Heap Sorted:", sorted_arr)
    print("Test passed:", sorted_arr == [13, 12, 11, 7, 6, 5])
