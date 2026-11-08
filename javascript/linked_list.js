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
    if (this.head === null) {
      this.head = node;
    } else {
      let cur = this.head;
      while (cur.next !== null) {
        cur = cur.next;
      }
      cur.next = node;
    }
    this.length++;
  }

  prepend(value) {
    const node = new Node(value);
    node.next = this.head;
    this.head = node;
    this.length++;
  }

  get(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) {
      throw new Error("index out of range: " + index);
    }
    let cur = this.head;
    for (let i = 0; i < index; i++) {
      cur = cur.next;
    }
    return cur.value;
  }

  contains(value) {
    let cur = this.head;
    while (cur !== null) {
      if (cur.value === value) {
        return true;
      }
      cur = cur.next;
    }
    return false;
  }

  remove(value) {
    if (this.head === null) {
      return false;
    }
    if (this.head.value === value) {
      this.head = this.head.next;
      this.length--;
      return true;
    }
    let cur = this.head;
    while (cur.next !== null) {
      if (cur.next.value === value) {
        cur.next = cur.next.next;
        this.length--;
        return true;
      }
      cur = cur.next;
    }
    return false;
  }

  reverse() {
    let prev = null;
    let cur = this.head;
    while (cur !== null) {
      const next = cur.next;
      cur.next = prev;
      prev = cur;
      cur = next;
    }
    this.head = prev;
  }

  toArray() {
    const out = [];
    let cur = this.head;
    while (cur !== null) {
      out.push(cur.value);
      cur = cur.next;
    }
    return out;
  }

  size() {
    return this.length;
  }
}

const list = new LinkedList();
check("starts empty", list.toArray(), []);
check("size zero", list.size(), 0);
list.append(1);
list.append(2);
list.append(3);
check("after appends", list.toArray(), [1, 2, 3]);
list.prepend(0);
check("after prepend", list.toArray(), [0, 1, 2, 3]);
check("size four", list.size(), 4);
check("get first", list.get(0), 0);
check("get middle", list.get(2), 2);
check("get last", list.get(3), 3);
check("get too high", raises(() => list.get(10)), true);
check("get negative", raises(() => list.get(-1)), true);
check("get decimal", raises(() => list.get(1.5)), true);

console.log();
check("contains yes", list.contains(3), true);
check("contains no", list.contains(99), false);
check("remove middle", list.remove(2), true);
check("after remove", list.toArray(), [0, 1, 3]);
check("remove missing", list.remove(99), false);
check("remove head", list.remove(0), true);
check("after head", list.toArray(), [1, 3]);
check("remove tail", list.remove(3), true);
check("after tail", list.toArray(), [1]);
check("remove last item", list.remove(1), true);
check("empty again", list.toArray(), []);
check("remove from empty", list.remove(1), false);
check("size back to zero", list.size(), 0);

console.log();
const rev = new LinkedList();
for (const x of [1, 2, 3, 4]) {
  rev.append(x);
}
rev.reverse();
check("reversed", rev.toArray(), [4, 3, 2, 1]);
rev.reverse();
check("reversed twice", rev.toArray(), [1, 2, 3, 4]);
const emptyRev = new LinkedList();
emptyRev.reverse();
check("reverse empty", emptyRev.toArray(), []);

console.log();
const big = new LinkedList();
for (let i = 0; i < 1000; i++) {
  big.append(i);
}
check("big size", big.size(), 1000);
check("big first", big.get(0), 0);
check("big last", big.get(999), 999);
let orderOk = true;
const arr = big.toArray();
for (let i = 0; i < 1000; i++) {
  if (arr[i] !== i) {
    orderOk = false;
  }
}
check("big order", orderOk, true);
big.reverse();
check("big reversed first", big.get(0), 999);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
