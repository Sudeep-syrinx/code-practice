import html
import random
import re

HEADING = re.compile(r"^ {0,3}(#{1,6})\s+(.*?)\s*$")
HR = re.compile(r"^ {0,3}([-*_])(?: *\1){2,} *$")
QUOTE = re.compile(r"^ {0,3}>")
LIST = re.compile(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$")
SEPARATOR = re.compile(r"^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$")


def esc(text):
    return html.escape(text, quote=False)


def attr(text):
    return text.replace('"', "&quot;")


def safe_url(url):
    if re.match(r"\s*(javascript|vbscript|data):", url, re.I):
        return "#"
    return url


def slugify(text):
    text = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"[*_`~]", "", text).lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    return re.sub(r"\s+", "-", text.strip()) or "section"


def inline(text):
    store = []

    def keep(markup):
        store.append(markup)
        return f"\x00{len(store) - 1}\x00"

    text = text.replace("\x00", "")
    text = re.sub(r"`([^`]+)`", lambda m: keep("<code>" + esc(m.group(1)) + "</code>"), text)
    text = esc(text)
    text = re.sub(r"\\([\\`*_{}\[\]()#+\-.!|~])", lambda m: keep(esc(m.group(1))), text)

    def image(m):
        tag = f'<img src="{attr(safe_url(m.group(2)))}" alt="{attr(m.group(1))}"'
        if m.group(3):
            tag += f' title="{attr(m.group(3))}"'
        return keep(tag + ">")

    def link(m):
        opening = f'<a href="{attr(safe_url(m.group(2)))}"'
        if m.group(3):
            opening += f' title="{attr(m.group(3))}"'
        return keep(opening + ">") + m.group(1) + keep("</a>")

    text = re.sub(r'!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)', image, text)
    text = re.sub(r'\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)', link, text)
    text = re.sub(r"\*\*\*(.+?)\*\*\*", r"<strong><em>\1</em></strong>", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![A-Za-z0-9])__(.+?)__(?![A-Za-z0-9])", r"<strong>\1</strong>", text)
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    text = re.sub(r"(?<![A-Za-z0-9])_(.+?)_(?![A-Za-z0-9])", r"<em>\1</em>", text)
    text = re.sub(r"~~(.+?)~~", r"<del>\1</del>", text)
    text = re.sub(r"\x00(\d+)\x00", lambda m: store[int(m.group(1))], text)
    return re.sub(r" {2,}\n", "<br>\n", text)


def split_row(line):
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    return [c.strip() for c in s.split("|")]


def align_of(cell):
    left, right = cell.startswith(":"), cell.endswith(":")
    if left and right:
        return "center"
    if right:
        return "right"
    if left:
        return "left"
    return ""


def item_text(text):
    if text.startswith("[ ] "):
        return '<input type="checkbox" disabled> ' + inline(text[4:])
    if text[:4].lower() == "[x] ":
        return '<input type="checkbox" checked disabled> ' + inline(text[4:])
    return inline(text)


