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

class VendingMachine {
  constructor() {
    this.slots = new Map();
    this.credit = 0;
    this.sales = 0;
    this.sold = new Map();
    this.coins = [100, 50, 25, 10, 5];
  }

  addSlot(code, name, price, qty) {
    if (!code || !name) {
      throw new Error("code and name are required");
    }
    if (this.slots.has(code)) {
      throw new Error("duplicate slot: " + code);
    }
    if (!Number.isInteger(price) || price <= 0 || price % 5 !== 0) {
      throw new Error("price must be a positive multiple of 5");
    }
    if (!Number.isInteger(qty) || qty < 0) {
      throw new Error("quantity must be a non-negative integer");
    }
    this.slots.set(code, { name: name, price: price, qty: qty });
    this.sold.set(code, 0);
  }

  need(code) {
    if (!this.slots.has(code)) {
      throw new Error("unknown slot: " + code);
    }
    return this.slots.get(code);
  }

  insert(coin) {
    if (!this.coins.includes(coin)) {
      throw new Error("coin not accepted: " + coin);
    }
    this.credit += coin;
    return this.credit;
  }

  makeChange(amount) {
    let rest = amount;
    const out = [];
    for (const coin of this.coins) {
      while (rest >= coin) {
        out.push(coin);
        rest -= coin;
      }
    }
    if (rest !== 0) {
      throw new Error("cannot make change for " + amount);
    }
    return out;
  }

  buy(code) {
    const slot = this.need(code);
    if (slot.qty === 0) {
      throw new Error("sold out: " + code);
    }
    if (this.credit < slot.price) {
      throw new Error("not enough credit for " + code);
    }
    const change = this.makeChange(this.credit - slot.price);
    slot.qty--;
    this.sales += slot.price;
    this.sold.set(code, this.sold.get(code) + 1);
    this.credit = 0;
    return { name: slot.name, change: change };
  }

  refund() {
    const coins = this.makeChange(this.credit);
    this.credit = 0;
    return coins;
  }

  restock(code, qty) {
    const slot = this.need(code);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error("restock amount must be positive");
    }
    slot.qty += qty;
    return slot.qty;
  }

  stock(code) {
    return this.need(code).qty;
  }

  price(code) {
    return this.need(code).price;
  }

  slotCount() {
    return this.slots.size;
  }

  codes() {
    return Array.from(this.slots.keys()).sort();
  }

  totalStock() {
    let total = 0;
    for (const slot of this.slots.values()) {
      total += slot.qty;
    }
    return total;
  }

  soldOut() {
    return this.codes().filter((c) => this.slots.get(c).qty === 0);
  }

  lowStock(limit) {
    return this.codes().filter((c) => this.slots.get(c).qty <= limit);
  }

  soldCount(code) {
    this.need(code);
    return this.sold.get(code);
  }

  bestSeller() {
    let best = null;
    let bestCount = 0;
    for (const code of this.codes()) {
      if (this.sold.get(code) > bestCount) {
        best = code;
        bestCount = this.sold.get(code);
      }
    }
    return best;
  }
}

const vm = new VendingMachine();
vm.addSlot("A1", "chips", 100, 5);
vm.addSlot("A2", "candy", 75, 2);
vm.addSlot("B1", "soda", 150, 1);

check("slot count", vm.slotCount(), 3);
check("codes", vm.codes(), ["A1", "A2", "B1"]);
check("price", vm.price("A1"), 100);
check("stock", vm.stock("A1"), 5);
check("total stock", vm.totalStock(), 8);
check("starting credit", vm.credit, 0);
check("no best seller", vm.bestSeller(), null);

console.log();
check("insert 100", vm.insert(100), 100);
check("insert 25", vm.insert(25), 125);
check("credit", vm.credit, 125);
check("buy chips", vm.buy("A1"), { name: "chips", change: [25] });
check("credit reset", vm.credit, 0);
check("chips stock", vm.stock("A1"), 4);
check("sales", vm.sales, 100);

console.log();
vm.insert(100);
vm.insert(100);
check("buy candy", vm.buy("A2"), { name: "candy", change: [100, 25] });
check("candy stock", vm.stock("A2"), 1);
check("sales 2", vm.sales, 175);
vm.insert(100);
vm.insert(50);
check("buy soda exact", vm.buy("B1"), { name: "soda", change: [] });
check("sales 3", vm.sales, 325);
check("sold out list", vm.soldOut(), ["B1"]);
check("low stock", vm.lowStock(1), ["A2", "B1"]);
check("sold count chips", vm.soldCount("A1"), 1);
check("best seller first", vm.bestSeller(), "A1");

console.log();
vm.insert(100);
check("sold out buy", raises(() => vm.buy("B1")), true);
check("credit kept", vm.credit, 100);
check("refund", vm.refund(), [100]);
check("credit after refund", vm.credit, 0);
vm.insert(50);
check("not enough credit", raises(() => vm.buy("A1")), true);
check("credit still 50", vm.credit, 50);
check("refund 50", vm.refund(), [50]);
vm.insert(100);
vm.insert(25);
check("refund mixed", vm.refund(), [100, 25]);
check("empty refund", vm.refund(), []);

console.log();
check("restock", vm.restock("B1", 3), 3);
check("no sold out now", vm.soldOut(), []);
check("restock zero", raises(() => vm.restock("B1", 0)), true);
check("restock unknown", raises(() => vm.restock("Z9", 1)), true);
check("unknown slot", raises(() => vm.buy("Z9")), true);
check("bad coin", raises(() => vm.insert(3)), true);
check("decimal coin", raises(() => vm.insert(1.5)), true);
check("duplicate slot", raises(() => vm.addSlot("A1", "x", 50, 1)), true);
check("bad price", raises(() => vm.addSlot("C1", "x", 33, 1)), true);
check("zero price", raises(() => vm.addSlot("C1", "x", 0, 1)), true);
check("negative qty", raises(() => vm.addSlot("C1", "x", 50, -1)), true);
check("missing name", raises(() => vm.addSlot("C1", "", 50, 1)), true);

console.log();
check("change 0", vm.makeChange(0), []);
check("change 5", vm.makeChange(5), [5]);
check("change 95", vm.makeChange(95), [50, 25, 10, 10]);
check("change 185", vm.makeChange(185), [100, 50, 25, 10]);
check("change 300", vm.makeChange(300), [100, 100, 100]);
check("impossible change", raises(() => vm.makeChange(3)), true);

console.log();
const big = new VendingMachine();
for (let i = 0; i < 200; i++) {
  big.addSlot("S" + i, "item" + i, 10, 2);
}
check("200 slots", big.slotCount(), 200);
check("big stock", big.totalStock(), 400);
for (let i = 0; i < 200; i++) {
  big.insert(10);
  big.buy("S" + i);
}
check("big sales", big.sales, 2000);
check("big stock after", big.totalStock(), 200);
check("big sold out", big.soldOut(), []);
check("big low stock", big.lowStock(1).length, 200);
check("big best seller", big.bestSeller(), "S0");
check("big credit", big.credit, 0);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
