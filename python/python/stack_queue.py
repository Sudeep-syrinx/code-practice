from collections import deque


class Stack:
    def __init__(self):
        self.items = []

    def push(self, item):
        self.items.append(item)

    def pop(self):
        if self.is_empty():
            raise IndexError("pop from empty stack")
        return self.items.pop()

    def peek(self):
        if self.is_empty():
            raise IndexError("peek from empty stack")
        return self.items[-1]

    def is_empty(self):
        return len(self.items) == 0

    def __len__(self):
        return len(self.items)


class Queue:
    def __init__(self):
        self.items = deque()

    def enqueue(self, item):
        self.items.append(item)

    def dequeue(self):
        if self.is_empty():
            raise IndexError("dequeue from empty queue")
        return self.items.popleft()

    def front(self):
        if self.is_empty():
            raise IndexError("front of empty queue")
        return self.items[0]

    def is_empty(self):
        return len(self.items) == 0

    def __len__(self):
        return len(self.items)


def evaluate_postfix(expression):
    stack = Stack()
    for token in expression.split():
        if token in "+-*/":
            b = stack.pop()
            a = stack.pop()
            if token == "+":
                stack.push(a + b)
            elif token == "-":
                stack.push(a - b)
            elif token == "*":
                stack.push(a * b)
            else:
                stack.push(a / b)
        else:
            stack.push(float(token))
    return stack.pop()


if __name__ == "__main__":
    s = Stack()
    for x in [1, 2, 3]:
        s.push(x)
    print(s.pop())        # expected 3
    print(s.peek())       # expected 2
    print(len(s))         # expected 2

    q = Queue()
    for x in ["a", "b", "c"]:
        q.enqueue(x)
    print(q.dequeue())    # expected a
    print(q.front())      # expected b
    print(len(q))         # expected 2

    print(evaluate_postfix("2 3 + 4 *"))   # expected 20.0
    print(evaluate_postfix("10 2 8 * + 3 -"))  # expected 23.0
