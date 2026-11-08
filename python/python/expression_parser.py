import re

TOKEN_RE = re.compile(r"\s*(?:(\d+\.?\d*)|(\S))")


def tokenize(text):
    tokens = []
    for number, symbol in TOKEN_RE.findall(text):
        if number != "":
            tokens.append(("num", float(number)))
        elif symbol in "+-*/^%()":
            tokens.append(("op", symbol))
        else:
            raise ValueError(f"Unexpected character: {symbol!r}")
    return tokens


class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def advance(self):
        token = self.peek()
        self.pos += 1
        return token

    def match(self, *symbols):
        token = self.peek()
        if token and token[0] == "op" and token[1] in symbols:
            self.pos += 1
            return token[1]
        return None

    def parse(self):
        value = self.expr()
        if self.peek() is not None:
            raise ValueError(f"Unexpected token: {self.peek()[1]}")
        return value

    def expr(self):
        value = self.term()
        while True:
            op = self.match("+", "-")
            if op is None:
                return value
            right = self.term()
            value = value + right if op == "+" else value - right

    def term(self):
        value = self.unary()
        while True:
            op = self.match("*", "/", "%")
            if op is None:
                return value
            right = self.unary()
            if op == "*":
                value = value * right
            elif op == "/":
                value = value / right
            else:
                value = value % right

    def unary(self):
        if self.match("-"):
            return -self.unary()
        if self.match("+"):
            return self.unary()
        return self.power()

    def power(self):
        base = self.atom()
        if self.match("^"):
            return base ** self.unary()
        return base

    def atom(self):
        token = self.advance()
        if token is None:
            raise ValueError("Unexpected end of expression")
        kind, value = token
        if kind == "num":
            return value
        if value == "(":
            inner = self.expr()
            if not self.match(")"):
                raise ValueError("Missing closing parenthesis")
            return inner
        raise ValueError(f"Unexpected token: {value}")


def evaluate(text):
    result = Parser(tokenize(text)).parse()
    if result == int(result):
        return int(result)
    return round(result, 6)


if __name__ == "__main__":
    expressions = [
        "2 + 3 * 4",
        "(2 + 3) * 4",
        "2 ^ 3 ^ 2",
        "-2 ^ 2",
        "10 / 4",
        "17 % 5",
        "2 * (3 + (4 - 1)) ^ 2",
        "1.5 + 2.25",
        "  7 -  -3  ",
        "((((5))))",
        "2 +",
        "(1 + 2",
        "4 / 0",
        "3 $ 4",
        "2 3",
    ]
    for exp in expressions:
        try:
            print(f"{exp!r:<28} = {evaluate(exp)}")
        except (ValueError, ZeroDivisionError) as e:
            print(f"{exp!r:<28} ! {type(e).__name__}: {e}")
