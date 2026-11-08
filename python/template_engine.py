import html
import random
import re
import time

TOKEN = re.compile(r"(\{\{.*?\}\}|\{%.*?%\}|\{#.*?#\})", re.S)
NAME = re.compile(r"[A-Za-z_]\w*")
FOR_TAG = re.compile(r"for\s+([A-Za-z_]\w*)\s+in\s+(.+)", re.S)
OPS = ("==", "!=", ">=", "<=", ">", "<")


class TemplateError(Exception):
    pass


def tokenize(source):
    out = []
    for i, part in enumerate(TOKEN.split(source)):
        if i % 2 == 0:
            if part:
                out.append(("text", part))
        elif part.startswith("{{"):
            out.append(("var", part[2:-2].strip()))
        elif part.startswith("{%"):
            out.append(("tag", part[2:-2].strip()))
        else:
            out.append(("comment", part))
    return out


def parse_block(tokens, pos, stops):
    nodes = []
    while pos < len(tokens):
        kind, val = tokens[pos]
        if kind == "text":
            nodes.append(("text", val))
            pos += 1
            continue
        if kind == "comment":
            pos += 1
            continue
        if kind == "var":
            if not val:
                raise TemplateError("empty expression")
            nodes.append(("var", val))
            pos += 1
            continue
        word = val.split(None, 1)[0] if val else ""
        if word in stops:
            return nodes, pos
        if word == "if":
            cond = val[2:].strip()
            if not cond:
                raise TemplateError("empty if condition")
            branches = []
            body, pos = parse_block(tokens, pos + 1, ("elif", "else", "endif"))
            branches.append((cond, body))
            while True:
                tag = tokens[pos][1]
                w = tag.split(None, 1)[0]
                if w == "elif":
                    c = tag[4:].strip()
                    if not c:
                        raise TemplateError("empty elif condition")
                    body, pos = parse_block(tokens, pos + 1, ("elif", "else", "endif"))
                    branches.append((c, body))
                elif w == "else":
                    body, pos = parse_block(tokens, pos + 1, ("endif",))
                    branches.append((None, body))
                else:
                    pos += 1
                    break
            nodes.append(("if", branches))
            continue
        if word == "for":
            m = FOR_TAG.fullmatch(val)
            if not m:
                raise TemplateError("bad for tag: " + val)
            body, pos = parse_block(tokens, pos + 1, ("else", "endfor"))
            empty = []
            if tokens[pos][1].split(None, 1)[0] == "else":
                empty, pos = parse_block(tokens, pos + 1, ("endfor",))
            pos += 1
            nodes.append(("for", m.group(1), m.group(2).strip(), body, empty))
            continue
        raise TemplateError("unknown tag: " + (word or "(empty)"))
    if stops:
        raise TemplateError("unclosed block, expected " + "/".join(stops))
    return nodes, pos


def split_top(text, sep):
    parts, buf, quote = [], [], None
    for ch in text:
        if quote:
            buf.append(ch)
            if ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
            buf.append(ch)
        elif ch == sep:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    parts.append("".join(buf))
    return parts


def split_kw(text, kw):
    parts, buf, quote, i = [], "", None, 0
    token = " " + kw + " "
    while i < len(text):
        ch = text[i]
        if quote:
            buf += ch
            if ch == quote:
                quote = None
            i += 1
        elif ch in "\"'":
            quote = ch
            buf += ch
            i += 1
        elif text.startswith(token, i):
            parts.append(buf)
            buf = ""
            i += len(token)
        else:
            buf += ch
            i += 1
    parts.append(buf)
    return parts


def find_op(text):
    quote = None
    for i, ch in enumerate(text):
        if quote:
            if ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
        else:
            for op in OPS:
                if text.startswith(op, i):
                    return i, op
    return None


