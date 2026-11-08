import random
import math

def sigmoid(x):
    return 1 / (1 + math.exp(-max(-500, min(500, x))))

def sigmoid_deriv(x):
    s = sigmoid(x)
    return s * (1 - s)

class NeuralNet:
    def __init__(self, layer_sizes, learning_rate=0.5):
        self.layers = layer_sizes
        self.lr = learning_rate
        self.weights = []
        self.biases = []
        for i in range(len(layer_sizes) - 1):
            w = [[random.uniform(-1, 1) for _ in range(layer_sizes[i])] for _ in range(layer_sizes[i + 1])]
            b = [random.uniform(-1, 1) for _ in range(layer_sizes[i + 1])]
            self.weights.append(w)
            self.biases.append(b)

    def forward(self, inputs):
        activations = [inputs]
        zs = []
        a = inputs
        for w, b in zip(self.weights, self.biases):
            z = [sum(wi * ai for wi, ai in zip(row, a)) + bi for row, bi in zip(w, b)]
            zs.append(z)
            a = [sigmoid(zi) for zi in z]
            activations.append(a)
        return activations, zs

    def predict(self, inputs):
        activations, _ = self.forward(inputs)
        return activations[-1]

    def train(self, data, epochs=1000, print_every=200):
        for epoch in range(1, epochs + 1):
            total_loss = 0
            for x, y in data:
                activations, zs = self.forward(x)
                # output error
                delta = [ (activations[-1][i] - y[i]) * sigmoid_deriv(zs[-1][i]) for i in range(len(y)) ]
                deltas = [delta]

                # backpropagate
                for l in range(len(self.weights) - 2, -1, -1):
                    next_delta = deltas[0]
                    delta = []
                    for j in range(len(self.weights[l])):
                        error = sum(self.weights[l + 1][k][j] * next_delta[k] for k in range(len(next_delta)))
                        delta.append(error * sigmoid_deriv(zs[l][j]))
                    deltas.insert(0, delta)

                # update weights and biases
                for l in range(len(self.weights)):
                    a_prev = activations[l]
                    for j in range(len(self.weights[l])):
                        for k in range(len(self.weights[l][j])):
                            self.weights[l][j][k] -= self.lr * deltas[l][j] * a_prev[k]
                        self.biases[l][j] -= self.lr * deltas[l][j]

                pred = activations[-1]
                total_loss += sum((pred[i] - y[i]) ** 2 for i in range(len(y)))

            if epoch % print_every == 0 or epoch == 1:
                avg = total_loss / len(data)
                print(f"Epoch {epoch:4d}  avg loss = {avg:.6f}")

def one_hot(n, size=2):
    return [1.0 if i == n else 0.0 for i in range(size)]

if __name__ == "__main__":
    random.seed(42)
    # XOR problem
    xor_data = [
        ([0, 0], [0]),
        ([0, 1], [1]),
        ([1, 0], [1]),
        ([1, 1], [0]),
    ]
    print("Training small net on XOR")
    net = NeuralNet([2, 4, 1], learning_rate=0.8)
    net.train(xor_data, epochs=2000, print_every=500)
    print()
    print("Predictions:")
    for x, y in xor_data:
        pred = net.predict(x)
        print(f"  {x} -> {pred[0]:.4f}  (target {y[0]})")
    print()

    # Simple digit-ish classification (toy)
    print("Training on toy 3-class pattern")
    patterns = [
        ([1, 1, 0, 0], [1, 0, 0]),
        ([0, 0, 1, 1], [0, 1, 0]),
        ([1, 0, 1, 0], [0, 0, 1]),
        ([0.9, 0.8, 0.1, 0.2], [1, 0, 0]),
        ([0.1, 0.2, 0.9, 0.8], [0, 1, 0]),
        ([0.8, 0.1, 0.7, 0.2], [0, 0, 1]),
    ]
    net2 = NeuralNet([4, 6, 3], learning_rate=0.6)
    net2.train(patterns, epochs=1500, print_every=500)
    print()
    print("Toy predictions:")
    for x, y in patterns:
        pred = net2.predict(x)
        predicted = pred.index(max(pred))
        actual = y.index(1)
        print(f"  input={x}  pred_class={predicted}  actual={actual}  probs={[round(p, 3) for p in pred]}")
