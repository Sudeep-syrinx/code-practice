import math
import operator


class LispError(Exception):
    pass


class Env(dict):
    def __init__(self, params=(), args=(), outer=None):
        super().__init__(zip(params, args))
        self.outer = outer

    def find(self, name):
        if name in self:
            return self
        if self.outer is not None:
            return self.outer.find(name)
        raise LispError(f"Undefined symbol {name}")


class Lambda:
    def __init__(self, params, body, env):
        self.params = params
        self.body = body
        self.env = env

    def __call__(self, *args):
        if len(args) != len(self.params):
            raise LispError(
                f"Wrong number of arguments: expected {len(self.params)}, got {len(args)}"
            )
        return evaluate(self.body, Env(self.params, args, self.env))


def tokenize(text):
    return text.replace("(", " ( ").replace(")", " ) ").split()


def atom(token):
    try:
        return int(token)
    except ValueError:
        pass
    try:
        return float(token)
    except ValueError:
        return token


def parse(tokens):
    if not tokens:
        raise LispError("Unexpected end of input")
    token = tokens.pop(0)
    if token == "(":
        items = []
        while tokens and tokens[0] != ")":
            items.append(parse(tokens))
        if not tokens:
            raise LispError("Missing closing parenthesis")
        tokens.pop(0)
        return items
    if token == ")":
        raise LispError("Unexpected closing parenthesis")
    return atom(token)


def standard_env():
    env = Env()
    env.update({
        "+": lambda *a: sum(a),
        "-": lambda a, *b: -a if not b else a - sum(b),
        "*": lambda *a: math.prod(a),
        "/": lambda a, b: a / b if a % b else a // b,
        "mod": operator.mod,
        "<": operator.lt,
        ">": operator.gt,
        "<=": operator.le,
        ">=": operator.ge,
        "=": operator.eq,
        "abs": abs,
        "min": min,
        "max": max,
        "sqrt": math.sqrt,
        "not": lambda x: not x,
        "list": lambda *a: list(a),
        "car": lambda l: l[0],
        "cdr": lambda l: l[1:],
        "cons": lambda x, l: [x] + l,
        "null?": lambda l: l == [],
        "length": len,
        "append": lambda a, b: a + b,
    })
    return env


def evaluate(x, env):
    if isinstance(x, str):
        return env.find(x)[x]
    if not isinstance(x, list):
        return x
    if not x:
        return []
    head = x[0]
    if head == "quote":
        return x[1]
    if head == "if":
        _, test, then, other = x
        return evaluate(then if evaluate(test, env) else other, env)
    if head == "define":
        target = x[1]
        if isinstance(target, list):
            env[target[0]] = Lambda(target[1:], x[2], env)
        else:
            env[target] = evaluate(x[2], env)
        return None
    if head == "set!":
        env.find(x[1])[x[1]] = evaluate(x[2], env)
        return None
    if head == "lambda":
        return Lambda(x[1], x[2], env)
    if head == "begin":
        result = None
        for expr in x[1:]:
            result = evaluate(expr, env)
        return result
    func = evaluate(head, env)
    args = [evaluate(a, env) for a in x[1:]]
    return func(*args)


def show(value):
    if value is True:
        return "#t"
    if value is False:
        return "#f"
    if value is None:
        return "nil"
    if isinstance(value, list):
        return "(" + " ".join(show(v) for v in value) + ")"
    if isinstance(value, Lambda):
        return "<lambda>"
    return str(value)


def run(source, env):
    tokens = tokenize(source)
    result = None
    while tokens:
        result = evaluate(parse(tokens), env)
    return result


PRELUDE = """
(define (map f l) (if (null? l) (quote ()) (cons (f (car l)) (map f (cdr l)))))
(define (filter p l) (if (null? l) (quote ()) (if (p (car l)) (cons (car l) (filter p (cdr l))) (filter p (cdr l)))))
(define (reduce f acc l) (if (null? l) acc (reduce f (f acc (car l)) (cdr l))))
(define (range a b) (if (>= a b) (quote ()) (cons a (range (+ a 1) b))))
"""


def make_env():
    env = standard_env()
    run(PRELUDE, env)
    return env


