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

class Stack {
  constructor() {
    this.items = [];
  }
  push(x) {
    this.items.push(x);
  }
  pop() {
    if (this.items.length === 0) {
      throw new Error("stack is empty");
    }
    return this.items.pop();
  }
  peek() {
    if (this.items.length === 0) {
      throw new Error("stack is empty");
    }
    return this.items[this.items.length - 1];
  }
  size() {
    return this.items.length;
  }
  isEmpty() {
    return this.items.length === 0;
  }
}

class Queue {
  constructor() {
    this.items = [];
  }
  enqueue(x) {
    this.items.push(x);
  }
  dequeue() {
    if (this.items.length === 0) {
      throw new Error("queue is empty");
    }
    return this.items.shift();
  }
  front() {
    if (this.items.length === 0) {
      throw new Error("queue is empty");
    }
    return this.items[0];
  }
  size() {
    return this.items.length;
  }
  isEmpty() {
    return this.items.length === 0;
  }
}

function balanced(text) {
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const stack = new Stack();
  for (const ch of text) {
    if ("([{".includes(ch)) {
      stack.push(ch);
    } else if (ch in pairs) {
      if (stack.isEmpty() || stack.pop() !== pairs[ch]) {
        return false;
      }
    }
  }
  return stack.isEmpty();
}

function evalRpn(tokens) {
  const stack = new Stack();
  for (const t of tokens) {
    if (["+", "-", "*", "/"].includes(t)) {
      const b = stack.pop();
      const a = stack.pop();
      if (t === "+") stack.push(a + b);
      if (t === "-") stack.push(a - b);
      if (t === "*") stack.push(a * b);
      if (t === "/") stack.push(a / b);
    } else {
      stack.push(Number(t));
    }
  }
  return stack.pop();
}

const s = new Stack();
check("stack empty", s.isEmpty(), true);
s.push(1);
s.push(2);
s.push(3);
check("stack size", s.size(), 3);
check("stack peek", s.peek(), 3);
check("stack pop", s.pop(), 3);
check("stack pop again", s.pop(), 2);
check("stack size after", s.size(), 1);
s.pop();
check("pop empty raises", raises(() => s.pop()), true);
check("peek empty raises", raises(() => s.peek()), true);

console.log();
const q = new Queue();
q.enqueue("a");
q.enqueue("b");
q.enqueue("c");
check("queue size", q.size(), 3);
check("queue front", q.front(), "a");
check("queue dequeue", q.dequeue(), "a");
check("queue dequeue 2", q.dequeue(), "b");
check("queue size after", q.size(), 1);
q.dequeue();
check("dequeue empty raises", raises(() => q.dequeue()), true);
check("front empty raises", raises(() => q.front()), true);

console.log();
check("balanced simple", balanced("()"), true);
check("balanced mixed", balanced("{[()]}"), true);
check("balanced text", balanced("a(b[c]d)e"), true);
check("unbalanced open", balanced("(("), false);
check("unbalanced close", balanced("())"), false);
check("wrong order", balanced("([)]"), false);
check("empty balanced", balanced(""), true);
check("rpn add", evalRpn(["2", "3", "+"]), 5);
check("rpn mixed", evalRpn(["2", "3", "4", "*", "+"]), 14);
check("rpn divide", evalRpn(["10", "2", "/"]), 5);
check("rpn subtract", evalRpn(["9", "4", "-"]), 5);

console.log();
let stackOk = true;
const big = new Stack();
for (let i = 0; i < 1000; i++) {
  big.push(i);
}
for (let i = 999; i >= 0; i--) {
  if (big.pop() !== i) {
    stackOk = false;
  }
}
check("1000 push and pop", stackOk, true);
let queueOk = true;
const bq = new Queue();
for (let i = 0; i < 1000; i++) {
  bq.enqueue(i);
}
for (let i = 0; i < 1000; i++) {
  if (bq.dequeue() !== i) {
    queueOk = false;
  }
}
check("1000 enqueue dequeue", queueOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
