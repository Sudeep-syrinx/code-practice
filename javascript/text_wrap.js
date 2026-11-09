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

function checkWidth(width) {
  if (!Number.isInteger(width) || width < 1) {
    throw new Error("width must be a positive integer");
  }
}

function wrap(text, width) {
  if (typeof text !== "string") {
    throw new Error("text must be a string");
  }
  checkWidth(width);
  const lines = [];
  let cur = "";
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while (word.length > width) {
      if (cur !== "") {
        lines.push(cur);
        cur = "";
      }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (cur === "") {
      cur = word;
    } else if (cur.length + 1 + word.length <= width) {
      cur += " " + word;
    } else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur !== "") {
    lines.push(cur);
  }
  return lines;
}

function justify(line, width) {
  checkWidth(width);
  if (line.length > width) {
    throw new Error("line is longer than the width");
  }
  const words = line.split(" ").filter(Boolean);
  if (words.length <= 1) {
    return line.padEnd(width);
  }
  const chars = words.join("").length;
  const gaps = words.length - 1;
  const spaces = width - chars;
  const base = Math.floor(spaces / gaps);
  const extra = spaces % gaps;
  let out = "";
  for (let i = 0; i < words.length; i++) {
    out += words[i];
    if (i < gaps) {
      out += " ".repeat(base + (i < extra ? 1 : 0));
    }
  }
  return out;
}

function justifyText(text, width) {
  const lines = wrap(text, width);
  return lines.map((line, i) => (i === lines.length - 1 ? line : justify(line, width)));
}

function center(line, width) {
  checkWidth(width);
  if (line.length >= width) {
    return line;
  }
  const left = Math.floor((width - line.length) / 2);
  return (" ".repeat(left) + line).padEnd(width);
}

function truncate(text, max, ellipsis = "...") {
  if (!Number.isInteger(max) || max < 1) {
    throw new Error("max must be a positive integer");
  }
  if (text.length <= max) {
    return text;
  }
  if (max <= ellipsis.length) {
    return text.slice(0, max);
  }
  return text.slice(0, max - ellipsis.length) + ellipsis;
}

function formatTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }
  const cols = Math.max(...rows.map((r) => r.length));
  const widths = [];
  for (let c = 0; c < cols; c++) {
    widths.push(Math.max(...rows.map((r) => String(r[c] === undefined ? "" : r[c]).length)));
  }
  return rows.map((r) =>
    widths
      .map((w, c) => String(r[c] === undefined ? "" : r[c]).padEnd(w))
      .join(" | ")
      .trimEnd()
  );
}

function indent(text, n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("indent must be a non-negative integer");
  }
  return text
    .split("\n")
    .map((line) => (line.trim() === "" ? line : " ".repeat(n) + line))
    .join("\n");
}

function dedent(text) {
  const lines = text.split("\n");
  const sizes = lines.filter((l) => l.trim() !== "").map((l) => l.length - l.trimStart().length);
  if (sizes.length === 0) {
    return text;
  }
  const cut = Math.min(...sizes);
  return lines.map((l) => (l.trim() === "" ? l : l.slice(cut))).join("\n");
}

check("wrap sentence", wrap("the quick brown fox jumps over the lazy dog", 10), ["the quick", "brown fox", "jumps over", "the lazy", "dog"]);
check("wrap exact fit", wrap("abc def", 7), ["abc def"]);
check("wrap one short", wrap("abc def", 6), ["abc", "def"]);
check("wrap long word", wrap("abcdefghij", 4), ["abcd", "efgh", "ij"]);
check("wrap long after short", wrap("ab abcdefgh", 4), ["ab", "abcd", "efgh"]);
check("wrap empty", wrap("", 5), []);
check("wrap blanks", wrap("   ", 5), []);
check("wrap collapses spaces", wrap("a   b", 5), ["a b"]);
check("wrap newlines", wrap("a\nb\n\nc", 10), ["a b c"]);
check("wrap width one", wrap("ab c", 1), ["a", "b", "c"]);
check("wrap bad width", raises(() => wrap("a", 0)), true);
check("wrap decimal width", raises(() => wrap("a", 2.5)), true);
check("wrap not string", raises(() => wrap(5, 5)), true);

