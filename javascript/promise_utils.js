const results = [];

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}

async function rejects(fn) {
  try {
    await fn();
  } catch (e) {
    return true;
  }
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(fn, attempts, delayMs) {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error("attempts must be a positive integer");
  }
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn(i);
    } catch (e) {
      lastError = e;
      if (i < attempts && delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function pool(tasks, limit) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("limit must be a positive integer");
  }
  const out = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      out[i] = await tasks[i]();
    }
  }
  const workers = [];
  for (let k = 0; k < Math.min(limit, tasks.length); k++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return out;
}

async function series(tasks) {
  const out = [];
  for (const task of tasks) {
    out.push(await task());
  }
  return out;
}

function settle(promises) {
  return Promise.all(
    promises.map((p) =>
      p.then(
        (value) => ({ ok: true, value: value }),
        (error) => ({ ok: false, error: error.message })
      )
    )
  );
}

async function main() {
  check("sleep resolves", await sleep(5).then(() => "done"), "done");

  let calls = 0;
  const third = await retry(async (n) => {
    calls++;
    if (n < 3) {
      throw new Error("fail " + n);
    }
    return "ok" + n;
  }, 5, 1);
  check("retry result", third, "ok3");
  check("retry calls", calls, 3);

  calls = 0;
  let message = "";
  try {
    await retry(async (n) => {
      calls++;
      throw new Error("fail " + n);
    }, 3, 1);
  } catch (e) {
    message = e.message;
  }
  check("retry last error", message, "fail 3");
  check("retry all calls", calls, 3);
  check("retry first try", await retry(async () => "easy", 3, 0), "easy");
  check("retry bad attempts", await rejects(() => retry(async () => 1, 0, 0)), true);

  console.log();
  check("timeout fast", await withTimeout(sleep(5).then(() => "fast"), 200), "fast");
  check("timeout slow", await rejects(() => withTimeout(sleep(100), 10)), true);
  check("timeout keeps error", await withTimeout(Promise.reject(new Error("boom")), 100).catch((e) => e.message), "boom");

  console.log();
  let active = 0;
  let peak = 0;
  function makeTasks(count, delay) {
    const tasks = [];
    for (let i = 0; i < count; i++) {
      tasks.push(async () => {
        active++;
        peak = Math.max(peak, active);
        await sleep(delay);
        active--;
        return i * 2;
      });
    }
    return tasks;
  }
  const expected = [0, 2, 4, 6, 8, 10, 12, 14];
  check("pool results", await pool(makeTasks(8, 10), 3), expected);
  check("pool peak three", peak, 3);
  peak = 0;
  check("pool serial", await pool(makeTasks(5, 3), 1), [0, 2, 4, 6, 8]);
  check("pool serial peak", peak, 1);
  peak = 0;
  check("pool wide limit", await pool(makeTasks(3, 3), 10), [0, 2, 4]);
  check("pool wide peak", peak, 3);
  check("pool empty", await pool([], 4), []);
  check("pool bad limit", await rejects(() => pool([], 0)), true);
  check("pool task fails", await rejects(() => pool([async () => { throw new Error("x"); }], 2)), true);

  console.log();
  const order = [];
  const done = await series([
    async () => { await sleep(10); order.push("a"); return 1; },
    async () => { order.push("b"); return 2; },
    async () => { order.push("c"); return 3; },
  ]);
  check("series values", done, [1, 2, 3]);
  check("series order", order, ["a", "b", "c"]);
  check("series empty", await series([]), []);

  console.log();
  const mixed = await settle([sleep(2).then(() => "yes"), Promise.reject(new Error("no")), Promise.resolve(3)]);
  check("settle mixed", mixed, [{ ok: true, value: "yes" }, { ok: false, error: "no" }, { ok: true, value: 3 }]);
  check("settle empty", await settle([]), []);

  console.log();
  let seed = 55;
  function nextRandom(limit) {
    seed = (seed * 16807) % 2147483647;
    return seed % limit;
  }
  let poolOk = true;
  for (let round = 0; round < 20; round++) {
    const count = nextRandom(12);
    const limit = 1 + nextRandom(5);
    let running = 0;
    let highest = 0;
    const tasks = [];
    for (let i = 0; i < count; i++) {
      tasks.push(async () => {
        running++;
        highest = Math.max(highest, running);
        await sleep(nextRandom(3));
        running--;
        return i;
      });
    }
    const got = await pool(tasks, limit);
    const want = [];
    for (let i = 0; i < count; i++) {
      want.push(i);
    }
    if (JSON.stringify(got) !== JSON.stringify(want) || highest > limit) {
      poolOk = false;
    }
  }
  check("20 random pools", poolOk, true);

  console.log();
  console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
  console.log("All correct :", results.every(Boolean));
}

main().catch((e) => console.log("crashed:", e.message));