def resolve(expr, ctx):
    expr = expr.strip()
    if len(expr) >= 2 and expr[0] == expr[-1] and expr[0] in "\"'":
        return expr[1:-1]
    if re.fullmatch(r"-?\d+", expr):
        return int(expr)
    if re.fullmatch(r"-?\d+\.\d+", expr):
        return float(expr)
    low = expr.lower()
    if low == "true":
        return True
    if low == "false":
        return False
    if low == "none":
        return None
    parts = expr.split(".")
    if not NAME.fullmatch(parts[0]):
        raise TemplateError("bad expression: " + expr)
    cur = ctx.get(parts[0])
    for p in parts[1:]:
        if cur is None:
            return None
        if isinstance(cur, dict):
            cur = cur.get(p)
        elif isinstance(cur, (list, tuple)):
            cur = cur[int(p)] if p.isdigit() and int(p) < len(cur) else None
        elif p.startswith("_"):
            return None
        else:
            cur = getattr(cur, p, None)
            if callable(cur):
                cur = None
    return cur


def eval_atom(text, ctx):
    text = text.strip()
    if not text:
        raise TemplateError("empty condition")
    if text.startswith("not "):
        return not eval_atom(text[4:], ctx)
    found = find_op(text)
    if found is None:
        return bool(resolve(text, ctx))
    i, op = found
    left = resolve(text[:i], ctx)
    right = resolve(text[i + len(op):], ctx)
    if op == "==":
        return left == right
    if op == "!=":
        return left != right
    try:
        if op == ">":
            return left > right
        if op == "<":
            return left < right
        if op == ">=":
            return left >= right
        return left <= right
    except TypeError:
        return False


def eval_cond(expr, ctx):
    return any(all(eval_atom(a, ctx) for a in split_kw(group, "and")) for group in split_kw(expr, "or"))


def f_length(v, a):
    try:
        return len(v)
    except TypeError:
        return len(str(v))


def f_truncate(v, a):
    n = int(a) if a is not None else 20
    s = str(v)
    return s[: max(n - 3, 0)] + "..." if len(s) > n else s


FILTERS = {
    "upper": lambda v, a: str(v).upper(),
    "lower": lambda v, a: str(v).lower(),
    "title": lambda v, a: str(v).title(),
    "length": f_length,
    "default": lambda v, a: a if (not v and v != 0) else v,
    "join": lambda v, a: (", " if a is None else str(a)).join(str(x) for x in (v or [])),
    "truncate": f_truncate,
    "first": lambda v, a: v[0] if isinstance(v, (list, tuple, str)) and v else None,
    "last": lambda v, a: v[-1] if isinstance(v, (list, tuple, str)) and v else None,
}


def render_var(expr, ctx):
    parts = split_top(expr, "|")
    value = resolve(parts[0], ctx)
    safe = False
    for f in parts[1:]:
        name, _, arg = f.strip().partition(":")
        name = name.strip()
        if name == "safe":
            safe = True
            continue
        if name not in FILTERS:
            raise TemplateError("unknown filter: " + name)
        value = FILTERS[name](value, resolve(arg, ctx) if arg.strip() else None)
    if value is None:
        return ""
    text = str(value)
    return text if safe else html.escape(text)


def render_nodes(nodes, ctx, out):
    for node in nodes:
        k = node[0]
        if k == "text":
            out.append(node[1])
        elif k == "var":
            out.append(render_var(node[1], ctx))
        elif k == "if":
            for cond, body in node[1]:
                if cond is None or eval_cond(cond, ctx):
                    render_nodes(body, ctx, out)
                    break
        else:
            _, name, expr, body, empty = node
            seq = resolve(expr, ctx)
            if seq is None or isinstance(seq, (str, bytes)):
                items = []
            else:
                try:
                    items = list(seq)
                except TypeError:
                    items = []
            if not items:
                render_nodes(empty, ctx, out)
                continue
            total = len(items)
            for i, item in enumerate(items):
                scope = dict(ctx)
                scope[name] = item
                scope["loop"] = {"index": i + 1, "index0": i, "first": i == 0,
                                 "last": i == total - 1, "length": total}
                render_nodes(body, scope, out)


class Template:
    def __init__(self, source):
        self.nodes, _ = parse_block(tokenize(source), 0, ())

    def render(self, ctx=None):
        out = []
        render_nodes(self.nodes, dict(ctx or {}), out)
        return "".join(out)


