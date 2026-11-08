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

function formatMoney(cents) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, "0");
  return sign + "$" + dollars + "." + rest;
}

class Inventory {
  constructor() {
    this.items = new Map();
    this.sales = 0;
    this.history = [];
  }

  log(type, sku, qty) {
    this.history.push({ type: type, sku: sku, qty: qty });
  }

  need(sku) {
    if (!this.items.has(sku)) {
      throw new Error("unknown sku: " + sku);
    }
    return this.items.get(sku);
  }

  addItem(sku, name, price, qty) {
    if (!sku || !name) {
      throw new Error("sku and name are required");
    }
    if (this.items.has(sku)) {
      throw new Error("duplicate sku: " + sku);
    }
    if (!Number.isInteger(price) || price < 0) {
      throw new Error("price must be a non-negative integer");
    }
    if (!Number.isInteger(qty) || qty < 0) {
      throw new Error("quantity must be a non-negative integer");
    }
    this.items.set(sku, { name: name, price: price, qty: qty });
    this.log("add", sku, qty);
  }

  restock(sku, qty) {
    const item = this.need(sku);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error("restock amount must be positive");
    }
    item.qty += qty;
    this.log("restock", sku, qty);
    return item.qty;
  }

  sell(sku, qty) {
    const item = this.need(sku);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error("sell amount must be positive");
    }
    if (qty > item.qty) {
      throw new Error("not enough stock for " + sku);
    }
    item.qty -= qty;
    const revenue = qty * item.price;
    this.sales += revenue;
    this.log("sell", sku, qty);
    return revenue;
  }

  setPrice(sku, price) {
    const item = this.need(sku);
    if (!Number.isInteger(price) || price < 0) {
      throw new Error("price must be a non-negative integer");
    }
    item.price = price;
  }

  remove(sku) {
    this.need(sku);
    this.items.delete(sku);
  }

  stockOf(sku) {
    return this.need(sku).qty;
  }

  count() {
    return this.items.size;
  }

  value() {
    let total = 0;
    for (const item of this.items.values()) {
      total += item.price * item.qty;
    }
    return total;
  }

  salesTotal() {
    return this.sales;
  }

  skus() {
    return Array.from(this.items.keys()).sort();
  }

  names() {
    return Array.from(this.items.values()).map((i) => i.name).sort();
  }

  lowStock(threshold) {
    return this.skus().filter((s) => this.items.get(s).qty <= threshold);
  }

  outOfStock() {
    return this.lowStock(0);
  }

  search(text) {
    const needle = text.toLowerCase();
    return this.skus().filter((s) => this.items.get(s).name.toLowerCase().includes(needle));
  }

  historyFor(sku) {
    return this.history.filter((h) => h.sku === sku).map((h) => ({ type: h.type, qty: h.qty }));
  }

  report() {
    return this.skus().map((s) => {
      const item = this.items.get(s);
      return s + " " + item.name + " x" + item.qty + " @ " + formatMoney(item.price);
    });
  }
}

check("money normal", formatMoney(4500), "$45.00");
check("money small", formatMoney(5), "$0.05");
check("money cents", formatMoney(1234), "$12.34");
check("money zero", formatMoney(0), "$0.00");
check("money negative", formatMoney(-250), "-$2.50");

console.log();
const inv = new Inventory();
inv.addItem("A1", "pen", 150, 100);
inv.addItem("B2", "notebook", 400, 50);
inv.addItem("C3", "stapler", 1200, 5);
inv.addItem("D4", "tape", 250, 0);

check("item count", inv.count(), 4);
check("skus", inv.skus(), ["A1", "B2", "C3", "D4"]);
check("names", inv.names(), ["notebook", "pen", "stapler", "tape"]);
check("stock of pen", inv.stockOf("A1"), 100);
check("total value", inv.value(), 41000);
check("low stock 10", inv.lowStock(10), ["C3", "D4"]);
check("low stock 5", inv.lowStock(5), ["C3", "D4"]);
check("low stock 100", inv.lowStock(100).length, 4);
check("out of stock", inv.outOfStock(), ["D4"]);
check("report first", inv.report()[0], "A1 pen x100 @ $1.50");

console.log();
check("sell revenue", inv.sell("A1", 30), 4500);
check("stock after sell", inv.stockOf("A1"), 70);
check("sales total", inv.salesTotal(), 4500);
check("sell all stapler", inv.sell("C3", 5), 6000);
check("out of stock now", inv.outOfStock(), ["C3", "D4"]);
check("sales total 2", inv.salesTotal(), 10500);
check("restock", inv.restock("D4", 20), 20);
check("out of stock after", inv.outOfStock(), ["C3"]);
check("value after", inv.value(), 35500);

console.log();
check("search book", inv.search("book"), ["B2"]);
check("search t", inv.search("t"), ["B2", "C3", "D4"]);
check("search none", inv.search("zzz"), []);
check("history count", inv.history.length, 7);
check("history pen", inv.historyFor("A1"), [{ type: "add", qty: 100 }, { type: "sell", qty: 30 }]);
check("history tape", inv.historyFor("D4"), [{ type: "add", qty: 0 }, { type: "restock", qty: 20 }]);

inv.setPrice("A1", 200);
check("value after price", inv.value(), 39000);
inv.remove("D4");
check("count after remove", inv.count(), 3);
check("value after remove", inv.value(), 34000);

console.log();
check("sell too many", raises(() => inv.sell("B2", 999)), true);
check("sell unknown", raises(() => inv.sell("ZZ", 1)), true);
check("sell zero", raises(() => inv.sell("B2", 0)), true);
check("sell decimal", raises(() => inv.sell("B2", 1.5)), true);
check("restock zero", raises(() => inv.restock("B2", 0)), true);
check("restock unknown", raises(() => inv.restock("ZZ", 5)), true);
check("duplicate sku", raises(() => inv.addItem("A1", "x", 1, 1)), true);
check("negative price", raises(() => inv.addItem("E5", "x", -1, 1)), true);
check("negative qty", raises(() => inv.addItem("E5", "x", 1, -1)), true);
check("missing name", raises(() => inv.addItem("E5", "", 1, 1)), true);
check("remove unknown", raises(() => inv.remove("D4")), true);
check("bad new price", raises(() => inv.setPrice("A1", 1.5)), true);
check("stock unchanged", inv.stockOf("B2"), 50);

console.log();
const big = new Inventory();
for (let i = 0; i < 1000; i++) {
  big.addItem("SKU" + i, "item" + i, 100, 10);
}
check("1000 items", big.count(), 1000);
check("big value", big.value(), 1000000);
for (let i = 0; i < 1000; i++) {
  big.sell("SKU" + i, 5);
}
check("big value after", big.value(), 500000);
check("big sales", big.salesTotal(), 500000);
check("big low stock", big.lowStock(5).length, 1000);
check("big out of stock", big.outOfStock().length, 0);
check("big history", big.history.length, 2000);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
