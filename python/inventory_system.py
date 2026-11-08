class OutOfStockError(Exception):
    pass


class Product:
    def __init__(self, sku, name, price, quantity, reorder_level=5):
        self.sku = sku
        self.name = name
        self.price = price
        self.quantity = quantity
        self.reorder_level = reorder_level

    def value(self):
        return self.price * self.quantity

    def needs_reorder(self):
        return self.quantity <= self.reorder_level


class Inventory:
    def __init__(self):
        self.products = {}
        self.transactions = []

    def add_product(self, product):
        if product.sku in self.products:
            raise ValueError(f"SKU {product.sku} already exists")
        self.products[product.sku] = product

    def get(self, sku):
        if sku not in self.products:
            raise KeyError(f"Unknown SKU {sku}")
        return self.products[sku]

    def restock(self, sku, amount):
        if amount <= 0:
            raise ValueError("Restock amount must be positive")
        product = self.get(sku)
        product.quantity += amount
        self.transactions.append(("restock", sku, amount, 0))
        return product.quantity

    def sell(self, sku, amount):
        product = self.get(sku)
        if amount > product.quantity:
            raise OutOfStockError(
                f"Only {product.quantity} of {product.name} left, requested {amount}"
            )
        product.quantity -= amount
        revenue = product.price * amount
        self.transactions.append(("sale", sku, amount, revenue))
        return revenue

    def place_order(self, items):
        for sku, qty in items:
            product = self.get(sku)
            if qty > product.quantity:
                raise OutOfStockError(
                    f"Order rejected: {product.name} has {product.quantity}, needs {qty}"
                )
        subtotal = sum(self.sell(sku, qty) for sku, qty in items)
        discount = subtotal * 0.10 if subtotal > 1000 else 0
        return round(subtotal - discount, 2)

    def low_stock(self):
        return sorted(p.name for p in self.products.values() if p.needs_reorder())

    def total_value(self):
        return sum(p.value() for p in self.products.values())

    def total_revenue(self):
        return sum(t[3] for t in self.transactions if t[0] == "sale")

    def best_sellers(self, top=3):
        sold = {}
        for kind, sku, amount, _ in self.transactions:
            if kind == "sale":
                sold[sku] = sold.get(sku, 0) + amount
        ranked = sorted(sold.items(), key=lambda item: item[1], reverse=True)
        return [(self.products[sku].name, qty) for sku, qty in ranked[:top]]

    def report(self):
        print(f"{'SKU':<8}{'Name':<18}{'Price':>10}{'Qty':>6}{'Value':>12}")
        print("-" * 54)
        for p in sorted(self.products.values(), key=lambda x: x.sku):
            print(f"{p.sku:<8}{p.name:<18}{p.price:>10,.2f}{p.quantity:>6}{p.value():>12,.2f}")
        print("-" * 54)
        print(f"{'Total value':<42}{self.total_value():>12,.2f}")


if __name__ == "__main__":
    inv = Inventory()
    inv.add_product(Product("L100", "Laptop", 55000, 10, 3))
    inv.add_product(Product("M200", "Mouse", 499, 40, 10))
    inv.add_product(Product("K300", "Keyboard", 1299, 25, 8))
    inv.add_product(Product("H400", "Headphones", 2499, 12, 5))
    inv.add_product(Product("W500", "Webcam", 1899, 6, 5))

    inv.report()
    print()

    print("Sold mouse       :", inv.sell("M200", 15))
    print("Order total      :", inv.place_order([("L100", 2), ("K300", 3)]))
    print("Small order      :", inv.place_order([("M200", 2), ("W500", 1)]))

    try:
        inv.place_order([("H400", 5), ("W500", 10)])
    except OutOfStockError as e:
        print("Error            :", e)

    try:
        inv.sell("X999", 1)
    except KeyError as e:
        print("Error            :", e)

    print("Headphones left  :", inv.get("H400").quantity)
    print("Low stock        :", inv.low_stock())
    print("Restock webcam   :", inv.restock("W500", 20))
    print("Low stock        :", inv.low_stock())
    print("Best sellers     :", inv.best_sellers())
    print("Total revenue    :", inv.total_revenue())
    print()
    inv.report()
