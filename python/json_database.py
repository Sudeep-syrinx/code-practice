import copy

class JSONDatabase:
    def __init__(self):
        self.data = {}
        self.transactions = []
        self.in_transaction = False

    def set(self, key, value):
        if self.in_transaction:
            self.transactions[-1][key] = value
        else:
            self.data[key] = value

    def get(self, key):
        if self.in_transaction:
            for t in reversed(self.transactions):
                if key in t:
                    return t[key]
        return self.data.get(key)

    def delete(self, key):
        if self.in_transaction:
            self.transactions[-1][key] = None
        else:
            self.data.pop(key, None)

    def begin(self):
        if self.in_transaction:
            raise Exception("Transaction already active")
        self.transactions.append({})
        self.in_transaction = True

    def commit(self):
        if not self.in_transaction:
            raise Exception("No active transaction")
        for t in self.transactions:
            for k, v in t.items():
                if v is None:
                    self.data.pop(k, None)
                else:
                    self.data[k] = v
        self.transactions = []
        self.in_transaction = False

    def rollback(self):
        if not self.in_transaction:
            raise Exception("No active transaction")
        self.transactions.pop()
        if not self.transactions:
            self.in_transaction = False

if __name__ == "__main__":
    db = JSONDatabase()
    db.set("name", "Alice")
    print("Name:", db.get("name"))
    db.begin()
    db.set("name", "Bob")
    db.set("age", 30)
    print("Inside transaction - Name:", db.get("name"))
    db.rollback()
    print("After rollback - Name:", db.get("name"))
    print("After rollback - Age:", db.get("age"))
    db.begin()
    db.set("name", "Charlie")
    db.commit()
    print("After commit - Name:", db.get("name"))
    print("Test passed:", db.get("name") == "Charlie" and db.get("age") is None)
