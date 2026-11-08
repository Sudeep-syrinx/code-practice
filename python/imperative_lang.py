import math
from collections import deque

class RuntimeError_(Exception):
    pass

class ReturnValue(Exception):
    def __init__(self, value):
        self.value = value

class Environment:
    def __init__(self, parent=None):
        self.parent = parent
        self.values = {}

    def define(self, name, value):
        self.values[name] = value

    def get(self, name):
        if name in self.values:
            return self.values[name]
        if self.parent:
            return self.parent.get(name)
        raise RuntimeError_(f"Undefined variable '{name}'")

    def set(self, name, value):
        if name in self.values:
            self.values[name] = value
            return
        if self.parent:
            self.parent.set(name, value)
            return
        raise RuntimeError_(f"Undefined variable '{name}'")

class Function:
    def __init__(self, name, params, body, closure):
        self.name = name
        self.params = params
        self.body = body
        self.closure = closure

    def call(self, interpreter, args):
        if len(args) != len(self.params):
            raise RuntimeError_(f"{self.name} expected {len(self.params)} args, got {len(args)}")
        env = Environment(self.closure)
        for p, a in zip(self.params, args):
            env.define(p, a)
        try:
            interpreter.exec_block(self.body, env)
        except ReturnValue as r:
            return r.value
        return None

class Interpreter:
    def __init__(self):
        self.global_env = Environment()
        self.env = self.global_env
        self._install_builtins()

    def _install_builtins(self):
        self.global_env.define("print", lambda *a: print(*a) or None)
        self.global_env.define("len", lambda x: len(x))
        self.global_env.define("str", lambda x: str(x))
        self.global_env.define("int", lambda x: int(x))
        self.global_env.define("float", lambda x: float(x))
        self.global_env.define("abs", abs)
        self.global_env.define("min", min)
        self.global_env.define("max", max)
        self.global_env.define("range", lambda *a: list(range(*a)))
        self.global_env.define("append", lambda lst, x: lst.append(x) or lst)
        self.global_env.define("push", lambda lst, x: lst.append(x) or lst)
        self.global_env.define("pop", lambda lst: lst.pop())
        self.global_env.define("sqrt", math.sqrt)

    def interpret(self, statements):
        for stmt in statements:
            self.exec(stmt)

    def exec(self, stmt):
        kind = stmt[0]
        if kind == "block":
            self.exec_block(stmt[1], Environment(self.env))
        elif kind == "var":
            _, name, expr = stmt
            self.env.define(name, self.eval(expr) if expr else None)
        elif kind == "assign":
            _, name, expr = stmt
            self.env.set(name, self.eval(expr))
        elif kind == "expr":
            self.eval(stmt[1])
        elif kind == "if":
            _, cond, then, else_ = stmt
            if self.eval(cond):
                self.exec(then)
            elif else_:
                self.exec(else_)
        elif kind == "while":
            _, cond, body = stmt
            while self.eval(cond):
                self.exec(body)
        elif kind == "func":
            _, name, params, body = stmt
            fn = Function(name, params, body, self.env)
            self.env.define(name, fn)
        elif kind == "return":
            raise ReturnValue(self.eval(stmt[1]) if stmt[1] else None)
        elif kind == "for":
            _, init, cond, step, body = stmt
            self.exec(init)
            while self.eval(cond):
                self.exec(body)
                self.exec(step)
        else:
            raise RuntimeError_(f"Unknown statement {kind}")

    def exec_block(self, statements, env):
        previous = self.env
        try:
            self.env = env
            for stmt in statements:
                self.exec(stmt)
        finally:
            self.env = previous

    def eval(self, expr):
        if expr is None:
            return None
        kind = expr[0]
        if kind == "literal":
            return expr[1]
        if kind == "var":
            return self.env.get(expr[1])
        if kind == "unary":
            op, right = expr[1], self.eval(expr[2])
            if op == "-": return -right
            if op == "!": return not right
        if kind == "binary":
            op, left, right = expr[1], self.eval(expr[2]), self.eval(expr[3])
            if op == "+": return left + right
            if op == "-": return left - right
            if op == "*": return left * right
            if op == "/": return left / right
            if op == "%": return left % right
            if op == "<": return left < right
            if op == ">": return left > right
            if op == "<=": return left <= right
            if op == ">=": return left >= right
            if op == "==": return left == right
            if op == "!=": return left != right
            if op == "&&": return left and right
            if op == "||": return left or right
        if kind == "call":
            callee = self.eval(expr[1])
            args = [self.eval(a) for a in expr[2]]
            if isinstance(callee, Function):
                return callee.call(self, args)
            if callable(callee):
                return callee(*args)
            raise RuntimeError_("Can only call functions")
        if kind == "list":
            return [self.eval(e) for e in expr[1]]
        if kind == "index":
            lst = self.eval(expr[1])
            idx = self.eval(expr[2])
            return lst[idx]
        if kind == "setindex":
            lst = self.eval(expr[1])
            idx = self.eval(expr[2])
            val = self.eval(expr[3])
            lst[idx] = val
            return val
        raise RuntimeError_(f"Unknown expression {kind}")

