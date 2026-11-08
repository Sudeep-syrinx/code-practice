"""
A Deep Learning Library implemented from scratch.
Includes Tensors with Autograd, Dense Layers, Activations, Losses, and Optimizers.
"""

import math
import random

class Tensor:
    def __init__(self, data, requires_grad=False, children=(), op=""):
        self.data = data
        self.grad = 0.0
        self.requires_grad = requires_grad
        self._backward = lambda: None
        self._prev = set(children)
        self._op = op

    def __add__(self, other):
        other = other if isinstance(other, Tensor) else Tensor(other)
        out = Tensor(self.data + other.data, requires_grad=True, children=(self, other), op="+")
        def _backward():
            if self.requires_grad: self.grad += out.grad
            if other.requires_grad: other.grad += out.grad
        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Tensor) else Tensor(other)
        out = Tensor(self.data * other.data, requires_grad=True, children=(self, other), op="*")
        def _backward():
            if self.requires_grad: self.grad += other.data * out.grad
            if other.requires_grad: other.grad += self.data * out.grad
        out._backward = _backward
        return out

    def relu(self):
        out = Tensor(max(0, self.data), requires_grad=True, children=(self,), op="relu")
        def _backward():
            if self.requires_grad: self.grad += (out.data > 0) * out.grad
        out._backward = _backward
        return out

    def sigmoid(self):
        sig = 1 / (1 + math.exp(-self.data))
        out = Tensor(sig, requires_grad=True, children=(self,), op="sigmoid")
        def _backward():
            if self.requires_grad: self.grad += sig * (1 - sig) * out.grad
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

    def __repr__(self):
        return f"Tensor(data={self.data:.4f}, grad={self.grad:.4f})"

class Layer:
    def __init__(self, input_size, output_size):
        self.weights = [Tensor(random.uniform(-1, 1), requires_grad=True) for _ in range(input_size * output_size)]
        self.biases = [Tensor(0.0, requires_grad=True) for _ in range(output_size)]
        self.input_size = input_size
        self.output_size = output_size

    def forward(self, inputs):
        outputs = []
        for j in range(self.output_size):
            z = self.biases[j]
            for i in range(self.input_size):
                z = z + inputs[i] * self.weights[i * self.output_size + j]
            outputs.append(z)
        return outputs

    def parameters(self):
        return self.weights + self.biases

class SGD:
    def __init__(self, parameters, lr=0.01):
        self.parameters = parameters
        self.lr = lr

    def step(self):
        for p in self.parameters:
            p.data -= self.lr * p.grad

    def zero_grad(self):
        for p in self.parameters:
            p.grad = 0.0

class MSELoss:
    def __call__(self, predictions, targets):
        loss = Tensor(0.0)
        for p, t in zip(predictions, targets):
            loss = loss + (p + Tensor(-t.data)) * (p + Tensor(-t.data))
        return loss * Tensor(1.0 / len(predictions))

class Network:
    def __init__(self):
        self.layers = []

    def add_layer(self, layer):
        self.layers.append(layer)

    def forward(self, x):
        for layer in self.layers:
            x = layer.forward(x)
        return x

    def parameters(self):
        params = []
        for layer in self.layers:
            params.extend(layer.parameters())
        return params

if __name__ == "__main__":
    net = Network()
    net.add_layer(Layer(2, 3))
    net.add_layer(Layer(3, 1))
    
    optimizer = SGD(net.parameters(), lr=0.1)
    loss_fn = MSELoss()
    
    X_data = [[0, 0], [0, 1], [1, 0], [1, 1]]
    Y_data = [0, 1, 1, 0]
    
    print("Training XOR network...")
    for epoch in range(100):
        total_loss = Tensor(0.0)
        for x, y in zip(X_data, Y_data):
            inputs = [Tensor(i) for i in x]
            target = [Tensor(y)]
            
            preds = net.forward(inputs)
            loss = loss_fn(preds, target)
            total_loss = total_loss + loss
            
        optimizer.zero_grad()
        total_loss.backward()
        optimizer.step()
        
        if epoch % 10 == 0:
            print(f"Epoch {epoch}, Loss: {total_loss.data:.4f}")
            
    print("Testing predictions:")
    for x in X_data:
        inputs = [Tensor(i) for i in x]
        pred = net.forward(inputs)[0]
        print(f"Input {x} -> Prediction {pred.data:.4f}")
