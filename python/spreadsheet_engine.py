import csv
import io
import math
import random
import re
import time


class SheetError(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


TOKEN = re.compile(
    r'\s*(?:(\d+\.?\d*)|([A-Za-z]+\d+:[A-Za-z]+\d+)|([A-Za-z]+\d+)|([A-Za-z_]+)|("[^"]*")|(<=|>=|<>|[-+*/^(),<>=]))'
)
NUMBER = re.compile(r"-?\d+(\.\d+)?")
REF_RE = re.compile(r"(?<![A-Za-z_0-9])([A-Za-z]{1,3})(\d+)(?![A-Za-z0-9_(])")
COMPARE = ("<", "<=", ">", ">=", "=", "<>")
AGGREGATES = {"SUM", "COUNT", "AVG", "MIN", "MAX"}
KNOWN = AGGREGATES | {"IF", "ABS", "SQRT", "LEN", "ROUND", "CONCAT"}


def col_to_num(col):
    n = 0
    for ch in col:
        n = n * 26 + ord(ch) - 64
    return n


def num_to_col(n):
    s = ""
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def split_ref(ref):
    m = re.fullmatch(r"([A-Z]+)(\d+)", ref)
    return col_to_num(m.group(1)), int(m.group(2))


def expand_range(rng):
    a, b = rng.split(":")
    c1, r1 = split_ref(a)
    c2, r2 = split_ref(b)
    c1, c2 = sorted((c1, c2))
    r1, r2 = sorted((r1, r2))
    if r1 < 1:
        raise SheetError("#REF!")
    if (c2 - c1 + 1) * (r2 - r1 + 1) > 10000:
        raise SheetError("#REF!")
    return [num_to_col(c) + str(r) for r in range(r1, r2 + 1) for c in range(c1, c2 + 1)]


def fmt(v):
    if isinstance(v, str):
        return v
    if v == 0:
        return "0"
    return f"{v:.10g}"


def tokenize(text):
    text = text.rstrip()
    pos = 0
    out = []
    while pos < len(text):
        m = TOKEN.match(text, pos)
        if not m:
            raise SheetError("#ERR!")
        pos = m.end()
        num, rng, ref, name, string, op = m.groups()
        if num is not None:
            out.append(("num", float(num)))
        elif rng:
            out.append(("range", rng.upper()))
        elif ref:
            out.append(("ref", ref.upper()))
        elif name:
            out.append(("name", name.upper()))
        elif string:
            out.append(("str", string[1:-1]))
        else:
            out.append(("op", op))
    return out


class Parser:
    def __init__(self, tokens):
        self.t = tokens
        self.i = 0

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else (None, None)

    def take(self):
        tok = self.peek()
        self.i += 1
        return tok

    def accept(self, op):
        if self.peek() == ("op", op):
            self.i += 1
            return True
        return False

    def parse(self):
        node = self.comparison()
        if self.i != len(self.t):
            raise SheetError("#ERR!")
        return node

    def comparison(self):
        left = self.additive()
        while self.peek()[0] == "op" and self.peek()[1] in COMPARE:
            op = self.take()[1]
            left = ("bin", op, left, self.additive())
        return left

    def additive(self):
        left = self.term()
        while self.peek() in (("op", "+"), ("op", "-")):
            op = self.take()[1]
            left = ("bin", op, left, self.term())
        return left

    def term(self):
        left = self.unary()
        while self.peek() in (("op", "*"), ("op", "/")):
            op = self.take()[1]
            left = ("bin", op, left, self.unary())
        return left

    def unary(self):
        if self.accept("-"):
            return ("neg", self.unary())
        if self.accept("+"):
            return self.unary()
        return self.power()

    def power(self):
        base = self.primary()
        if self.accept("^"):
            return ("bin", "^", base, self.unary())
        return base

    def primary(self):
        kind, val = self.take()
        if kind in ("num", "str", "ref", "range"):
            return (kind, val)
        if kind == "name":
            if not self.accept("("):
                raise SheetError("#NAME?")
            args = []
            if not self.accept(")"):
                args.append(self.comparison())
                while self.accept(","):
                    args.append(self.comparison())
                if not self.accept(")"):
                    raise SheetError("#ERR!")
            return ("call", val, args)
        if (kind, val) == ("op", "("):
            node = self.comparison()
            if not self.accept(")"):
                raise SheetError("#ERR!")
            return node
        raise SheetError("#ERR!")


def refs_in(node):
    kind = node[0]
    if kind == "ref":
        return {node[1]}
    if kind == "range":
        return set(expand_range(node[1]))
    if kind == "neg":
        return refs_in(node[1])
    if kind == "bin":
        return refs_in(node[2]) | refs_in(node[3])
    if kind == "call":
        found = set()
        for a in node[2]:
            found |= refs_in(a)
        return found
    return set()


def shift_formula(text, dcol, drow):
    def repl(m):
        c = col_to_num(m.group(1).upper()) + dcol
        r = int(m.group(2)) + drow
        if c < 1 or r < 1:
            return "#REF!"
        return num_to_col(c) + str(r)

    return REF_RE.sub(repl, text)


class Sheet:
    def __init__(self):
        self.raw = {}
        self.asts = {}
        self.cache = {}

    def set(self, ref, text):
        ref = ref.upper()
        if not re.fullmatch(r"[A-Z]+[1-9]\d*", ref):
            raise SheetError("#REF!")
        text = "" if text is None else str(text).strip()
        if text == "":
            self.raw.pop(ref, None)
        else:
            self.raw[ref] = text
        self.asts.pop(ref, None)
        self.cache.clear()

    def _ast(self, ref):
        if ref not in self.asts:
            self.asts[ref] = Parser(tokenize(self.raw[ref][1:])).parse()
        return self.asts[ref]

    @staticmethod
    def _literal(raw):
        if NUMBER.fullmatch(raw):
            v = float(raw)
            if not math.isinf(v):
                return v
        return raw

    @staticmethod
    def _number(v):
        if isinstance(v, float):
            return v
        raise SheetError("#VALUE!")

    @staticmethod
    def _arity(args, low, high=None):
        high = low if high is None else high
        if not low <= len(args) <= high:
            raise SheetError("#ERR!")

    def _eval_cell(self, ref, stack):
        if ref in self.cache:
            kind, v = self.cache[ref]
            if kind == "err":
                raise SheetError(v)
            return v
        if ref in stack:
            raise SheetError("#CYCLE!")
        raw = self.raw[ref]
        try:
            if raw.startswith("="):
                v = self._eval(self._ast(ref), stack + (ref,))
            else:
                v = self._literal(raw)
        except SheetError as e:
            self.cache[ref] = ("err", e.code)
            raise
        self.cache[ref] = ("ok", v)
        return v

    def _ref_value(self, ref, stack):
        if split_ref(ref)[1] < 1:
            raise SheetError("#REF!")
        if ref not in self.raw:
            return 0.0
        return self._eval_cell(ref, stack)

    def _values(self, args, stack):
        out = []
        for a in args:
            if a[0] == "range":
                for ref in expand_range(a[1]):
                    if ref in self.raw:
                        out.append(self._eval_cell(ref, stack))
            else:
                out.append(self._eval(a, stack))
        return out

    def _eval(self, node, stack):
        kind = node[0]
        if kind in ("num", "str"):
            return node[1]
        if kind == "ref":
            return self._ref_value(node[1], stack)
        if kind == "range":
            raise SheetError("#VALUE!")
        if kind == "neg":
            return -self._number(self._eval(node[1], stack))
        if kind == "bin":
            a = self._eval(node[2], stack)
            b = self._eval(node[3], stack)
            return self._binary(node[1], a, b)
        return self._call(node[1], node[2], stack)

    def _binary(self, op, a, b):
        if op in ("=", "<>"):
            return float((a == b) if op == "=" else (a != b))
        if op in ("<", "<=", ">", ">="):
            if isinstance(a, str) != isinstance(b, str):
                raise SheetError("#VALUE!")
            return float({"<": a < b, "<=": a <= b, ">": a > b, ">=": a >= b}[op])
        x, y = self._number(a), self._number(b)
        if op == "+":
            r = x + y
        elif op == "-":
            r = x - y
        elif op == "*":
            r = x * y
        elif op == "/":
            if y == 0:
                raise SheetError("#DIV/0!")
            r = x / y
        else:
            r = self._power(x, y)
        if math.isinf(r) or math.isnan(r):
            raise SheetError("#NUM!")
        return r

    @staticmethod
    def _power(x, y):
        try:
            r = x ** y
        except ZeroDivisionError:
            raise SheetError("#DIV/0!")
        except OverflowError:
            raise SheetError("#NUM!")
        if isinstance(r, complex):
            raise SheetError("#NUM!")
        return float(r)

    def _call(self, name, args, stack):
        if name not in KNOWN:
            raise SheetError("#NAME?")
        if name == "IF":
            self._arity(args, 2, 3)
            if self._number(self._eval(args[0], stack)) != 0:
                return self._eval(args[1], stack)
            return self._eval(args[2], stack) if len(args) == 3 else 0.0
        if name in ("ABS", "SQRT"):
            self._arity(args, 1)
            x = self._number(self._eval(args[0], stack))
            if name == "ABS":
                return abs(x)
            if x < 0:
                raise SheetError("#NUM!")
            return math.sqrt(x)
        if name == "LEN":
            self._arity(args, 1)
            return float(len(fmt(self._eval(args[0], stack))))
        if name == "ROUND":
            self._arity(args, 1, 2)
            x = self._number(self._eval(args[0], stack))
            digits = 0
            if len(args) == 2:
                digits = int(self._number(self._eval(args[1], stack)))
            if abs(digits) > 15:
                raise SheetError("#NUM!")
            factor = 10.0 ** digits
            try:
                rounded = math.floor(abs(x) * factor + 0.5) / factor
            except OverflowError:
                raise SheetError("#NUM!")
            return rounded if x >= 0 else -rounded
        values = self._values(args, stack)
        if name == "CONCAT":
            return "".join(fmt(v) for v in values)
        nums = [v for v in values if isinstance(v, float)]
        if name == "SUM":
            return float(math.fsum(nums))
        if name == "COUNT":
            return float(len(nums))
        if name == "AVG":
            if not nums:
                raise SheetError("#DIV/0!")
            return math.fsum(nums) / len(nums)
        if name == "MIN":
            return min(nums) if nums else 0.0
        return max(nums) if nums else 0.0

    def deps(self, ref):
        raw = self.raw.get(ref)
        if raw is None or not raw.startswith("="):
            return set()
        try:
            return refs_in(self._ast(ref))
        except SheetError:
            return set()

    def _warm(self, ref):
        seen = set()
        stack = [(ref, False)]
        while stack:
            cell, expanded = stack.pop()
            if cell not in self.raw or cell in self.cache:
                continue
            if expanded:
                try:
                    self._eval_cell(cell, ())
                except SheetError:
                    pass
                continue
            if cell in seen:
                continue
            seen.add(cell)
            stack.append((cell, True))
            for d in self.deps(cell):
                stack.append((d, False))

    def get_value(self, ref):
        ref = ref.upper()
        try:
            self._warm(ref)
            return self._ref_value(ref, ())
        except SheetError as e:
            return e.code
        except RecursionError:
            return "#ERR!"

    def get(self, ref):
        ref = ref.upper()
        if ref not in self.raw:
            return ""
        return fmt(self.get_value(ref))

    def recalc_order(self):
        formulas = [r for r in self.raw if self.raw[r].startswith("=")]
        graph = {}
        for r in formulas:
            graph[r] = {d for d in self.deps(r) if d in self.raw and self.raw[d].startswith("=")}
        users = {}
        indegree = {}
        for r in formulas:
            indegree[r] = len(graph[r])
            for d in graph[r]:
                users.setdefault(d, []).append(r)
        ready = sorted(r for r in formulas if indegree[r] == 0)
        order = []
        while ready:
            cell = ready.pop(0)
            order.append(cell)
            for u in users.get(cell, []):
                indegree[u] -= 1
                if indegree[u] == 0:
                    ready.append(u)
                    ready.sort()
        blocked = sorted(set(formulas) - set(order))
        return order, blocked

    def dependents(self, ref):
        ref = ref.upper()
        users = {}
        for r in self.raw:
            for d in self.deps(r):
                users.setdefault(d, set()).add(r)
        seen = set()
        stack = [ref]
        while stack:
            for u in users.get(stack.pop(), ()):
                if u not in seen:
                    seen.add(u)
                    stack.append(u)
        return seen

    def fill_down(self, ref, count):
        ref = ref.upper()
        col, row = split_ref(ref)
        text = self.raw[ref]
        for k in range(1, count + 1):
            target = num_to_col(col) + str(row + k)
            self.set(target, shift_formula(text, 0, k) if text.startswith("=") else text)

    def render(self, cols, rows, width=10):
        lines = ["    " + "".join(f"{num_to_col(c):>{width}}" for c in range(1, cols + 1))]
        for r in range(1, rows + 1):
            cells = [self.get(num_to_col(c) + str(r)) for c in range(1, cols + 1)]
            lines.append(f"{r:>3} " + "".join(f"{v:>{width}}" for v in cells))
        return "\n".join(lines)

    def to_csv(self):
        if not self.raw:
            return ""
        max_c = max(split_ref(r)[0] for r in self.raw)
        max_r = max(split_ref(r)[1] for r in self.raw)
        buf = io.StringIO()
        writer = csv.writer(buf, lineterminator="\n")
        for r in range(1, max_r + 1):
            writer.writerow([self.raw.get(num_to_col(c) + str(r), "") for c in range(1, max_c + 1)])
        return buf.getvalue()


def load_csv(text):
    sheet = Sheet()
    for r, row in enumerate(csv.reader(io.StringIO(text)), start=1):
        for c, cell in enumerate(row, start=1):
            if cell.strip():
                sheet.set(num_to_col(c) + str(r), cell)
    return sheet


def calc(formula, setup=()):
    sheet = Sheet()
    for ref, text in setup:
        sheet.set(ref, text)
    sheet.set("Z1", formula)
    return sheet.get("Z1")


def build_spec(rng, n):
    spec = []
    for i in range(1, n + 1):
        if i <= 2 or rng.random() < 0.25:
            spec.append(("lit", rng.randint(-50, 50)))
        else:
            spec.append((rng.choice(["+", "-", "MAX", "MIN"]), rng.randint(1, i - 1), rng.randint(1, i - 1)))
    return spec


def formula_text(entry):
    if entry[0] == "lit":
        return str(entry[1])
    op, j, k = entry
    if op in ("+", "-"):
        return f"=A{j}{op}A{k}"
    return f"={op}(A{j},A{k})"


def reference(spec):
    vals = []
    for entry in spec:
        if entry[0] == "lit":
            vals.append(float(entry[1]))
        else:
            op, j, k = entry
            a, b = vals[j - 1], vals[k - 1]
            vals.append({"+": a + b, "-": a - b, "MAX": max(a, b), "MIN": min(a, b)}[op])
    return vals


if __name__ == "__main__":
    results = []

    def check(name, actual, expected):
        ok = actual == expected
        results.append(ok)
        print(f"{name:<26}{actual!r:<22}{'ok' if ok else 'MISMATCH expected ' + repr(expected)}")

    s = Sheet()
    for ref, text in [("A1", "10"), ("A2", "20"), ("A3", "30"), ("B1", "=SUM(A1:A3)"),
                      ("B2", "=AVG(A1:A3)"), ("B3", "=B1*2+1"), ("C1", "hello"),
                      ("C2", '=IF(A1>5,"big","small")')]:
        s.set(ref, text)
    print(s.render(3, 3))
    print()
    check("sum range", s.get("B1"), "60")
    check("average", s.get("B2"), "20")
    check("chained formula", s.get("B3"), "121")
    check("text cell", s.get("C1"), "hello")
    check("if with strings", s.get("C2"), "big")
    check("empty cell", s.get("Z9"), "")
    s.set("A1", "100")
    check("recalc after edit", s.get("B3"), "301")

    print()
    cases = [
        ("precedence", "=2+3*4^2/8-1", "7"), ("right assoc power", "=2^3^2", "512"),
        ("unary minus", "=-2^2", "-4"), ("parentheses", "=(1+2)*3", "9"),
        ("compare true", "=3>2", "1"), ("compare false", "=3<=2", "0"),
        ("not equal", "=1<>2", "1"), ("string equal", '="a"="a"', "1"),
        ("string order", '="apple"<"banana"', "1"), ("division", "=7/2", "3.5"),
        ("round half up", "=ROUND(2.5,0)", "3"), ("round negative", "=ROUND(-2.567,2)", "-2.57"),
        ("abs", "=ABS(-3.5)", "3.5"), ("sqrt", "=SQRT(144)", "12"),
        ("concat", '=CONCAT("a",1+1,"c")', "a2c"), ("len", '=LEN("hello")', "5"),
        ("nested if", '=IF(1,IF(0,"a","b"),"c")', "b"), ("lazy if", "=IF(1,5,1/0)", "5"),
    ]
    for name, formula, expected in cases:
        check(name, calc(formula), expected)

    print()
    data = [("A1", "1"), ("A2", "hello"), ("A3", "3")]
    check("count skips text", calc("=COUNT(A1:A3)", data), "2")
    check("sum skips text", calc("=SUM(A1:A3)", data), "4")
    check("max", calc("=MAX(A1:A3)", data), "3")
    check("min of empty range", calc("=MIN(F1:F3)"), "0")
    check("average of empty range", calc("=AVG(F1:F3)"), "#DIV/0!")

    print()
    errors = [
        ("divide by zero", "=1/0", "#DIV/0!"), ("unknown function", "=FOO(1)", "#NAME?"),
        ("dangling operator", "=1+", "#ERR!"), ("text arithmetic", '="x"+1', "#VALUE!"),
        ("sqrt negative", "=SQRT(-1)", "#NUM!"), ("row zero", "=A0", "#REF!"),
        ("unclosed paren", "=(1+2", "#ERR!"), ("two numbers", "=1 2", "#ERR!"),
        ("zero to negative", "=0^-1", "#DIV/0!"), ("root of negative", "=(-8)^0.5", "#NUM!"),
        ("overflow", "=2^2000", "#NUM!"), ("range as scalar", "=A1:A3+1", "#VALUE!"),
    ]
    for name, formula, expected in errors:
        check(name, calc(formula), expected)

    print()
    loop = Sheet()
    for ref, text in [("A1", "=B1"), ("B1", "=A1"), ("A2", "=A2+1"), ("C1", "=A1+1"), ("D1", "=5+1")]:
        loop.set(ref, text)
    check("two cell cycle", loop.get("A1"), "#CYCLE!")
    check("self reference", loop.get("A2"), "#CYCLE!")
    check("downstream of cycle", loop.get("C1"), "#CYCLE!")
    check("unrelated cell fine", loop.get("D1"), "6")
    order, blocked = loop.recalc_order()
    check("order skips cycles", order, ["D1"])
    check("blocked cells", blocked, ["A1", "A2", "B1", "C1"])

    prop = Sheet()
    prop.set("D1", "=1/0")
    prop.set("D2", "=D1+1")
    check("error propagates", prop.get("D2"), "#DIV/0!")
    prop.set("D1", "5")
    check("error clears when fixed", prop.get("D2"), "6")

    print()
    check("shift formula", shift_formula("=SUM(A1:A3)+B2", 1, 1), "=SUM(B2:B4)+C3")
    check("shift off the sheet", shift_formula("=A1", -1, 0), "=#REF!")
    fill = Sheet()
    for i in range(1, 6):
        fill.set(f"A{i}", str(i))
    fill.set("B1", "=A1*2")
    fill.fill_down("B1", 4)
    fill.set("C1", "=SUM(B1:B5)")
    check("fill down formula", fill.raw["B5"], "=A5*2")
    check("fill down total", fill.get("C1"), "30")

    back = load_csv(fill.to_csv())
    check("csv round trip", back.raw, fill.raw)
    check("csv recalculates", back.get("C1"), "30")
    quoted = Sheet()
    quoted.set("A1", "1")
    quoted.set("A2", "2")
    quoted.set("B1", "=SUM(A1,A2)")
    check("csv quotes commas", load_csv(quoted.to_csv()).get("B1"), "3")

    rng = random.Random(9)
    values_ok = order_ok = deps_ok = True
    for _ in range(200):
        spec = build_spec(rng, rng.randint(3, 30))
        sheet = Sheet()
        for i, entry in enumerate(spec, 1):
            sheet.set(f"A{i}", formula_text(entry))
        for _step in range(4):
            for i, want in enumerate(reference(spec), 1):
                got = sheet.get_value(f"A{i}")
                if not (isinstance(got, float) and math.isclose(got, want, abs_tol=1e-9)):
                    values_ok = False
            lits = [i for i, e in enumerate(spec) if e[0] == "lit"]
            pick = rng.choice(lits)
            spec[pick] = ("lit", rng.randint(-50, 50))
            sheet.set(f"A{pick + 1}", str(spec[pick][1]))
        order, blocked = sheet.recalc_order()
        position = {r: k for k, r in enumerate(order)}
        if blocked:
            order_ok = False
        for r in order:
            for d in sheet.deps(r):
                if sheet.raw[d].startswith("=") and position[d] > position[r]:
                    order_ok = False
        users = {}
        for idx, e in enumerate(spec, 1):
            if e[0] != "lit":
                for j in (e[1], e[2]):
                    users.setdefault(j, set()).add(idx)
        for idx in range(1, len(spec) + 1):
            closure, stack = set(), [idx]
            while stack:
                for u in users.get(stack.pop(), ()):
                    if u not in closure:
                        closure.add(u)
                        stack.append(u)
            if sheet.dependents(f"A{idx}") != {f"A{u}" for u in closure}:
                deps_ok = False

    print()
    print("200 random sheets, 4 edits each")
    print("  Values match plain Python        :", values_ok)
    print("  Recalc order respects dependencies:", order_ok)
    print("  Dependents match brute force     :", deps_ok)
    results += [values_ok, order_ok, deps_ok]

    big = Sheet()
    big.set("A1", "1")
    for i in range(2, 3001):
        big.set(f"A{i}", f"=A{i - 1}+1")
    start = time.perf_counter()
    last = big.get("A3000")
    elapsed = time.perf_counter() - start
    big.set("A1", "100")
    print()
    print("3000 cell chain, no recursion error :", last == "3000", f"({elapsed:.3f}s)")
    print("Chain after edit                    :", big.get("A3000") == "3099")
    results += [last == "3000", big.get("A3000") == "3099"]

    print()
    print("Passed         :", sum(results), "of", len(results))
    print("All correct    :", all(results))
