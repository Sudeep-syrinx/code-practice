import heapq
from dataclasses import dataclass, field


@dataclass
class Task:
    name: str
    priority: int
    duration: int
    deps: list = field(default_factory=list)


class Scheduler:
    def __init__(self):
        self.tasks = {}

    def add(self, name, priority, duration, deps=None):
        if name in self.tasks:
            raise ValueError(f"Duplicate task: {name}")
        self.tasks[name] = Task(name, priority, duration, list(deps or []))

    def validate(self):
        for task in self.tasks.values():
            for dep in task.deps:
                if dep not in self.tasks:
                    raise ValueError(f"{task.name} depends on unknown task {dep}")

    def _graph(self):
        remaining = {name: len(t.deps) for name, t in self.tasks.items()}
        children = {name: [] for name in self.tasks}
        for t in self.tasks.values():
            for dep in t.deps:
                children[dep].append(t.name)
        return remaining, children

    def run_order(self):
        self.validate()
        remaining, children = self._graph()
        heap = [(t.priority, t.name) for t in self.tasks.values() if remaining[t.name] == 0]
        heapq.heapify(heap)
        order = []
        while heap:
            _, name = heapq.heappop(heap)
            order.append(name)
            for child in children[name]:
                remaining[child] -= 1
                if remaining[child] == 0:
                    heapq.heappush(heap, (self.tasks[child].priority, child))
        if len(order) != len(self.tasks):
            raise ValueError("Cycle detected in task dependencies")
        return order

    def simulate(self, workers):
        self.validate()
        remaining, children = self._graph()
        ready = [(t.priority, t.name) for t in self.tasks.values() if remaining[t.name] == 0]
        heapq.heapify(ready)
        running = []
        timeline = []
        time = 0
        while ready or running:
            while ready and len(running) < workers:
                _, name = heapq.heappop(ready)
                finish = time + self.tasks[name].duration
                heapq.heappush(running, (finish, name))
                timeline.append((name, time, finish))
            finish, name = heapq.heappop(running)
            time = finish
            for child in children[name]:
                remaining[child] -= 1
                if remaining[child] == 0:
                    heapq.heappush(ready, (self.tasks[child].priority, child))
        if len(timeline) != len(self.tasks):
            raise ValueError("Cycle detected in task dependencies")
        return timeline, time

    def critical_path_length(self):
        self.validate()
        finish = {}

        def visit(name):
            if name in finish:
                return finish[name]
            task = self.tasks[name]
            start = max((visit(d) for d in task.deps), default=0)
            finish[name] = start + task.duration
            return finish[name]

        return max(visit(n) for n in self.tasks)


def print_timeline(timeline, total):
    for name, start, end in sorted(timeline, key=lambda x: (x[1], x[0])):
        print(f"  {name:<10} {start:>2} -> {end:>2}")
    print(f"  Total time: {total}")


if __name__ == "__main__":
    s = Scheduler()
    s.add("design", 1, 3)
    s.add("database", 2, 4, ["design"])
    s.add("backend", 1, 5, ["design", "database"])
    s.add("frontend", 2, 4, ["design"])
    s.add("docs", 3, 2, ["design"])
    s.add("tests", 1, 2, ["backend", "frontend"])
    s.add("deploy", 1, 1, ["tests", "docs"])

    print("Run order:", s.run_order())
    print("Critical path length:", s.critical_path_length())

    for workers in (1, 2, 3):
        timeline, total = s.simulate(workers)
        print(f"With {workers} worker(s):")
        print_timeline(timeline, total)

    bad = Scheduler()
    bad.add("a", 1, 1, ["b"])
    bad.add("b", 1, 1, ["a"])
    try:
        bad.run_order()
    except ValueError as e:
        print("Error:", e)

    missing = Scheduler()
    missing.add("x", 1, 1, ["ghost"])
    try:
        missing.run_order()
    except ValueError as e:
        print("Error:", e)
