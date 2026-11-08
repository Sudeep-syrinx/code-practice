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

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

const FILTERS = {
  upper: (v) => String(v).toUpperCase(),
  lower: (v) => String(v).toLowerCase(),
  capitalize: (v) => {
    const s = String(v);
    return s === "" ? s : s[0].toUpperCase() + s.slice(1).toLowerCase();
  },
  trim: (v) => String(v).trim(),
  length: (v) => (typeof v === "string" || Array.isArray(v) ? v.length : String(v).length),
  escape: (v) =>
    String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;"),
};

function getPath(obj, path) {
  let cur = obj;
  for (const part of path.split(".")) {
    if (cur === null || cur === undefined || typeof cur !== "object") {
      return undefined;
    }
    if (!hasOwn(cur, part)) {
      return undefined;
    }
    cur = cur[part];
  }
  return cur;
}

function truthy(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Boolean(value);
}

function renderVar(expr, data) {
  const parts = expr.split("|").map((p) => p.trim());
  const path = parts[0];
  if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(path)) {
    throw new Error("bad variable name: " + path);
  }
  let value = getPath(data, path);
  for (const f of parts.slice(1)) {
    if (f.startsWith("default:")) {
      if (value === undefined || value === null || value === "") {
        value = f.slice(8).trim();
      }
      continue;
    }
    if (value === undefined) {
      throw new Error("missing value: " + path);
    }
    if (!hasOwn(FILTERS, f)) {
      throw new Error("unknown filter: " + f);
    }
    value = FILTERS[f](value);
  }
  if (value === undefined || value === null) {
    throw new Error("missing value: " + path);
  }
  return String(value);
}

