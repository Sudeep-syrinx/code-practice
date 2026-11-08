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

  push(value) {
    this.items.push(value);
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

  toArray() {
    return this.items.slice();
  }
}

class Queue {
  constructor() {
    this.items = [];
  }

  enqueue(value) {
    this.items.push(value);
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

  toArray() {
    return this.items.slice();
  }
}

class Node {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.length = 0;
  }

  append(value) {
    const node = new Node(value);
    if (!this.head) {
      this.head = node;
    } else {
      let current = this.head;
      while (current.next) {
        current = current.next;
      }
      current.next = node;
    }
    this.length++;
  }

  prepend(value) {
    const node = new Node(value);
    node.next = this.head;
    this.head = node;
    this.length++;
  }

  remove(value) {
    if (!this.head) {
      return false;
    }
    if (this.head.value === value) {
      this.head = this.head.next;
      this.length--;
      return true;
    }
    let current = this.head;
    while (current.next) {
      if (current.next.value === value) {
        current.next = current.next.next;
        this.length--;
        return true;
      }
      current = current.next;
    }
    return false;
  }

  indexOf(value) {
    let current = this.head;
    let index = 0;
    while (current) {
      if (current.value === value) {
        return index;
      }
      current = current.next;
      index++;
    }
    return -1;
  }

  contains(value) {
    return this.indexOf(value) !== -1;
  }

  toArray() {
    const out = [];
    let current = this.head;
    while (current) {
      out.push(current.value);
      current = current.next;
    }
    return out;
  }

  reverse() {
    let previous = null;
    let current = this.head;
    while (current) {
      const next = current.next;
      current.next = previous;
      previous = current;
      current = next;
    }
    this.head = previous;
  }
}

function balanced(text) {
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const stack = new Stack();
  for (const ch of text) {
    if ("([{".includes(ch)) {
      stack.push(ch);
    } else if (")]}".includes(ch)) {
      if (stack.isEmpty() || stack.pop() !== pairs[ch]) {
        return false;
      }
    }
  }
  return stack.isEmpty();
}

function reverseWithStack(text) {
  const stack = new Stack();
  for (const ch of text) {
    stack.push(ch);
  }
  let out = "";
  while (!stack.isEmpty()) {
    out += stack.pop();
  }
  return out;
}

const s = new Stack();
s.push(1);
s.push(2);
s.push(3);
check("stack size", s.size(), 3);
check("stack peek", s.peek(), 3);
check("stack pop", s.pop(), 3);
check("stack after pop", s.toArray(), [1, 2]);
check("stack not empty", s.isEmpty(), false);
s.pop();
s.pop();
check("stack empty", s.isEmpty(), true);
check("pop empty throws", raises(() => s.pop()), true);
check("peek empty throws", raises(() => s.peek()), true);

console.log();
const q = new Queue();
q.enqueue("a");
q.enqueue("b");
q.enqueue("c");
check("queue size", q.size(), 3);
check("queue front", q.front(), "a");
check("queue dequeue", q.dequeue(), "a");
check("queue order", q.toArray(), ["b", "c"]);
q.dequeue();
q.dequeue();
check("queue empty", q.isEmpty(), true);
check("dequeue empty throws", raises(() => q.dequeue()), true);
check("front empty throws", raises(() => q.front()), true);

console.log();
const list = new LinkedList();
list.append(2);
list.append(3);
list.prepend(1);
check("list order", list.toArray(), [1, 2, 3]);
check("list length", list.length, 3);
check("list contains", list.contains(2), true);
check("list not contains", list.contains(9), false);
check("list indexOf", list.indexOf(3), 2);
check("list indexOf missing", list.indexOf(9), -1);
check("list remove middle", list.remove(2), true);
check("after remove", list.toArray(), [1, 3]);
check("list remove head", list.remove(1), true);
check("remove missing", list.remove(99), false);
list.append(4);
list.append(5);
list.reverse();
check("list reversed", list.toArray(), [5, 4, 3]);
check("length after changes", list.length, 3);
check("empty list remove", new LinkedList().remove(1), false);

console.log();
check("balanced simple", balanced("()"), true);
check("balanced mixed", balanced("([]{})"), true);
check("balanced with text", balanced("a(b[c]d)e"), true);
check("not balanced order", balanced("([)]"), false);
check("not balanced open", balanced("(("), false);
check("not balanced close", balanced("())"), false);
check("balanced empty", balanced(""), true);
check("reverse with stack", reverseWithStack("hello"), "olleh");
check("reverse empty", reverseWithStack(""), "");

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
