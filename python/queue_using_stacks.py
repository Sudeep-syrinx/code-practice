class QueueUsingStacks:
    def __init__(self):
        self.stack_in = []
        self.stack_out = []

    def push(self, x):
        self.stack_in.append(x)

    def pop(self):
        if not self.stack_out:
            while self.stack_in:
                self.stack_out.append(self.stack_in.pop())
        if not self.stack_out:
            return None
        return self.stack_out.pop()

    def peek(self):
        if not self.stack_out:
            while self.stack_in:
                self.stack_out.append(self.stack_in.pop())
        if not self.stack_out:
            return None
        return self.stack_out[-1]

    def empty(self):
        return not self.stack_in and not self.stack_out

if __name__ == "__main__":
    q = QueueUsingStacks()
    q.push(1)
    q.push(2)
    print("Peek:", q.peek())
    print("Pop:", q.pop())
    print("Empty:", q.empty())
    print("Test passed:", q.peek() == 2 and q.pop() == 2 and q.empty() is True)
