class IntervalTree:
    def __init__(self):
        self.root = None

    class Node:
        def __init__(self, low, high):
            self.low = low
            self.high = high
            self.max = high
            self.left = None
            self.right = None

    def insert(self, low, high):
        if not self.root:
            self.root = self.Node(low, high)
            return
        self._insert(self.root, low, high)

    def _insert(self, node, low, high):
        if low < node.low:
            if node.left:
                self._insert(node.left, low, high)
            else:
                node.left = self.Node(low, high)
        else:
            if node.right:
                self._insert(node.right, low, high)
            else:
                node.right = self.Node(low, high)
        node.max = max(node.max, high)

    def search_overlap(self, low, high):
        results = []
        self._search(self.root, low, high, results)
        return results

    def _search(self, node, low, high, results):
        if not node:
            return
        if node.low <= high and low <= node.high:
            results.append((node.low, node.high))
        if node.left and node.left.max >= low:
            self._search(node.left, low, high, results)
        if node.right and node.low <= high:
            self._search(node.right, low, high, results)

if __name__ == "__main__":
    tree = IntervalTree()
    intervals = [(15, 20), (10, 30), (17, 19), (5, 20), (12, 15), (30, 40)]
    for low, high in intervals:
        tree.insert(low, high)
    overlaps = tree.search_overlap(14, 16)
    print("Query [14, 16] overlaps with:", overlaps)
    print("Test passed:", len(overlaps) == 4)