console.log();
check("justify two words", justify("the quick", 12), "the    quick");
check("justify even gaps", justify("a b c", 9), "a   b   c");
check("justify uneven gaps", justify("a b c", 8), "a   b  c");
check("justify single word", justify("hi", 5), "hi   ");
check("justify exact", justify("ab cd", 5), "ab cd");
check("justify empty", justify("", 3), "   ");
check("justify too long", raises(() => justify("abcdef", 3)), true);
check("justify text", justifyText("the quick brown fox", 10), ["the  quick", "brown fox"]);
check("justify last line left", justifyText("aa bb cc", 5), ["aa bb", "cc"]);
check("justify empty text", justifyText("", 5), []);

console.log();
check("center even", center("ab", 6), "  ab  ");
check("center odd", center("abc", 6), " abc  ");
check("center exact", center("abc", 3), "abc");
check("center too long", center("abcdef", 3), "abcdef");
check("truncate short", truncate("hello", 10), "hello");
check("truncate long", truncate("hello world", 8), "hello...");
check("truncate exact", truncate("hello", 5), "hello");
check("truncate tiny", truncate("hello", 2), "he");
check("truncate custom", truncate("hello world", 6, "~"), "hello~");
check("truncate bad max", raises(() => truncate("abc", 0)), true);

console.log();
check("table", formatTable([["name", "qty"], ["apple", "3"]]), ["name  | qty", "apple | 3"]);
check("table numbers", formatTable([[1, 22], [333, 4]]), ["1   | 22", "333 | 4"]);
check("table ragged", formatTable([["a", "b", "c"], ["d"]]), ["a | b | c", "d"]);
check("table empty", formatTable([]), []);
check("table single", formatTable([["x"]]), ["x"]);
check("indent", indent("a\n\nb", 2), "  a\n\n  b");
check("indent zero", indent("a", 0), "a");
check("indent bad", raises(() => indent("a", -1)), true);
check("dedent", dedent("    a\n      b"), "a\n  b");
check("dedent blank lines", dedent("  a\n\n  b"), "a\n\nb");
check("dedent nothing", dedent("a\n b"), "a\n b");
check("dedent blank only", dedent("   "), "   ");
check("indent then dedent", dedent(indent("a\n  b", 4)), "a\n  b");

console.log();
let seed = 1234;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
function randomWords(count, maxLen) {
  const words = [];
  for (let i = 0; i < count; i++) {
    let w = "";
    const len = 1 + nextRandom(maxLen);
    for (let c = 0; c < len; c++) {
      w += "abcdefgh"[nextRandom(8)];
    }
    words.push(w);
  }
  return words;
}
let fitOk = true;
let keepOk = true;
let greedyOk = true;
let justOk = true;
for (let round = 0; round < 300; round++) {
  const width = 6 + nextRandom(15);
  const words = randomWords(1 + nextRandom(20), 6);
  const lines = wrap(words.join(" "), width);
  if (lines.some((l) => l.length > width)) {
    fitOk = false;
  }
  if (JSON.stringify(lines.join(" ").split(" ")) !== JSON.stringify(words)) {
    keepOk = false;
  }
  for (let i = 0; i + 1 < lines.length; i++) {
    const nextWord = lines[i + 1].split(" ")[0];
    if (lines[i].length + 1 + nextWord.length <= width) {
      greedyOk = false;
    }
  }
  const spread = justifyText(words.join(" "), width);
  for (let i = 0; i < spread.length; i++) {
    const same = spread[i].split(" ").filter(Boolean).join(" ") === lines[i];
    const full = i === spread.length - 1 || lines[i].indexOf(" ") === -1 || spread[i].length === width;
    if (!same || !full) {
      justOk = false;
    }
  }
}
check("300 lines fit", fitOk, true);
check("300 words kept", keepOk, true);
check("300 greedy checks", greedyOk, true);
check("300 justified texts", justOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
