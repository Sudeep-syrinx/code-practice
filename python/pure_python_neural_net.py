import random
import math
from typing import List, Union

# --- MATRIX OPS (NumPy alternative) ---
class Matrix:
    def __init__(self, data: List[List[float]]):
        self.data = data
        self.rows = len(data)
        self.cols = len(data[0]) if self.rows > 0 else 0

    @classmethod
    def zeros(cls, rows: int, cols: int):
        return cls([[0.0 for _ in range(cols)] for _ in range(rows)])

    @classmethod
    def random_normal(cls, rows: int, cols: int, std: float = 0.1):
        # Box-Muller transform for normal distribution
        data = []
        for _ in range(rows):
            row = []
            for _ in range(cols):
                u1, u2 = random.random(), random.random()
                z0 = math.sqrt(-2.0 * math.log(max(u1, 1e-10))) * math.cos(2.0 * math.pi * u2)
                row.append(z0 * std)
            data.append(row)
        return cls(data)

    def add(self, other: Union['Matrix', List[float]]):
        res = Matrix.zeros(self.rows, self.cols)
        if isinstance(other, Matrix):
            for i in range(self.rows):
                for j in range(self.cols):
                    res.data[i][j] = self.data[i][j] + other.data[i][j]
        else: # Add broadcast vector (1D)
            for i in range(self.rows):
                for j in range(self.cols):
                    res.data[i][j] = self.data[i][j] + other[j]
        return res

    def sub(self, other: 'Matrix'):
        res = Matrix.zeros(self.rows, self.cols)
        for i in range(self.rows):
            for j in range(self.cols):
                res.data[i][j] = self.data[i][j] - other.data[i][j]
        return res

    def mul(self, other: float):
        res = Matrix.zeros(self.rows, self.cols)
        for i in range(self.rows):
            for j in range(self.cols):
                res.data[i][j] = self.data[i][j] * other
        return res

    def element_mul(self, other: 'Matrix'):
        res = Matrix.zeros(self.rows, self.cols)
        for i in range(self.rows):
            for j in range(self.cols):
                res.data[i][j] = self.data[i][j] * other.data[i][j]
        return res

    def dot(self, other: 'Matrix'):
        if self.cols != other.rows: raise ValueError("Dimension mismatch for dot product")
        res = Matrix.zeros(self.rows, other.cols)
        for i in range(self.rows):
            for k in range(self.cols):
                val = self.data[i][k]
                for j in range(other.cols):
                    res.data[i][j] += val * other.data[k][j]
        return res

    def transpose(self):
        res = Matrix.zeros(self.cols, self.rows)
        for i in range(self.rows):
            for j in range(self.cols):
                res.data[j][i] = self.data[i][j]
        return res

    def apply(self, func):
        res = Matrix.zeros(self.rows, self.cols)
        for i in range(self.rows):
            for j in range(self.cols):
                res.data[i][j] = func(self.data[i][j])
        return res

# --- NEURAL NETWORK LAYERS ---
class Layer:
    def forward(self, inputs: Matrix) -> Matrix: raise NotImplementedError
    def backward(self, d_out: Matrix) -> Matrix: raise NotImplementedError
    def get_params(self): return []

class Linear(Layer):
    def __init__(self, input_dim: int, output_dim: int):
        self.weights = Matrix.random_normal(input_dim, output_dim, std=math.sqrt(2.0/input_dim))
        self.biases = [0.0 for _ in range(output_dim)]
        self.inputs = None
        self.dW = None
        self.db = None

    def forward(self, inputs: Matrix) -> Matrix:
        self.inputs = inputs
        # Y = X*W + b
        return inputs.dot(self.weights).add(self.biases)

    def backward(self, d_out: Matrix) -> Matrix:
        # dW = X^T * d_out
        self.dW = self.inputs.transpose().dot(d_out)
        # db = sum(d_out, axis=0)
        self.db = [sum(d_out.data[i][j] for i in range(d_out.rows)) for j in range(d_out.cols)]
        # dX = d_out * W^T
        return d_out.dot(self.weights.transpose())

    def get_params(self):
        return [(self.weights, self.dW), (self.biases, self.db)]

class ReLU(Layer):
    def __init__(self):
        self.inputs = None

    def forward(self, inputs: Matrix) -> Matrix:
        self.inputs = inputs
        return inputs.apply(lambda x: max(0.0, x))

    def backward(self, d_out: Matrix) -> Matrix:
        mask = self.inputs.apply(lambda x: 1.0 if x > 0 else 0.0)
        return d_out.element_mul(mask)

class Softmax(Layer):
    def __init__(self):
        self.out = None

    def forward(self, inputs: Matrix) -> Matrix:
        res = Matrix.zeros(inputs.rows, inputs.cols)
        for i in range(inputs.rows):
            row_max = max(inputs.data[i])
            exp_sum = sum(math.exp(x - row_max) for x in inputs.data[i])
            for j in range(inputs.cols):
                res.data[i][j] = math.exp(inputs.data[i][j] - row_max) / exp_sum
        self.out = res
        return res

    def backward(self, d_out: Matrix) -> Matrix:
        # Simplified assumption: paired with CrossEntropyLoss
        return d_out

