import math


class Value:
    def __init__(self, data, children=(), op=""):
        self.data = data
        self.grad = 0.0
        self._children = children
        self._op = op

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), "+")

        def _backward():
            self.grad += out.grad
            other.grad += out.grad

        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), "*")

        def _backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad

        out._backward = _backward
        return out

    def __pow__(self, other):
        assert isinstance(other, (int, float))
        out = Value(self.data ** other, (self,), f"**{other}")

        def _backward():
            self.grad += other * (self.data ** (other - 1)) * out.grad

        out._backward = _backward
        return out

    def relu(self):
        out = Value(self.data if self.data > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (out.data > 0) * out.grad

        out._backward = _backward
        return out

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * out.grad

        out._backward = _backward
        return out

    def __neg__(self):
        return self * -1

    def __sub__(self, other):
        return self + (-other)

    def __truediv__(self, other):
        return self * other ** -1

    def __radd__(self, other):
        return self + other

    def __rmul__(self, other):
        return self * other

    def backward(self):
        topo = []
        visited = set()

        def build(v):
            if v not in visited:
                visited.add(v)
                for child in v._children:
                    build(child)
                topo.append(v)

        build(self)
        self.grad = 1.0
        for v in reversed(topo):
            if hasattr(v, "_backward"):
                v._backward()

    def __repr__(self):
        return f"Value(data={self.data:.4f}, grad={self.grad:.4f})"


if __name__ == "__main__":
    # simple expression
    a = Value(2.0)
    b = Value(-3.0)
    c = Value(10.0)
    d = a * b + c
    e = d.tanh()
    e.backward()
    print("e                    :", e)
    print("a.grad               :", round(a.grad, 4))
    print("b.grad               :", round(b.grad, 4))
    print("c.grad               :", round(c.grad, 4))

    # numerical check
    eps = 1e-6
    a2 = Value(2.0 + eps)
    e2 = (a2 * b + c).tanh()
    num_grad = (e2.data - e.data) / eps
    print("Numerical a.grad     :", round(num_grad, 4))
    print("Matches analytic     :", abs(num_grad - a.grad) < 1e-4)

    # ReLU path
    x = Value(-2.0)
    y = (x * 3 + 1).relu()
    y.backward()
    print()
    print("ReLU output          :", y.data)
    print("x.grad through ReLU  :", x.grad)
    print("Zero as expected     :", x.grad == 0.0)

    x3 = Value(2.0)
    y3 = (x3 * 3 + 1).relu()
    y3.backward()
    print("Positive path grad   :", x3.grad)
    print("Expected 3           :", x3.grad == 3.0)
