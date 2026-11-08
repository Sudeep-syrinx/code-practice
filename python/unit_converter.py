LENGTH = {
    "mm": 0.001, "cm": 0.01, "m": 1.0, "km": 1000.0,
    "in": 0.0254, "ft": 0.3048, "yd": 0.9144, "mi": 1609.344,
}
MASS = {
    "mg": 0.000001, "g": 0.001, "kg": 1.0,
    "oz": 0.028349523125, "lb": 0.45359237,
}
TABLES = [LENGTH, MASS]


def convert(value, src, dst):
    for table in TABLES:
        if src in table and dst in table:
            return value * table[src] / table[dst]
    raise ValueError("cannot convert " + src + " to " + dst)


def c_to_f(c):
    return c * 9 / 5 + 32


def f_to_c(f):
    return (f - 32) * 5 / 9


def c_to_k(c):
    return c + 273.15


def k_to_c(k):
    return k - 273.15


def raises(fn):
    try:
        fn()
    except ValueError:
        return True
    return False


if __name__ == "__main__":
    results = []

    def check(name, actual, expected):
        ok = actual == expected
        results.append(ok)
        print(f"{name:<26}{str(actual)[:40]:<42}{'ok' if ok else 'MISMATCH expected ' + repr(expected)}")

    check("km to m", round(convert(1, "km", "m"), 6), 1000.0)
    check("m to cm", round(convert(2, "m", "cm"), 6), 200.0)
    check("mile to km", round(convert(1, "mi", "km"), 6), 1.609344)
    check("12 in to ft", round(convert(12, "in", "ft"), 6), 1.0)
    check("kg to g", round(convert(1.5, "kg", "g"), 6), 1500.0)
    check("lb to kg", round(convert(1, "lb", "kg"), 8), 0.45359237)
    check("16 oz to lb", round(convert(16, "oz", "lb"), 6), 1.0)
    check("same unit", convert(7, "m", "m"), 7.0)
    check("mixed units", raises(lambda: convert(1, "m", "kg")), True)
    check("unknown unit", raises(lambda: convert(1, "m", "parsec")), True)
    check("100 C to F", c_to_f(100), 212.0)
    check("32 F to C", f_to_c(32), 0.0)
    check("minus 40 matches", c_to_f(-40), -40.0)
    check("0 C to K", c_to_k(0), 273.15)
    check("K back to C", round(k_to_c(c_to_k(25)), 6), 25.0)

    print()
    print("Passed      :", sum(results), "of", len(results))
    print("All correct :", all(results))
