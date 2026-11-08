import random
from collections import deque


class MinHeap:
    def __init__(self, items=None):
        self.data = []
        for item in items or []:
            self.push(item)

    def __len__(self):
        return len(self.data)

    def peek(self):
        if not self.data:
            raise IndexError("peek from empty heap")
        return self.data[0]

    def push(self, item):
        self.data.append(item)
        self._sift_up(len(self.data) - 1)

    def pop(self):
        if not self.data:
            raise IndexError("pop from empty heap")
        top = self.data[0]
        last = self.data.pop()
        if self.data:
            self.data[0] = last
            self._sift_down(0)
        return top

    def _sift_up(self, i):
        while i > 0:
            parent = (i - 1) // 2
            if self.data[i] < self.data[parent]:
                self.data[i], self.data[parent] = self.data[parent], self.data[i]
                i = parent
            else:
                break

    def _sift_down(self, i):
        n = len(self.data)
        while True:
            smallest = i
            left, right = 2 * i + 1, 2 * i + 2
            if left < n and self.data[left] < self.data[smallest]:
                smallest = left
            if right < n and self.data[right] < self.data[smallest]:
                smallest = right
            if smallest == i:
                break
            self.data[i], self.data[smallest] = self.data[smallest], self.data[i]
            i = smallest

    def is_valid(self):
        for i in range(1, len(self.data)):
            if self.data[i] < self.data[(i - 1) // 2]:
                return False
        return True


class PriorityQueue:
    def __init__(self):
        self.heap = MinHeap()
        self.counter = 0

    def push(self, item, priority):
        self.heap.push((priority, self.counter, item))
        self.counter += 1

    def pop(self):
        return self.heap.pop()[2]

    def __len__(self):
        return len(self.heap)


class MedianFinder:
    def __init__(self):
        self.low = MinHeap()
        self.high = MinHeap()

    def add(self, num):
        self.low.push(-num)
        self.high.push(-self.low.pop())
        if len(self.high) > len(self.low):
            self.low.push(-self.high.pop())

    def median(self):
        if len(self.low) == 0:
            raise ValueError("No numbers added yet")
        if len(self.low) > len(self.high):
            return -self.low.peek()
        return (-self.low.peek() + self.high.peek()) / 2


def heap_sort(items):
    heap = MinHeap(items)
    return [heap.pop() for _ in range(len(heap))]


def k_largest(items, k):
    heap = MinHeap()
    for x in items:
        heap.push(x)
        if len(heap) > k:
            heap.pop()
    return sorted(heap.data, reverse=True)


def kth_largest(items, k):
    heap = MinHeap()
    for x in items:
        heap.push(x)
        if len(heap) > k:
            heap.pop()
    return heap.peek()


def merge_sorted_lists(lists):
    heap = MinHeap()
    for i, lst in enumerate(lists):
        if lst:
            heap.push((lst[0], i, 0))
    merged = []
    while len(heap):
        value, i, j = heap.pop()
        merged.append(value)
        if j + 1 < len(lists[i]):
            heap.push((lists[i][j + 1], i, j + 1))
    return merged


def sliding_window_max(nums, k):
    window = deque()
    result = []
    for i, n in enumerate(nums):
        while window and nums[window[-1]] <= n:
            window.pop()
        window.append(i)
        if window[0] <= i - k:
            window.popleft()
        if i >= k - 1:
            result.append(nums[window[0]])
    return result


def running_medians(stream):
    finder = MedianFinder()
    medians = []
    for x in stream:
        finder.add(x)
        medians.append(finder.median())
    return medians


if __name__ == "__main__":
    data = [38, 27, 43, 3, 9, 82, 10, 3, -5]
    heap = MinHeap(data)
    print("Heap size        :", len(heap))
    print("Valid heap       :", heap.is_valid())
    print("Smallest         :", heap.peek())
    print("Popped in order  :", [heap.pop() for _ in range(len(heap))])

    rng = random.Random(5)
    big = [rng.randint(-1000, 1000) for _ in range(500)]
    print("Heap sort correct:", heap_sort(big) == sorted(big))
    print("Top 5 of 500     :", k_largest(big, 5))
    print("5th largest      :", kth_largest(big, 5))
    print("Matches sorted   :", kth_largest(big, 5) == sorted(big, reverse=True)[4])

    print()
    pq = PriorityQueue()
    pq.push("write report", 2)
    pq.push("fix server", 1)
    pq.push("reply to email", 3)
    pq.push("deploy patch", 1)
    pq.push("lunch", 3)
    order = []
    while len(pq):
        order.append(pq.pop())
    print("Priority order   :", order)

    print()
    print("Merged lists     :", merge_sorted_lists([[1, 4, 9], [2, 3, 10, 12], [], [0, 5]]))
    print("Window max       :", sliding_window_max([1, 3, -1, -3, 5, 3, 6, 7], 3))
    print("Running medians  :", running_medians([5, 15, 1, 3, 8, 7, 9, 10, 20, 2]))

    finder = MedianFinder()
    try:
        finder.median()
    except ValueError as e:
        print("Error            :", e)
    try:
        MinHeap().pop()
    except IndexError as e:
        print("Error            :", e)
