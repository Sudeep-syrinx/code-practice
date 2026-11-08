import inspect
import re
from collections import Counter


class AssertionFailure(Exception):
    pass


def equal(actual, expected):
    if actual != expected:
        raise AssertionFailure(f"expected {expected!r} but got {actual!r}")


def true(value, message="value is not true"):
    if not value:
        raise AssertionFailure(message)


def close(actual, expected, tolerance=1e-9):
    if abs(actual - expected) > tolerance:
        raise AssertionFailure(f"{actual} is not within {tolerance} of {expected}")


def contains(collection, item):
    if item not in collection:
        raise AssertionFailure(f"{item!r} not found in {collection!r}")


class Suite:
    def __init__(self, name):
        self.name = name
        self.tests = []
        self.setup_fn = None

    def setup(self, func):
        self.setup_fn = func
        return func

    def test(self, func=None, skip=False, raises=None):
        def register(f):
            self.tests.append({"name": f.__name__, "func": f, "skip": skip, "raises": raises})
            return f

        if func is not None:
            return register(func)
        return register

    def run(self):
        results = []
        for t in self.tests:
            name, func, expected_error = t["name"], t["func"], t["raises"]
            if t["skip"]:
                results.append((name, "skip", ""))
                continue
            outcome, detail = "pass", ""
            try:
                if inspect.signature(func).parameters:
                    func(self.setup_fn() if self.setup_fn else None)
                else:
                    func()
                if expected_error is not None:
                    outcome, detail = "fail", f"expected {expected_error.__name__}"
            except AssertionFailure as e:
                outcome, detail = "fail", str(e)
            except Exception as e:
                if expected_error is not None and isinstance(e, expected_error):
                    outcome, detail = "pass", ""
                else:
                    outcome, detail = "error", f"{type(e).__name__}: {e}"
            results.append((name, outcome, detail))
        return results


def slugify(text):
    text = re.sub(r"[^a-zA-Z0-9\s-]", "", text).strip().lower()
    return re.sub(r"[\s-]+", "-", text)


def parse_duration(text):
    units = {"h": 3600, "m": 60, "s": 1}
    matches = re.findall(r"(\d+)([hms])", text)
    joined = "".join(f"{n}{u}" for n, u in matches)
    if not matches or joined != text.replace(" ", ""):
        raise ValueError(f"Bad duration {text!r}")
    return sum(int(n) * units[u] for n, u in matches)


def flatten(nested):
    flat = []
    for item in nested:
        if isinstance(item, list):
            flat.extend(flatten(item))
        else:
            flat.append(item)
    return flat


def chunk(items, size):
    if size <= 0:
        raise ValueError("Chunk size must be positive")
    return [items[i:i + size] for i in range(0, len(items), size)]


def running_total(numbers):
    total = 0
    result = []
    for n in numbers:
        total += n
        result.append(total)
    return result


suite = Suite("utility functions")


@suite.setup
def make_numbers():
    return [3, 1, 2]


@suite.test
def slugify_basic():
    equal(slugify("Hello, World!"), "hello-world")


@suite.test
def slugify_collapses_spaces_and_dashes():
    equal(slugify("  Python   is -- fun "), "python-is-fun")


@suite.test
def slugify_empty():
    equal(slugify(""), "")


@suite.test
def duration_hours_and_minutes():
    equal(parse_duration("1h30m"), 5400)


@suite.test
def duration_with_spaces():
    equal(parse_duration("2h 5m 10s"), 7510)


@suite.test(raises=ValueError)
def duration_rejects_text():
    parse_duration("abc")


@suite.test(raises=ValueError)
def duration_rejects_unknown_unit():
    parse_duration("5x")


@suite.test
def flatten_deep():
    equal(flatten([1, [2, [3, [4]]], 5]), [1, 2, 3, 4, 5])


@suite.test
def chunk_uneven():
    equal(chunk([1, 2, 3, 4, 5, 6, 7], 3), [[1, 2, 3], [4, 5, 6], [7]])


@suite.test(raises=ValueError)
def chunk_rejects_zero():
    chunk([1, 2], 0)


@suite.test
def running_total_uses_fixture(numbers):
    equal(running_total(numbers), [3, 4, 6])
    contains(numbers, 2)


@suite.test
def sorting_uses_fixture(numbers):
    equal(sorted(numbers), [1, 2, 3])


@suite.test
def float_math_needs_tolerance():
    close(0.1 + 0.2, 0.3, 1e-9)


@suite.test
def truthiness():
    true(slugify("A b"))


@suite.test
def deliberate_failure():
    equal(1 + 1, 3)


@suite.test
def deliberate_error():
    return 1 / 0


@suite.test(skip=True)
def deliberate_skip():
    equal(1, 2)


@suite.test(raises=KeyError)
def deliberate_missing_exception():
    return None


if __name__ == "__main__":
    results = suite.run()
    print(f"Suite: {suite.name}")
    for name, outcome, detail in results:
        line = f"  {outcome.upper():<6} {name}"
        if detail:
            line += f"  ({detail})"
        print(line)

    counts = Counter(outcome for _, outcome, _ in results)
    print()
    print("Passed :", counts["pass"])
    print("Failed :", counts["fail"])
    print("Errors :", counts["error"])
    print("Skipped:", counts["skip"])
    print("Total  :", len(results))

    genuine = [r for r in results if not r[0].startswith("deliberate") and r[1] != "pass"]
    deliberate = {r[0]: r[1] for r in results if r[0].startswith("deliberate")}
    print()
    print("Real tests all pass     :", not genuine)
    print("Framework caught fail   :", deliberate["deliberate_failure"] == "fail")
    print("Framework caught error  :", deliberate["deliberate_error"] == "error")
    print("Framework skipped       :", deliberate["deliberate_skip"] == "skip")
    print("Framework caught no-raise:", deliberate["deliberate_missing_exception"] == "fail")
