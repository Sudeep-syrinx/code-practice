import json
from dataclasses import dataclass, field, asdict
from datetime import date, timedelta

PRIORITIES = {"low": 1, "medium": 2, "high": 3, "urgent": 4}


@dataclass
class Task:
    id: int
    title: str
    priority: str = "medium"
    due: date = None
    tags: list = field(default_factory=list)
    done: bool = False
    notes: str = ""

    def to_dict(self):
        data = asdict(self)
        data["due"] = self.due.isoformat() if self.due else None
        return data

    @staticmethod
    def from_dict(data):
        data = dict(data)
        if data.get("due"):
            data["due"] = date.fromisoformat(data["due"])
        return Task(**data)


class TodoManager:
    def __init__(self):
        self.tasks = {}
        self.next_id = 1
        self.undo_stack = []

    def add(self, title, priority="medium", due=None, tags=None, notes=""):
        if priority not in PRIORITIES:
            raise ValueError(f"Unknown priority {priority!r}")
        if not title.strip():
            raise ValueError("Title cannot be empty")
        task = Task(self.next_id, title.strip(), priority, due, list(tags or []), False, notes)
        self.tasks[task.id] = task
        self.next_id += 1
        self.undo_stack.append(("add", task.id))
        return task

    def get(self, task_id):
        if task_id not in self.tasks:
            raise KeyError(f"No task with id {task_id}")
        return self.tasks[task_id]

    def complete(self, task_id):
        task = self.get(task_id)
        if task.done:
            return False
        task.done = True
        self.undo_stack.append(("complete", task_id))
        return True

    def remove(self, task_id):
        task = self.get(task_id)
        del self.tasks[task_id]
        self.undo_stack.append(("remove", task))
        return task

    def undo(self):
        if not self.undo_stack:
            return "Nothing to undo"
        action, payload = self.undo_stack.pop()
        if action == "add":
            del self.tasks[payload]
            return f"Undid add of task {payload}"
        if action == "complete":
            self.tasks[payload].done = False
            return f"Reopened task {payload}"
        self.tasks[payload.id] = payload
        return f"Restored task {payload.id}"

    def pending(self):
        return [t for t in self.sorted_tasks() if not t.done]

    def overdue(self, today):
        return [t for t in self.pending() if t.due and t.due < today]

    def due_within(self, today, days):
        limit = today + timedelta(days=days)
        return [t for t in self.pending() if t.due and today <= t.due <= limit]

    def by_tag(self, tag):
        return [t for t in self.sorted_tasks() if tag in t.tags]

    def search(self, text):
        text = text.lower()
        return [t for t in self.sorted_tasks() if text in t.title.lower() or text in t.notes.lower()]

    def sorted_tasks(self):
        return sorted(
            self.tasks.values(),
            key=lambda t: (t.done, -PRIORITIES[t.priority], t.due or date.max, t.id),
        )

    def stats(self):
        total = len(self.tasks)
        done = sum(1 for t in self.tasks.values() if t.done)
        by_priority = {p: 0 for p in PRIORITIES}
        tags = {}
        for t in self.tasks.values():
            by_priority[t.priority] += 1
            for tag in t.tags:
                tags[tag] = tags.get(tag, 0) + 1
        return {
            "total": total,
            "done": done,
            "rate": round(done / total * 100, 1) if total else 0.0,
            "by_priority": by_priority,
            "tags": dict(sorted(tags.items())),
        }

    def to_json(self):
        payload = {
            "next_id": self.next_id,
            "tasks": [t.to_dict() for t in self.sorted_tasks()],
        }
        return json.dumps(payload, indent=2)

    @classmethod
    def from_json(cls, text):
        data = json.loads(text)
        manager = cls()
        manager.next_id = data["next_id"]
        for item in data["tasks"]:
            task = Task.from_dict(item)
            manager.tasks[task.id] = task
        return manager


def print_table(tasks, today):
    print(f"{'ID':<4}{'Title':<28}{'Pri':<8}{'Due':<12}{'Status':<9}Tags")
    print("-" * 70)
    for t in tasks:
        due = t.due.isoformat() if t.due else "-"
        if t.done:
            status = "done"
        elif t.due and t.due < today:
            status = "OVERDUE"
        else:
            status = "open"
        print(f"{t.id:<4}{t.title:<28}{t.priority:<8}{due:<12}{status:<9}{', '.join(t.tags)}")


if __name__ == "__main__":
    today = date(2026, 11, 8)
    todo = TodoManager()
    todo.add("Finish python practice", "high", today + timedelta(days=1), ["code", "study"])
    todo.add("Pay electricity bill", "urgent", today - timedelta(days=2), ["home", "money"])
    todo.add("Buy groceries", "low", today + timedelta(days=3), ["home"])
    todo.add("Push code to GitHub", "medium", today, ["code"], "after the next batch")
    todo.add("Plan weekend trip", "low", None, ["fun"])
    todo.add("Renew passport", "high", today + timedelta(days=20), ["money", "travel"])
    todo.add("Read about graphs", "medium", today + timedelta(days=5), ["study", "code"])

    print_table(todo.sorted_tasks(), today)

    print()
    print("Complete 4      :", todo.complete(4))
    print("Complete 4 again:", todo.complete(4))
    print("Overdue         :", [t.title for t in todo.overdue(today)])
    print("Due in 7 days   :", [t.title for t in todo.due_within(today, 7)])
    print("Tag code        :", [t.title for t in todo.by_tag("code")])
    print("Search 'pass'   :", [t.title for t in todo.search("pass")])
    print("Search 'github' :", [t.title for t in todo.search("github")])

    print()
    removed = todo.remove(3)
    print("Removed         :", removed.title)
    print(todo.undo())
    print(todo.undo())
    print(todo.undo())
    print("Task 4 done     :", todo.get(4).done)
    print("Task 3 exists   :", 3 in todo.tasks)

    print()
    stats = todo.stats()
    for key, value in stats.items():
        print(f"{key:<12}: {value}")

    print()
    for bad in [lambda: todo.add("   "), lambda: todo.add("x", "someday"), lambda: todo.get(99)]:
        try:
            bad()
        except (ValueError, KeyError) as e:
            print("Error:", e.args[0])

    payload = todo.to_json()
    restored = TodoManager.from_json(payload)
    print()
    print("JSON length     :", len(payload))
    print("Round trip      :", restored.tasks == todo.tasks)
    print("Next id kept    :", restored.next_id == todo.next_id)
    print()
    print_table(restored.sorted_tasks(), today)
