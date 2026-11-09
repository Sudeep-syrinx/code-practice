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

function positive(n, label) {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(label + " must be a positive integer");
  }
}

function paginate(items, page, size) {
  if (!Array.isArray(items)) {
    throw new Error("items must be an array");
  }
  positive(page, "page");
  positive(size, "page size");
  const total = items.length;
  const totalPages = Math.ceil(total / size);
  if (page > Math.max(1, totalPages)) {
    throw new Error("page " + page + " is out of range");
  }
  const start = (page - 1) * size;
  return {
    items: items.slice(start, start + size),
    page: page,
    pageSize: size,
    totalItems: total,
    totalPages: totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}

function chunk(list, size) {
  if (!Array.isArray(list)) {
    throw new Error("list must be an array");
  }
  positive(size, "size");
  const out = [];
  for (let i = 0; i < list.length; i += size) {
    out.push(list.slice(i, i + size));
  }
  return out;
}

function pageOf(index, size) {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error("index must be a non-negative integer");
  }
  positive(size, "size");
  return Math.floor(index / size) + 1;
}

function describe(page, size, total) {
  positive(page, "page");
  positive(size, "size");
  if (!Number.isInteger(total) || total < 0) {
    throw new Error("total must be a non-negative integer");
  }
  if (total === 0) {
    return "No items";
  }
  const from = (page - 1) * size + 1;
  if (from > total) {
    throw new Error("page " + page + " is out of range");
  }
  return "Showing " + from + "-" + Math.min(page * size, total) + " of " + total;
}

function pageRange(current, total, siblings = 1) {
  if (!Number.isInteger(current) || !Number.isInteger(total) || !Number.isInteger(siblings)) {
    throw new Error("arguments must be integers");
  }
  if (total < 0 || siblings < 0) {
    throw new Error("total and siblings must not be negative");
  }
  if (total === 0) {
    return [];
  }
  if (current < 1 || current > total) {
    throw new Error("current page is out of range");
  }
  const wanted = new Set([1, total]);
  for (let p = current - siblings; p <= current + siblings; p++) {
    if (p >= 1 && p <= total) {
      wanted.add(p);
    }
  }
  const pages = Array.from(wanted).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) {
      const gap = pages[i] - pages[i - 1];
      if (gap === 2) {
        out.push(pages[i] - 1);
      } else if (gap > 2) {
        out.push("...");
      }
    }
    out.push(pages[i]);
  }
  return out;
}

const ten = Array.from({ length: 10 }, (_, i) => i + 1);
const p1 = paginate(ten, 1, 3);
check("first page items", p1.items, [1, 2, 3]);
check("first page total pages", p1.totalPages, 4);
check("first page total items", p1.totalItems, 10);
check("first page no prev", p1.hasPrev, false);
check("first page has next", p1.hasNext, true);
check("first page keeps size", p1.pageSize, 3);
const p2 = paginate(ten, 2, 3);
check("middle page items", p2.items, [4, 5, 6]);
check("middle page flags", [p2.hasPrev, p2.hasNext], [true, true]);
const p4 = paginate(ten, 4, 3);
check("last page items", p4.items, [10]);
check("last page flags", [p4.hasPrev, p4.hasNext], [true, false]);
check("exact fit pages", paginate(ten, 2, 5).items, [6, 7, 8, 9, 10]);
check("exact fit no next", paginate(ten, 2, 5).hasNext, false);
check("big page size", paginate(ten, 1, 100).items.length, 10);
check("big page size pages", paginate(ten, 1, 100).totalPages, 1);
check("page size one", paginate(ten, 7, 1).items, [7]);
check("input untouched", ten.length, 10);

console.log();
const none = paginate([], 1, 5);
check("empty items", none.items, []);
check("empty pages", none.totalPages, 0);
check("empty flags", [none.hasPrev, none.hasNext], [false, false]);
check("empty page two", raises(() => paginate([], 2, 5)), true);
check("page too high", raises(() => paginate(ten, 5, 3)), true);
check("page zero", raises(() => paginate(ten, 0, 3)), true);
check("page negative", raises(() => paginate(ten, -1, 3)), true);
check("page decimal", raises(() => paginate(ten, 1.5, 3)), true);
check("size zero", raises(() => paginate(ten, 1, 0)), true);
check("size text", raises(() => paginate(ten, 1, "3")), true);
check("items not array", raises(() => paginate("abc", 1, 1)), true);

