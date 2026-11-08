from datetime import datetime, timedelta

RANGES = [(0, 59), (0, 23), (1, 31), (1, 12), (0, 6)]


def parse_field(text, lo, hi):
    values = set()
    for part in text.split(","):
        step = 1
        if "/" in part:
            part, s = part.split("/")
            step = int(s)
            if step < 1:
                raise ValueError("Step must be at least 1")
        if part == "*":
            a, b = lo, hi
        elif "-" in part:
            x, y = part.split("-")
            a, b = int(x), int(y)
        else:
            a = b = int(part)
        if not (lo <= a <= b <= hi):
            raise ValueError(f"Value out of range {lo}-{hi}: {part}")
        values.update(range(a, b + 1, step))
    return values


def parse(expr):
    parts = expr.split()
    if len(parts) != 5:
        raise ValueError("A cron expression needs exactly 5 fields")
    sets = [parse_field(p, lo, hi) for p, (lo, hi) in zip(parts, RANGES)]
    return {
        "minute": sets[0],
        "hour": sets[1],
        "dom": sets[2],
        "month": sets[3],
        "dow": sets[4],
        "dom_star": parts[2].startswith("*"),
        "dow_star": parts[4].startswith("*"),
    }


def day_ok(cron, t):
    dom_ok = t.day in cron["dom"]
    dow_ok = (t.weekday() + 1) % 7 in cron["dow"]
    if cron["dom_star"] or cron["dow_star"]:
        return dom_ok and dow_ok
    return dom_ok or dow_ok


def matches(cron, t):
    return (
        t.minute in cron["minute"]
        and t.hour in cron["hour"]
        and t.month in cron["month"]
        and day_ok(cron, t)
    )


def next_run(cron, after):
    t = after.replace(second=0, microsecond=0) + timedelta(minutes=1)
    limit = after + timedelta(days=366 * 8)
    while t < limit:
        if t.month not in cron["month"]:
            t = (t.replace(day=1, hour=0, minute=0) + timedelta(days=32)).replace(day=1)
        elif not day_ok(cron, t):
            t = t.replace(hour=0, minute=0) + timedelta(days=1)
        elif t.hour not in cron["hour"]:
            t = t.replace(minute=0) + timedelta(hours=1)
        elif t.minute not in cron["minute"]:
            t += timedelta(minutes=1)
        else:
            return t
    raise ValueError("No run time found")


def brute_next(cron, after, days):
    t = after.replace(second=0, microsecond=0) + timedelta(minutes=1)
    for _ in range(days * 1440):
        if matches(cron, t):
            return t
        t += timedelta(minutes=1)
    return None


if __name__ == "__main__":
    start = datetime(2026, 1, 2, 9, 0)
    cases = [
        ("*/15 * * * *", datetime(2026, 1, 1, 10, 7), datetime(2026, 1, 1, 10, 15)),
        ("0 9 * * 1-5", start, datetime(2026, 1, 5, 9, 0)),
        ("30 2 29 2 *", datetime(2026, 1, 1), datetime(2028, 2, 29, 2, 30)),
        ("0 0 1 1 *", datetime(2026, 6, 1), datetime(2027, 1, 1, 0, 0)),
        ("5,10 8-9 * * *", datetime(2026, 3, 3, 8, 10), datetime(2026, 3, 3, 9, 5)),
    ]
    for expr, after, expected in cases:
        result = next_run(parse(expr), after)
        print(f"{expr:<18}{result}  {result == expected}")

    print()
    print("Next five runs of '0 */6 * * *':")
    t = datetime(2026, 1, 1, 0, 0)
    cron = parse("0 */6 * * *")
    for _ in range(5):
        t = next_run(cron, t)
        print("  ", t)

    agree = True
    for expr in ["*/20 3-5 * * *", "5,10 * * * 0", "0 12 15 * *", "59 23 * * 6"]:
        cron = parse(expr)
        for offset in range(0, 5000, 733):
            after = datetime(2026, 1, 1) + timedelta(minutes=offset)
            if next_run(cron, after) != brute_next(cron, after, 40):
                agree = False
    print()
    print("Matches brute force    :", agree)

    bad = ["60 * * * *", "* * *", "a * * * *", "*/0 * * * *", "* 24 * * *", "* * 0 * *"]
    for expr in bad:
        try:
            parse(expr)
            print("Accepted (should not happen):", expr)
        except ValueError as e:
            print(f"Rejected {expr!r:<14}: {e}")
