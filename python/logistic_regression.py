import math
import random

def sigmoid(x):
    return 1 / (1 + math.exp(-max(-30, min(30, x))))

class LogisticRegression:
    def __init__(self, lr=0.1, epochs=300):
        self.lr = lr
        self.epochs = epochs
        self.w = None
        self.b = 0.0

    def fit(self, X, y):
        n, d = len(X), len(X[0])
        self.w = [0.0] * d
        self.b = 0.0
        for _ in range(self.epochs):
            for i in range(n):
                z = sum(self.w[j] * X[i][j] for j in range(d)) + self.b
                p = sigmoid(z)
                err = p - y[i]
                for j in range(d):
                    self.w[j] -= self.lr * err * X[i][j]
                self.b -= self.lr * err

    def predict_proba(self, x):
        z = sum(self.w[j] * x[j] for j in range(len(x))) + self.b
        return sigmoid(z)

    def predict(self, X):
        return [1 if self.predict_proba(x) >= 0.5 else 0 for x in X]

    def accuracy(self, X, y):
        preds = self.predict(X)
        return sum(p == t for p, t in zip(preds, y)) / len(y)

if __name__ == "__main__":
    random.seed(2)
    # linearly separable-ish data
    X, y = [], []
    for _ in range(200):
        a, b = random.gauss(0, 1), random.gauss(0, 1)
        label = 1 if a + 1.5 * b + random.gauss(0, 0.3) > 0 else 0
        X.append([a, b])
        y.append(label)
    data = list(zip(X, y))
    random.shuffle(data)
    X, y = zip(*data)
    X, y = list(X), list(y)
    split = 140
    model = LogisticRegression(lr=0.2, epochs=250)
    model.fit(X[:split], y[:split])
    acc = model.accuracy(X[split:], y[split:])
    print("Logistic Regression")
    print("  weights :", [round(w, 3) for w in model.w], "bias", round(model.b, 3))
    print("  accuracy:", round(acc, 3))
    print("  better than chance:", acc > 0.6)