def render(source, ctx=None):
    return Template(source).render(ctx)


CTX = {"v": "<x>", "n": 3, "xs": [1, 2, 3], "flag": True, "off": False}
CONDS = [("flag", True), ("off", False), ("n > 2", True), ("n < 2", False), ("not off", True),
         ("flag and off", False), ("off or n == 3", True), ('v == "<x>"', True)]


def gen(rng, depth):
    kind = rng.choice(["text", "var", "if", "for"]) if depth > 0 else rng.choice(["text", "var"])
    if kind == "text":
        w = rng.choice(["a", "bc", "d e", "-"])
        return w, w
    if kind == "var":
        return "{{ v }}", "&lt;x&gt;"
    if kind == "if":
        cond, truth = rng.choice(CONDS)
        at, ae = seq(rng, depth - 1)
        bt, be = seq(rng, depth - 1)
        return "{% if " + cond + " %}" + at + "{% else %}" + bt + "{% endif %}", (ae if truth else be)
    bt, be = seq(rng, depth - 1)
    return "{% for i in xs %}" + bt + "{% endfor %}", be * 3


def seq(rng, depth):
    parts = [gen(rng, depth) for _ in range(rng.randint(1, 3))]
    return "".join(p[0] for p in parts), "".join(p[1] for p in parts)


def raises(source, ctx=None):
    try:
        Template(source).render(ctx or {})
    except TemplateError:
        return True
    except Exception:
        return False
    return False


FRAGMENTS = ["text", "{{ x }}", "{{ x|upper }}", "{% if x %}", "{% else %}", "{% endif %}",
             "{% for i in xs %}", "{% endfor %}", "{{ i }}", "{# c #}", "{% elif y %}",
             "{{ ", "{%", "}}", "{% foo %}", "{{ x|nope }}"]

