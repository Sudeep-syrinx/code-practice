class EventSourcedAccount:
    def __init__(self, account_id):
        self.account_id = account_id
        self.events = []
        self.balance = 0

    def deposit(self, amount):
        if amount <= 0: raise ValueError("Deposit must be positive")
        self._apply({"type": "Deposited", "amount": amount})

    def withdraw(self, amount):
        if amount <= 0: raise ValueError("Withdrawal must be positive")
        if amount > self.balance: raise ValueError("Insufficient funds")
        self._apply({"type": "Withdrawn", "amount": amount})

    def _apply(self, event):
        self.events.append(event)
        if event["type"] == "Deposited":
            self.balance += event["amount"]
        elif event["type"] == "Withdrawn":
            self.balance -= event["amount"]

def rebuild_from_history(history):
    account = EventSourcedAccount(history[0].get("account_id"))
    for event in history:
        account._apply(event)
    return account

if __name__ == "__main__":
    acct = EventSourcedAccount("A100")
    acct.deposit(500)
    acct.withdraw(200)
    acct.deposit(1000)
    
    print("Current Balance:", acct.balance)
    print("Events Recorded:", len(acct.events))
    
    rebuilt = rebuild_from_history(acct.events)
    print("Rebuilt Balance:", rebuilt.balance)
    print("State Matches:", acct.balance == rebuilt.balance)
