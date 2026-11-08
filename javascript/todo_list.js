const results = [];

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}

function raises(fn) {
  try {
    fn();
  } catch (e) {
    return true;
  }
  return false;
}

const PRIORITY_RANK = { high: 3, medium: 2, low: 1 };

class Task {
  constructor(id, title, priority, tags) {
    this.id = id;
    this.title = title;
    this.priority = priority;
    this.tags = tags.slice();
    this.done = false;
  }
}

class TodoList {
  constructor() {
    this.tasks = [];
    this.nextId = 1;
  }

  validate(title, priority) {
    if (typeof title !== "string" || title.trim() === "") {
      throw new Error("title is required");
    }
    if (!(priority in PRIORITY_RANK)) {
      throw new Error("bad priority: " + priority);
    }
  }

  add(title, priority = "medium", tags = []) {
    this.validate(title, priority);
    const task = new Task(this.nextId, title.trim(), priority, tags);
    this.nextId++;
    this.tasks.push(task);
    return task.id;
  }

  find(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      throw new Error("no such task: " + id);
    }
    return task;
  }

  complete(id) {
    const task = this.find(id);
    if (task.done) {
      throw new Error("already done: " + id);
    }
    task.done = true;
    return task.title;
  }

  remove(id) {
    const task = this.find(id);
    this.tasks = this.tasks.filter((t) => t.id !== task.id);
    return true;
  }

  rename(id, title) {
    this.validate(title, "medium");
    this.find(id).title = title.trim();
  }

  setPriority(id, priority) {
    this.validate("x", priority);
    this.find(id).priority = priority;
  }

  addTag(id, tag) {
    const task = this.find(id);
    if (!task.tags.includes(tag)) {
      task.tags.push(tag);
    }
  }

  count() {
    return this.tasks.length;
  }

  titles() {
    return this.tasks.map((t) => t.title);
  }

  pending() {
    return this.tasks.filter((t) => !t.done);
  }

  completed() {
    return this.tasks.filter((t) => t.done);
  }

  byPriority(priority) {
    return this.tasks.filter((t) => t.priority === priority);
  }

  withTag(tag) {
    return this.tasks.filter((t) => t.tags.includes(tag));
  }

  search(text) {
    const needle = text.toLowerCase();
    return this.tasks.filter((t) => t.title.toLowerCase().includes(needle));
  }

  sortedByPriority() {
    return this.tasks.slice().sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
  }

  clearCompleted() {
    const before = this.tasks.length;
    this.tasks = this.tasks.filter((t) => !t.done);
    return before - this.tasks.length;
  }

  progress() {
    if (this.tasks.length === 0) {
      return 0;
    }
    return Math.round((this.completed().length * 100) / this.tasks.length);
  }

  summary() {
    return {
      total: this.tasks.length,
      done: this.completed().length,
      pending: this.pending().length,
    };
  }
}

const names = (tasks) => tasks.map((t) => t.title);

const list = new TodoList();
const id1 = list.add("Buy milk", "high", ["home"]);
const id2 = list.add("Write report", "medium", ["work"]);
const id3 = list.add("Call mom", "low", ["home", "family"]);
const id4 = list.add("Fix bug", "high", ["work"]);

check("ids", [id1, id2, id3, id4], [1, 2, 3, 4]);
check("count", list.count(), 4);
check("titles", list.titles(), ["Buy milk", "Write report", "Call mom", "Fix bug"]);
check("all pending", list.pending().length, 4);
check("none completed", list.completed().length, 0);
check("progress zero", list.progress(), 0);
check("default priority", new TodoList().add("x") === 1, true);

console.log();
check("complete returns title", list.complete(1), "Buy milk");
list.complete(4);
check("pending titles", names(list.pending()), ["Write report", "Call mom"]);
check("completed titles", names(list.completed()), ["Buy milk", "Fix bug"]);
check("progress half", list.progress(), 50);
check("summary", list.summary(), { total: 4, done: 2, pending: 2 });
check("complete twice", raises(() => list.complete(1)), true);
check("complete missing", raises(() => list.complete(99)), true);

console.log();
check("high priority", names(list.byPriority("high")), ["Buy milk", "Fix bug"]);
check("low priority", names(list.byPriority("low")), ["Call mom"]);
check("tag home", names(list.withTag("home")), ["Buy milk", "Call mom"]);
check("tag work", names(list.withTag("work")), ["Write report", "Fix bug"]);
check("tag missing", list.withTag("nope"), []);
check("search call", names(list.search("call")), ["Call mom"]);
check("search ignores case", names(list.search("B")), ["Buy milk", "Fix bug"]);
check("search nothing", list.search("zzz"), []);
check("sorted by priority", names(list.sortedByPriority()), ["Buy milk", "Fix bug", "Write report", "Call mom"]);
check("sort keeps original", list.titles()[0], "Buy milk");

console.log();
list.rename(2, "  Write final report  ");
check("rename trims", list.find(2).title, "Write final report");
list.setPriority(3, "medium");
check("medium priority", names(list.byPriority("medium")), ["Write final report", "Call mom"]);
check("no low left", list.byPriority("low"), []);
list.addTag(3, "urgent");
list.addTag(3, "urgent");
check("tag added once", list.find(3).tags, ["home", "family", "urgent"]);
check("urgent tag", names(list.withTag("urgent")), ["Call mom"]);

console.log();
check("empty title", raises(() => list.add("")), true);
check("blank title", raises(() => list.add("   ")), true);
check("bad priority", raises(() => list.add("x", "urgent")), true);
check("bad rename", raises(() => list.rename(2, "")), true);
check("bad set priority", raises(() => list.setPriority(2, "huge")), true);
check("find missing", raises(() => list.find(1234)), true);

console.log();
check("clear completed", list.clearCompleted(), 2);
check("count after clear", list.count(), 2);
check("removed is gone", raises(() => list.complete(1)), true);
check("remove task", list.remove(2), true);
check("count after remove", list.count(), 1);
check("remove again", raises(() => list.remove(2)), true);
list.remove(3);
check("empty progress", list.progress(), 0);
check("empty summary", list.summary(), { total: 0, done: 0, pending: 0 });

console.log();
const big = new TodoList();
for (let i = 1; i <= 300; i++) {
  big.add("Task " + i, i % 2 === 0 ? "high" : "low", i % 5 === 0 ? ["five"] : []);
}
for (let i = 3; i <= 300; i += 3) {
  big.complete(i);
}
check("300 tasks", big.count(), 300);
check("100 done", big.completed().length, 100);
check("200 pending", big.pending().length, 200);
check("big progress", big.progress(), 33);
check("150 high", big.byPriority("high").length, 150);
check("60 five tags", big.withTag("five").length, 60);
check("search Task 29", big.search("task 29").length, 11);
check("clear 100", big.clearCompleted(), 100);
check("200 left", big.count(), 200);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
