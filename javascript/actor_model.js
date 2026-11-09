const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class Mailbox {
  constructor(capacity) {
    this.queue = [];
    this.capacity = capacity || 1000;
    this.waiters = [];
    this.closed = false;
  }
  send(msg) {
    if (this.closed) return false;
    if (this.queue.length >= this.capacity) return false;
    this.queue.push(msg);
    if (this.waiters.length > 0) {
      const resolve = this.waiters.shift();
      resolve(this.queue.shift());
    }
    return true;
  }
  receive() {
    if (this.queue.length > 0) return Promise.resolve(this.queue.shift());
    if (this.closed) return Promise.resolve(null);
    return new Promise(resolve => this.waiters.push(resolve));
  }
  receiveSync() {
    return this.queue.length > 0 ? this.queue.shift() : null;
  }
  close() {
    this.closed = true;
    while (this.waiters.length > 0) this.waiters.shift()(null);
  }
  size() { return this.queue.length; }
  isEmpty() { return this.queue.length === 0; }
  isClosed() { return this.closed; }
}

class ActorRef {
  constructor(id, system) {
    this.id = id;
    this.system = system;
  }
  tell(msg) { return this.system.tell(this.id, msg); }
  toString() { return "ActorRef(" + this.id + ")"; }
}

class ActorContext {
  constructor(actor, system) {
    this.actor = actor;
    this.system = system;
    this.self = new ActorRef(actor.id, system);
  }
  spawn(behavior, initialState) { return this.system.spawn(behavior, initialState); }
  stop(ref) { this.system.stop(ref.id); }
  become(behavior) { this.actor.behavior = behavior; }
  getState() { return this.actor.state; }
  setState(newState) { this.actor.state = newState; }
}

class Actor {
  constructor(id, system, behavior, initialState) {
    this.id = id;
    this.system = system;
    this.mailbox = new Mailbox();
    this.behavior = behavior;
    this.state = initialState || {};
    this.context = new ActorContext(this, system);
    this.running = false;
    this.messageCount = 0;
    this.errorCount = 0;
    this.lastError = null;
  }
  async run() {
    this.running = true;
    while (this.running) {
      const msg = await this.mailbox.receive();
      if (msg === null) break;
      this.messageCount++;
      if (this.behavior) {
        try {
          await this.behavior(msg, this.context);
        } catch (e) {
          this.errorCount++;
          this.lastError = e;
        }
      }
    }
  }
  stop() {
    this.running = false;
    this.mailbox.close();
  }
  tell(msg) { return this.mailbox.send(msg); }
}

class SupervisorStrategy {
  constructor(type, maxRestarts, windowMs) {
    this.type = type || "one-for-one";
    this.maxRestarts = maxRestarts || 3;
    this.windowMs = windowMs || 60000;
    this.restartLog = new Map();
  }
  shouldRestart(actorId) {
    const now = Date.now();
    if (!this.restartLog.has(actorId)) this.restartLog.set(actorId, []);
    const log = this.restartLog.get(actorId);
    while (log.length > 0 && now - log[0] > this.windowMs) log.shift();
    if (log.length >= this.maxRestarts) return false;
    log.push(now);
    return true;
  }
  reset(actorId) { this.restartLog.delete(actorId); }
}

class ActorSystem {
  constructor(options) {
    this.actors = new Map();
    this.nextId = 0;
    this.started = false;
    this.supervisor = new SupervisorStrategy(
      options && options.supervision,
      options && options.maxRestarts,
      options && options.restartWindow
    );
    this.deathWatchers = new Map();
    this.scheduler = [];
  }

  spawn(behavior, initialState) {
    const id = "actor-" + (this.nextId++);
    const actor = new Actor(id, this, behavior, initialState);
    this.actors.set(id, actor);
    if (this.started) actor.run();
    return new ActorRef(id, this);
  }

  tell(actorId, msg) {
    const actor = this.actors.get(actorId);
    if (!actor) return false;
    return actor.tell(msg);
  }

  stop(actorId) {
    const actor = this.actors.get(actorId);
    if (!actor) return false;
    actor.stop();
    this.actors.delete(actorId);
    const watchers = this.deathWatchers.get(actorId);
    if (watchers) {
      for (const watcherId of watchers) {
        this.tell(watcherId, { type: "Terminated", actor: actorId });
      }
      this.deathWatchers.delete(actorId);
    }
    return true;
  }

