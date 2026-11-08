from datetime import date
from decimal import Decimal, ROUND_HALF_UP

SIGN = {"asset": 1, "expense": 1, "liability": -1, "equity": -1, "income": -1}


class LedgerError(Exception):
    pass


def money(value):
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class Ledger:
    def __init__(self):
        self.accounts = {}
        self.entries = []
        self.next_id = 1

    def open_account(self, code, name, kind):
        if kind not in SIGN:
            raise LedgerError(f"Unknown account type {kind}")
        if code in self.accounts:
            raise LedgerError(f"Account {code} already exists")
        self.accounts[code] = (name, kind)

    def post(self, when, memo, lines):
        if len(lines) < 2:
            raise LedgerError("A transaction needs at least two lines")
        cleaned = []
        for code, debit, credit in lines:
            if code not in self.accounts:
                raise LedgerError(f"Unknown account {code}")
            d, c = money(debit), money(credit)
            if d < 0 or c < 0:
                raise LedgerError("Amounts cannot be negative")
            if d and c:
                raise LedgerError("A line cannot have both a debit and a credit")
            cleaned.append((code, d, c))
        total_d = sum(d for _, d, _ in cleaned)
        total_c = sum(c for _, _, c in cleaned)
        if total_d != total_c:
            raise LedgerError(f"Unbalanced transaction: debits {total_d} credits {total_c}")
        entry = {
            "id": self.next_id,
            "date": when,
            "memo": memo,
            "lines": cleaned,
            "reverses": None,
        }
        self.entries.append(entry)
        self.next_id += 1
        return entry["id"]

    def reverse(self, entry_id, when):
        original = next((e for e in self.entries if e["id"] == entry_id), None)
        if original is None:
            raise LedgerError(f"No entry with id {entry_id}")
        if any(e["reverses"] == entry_id for e in self.entries):
            raise LedgerError(f"Entry {entry_id} is already reversed")
        lines = [(code, c, d) for code, d, c in original["lines"]]
        new_id = self.post(when, f"Reversal of {entry_id}", lines)
        self.entries[-1]["reverses"] = entry_id
        return new_id

    def raw_balance(self, code, until=None):
        total = Decimal("0.00")
        for e in self.entries:
            if until is not None and e["date"] > until:
                continue
            for c, d, cr in e["lines"]:
                if c == code:
                    total += d - cr
        return total

    def balance(self, code, until=None):
        kind = self.accounts[code][1]
        return self.raw_balance(code, until) * SIGN[kind]

    def total_of(self, kind, until=None):
        total = Decimal("0.00")
        for code, (_, k) in self.accounts.items():
            if k == kind:
                total += self.balance(code, until)
        return total

    def trial_balance(self):
        rows = []
        total_d = total_c = Decimal("0.00")
        for code in sorted(self.accounts):
            raw = self.raw_balance(code)
            d = raw if raw > 0 else Decimal("0.00")
            c = -raw if raw < 0 else Decimal("0.00")
            rows.append((code, self.accounts[code][0], d, c))
            total_d += d
            total_c += c
        return rows, total_d, total_c

    def net_income(self, until=None):
        return self.total_of("income", until) - self.total_of("expense", until)

    def equation_holds(self, until=None):
        left = self.total_of("asset", until)
        right = self.total_of("liability", until) + self.total_of("equity", until) + self.net_income(until)
        return left == right


def show_trial_balance(ledger):
    rows, td, tc = ledger.trial_balance()
    print(f"{'Code':<7}{'Account':<20}{'Debit':>14}{'Credit':>14}")
    print("-" * 55)
    for code, name, d, c in rows:
        print(f"{code:<7}{name:<20}{d:>14,.2f}{c:>14,.2f}")
    print("-" * 55)
    print(f"{'Totals':<27}{td:>14,.2f}{tc:>14,.2f}")


