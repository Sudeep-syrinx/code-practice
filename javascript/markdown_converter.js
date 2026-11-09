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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unescapeHtml(text) {
  return String(text)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

function inline(text) {
  const parts = escapeHtml(text).split(/(`[^`]+`)/);
  return parts
    .map((p, i) => {
      if (i % 2 === 1) {
        return "<code>" + p.slice(1, -1) + "</code>";
      }
      return p
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    })
    .join("");
}

function toHtml(md) {
  if (typeof md !== "string") {
    throw new Error("markdown must be a string");
  }
  const out = [];
  let para = [];
  let list = null;
  let inCode = false;
  let code = [];

  function flushPara() {
    if (para.length > 0) {
      out.push("<p>" + inline(para.join(" ")) + "</p>");
      para = [];
    }
  }

  function flushList() {
    if (list !== null) {
      const items = list.items.map((item) => "<li>" + inline(item) + "</li>").join("");
      out.push("<" + list.type + ">" + items + "</" + list.type + ">");
      list = null;
    }
  }

  function addItem(type, text) {
    flushPara();
    if (list !== null && list.type !== type) {
      flushList();
    }
    if (list === null) {
      list = { type: type, items: [] };
    }
    list.items.push(text);
  }

  for (const line of md.split("\n")) {
    if (inCode) {
      if (line.trim() === "```") {
        out.push("<pre><code>" + escapeHtml(code.join("\n")) + "</code></pre>");
        code = [];
        inCode = false;
      } else {
        code.push(line);
      }
      continue;
    }
    if (line.trim().startsWith("```")) {
      flushPara();
      flushList();
      inCode = true;
      continue;
    }
    if (line.trim() === "") {
      flushPara();
      flushList();
      continue;
    }
    let m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m !== null) {
      flushPara();
      flushList();
      out.push("<h" + m[1].length + ">" + inline(m[2]) + "</h" + m[1].length + ">");
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flushPara();
      flushList();
      out.push("<hr>");
      continue;
    }
    m = /^[-*]\s+(.*)$/.exec(line);
    if (m !== null) {
      addItem("ul", m[1]);
      continue;
    }
    m = /^\d+\.\s+(.*)$/.exec(line);
    if (m !== null) {
      addItem("ol", m[1]);
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  if (inCode) {
    out.push("<pre><code>" + escapeHtml(code.join("\n")) + "</code></pre>");
  }
  flushPara();
  flushList();
  return out.join("\n");
}

function headings(md) {
  const found = [];
  let inCode = false;
  for (const line of md.split("\n")) {
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    const m = inCode ? null : /^(#{1,6})\s+(.*)$/.exec(line);
    if (m !== null) {
      found.push({ level: m[1].length, text: m[2] });
    }
  }
  return found;
}

function extractLinks(md) {
  const found = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m = re.exec(md);
  while (m !== null) {
    found.push({ text: m[1], url: m[2] });
    m = re.exec(md);
  }
  return found;
}

check("inline plain", inline("hello"), "hello");
check("inline bold", inline("**hi**"), "<strong>hi</strong>");
check("inline italic", inline("*hi*"), "<em>hi</em>");
check("inline code", inline("`a*b*`"), "<code>a*b*</code>");
check("inline link", inline("[x](http://a.com)"), '<a href="http://a.com">x</a>');
check("inline escape", inline("a < b & c"), "a &lt; b &amp; c");
check("inline mixed", inline("**a** and *b*"), "<strong>a</strong> and <em>b</em>");
check("inline code and bold", inline("`x` **y**"), "<code>x</code> <strong>y</strong>");
check("inline empty", inline(""), "");

console.log();
check("heading 1", toHtml("# Title"), "<h1>Title</h1>");
check("heading 3", toHtml("### Sub *x*"), "<h3>Sub <em>x</em></h3>");
check("heading 6", toHtml("###### Deep"), "<h6>Deep</h6>");
check("seven hashes", toHtml("####### x"), "<p>####### x</p>");
check("no space after hash", toHtml("#nope"), "<p>#nope</p>");
check("paragraph", toHtml("hello\nworld"), "<p>hello world</p>");
check("two paragraphs", toHtml("a\n\nb"), "<p>a</p>\n<p>b</p>");
check("bullet list", toHtml("- a\n- b"), "<ul><li>a</li><li>b</li></ul>");
check("star list", toHtml("* a\n* b"), "<ul><li>a</li><li>b</li></ul>");
check("numbered list", toHtml("1. a\n2. b"), "<ol><li>a</li><li>b</li></ol>");
check("rule", toHtml("---"), "<hr>");
check("code block", toHtml("```\nx < y\n```"), "<pre><code>x &lt; y</code></pre>");
check("code keeps hash", toHtml("```\n# x\n```"), "<pre><code># x</code></pre>");
check("unclosed code", toHtml("```\nabc"), "<pre><code>abc</code></pre>");
check("empty input", toHtml(""), "");
check("not a string", raises(() => toHtml(5)), true);

console.log();
check("mixed blocks", toHtml("# T\n\ntext\n- a"), "<h1>T</h1>\n<p>text</p>\n<ul><li>a</li></ul>");
check("list then text", toHtml("- a\ntext"), "<ul><li>a</li></ul>\n<p>text</p>");
check("list switch", toHtml("- a\n1. b"), "<ul><li>a</li></ul>\n<ol><li>b</li></ol>");
check("italic is not list", toHtml("*hi* there"), "<p><em>hi</em> there</p>");
check("inline in list", toHtml("- **b**"), "<ul><li><strong>b</strong></li></ul>");
check("blank splits list", toHtml("- a\n\n- b"), "<ul><li>a</li></ul>\n<ul><li>b</li></ul>");

console.log();
const doc = "# One\ntext\n```\n# not a heading\n```\n## Two\n### Three";
check("headings", headings(doc), [{ level: 1, text: "One" }, { level: 2, text: "Two" }, { level: 3, text: "Three" }]);
check("headings none", headings("just text"), []);
check("links", extractLinks("[a](u1) and [b](u2)"), [{ text: "a", url: "u1" }, { text: "b", url: "u2" }]);
check("links none", extractLinks("nothing here"), []);

console.log();
let seed = 99;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const alphabet = ["a", "b", "<", ">", "&", '"', " ", "x"];
let escapeOk = true;
for (let round = 0; round < 300; round++) {
  let text = "";
  const len = nextRandom(20);
  for (let i = 0; i < len; i++) {
    text += alphabet[nextRandom(alphabet.length)];
  }
  const safe = escapeHtml(text);
  if (safe.includes("<") || safe.includes(">") || safe.includes('"')) {
    escapeOk = false;
  }
  if (unescapeHtml(safe) !== text) {
    escapeOk = false;
  }
}
check("300 escape round trips", escapeOk, true);

let listOk = true;
for (let round = 0; round < 100; round++) {
  const count = 1 + nextRandom(6);
  const lines = [];
  for (let i = 0; i < count; i++) {
    lines.push("- item" + i);
  }
  const html = toHtml(lines.join("\n"));
  if (html.split("<li>").length - 1 !== count) {
    listOk = false;
  }
}
check("100 random lists", listOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
