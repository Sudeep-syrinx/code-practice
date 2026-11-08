class MinHeap:
    def __init__(self):
        self.data = []

    def push(self, item):
        self.data.append(item)
        self.sift_up(len(self.data) - 1)

    def pop(self):
        if not self.data:
            raise IndexError("pop from empty heap")
        top = self.data[0]
        last = self.data.pop()
        if self.data:
            self.data[0] = last
            self.sift_down(0)
        return top

    def peek(self):
        if not self.data:
            raise IndexError("peek from empty heap")
        return self.data[0]

    def sift_up(self, i):
        while i > 0:
            parent = (i - 1) // 2
            if self.data[i] < self.data[parent]:
                self.data[i], self.data[parent] = self.data[parent], self.data[i]
                i = parent
            else:
                break

    def sift_down(self, i):
        n = len(self.data)
        while True:
            smallest = i
            left = 2 * i + 1
            right = 2 * i + 2
            if left < n and self.data[left] < self.data[smallest]:
                smallest = left
            if right < n and self.data[right] < self.data[smallest]:
                smallest = right
            if smallest == i:
                break
            self.data[i], self.data[smallest] = self.data[smallest], self.data[i]
            i = smallest

    def __len__(self):
        return len(self.data)


def heap_sort(values):
    heap = MinHeap()
    for v in values:
        heap.push(v)
    return [heap.pop() for _ in range(len(heap))]


def k_smallest(values, k):
    heap = MinHeap()
    for v in values:
        heap.push(v)
        if len(heap) > k:
            heap.pop()
    result = []
    while heap:
        result.append(heap.pop())
    return result[::-1]


if __name__ == "__main__":
    heap = MinHeap()
    for v in [5, 3, 8, 1, 9, 2]:
        heap.push(v)
    print("Peek       :", heap.peek())
    print("Sorted     :", heap_sort([4, 2, 9, 1, 7, 3]))
    print("3 smallest :", k_smallest([7, 1, 5, 3, 9, 2], 3))
    print("Heap valid :", all(heap.data[i] <= heap.data[2 * i + 1] for i in range(len(heap.data) // 2)))