if __name__ == "__main__":
    results = []

    def check(name, actual, expected):
        ok = actual == expected
        results.append(ok)
        print(f"{name:<24}{actual!r:<34}{'ok' if ok else 'MISMATCH expected ' + repr(expected)}")

    cases = [
        ("plain variable", "Hello {{ name }}!", {"name": "Sam"}, "Hello Sam!"),
        ("html escaped", "{{ x }}", {"x": "<b>&</b>"}, "&lt;b&gt;&amp;&lt;/b&gt;"),
        ("safe filter", "{{ x|safe }}", {"x": "<b>"}, "<b>"),
        ("dotted path", "{{ user.name }} {{ user.tags.1 }}", {"user": {"name": "Ann", "tags": ["a", "b"]}}, "Ann b"),
        ("missing values", "[{{ nope }}][{{ a.b.c }}]", {}, "[][]"),
        ("text filters", "{{ s|upper }} {{ s|title }} {{ s|length }}", {"s": "hello world"}, "HELLO WORLD Hello World 11"),
        ("default filter", '{{ x|default:"n/a" }} {{ y|default:"n/a" }}', {"y": "set"}, "n/a set"),
        ("filter chain", '{{ items|join:" - "|upper }}', {"items": ["a", "b"]}, "A - B"),
        ("truncate", "{{ t|truncate:5 }}", {"t": "abcdefgh"}, "ab..."),
        ("if true", "{% if x %}yes{% else %}no{% endif %}", {"x": 1}, "yes"),
        ("if false", "{% if x %}yes{% else %}no{% endif %}", {"x": 0}, "no"),
        ("elif big", "{% if n > 5 %}big{% elif n > 2 %}mid{% else %}small{% endif %}", {"n": 7}, "big"),
        ("elif mid", "{% if n > 5 %}big{% elif n > 2 %}mid{% else %}small{% endif %}", {"n": 4}, "mid"),
        ("elif small", "{% if n > 5 %}big{% elif n > 2 %}mid{% else %}small{% endif %}", {"n": 1}, "small"),
        ("and not", "{% if a and not b %}ok{% endif %}", {"a": 1, "b": 0}, "ok"),
        ("or empty", "{% if a or b %}x{% endif %}", {}, ""),
        ("string compare", '{% if role == "admin" %}A{% else %}U{% endif %}', {"role": "admin"}, "A"),
        ("quoted keyword", '{% if s == "a and b" %}y{% endif %}', {"s": "a and b"}, "y"),
        ("empty list falsy", "{% if xs %}has{% else %}empty{% endif %}", {"xs": []}, "empty"),
        ("greater or equal", "{% if a >= 3 %}y{% endif %}", {"a": 3}, "y"),
        ("for loop", "{% for i in xs %}{{ i }},{% endfor %}", {"xs": [1, 2, 3]}, "1,2,3,"),
        ("loop variables", "{% for i in xs %}{{ loop.index }}:{{ i }}{% if not loop.last %}, {% endif %}{% endfor %}",
         {"xs": ["a", "b", "c"]}, "1:a, 2:b, 3:c"),
        ("for else", "{% for i in xs %}{{ i }}{% else %}none{% endfor %}", {"xs": []}, "none"),
        ("nested for", "{% for r in rows %}[{% for c in r %}{{ c }}{% endfor %}]{% endfor %}", {"rows": [[1, 2], [3]]}, "[12][3]"),
        ("loop scope ends", "{% for i in xs %}{% endfor %}[{{ i }}]", {"xs": [1]}, "[]"),
        ("dict rows", "{% for u in users %}{{ u.name }}={{ u.age }};{% endfor %}",
         {"users": [{"name": "A", "age": 3}, {"name": "B", "age": 4}]}, "A=3;B=4;"),
        ("comment removed", "a{# hidden #}b", {}, "ab"),
    ]
    for name, src, ctx, expected in cases:
        check(name, render(src, ctx), expected)

    print()
    errors = [
        ("unclosed if", "{% if x %}a"), ("stray endif", "{% endif %}"), ("unknown tag", "{% foo %}"),
        ("mismatched end", "{% if x %}a{% endfor %}"), ("bad for", "{% for in %}x{% endfor %}"),
        ("empty if", "{% if %}a{% endif %}"), ("unknown filter", "{{ x|nope }}"),
        ("bad expression", "{{ a b }}"), ("else after else", "{% if x %}a{% else %}b{% else %}c{% endif %}"),
    ]
    for name, src in errors:
        check(name, raises(src, {"x": 1}), True)

    rng = random.Random(11)
    tree_ok = True
    for _ in range(500):
        t, e = seq(rng, 3)
        if Template(t).render(CTX) != e:
            tree_ok = False
    clean = True
    for _ in range(1000):
        src = "".join(rng.choice(FRAGMENTS) for _ in range(rng.randint(1, 12)))
        try:
            a = Template(src).render({"x": "v", "y": 0, "xs": [1, 2]})
            b = Template(src).render({"x": "v", "y": 0, "xs": [1, 2]})
            if a != b:
                clean = False
        except TemplateError:
            pass
        except Exception as ex:
            clean = False
            print("Crashed on:", repr(src), type(ex).__name__, ex)
    print()
    print("500 random valid templates match reference :", tree_ok)
    print("1000 random broken templates, only TemplateError:", clean)
    results += [tree_ok, clean]

    page = Template("<ul>{% for r in rows %}<li>{{ r.id }}:{{ r.name|upper }}</li>{% endfor %}</ul>")
    rows = [{"id": i, "name": "n%d" % i} for i in range(5000)]
    start = time.perf_counter()
    out = page.render({"rows": rows})
    elapsed = time.perf_counter() - start
    print("5000 row render                          :", out.count("<li>") == 5000, f"({elapsed:.3f}s)")
    results.append(out.count("<li>") == 5000)

    print()
    print(render("Hi {{ user.name|title }}! {% if items %}You have {{ items|length }} items: {{ items|join }}.{% else %}Nothing here.{% endif %}",
                 {"user": {"name": "sudeep"}, "items": ["pen", "book", "lamp"]}))
    print()
    print("Passed         :", sum(results), "of", len(results))
    print("All correct    :", all(results))
