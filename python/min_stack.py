class MinStack:
    def __init__(self):
        self.stack = []
        self.min_stack = []

    def push(self, val):
        self.stack.append(val)
        if not self.min_stack or val <= self.min_stack[-1]:
            self.min_stack.append(val)

    def pop(self):
        if not self.stack:
            return None
        val = self.stack.pop()
        if val == self.min_stack[-1]:
            self.min_stack.pop()
        return val

    def top(self):
        return self.stack[-1] if self.stack else None

    def get_min(self):
        return self.min_stack[-1] if self.min_stack else None

if __name__ == "__main__":
    ms = MinStack()
    ms.push(5)
    ms.push(3)
    ms.push(7)
    ms.push(2)
    print("Min after pushes:", ms.get_min())
    ms.pop()
    print("Min after pop:", ms.get_min())
    print("Test passed:", ms.get_min() == 3)
