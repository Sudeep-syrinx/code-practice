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

function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

const NUMBER_RE = /^-?\d+(\.\d+)?$/;

function convert(raw) {
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1);
  }
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  if (NUMBER_RE.test(raw)) {
    return Number(raw);
  }
  return raw;
}

function unquote(raw) {
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1);
  }
  return raw;
}

function parse(text, options = {}) {
  if (typeof text !== "string") {
    throw new Error("text must be a string");
  }
  const coerce = options.coerce === true;
  const result = Object.create(null);
  let scope = result;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "" || line.startsWith(";") || line.startsWith("#")) {
      continue;
    }
    if (line.startsWith("[")) {
      const m = /^\[([^\]]+)\]$/.exec(line);
      if (m === null) {
        throw new Error("line " + (i + 1) + ": bad section header");
      }
      const name = m[1].trim();
      if (name === "") {
        throw new Error("line " + (i + 1) + ": empty section name");
      }
      if (!has(result, name)) {
        result[name] = Object.create(null);
      }
      scope = result[name];
      continue;
    }
    const eq = line.indexOf("=");
    if (eq === -1) {
      throw new Error("line " + (i + 1) + ": expected key=value");
    }
    const key = line.slice(0, eq).trim();
    if (key === "") {
      throw new Error("line " + (i + 1) + ": empty key");
    }
    const raw = line.slice(eq + 1).trim();
    scope[key] = coerce ? convert(raw) : unquote(raw);
  }
  return result;
}

function needsQuote(s) {
  return s !== s.trim() || s === "true" || s === "false" || NUMBER_RE.test(s) || s.startsWith('"');
}

function formatValue(v) {
  if (typeof v === "string") {
    return needsQuote(v) ? '"' + v + '"' : v;
  }
  return String(v);
}

function stringify(obj) {
  const lines = [];
  for (const key of Object.keys(obj)) {
    if (obj[key] === null || typeof obj[key] !== "object") {
      lines.push(key + "=" + formatValue(obj[key]));
    }
  }
  for (const name of Object.keys(obj)) {
    const section = obj[name];
    if (section !== null && typeof section === "object") {
      if (lines.length > 0) {
        lines.push("");
      }
      lines.push("[" + name + "]");
      for (const key of Object.keys(section)) {
        lines.push(key + "=" + formatValue(section[key]));
      }
    }
  }
  return lines.join("\n");
}

function get(obj, section, key, fallback) {
  const scope = section === "" ? obj : obj[section];
  if (scope && typeof scope === "object" && has(scope, key)) {
    return scope[key];
  }
  return fallback;
}

function sectionNames(obj) {
  return Object.keys(obj).filter((k) => obj[k] !== null && typeof obj[k] === "object");
}

const TEXT = "; comment\nname = demo\nport=8080\ndebug = true\n\n[db]\nhost = localhost\n# note\nuser = \"bob smith\"\n\n[empty]\n";

check("parse plain", parse(TEXT), {
  name: "demo",
  port: "8080",
  debug: "true",
  db: { host: "localhost", user: "bob smith" },
  empty: {},
});
check("parse coerce", parse(TEXT, { coerce: true }), {
  name: "demo",
  port: 8080,
  debug: true,
  db: { host: "localhost", user: "bob smith" },
  empty: {},
});
check("empty text", parse(""), {});
check("only comments", parse("; a\n# b\n"), {});
check("windows lines", parse("a=1\r\n[s]\r\nb=2\r\n"), { a: "1", s: { b: "2" } });
check("spaces around", parse("  key  =  value  "), { key: "value" });
check("equals in value", parse("url=http://x.com/?a=b"), { url: "http://x.com/?a=b" });
check("empty value", parse("key="), { key: "" });
check("later wins", parse("a=1\na=2"), { a: "2" });
check("sections merge", parse("[s]\na=1\n[t]\nb=2\n[s]\nc=3"), { s: { a: "1", c: "3" }, t: { b: "2" } });
check("section name spaces", parse("[ my sec ]\na=1"), { "my sec": { a: "1" } });
check("quoted keeps spaces", parse("a=\" x \"", { coerce: true }), { a: " x " });
check("quoted number stays text", parse("a=\"5\"", { coerce: true }), { a: "5" });
check("negative and decimal", parse("a=-5\nb=2.5\nc=1.", { coerce: true }), { a: -5, b: 2.5, c: "1." });
check("constructor key", parse("[constructor]\na=1"), { constructor: { a: "1" } });
check("not a string", raises(() => parse(5)), true);

