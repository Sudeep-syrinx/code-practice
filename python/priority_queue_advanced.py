import heapq


class PriorityQueue:
    def __init__(self):
        self.heap = []
        self.counter = 0

    def push(self, item, priority):
        heapq.heappush(self.heap, (-priority, self.counter, item))
        self.counter += 1

    def pop(self):
        if not self.heap:
            raise IndexError("pop from empty queue")
        return heapq.heappop(self.heap)[-1]

    def peek(self):
        if not self.heap:
            raise IndexError("peek from empty queue")
        return self.heap[0][-1]

    def __len__(self):
        return len(self.heap)


class MeldableHeap:
    class Node:
        def __init__(self, value):
            self.value = value
            self.left = None
            self.right = None

    def __init__(self):
        self.root = None

    def meld(self, a, b):
        if not a:
            return b
        if not b:
            return a
        if a.value > b.value:
            a, b = b, a
        a.right = self.meld(a.right, b)
        a.left, a.right = a.right, a.left
        return a

    def push(self, value):
        self.root = self.meld(self.root, self.Node(value))

    def pop(self):
        if not self.root:
            raise IndexError("pop from empty heap")
        val = self.root.value
        self.root = self.meld(self.root.left, self.root.right)
        return val


if __name__ == "__main__":
    print("Standard Priority Queue:")
    pq = PriorityQueue()
    for i, task in enumerate(["write", "test", "deploy", "review"]):
        pq.push(task, i)
    print(f"  Highest priority: {pq.pop()}")
    print(f"  Next: {pq.pop()}")
    print(f"  Remaining count: {len(pq)}")
    
    print("\nMeldable Heap:")
    mh = MeldableHeap()
    for val in [5, 2, 8, 1, 9]:
        mh.push(val)
    print(f"  Min: {mh.pop()}")
    print(f"  Next: {mh.pop()}")
