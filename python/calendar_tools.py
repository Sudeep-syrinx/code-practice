import datetime

MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def is_leap(year):
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def days_in_month(year, month):
    if month == 2:
        return 29 if is_leap(year) else 28
    return 30 if month in (4, 6, 9, 11) else 31


def day_of_week(year, month, day):
    offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
    if month < 3:
        year -= 1
    sunday_zero = (year + year // 4 - year // 100 + year // 400 + offsets[month - 1] + day) % 7
    return (sunday_zero + 6) % 7


def day_name(year, month, day):
    return DAYS[day_of_week(year, month, day)]


def day_of_year(year, month, day):
    return sum(days_in_month(year, m) for m in range(1, month)) + day


def to_ordinal(year, month, day):
    y = year - 1
    days = 365 * y + y // 4 - y // 100 + y // 400
    return days + day_of_year(year, month, day)


def days_between(a, b):
    return to_ordinal(*b) - to_ordinal(*a)


def add_days(year, month, day, n):
    step = 1 if n >= 0 else -1
    for _ in range(abs(n)):
        day += step
        if day > days_in_month(year, month):
            day = 1
            month += 1
            if month > 12:
                month = 1
                year += 1
        elif day < 1:
            month -= 1
            if month < 1:
                month = 12
                year -= 1
            day = days_in_month(year, month)
    return year, month, day


def month_calendar(year, month):
    lines = [f"{MONTHS[month - 1]} {year}".center(20), "Mo Tu We Th Fr Sa Su"]
    cells = ["  "] * day_of_week(year, month, 1)
    cells += [f"{d:2d}" for d in range(1, days_in_month(year, month) + 1)]
    for i in range(0, len(cells), 7):
        lines.append(" ".join(cells[i:i + 7]))
    return "\n".join(lines)


def age(birth, today):
    years = today[0] - birth[0]
    if (today[1], today[2]) < (birth[1], birth[2]):
        years -= 1
    return years


def weekdays_between(start, end):
    count = 0
    current = start
    while current != end:
        if day_of_week(*current) < 5:
            count += 1
        current = add_days(*current, 1)
    return count


def friday_thirteenths(year):
    return [m for m in range(1, 13) if day_of_week(year, m, 13) == 4]


def next_weekday(date, target):
    current = add_days(*date, 1)
    while day_of_week(*current) != target:
        current = add_days(*current, 1)
    return current


def format_date(date):
    y, m, d = date
    return f"{day_name(y, m, d)}, {d} {MONTHS[m - 1]} {y}"


if __name__ == "__main__":
    today = (2026, 11, 8)
    print("Today            :", format_date(today))
    print("Day of year      :", day_of_year(*today))
    print("Leap years 2020-2030:", [y for y in range(2020, 2031) if is_leap(y)])
    print("1900 / 2000 leap :", is_leap(1900), is_leap(2000))
    print()
    print(month_calendar(2026, 11))
    print()
    print(month_calendar(2028, 2))
    print()

    christmas = (2026, 12, 25)
    print("Days to Christmas:", days_between(today, christmas))
    print("Christmas falls on:", day_name(*christmas))
    print("100 days from now:", format_date(add_days(*today, 100)))
    print("100 days ago     :", format_date(add_days(*today, -100)))
    print("Next Monday      :", format_date(next_weekday(today, 0)))
    print("Weekdays to Christmas:", weekdays_between(today, christmas))
    print("Age of someone born 2000-12-15:", age((2000, 12, 15), today))
    print("Friday the 13th in 2026 (months):", friday_thirteenths(2026))
    print("Friday the 13th in 2027 (months):", friday_thirteenths(2027))

    checks = [(2026, 11, 8), (2000, 2, 29), (1999, 12, 31), (2024, 7, 4), (1970, 1, 1)]
    ok = True
    for y, m, d in checks:
        real = datetime.date(y, m, d)
        if day_of_week(y, m, d) != real.weekday() or to_ordinal(y, m, d) != real.toordinal():
            ok = False
    print("Matches datetime module:", ok)
