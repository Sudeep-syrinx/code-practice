class Bitset:
    def __init__(self, size):
        self.size = size
        self.data = bytearray((size + 7) // 8)

    def set(self, i):
        self.data[i // 8] |= (1 << (i % 8))

    def clear(self, i):
        self.data[i // 8] &= ~(1 << (i % 8))

    def get(self, i):
        return (self.data[i // 8] & (1 << (i % 8))) != 0

    def count_ones(self):
        return sum(bin(b).count('1') for b in self.data)

if __name__ == "__main__":
    bs = Bitset(100)
    bs.set(5)
    bs.set(10)
    bs.set(99)
    print("Bit 5:", bs.get(5))
    print("Bit 6:", bs.get(6))
    print("Total Ones:", bs.count_ones())
    print("Test passed:", bs.count_ones() == 3 and bs.get(99))