function render(text, data) {
  if (typeof text !== "string") {
    throw new Error("template must be a string");
  }
  if (data === null || typeof data !== "object") {
    throw new Error("data must be an object");
  }
  const withIfs = text.replace(/\{\{if\s+([A-Za-z_][A-Za-z0-9_.]*)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (whole, path, body) => {
    const pieces = body.split("{{else}}");
    if (truthy(getPath(data, path))) {
      return pieces[0];
    }
    return pieces.length > 1 ? pieces[1] : "";
  });
  return withIfs.replace(/\{\{([^{}]*)\}\}/g, (whole, inner) => {
    const t = inner.trim();
    if (t.startsWith("if ") || t.startsWith("/") || t === "else") {
      throw new Error("unexpected tag: " + t);
    }
    return renderVar(t, data);
  });
}

function extractVars(text) {
  const found = new Set();
  const re = /\{\{([^{}]*)\}\}/g;
  let m = re.exec(text);
  while (m !== null) {
    const t = m[1].trim();
    let path = null;
    if (t.startsWith("if ")) {
      path = t.slice(3).trim();
    } else if (t.startsWith("/") || t === "else") {
      path = null;
    } else {
      path = t.split("|")[0].trim();
    }
    if (path) {
      found.add(path);
    }
    m = re.exec(text);
  }
  return Array.from(found).sort();
}

check("plain variable", render("Hello {{name}}!", { name: "Sam" }), "Hello Sam!");
check("no tags", render("no tags here", {}), "no tags here");
check("empty template", render("", {}), "");
check("two variables", render("{{a}}{{b}}", { a: 1, b: 2 }), "12");
check("spaces in tag", render("{{ name }}", { name: "x" }), "x");
check("nested path", render("{{user.address.city}}", { user: { address: { city: "Oslo" } } }), "Oslo");
check("array index", render("{{items.1}}", { items: ["a", "b"] }), "b");
check("zero renders", render("{{n}}", { n: 0 }), "0");
check("false renders", render("{{n}}", { n: false }), "false");
check("same variable twice", render("{{a}}-{{a}}", { a: "z" }), "z-z");
check("dollar signs safe", render("{{v}}", { v: "$&" }), "$&");
check("value not rescanned", render("{{v}}", { v: "{{x}}" }), "{{x}}");
check("unclosed braces", render("{{ oops", {}), "{{ oops");
check("single braces", render("a } b {", {}), "a } b {");

console.log();
check("upper", render("{{name|upper}}", { name: "Sam" }), "SAM");
check("lower", render("{{name|lower}}", { name: "SAM" }), "sam");
check("capitalize", render("{{name|capitalize}}", { name: "sAM" }), "Sam");
check("capitalize phrase", render("{{name|capitalize}}", { name: "hELLO wORLD" }), "Hello world");
check("trim", render("[{{name|trim}}]", { name: "  hi " }), "[hi]");
check("chained", render("{{name|trim|upper}}", { name: "  hi " }), "HI");
check("length of list", render("{{items|length}}", { items: [1, 2, 3] }), "3");
check("length of text", render("{{name|length}}", { name: "Sam" }), "3");
check("escape", render("{{t|escape}}", { t: "<b>&</b>" }), "&lt;b&gt;&amp;&lt;/b&gt;");
check("escape quotes", render("{{t|escape}}", { t: 'say "hi"' }), "say &quot;hi&quot;");
check("filter spaces", render("{{ name | upper }}", { name: "ab" }), "AB");
check("number with filter", render("{{n|length}}", { n: 12345 }), "5");

console.log();
check("default missing", render("{{nick|default:friend}}", {}), "friend");
check("default spaced", render("{{nick|default: friend}}", {}), "friend");
check("default present", render("{{nick|default:friend}}", { nick: "Bo" }), "Bo");
check("default empty text", render("{{nick|default:friend}}", { nick: "" }), "friend");
check("default null", render("{{nick|default:friend}}", { nick: null }), "friend");
check("default zero kept", render("{{n|default:none}}", { n: 0 }), "0");
check("default then filter", render("{{nick|default:friend|upper}}", {}), "FRIEND");

console.log();
check("if true", render("{{if on}}yes{{/if}}", { on: true }), "yes");
check("if false", render("{{if on}}yes{{/if}}", { on: false }), "");
check("if else true", render("{{if on}}A{{else}}B{{/if}}", { on: true }), "A");
check("if else false", render("{{if on}}A{{else}}B{{/if}}", { on: false }), "B");
check("if missing path", render("{{if nope}}A{{else}}B{{/if}}", {}), "B");
check("if with variable", render("{{if user}}Hi {{user}}{{/if}}", { user: "Al" }), "Hi Al");
check("if nested path", render("{{if a.b}}yes{{/if}}", { a: { b: 1 } }), "yes");
check("if empty list", render("{{if items}}some{{else}}none{{/if}}", { items: [] }), "none");
check("if list with zero", render("{{if items}}some{{else}}none{{/if}}", { items: [0] }), "some");
check("if zero is false", render("{{if n}}yes{{else}}no{{/if}}", { n: 0 }), "no");
check("if empty text", render("{{if s}}yes{{else}}no{{/if}}", { s: "" }), "no");
check("two ifs", render("{{if a}}A{{/if}}-{{if b}}B{{/if}}", { a: true, b: false }), "A-");
check("if spaces", render("{{if on }}x{{/if}}", { on: 1 }), "x");
check("if multiline", render("{{if on}}line1\nline2{{/if}}", { on: 1 }), "line1\nline2");
check("dropped branch no error", render("{{if on}}{{missing}}{{else}}ok{{/if}}", { on: false }), "ok");

console.log();
check("missing raises", raises(() => render("{{x}}", {})), true);
check("missing with filter", raises(() => render("{{x|upper}}", {})), true);
check("path through number", raises(() => render("{{a.b.c}}", { a: { b: 1 } })), true);
check("null raises", raises(() => render("{{x}}", { x: null })), true);
check("unknown filter", raises(() => render("{{n|zzz}}", { n: 1 })), true);
check("empty tag", raises(() => render("{{}}", {})), true);
check("space in name", raises(() => render("{{bad name}}", {})), true);
check("digit first name", raises(() => render("{{1abc}}", {})), true);
check("stray end tag", raises(() => render("{{/if}}", {})), true);
check("stray else", raises(() => render("{{else}}", {})), true);
check("unclosed if", raises(() => render("{{if x}}never closed", { x: 1 })), true);
check("unknown block", raises(() => render("{{each x}}", {})), true);
check("template not text", raises(() => render(5, {})), true);
check("data is null", raises(() => render("a", null)), true);
check("data is text", raises(() => render("a", "text")), true);
check("inherited key blocked", raises(() => render("{{constructor}}", {})), true);

console.log();
check("extract simple", extractVars("{{a}} {{b.c|upper}} {{a}}"), ["a", "b.c"]);
check("extract with if", extractVars("{{if on}}{{name}}{{else}}{{other|upper}}{{/if}}"), ["name", "on", "other"]);
check("extract none", extractVars("plain text"), []);
check("extract spaced", extractVars("{{ x | trim }}"), ["x"]);
check("extract sorted", extractVars("{{z}}{{m}}{{a}}"), ["a", "m", "z"]);

console.log();
let seed = 777;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const WORDS = ["alpha", "river", "stone", "maple", "cloud", "ember", "frost", "lunar"];
let renderOk = true;
let varsOk = true;
for (let n = 0; n < 200; n++) {
  const count = 1 + nextRandom(6);
  const data = {};
  const tags = [];
  const pieces = [];
  const names = [];
  for (let i = 0; i < count; i++) {
    const word = WORDS[nextRandom(WORDS.length)];
    const loud = nextRandom(2) === 0;
    data["v" + i] = word;
    names.push("v" + i);
    tags.push(loud ? "{{v" + i + "|upper}}" : "{{v" + i + "}}");
    pieces.push(loud ? word.toUpperCase() : word);
  }
  if (render(tags.join("-"), data) !== pieces.join("-")) {
    renderOk = false;
  }
  if (JSON.stringify(extractVars(tags.join(" "))) !== JSON.stringify(names.slice().sort())) {
    varsOk = false;
  }
}
check("200 random templates", renderOk, true);
check("200 random variable lists", varsOk, true);

let ifOk = true;
for (let n = 0; n < 200; n++) {
  const flag = nextRandom(2) === 0;
  const yes = WORDS[nextRandom(WORDS.length)];
  const no = WORDS[nextRandom(WORDS.length)];
  const text = "{{if f}}" + yes + "{{else}}" + no + "{{/if}}";
  if (render(text, { f: flag }) !== (flag ? yes : no)) {
    ifOk = false;
  }
}
check("200 random if blocks", ifOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