class Converter:
    def __init__(self):
        self.seen = {}
        self.headings = []

    def slug(self, text):
        base = slugify(text)
        n = self.seen.get(base, 0)
        self.seen[base] = n + 1
        return base if n == 0 else f"{base}-{n}"

    def convert(self, text):
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        lines = [line.expandtabs(4) for line in text.split("\n")]
        return "\n".join(self.render(lines))

    def is_table(self, lines, i):
        if i + 1 >= len(lines) or "|" not in lines[i]:
            return False
        if not SEPARATOR.match(lines[i + 1]):
            return False
        return len(split_row(lines[i])) == len(split_row(lines[i + 1]))

    def starts_block(self, lines, i):
        line = lines[i]
        return bool(
            line.strip().startswith("```")
            or HEADING.match(line)
            or HR.match(line)
            or QUOTE.match(line)
            or LIST.match(line)
            or self.is_table(lines, i)
        )

    def render(self, lines):
        out = []
        i = 0
        n = len(lines)
        while i < n:
            line = lines[i]
            stripped = line.strip()
            if not stripped:
                i += 1
                continue
            if stripped.startswith("```"):
                info = stripped[3:].strip()
                lang = info.split()[0] if info else ""
                body = []
                i += 1
                while i < n and not lines[i].strip().startswith("```"):
                    body.append(esc(lines[i]))
                    i += 1
                i += 1
                cls = f' class="language-{esc(lang)}"' if lang else ""
                out.append(f"<pre><code{cls}>" + "\n".join(body) + "</code></pre>")
                continue
            m = HEADING.match(line)
            if m:
                level, title = len(m.group(1)), m.group(2)
                sid = self.slug(title)
                self.headings.append((level, title, sid))
                out.append(f'<h{level} id="{sid}">{inline(title)}</h{level}>')
                i += 1
                continue
            if HR.match(line):
                out.append("<hr>")
                i += 1
                continue
            if QUOTE.match(line):
                inner = []
                while i < n and QUOTE.match(lines[i]):
                    inner.append(re.sub(r"^ {0,3}> ?", "", lines[i]))
                    i += 1
                out.append("<blockquote>\n" + "\n".join(self.render(inner)) + "\n</blockquote>")
                continue
            if LIST.match(line):
                blocks, i = self.list_block(lines, i)
                out.extend(blocks)
                continue
            if self.is_table(lines, i):
                block, i = self.table(lines, i)
                out.append(block)
                continue
            buf = [line.lstrip()]
            i += 1
            while i < n and lines[i].strip() and not self.starts_block(lines, i):
                buf.append(lines[i].lstrip())
                i += 1
            buf[-1] = buf[-1].rstrip()
            out.append("<p>" + inline("\n".join(buf)) + "</p>")
        return out

    def list_block(self, lines, i):
        items = []
        while i < len(lines):
            m = LIST.match(lines[i])
            if not m or HR.match(lines[i]):
                break
            items.append((len(m.group(1)), m.group(2)[0].isdigit(), m.group(3)))
            i += 1
        blocks = []
        pos = 0
        while pos < len(items):
            text, pos = self.build_list(items, pos, items[pos][0])
            blocks.append(text)
        return blocks, i

    def build_list(self, items, pos, indent):
        tag = "ol" if items[pos][1] else "ul"
        out = ["<" + tag + ">"]
        while pos < len(items) and items[pos][0] >= indent:
            ind, _, text = items[pos]
            pos += 1
            body = item_text(text)
            if pos < len(items) and items[pos][0] > ind:
                nested, pos = self.build_list(items, pos, items[pos][0])
                body += "\n" + nested
            out.append("<li>" + body + "</li>")
        out.append("</" + tag + ">")
        return "\n".join(out), pos

    def table(self, lines, i):
        header = split_row(lines[i])
        aligns = [align_of(c) for c in split_row(lines[i + 1])]
        count = len(header)
        rows = []
        j = i + 2
        while j < len(lines) and lines[j].strip() and "|" in lines[j]:
            rows.append(split_row(lines[j]))
            j += 1

        def cell(tag, text, k):
            style = f' style="text-align:{aligns[k]}"' if aligns[k] else ""
            return f"<{tag}{style}>{inline(text)}</{tag}>"

        head = "".join(cell("th", header[k], k) for k in range(count))
        out = ["<table>", "<thead>", "<tr>" + head + "</tr>", "</thead>"]
        if rows:
            out.append("<tbody>")
            for row in rows:
                row = (row + [""] * count)[:count]
                out.append("<tr>" + "".join(cell("td", row[k], k) for k in range(count)) + "</tr>")
            out.append("</tbody>")
        out.append("</table>")
        return "\n".join(out), j


def convert(text):
    return Converter().convert(text)


def toc(text):
    conv = Converter()
    conv.convert(text)
    return conv.headings


def document(md, title="Document"):
    conv = Converter()
    body = conv.convert(md)
    nav = ""
    if conv.headings:
        items = "\n".join(
            f'<li class="l{lv}"><a href="#{sid}">{inline(t)}</a></li>' for lv, t, sid in conv.headings
        )
        nav = "<nav>\n<ul>\n" + items + "\n</ul>\n</nav>\n"
    return (
        "<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n"
        f"<title>{esc(title)}</title>\n</head>\n<body>\n{nav}{body}\n</body>\n</html>"
    )


