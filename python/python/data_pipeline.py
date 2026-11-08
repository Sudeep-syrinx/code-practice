import csv
import io
from collections import defaultdict

RAW = """order_id,order_date,customer,region,product,quantity,unit_price,status
1001,2026-01-05,asha,south,laptop,1,55000,delivered
1002,2026-01-12,RAVI,north,mouse,3,499,delivered
1003,2026-01-20,meena,west,keyboard,2,1299,shipped
1004,2026-02-02,asha,south,headphones,1,2499,delivered
1005,2026-02-14,kiran,east,laptop,2,55000,delivered
1006,2026-02-18,ravi,north,webcam,,1899,delivered
1007,2026-02-25,anita,west,mouse,5,499,cancelled
1008,2026-03-03,meena,west,laptop,1,52000,delivered
1009,2026-03-09,kiran,east,keyboard,4,-1299,delivered
1010,2026-03-15,anita,west,headphones,2,2499,teleported
1011,2026-03-22,sudeep,south,laptop,1,55000,pending
1012,2026-03-28,ravi,north,keyboard,3,1299,delivered
1013,2026-04-01,sudeep,south,mouse,10,499,shipped
"""

VALID_STATUS = {"delivered", "shipped", "cancelled", "pending"}
COUNTED_STATUS = {"delivered", "shipped"}


def read_rows(text):
    return list(csv.DictReader(io.StringIO(text)))


def clean(rows):
    good, bad = [], []
    for row in rows:
        order_id = row["order_id"]
        try:
            quantity = int(row["quantity"])
            price = float(row["unit_price"])
        except (ValueError, TypeError):
            bad.append((order_id, "invalid number"))
            continue
        if quantity <= 0 or price <= 0:
            bad.append((order_id, "non-positive value"))
            continue
        status = row["status"].strip().lower()
        if status not in VALID_STATUS:
            bad.append((order_id, f"unknown status {status!r}"))
            continue
        good.append({
            "order_id": int(order_id),
            "month": row["order_date"][:7],
            "customer": row["customer"].strip().title(),
            "region": row["region"].strip().title(),
            "product": row["product"].strip().title(),
            "quantity": quantity,
            "unit_price": price,
            "status": status,
            "total": quantity * price,
        })
    return good, bad


def revenue_rows(rows):
    return [r for r in rows if r["status"] in COUNTED_STATUS]


def group_sum(rows, key, value="total"):
    totals = defaultdict(float)
    for r in rows:
        totals[r[key]] += r[value]
    return dict(totals)


def group_count(rows, key):
    counts = defaultdict(int)
    for r in rows:
        counts[r[key]] += 1
    return dict(counts)


def top_n(totals, n=3):
    return sorted(totals.items(), key=lambda item: item[1], reverse=True)[:n]


def pivot(rows, row_key, col_key, value="total"):
    table = defaultdict(lambda: defaultdict(float))
    columns = set()
    for r in rows:
        table[r[row_key]][r[col_key]] += r[value]
        columns.add(r[col_key])
    return table, sorted(columns)


def print_pivot(rows, row_key, col_key):
    table, columns = pivot(rows, row_key, col_key)
    print(f"{row_key.title():<10}" + "".join(f"{c:>13}" for c in columns) + f"{'Total':>13}")
    print("-" * (10 + 13 * (len(columns) + 1)))
    for name in sorted(table):
        values = [table[name].get(c, 0) for c in columns]
        print(f"{name:<10}" + "".join(f"{v:>13,.0f}" for v in values) + f"{sum(values):>13,.0f}")


def to_csv(rows, fields):
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fields, lineterminator="\n", extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def month_over_month(monthly):
    months = sorted(monthly)
    changes = []
    for prev, cur in zip(months, months[1:]):
        if monthly[prev] == 0:
            continue
        change = (monthly[cur] - monthly[prev]) / monthly[prev] * 100
        changes.append((cur, round(change, 1)))
    return changes


if __name__ == "__main__":
    rows = read_rows(RAW)
    good, bad = clean(rows)
    print(f"Read {len(rows)} rows, kept {len(good)}, rejected {len(bad)}")
    for order_id, reason in bad:
        print(f"  rejected order {order_id}: {reason}")

    sales = revenue_rows(good)
    print()
    print("Counted orders :", len(sales))
    print("Total revenue  :", f"{sum(r['total'] for r in sales):,.2f}")
    print("Average order  :", f"{sum(r['total'] for r in sales) / len(sales):,.2f}")
    print("Status counts  :", group_count(good, "status"))

    print()
    print("Revenue by region:")
    for region, total in top_n(group_sum(sales, "region"), 10):
        print(f"  {region:<8} {total:>12,.0f}")

    print()
    print("Top customers:")
    for name, total in top_n(group_sum(sales, "customer"), 3):
        print(f"  {name:<8} {total:>12,.0f}")

    print()
    print("Units sold by product:", group_sum(sales, "product", "quantity"))

    monthly = group_sum(sales, "month")
    print()
    print("Monthly revenue:")
    for month in sorted(monthly):
        print(f"  {month}  {monthly[month]:>12,.0f}")
    print("Month over month % :", month_over_month(monthly))

    print()
    print_pivot(sales, "region", "product")

    print()
    exported = to_csv(sales, ["order_id", "customer", "region", "product", "total"])
    print(exported)
    print("Export round trip:", len(read_rows(exported)) == len(sales))
