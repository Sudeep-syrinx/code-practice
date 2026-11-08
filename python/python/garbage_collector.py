class Object:
    def __init__(self, id, size, refs=None):
        self.id = id
        self.size = size
        self.refs = refs or []
        self.marked = False
        self.forward = None  # for copying GC

class Heap:
    def __init__(self, capacity=1000):
        self.capacity = capacity
        self.objects = {}
        self.used = 0
        self.next_id = 1
        self.roots = []

    def allocate(self, size, refs=None):
        if self.used + size > self.capacity:
            return None
        obj = Object(self.next_id, size, refs or [])
        self.objects[obj.id] = obj
        self.next_id += 1
        self.used += size
        return obj

    def add_root(self, obj):
        if obj and obj.id in self.objects:
            self.roots.append(obj.id)

    def clear_roots(self):
        self.roots = []

class MarkSweepGC:
    def __init__(self, heap):
        self.heap = heap
        self.collections = 0
        self.freed = 0

    def mark(self):
        stack = list(self.heap.roots)
        while stack:
            oid = stack.pop()
            obj = self.heap.objects.get(oid)
            if obj and not obj.marked:
                obj.marked = True
                for ref in obj.refs:
                    if ref in self.heap.objects:
                        stack.append(ref)

    def sweep(self):
        to_delete = []
        for oid, obj in self.heap.objects.items():
            if not obj.marked:
                to_delete.append(oid)
                self.heap.used -= obj.size
                self.freed += obj.size
            else:
                obj.marked = False
        for oid in to_delete:
            del self.heap.objects[oid]
        self.collections += 1

    def collect(self):
        self.mark()
        before = len(self.heap.objects)
        self.sweep()
        after = len(self.heap.objects)
        return before - after

class CopyingGC:
    def __init__(self, heap):
        self.heap = heap
        self.from_space = {}
        self.to_space = {}
        self.collections = 0

    def collect(self):
        self.to_space = {}
        self.from_space = dict(self.heap.objects)
        new_roots = []
        for rid in self.heap.roots:
            if rid in self.from_space:
                new_obj = self._copy(self.from_space[rid])
                new_roots.append(new_obj.id)
        self.heap.objects = self.to_space
        self.heap.roots = new_roots
        self.heap.used = sum(o.size for o in self.to_space.values())
        self.collections += 1
        return len(self.from_space) - len(self.to_space)

    def _copy(self, obj):
        if obj.forward:
            return self.to_space[obj.forward]
        new_obj = Object(obj.id, obj.size, [])
        self.to_space[obj.id] = new_obj
        obj.forward = obj.id
        for ref in obj.refs:
            if ref in self.from_space:
                child = self._copy(self.from_space[ref])
                new_obj.refs.append(child.id)
        return new_obj

if __name__ == "__main__":
    print("=== Mark-Sweep GC ===")
    heap = Heap(capacity=500)
    gc = MarkSweepGC(heap)

    # allocate some objects
    a = heap.allocate(50)
    b = heap.allocate(30, refs=[a.id] if a else [])
    c = heap.allocate(40)
    d = heap.allocate(20, refs=[c.id] if c else [])
    e = heap.allocate(60)
    heap.add_root(b)
    heap.add_root(d)
    print(f"Allocated: {len(heap.objects)} objects, used={heap.used}")
    # a and e are garbage if not reachable
    freed = gc.collect()
    print(f"After GC: freed {freed} objects, remaining={len(heap.objects)}, used={heap.used}")
    print(f"Collections: {gc.collections}, total freed bytes: {gc.freed}")
    print()

    print("=== Copying GC ===")
    heap2 = Heap(capacity=500)
    cgc = CopyingGC(heap2)
    x = heap2.allocate(40)
    y = heap2.allocate(30, refs=[x.id] if x else [])
    z = heap2.allocate(50)
    w = heap2.allocate(25, refs=[y.id] if y else [])
    heap2.add_root(w)
    print(f"Before: {len(heap2.objects)} objects, used={heap2.used}")
    freed2 = cgc.collect()
    print(f"After copy GC: freed {freed2}, remaining={len(heap2.objects)}, used={heap2.used}")
    print(f"Collections: {cgc.collections}")
    print()

    # stress
    heap3 = Heap(capacity=2000)
    gc3 = MarkSweepGC(heap3)
    live = []
    for i in range(100):
        obj = heap3.allocate(10 + i % 20)
        if obj and i % 3 == 0:
            live.append(obj)
            heap3.add_root(obj)
        if i % 10 == 9:
            gc3.collect()
    print("Stress mark-sweep")
    print(f"  live roots approx: {len(live)}")
    print(f"  objects left     : {len(heap3.objects)}")
    print(f"  collections      : {gc3.collections}")
    print(f"  total freed bytes: {gc3.freed}")
