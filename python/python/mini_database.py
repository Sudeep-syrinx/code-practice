AGGREGATES = {
    "count": len,
    "sum": sum,
    "avg": lambda values: round(sum(values) / len(values), 2),
    "min": min,
    "max": max,
}


class Query:
    def __init__(self, rows):
        self.rows = [dict(r) for r in rows]

    def where(self, predicate):
        return Query([r for r in self.rows if predicate(r)])

    def order_by(self, column, descending=False):
        return Query(sorted(self.rows, key=lambda r: r[column], reverse=descending))

    def limit(self, n):
        return Query(self.rows[:n])

    def select(self, *columns):
        return Query([{c: r[c] for c in columns} for r in self.rows])

    def group_by(self, column, **aggregates):
        groups = {}
        for r in self.rows:
            groups.setdefault(r[column], []).append(r)
        result = []
        for key, members in groups.items():
            row = {column: key}
            for alias, (col, func) in aggregates.items():
                row[alias] = AGGREGATES[func]([m[col] for m in members])
            result.append(row)
        return Query(result)

    def join(self, other, left_on, right_on, prefix="r_"):
        index = {}
        for r in other.rows:
            index.setdefault(r[right_on], []).append(r)
        joined = []
        for left in self.rows:
            for right in index.get(left[left_on], []):
                row = dict(left)
                for k, v in right.items():
                    row[prefix + k] = v
                joined.append(row)
        return Query(joined)

    def distinct(self, column):
        return sorted({r[column] for r in self.rows})

    def all(self):
        return self.rows

    def count(self):
        return len(self.rows)


class Table:
    def __init__(self, name, columns):
        self.name = name
        self.columns = list(columns)
        self.rows = []

    def insert(self, **values):
        unknown = set(values) - set(self.columns)
        if unknown:
            raise KeyError(f"Unknown columns {sorted(unknown)} in table {self.name}")
        self.rows.append({c: values.get(c) for c in self.columns})
        return len(self.rows)

    def insert_many(self, records):
        for record in records:
            self.insert(**record)

    def update(self, predicate, **changes):
        changed = 0
        for r in self.rows:
            if predicate(r):
                r.update(changes)
                changed += 1
        return changed

    def delete(self, predicate):
        before = len(self.rows)
        self.rows = [r for r in self.rows if not predicate(r)]
        return before - len(self.rows)

    def query(self):
        return Query(self.rows)


def show(rows, title=None):
    if title:
        print(title)
    if not rows:
        print("  (no rows)")
        return
    columns = list(rows[0])
    widths = {c: max(len(str(c)), *(len(str(r[c])) for r in rows)) for c in columns}
    print("  " + "  ".join(str(c).ljust(widths[c]) for c in columns))
    print("  " + "  ".join("-" * widths[c] for c in columns))
    for r in rows:
        print("  " + "  ".join(str(r[c]).ljust(widths[c]) for c in columns))
    print()


if __name__ == "__main__":
    departments = Table("departments", ["id", "name", "city"])
    departments.insert_many([
        {"id": 1, "name": "Engineering", "city": "Bengaluru"},
        {"id": 2, "name": "Sales", "city": "Mumbai"},
        {"id": 3, "name": "Support", "city": "Chennai"},
        {"id": 4, "name": "HR", "city": "Delhi"},
    ])

    employees = Table("employees", ["id", "name", "dept_id", "salary", "age", "level"])
    people = [
        (1, "Sudeep", 1, 85000, 26), (2, "Ravi", 2, 52000, 31),
        (3, "Anita", 1, 98000, 41), (4, "Kiran", 3, 39000, 24),
        (5, "Meena", 2, 61000, 38), (6, "Arjun", 1, 72000, 29),
        (7, "Divya", 3, 43000, 45), (8, "Farhan", 2, 58000, 27),
        (9, "Latha", 1, 91000, 44), (10, "Nikhil", 3, 41000, 33),
    ]
    for pid, name, dept, salary, age in people:
        employees.insert(id=pid, name=name, dept_id=dept, salary=salary, age=age)

    print("Rows loaded:", len(employees.rows), "employees,", len(departments.rows), "departments")
    print()

    top = employees.query().where(lambda r: r["salary"] >= 60000)
    top = top.order_by("salary", descending=True).select("name", "salary").limit(5)
    show(top.all(), "Top earners (salary >= 60000)")

    stats = employees.query().group_by(
        "dept_id",
        headcount=("id", "count"),
        avg_salary=("salary", "avg"),
        top_salary=("salary", "max"),
    ).order_by("dept_id")
    show(stats.all(), "Statistics per department")

    joined = employees.query().join(departments.query(), "dept_id", "id", prefix="d_")
    show(joined.select("name", "d_name", "d_city").order_by("name").all(), "Employees with department")

    payroll = joined.group_by("d_name", total=("salary", "sum"), people=("id", "count"))
    show(payroll.order_by("total", descending=True).all(), "Payroll by department")

    print("Departments with staff :", employees.query().distinct("dept_id"))
    empty = [
        d["name"] for d in departments.query().all()
        if d["id"] not in employees.query().distinct("dept_id")
    ]
    print("Departments with nobody:", empty)
    print()

    promoted = employees.update(lambda r: r["age"] >= 40, level="senior")
    juniors = employees.update(lambda r: r["age"] < 30, level="junior")
    print("Promoted to senior:", promoted)
    print("Marked as junior  :", juniors)
    levels = employees.query().group_by("level", people=("id", "count")).order_by("people", True)
    show(levels.all(), "Headcount by level")

    removed = employees.delete(lambda r: r["salary"] < 40000)
    print("Deleted rows       :", removed)
    print("Remaining          :", employees.query().count())

    try:
        employees.insert(id=11, name="Test", bonus=5)
    except KeyError as e:
        print("Error              :", e.args[0])

    try:
        employees.query().order_by("missing").all()
    except KeyError as e:
        print("Error              : no column", e)
