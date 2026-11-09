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

const QUANTIFIERS = "*+?";

function checkPattern(p) {
  if (typeof p !== "string") {
    throw new Error("pattern must be a string");
  }
  for (let i = 0; i < p.length; i++) {
    if (QUANTIFIERS.includes(p[i]) && (i === 0 || QUANTIFIERS.includes(p[i - 1]))) {
      throw new Error("nothing to repeat at position " + i);
    }
  }
}

function matchHere(p, pi, t, ti) {
  if (pi === p.length) {
    return ti === t.length;
  }
  const next = p[pi + 1];
  const single = ti < t.length && (p[pi] === "." || p[pi] === t[ti]);
  if (next === "*") {
    return matchHere(p, pi + 2, t, ti) || (single && matchHere(p, pi, t, ti + 1));
  }
  if (next === "+") {
    return single && (matchHere(p, pi + 2, t, ti + 1) || matchHere(p, pi, t, ti + 1));
  }
  if (next === "?") {
    return (single && matchHere(p, pi + 2, t, ti + 1)) || matchHere(p, pi + 2, t, ti);
  }
  return single && matchHere(p, pi + 1, t, ti + 1);
}

function fullMatch(pattern, text) {
  checkPattern(pattern);
  if (typeof text !== "string") {
    throw new Error("text must be a string");
  }
  return matchHere(pattern, 0, text, 0);
}

function search(pattern, text) {
  return findFirst(pattern, text) !== null;
}

function findFirst(pattern, text) {
  checkPattern(pattern);
  if (typeof text !== "string") {
    throw new Error("text must be a string");
  }
  for (let start = 0; start <= text.length; start++) {
    for (let end = text.length; end >= start; end--) {
      if (matchHere(pattern, 0, text.slice(start, end), 0)) {
        return { start: start, end: end, text: text.slice(start, end) };
      }
    }
  }
  return null;
}

function findAll(pattern, text) {
  checkPattern(pattern);
  const out = [];
  let from = 0;
  while (from <= text.length) {
    const rest = findFirst(pattern, text.slice(from));
    if (rest === null) {
      break;
    }
    if (rest.end === rest.start) {
      from += rest.start + 1;
      continue;
    }
    out.push({ start: from + rest.start, end: from + rest.end, text: rest.text });
    from += rest.end;
  }
  return out;
}

function countMatches(pattern, text) {
  return findAll(pattern, text).length;
}

function replaceAll(pattern, text, replacement) {
  const found = findAll(pattern, text);
  let out = "";
  let last = 0;
  for (const m of found) {
    out += text.slice(last, m.start) + replacement;
    last = m.end;
  }
  return out + text.slice(last);
}

check("literal", fullMatch("abc", "abc"), true);
check("literal wrong", fullMatch("abc", "abd"), false);
check("literal longer text", fullMatch("abc", "abcd"), false);
check("literal shorter text", fullMatch("abc", "ab"), false);
check("empty both", fullMatch("", ""), true);
check("empty pattern", fullMatch("", "a"), false);
check("empty text", fullMatch("a", ""), false);
check("dot", fullMatch("a.c", "abc"), true);
check("dot needs a char", fullMatch("a.c", "ac"), false);
check("dot only", fullMatch(".", "x"), true);
check("dot not empty", fullMatch(".", ""), false);