  watch(watcherId, targetId) {
    if (!this.deathWatchers.has(targetId)) this.deathWatchers.set(targetId, new Set());
    this.deathWatchers.get(targetId).add(watcherId);
  }

  schedule(delayMs, actorRef, msg) {
    const timer = setTimeout(() => {
      actorRef.tell(msg);
    }, delayMs);
    this.scheduler.push(timer);
    return timer;
  }

  async startAll() {
    this.started = true;
    const promises = [];
    for (const [, actor] of this.actors) promises.push(actor.run());
    return Promise.all(promises);
  }

  stopAll() {
    for (const [id] of this.actors) this.stop(id);
    for (const timer of this.scheduler) clearTimeout(timer);
    this.scheduler = [];
    this.started = false;
  }

  getActor(id) { return this.actors.get(id); }
  actorCount() { return this.actors.size; }
  getStats(actorId) {
    const actor = this.actors.get(actorId);
    if (!actor) return null;
    return { messageCount: actor.messageCount, errorCount: actor.errorCount, lastError: actor.lastError };
  }
}

async function waitFor(condition, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < (timeoutMs || 2000)) {
    if (condition()) return true;
    await new Promise(r => setTimeout(r, 10));
  }
  return false;
}

console.log("=== MAILBOX ===");
check("mailbox send receive sync", (() => {
  const mb = new Mailbox();
  mb.send("hello");
  return mb.receiveSync();
})(), "hello");
check("mailbox empty returns null", new Mailbox().receiveSync(), null);
check("mailbox capacity enforced", (() => {
  const mb = new Mailbox(2);
  mb.send(1); mb.send(2);
  return mb.send(3);
})(), false);
check("mailbox size tracking", (() => {
  const mb = new Mailbox();
  mb.send("a"); mb.send("b"); mb.send("c");
  return mb.size();
})(), 3);
check("mailbox close drains waiters", async () => {
  const mb = new Mailbox();
  const p = mb.receive();
  mb.close();
  return await p;
}, null);
check("mailbox isClosed", (() => {
  const mb = new Mailbox();
  mb.close();
  return mb.isClosed();
})(), true);
check("mailbox send after close fails", (() => {
  const mb = new Mailbox();
  mb.close();
  return mb.send("x");
})(), false);

console.log("\n=== ACTOR BASIC ===");
check("actor processes messages", async () => {
  const system = new ActorSystem();
  const received = [];
  const ref = system.spawn(async (msg) => { received.push(msg); });
  ref.tell("m1"); ref.tell("m2"); ref.tell("m3");
  await waitFor(() => received.length === 3);
  system.stopAll();
  return received;
}, ["m1", "m2", "m3"]);
check("actor state accumulation", async () => {
  const system = new ActorSystem();
  const ref = system.spawn(async (msg, ctx) => {
    ctx.setState({ sum: (ctx.getState().sum || 0) + msg });
  }, { sum: 0 });
  ref.tell(10); ref.tell(20); ref.tell(30);
  await waitFor(() => system.getStats(ref.id).messageCount === 3);
  const sum = system.getActor(ref.id).state.sum;
  system.stopAll();
  return sum;
}, 60);
check("actor become switches behavior", async () => {
  const system = new ActorSystem();
  const log = [];
  const ref = system.spawn(async (msg, ctx) => {
    if (msg === "switch") {
      ctx.become(async (m) => { log.push("new:" + m); });
    } else {
      log.push("old:" + msg);
    }
  });
  ref.tell("a"); ref.tell("switch"); ref.tell("b"); ref.tell("c");
  await waitFor(() => log.length === 3);
  system.stopAll();
  return log;
}, ["old:a", "new:b", "new:c"]);
check("actor error isolation", async () => {
  const system = new ActorSystem();
  let count = 0;
  const ref = system.spawn(async (msg) => {
    if (msg === "fail") throw new Error("boom");
    count++;
  });
  ref.tell("ok1"); ref.tell("fail"); ref.tell("ok2");
  await waitFor(() => system.getStats(ref.id).messageCount === 3);
  const stats = system.getStats(ref.id);
  system.stopAll();
  return { count, errorCount: stats.errorCount };
}, { count: 2, errorCount: 1 });