if __name__ == "__main__":
    book = Ledger()
    chart = [
        ("1000", "Cash", "asset"), ("1100", "Receivables", "asset"),
        ("1500", "Equipment", "asset"), ("2000", "Payables", "liability"),
        ("2100", "Bank loan", "liability"), ("3000", "Owner capital", "equity"),
        ("4000", "Sales", "income"), ("5000", "Rent", "expense"),
        ("5100", "Salaries", "expense"), ("5200", "Supplies", "expense"),
    ]
    for code, name, kind in chart:
        book.open_account(code, name, kind)

    book.post(date(2026, 1, 1), "Owner invests cash", [("1000", 500000, 0), ("3000", 0, 500000)])
    book.post(date(2026, 1, 3), "Equipment bought on loan", [("1500", 200000, 0), ("2100", 0, 200000)])
    rent_id = book.post(date(2026, 1, 5), "January rent", [("5000", 30000, 0), ("1000", 0, 30000)])
    book.post(date(2026, 1, 10), "Sale on credit", [("1100", 120000, 0), ("4000", 0, 120000)])
    book.post(date(2026, 1, 15), "Cash sale", [("1000", "45000.50", 0), ("4000", 0, "45000.50")])
    book.post(date(2026, 1, 20), "Supplies on account", [("5200", 8000, 0), ("2000", 0, 8000)])
    book.post(date(2026, 1, 25), "Salaries", [("5100", "60000.25", 0), ("1000", 0, "60000.25")])
    book.post(date(2026, 1, 28), "Customer payment", [("1000", 70000, 0), ("1100", 0, 70000)])
    book.post(date(2026, 1, 30), "Loan repayment", [("2100", 25000, 0), ("1000", 0, 25000)])

    show_trial_balance(book)
    print()
    print("Income statement")
    print(f"  Income           {book.total_of('income'):>14,.2f}")
    print(f"  Expenses         {book.total_of('expense'):>14,.2f}")
    print(f"  Net income       {book.net_income():>14,.2f}")
    print()
    print("Balance sheet")
    print(f"  Assets           {book.total_of('asset'):>14,.2f}")
    print(f"  Liabilities      {book.total_of('liability'):>14,.2f}")
    print(f"  Equity           {book.total_of('equity'):>14,.2f}")
    print(f"  Plus net income  {book.net_income():>14,.2f}")

    rows, td, tc = book.trial_balance()
    print()
    print("Cash is 500000.25        :", book.balance("1000") == Decimal("500000.25"))
    print("Receivables are 50000    :", book.balance("1100") == Decimal("50000.00"))
    print("Net income is 67000.25   :", book.net_income() == Decimal("67000.25"))
    print("Trial balance balances   :", td == tc)
    print("Assets = Liab + Equity   :", book.equation_holds())
    print("Cash on 10 January       :", book.balance("1000", date(2026, 1, 10)))
    print("Equation on 10 January   :", book.equation_holds(date(2026, 1, 10)))

    print()
    print("Rounding 10.005          :", money("10.005"), "and 10.004 ->", money("10.004"))

    bad_posts = [
        lambda: book.post(date(2026, 2, 1), "x", [("1000", 100, 0), ("4000", 0, 90)]),
        lambda: book.post(date(2026, 2, 1), "x", [("1000", 100, 0), ("9999", 0, 100)]),
        lambda: book.post(date(2026, 2, 1), "x", [("1000", 100, 100), ("4000", 0, 0)]),
        lambda: book.post(date(2026, 2, 1), "x", [("1000", 100, 0)]),
        lambda: book.post(date(2026, 2, 1), "x", [("1000", -5, 0), ("4000", 0, -5)]),
        lambda: book.open_account("1000", "Duplicate", "asset"),
        lambda: book.open_account("7000", "Odd", "gift"),
        lambda: book.reverse(99, date(2026, 2, 1)),
    ]
    print()
    for attempt in bad_posts:
        try:
            attempt()
            print("Accepted (should not happen)")
        except LedgerError as e:
            print("Rejected           :", e)

    print()
    print("Entries after rejects    :", len(book.entries))
    book.reverse(rent_id, date(2026, 2, 2))
    print("Rent after reversal      :", book.balance("5000"))
    print("Cash after reversal      :", book.balance("1000"))
    try:
        book.reverse(rent_id, date(2026, 2, 3))
    except LedgerError as e:
        print("Rejected           :", e)
    rows, td, tc = book.trial_balance()
    print("Books still balance      :", td == tc and book.equation_holds())
    print("Entries now              :", len(book.entries))