TESTS = [
    ("heading", "# Hello World", '<h1 id="hello-world">Hello World</h1>'),
    ("paragraph", "Hello\nworld", "<p>Hello\nworld</p>"),
    ("bold and italic", "**b** *i* ***bi***", "<p><strong>b</strong> <em>i</em> <strong><em>bi</em></strong></p>"),
    ("code span", "Use `a < b` here", "<p>Use <code>a &lt; b</code> here</p>"),
    ("html escaped", "<script>alert(1)</script>", "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>"),
    ("ampersand", "a & b", "<p>a &amp; b</p>"),
    ("link underscores", "[Site](http://x.com/a_b_c)", '<p><a href="http://x.com/a_b_c">Site</a></p>'),
    ("link with title", '[a](u "T")', '<p><a href="u" title="T">a</a></p>'),
    ("bold link text", "[**hi**](u)", '<p><a href="u"><strong>hi</strong></a></p>'),
    ("unsafe link", "[x](javascript:evil)", '<p><a href="#">x</a></p>'),
    ("image", "![cat](cat_1.png)", '<p><img src="cat_1.png" alt="cat"></p>'),
    ("image with title", '![cat](c.png "Tom")', '<p><img src="c.png" alt="cat" title="Tom"></p>'),
    ("unordered list", "- a\n- b", "<ul>\n<li>a</li>\n<li>b</li>\n</ul>"),
    ("ordered list", "1. x\n2. y", "<ol>\n<li>x</li>\n<li>y</li>\n</ol>"),
    ("nested list", "- a\n  - b\n  - c\n- d",
     "<ul>\n<li>a\n<ul>\n<li>b</li>\n<li>c</li>\n</ul></li>\n<li>d</li>\n</ul>"),
    ("task list", "- [ ] todo\n- [x] done",
     '<ul>\n<li><input type="checkbox" disabled> todo</li>\n<li><input type="checkbox" checked disabled> done</li>\n</ul>'),
    ("blockquote", "> hi\n> there", "<blockquote>\n<p>hi\nthere</p>\n</blockquote>"),
    ("quote with list", "> - a", "<blockquote>\n<ul>\n<li>a</li>\n</ul>\n</blockquote>"),
    ("code block", "```python\nx = 1 < 2\n```", '<pre><code class="language-python">x = 1 &lt; 2</code></pre>'),
    ("unterminated fence", "```\ncode", "<pre><code>code</code></pre>"),
    ("rule", "---", "<hr>"),
    ("table", "| a | b |\n|:--|--:|\n| 1 | 2 |",
     '<table>\n<thead>\n<tr><th style="text-align:left">a</th><th style="text-align:right">b</th></tr>\n</thead>\n'
     '<tbody>\n<tr><td style="text-align:left">1</td><td style="text-align:right">2</td></tr>\n</tbody>\n</table>'),
    ("hard break", "a  \nb", "<p>a<br>\nb</p>"),
    ("strikethrough", "~~x~~", "<p><del>x</del></p>"),
    ("escaped stars", "\\*not italic\\*", "<p>*not italic*</p>"),
    ("snake case kept", "snake_case_word", "<p>snake_case_word</p>"),
    ("underscore italic", "_it_", "<p><em>it</em></p>"),
    ("several blocks", "# T\n\ntext\n\n- x", '<h1 id="t">T</h1>\n<p>text</p>\n<ul>\n<li>x</li>\n</ul>'),
    ("list interrupts text", "Intro\n- a\n- b", "<p>Intro</p>\n<ul>\n<li>a</li>\n<li>b</li>\n</ul>"),
    ("duplicate headings", "# A\n# A", '<h1 id="a">A</h1>\n<h1 id="a-1">A</h1>'),
]

SAMPLE = """# Project Notes

Some *intro* text with a [link](http://example.com) and `code`.

## Tasks

- [x] write parser
- [ ] write tests
  - unit tests
  - fuzz tests

## Data

| name | score |
|:-----|------:|
| ann  | 10    |
| bob  | 7     |

> Remember: **tests first**.

```python
print("hi" if 1 < 2 else "no")
```
"""

FRAGMENTS = [
    "# h", "## h", "text *a* **b**", "- item", "  - sub", "1. one", "> q", "```", "code <b>",
    "", "---", "| a | b |", "|--|--|", "| 1 | 2 |", "<script>x</script>", "`c`", "[l](u)",
    "![i](p.png)", "- [ ] t", "~~s~~", "a  ", "***", "\t- tab",
]

if __name__ == "__main__":
    results = []
    for name, md, expected in TESTS:
        actual = convert(md)
        ok = actual == expected
        results.append(ok)
        print(f"{name:<22}{'ok' if ok else 'MISMATCH'}")
        if not ok:
            print("  expected:", repr(expected))
            print("  actual  :", repr(actual))

    print()
    heads = toc("# A\n## B\n## B")
    print("Table of contents      :", heads)
    results.append(heads == [(1, "A", "a"), (2, "B", "b"), (2, "B", "b-1")])
    print("Contents are correct   :", results[-1])
    page = document("# X\n\ntext", "My <Page>")
    print("Page has nav and title :", "<nav>" in page and "<title>My &lt;Page&gt;</title>" in page)
    results.append("<nav>" in page and "<title>My &lt;Page&gt;</title>" in page)
    print("Same input, same output:", convert(SAMPLE) == convert(SAMPLE))
    results.append(convert(SAMPLE) == convert(SAMPLE))

    rng = random.Random(4)
    no_crash = balanced = safe = clean = True
    pairs = ["ul", "ol", "li", "p", "blockquote", "table", "thead", "tbody", "tr", "pre"]
    for _ in range(1000):
        doc = "\n".join(rng.choice(FRAGMENTS) for _ in range(rng.randint(1, 15)))
        try:
            out = convert(doc)
        except Exception as e:
            no_crash = False
            print("Crashed on:", repr(doc), type(e).__name__, e)
            continue
        for tag in pairs:
            if out.count(f"<{tag}>") != out.count(f"</{tag}>"):
                balanced = False
        if len(re.findall(r"<code[ >]", out)) != out.count("</code>"):
            balanced = False
        if out.count("<a ") != out.count("</a>"):
            balanced = False
        if "<script" in out:
            safe = False
        if "\x00" in out:
            clean = False
    print()
    print("1000 random documents")
    print("  Never crashes            :", no_crash)
    print("  Tags always balanced     :", balanced)
    print("  Raw script never leaks   :", safe)
    print("  No placeholder leaks     :", clean)
    results += [no_crash, balanced, safe, clean]

    print()
    print("Sample document")
    print(convert(SAMPLE))
    print()
    print("Passed         :", sum(results), "of", len(results))
    print("All correct    :", all(results))
