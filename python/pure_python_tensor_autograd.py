import math
import random

# --- 1. TENSOR & AUTOGRAD ENGINE ---
class Tensor:
    def __init__(self, data, _children=(), _op='', requires_grad=False):
        self.data = data
        self.grad = 0.0
        self._backward = lambda: None
        self._prev = set(_children)
        self._op = _op
        self.requires_grad = requires_grad

    def __repr__(self):
        return f"Tensor(data={self.data:.4f}, grad={self.grad:.4f})"

    def __add__(self, other):
        other = other if isinstance(other, Tensor) else Tensor(other)
        out = Tensor(self.data + other.data, (self, other), '+')
        def _backward():
            self.grad += 1.0 * out.grad
            other.grad += 1.0 * out.grad
        out._backward = _backward
        return out

    def __radd__(self, other): return self + other

    def __mul__(self, other):
        other = other if isinstance(other, Tensor) else Tensor(other)
        out = Tensor(self.data * other.data, (self, other), '*')
        def _backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _backward
        return out

    def __rmul__(self, other): return self * other

    def __pow__(self, other):
        assert isinstance(other, (int, float)), "only supporting int/float powers for now"
        out = Tensor(self.data**other, (self,), f'**{other}')
        def _backward():
            self.grad += (other * (self.data ** (other - 1))) * out.grad
        out._backward = _backward
        return out

    def __neg__(self): return self * -1
    def __sub__(self, other): return self + (-other)
    def __rsub__(self, other): return other + (-self)

    def relu(self):
        out = Tensor(self.data if self.data > 0 else 0, (self,), 'ReLU')
        def _backward():
            self.grad += (1.0 if self.data > 0 else 0.0) * out.grad
        out._backward = _backward
        return out

    def backward(self):
        topo = []
        visited = set()
        def build_topo(v):
            if v not in visited:
                visited.add(v)
                for child in v._prev:
                    build_topo(child)
                topo.append(v)
        build_topo(self)
        self.grad = 1.0
        for node in reversed(topo):
            node._backward()

# --- 2. NEURAL NETWORK MODULES ---
class Module:
    def zero_grad(self):
        for p in self.parameters():
            p.grad = 0.0
    def parameters(self):
        return []

class Neuron(Module):
    def __init__(self, nin):
        self.w = [Tensor(random.uniform(-1,1), requires_grad=True) for _ in range(nin)]
        self.b = Tensor(random.uniform(-1,1), requires_grad=True)
    def __call__(self, x):
        act = sum((wi*xi for wi, xi in zip(self.w, x)), self.b)
        return act
    def parameters(self):
        return self.w + [self.b]

class Layer(Module):
    def __init__(self, nin, nout, **kwargs):
        self.neurons = [Neuron(nin) for _ in range(nout)]
    def __call__(self, x):
        outs = [n(x) for n in self.neurons]
        return outs[0] if len(outs) == 1 else outs
    def parameters(self):
        return [p for n in self.neurons for p in n.parameters()]

class MLP(Module):
    def __init__(self, nin, nouts):
        sz = [nin] + nouts
        self.layers = [Layer(sz[i], sz[i+1]) for i in range(len(nouts))]
    def __call__(self, x):
        for layer in self.layers:
            x = layer(x)
            if isinstance(x, list):
                x = [xi.relu() for xi in x]
            else:
                x = x.relu()
        return x
    def parameters(self):
        return [p for layer in self.layers for p in layer.parameters()]

# --- 3. OPTIMIZER & LOSS ---
class SGD:
    def __init__(self, parameters, lr=0.01):
        self.parameters = parameters
        self.lr = lr
    def step(self):
        for p in self.parameters:
            p.data -= self.lr * p.grad

def mse_loss(preds, targets):
    total = sum((p - t)**2 for p, t in zip(preds, targets))
    # Multiply by 1/len instead of dividing to use existing __mul__
    return total * (1.0 / len(preds))

if __name__ == "__main__":
    print("--- PURE PYTHON AUTOGRAD & ML ENGINE ---")
    random.seed(1337)
    
    # Tiny dataset: Binary XOR
    xs = [
        [2.0, 3.0, -1.0],
        [3.0, -1.0, 0.5],
        [0.5, 1.0, 1.0],
        [1.0, 1.0, -1.0]
    ]
    ys = [1.0, -1.0, -1.0, 1.0]
    
    # 3 inputs, two hidden layers of 4, 1 output
    model = MLP(3, [4, 4, 1])
    optimizer = SGD(model.parameters(), lr=0.05)
    
    print("Training MLP on toy dataset...")
    for k in range(20):
        # Forward pass
        ypred = [model(x) for x in xs]
        loss = mse_loss(ypred, ys)
        
        # Backward pass
        model.zero_grad()
        loss.backward()
        
        # Update
        optimizer.step()
        
        if k % 5 == 0 or k == 19:
            print(f"Step {k:02d} | Loss: {loss.data:.4f}")
            
    print("\nFinal Predictions:")
    for x, y, yp in zip(xs, ys, ypred):
        print(f"Target: {y:2.0f} | Prediction: {yp.data:5.2f}")
