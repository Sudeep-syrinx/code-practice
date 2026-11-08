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

class Library {
  constructor() {
    this.books = new Map();
    this.members = new Map();
    this.maxLoans = 3;
  }

  addBook(isbn, title, author, copies = 1) {
    if (!isbn || !title || !author) {
      throw new Error("isbn, title and author are required");
    }
    if (this.books.has(isbn)) {
      throw new Error("duplicate isbn: " + isbn);
    }
    if (!Number.isInteger(copies) || copies < 1) {
      throw new Error("copies must be at least 1");
    }
    this.books.set(isbn, { title: title, author: author, copies: copies, out: 0 });
  }

  addMember(name) {
    if (!name) {
      throw new Error("name is required");
    }
    if (this.members.has(name)) {
      throw new Error("duplicate member: " + name);
    }
    this.members.set(name, []);
  }

  needBook(isbn) {
    if (!this.books.has(isbn)) {
      throw new Error("unknown book: " + isbn);
    }
    return this.books.get(isbn);
  }

  needMember(name) {
    if (!this.members.has(name)) {
      throw new Error("unknown member: " + name);
    }
    return this.members.get(name);
  }

  available(isbn) {
    const book = this.needBook(isbn);
    return book.copies - book.out;
  }

  borrow(name, isbn) {
    const loans = this.needMember(name);
    const book = this.needBook(isbn);
    if (loans.includes(isbn)) {
      throw new Error(name + " already has " + isbn);
    }
    if (loans.length >= this.maxLoans) {
      throw new Error(name + " has reached the loan limit");
    }
    if (book.copies - book.out === 0) {
      throw new Error("no copies left of " + isbn);
    }
    book.out++;
    loans.push(isbn);
  }

  giveBack(name, isbn) {
    const loans = this.needMember(name);
    const book = this.needBook(isbn);
    const index = loans.indexOf(isbn);
    if (index === -1) {
      throw new Error(name + " does not have " + isbn);
    }
    loans.splice(index, 1);
    book.out--;
  }

  borrowedBy(name) {
    return this.needMember(name).slice();
  }

  bookCount() {
    return this.books.size;
  }

  memberCount() {
    return this.members.size;
  }

  totalCopies() {
    let total = 0;
    for (const book of this.books.values()) {
      total += book.copies;
    }
    return total;
  }

  totalOut() {
    let total = 0;
    for (const book of this.books.values()) {
      total += book.out;
    }
    return total;
  }

  searchTitle(text) {
    const needle = text.toLowerCase();
    const found = [];
    for (const book of this.books.values()) {
      if (book.title.toLowerCase().includes(needle)) {
        found.push(book.title);
      }
    }
    return found.sort();
  }

  byAuthor(author) {
    const found = [];
    for (const book of this.books.values()) {
      if (book.author === author) {
        found.push(book.title);
      }
    }
    return found.sort();
  }

  availableTitles() {
    const found = [];
    for (const [isbn, book] of this.books) {
      if (book.copies - book.out > 0) {
        found.push(book.title);
      }
    }
    return found.sort();
  }

  unavailableTitles() {
    const found = [];
    for (const book of this.books.values()) {
      if (book.copies - book.out === 0) {
        found.push(book.title);
      }
    }
    return found.sort();
  }

  membersWithLoans() {
    const found = [];
    for (const [name, loans] of this.members) {
      if (loans.length > 0) {
        found.push(name);
      }
    }
    return found.sort();
  }
}

const lib = new Library();
lib.addBook("111", "Dune", "Herbert", 2);
lib.addBook("222", "Emma", "Austen", 1);
lib.addBook("333", "Persuasion", "Austen", 1);
lib.addBook("444", "Ulysses", "Joyce", 3);
lib.addMember("Ann");
lib.addMember("Bob");
lib.addMember("Cara");

