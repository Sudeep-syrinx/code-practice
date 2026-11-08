class MinStack:
    def __init__(self):
        self.stack = []
        self.min_stack = []

    def push(self, val):
        self.stack.append(val)
        if not self.min_stack or val <= self.min_stack[-1]:
            self.min_stack.append(val)

    def pop(self):
        if not self.stack: return None
        val = self.stack.pop()
        if val == self.min_stack[-1]:
            self.min_stack.pop()
        return val

    def top(self):
        return self.stack[-1] if self.stack else None

    def get_min(self):
        return self.min_stack[-1] if self.min_stack else None

class MaxQueue:
    def __init__(self):
        self.queue = []
        self.deque = []

    def enqueue(self, val):
        self.queue.append(val)
        while self.deque and self.deque[-1] < val:
            self.deque.pop()
        self.deque.append(val)

    def dequeue(self):
        if not self.queue: return None
        val = self.queue.pop(0)
        if val == self.deque[0]:
            self.deque.pop(0)
        return val

    def get_max(self):
        return self.deque[0] if self.deque else None

if __name__ == "__main__":
    ms = MinStack()
    ms.push(5)
    ms.push(3)
    ms.push(7)
    ms.push(2)
    print("MinStack min:", ms.get_min())
    ms.pop()
    print("After pop, min:", ms.get_min())
    
    mq = MaxQueue()
    mq.enqueue(4)
    mq.enqueue(9)
    mq.enqueue(2)
    print("MaxQueue max:", mq.get_max())
    mq.dequeue()
    print("After dequeue, max:", mq.get_max())
    print("Queue works:", ms.get_min() == 3 and mq.get_max() == 9)
