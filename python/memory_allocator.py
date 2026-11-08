from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Block:
    offset: int
    size: int
    free: bool = True
    next: Optional["Block"] = None

class MemoryAllocator:
    def __init__(self, total_size=1024):
        self.total = total_size
        self.head = Block(0, total_size, free=True)
        self.allocations = {}  # id -> Block
        self.next_id = 1
        self.failed = 0

    def _coalesce(self):
        node = self.head
        while node and node.next:
            if node.free and node.next.free:
                node.size += node.next.size
                node.next = node.next.next
            else:
                node = node.next

    def malloc(self, size, strategy="first"):
        if size <= 0:
            return None
        prev = None
        node = self.head
        best = None
        best_prev = None
        while node:
            if node.free and node.size >= size:
                if strategy == "first":
                    best, best_prev = node, prev
                    break
                if strategy == "best":
                    if best is None or node.size < best.size:
                        best, best_prev = node, prev
                if strategy == "worst":
                    if best is None or node.size > best.size:
                        best, best_prev = node, prev
            prev = node
            node = node.next
        if best is None:
            self.failed += 1
            return None
        if best.size > size:
            new_block = Block(best.offset + size, best.size - size, free=True, next=best.next)
            best.size = size
            best.next = new_block
        best.free = False
        alloc_id = self.next_id
        self.next_id += 1
        self.allocations[alloc_id] = best
        return alloc_id

    def free(self, alloc_id):
        if alloc_id not in self.allocations:
            return False
        block = self.allocations.pop(alloc_id)
        block.free = True
        self._coalesce()
        return True

    def stats(self):
        free_blocks = 0
        free_bytes = 0
        used_bytes = 0
        largest_free = 0
        node = self.head
        while node:
            if node.free:
                free_blocks += 1
                free_bytes += node.size
                largest_free = max(largest_free, node.size)
            else:
                used_bytes += node.size
            node = node.next
        return {
            "used": used_bytes,
            "free": free_bytes,
            "free_blocks": free_blocks,
            "largest_free": largest_free,
            "failed": self.failed,
            "live_allocs": len(self.allocations),
        }

    def dump(self):
        parts = []
        node = self.head
        while node:
            tag = "FREE" if node.free else "USED"
            parts.append(f"[{tag} {node.offset}:{node.size}]")
            node = node.next
        return " ".join(parts)

def simulate(strategy, requests, total=512):
    alloc = MemoryAllocator(total)
    ids = {}
    for op, *args in requests:
        if op == "malloc":
            size, name = args
            aid = alloc.malloc(size, strategy=strategy)
            ids[name] = aid
        elif op == "free":
            name = args[0]
            if name in ids and ids[name] is not None:
                alloc.free(ids[name])
                del ids[name]
    return alloc

if __name__ == "__main__":
    requests = [
        ("malloc", 64, "a"),
        ("malloc", 32, "b"),
        ("malloc", 128, "c"),
        ("free", "b"),
        ("malloc", 16, "d"),
        ("malloc", 48, "e"),
        ("free", "a"),
        ("malloc", 60, "f"),
        ("malloc", 200, "g"),
        ("free", "c"),
        ("malloc", 100, "h"),
        ("malloc", 80, "i"),
    ]
    print("=== First-fit ===")
    a1 = simulate("first", requests)
    print(a1.dump())
    print("Stats:", a1.stats())
    print()
    print("=== Best-fit ===")
    a2 = simulate("best", requests)
    print(a2.dump())
    print("Stats:", a2.stats())
    print()
    print("=== Worst-fit ===")
    a3 = simulate("worst", requests)
    print(a3.dump())
    print("Stats:", a3.stats())
    print()

    # stress
    import random
    random.seed(9)
    for strategy in ("first", "best", "worst"):
        mem = MemoryAllocator(2048)
        live = []
        for _ in range(500):
            if live and random.random() < 0.4:
                mem.free(live.pop(random.randrange(len(live))))
            else:
                size = random.randint(8, 128)
                aid = mem.malloc(size, strategy=strategy)
                if aid is not None:
                    live.append(aid)
        s = mem.stats()
        print(f"{strategy:6}  used={s['used']:4}  free={s['free']:4}  "
              f"fragments={s['free_blocks']:3}  largest_free={s['largest_free']:4}  failed={s['failed']}")
