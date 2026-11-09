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

function messageOf(fn) {
  try {
    fn();
  } catch (e) {
    return e.message;
  }
  return "";
}

const KEYWORDS = new Set(["let", "if", "else", "while", "return", "true", "false"]);
const TWO_CHAR = ["==", "!=", "<=", ">=", "&&", "||"];
const ESCAPES = { n: "\n", t: "\t", '"': '"', "\\": "\\" };

function isDigit(c) {
  return c !== undefined && c >= "0" && c <= "9";
}

function isIdentStart(c) {
  return c !== undefined && /[A-Za-z_]/.test(c);
}

function isIdentPart(c) {
  return c !== undefined && /[A-Za-z0-9_]/.test(c);
}

function tokenize(src) {
  if (typeof src !== "string") {
    throw new Error("source must be a string");
  }
  const tokens = [];
  let i = 0;
  let line = 1;
  let col = 1;

  function advance(n) {
    for (let k = 0; k < n; k++) {
      if (src[i] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  }

  function fail(l, c, message) {
    throw new Error("line " + l + " col " + c + ": " + message);
  }

  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      advance(1);
      continue;
    }
    if (ch === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") {
        advance(1);
      }
      continue;
    }
    const startLine = line;
    const startCol = col;
    if (isDigit(ch)) {
      let j = i;
      while (isDigit(src[j])) {
        j++;
      }
      if (src[j] === "." && isDigit(src[j + 1])) {
        j++;
        while (isDigit(src[j])) {
          j++;
        }
      }
      const text = src.slice(i, j);
      tokens.push({ type: "number", text: text, value: Number(text), line: startLine, col: startCol });
      advance(j - i);
      continue;
    }
    if (isIdentStart(ch)) {
      let j = i;
      while (isIdentPart(src[j])) {
        j++;
      }
      const text = src.slice(i, j);
      tokens.push({ type: KEYWORDS.has(text) ? "keyword" : "ident", text: text, value: text, line: startLine, col: startCol });
      advance(j - i);
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let value = "";
      let closed = false;
      while (j < src.length) {
        const c = src[j];
        if (c === '"') {
          closed = true;
          break;
        }
        if (c === "\n") {
          break;
        }
        if (c === "\\") {
          const next = src[j + 1];
          if (next === undefined) {
            break;
          }
          if (!Object.prototype.hasOwnProperty.call(ESCAPES, next)) {
            fail(startLine, startCol, "bad escape \\" + next);
          }
          value += ESCAPES[next];
          j += 2;
        } else {
          value += c;
          j++;
        }
      }
      if (!closed) {
        fail(startLine, startCol, "unterminated string");
      }
      tokens.push({ type: "string", text: src.slice(i, j + 1), value: value, line: startLine, col: startCol });
      advance(j + 1 - i);
      continue;
    }
    const two = src.slice(i, i + 2);
    if (TWO_CHAR.includes(two)) {
      tokens.push({ type: "op", text: two, value: two, line: startLine, col: startCol });
      advance(2);
    } else if ("+-*/%=<>!".includes(ch)) {
      tokens.push({ type: "op", text: ch, value: ch, line: startLine, col: startCol });
      advance(1);
    } else if ("(){},;".includes(ch)) {
      tokens.push({ type: "punct", text: ch, value: ch, line: startLine, col: startCol });
      advance(1);
    } else {
      fail(startLine, startCol, "unexpected character '" + ch + "'");
    }
  }
  return tokens;
}

function summary(src) {
  return tokenize(src).map((t) => t.type + ":" + t.text);
}

function countByType(tokens) {
  const counts = {};
  for (const t of tokens) {
    counts[t.type] = (counts[t.type] || 0) + 1;
  }
  return counts;
}

function balanced(tokens) {
  const pairs = { ")": "(", "}": "{" };
  const stack = [];
  for (const t of tokens) {
    if (t.type !== "punct") {
      continue;
    }
    if (t.text === "(" || t.text === "{") {
      stack.push(t.text);
    } else if (t.text === ")" || t.text === "}") {
      if (stack.pop() !== pairs[t.text]) {
        return false;
      }
    }
  }
  return stack.length === 0;
}

