const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class DomainEvent {
  constructor(type, data, timestamp, version) {
    this.type = type;
    this.data = data;
    this.timestamp = timestamp || Date.now();
    this.version = version || 1;
    this.id = DomainEvent.nextId++;
  }
}
DomainEvent.nextId = 0;

class EventStore {
  constructor() {
    this.streams = new Map();
    this.globalLog = [];
    this.subscribers = [];
  }
  append(streamId, events) {
    if (!this.streams.has(streamId)) this.streams.set(streamId, []);
    const stream = this.streams.get(streamId);
    const appended = [];
    for (const evt of events) {
      const stored = new DomainEvent(evt.type, evt.data, evt.timestamp, evt.version);
      stream.push(stored);
      this.globalLog.push({ streamId, event: stored });
      appended.push(stored);
    }
    for (const sub of this.subscribers) sub(appended, streamId);
    return appended;
  }
  getStream(streamId) {
    return this.streams.get(streamId) || [];
  }
  getEventsSince(globalPosition) {
    return this.globalLog.slice(globalPosition);
  }
  subscribe(handler) {
    this.subscribers.push(handler);
    return () => { this.subscribers = this.subscribers.filter(s => s !== handler); };
  }
  streamCount() { return this.streams.size; }
  globalPosition() { return this.globalLog.length; }
}

class Aggregate {
  constructor(id) {
    this.id = id;
    this.version = 0;
    this.pendingEvents = [];
    this.state = {};
  }
  apply(event) {
    this.version++;
    this._applyEvent(event);
  }
  _applyEvent(event) { throw new Error("override _applyEvent"); }
  raise(event) {
    this.apply(event);
    this.pendingEvents.push(event);
  }
  flushPending() {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    return events;
  }
}

class CommandHandler {
  constructor(eventStore, aggregateFactory) {
    this.eventStore = eventStore;
    this.aggregateFactory = aggregateFactory;
    this.handlers = new Map();
  }
  register(commandType, handler) {
    this.handlers.set(commandType, handler);
  }
  execute(command) {
    const handler = this.handlers.get(command.type);
    if (!handler) throw new Error("no handler for: " + command.type);
    const aggregate = this.aggregateFactory(command.aggregateId);
    const existing = this.eventStore.getStream(command.aggregateId);
    for (const evt of existing) aggregate.apply(evt);
    handler(aggregate, command);
    const pending = aggregate.flushPending();
    if (pending.length > 0) {
      this.eventStore.append(command.aggregateId, pending);
    }
    return pending;
  }
}

class Projection {
  constructor(eventStore) {
    this.eventStore = eventStore;
    this.position = 0;
    this.state = {};
    this.handlers = new Map();
  }
  on(eventType, handler) {
    this.handlers.set(eventType, handler);
  }
  rebuild() {
    this.state = {};
    this.position = 0;
    this.update();
  }
  update() {
    const events = this.eventStore.getEventsSince(this.position);
    for (const entry of events) {
      const handler = this.handlers.get(entry.event.type);
      if (handler) handler(this.state, entry.event, entry.streamId);
    }
    this.position = this.eventStore.globalPosition();
  }
  getState() { return this.state; }
}

class BankAccount extends Aggregate {
  constructor(id) { super(id); this.state = { balance: 0, owner: null, opened: false }; }
  _applyEvent(event) {
    if (event.type === "AccountOpened") { this.state.owner = event.data.owner; this.state.opened = true; }
    if (event.type === "MoneyDeposited") { this.state.balance += event.data.amount; }
    if (event.type === "MoneyWithdrawn") { this.state.balance -= event.data.amount; }
    if (event.type === "AccountClosed") { this.state.opened = false; }
  }
}

check("event store append and retrieve", (() => {
  const es = new EventStore();
  es.append("acc1", [{ type: "Created", data: { name: "test" } }]);
  return es.getStream("acc1").length;
})(), 1);
check("event store multiple streams", (() => {
  const es = new EventStore();
  es.append("s1", [{ type: "A", data: {} }]);
  es.append("s2", [{ type: "B", data: {} }]);
  return es.streamCount();
})(), 2);
check("event store subscriber notified", (() => {
  const es = new EventStore();
  let received = 0;
  es.subscribe(() => { received++; });
  es.append("s1", [{ type: "X", data: {} }]);
  return received;
})(), 1);
check("event store unsubscribe works", (() => {
  const es = new EventStore();
  let count = 0;
  const unsub = es.subscribe(() => { count++; });
  es.append("s1", [{ type: "X", data: {} }]);
  unsub();
  es.append("s1", [{ type: "Y", data: {} }]);
  return count;
})(), 1);
check("event store global position", (() => {
  const es = new EventStore();
  es.append("s1", [{ type: "A", data: {} }, { type: "B", data: {} }]);
  return es.globalPosition();
})(), 2);
check("aggregate apply events rebuilds state", (() => {
  const acc = new BankAccount("a1");
  acc.apply({ type: "AccountOpened", data: { owner: "Alice" } });
  acc.apply({ type: "MoneyDeposited", data: { amount: 100 } });
  return acc.state.balance;
})(), 100);
check("aggregate raise creates pending", (() => {
  const acc = new BankAccount("a1");
  acc.raise({ type: "AccountOpened", data: { owner: "Bob" } });
  return acc.flushPending().length;
})(), 1);
check("command handler executes", (() => {
  const es = new EventStore();
  const ch = new CommandHandler(es, id => new BankAccount(id));
  ch.register("OpenAccount", (agg, cmd) => { agg.raise({ type: "AccountOpened", data: { owner: cmd.owner } }); });
  ch.execute({ type: "OpenAccount", aggregateId: "acc1", owner: "Carol" });
  return es.getStream("acc1")[0].type;
})(), "AccountOpened");
check("command handler replays before executing", (() => {
  const es = new EventStore();
  es.append("acc1", [{ type: "AccountOpened", data: { owner: "Dave" } }, { type: "MoneyDeposited", data: { amount: 50 } }]);
  const ch = new CommandHandler(es, id => new BankAccount(id));
  ch.register("Deposit", (agg, cmd) => { agg.raise({ type: "MoneyDeposited", data: { amount: cmd.amount } }); });
  ch.execute({ type: "Deposit", aggregateId: "acc1", amount: 25 });
  const stream = es.getStream("acc1");
  return stream.length;
})(), 3);
check("projection builds read model", (() => {
  const es = new EventStore();
  es.append("acc1", [{ type: "AccountOpened", data: { owner: "Eve" } }, { type: "MoneyDeposited", data: { amount: 200 } }]);
  const proj = new Projection(es);
  proj.on("AccountOpened", (state, evt, sid) => { state[sid] = { owner: evt.data.owner, balance: 0 }; });
  proj.on("MoneyDeposited", (state, evt, sid) => { if (state[sid]) state[sid].balance += evt.data.amount; });
  proj.rebuild();
  return proj.getState()["acc1"];
})(), { owner: "Eve", balance: 200 });
check("projection incremental update", (() => {
  const es = new EventStore();
  es.append("acc1", [{ type: "AccountOpened", data: { owner: "Frank" } }]);
  const proj = new Projection(es);
  proj.on("AccountOpened", (state, evt, sid) => { state[sid] = { owner: evt.data.owner }; });
  proj.rebuild();
  es.append("acc1", [{ type: "MoneyDeposited", data: { amount: 50 } }]);
  proj.on("MoneyDeposited", (state, evt, sid) => { if (state[sid]) state[sid].balance = (state[sid].balance || 0) + evt.data.amount; });
  proj.update();
  return proj.getState()["acc1"].balance;
})(), 50);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
