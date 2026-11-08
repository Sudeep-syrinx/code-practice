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

class Account {
  constructor(owner, balance = 0) {
    if (!owner) {
      throw new Error("owner is required");
    }
    if (!Number.isInteger(balance) || balance < 0) {
      throw new Error("balance must be a non-negative integer");
    }
    this.owner = owner;
    this.balance = balance;
    this.history = [];
  }

  checkAmount(amount) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error("amount must be a positive integer");
    }
  }

  deposit(amount) {
    this.checkAmount(amount);
    this.balance += amount;
    this.history.push({ type: "deposit", amount: amount });
    return this.balance;
  }

  withdraw(amount) {
    this.checkAmount(amount);
    if (amount > this.balance) {
      throw new Error("insufficient funds");
    }
    this.balance -= amount;
    this.history.push({ type: "withdraw", amount: amount });
    return this.balance;
  }

  addInterest(percent) {
    const amount = Math.floor((this.balance * percent) / 100);
    if (amount > 0) {
      this.balance += amount;
      this.history.push({ type: "interest", amount: amount });
    }
    return amount;
  }

  totalDeposited() {
    return this.history
      .filter((h) => h.type === "deposit")
      .reduce((sum, h) => sum + h.amount, 0);
  }

  totalWithdrawn() {
    return this.history
      .filter((h) => h.type === "withdraw")
      .reduce((sum, h) => sum + h.amount, 0);
  }

  transactionCount() {
    return this.history.length;
  }

  lastTransaction() {
    if (this.history.length === 0) {
      return null;
    }
    return this.history[this.history.length - 1];
  }
}

class Bank {
  constructor() {
    this.accounts = new Map();
    this.nextId = 1;
  }

  open(owner, initial = 0) {
    const id = this.nextId++;
    this.accounts.set(id, new Account(owner, initial));
    return id;
  }

  get(id) {
    if (!this.accounts.has(id)) {
      throw new Error("no such account: " + id);
    }
    return this.accounts.get(id);
  }

  close(id) {
    const account = this.get(id);
    if (account.balance !== 0) {
      throw new Error("account must be empty to close");
    }
    this.accounts.delete(id);
  }

  transfer(fromId, toId, amount) {
    if (fromId === toId) {
      throw new Error("cannot transfer to the same account");
    }
    const from = this.get(fromId);
    const to = this.get(toId);
    from.withdraw(amount);
    to.deposit(amount);
  }

  totalMoney() {
    let total = 0;
    for (const account of this.accounts.values()) {
      total += account.balance;
    }
    return total;
  }

  richest() {
    let best = null;
    for (const account of this.accounts.values()) {
      if (best === null || account.balance > best.balance) {
        best = account;
      }
    }
    return best === null ? null : best.owner;
  }

  owners() {
    return Array.from(this.accounts.values()).map((a) => a.owner).sort();
  }

  count() {
    return this.accounts.size;
  }
}

const acc = new Account("Sam", 1000);
check("start balance", acc.balance, 1000);
check("deposit", acc.deposit(500), 1500);
check("withdraw", acc.withdraw(300), 1200);
check("total deposited", acc.totalDeposited(), 500);
check("total withdrawn", acc.totalWithdrawn(), 300);
check("transaction count", acc.transactionCount(), 2);
check("last transaction", acc.lastTransaction(), { type: "withdraw", amount: 300 });
check("interest 5 percent", acc.addInterest(5), 60);
check("balance after interest", acc.balance, 1260);
check("tiny interest", new Account("Tiny", 10).addInterest(5), 0);
check("no history last", new Account("New").lastTransaction(), null);

console.log();
check("overdraw", raises(() => acc.withdraw(999999)), true);
check("negative deposit", raises(() => acc.deposit(-5)), true);
check("zero deposit", raises(() => acc.deposit(0)), true);
check("decimal deposit", raises(() => acc.deposit(1.5)), true);
check("no owner", raises(() => new Account("")), true);
check("negative start", raises(() => new Account("X", -1)), true);
check("balance unchanged", acc.balance, 1260);

console.log();
const bank = new Bank();
const a = bank.open("Ann", 1000);
const b = bank.open("Bob", 200);
const c = bank.open("Cara");
check("account count", bank.count(), 3);
check("ids", [a, b, c], [1, 2, 3]);
check("total money", bank.totalMoney(), 1200);
check("richest", bank.richest(), "Ann");
check("owners sorted", bank.owners(), ["Ann", "Bob", "Cara"]);

bank.transfer(a, b, 300);
check("after transfer ann", bank.get(a).balance, 700);
check("after transfer bob", bank.get(b).balance, 500);
check("total unchanged", bank.totalMoney(), 1200);
bank.transfer(b, c, 500);
check("bob now empty", bank.get(b).balance, 0);
check("cara received", bank.get(c).balance, 500);

console.log();
check("transfer too much", raises(() => bank.transfer(b, a, 1)), true);
check("transfer to self", raises(() => bank.transfer(a, a, 10)), true);
check("transfer bad account", raises(() => bank.transfer(a, 99, 10)), true);
check("failed transfer safe", bank.totalMoney(), 1200);
check("get missing", raises(() => bank.get(42)), true);
check("close with money", raises(() => bank.close(a)), true);
bank.close(b);
check("after close", bank.count(), 2);
check("closed is gone", raises(() => bank.get(b)), true);

console.log();
const big = new Bank();
for (let i = 0; i < 500; i++) {
  big.open("User" + i, 100);
}
check("500 accounts", big.count(), 500);
check("big total", big.totalMoney(), 50000);
for (let i = 1; i < 500; i++) {
  big.transfer(i, i + 1, 50);
}
check("total after many", big.totalMoney(), 50000);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