console.log();
check("star empty", fullMatch("a*", ""), true);
check("star many", fullMatch("a*", "aaa"), true);
check("star wrong char", fullMatch("a*", "b"), false);
check("star then literal", fullMatch("a*b", "aab"), true);
check("star then literal none", fullMatch("a*b", "b"), true);
check("star dot", fullMatch(".*", "anything"), true);
check("star dot then end", fullMatch(".*c", "abc"), true);
check("star dot wrong end", fullMatch(".*c", "abd"), false);
check("star twice", fullMatch("a*a", "aaa"), true);
check("star three", fullMatch("a*a*a", "aa"), true);
check("plus empty", fullMatch("a+", ""), false);
check("plus one", fullMatch("a+", "a"), true);
check("plus many", fullMatch("a+", "aaaa"), true);
check("plus then literal", fullMatch("a+b", "aab"), true);
check("plus then literal none", fullMatch("a+b", "b"), false);
check("question none", fullMatch("ab?c", "ac"), true);
check("question one", fullMatch("ab?c", "abc"), true);
check("question two", fullMatch("ab?c", "abbc"), false);
check("question dot", fullMatch(".?", "x"), true);
check("classic false", fullMatch("mis*is*p*.", "mississippi"), false);
check("classic true", fullMatch("mis*is*ip*.", "mississippi"), true);
check("classic ab", fullMatch("c*a*b", "aab"), true);
check("classic aa", fullMatch("a", "aa"), false);

console.log();
check("bad leading star", raises(() => fullMatch("*a", "a")), true);
check("bad double star", raises(() => fullMatch("a**", "a")), true);
check("bad plus star", raises(() => fullMatch("a+*", "a")), true);
check("bad lone plus", raises(() => fullMatch("+", "a")), true);
check("bad question first", raises(() => fullMatch("?", "")), true);
check("bad pattern type", raises(() => fullMatch(5, "a")), true);
check("bad text type", raises(() => fullMatch("a", 5)), true);

console.log();
check("search inside", search("ab", "xxabxx"), true);
check("search missing", search("abc", "ab"), false);
check("search star", search("a*b", "xxbxx"), true);
check("search empty pattern", search("", "x"), true);
check("search in empty text", search("a*", ""), true);
check("search needs a", search("a+", "bbb"), false);
check("first match", findFirst("a+", "baaac"), { start: 1, end: 4, text: "aaa" });
check("first match longest", findFirst("a*", "aab"), { start: 0, end: 2, text: "aa" });
check("first match none", findFirst("x", "abc"), null);
check("first match empty", findFirst("a*", "bbb"), { start: 0, end: 0, text: "" });
check("first match dot", findFirst("b.d", "abcdbxd"), { start: 1, end: 4, text: "bcd" });
check("all matches", findAll("a+", "aabaaac").map((m) => m.text), ["aa", "aaa"]);
check("all positions", findAll("ab", "ab ab").map((m) => m.start), [0, 3]);
check("all none", findAll("z", "abc"), []);
check("all skips empty", findAll("a*", "baab").map((m) => m.text), ["aa"]);
check("count", countMatches("b+", "abbcb"), 2);
check("replace", replaceAll("a+", "caaab a", "-"), "c-b -");
check("replace none", replaceAll("z", "abc", "-"), "abc");
check("replace all text", replaceAll(".+", "abc", "X"), "X");

console.log();
let seed = 1987;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const atoms = ["a", "b", "c", "."];
const quants = ["", "", "*", "+", "?"];
function randomPattern() {
  let p = "";
  const len = nextRandom(5);
  for (let i = 0; i < len; i++) {
    p += atoms[nextRandom(atoms.length)] + quants[nextRandom(quants.length)];
  }
  return p;
}
function randomText() {
  let t = "";
  const len = nextRandom(8);
  for (let i = 0; i < len; i++) {
    t += "abc"[nextRandom(3)];
  }
  return t;
}
let fullOk = true;
let searchOk = true;
let firstOk = true;
for (let round = 0; round < 500; round++) {
  const p = randomPattern();
  const t = randomText();
  if (fullMatch(p, t) !== new RegExp("^(?:" + p + ")$").test(t)) {
    fullOk = false;
  }
  if (search(p, t) !== new RegExp(p).test(t)) {
    searchOk = false;
  }
  const first = findFirst(p, t);
  if (first !== null && !fullMatch(p, t.slice(first.start, first.end))) {
    firstOk = false;
  }
}
check("500 full matches", fullOk, true);
check("500 searches", searchOk, true);
check("500 first matches valid", firstOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