# --- LOSS & OPTIMIZER ---
class CrossEntropyLoss:
    def forward(self, predictions: Matrix, targets: Matrix) -> float:
        self.preds = predictions
        self.targets = targets
        loss = 0.0
        for i in range(predictions.rows):
            for j in range(predictions.cols):
                if targets.data[i][j] == 1.0:
                    loss -= math.log(max(predictions.data[i][j], 1e-15))
        return loss / predictions.rows

    def backward(self) -> Matrix:
        # Combines backward of Softmax and CrossEntropy: dX = (preds - targets) / N
        res = self.preds.sub(self.targets)
        return res.mul(1.0 / self.preds.rows)

class Adam:
    def __init__(self, layers: List[Layer], lr=0.01, beta1=0.9, beta2=0.999, eps=1e-8):
        self.layers = layers
        self.lr = lr
        self.b1 = beta1
        self.b2 = beta2
        self.eps = eps
        self.t = 0
        self.m = {}
        self.v = {}

    def step(self):
        self.t += 1
        idx = 0
        for layer in self.layers:
            for param, grad in layer.get_params():
                if idx not in self.m:
                    if isinstance(param, Matrix):
                        self.m[idx] = Matrix.zeros(param.rows, param.cols)
                        self.v[idx] = Matrix.zeros(param.rows, param.cols)
                    else:
                        self.m[idx] = [0.0] * len(param)
                        self.v[idx] = [0.0] * len(param)

                if isinstance(param, Matrix):
                    for i in range(param.rows):
                        for j in range(param.cols):
                            g = grad.data[i][j]
                            self.m[idx].data[i][j] = self.b1 * self.m[idx].data[i][j] + (1 - self.b1) * g
                            self.v[idx].data[i][j] = self.b2 * self.v[idx].data[i][j] + (1 - self.b2) * (g * g)
                            
                            m_hat = self.m[idx].data[i][j] / (1 - self.b1**self.t)
                            v_hat = self.v[idx].data[i][j] / (1 - self.b2**self.t)
                            
                            param.data[i][j] -= self.lr * m_hat / (math.sqrt(v_hat) + self.eps)
                else: # Bias list
                    for j in range(len(param)):
                        g = grad[j]
                        self.m[idx][j] = self.b1 * self.m[idx][j] + (1 - self.b1) * g
                        self.v[idx][j] = self.b2 * self.v[idx][j] + (1 - self.b2) * (g * g)
                        
                        m_hat = self.m[idx][j] / (1 - self.b1**self.t)
                        v_hat = self.v[idx][j] / (1 - self.b2**self.t)
                        
                        param[j] -= self.lr * m_hat / (math.sqrt(v_hat) + self.eps)
                idx += 1

# --- MODEL & TRAINING ---
class Sequential:
    def __init__(self, layers: List[Layer]):
        self.layers = layers

    def forward(self, x: Matrix) -> Matrix:
        for layer in self.layers:
            x = layer.forward(x)
        return x

    def backward(self, d_out: Matrix):
        for layer in reversed(self.layers):
            d_out = layer.backward(d_out)

if __name__ == "__main__":
    print("--- PURE PYTHON NEURAL NETWORK FRAMEWORK ---")
    
    # XOR Problem (Categorical representation for Softmax)
    # Inputs: [0,0], [0,1], [1,0], [1,1]
    X = Matrix([
        [0.0, 0.0],
        [0.0, 1.0],
        [1.0, 0.0],
        [1.0, 1.0]
    ])
    
    # Targets: Class 0 (Output 0), Class 1 (Output 1)
    Y = Matrix([
        [1.0, 0.0], # 0 XOR 0 = 0
        [0.0, 1.0], # 0 XOR 1 = 1
        [0.0, 1.0], # 1 XOR 0 = 1
        [1.0, 0.0]  # 1 XOR 1 = 0
    ])

    model = Sequential([
        Linear(2, 8),
        ReLU(),
        Linear(8, 2),
        Softmax()
    ])
    
    loss_fn = CrossEntropyLoss()
    optimizer = Adam(model.layers, lr=0.1)

    print("Training MLP on XOR Dataset...")
    for epoch in range(101):
        # Forward pass
        preds = model.forward(X)
        loss = loss_fn.forward(preds, Y)
        
        # Backward pass
        d_out = loss_fn.backward()
        model.backward(d_out)
        
        # Optimize
        optimizer.step()
        
        if epoch % 20 == 0:
            print(f"Epoch {epoch:3d} | Loss: {loss:.4f}")

    print("\nFinal Predictions:")
    final_preds = model.forward(X)
    for i in range(4):
        pred_class = 1 if final_preds.data[i][1] > final_preds.data[i][0] else 0
        target = 1 if Y.data[i][1] > 0 else 0
        print(f"Input: {X.data[i]} -> Pred Class: {pred_class} (Prob: {final_preds.data[i][1]:.3f}) | Target: {target}")
