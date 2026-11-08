class Object:
    def __init__(self, name):
        self.name = name
        self.refs = []
        self.marked = False

    def __repr__(self):
        return self.name


class MarkSweepGC:
    def __init__(self):
        self.heap = []
        self.roots = []

    def allocate(self, name):
        obj = Object(name)
        self.heap.append(obj)
        return obj

    def add_root(self, obj):
        if obj not in self.roots:
            self.roots.append(obj)

    def remove_root(self, obj):
        if obj in self.roots:
            self.roots.remove(obj)

    def link(self, parent, child):
        if child not in parent.refs:
            parent.refs.append(child)

    def unlink(self, parent, child):
        if child in parent.refs:
            parent.refs.remove(child)

    def mark(self):
        stack = list(self.roots)
        while stack:
            obj = stack.pop()
            if not obj.marked:
                obj.marked = True
                stack.extend(obj.refs)

    def sweep(self):
        survivors = []
        collected = []
        for obj in self.heap:
            if obj.marked:
                obj.marked = False
                survivors.append(obj)
            else:
                collected.append(obj)
        self.heap = survivors
        return collected

    def collect(self):
        self.mark()
        return self.sweep()

    def stats(self):
        return len(self.heap), len(self.roots)


if __name__ == "__main__":
    gc = MarkSweepGC()
    a = gc.allocate("A")
    b = gc.allocate("B")
    c = gc.allocate("C")
    d = gc.allocate("D")
    e = gc.allocate("E")

    gc.add_root(a)
    gc.link(a, b)
    gc.link(b, c)
    gc.link(a, d)
    # e is unreachable

    print("Before GC heap size  :", gc.stats()[0])
    dead = gc.collect()
    print("Collected            :", [o.name for o in dead])
    print("After GC heap size   :", gc.stats()[0])
    print("E was collected      :", any(o.name == "E" for o in dead))
    print("C still alive        :", any(o.name == "C" for o in gc.heap))

    # make c unreachable
    gc.unlink(b, c)
    dead2 = gc.collect()
    print()
    print("After unlink C       :", [o.name for o in dead2])
    print("Heap now             :", [o.name for o in gc.heap])

    # cycle test
    gc2 = MarkSweepGC()
    x = gc2.allocate("X")
    y = gc2.allocate("Y")
    gc2.link(x, y)
    gc2.link(y, x)
    gc2.add_root(x)
    dead3 = gc2.collect()
    print()
    print("Cycle survived       :", dead3 == [] and len(gc2.heap) == 2)
    gc2.remove_root(x)
    dead4 = gc2.collect()
    print("Cycle collected      :", sorted(o.name for o in dead4) == ["X", "Y"])

    # stress
    import random
    rng = random.Random(9)
    ok = True
    for _ in range(40):
        g = MarkSweepGC()
        objs = [g.allocate(f"o{i}") for i in range(20)]
        for _ in range(30):
            a, b = rng.choice(objs), rng.choice(objs)
            if a is not b:
                g.link(a, b)
        roots = rng.sample(objs, rng.randint(1, 5))
        for r in roots:
            g.add_root(r)
        before = len(g.heap)
        dead = g.collect()
        after = len(g.heap)
        if before - after != len(dead):
            ok = False
        if any(o.marked for o in g.heap):
            ok = False
    print("40 random GC ok      :", ok)
