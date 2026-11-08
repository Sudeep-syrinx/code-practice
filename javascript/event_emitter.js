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

class Emitter {
  constructor() {
    this.map = new Map();
  }

  check(name, fn) {
    if (typeof name !== "string" || name === "") {
      throw new Error("event name must be a non-empty string");
    }
    if (typeof fn !== "function") {
      throw new Error("listener must be a function");
    }
  }

  add(name, fn, once, front) {
    this.check(name, fn);
    if (!this.map.has(name)) {
      this.map.set(name, []);
    }
    const entry = { fn: fn, once: once };
    if (front) {
      this.map.get(name).unshift(entry);
    } else {
      this.map.get(name).push(entry);
    }
    return this;
  }

  on(name, fn) {
    return this.add(name, fn, false, false);
  }

  once(name, fn) {
    return this.add(name, fn, true, false);
  }

  prepend(name, fn) {
    return this.add(name, fn, false, true);
  }

  removeEntry(name, entry) {
    const list = this.map.get(name);
    if (!list) {
      return false;
    }
    const index = list.indexOf(entry);
    if (index === -1) {
      return false;
    }
    list.splice(index, 1);
    if (list.length === 0) {
      this.map.delete(name);
    }
    return true;
  }

  off(name, fn) {
    const list = this.map.get(name);
    if (!list) {
      return false;
    }
    const entry = list.find((e) => e.fn === fn);
    if (!entry) {
      return false;
    }
    return this.removeEntry(name, entry);
  }

  emit(name, ...args) {
    const list = this.map.get(name);
    if (!list) {
      return 0;
    }
    const snapshot = list.slice();
    for (const entry of snapshot) {
      if (entry.once) {
        this.removeEntry(name, entry);
      }
      entry.fn.apply(this, args);
    }
    return snapshot.length;
  }

  listenerCount(name) {
    const list = this.map.get(name);
    return list ? list.length : 0;
  }

  eventNames() {
    return Array.from(this.map.keys()).sort();
  }

  removeAll(name) {
    if (name === undefined) {
      this.map.clear();
    } else {
      this.map.delete(name);
    }
  }
}

class Store {
  constructor(initial) {
    this.state = Object.assign({}, initial);
    this.emitter = new Emitter();
  }

  getState() {
    return Object.assign({}, this.state);
  }

  setState(patch) {
    const old = this.state;
    this.state = Object.assign({}, old, patch);
    this.emitter.emit("change", this.getState(), Object.assign({}, old));
  }

  subscribe(fn) {
    this.emitter.on("change", fn);
    return () => this.emitter.off("change", fn);
  }
}

const e = new Emitter();
const log = [];
e.on("hi", (x) => log.push("a" + x));
e.on("hi", (x) => log.push("b" + x));
check("emit returns count", e.emit("hi", 1), 2);
check("listeners ran in order", log, ["a1", "b1"]);
check("emit unknown", e.emit("none"), 0);
check("listener count", e.listenerCount("hi"), 2);
check("count unknown", e.listenerCount("none"), 0);
check("event names", e.eventNames(), ["hi"]);
check("chaining", e.on("x", () => {}) === e, true);
check("names sorted", e.eventNames(), ["hi", "x"]);

console.log();
let fired = 0;
const e2 = new Emitter();
e2.once("go", () => fired++);
check("once first emit", e2.emit("go"), 1);
check("once second emit", e2.emit("go"), 0);
check("once fired one time", fired, 1);
check("once removed", e2.listenerCount("go"), 0);
check("once cleans name", e2.eventNames(), []);

const e3 = new Emitter();
let hits = 0;
const handler = () => hits++;
e3.on("tick", handler);
e3.emit("tick");
check("off existing", e3.off("tick", handler), true);
e3.emit("tick");
check("off stops calls", hits, 1);
check("off again", e3.off("tick", handler), false);
check("off unknown event", e3.off("nope", handler), false);
check("off other function", (() => {
  e3.on("tick", handler);
  return e3.off("tick", () => {});
})(), false);

const e4 = new Emitter();
const order = [];
e4.on("o", () => order.push("second"));
e4.prepend("o", () => order.push("first"));
e4.emit("o");
check("prepend runs first", order, ["first", "second"]);

const e5 = new Emitter();
let twice = 0;
const same = () => twice++;
e5.on("s", same);
e5.on("s", same);
e5.emit("s");
check("same fn twice", twice, 2);
check("same fn counted", e5.listenerCount("s"), 2);

console.log();
const e6 = new Emitter();
let total = 0;
e6.on("sum", (a, b, c) => {
  total = a + b + c;
});
e6.emit("sum", 1, 2, 3);
check("multiple args", total, 6);
check("empty name raises", raises(() => e6.on("", () => {})), true);
check("number name raises", raises(() => e6.on(5, () => {})), true);
check("non function raises", raises(() => e6.on("x", 5)), true);
check("once non function", raises(() => e6.once("x", "no")), true);

const e7 = new Emitter();
e7.on("a", () => {});
e7.on("b", () => {});
e7.on("b", () => {});
e7.removeAll("b");
check("remove one name", e7.eventNames(), ["a"]);
e7.removeAll();
check("remove everything", e7.eventNames(), []);

const e8 = new Emitter();
const seen = [];
e8.on("t", function self() {
  seen.push("1");
  e8.off("t", self);
});
e8.on("t", () => seen.push("2"));
e8.emit("t");
e8.emit("t");
check("self removal safe", seen, ["1", "2", "2"]);

console.log();
const s = new Store({ count: 0 });
const changes = [];
const unsub = s.subscribe((n, o) => changes.push([o.count, n.count]));
s.setState({ count: 1 });
s.setState({ count: 2 });
check("store changes", changes, [[0, 1], [1, 2]]);
check("unsubscribe", unsub(), true);
s.setState({ count: 3 });
check("no more calls", changes.length, 2);
check("state updated", s.getState(), { count: 3 });
check("unsubscribe twice", unsub(), false);
const copy = s.getState();
copy.count = 999;
check("get state is copy", s.getState().count, 3);
const merged = new Store({ a: 1, b: 2 });
merged.setState({ b: 5 });
check("set state merges", merged.getState(), { a: 1, b: 5 });
const init = { a: 1 };
new Store(init).setState({ a: 2 });
check("initial untouched", init.a, 1);

console.log();
let seed = 808;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const big = new Emitter();
const counts = {};
const listeners = {};
const emits = {};
for (let i = 0; i < 10; i++) {
  const name = "event" + i;
  counts[name] = 0;
  emits[name] = 0;
  listeners[name] = nextRandom(5);
  for (let k = 0; k < listeners[name]; k++) {
    big.on(name, () => {
      counts[name]++;
    });
  }
}
for (let n = 0; n < 200; n++) {
  const name = "event" + nextRandom(10);
  emits[name]++;
  big.emit(name);
}
let countsOk = true;
for (const name of Object.keys(counts)) {
  if (counts[name] !== listeners[name] * emits[name]) {
    countsOk = false;
  }
}
check("200 random emits", countsOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
