import re
from collections import deque

class InterpreterError(Exception):
    pass

class Tokenizer:
    TOKEN_SPEC = [
        ("NUMBER",   r"\d+\.?\d*"),
        ("ID",       r"[A-Za-z_][A-Za-z0-9_]*"),
        ("OP",       r"[+\-*/%=().,]"),
        ("SKIP",     r"[ \t]+"),
        ("MISMATCH", r"."),
    ]
    TOKEN_REGEX = re.compile("|".join(f"(?P<{name}>{pattern})" for name, pattern in TOKEN_SPEC))

    def __init__(self, text):
        self.tokens = []
        for match in self.TOKEN_REGEX.finditer(text):
            kind = match.lastgroup
            value = match.group()
            if kind == "NUMBER":
                self.tokens.append(("NUMBER", float(value) if "." in value else int(value)))
            elif kind == "ID":
                self.tokens.append(("ID", value))
            elif kind == "OP":
                self.tokens.append((value, value))
            elif kind == "MISMATCH":
                raise InterpreterError(f"Unexpected character: {value}")
        self.tokens.append(("EOF", None))
        self.pos = 0

    def peek(self):
        return self.tokens[self.pos]

    def consume(self, expected=None):
        tok = self.tokens[self.pos]
        if expected and tok[0] != expected:
            raise InterpreterError(f"Expected {expected}, got {tok[0]}")
        self.pos += 1
        return tok

class Interpreter:
    def __init__(self):
        self.vars = {}
        self.functions = {
            "abs": abs,
            "min": min,
            "max": max,
            "sqrt": lambda x: x ** 0.5,
            "pow": pow,
        }

    def parse(self, text):
        self.tokenizer = Tokenizer(text)
        result = self.expression()
        if self.tokenizer.peek()[0] != "EOF":
            raise InterpreterError("Unexpected token at end")
        return result

    def expression(self):
        node = self.term()
        while self.tokenizer.peek()[0] in ("+", "-"):
            op = self.tokenizer.consume()[0]
            right = self.term()
            node = ("binop", op, node, right)
        return node

    def term(self):
        node = self.factor()
        while self.tokenizer.peek()[0] in ("*", "/", "%"):
            op = self.tokenizer.consume()[0]
            right = self.factor()
            node = ("binop", op, node, right)
        return node

    def factor(self):
        tok_type, tok_val = self.tokenizer.peek()
        if tok_type == "NUMBER":
            self.tokenizer.consume()
            return ("number", tok_val)
        if tok_type == "ID":
            self.tokenizer.consume()
            if self.tokenizer.peek()[0] == "(":
                return self.function_call(tok_val)
            return ("var", tok_val)
        if tok_type == "(":
            self.tokenizer.consume("(")
            node = self.expression()
            self.tokenizer.consume(")")
            return node
        if tok_type == "-":
            self.tokenizer.consume("-")
            return ("unary", "-", self.factor())
        raise InterpreterError(f"Unexpected token {tok_type}")

    def function_call(self, name):
        self.tokenizer.consume("(")
        args = []
        if self.tokenizer.peek()[0] != ")":
            args.append(self.expression())
            while self.tokenizer.peek()[0] == ",":
                self.tokenizer.consume(",")
                args.append(self.expression())
        self.tokenizer.consume(")")
        return ("call", name, args)

    def evaluate(self, node):
        kind = node[0]
        if kind == "number":
            return node[1]
        if kind == "var":
            if node[1] not in self.vars:
                raise InterpreterError(f"Undefined variable: {node[1]}")
            return self.vars[node[1]]
        if kind == "unary":
            val = self.evaluate(node[2])
            return -val if node[1] == "-" else val
        if kind == "binop":
            left = self.evaluate(node[2])
            right = self.evaluate(node[3])
            op = node[1]
            if op == "+": return left + right
            if op == "-": return left - right
            if op == "*": return left * right
            if op == "/": return left / right
            if op == "%": return left % right
        if kind == "call":
            name, args = node[1], node[2]
            if name not in self.functions:
                raise InterpreterError(f"Unknown function: {name}")
            values = [self.evaluate(a) for a in args]
            return self.functions[name](*values)
        raise InterpreterError(f"Unknown node type: {kind}")

    def run(self, text):
        text = text.strip()
        if not text:
            return None
        if "=" in text and not text.strip().startswith(("min", "max", "pow")):
            # simple assignment: name = expression
            name, expr = text.split("=", 1)
            name = name.strip()
            if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", name):
                raise InterpreterError("Invalid variable name")
            value = self.evaluate(self.parse(expr.strip()))
            self.vars[name] = value
            return value
        return self.evaluate(self.parse(text))

if __name__ == "__main__":
    interp = Interpreter()
    tests = [
        "3 + 4 * 2",
        "(3 + 4) * 2",
        "10 % 3",
        "x = 10",
        "y = x * 3 + 1",
        "y",
        "abs(-15)",
        "max(3, 7, 2)",
        "sqrt(81)",
        "pow(2, 10)",
        "z = sqrt(pow(3, 2) + pow(4, 2))",
        "z",
    ]
    for expr in tests:
        try:
            result = interp.run(expr)
            print(f"{expr:<35} = {result}")
        except InterpreterError as e:
            print(f"{expr:<35} ! {e}")
    print()
    print("Variables:", interp.vars)
    print()
    for bad in ["2 +", "unknown(1)", "a = ", "1 = 2"]:
        try:
            interp.run(bad)
        except InterpreterError as e:
            print(f"Error on {bad!r}: {e}")
