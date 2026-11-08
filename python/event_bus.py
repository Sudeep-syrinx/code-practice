import fnmatch


class EventBus:
    def __init__(self):
        self.handlers = {}
        self.middleware = []
        self.history = []
        self.errors = []
        self.counter = 0

    def use(self, func):
        self.middleware.append(func)

    def subscribe(self, topic, handler, priority=0):
        self.counter += 1
        self.handlers.setdefault(topic, []).append((priority, self.counter, handler))

    def unsubscribe(self, topic, handler):
        entries = self.handlers.get(topic, [])
        for entry in entries:
            if entry[2] == handler:
                entries.remove(entry)
                return True
        return False

    def publish(self, topic, payload=None):
        event = {"topic": topic, "payload": dict(payload or {})}
        for func in self.middleware:
            event = func(event)
            if event is None:
                return 0
        self.history.append(event["topic"])
        matched = []
        for pattern, entries in self.handlers.items():
            if fnmatch.fnmatchcase(event["topic"], pattern):
                matched.extend(entries)
        matched.sort(key=lambda e: (-e[0], e[1]))
        delivered = 0
        for _, _, handler in matched:
            try:
                handler(event)
                delivered += 1
            except Exception as exc:
                self.errors.append((event["topic"], type(exc).__name__, str(exc)))
        return delivered


PRICES = {"pen": 10, "book": 250, "bag": 900}


class Shop:
    def __init__(self, bus):
        self.stock = {"pen": 5, "book": 2, "bag": 1}
        self.revenue = 0
        self.emails = []
        self.audit = []
        self.total_events = 0
        bus.subscribe("order.placed", self.reserve, priority=10)
        bus.subscribe("order.placed", self.charge, priority=5)
        bus.subscribe("order.placed", self.email, priority=1)
        bus.subscribe("order.*", self.record, priority=0)
        bus.subscribe("*", self.count_all)

    def reserve(self, event):
        p = event["payload"]
        if self.stock.get(p["item"], 0) < p["qty"]:
            p["rejected"] = True
            raise ValueError(f"Out of stock: {p['item']}")
        self.stock[p["item"]] -= p["qty"]

    def charge(self, event):
        p = event["payload"]
        if p.get("rejected"):
            return
        self.revenue += PRICES[p["item"]] * p["qty"]

    def email(self, event):
        p = event["payload"]
        if p.get("rejected"):
            self.emails.append(f"Sorry {p['customer']}, {p['item']} is unavailable")
        else:
            self.emails.append(f"Thanks {p['customer']}: {p['qty']} x {p['item']}")

    def record(self, event):
        self.audit.append((event["seq"], event["topic"]))

    def count_all(self, event):
        self.total_events += 1


def drop_spam(event):
    if event["payload"].get("customer") == "spam-bot":
        return None
    return event


def make_sequencer():
    state = {"n": 0}

    def stamp(event):
        state["n"] += 1
        event["seq"] = state["n"]
        return event

    return stamp


if __name__ == "__main__":
    bus = EventBus()
    bus.use(drop_spam)
    bus.use(make_sequencer())
    shop = Shop(bus)

    orders = [
        ("asha", "pen", 2), ("ravi", "book", 1), ("meena", "book", 3),
        ("spam-bot", "pen", 1), ("kiran", "bag", 1), ("anita", "bag", 1),
        ("asha", "pen", 3), ("ravi", "pen", 1),
    ]
    for customer, item, qty in orders:
        delivered = bus.publish("order.placed", {"customer": customer, "item": item, "qty": qty})
        print(f"{customer:<9}{item:<6}{qty} -> handlers run: {delivered}")

    print()
    print("Cancelled order handlers:", bus.publish("order.cancelled", {"customer": "asha"}))
    print("Login event handlers    :", bus.publish("user.login", {"customer": "asha"}))

    print()
    print("Stock    :", shop.stock)
    print("Revenue  :", shop.revenue)
    print("Events   :", shop.total_events)
    print("History  :", len(bus.history))
    print("Audit    :", shop.audit[:4], "...")
    print()
    print("Emails")
    for line in shop.emails:
        print(" ", line)
    print()
    print("Errors captured")
    for topic, kind, message in bus.errors:
        print(f"  {topic}: {kind}: {message}")

    print()
    print("Unsubscribe count_all :", bus.unsubscribe("*", shop.count_all))
    print("Unsubscribe again     :", bus.unsubscribe("*", shop.count_all))
    before = shop.total_events
    bus.publish("user.logout", {"customer": "asha"})
    print("Counter unchanged     :", shop.total_events == before)
    print("Revenue is 1200       :", shop.revenue == 1200)
