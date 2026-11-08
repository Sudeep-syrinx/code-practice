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

function round2(value) {
  return Math.round(value * 100) / 100;
}

class Cart {
  constructor(taxRate) {
    if (taxRate === undefined) {
      taxRate = 0;
    }
    if (typeof taxRate !== "number" || Number.isNaN(taxRate) || taxRate < 0 || taxRate > 1) {
      throw new Error("tax rate must be between 0 and 1");
    }
    this.items = [];
    this.taxRate = taxRate;
    this.discountPercent = 0;
  }

  findItem(name) {
    for (const item of this.items) {
      if (item.name === name) {
        return item;
      }
    }
    return null;
  }

  add(name, price, qty) {
    if (typeof name !== "string" || name === "") {
      throw new Error("name must be a non-empty string");
    }
    if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
      throw new Error("price must be a non-negative number");
    }
    if (qty === undefined) {
      qty = 1;
    }
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error("qty must be a positive integer");
    }
    const existing = this.findItem(name);
    if (existing !== null) {
      existing.qty += qty;
    } else {
      this.items.push({ name: name, price: price, qty: qty });
    }
  }

  remove(name) {
    const before = this.items.length;
    this.items = this.items.filter((item) => item.name !== name);
    return this.items.length < before;
  }

  setQty(name, qty) {
    const item = this.findItem(name);
    if (item === null) {
      throw new Error("no such item: " + name);
    }
    if (!Number.isInteger(qty) || qty < 0) {
      throw new Error("qty must be a non-negative integer");
    }
    if (qty === 0) {
      this.remove(name);
    } else {
      item.qty = qty;
    }
  }

  count() {
    let total = 0;
    for (const item of this.items) {
      total += item.qty;
    }
    return total;
  }

  lineTotal(name) {
    const item = this.findItem(name);
    if (item === null) {
      throw new Error("no such item: " + name);
    }
    return round2(item.price * item.qty);
  }

  subtotal() {
    let total = 0;
    for (const item of this.items) {
      total += round2(item.price * item.qty);
    }
    return round2(total);
  }

  applyDiscount(percent) {
    if (typeof percent !== "number" || Number.isNaN(percent) || percent < 0 || percent > 100) {
      throw new Error("discount must be between 0 and 100");
    }
    this.discountPercent = percent;
  }

  discountAmount() {
    return round2((this.subtotal() * this.discountPercent) / 100);
  }

  taxAmount() {
    return round2((this.subtotal() - this.discountAmount()) * this.taxRate);
  }

  total() {
    return round2(this.subtotal() - this.discountAmount() + this.taxAmount());
  }

  names() {
    return this.items.map((item) => item.name).sort();
  }

  cheapest() {
    if (this.items.length === 0) {
      return null;
    }
    let best = this.items[0];
    for (const item of this.items) {
      if (item.price < best.price) {
        best = item;
      }
    }
    return best.name;
  }

  mostExpensive() {
    if (this.items.length === 0) {
      return null;
    }
    let best = this.items[0];
    for (const item of this.items) {
      if (item.price > best.price) {
        best = item;
      }
    }
    return best.name;
  }

  summary() {
    return this.items
      .slice()
      .sort((a, b) => (a.name < b.name ? -1 : 1))
      .map((item) => item.name + " x" + item.qty + " = " + (item.price * item.qty).toFixed(2));
  }

  clear() {
    this.items = [];
    this.discountPercent = 0;
  }
}

const cart = new Cart(0.1);
check("empty count", cart.count(), 0);
check("empty subtotal", cart.subtotal(), 0);
check("empty total", cart.total(), 0);
check("empty cheapest", cart.cheapest(), null);
check("empty expensive", cart.mostExpensive(), null);
check("empty summary", cart.summary(), []);