console.log();
check("error no equals", messageOf(() => parse("a=1\njunk")), "line 2: expected key=value");
check("error empty key", messageOf(() => parse("=x")), "line 1: empty key");
check("error empty section", messageOf(() => parse("[ ]")), "line 1: empty section name");
check("error open bracket", messageOf(() => parse("a=1\n\n[oops")), "line 3: bad section header");
check("error empty brackets", messageOf(() => parse("[]")), "line 1: bad section header");

console.log();
const config = parse(TEXT, { coerce: true });
check("get global", get(config, "", "name", "x"), "demo");
check("get section", get(config, "db", "host", "x"), "localhost");
check("get missing key", get(config, "db", "nope", "fallback"), "fallback");
check("get missing section", get(config, "nope", "a", 7), 7);
check("get number", get(config, "", "port", 0), 8080);
check("get false value", get(parse("a=false", { coerce: true }), "", "a", true), false);
check("section names", sectionNames(config), ["db", "empty"]);
check("section names none", sectionNames(parse("a=1")), []);

console.log();
check("stringify simple", stringify({ a: "x", n: 5, ok: true }), "a=x\nn=5\nok=true");
check("stringify sections", stringify({ a: 1, db: { host: "h" } }), "a=1\n\n[db]\nhost=h");
check("stringify only section", stringify({ s: { a: 1 } }), "[s]\na=1");
check("stringify empty", stringify({}), "");
check("quotes numeric text", stringify({ a: "5" }), "a=\"5\"");
check("quotes bool text", stringify({ a: "true" }), "a=\"true\"");
check("quotes spaced text", stringify({ a: " x" }), "a=\" x\"");
check("no quotes needed", stringify({ a: "hello world" }), "a=hello world");
check("round trip config", parse(stringify(config), { coerce: true }), config);

console.log();
let seed = 2112;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const valueChars = ["a", "b", " ", "1", ".", "=", "\"", "#", ";"];
function randomValue() {
  const kind = nextRandom(4);
  if (kind === 0) {
    return nextRandom(200) - 100;
  }
  if (kind === 1) {
    return nextRandom(2) === 0;
  }
  let s = "";
  const len = nextRandom(6);
  for (let i = 0; i < len; i++) {
    s += valueChars[nextRandom(valueChars.length)];
  }
  return s;
}
function randomKey() {
  let k = "";
  const len = 1 + nextRandom(3);
  for (let i = 0; i < len; i++) {
    k += "abcde"[nextRandom(5)];
  }
  return k;
}
let roundOk = true;
let plainOk = true;
for (let round = 0; round < 300; round++) {
  const obj = {};
  for (let i = 0; i < nextRandom(4); i++) {
    obj[randomKey()] = randomValue();
  }
  for (let s = 0; s < nextRandom(3); s++) {
    const section = {};
    for (let i = 0; i < nextRandom(4); i++) {
      section[randomKey()] = randomValue();
    }
    obj["S" + nextRandom(4)] = section;
  }
  const text = stringify(obj);
  if (JSON.stringify(parse(text, { coerce: true })) !== JSON.stringify(obj)) {
    roundOk = false;
  }
  const flat = parse(text);
  for (const name of sectionNames(obj)) {
    if (!has(flat, name)) {
      plainOk = false;
    }
  }
}
check("300 round trips", roundOk, true);
check("300 plain parses", plainOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