console.log();
check("chunk uneven", chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
check("chunk exact", chunk([1, 2, 3, 4], 2), [[1, 2], [3, 4]]);
check("chunk empty", chunk([], 3), []);
check("chunk bigger than list", chunk([1, 2], 5), [[1, 2]]);
check("chunk size one", chunk([1, 2], 1), [[1], [2]]);
check("chunk bad size", raises(() => chunk([1], 0)), true);
check("chunk not array", raises(() => chunk("ab", 1)), true);
check("page of first", pageOf(0, 10), 1);
check("page of last on page", pageOf(9, 10), 1);
check("page of next", pageOf(10, 10), 2);
check("page of far", pageOf(95, 10), 10);
check("page of negative", raises(() => pageOf(-1, 10)), true);
check("page of bad size", raises(() => pageOf(1, 0)), true);

console.log();
check("describe first", describe(1, 3, 10), "Showing 1-3 of 10");
check("describe middle", describe(2, 3, 10), "Showing 4-6 of 10");
check("describe last", describe(4, 3, 10), "Showing 10-10 of 10");
check("describe exact", describe(2, 5, 10), "Showing 6-10 of 10");
check("describe none", describe(1, 5, 0), "No items");
check("describe out of range", raises(() => describe(5, 3, 10)), true);
check("describe bad total", raises(() => describe(1, 3, -1)), true);

console.log();
check("range at start", pageRange(1, 5, 1), [1, 2, "...", 5]);
check("range in middle", pageRange(5, 10, 1), [1, "...", 4, 5, 6, "...", 10]);
check("range near start", pageRange(3, 10, 1), [1, 2, 3, 4, "...", 10]);
check("range fills one gap", pageRange(4, 10, 1), [1, 2, 3, 4, 5, "...", 10]);
check("range at end", pageRange(10, 10, 1), [1, "...", 9, 10]);
check("range near end", pageRange(8, 10, 1), [1, "...", 7, 8, 9, 10]);
check("range single page", pageRange(1, 1, 1), [1]);
check("range two pages", pageRange(2, 2, 1), [1, 2]);
check("range no pages", pageRange(1, 0, 1), []);
check("range small total", pageRange(2, 3, 1), [1, 2, 3]);
check("range no siblings", pageRange(5, 10, 0), [1, "...", 5, "...", 10]);
check("range wide siblings", pageRange(5, 10, 2), [1, 2, 3, 4, 5, 6, 7, "...", 10]);
check("range current too high", raises(() => pageRange(11, 10, 1)), true);
check("range current zero", raises(() => pageRange(0, 10, 1)), true);
check("range negative total", raises(() => pageRange(1, -1, 1)), true);
check("range negative siblings", raises(() => pageRange(1, 5, -1)), true);
check("range decimal", raises(() => pageRange(1.5, 5, 1)), true);

console.log();
let seed = 1999;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
let joinOk = true;
let flagOk = true;
let indexOk = true;
let rangeOk = true;
for (let round = 0; round < 300; round++) {
  const n = nextRandom(40);
  const size = 1 + nextRandom(7);
  const list = Array.from({ length: n }, (_, i) => i * 3);
  const totalPages = Math.ceil(n / size);
  let joined = [];
  for (let page = 1; page <= Math.max(1, totalPages); page++) {
    const result = paginate(list, page, size);
    joined = joined.concat(result.items);
    if (result.items.length > size) {
      joinOk = false;
    }
    if (result.hasPrev !== page > 1 || result.hasNext !== page < totalPages) {
      flagOk = false;
    }
  }
  if (JSON.stringify(joined) !== JSON.stringify(list)) {
    joinOk = false;
  }
  if (JSON.stringify(chunk(list, size)) !== JSON.stringify(list.length === 0 ? [] : chunk(list, size)) || chunk(list, size).length !== totalPages) {
    joinOk = false;
  }
  for (let i = 0; i < n; i++) {
    if (!paginate(list, pageOf(i, size), size).items.includes(list[i])) {
      indexOk = false;
    }
  }
  const total = 1 + nextRandom(30);
  const current = 1 + nextRandom(total);
  const siblings = nextRandom(4);
  const range = pageRange(current, total, siblings);
  const numbers = range.filter((x) => x !== "...");
  if (numbers[0] !== 1 || numbers[numbers.length - 1] !== total || !numbers.includes(current)) {
    rangeOk = false;
  }
  if (new Set(numbers).size !== numbers.length || numbers.some((x, i) => i > 0 && x <= numbers[i - 1])) {
    rangeOk = false;
  }
  for (let i = 0; i < range.length; i++) {
    if (range[i] === "...") {
      if (i === 0 || i === range.length - 1 || range[i + 1] - range[i - 1] < 3) {
        rangeOk = false;
      }
    } else if (i > 0 && range[i - 1] !== "..." && range[i] !== range[i - 1] + 1) {
      rangeOk = false;
    }
  }
  for (let d = -siblings; d <= siblings; d++) {
    const p = current + d;
    if (p >= 1 && p <= total && !numbers.includes(p)) {
      rangeOk = false;
    }
  }
}
check("300 pages rebuild list", joinOk, true);
check("300 flag checks", flagOk, true);
check("300 index lookups", indexOk, true);
check("300 page ranges", rangeOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
