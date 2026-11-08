from collections import deque, OrderedDict
import random

class PageReplacement:
    def __init__(self, frames):
        self.frames = frames
        self.memory = []
        self.page_faults = 0
        self.hits = 0

    def access(self, page):
        raise NotImplementedError

    def stats(self):
        total = self.hits + self.page_faults
        return {
            "faults": self.page_faults,
            "hits": self.hits,
            "fault_rate": round(self.page_faults / total * 100, 1) if total else 0,
        }

class FIFO(PageReplacement):
    def __init__(self, frames):
        super().__init__(frames)
        self.queue = deque()

    def access(self, page):
        if page in self.memory:
            self.hits += 1
            return False
        self.page_faults += 1
        if len(self.memory) >= self.frames:
            victim = self.queue.popleft()
            self.memory.remove(victim)
        self.memory.append(page)
        self.queue.append(page)
        return True

class LRU(PageReplacement):
    def __init__(self, frames):
        super().__init__(frames)
        self.order = OrderedDict()

    def access(self, page):
        if page in self.order:
            self.hits += 1
            self.order.move_to_end(page)
            return False
        self.page_faults += 1
        if len(self.order) >= self.frames:
            self.order.popitem(last=False)
        self.order[page] = None
        self.memory = list(self.order.keys())
        return True

class Optimal(PageReplacement):
    def __init__(self, frames, reference):
        super().__init__(frames)
        self.reference = reference
        self.index = 0

    def access(self, page):
        if page in self.memory:
            self.hits += 1
            self.index += 1
            return False
        self.page_faults += 1
        if len(self.memory) >= self.frames:
            # replace page used farthest in future
            farthest = -1
            victim = self.memory[0]
            for p in self.memory:
                try:
                    next_use = self.reference[self.index + 1:].index(p)
                except ValueError:
                    next_use = float("inf")
                if next_use > farthest:
                    farthest = next_use
                    victim = p
            self.memory.remove(victim)
        self.memory.append(page)
        self.index += 1
        return True

class Clock(PageReplacement):
    def __init__(self, frames):
        super().__init__(frames)
        self.clock = []
        self.hand = 0
        self.ref_bit = {}

    def access(self, page):
        if page in self.ref_bit:
            self.hits += 1
            self.ref_bit[page] = 1
            return False
        self.page_faults += 1
        if len(self.clock) < self.frames:
            self.clock.append(page)
            self.ref_bit[page] = 1
        else:
            while True:
                p = self.clock[self.hand]
                if self.ref_bit[p] == 0:
                    del self.ref_bit[p]
                    self.clock[self.hand] = page
                    self.ref_bit[page] = 1
                    self.hand = (self.hand + 1) % self.frames
                    break
                self.ref_bit[p] = 0
                self.hand = (self.hand + 1) % self.frames
        self.memory = list(self.clock)
        return True

def run_simulation(algo_cls, frames, reference, **kwargs):
    if algo_cls is Optimal:
        algo = algo_cls(frames, reference)
    else:
        algo = algo_cls(frames)
    for page in reference:
        algo.access(page)
    return algo.stats()

if __name__ == "__main__":
    reference = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]
    print("Reference string:", reference)
    print()
    for frames in (3, 4):
        print(f"=== {frames} frames ===")
        for name, cls in [("FIFO", FIFO), ("LRU", LRU), ("Optimal", Optimal), ("Clock", Clock)]:
            stats = run_simulation(cls, frames, reference)
            print(f"  {name:<8} faults={stats['faults']:2}  hits={stats['hits']:2}  fault_rate={stats['fault_rate']}%")
        print()

    # random workload
    random.seed(12)
    ref2 = [random.randint(0, 9) for _ in range(100)]
    print("Random 100 accesses, 4 frames")
    for name, cls in [("FIFO", FIFO), ("LRU", LRU), ("Optimal", Optimal), ("Clock", Clock)]:
        stats = run_simulation(cls, 4, ref2)
        print(f"  {name:<8} faults={stats['faults']:3}  fault_rate={stats['fault_rate']}%")
    print()
    print("Optimal should have fewest or equal faults")