def safe_run(source, env):
    try:
        return show(run(source, env))
    except LispError as e:
        return f"LispError: {e}"
    except ZeroDivisionError:
        return "LispError: division by zero"
    except RecursionError:
        return "LispError: recursion too deep"
    except (IndexError, TypeError, ValueError) as e:
        return f"LispError: bad expression ({type(e).__name__})"


TESTS = [
    ("arithmetic", "(+ 1 2 (* 3 4))", "15"),
    ("subtraction", "(- 10 3 2)", "5"),
    ("negate", "(- 7)", "-7"),
    ("division", "(/ 10 4)", "2.5"),
    ("exact division", "(/ 12 4)", "3"),
    ("define", "(define x 10) (* x x)", "100"),
    ("begin", "(begin (define y 3) (* y y))", "9"),
    ("if true", "(if (> 3 2) (quote yes) (quote no))", "yes"),
    ("if false", "(if (> 2 3) (quote yes) (quote no))", "no"),
    ("factorial", "(define (fact n) (if (<= n 1) 1 (* n (fact (- n 1))))) (fact 10)", "3628800"),
    ("fibonacci", "(define (fib n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2))))) (fib 15)", "610"),
    ("gcd", "(define (gcd a b) (if (= b 0) a (gcd b (mod a b)))) (gcd 1071 462)", "21"),
    ("lambda", "((lambda (a b) (+ a b)) 3 4)", "7"),
    ("closure", "(define (adder n) (lambda (x) (+ x n))) (define add5 (adder 5)) (add5 10)", "15"),
    ("compose", "(define (compose f g) (lambda (x) (f (g x)))) ((compose abs (lambda (x) (- x 10))) 3)", "7"),
    ("set!", "(define c 0) (set! c (+ c 5)) (set! c (* c 2)) c", "10"),
    ("map", "(map (lambda (x) (* x x)) (list 1 2 3 4))", "(1 4 9 16)"),
    ("filter", "(filter (lambda (x) (> x 2)) (list 1 2 3 4))", "(3 4)"),
    ("reduce", "(reduce + 0 (list 1 2 3 4 5))", "15"),
    ("range", "(range 0 5)", "(0 1 2 3 4)"),
    ("sum of squares", "(reduce + 0 (map (lambda (x) (* x x)) (range 1 11)))", "385"),
    ("quote", "(quote (a b c))", "(a b c)"),
    ("length", "(length (list 1 2 3))", "3"),
    ("cons", "(cons 1 (list 2 3))", "(1 2 3)"),
    ("sqrt", "(sqrt 144)", "12.0"),
    ("recursion 100", "(define (sum n) (if (= n 0) 0 (+ n (sum (- n 1))))) (sum 100)", "5050"),
    ("equality", "(= 4 4)", "#t"),
    ("not", "(not (= 1 2))", "#t"),
    ("empty list", "(quote ())", "()"),
]

ERRORS = [
    ("unknown symbol", "(undefined-fn 1)", "LispError: Undefined symbol undefined-fn"),
    ("divide by zero", "(/ 1 0)", "LispError: division by zero"),
    ("missing paren", "(+ 1", "LispError: Missing closing parenthesis"),
    ("extra paren", ")", "LispError: Unexpected closing parenthesis"),
    ("car of empty", "(car (quote ()))", "LispError: bad expression (IndexError)"),
    ("add a symbol", "(+ 1 (quote a))", "LispError: bad expression (TypeError)"),
    ("wrong arity", "((lambda (x) x))", "LispError: Wrong number of arguments: expected 1, got 0"),
    ("runaway", "(define (loop n) (if (= n 0) 0 (loop (- n 1)))) (loop 100000)", "LispError: recursion too deep"),
]


if __name__ == "__main__":
    passed = 0
    cases = TESTS + ERRORS
    for name, source, expected in cases:
        actual = safe_run(source, make_env())
        ok = actual == expected
        passed += ok
        verdict = "ok" if ok else f"MISMATCH expected {expected}"
        print(f"{name:<16}{actual:<56}{verdict}")
    print()
    print("Passed         :", passed, "of", len(cases))
    print("All correct    :", passed == len(cases))