check("book count", lib.bookCount(), 4);
check("member count", lib.memberCount(), 3);
check("total copies", lib.totalCopies(), 7);
check("nothing out", lib.totalOut(), 0);
check("available dune", lib.available("111"), 2);
check("available emma", lib.available("222"), 1);
check("all titles available", lib.availableTitles(), ["Dune", "Emma", "Persuasion", "Ulysses"]);
check("none unavailable", lib.unavailableTitles(), []);
check("no loans yet", lib.membersWithLoans(), []);

console.log();
lib.borrow("Ann", "111");
check("available after borrow", lib.available("111"), 1);
check("borrowed by ann", lib.borrowedBy("Ann"), ["111"]);
check("total out", lib.totalOut(), 1);
lib.borrow("Bob", "111");
check("dune gone", lib.available("111"), 0);
check("dune unavailable", lib.unavailableTitles(), ["Dune"]);
check("cara cannot borrow dune", raises(() => lib.borrow("Cara", "111")), true);
check("ann cannot borrow twice", raises(() => lib.borrow("Ann", "111")), true);
check("members with loans", lib.membersWithLoans(), ["Ann", "Bob"]);

console.log();
lib.borrow("Ann", "222");
lib.borrow("Ann", "333");
check("ann has three", lib.borrowedBy("Ann"), ["111", "222", "333"]);
check("ann at limit", raises(() => lib.borrow("Ann", "444")), true);
check("total out now", lib.totalOut(), 4);
lib.giveBack("Ann", "222");
check("emma back", lib.available("222"), 1);
check("ann has two", lib.borrowedBy("Ann"), ["111", "333"]);
check("give back twice", raises(() => lib.giveBack("Ann", "222")), true);
lib.borrow("Ann", "444");
check("ann can borrow again", lib.borrowedBy("Ann"), ["111", "333", "444"]);
check("ulysses available", lib.available("444"), 2);

console.log();
check("by author austen", lib.byAuthor("Austen"), ["Emma", "Persuasion"]);
check("by author joyce", lib.byAuthor("Joyce"), ["Ulysses"]);
check("by author none", lib.byAuthor("Nobody"), []);
check("search un", lib.searchTitle("un"), ["Dune"]);
check("search case", lib.searchTitle("EMMA"), ["Emma"]);
check("search none", lib.searchTitle("zzz"), []);
check("search all e", lib.searchTitle("e"), ["Dune", "Emma", "Persuasion", "Ulysses"]);

console.log();
check("unknown member", raises(() => lib.borrow("Zed", "111")), true);
check("unknown book", raises(() => lib.borrow("Ann", "999")), true);
check("unknown available", raises(() => lib.available("999")), true);
check("duplicate isbn", raises(() => lib.addBook("111", "x", "y")), true);
check("duplicate member", raises(() => lib.addMember("Ann")), true);
check("zero copies", raises(() => lib.addBook("555", "x", "y", 0)), true);
check("missing title", raises(() => lib.addBook("555", "", "y")), true);
check("empty member name", raises(() => lib.addMember("")), true);
check("loans of unknown", raises(() => lib.borrowedBy("Zed")), true);

console.log();
const big = new Library();
for (let i = 0; i < 300; i++) {
  big.addBook("B" + i, "Book " + i, "Author " + (i % 10), 2);
}
for (let k = 0; k < 100; k++) {
  big.addMember("M" + k);
  big.borrow("M" + k, "B" + (3 * k));
  big.borrow("M" + k, "B" + (3 * k + 1));
  big.borrow("M" + k, "B" + (3 * k + 2));
}
check("300 books", big.bookCount(), 300);
check("100 members", big.memberCount(), 100);
check("600 copies", big.totalCopies(), 600);
check("300 out", big.totalOut(), 300);
check("one copy left", big.available("B0"), 1);
check("each has three", big.borrowedBy("M50").length, 3);
check("all have loans", big.membersWithLoans().length, 100);
check("author count", big.byAuthor("Author 3").length, 30);
for (let k = 0; k < 100; k++) {
  big.giveBack("M" + k, "B" + (3 * k));
}
check("after returns", big.totalOut(), 200);
check("returned available", big.available("B0"), 2);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
