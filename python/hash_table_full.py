class HashTable:
    def __init__(self, size=10):
        self.size = size
        self.table = [[] for _ in range(size)]

    def _hash(self, key):
        return hash(key) % self.size

    def insert(self, key, value):
        index = self._hash(key)
        for i, (k, v) in enumerate(self.table[index]):
            if k == key:
                self.table[index][i] = (key, value)
                return
        self.table[index].append((key, value))

    def get(self, key):
        index = self._hash(key)
        for k, v in self.table[index]:
            if k == key:
                return v
        return None

    def remove(self, key):
        index = self._hash(key)
        for i, (k, v) in enumerate(self.table[index]):
            if k == key:
                self.table[index].pop(i)
                return True
        return False

if __name__ == "__main__":
    ht = HashTable()
    ht.insert("apple", 10)
    ht.insert("banana", 20)
    print("Get apple:", ht.get("apple"))
    ht.remove("apple")
    print("Get apple after remove:", ht.get("apple"))
    print("Test passed:", ht.get("apple") is None)

# ==============================================================================
# EXTENDED HASH TABLE OPERATIONS
# ==============================================================================

class HashTableExtended:
    def __init__(self, size=100):
        self.size = size
        self.table = [[] for _ in range(size)]

    def _hash(self, key):
        h = 0
        for char in str(key):
            h = (h * 31 + ord(char)) % self.size
        return h

    def insert(self, key, value):
        index = self._hash(key)
        for i, (k, v) in enumerate(self.table[index]):
            if k == key:
                self.table[index][i] = (key, value)
                return
        self.table[index].append((key, value))

    def get(self, key):
        index = self._hash(key)
        for k, v in self.table[index]:
            if k == key:
                return v
        return None

    def delete(self, key):
        index = self._hash(key)
        for i, (k, v) in enumerate(self.table[index]):
            if k == key:
                self.table[index].pop(i)
                return True
        return False

    def keys(self):
        result = []
        for bucket in self.table:
            for k, v in bucket:
                result.append(k)
        return result

    def values(self):
        result = []
        for bucket in self.table:
            for k, v in bucket:
                result.append(v)
        return result

    def items(self):
        result = []
        for bucket in self.table:
            for k, v in bucket:
                result.append((k, v))
        return result

    def load_factor(self):
        total_items = sum(len(bucket) for bucket in self.table)
        return total_items / self.size

def test_hash_table_extended():
    ht = HashTableExtended()
    ht.insert("name", "Alice")
    ht.insert("age", 30)
    ht.insert("city", "New York")
    print("Keys:", ht.keys())
    print("Values:", ht.values())
    print("Items:", ht.items())
    print("Load factor:", ht.load_factor())
    ht.delete("age")
    print("Keys after delete:", ht.keys())

if __name__ == "__main__":
    test_hash_table_extended()
