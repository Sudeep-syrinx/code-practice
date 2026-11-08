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

function hasKey(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

class StateMachine {
  constructor(config) {
    if (config === null || typeof config !== "object") {
      throw new Error("config must be an object");
    }
    const table = config.transitions;
    if (table === null || typeof table !== "object") {
      throw new Error("transitions must be an object");
    }
    const states = Object.keys(table);
    if (states.length === 0) {
      throw new Error("at least one state is needed");
    }
    if (!states.includes(config.initial)) {
      throw new Error("initial state is not defined");
    }
    for (const s of states) {
      for (const ev of Object.keys(table[s])) {
        if (!states.includes(table[s][ev])) {
          throw new Error("unknown target state: " + table[s][ev]);
        }
      }
    }
    this.table = table;
    this.initial = config.initial;
    this.current = config.initial;
    this.past = [config.initial];
    this.eventLog = [];
    this.enterHooks = {};
  }

  state() {
    return this.current;
  }

  history() {
    return this.past.slice();
  }

  events() {
    return this.eventLog.slice();
  }

  can(event) {
    return hasKey(this.table[this.current], event);
  }

  available() {
    return Object.keys(this.table[this.current]).sort();
  }

  isFinal() {
    return this.available().length === 0;
  }

  onEnter(state, fn) {
    if (!hasKey(this.table, state)) {
      throw new Error("unknown state: " + state);
    }
    if (typeof fn !== "function") {
      throw new Error("hook must be a function");
    }
    if (!hasKey(this.enterHooks, state)) {
      this.enterHooks[state] = [];
    }
    this.enterHooks[state].push(fn);
  }

  send(event) {
    if (!this.can(event)) {
      throw new Error("cannot " + event + " from " + this.current);
    }
    const from = this.current;
    const to = this.table[from][event];
    this.current = to;
    this.past.push(to);
    this.eventLog.push(event);
    const hooks = hasKey(this.enterHooks, to) ? this.enterHooks[to] : [];
    for (const fn of hooks) {
      fn(to, from);
    }
    return to;
  }

  undo() {
    if (this.past.length < 2) {
      throw new Error("nothing to undo");
    }
    this.past.pop();
    this.eventLog.pop();
    this.current = this.past[this.past.length - 1];
    return this.current;
  }

  reset() {
    this.current = this.initial;
    this.past = [this.initial];
    this.eventLog = [];
  }

  canReach(target) {
    if (!hasKey(this.table, target)) {
      throw new Error("unknown state: " + target);
    }
    const seen = new Set([this.current]);
    const queue = [this.current];
    let head = 0;
    while (head < queue.length) {
      const s = queue[head++];
      if (s === target) {
        return true;
      }
      for (const ev of Object.keys(this.table[s])) {
        const next = this.table[s][ev];
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    return false;
  }
}

const ORDER = {
  initial: "new",
  transitions: {
    new: { pay: "paid", cancel: "cancelled" },
    paid: { ship: "shipped", cancel: "cancelled" },
    shipped: { deliver: "delivered" },
    delivered: {},
    cancelled: {},
  },
};

const LIGHT = {
  initial: "green",
  transitions: {
    green: { next: "yellow" },
    yellow: { next: "red" },
    red: { next: "green" },
  },
};

const m = new StateMachine(ORDER);
check("starts new", m.state(), "new");
check("can pay", m.can("pay"), true);
check("cannot ship", m.can("ship"), false);
check("cannot unknown", m.can("fly"), false);
check("available", m.available(), ["cancel", "pay"]);
check("not final", m.isFinal(), false);
check("send pay", m.send("pay"), "paid");
check("send ship", m.send("ship"), "shipped");
check("cannot cancel late", raises(() => m.send("cancel")), true);
check("state kept after error", m.state(), "shipped");
check("history", m.history(), ["new", "paid", "shipped"]);
check("events", m.events(), ["pay", "ship"]);
check("available shipped", m.available(), ["deliver"]);
check("send deliver", m.send("deliver"), "delivered");
check("now final", m.isFinal(), true);
check("no events left", m.available(), []);
check("cannot pay again", raises(() => m.send("pay")), true);
check("history copy", (() => {
  const h = m.history();
  h.push("fake");
  return m.history().length;
})(), 4);

console.log();
check("undo once", m.undo(), "shipped");
check("history after undo", m.history(), ["new", "paid", "shipped"]);
check("events after undo", m.events(), ["pay", "ship"]);
check("not final after undo", m.isFinal(), false);
check("undo twice", m.undo(), "paid");
check("undo three times", m.undo(), "new");
check("nothing to undo", raises(() => m.undo()), true);
check("state after undo all", m.state(), "new");
m.send("cancel");
check("cancel is final", m.isFinal(), true);
m.reset();
check("reset state", m.state(), "new");
check("reset history", m.history(), ["new"]);
check("reset events", m.events(), []);

console.log();
const r = new StateMachine(ORDER);
check("can reach delivered", r.canReach("delivered"), true);
check("can reach self", r.canReach("new"), true);
check("can reach cancelled", r.canReach("cancelled"), true);
check("reach unknown raises", raises(() => r.canReach("lost")), true);
r.send("pay");
r.send("ship");
r.send("deliver");
check("cannot go back", r.canReach("new"), false);
check("cannot reach cancelled late", r.canReach("cancelled"), false);
check("still reach self", r.canReach("delivered"), true);

console.log();
const h = new StateMachine(ORDER);
const entered = [];
h.onEnter("paid", (to, from) => entered.push(from + ">" + to));
h.onEnter("paid", () => entered.push("second"));
h.send("pay");
check("hooks ran in order", entered, ["new>paid", "second"]);
h.send("ship");
check("other state no hook", entered.length, 2);
h.undo();
check("undo skips hooks", entered.length, 2);
h.undo();
h.send("pay");
check("hook runs again", entered.length, 4);
check("hook unknown state", raises(() => h.onEnter("lost", () => {})), true);
check("hook not function", raises(() => h.onEnter("paid", 5)), true);

console.log();
check("config null", raises(() => new StateMachine(null)), true);
check("config no transitions", raises(() => new StateMachine({ initial: "a" })), true);
check("config empty", raises(() => new StateMachine({ initial: "a", transitions: {} })), true);
check("config bad initial", raises(() => new StateMachine({ initial: "x", transitions: { a: {} } })), true);
check("config bad target", raises(() => new StateMachine({ initial: "a", transitions: { a: { go: "b" } } })), true);
check("config single state", new StateMachine({ initial: "a", transitions: { a: {} } }).isFinal(), true);
check("event named constructor", new StateMachine(ORDER).can("constructor"), false);

console.log();
const cycle = ["green", "yellow", "red"];
let lightOk = true;
for (let n = 0; n <= 30; n++) {
  const light = new StateMachine(LIGHT);
  for (let i = 0; i < n; i++) {
    light.send("next");
  }
  if (light.state() !== cycle[n % 3]) {
    lightOk = false;
  }
  if (light.isFinal()) {
    lightOk = false;
  }
  if (light.history().length !== n + 1) {
    lightOk = false;
  }
}
check("31 light cycles", lightOk, true);

let seed = 1999;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
let walkOk = true;
let undoOk = true;
for (let n = 0; n < 300; n++) {
  const walk = new StateMachine(ORDER);
  let steps = 0;
  while (!walk.isFinal() && steps < 10) {
    const options = walk.available();
    walk.send(options[nextRandom(options.length)]);
    steps++;
  }
  const states = walk.history();
  const events = walk.events();
  if (states.length !== steps + 1 || events.length !== steps) {
    walkOk = false;
  }
  for (let i = 0; i < events.length; i++) {
    if (ORDER.transitions[states[i]][events[i]] !== states[i + 1]) {
      walkOk = false;
    }
  }
  if (!walk.isFinal()) {
    walkOk = false;
  }
  for (let i = 0; i < steps; i++) {
    walk.undo();
  }
  if (walk.state() !== "new" || walk.history().length !== 1) {
    undoOk = false;
  }
}
check("300 random walks valid", walkOk, true);
check("300 walks fully undone", undoOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