cart.add("apple", 0.5, 4);
cart.add("bread", 2.25);
cart.add("milk", 1.99, 2);
check("count", cart.count(), 7);
check("names sorted", cart.names(), ["apple", "bread", "milk"]);
check("subtotal", cart.subtotal(), 8.23);
check("tax amount", cart.taxAmount(), 0.82);
check("total", cart.total(), 9.05);
check("line apple", cart.lineTotal("apple"), 2);
check("line milk", cart.lineTotal("milk"), 3.98);
check("cheapest", cart.cheapest(), "apple");
check("most expensive", cart.mostExpensive(), "bread");
check("summary", cart.summary(), ["apple x4 = 2.00", "bread x1 = 2.25", "milk x2 = 3.98"]);

console.log();
cart.add("apple", 0.5, 2);
check("merged qty", cart.findItem("apple").qty, 6);
check("merged count", cart.count(), 9);
check("merged subtotal", cart.subtotal(), 9.23);
check("merged tax", cart.taxAmount(), 0.92);
check("merged total", cart.total(), 10.15);
cart.setQty("apple", 4);
check("set qty back", cart.subtotal(), 8.23);
check("set qty missing", raises(() => cart.setQty("ghost", 1)), true);
check("set qty negative", raises(() => cart.setQty("apple", -1)), true);
check("set qty decimal", raises(() => cart.setQty("apple", 1.5)), true);
cart.setQty("bread", 0);
check("zero removes", cart.names(), ["apple", "milk"]);
check("subtotal after", cart.subtotal(), 5.98);
check("remove existing", cart.remove("milk"), true);
check("remove missing", cart.remove("milk"), false);
check("after removes", cart.names(), ["apple"]);
check("line missing raises", raises(() => cart.lineTotal("milk")), true);

console.log();
const bad = new Cart();
check("add empty name", raises(() => bad.add("", 1)), true);
check("add number name", raises(() => bad.add(5, 1)), true);
check("add negative price", raises(() => bad.add("a", -1)), true);
check("add NaN price", raises(() => bad.add("a", NaN)), true);
check("add text price", raises(() => bad.add("a", "1")), true);
check("add zero qty", raises(() => bad.add("a", 1, 0)), true);
check("add decimal qty", raises(() => bad.add("a", 1, 1.5)), true);
check("failed adds ignored", bad.count(), 0);
check("tax too high", raises(() => new Cart(2)), true);
check("tax negative", raises(() => new Cart(-0.1)), true);
check("tax text", raises(() => new Cart("x")), true);
check("default tax zero", bad.taxRate, 0);

console.log();
const disc = new Cart(0.1);
disc.add("apple", 0.5, 4);
disc.add("bread", 2.25);
disc.add("milk", 1.99, 2);
disc.applyDiscount(10);
check("discount amount", disc.discountAmount(), 0.82);
check("discounted tax", disc.taxAmount(), 0.74);
check("discounted total", disc.total(), 8.15);
disc.applyDiscount(100);
check("full discount", disc.total(), 0);
disc.applyDiscount(0);
check("no discount", disc.total(), 9.05);
check("discount negative", raises(() => disc.applyDiscount(-1)), true);
check("discount too high", raises(() => disc.applyDiscount(101)), true);
check("discount text", raises(() => disc.applyDiscount("5")), true);
disc.applyDiscount(50);
disc.clear();
check("clear count", disc.count(), 0);
check("clear discount", disc.discountPercent, 0);

console.log();
const bulk = new Cart(0.2);
for (let i = 1; i <= 100; i++) {
  bulk.add("item" + i, i * 0.5);
}
check("bulk count", bulk.count(), 100);
check("bulk subtotal", bulk.subtotal(), 2525);
check("bulk tax", bulk.taxAmount(), 505);
check("bulk total", bulk.total(), 3030);
check("bulk cheapest", bulk.cheapest(), "item1");
check("bulk expensive", bulk.mostExpensive(), "item100");
const same = new Cart(0);
for (let i = 0; i < 100; i++) {
  same.add("x", 1);
}
check("same name merged", same.items.length, 1);
check("same count", same.count(), 100);
check("same subtotal", same.subtotal(), 100);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
