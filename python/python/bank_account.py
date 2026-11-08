class InsufficientFundsError(Exception):
    pass


class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance
        self.history = []

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("Deposit must be positive")
        self.balance += amount
        self.history.append(("deposit", amount))
        return self.balance

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("Withdrawal must be positive")
        if amount > self.balance:
            raise InsufficientFundsError(
                f"Cannot withdraw {amount}, balance is {self.balance}"
            )
        self.balance -= amount
        self.history.append(("withdraw", amount))
        return self.balance

    def transfer(self, other, amount):
        self.withdraw(amount)
        other.deposit(amount)
        self.history.append(("transfer to " + other.owner, amount))

    def statement(self):
        lines = [f"Statement for {self.owner}"]
        for kind, amount in self.history:
            lines.append(f"  {kind:<20} {amount:>8}")
        lines.append(f"  {'Balance':<20} {self.balance:>8}")
        return "\n".join(lines)


if __name__ == "__main__":
    acc = BankAccount("Sudeep", 1000)
    other = BankAccount("Ravi", 500)
    print(acc.deposit(500))      # expected 1500
    print(acc.withdraw(200))     # expected 1300
    try:
        acc.withdraw(5000)
    except InsufficientFundsError as e:
        print("Error:", e)       # expected Error: Cannot withdraw 5000, balance is 1300
    acc.transfer(other, 300)
    print(acc.balance)           # expected 1000
    print(other.balance)         # expected 800
    print(acc.statement())