check("statement", summary("let x = 42;"), ["keyword:let", "ident:x", "op:=", "number:42", "punct:;"]);
check("empty source", tokenize(""), []);
check("only spaces", tokenize("  \n\t "), []);
check("two char ops", summary("a==b"), ["ident:a", "op:==", "ident:b"]);
check("all two char ops", summary("== != <= >= && ||").length, 6);
check("single ops", summary("a<b"), ["ident:a", "op:<", "ident:b"]);
check("bang alone", summary("!x"), ["op:!", "ident:x"]);
check("assign then equals", summary("a = b == c"), ["ident:a", "op:=", "ident:b", "op:==", "ident:c"]);
check("decimal number", tokenize("1.5")[0].value, 1.5);
check("number text kept", tokenize("007")[0].text, "007");
check("number then dot", raises(() => tokenize("1.")), true);
check("two numbers", summary("1 2"), ["number:1", "number:2"]);
check("keyword vs ident", summary("let letter"), ["keyword:let", "ident:letter"]);
check("underscore ident", summary("_a1 b_2"), ["ident:_a1", "ident:b_2"]);
check("ident with digits", summary("x1y2"), ["ident:x1y2"]);
check("punctuation", summary("(){},;").length, 6);
check("true is keyword", tokenize("true")[0].type, "keyword");
check("call shape", summary("f(1, 2)"), ["ident:f", "punct:(", "number:1", "punct:,", "number:2", "punct:)"]);

console.log();
check("string value", tokenize('"hi there"')[0].value, "hi there");
check("string text", tokenize('"hi"')[0].text, '"hi"');
check("empty string", tokenize('""')[0].value, "");
check("escape newline", tokenize('"a\\nb"')[0].value, "a\nb");
check("escape quote", tokenize('"say \\"x\\""')[0].value, 'say "x"');
check("escape backslash", tokenize('"a\\\\b"')[0].value, "a\\b");
check("string keeps comment marks", tokenize('"a // b"')[0].value, "a // b");
check("string then token", summary('"a" b'), ['string:"a"', "ident:b"]);
check("unterminated message", messageOf(() => tokenize('x = "abc')), "line 1 col 5: unterminated string");
check("newline in string", raises(() => tokenize('"a\nb"')), true);
check("bad escape", raises(() => tokenize('"a\\qb"')), true);
check("trailing backslash", raises(() => tokenize('"a\\')), true);

console.log();
check("comment skipped", summary("a // hello\nb"), ["ident:a", "ident:b"]);
check("comment at end", summary("a // end"), ["ident:a"]);
check("only comment", tokenize("// nothing"), []);
check("slash is operator", summary("a / b"), ["ident:a", "op:/", "ident:b"]);
check("line of second token", tokenize("a\nb")[1].line, 2);
check("col of second token", tokenize("a\n  bc")[1].col, 3);
check("col after comment line", tokenize("x // c\ny")[1].line, 2);
check("col first token", tokenize("  a")[0].col, 3);
check("positions of three", tokenize("a b\nc").map((t) => t.line + ":" + t.col), ["1:1", "1:3", "2:1"]);
check("unexpected char message", messageOf(() => tokenize("a @")), "line 1 col 3: unexpected character '@'");
check("unexpected on line two", messageOf(() => tokenize("a\n\n  #")), "line 3 col 3: unexpected character '#'");
check("not a string", raises(() => tokenize(5)), true);

console.log();
check("count types", countByType(tokenize("let a = 1 + 2;")), { keyword: 1, ident: 1, op: 2, number: 2, punct: 1 });
check("count empty", countByType([]), {});
check("balanced ok", balanced(tokenize("(a){b}")), true);
check("balanced nested", balanced(tokenize("{ (a) { (b) } }")), true);
check("balanced wrong close", balanced(tokenize("(a}")), false);
check("balanced open only", balanced(tokenize("(")), false);
check("balanced close only", balanced(tokenize(")")), false);
check("balanced empty", balanced([]), true);
check("balanced ignores strings", balanced(tokenize('"("')), true);

console.log();
let seed = 1969;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const pieces = ["let", "x", "42", "3.5", "==", "<=", "&&", "(", ")", ";", '"s"', "foo_1", "+", "{", "}", "if"];
let textOk = true;
let colOk = true;
let typeOk = true;
for (let round = 0; round < 300; round++) {
  const chosen = [];
  const count = nextRandom(12);
  for (let i = 0; i < count; i++) {
    chosen.push(pieces[nextRandom(pieces.length)]);
  }
  const src = chosen.join(" ");
  const tokens = tokenize(src);
  if (JSON.stringify(tokens.map((t) => t.text)) !== JSON.stringify(chosen)) {
    textOk = false;
  }
  let offset = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].col !== offset + 1 || tokens[i].line !== 1) {
      colOk = false;
    }
    offset += chosen[i].length + 1;
  }
  const total = Object.values(countByType(tokens)).reduce((s, n) => s + n, 0);
  if (total !== tokens.length) {
    typeOk = false;
  }
}
check("300 texts rebuild", textOk, true);
check("300 columns match", colOk, true);
check("300 type counts", typeOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
