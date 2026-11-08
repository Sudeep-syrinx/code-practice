from collections import Counter
from enum import Enum


class State(Enum):
    IDLE = "idle"
    HAS_MONEY = "has money"
    DISPENSING = "dispensing"
    OUT_OF_SERVICE = "out of service"


class Slot:
    def __init__(self, code, name, price, quantity):
        self.code = code
        self.name = name
        self.price = price
        self.quantity = quantity


class VendingMachine:
    COINS = (1, 2, 5, 10, 20, 50)

    def __init__(self, change_per_coin=10):
        self.state = State.IDLE
        self.balance = 0
        self.inserted = []
        self.slots = {}
        self.cash = {c: change_per_coin for c in self.COINS}
        self.sales = []
        self.history = []

    def _set_state(self, new_state):
        if new_state != self.state:
            self.history.append((self.state.value, new_state.value))
            self.state = new_state

    def stock(self, code, name, price, quantity):
        if code in self.slots:
            self.slots[code].quantity += quantity
        else:
            self.slots[code] = Slot(code, name, price, quantity)

    def insert_coin(self, coin):
        if self.state == State.OUT_OF_SERVICE:
            return "Machine is out of service"
        if coin not in self.COINS:
            return f"Coin {coin} rejected"
        self.balance += coin
        self.inserted.append(coin)
        self.cash[coin] += 1
        self._set_state(State.HAS_MONEY)
        return f"Balance is {self.balance}"

    def make_change(self, amount):
        change = {}
        remaining = amount
        for coin in sorted(self.COINS, reverse=True):
            take = min(remaining // coin, self.cash[coin])
            if take:
                change[coin] = take
                remaining -= take * coin
        return change if remaining == 0 else None

    def _refund(self):
        coins = Counter(self.inserted)
        for coin, n in coins.items():
            self.cash[coin] -= n
        self.balance = 0
        self.inserted = []
        self._set_state(State.IDLE)
        return dict(sorted(coins.items(), reverse=True))

    def cancel(self):
        if not self.inserted:
            return "Nothing to refund"
        return f"Refunded {self._refund()}"

    def select(self, code):
        if self.state == State.OUT_OF_SERVICE:
            return "Machine is out of service"
        slot = self.slots.get(code)
        if slot is None:
            return f"Invalid code {code}"
        if slot.quantity == 0:
            return f"{slot.name} is sold out"
        if self.balance < slot.price:
            return f"Insert {slot.price - self.balance} more for {slot.name}"
        change = self.make_change(self.balance - slot.price)
        if change is None:
            refund = self._refund()
            return f"No exact change available, refunded {refund}"
        self._set_state(State.DISPENSING)
        for coin, n in change.items():
            self.cash[coin] -= n
        slot.quantity -= 1
        self.sales.append((slot.code, slot.name, slot.price))
        self.balance = 0
        self.inserted = []
        self._set_state(State.IDLE)
        return f"Dispensed {slot.name}, change {change}"

    def set_service(self, on):
        if on:
            if self.inserted:
                self._refund()
            self._set_state(State.OUT_OF_SERVICE)
            return "Service mode on"
        self._set_state(State.IDLE)
        return "Service mode off"

    def revenue(self):
        return sum(price for _, _, price in self.sales)

    def report(self):
        print(f"{'Code':<6}{'Item':<10}{'Price':>6}{'Left':>6}")
        print("-" * 28)
        for slot in sorted(self.slots.values(), key=lambda s: s.code):
            print(f"{slot.code:<6}{slot.name:<10}{slot.price:>6}{slot.quantity:>6}")
        print("-" * 28)
        print("Cash in machine:", sum(c * n for c, n in self.cash.items()))
        print("Revenue        :", self.revenue())


def run(machine, steps):
    for action, arg in steps:
        if action == "insert":
            result = machine.insert_coin(arg)
        elif action == "select":
            result = machine.select(arg)
        elif action == "cancel":
            result = machine.cancel()
        else:
            result = machine.set_service(arg)
        label = "" if arg is None else str(arg)
        print(f"{action:<8}{label:<7}-> {result}")


if __name__ == "__main__":
    vm = VendingMachine()
    vm.stock("A1", "Chips", 25, 2)
    vm.stock("A2", "Soda", 35, 1)
    vm.stock("B1", "Candy", 15, 5)

    steps = [
        ("insert", 20), ("select", "A1"), ("insert", 5), ("select", "A1"),
        ("insert", 50), ("select", "A2"),
        ("insert", 50), ("select", "A2"), ("cancel", None),
        ("insert", 10), ("select", "B1"), ("cancel", None),
        ("select", "Z9"), ("insert", 3),
        ("service", True), ("insert", 5), ("service", False), ("cancel", None),
    ]
    run(vm, steps)

    print()
    vm.report()
    print("State changes  :", len(vm.history))
    print("Last changes   :", vm.history[-3:])

    print()
    print("Machine with no coins for change")
    poor = VendingMachine(change_per_coin=0)
    poor.stock("B1", "Candy", 15, 3)
    run(poor, [("insert", 50), ("select", "B1"), ("insert", 10), ("insert", 5), ("select", "B1")])
    poor.report()
