class CircularBuffer:
    def __init__(self, capacity):
        self.capacity = capacity
        self.buffer = [None] * capacity
        self.head = 0
        self.tail = 0
        self.size = 0

    def write(self, data):
        self.buffer[self.tail] = data
        self.tail = (self.tail + 1) % self.capacity
        if self.size == self.capacity:
            self.head = (self.head + 1) % self.capacity
        else:
            self.size += 1

    def read(self):
        if self.size == 0:
            return None
        val = self.buffer[self.head]
        self.head = (self.head + 1) % self.capacity
        self.size -= 1
        return val

if __name__ == "__main__":
    cb = CircularBuffer(3)
    cb.write("A")
    cb.write("B")
    cb.write("C")
    cb.write("D")
    
    print("Read 1:", cb.read())
    print("Read 2:", cb.read())
    print("Read 3:", cb.read())
    print("Read 4 (empty):", cb.read())
    
    print("Buffer emptied correctly:", cb.size == 0)
