class MaxHeap:
    def __init__(self):
        self.heap = []

    def push(self, val):
        self.heap.append(val)
        self._sift_up(len(self.heap) - 1)

    def pop(self):
        if not self.heap: return None
        if len(self.heap) == 1: return self.heap.pop()
        top = self.heap[0]
        self.heap[0] = self.heap.pop()
        self._sift_down(0)
        return top

    def _sift_up(self, i):
        parent = (i - 1) // 2
        if parent >= 0 and self.heap[i] > self.heap[parent]:
            self.heap[i], self.heap[parent] = self.heap[parent], self.heap[i]
            self._sift_up(parent)

    def _sift_down(self, i):
        largest = i
        left = 2 * i + 1
        right = 2 * i + 2
        
        if left < len(self.heap) and self.heap[left] > self.heap[largest]:
            largest = left
        if right < len(self.heap) and self.heap[right] > self.heap[largest]:
            largest = right
            
        if largest != i:
            self.heap[i], self.heap[largest] = self.heap[largest], self.heap[i]
            self._sift_down(largest)

def find_kth_largest(nums, k):
    heap = MaxHeap()
    for num in nums:
        heap.push(num)
    for _ in range(k - 1):
        heap.pop()
    return heap.pop()

if __name__ == "__main__":
    data = [3, 2, 1, 5, 6, 4]
    print("Array:", data)
    print("2nd Largest:", find_kth_largest(data, 2))
    print("3rd Largest:", find_kth_largest(data, 3))
    print("Correct:", find_kth_largest(data, 2) == 5 and find_kth_largest(data, 3) == 4)