console.log("\n=== ACTOR SYSTEM ===");
check("system spawn count", (() => {
  const system = new ActorSystem();
  system.spawn(null); system.spawn(null); system.spawn(null);
  const count = system.actorCount();
  system.stopAll();
  return count;
})(), 3);
check("system stop removes actor", (() => {
  const system = new ActorSystem();
  const ref = system.spawn(null);
  system.stop(ref.id);
  return system.actorCount();
})(), 0);
check("system getStats null for missing", (() => {
  const system = new ActorSystem();
  return system.getStats("nonexistent");
})(), null);

console.log("\n=== DEATH WATCH ===");
check("death watch notification", async () => {
  const system = new ActorSystem();
  const notifications = [];
  const watcher = system.spawn(async (msg) => {
    if (msg.type === "Terminated") notifications.push(msg.actor);
  });
  const target = system.spawn(async () => {});
  system.watch(watcher.id, target.id);
  system.stop(target.id);
  await waitFor(() => notifications.length === 1);
  system.stopAll();
  return notifications;
}, ["actor-1"]);
check("death watch multiple watchers", async () => {
  const system = new ActorSystem();
  const n1 = [], n2 = [];
  const w1 = system.spawn(async (msg) => { if (msg.type === "Terminated") n1.push(true); });
  const w2 = system.spawn(async (msg) => { if (msg.type === "Terminated") n2.push(true); });
  const target = system.spawn(async () => {});
  system.watch(w1.id, target.id);
  system.watch(w2.id, target.id);
  system.stop(target.id);
  await waitFor(() => n1.length === 1 && n2.length === 1);
  system.stopAll();
  return [n1.length, n2.length];
}, [1, 1]);

console.log("\n=== SUPERVISOR STRATEGY ===");
check("supervisor allows restart within limit", (() => {
  const sup = new SupervisorStrategy("one-for-one", 3);
  return sup.shouldRestart("a") && sup.shouldRestart("a") && sup.shouldRestart("a");
})(), true);
check("supervisor denies restart over limit", (() => {
  const sup = new SupervisorStrategy("one-for-one", 2);
  sup.shouldRestart("a"); sup.shouldRestart("a");
  return sup.shouldRestart("a");
})(), false);
check("supervisor reset clears count", (() => {
  const sup = new SupervisorStrategy("one-for-one", 1);
  sup.shouldRestart("a");
  sup.reset("a");
  return sup.shouldRestart("a");
})(), true);
check("supervisor independent actors", (() => {
  const sup = new SupervisorStrategy("one-for-one", 1);
  sup.shouldRestart("a");
  return sup.shouldRestart("b");
})(), true);

console.log("\n=== MULTI-ACTOR PATTERNS ===");
check("request-response pattern", async () => {
  const system = new ActorSystem();
  const responses = [];
  const worker = system.spawn(async (msg, ctx) => {
    if (msg.type === "compute") {
      ctx.tell(msg.replyTo, { type: "result", value: msg.value * 2 });
    }
  });
  const coordinator = system.spawn(async (msg, ctx) => {
    if (msg.type === "start") {
      worker.tell({ type: "compute", value: 21, replyTo: ctx.self.id });
    } else if (msg.type === "result") {
      responses.push(msg.value);
    }
  });
  coordinator.tell({ type: "start" });
  await waitFor(() => responses.length === 1);
  system.stopAll();
  return responses;
}, [42]);
check("broadcast pattern", async () => {
  const system = new ActorSystem();
  const counts = { a: 0, b: 0, c: 0 };
  const makeCounter = (name) => system.spawn(async (msg) => {
    if (msg === "ping") counts[name]++;
  });
  const a = makeCounter("a"), b = makeCounter("b"), c = makeCounter("c");
  const broadcaster = system.spawn(async (msg, ctx) => {
    if (msg === "broadcast") {
      a.tell("ping"); b.tell("ping"); c.tell("ping");
    }
  });
  broadcaster.tell("broadcast");
  await waitFor(() => counts.a === 1 && counts.b === 1 && counts.c === 1);
  system.stopAll();
  return counts;
}, { a: 1, b: 1, c: 1 });
check("pipeline pattern", async () => {
  const system = new ActorSystem();
  const output = [];
  const stage3 = system.spawn(async (msg) => { output.push(msg); });
  const stage2 = system.spawn(async (msg) => { stage3.tell(msg + "_s2"); });
  const stage1 = system.spawn(async (msg) => { stage2.tell(msg + "_s1"); });
  stage1.tell("input");
  await waitFor(() => output.length === 1);
  system.stopAll();
  return output;
}, ["input_s1_s2"]);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
