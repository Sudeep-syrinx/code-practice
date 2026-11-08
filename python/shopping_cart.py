def money(cents):
    sign = "-" if cents < 0 else ""
    cents = abs(cents)
    return sign + str(cents // 100) + "." + ("%02d" % (cents % 100))


class Cart:
    def __init__(self, tax_percent=0):
        if tax_percent < 0:
            raise ValueError("tax cannot be negative")
        self.items = {}
        self.tax_percent = tax_percent
        self.code = None
        self.codes = {
            "SAVE10": ("percent", 10),
            "SAVE25": ("percent", 25),
            "FIVEOFF": ("fixed", 500),
        }

    def add(self, name, price_cents, quantity=1):
        if price_cents < 0:
            raise ValueError("price cannot be negative")
        if quantity < 1:
            raise ValueError("quantity must be at least 1")
        if name in self.items:
            self.items[name][1] += quantity
        else:
            self.items[name] = [price_cents, quantity]

    def remove(self, name):
        if name not in self.items:
            raise KeyError(name)
        del self.items[name]

    def set_quantity(self, name, quantity):
        if name not in self.items:
            raise KeyError(name)
        if quantity < 0:
            raise ValueError("quantity cannot be negative")
        if quantity == 0:
            del self.items[name]
        else:
            self.items[name][1] = quantity

    def quantity(self, name):
        if name not in self.items:
            return 0
        return self.items[name][1]

    def item_count(self):
        return sum(qty for price, qty in self.items.values())

    def line_total(self, name):
        price, qty = self.items[name]
        return price * qty

    def subtotal(self):
        return sum(price * qty for price, qty in self.items.values())

    def apply_code(self, code):
        code = code.strip().upper()
        if code not in self.codes:
            raise ValueError("unknown code: " + code)
        self.code = code

    def clear_code(self):
        self.code = None

    def discount(self):
        if self.code is None:
            return 0
        kind, amount = self.codes[self.code]
        sub = self.subtotal()
        if kind == "percent":
            value = sub * amount // 100
        else:
            value = amount
        return min(value, sub)

    def taxable(self):
        return self.subtotal() - self.discount()

    def tax(self):
        return (self.taxable() * self.tax_percent + 50) // 100

    def total(self):
        return self.taxable() + self.tax()

    def cheapest(self):
        if not self.items:
            return None
        return min(self.items, key=lambda n: (self.items[n][0], n))

    def priciest(self):
        if not self.items:
            return None
        return max(self.items, key=lambda n: (self.items[n][0], n))

    def receipt(self):
        lines = []
        for name in sorted(self.items):
            price, qty = self.items[name]
            lines.append(f"{name:<10}{qty:>3} x {money(price):>7} = {money(price * qty):>8}")
        lines.append("-" * 32)
        lines.append(f"{'Subtotal':<22}{money(self.subtotal()):>10}")
        if self.code:
            lines.append(f"{'Discount':<22}{money(-self.discount()):>10}")
        lines.append(f"{'Tax':<22}{money(self.tax()):>10}")
        lines.append(f"{'Total':<22}{money(self.total()):>10}")
        return lines


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

    check("money", money(1234), "12.34")
    check("money small", money(5), "0.05")
    check("money zero", money(0), "0.00")
    check("money negative", money(-250), "-2.50")

    cart = Cart(tax_percent=8)
    cart.add("apple", 120, 3)
    cart.add("bread", 250)
    check("item count", cart.item_count(), 4)
    check("apple line", cart.line_total("apple"), 360)
    check("subtotal", cart.subtotal(), 610)
    check("no discount", cart.discount(), 0)
    check("tax no code", cart.tax(), 49)
    check("total no code", cart.total(), 659)

    print()
    cart.apply_code("save10")
    check("percent discount", cart.discount(), 61)
    check("taxable", cart.taxable(), 549)
    check("tax with code", cart.tax(), 44)
    check("total with code", cart.total(), 593)
    cart.apply_code("FIVEOFF")
    check("fixed discount", cart.discount(), 500)
    check("total fixed", cart.total(), 119)
    cart.clear_code()
    check("code cleared", cart.total(), 659)

    print()
    cart.add("apple", 120, 2)
    check("add merges", cart.quantity("apple"), 5)
    cart.set_quantity("apple", 2)
    check("set quantity", cart.quantity("apple"), 2)
    cart.set_quantity("bread", 0)
    check("zero removes", cart.quantity("bread"), 0)
    check("after changes", cart.subtotal(), 240)
    cart.remove("apple")
    check("empty subtotal", cart.subtotal(), 0)
    check("empty total", cart.total(), 0)
    check("empty cheapest", cart.cheapest(), None)

    print()
    check("negative price", raises(lambda: cart.add("x", -1), ValueError), True)
    check("zero quantity", raises(lambda: cart.add("x", 100, 0), ValueError), True)
    check("remove missing", raises(lambda: cart.remove("x"), KeyError), True)
    check("bad code", raises(lambda: cart.apply_code("NOPE"), ValueError), True)
    check("negative tax", raises(lambda: Cart(-1), ValueError), True)
    check("set missing", raises(lambda: cart.set_quantity("x", 1), KeyError), True)

    small = Cart()
    small.add("pen", 200)
    small.apply_code("FIVEOFF")
    check("discount capped", small.discount(), 200)
    check("capped total", small.total(), 0)

    print()
    shop = Cart(tax_percent=10)
    shop.add("milk", 199, 2)
    shop.add("eggs", 349)
    shop.add("rice", 899)
    check("cheapest", shop.cheapest(), "milk")
    check("priciest", shop.priciest(), "rice")
    shop.apply_code("SAVE25")
    for line in shop.receipt():
        print(line)
    check("receipt rows", len(shop.receipt()), 8)
    check("receipt total", shop.receipt()[-1].split()[-1], money(shop.total()))

    print()
    print("Passed      :", sum(results), "of", len(results))
    print("All correct :", all(results))
