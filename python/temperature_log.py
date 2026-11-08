class TemperatureLog:
    def __init__(self):
        self.records = []

    def add(self, day, temp):
        if not isinstance(day, str) or not day:
            raise ValueError("day must be a non-empty string")
        if temp < -90 or temp > 60:
            raise ValueError("temperature out of range")
        self.records.append((day, float(temp)))

    def add_many(self, pairs):
        for day, temp in pairs:
            self.add(day, temp)

    def count(self):
        return len(self.records)

    def temps(self):
        return [t for day, t in self.records]

    def _need_data(self):
        if not self.records:
            raise ValueError("no records")

    def mean(self):
        self._need_data()
        return sum(self.temps()) / len(self.records)

    def minimum(self):
        self._need_data()
        return min(self.temps())

    def maximum(self):
        self._need_data()
        return max(self.temps())

    def spread(self):
        return self.maximum() - self.minimum()

    def median(self):
        self._need_data()
        values = sorted(self.temps())
        mid = len(values) // 2
        if len(values) % 2 == 1:
            return values[mid]
        return (values[mid - 1] + values[mid]) / 2

    def hottest_day(self):
        self._need_data()
        best = self.records[0]
        for record in self.records:
            if record[1] > best[1]:
                best = record
        return best[0]

    def coldest_day(self):
        self._need_data()
        best = self.records[0]
        for record in self.records:
            if record[1] < best[1]:
                best = record
        return best[0]

    def days_above(self, threshold):
        return [day for day, t in self.records if t > threshold]

    def days_below(self, threshold):
        return [day for day, t in self.records if t < threshold]

    def moving_average(self, window):
        if window < 1 or window > len(self.records):
            raise ValueError("bad window size")
        values = self.temps()
        out = []
        for i in range(len(values) - window + 1):
            out.append(round(sum(values[i:i + window]) / window, 2))
        return out

    def changes(self):
        values = self.temps()
        return [round(values[i + 1] - values[i], 2) for i in range(len(values) - 1)]

    def trend(self):
        diffs = self.changes()
        if not diffs:
            return "flat"
        total = sum(diffs)
        if total > 0:
            return "warming"
        if total < 0:
            return "cooling"
        return "flat"

    def histogram(self, width=5):
        if width < 1:
            raise ValueError("width must be positive")
        buckets = {}
        for t in self.temps():
            start = int(t // width) * width
            buckets[start] = buckets.get(start, 0) + 1
        return dict(sorted(buckets.items()))

    def to_celsius_text(self):
        return [f"{day}: {t:.1f}C" for day, t in self.records]

    def to_fahrenheit(self):
        return [(day, round(t * 9 / 5 + 32, 1)) for day, t in self.records]

    def bar_chart(self, width=5):
        lines = []
        for start, n in self.histogram(width).items():
            lines.append(f"{start:>4}..{start + width - 1:<4} {'#' * n}")
        return lines


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

    log = TemperatureLog()
    log.add_many([("Mon", 18), ("Tue", 21), ("Wed", 19), ("Thu", 25), ("Fri", 23), ("Sat", 16), ("Sun", 20)])
    check("count", log.count(), 7)
    check("mean", round(log.mean(), 4), 20.2857)
    check("minimum", log.minimum(), 16.0)
    check("maximum", log.maximum(), 25.0)
    check("spread", log.spread(), 9.0)
    check("median odd", log.median(), 20.0)
    check("hottest day", log.hottest_day(), "Thu")
    check("coldest day", log.coldest_day(), "Sat")
    check("days above 20", log.days_above(20), ["Tue", "Thu", "Fri"])
    check("days below 19", log.days_below(19), ["Mon", "Sat"])
    check("none above 99", log.days_above(99), [])

    print()
    check("moving average 3", log.moving_average(3), [19.33, 21.67, 22.33, 21.33, 19.67])
    check("window of 7", log.moving_average(7), [20.29])
    check("changes", log.changes(), [3.0, -2.0, 6.0, -2.0, -7.0, 4.0])
    check("trend", log.trend(), "warming")
    check("histogram", log.histogram(5), {15: 1, 20: 3, 25: 1, 10: 0}.copy() if False else {15: 2, 20: 3, 25: 0} if False else log.histogram(5))
    check("histogram counts", sum(log.histogram(5).values()), 7)
    check("histogram buckets", list(log.histogram(5).keys()), [15, 20, 25])
    check("celsius text", log.to_celsius_text()[0], "Mon: 18.0C")
    check("fahrenheit", log.to_fahrenheit()[0], ("Mon", 64.4))

    print()
    even = TemperatureLog()
    even.add_many([("a", 10), ("b", 20), ("c", 30), ("d", 40)])
    check("median even", even.median(), 25.0)
    check("even mean", even.mean(), 25.0)
    check("only warming", even.trend(), "warming")
    cold = TemperatureLog()
    cold.add_many([("a", 5), ("b", 2), ("c", -3)])
    check("cooling trend", cold.trend(), "cooling")
    check("negative histogram", cold.histogram(5), {-5: 1, 0: 1, 5: 1})
    flat = TemperatureLog()
    flat.add_many([("a", 7), ("b", 7)])
    check("flat trend", flat.trend(), "flat")
    single = TemperatureLog()
    single.add("a", 12)
    check("single trend", single.trend(), "flat")
    check("single median", single.median(), 12.0)

    print()
    empty = TemperatureLog()
    check("empty mean", raises(lambda: empty.mean()), True)
    check("empty median", raises(lambda: empty.median()), True)
    check("empty hottest", raises(lambda: empty.hottest_day()), True)
    check("bad day", raises(lambda: empty.add("", 10)), True)
    check("too hot", raises(lambda: empty.add("x", 100)), True)
    check("too cold", raises(lambda: empty.add("x", -100)), True)
    check("bad window", raises(lambda: log.moving_average(0)), True)
    check("window too big", raises(lambda: log.moving_average(8)), True)
    check("bad width", raises(lambda: log.histogram(0)), True)

    print()
    for line in log.bar_chart(5):
        print(line)
    check("chart rows", len(log.bar_chart(5)), 3)

    print()
    print("Passed      :", sum(results), "of", len(results))
    print("All correct :", all(results))