# Simple hand-built AST helpers
def lit(v): return ("literal", v)
def var(n): return ("var", n)
def binop(op, a, b): return ("binary", op, a, b)
def unary(op, a): return ("unary", op, a)
def call(f, args): return ("call", f, args)
def block(stmts): return ("block", stmts)
def assign(n, e): return ("assign", n, e)
def vardecl(n, e=None): return ("var", n, e)
def ifstmt(c, t, e=None): return ("if", c, t, e)
def whilestmt(c, b): return ("while", c, b)
def func(name, params, body): return ("func", name, params, body)
def ret(e=None): return ("return", e)
def exprstmt(e): return ("expr", e)
def listlit(items): return ("list", items)
def idx(l, i): return ("index", l, i)

if __name__ == "__main__":
    interp = Interpreter()

    # factorial
    prog = [
        func("fact", ["n"], block([
            ifstmt(binop("<=", var("n"), lit(1)),
                   ret(lit(1)),
                   ret(binop("*", var("n"), call(var("fact"), [binop("-", var("n"), lit(1))]))))
        ])),
        exprstmt(call(var("print"), [call(var("fact"), [lit(10)])])),
    ]
    print("Factorial 10:")
    interp.interpret(prog)

    # sum 1..100 with while
    interp2 = Interpreter()
    prog2 = [
        vardecl("s", lit(0)),
        vardecl("i", lit(1)),
        whilestmt(binop("<=", var("i"), lit(100)), block([
            assign("s", binop("+", var("s"), var("i"))),
            assign("i", binop("+", var("i"), lit(1))),
        ])),
        exprstmt(call(var("print"), [var("s")])),
    ]
    print("Sum 1..100:")
    interp2.interpret(prog2)

    # fibonacci iterative
    interp3 = Interpreter()
    prog3 = [
        vardecl("a", lit(0)),
        vardecl("b", lit(1)),
        vardecl("i", lit(0)),
        whilestmt(binop("<", var("i"), lit(15)), block([
            exprstmt(call(var("print"), [var("a")])),
            vardecl("tmp", binop("+", var("a"), var("b"))),
            assign("a", var("b")),
            assign("b", var("tmp")),
            assign("i", binop("+", var("i"), lit(1))),
        ])),
    ]
    print("Fibonacci:")
    interp3.interpret(prog3)

    # list ops
    interp4 = Interpreter()
    prog4 = [
        vardecl("xs", listlit([lit(1), lit(2), lit(3)])),
        exprstmt(call(var("append"), [var("xs"), lit(4)])),
        exprstmt(call(var("print"), [var("xs")])),
        exprstmt(call(var("print"), [call(var("len"), [var("xs")])])),
        exprstmt(call(var("print"), [idx(var("xs"), lit(2))])),
    ]
    print("List demo:")
    interp4.interpret(prog4)

    # gcd
    interp5 = Interpreter()
    prog5 = [
        func("gcd", ["a", "b"], block([
            whilestmt(binop("!=", var("b"), lit(0)), block([
                vardecl("t", var("b")),
                assign("b", binop("%", var("a"), var("b"))),
                assign("a", var("t")),
            ])),
            ret(var("a")),
        ])),
        exprstmt(call(var("print"), [call(var("gcd"), [lit(1071), lit(462)])])),
    ]
    print("GCD 1071,462:")
    interp5.interpret(prog5)
