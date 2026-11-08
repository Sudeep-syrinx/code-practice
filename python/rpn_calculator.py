OPS = {"+", "-", "*", "/", "^"}


def apply(op, a, b):
    if op == "+":
        return a + b
    if op == "-":
        return a - b
    if op == "*":
        return a * b
    if op == "/":
        if b == 0:
            raise ZeroDivisionError("division by zero")
        return a / b
    return a ** b


def evaluate(text):
    stack = []
    for token in text.split():
        if token in OPS:
            if len(stack) < 2:
                raise ValueError("not enough values for " + token)
            b = stack.pop()
            a = stack.pop()
            stack.append(apply(token, a, b))
        else:
            try:
                stack.append(float(token))
            except ValueError:
                raise ValueError("bad token " + token)
    if len(stack) != 1:
        raise ValueError("expression is incomplete")
    return stack[0]


def raises(fn, exc):
    try:
        fn()
    except exc:
        return True
    return False


if __name__ == "__main__":
    results = []

    def check(name, actual, expected):
        ok = actual == expected
        results.append(ok)
        print(f"{name:<26}{str(actual)[:40]:<42}{'ok' if ok else 'MISMATCH expected ' + repr(expected)}")

    check("add", evaluate("3 4 +"), 7.0)
    check("subtract", evaluate("10 4 -"), 6.0)
    check("multiply", evaluate("6 7 *"), 42.0)
    check("divide", evaluate("9 2 /"), 4.5)
    check("power", evaluate("2 3 ^"), 8.0)
    check("mixed", evaluate("5 1 2 + 4 * + 3 -"), 14.0)
    check("single number", evaluate("42"), 42.0)
    check("decimals", evaluate("1.5 2.5 +"), 4.0)
    check("negative number", evaluate("-3 5 +"), 2.0)
    check("extra spaces", evaluate("  1   2   +  "), 3.0)
    check("missing operand", raises(lambda: evaluate("+"), ValueError), True)
    check("leftover values", raises(lambda: evaluate("1 2"), ValueError), True)
    check("bad token", raises(lambda: evaluate("1 x +"), ValueError), True)
    check("empty input", raises(lambda: evaluate(""), ValueError), True)
    check("divide by zero", raises(lambda: evaluate("1 0 /"), ZeroDivisionError), True)

    print()
    print("Passed      :", sum(results), "of", len(results))
    print("All correct :", all(results))
