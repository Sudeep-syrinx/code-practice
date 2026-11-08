import math
import random
from collections import defaultdict

def gaussian(x, mean, var):
    return math.exp(-((x - mean) ** 2) / (2 * var)) / math.sqrt(2 * math.pi * var)

class NaiveBayes:
    def __init__(self):
        self.classes = {}
        self.priors = {}
        self.stats = {}  # class -> feature -> (mean, var)

    def fit(self, X, y):
        by_class = defaultdict(list)
        for row, label in zip(X, y):
            by_class[label].append(row)
        n = len(y)
        for label, rows in by_class.items():
            self.priors[label] = len(rows) / n
            self.classes[label] = len(rows)
            cols = list(zip(*rows))
            self.stats[label] = []
            for col in cols:
                m = sum(col) / len(col)
                v = sum((x - m) ** 2 for x in col) / max(1, len(col) - 1)
                self.stats[label].append((m, max(v, 1e-6)))

    def predict_one(self, x):
        best_label, best_log = None, -float("inf")
        for label in self.priors:
            logp = math.log(self.priors[label])
            for xi, (mean, var) in zip(x, self.stats[label]):
                logp += math.log(max(gaussian(xi, mean, var), 1e-300))
            if logp > best_log:
                best_log = logp
                best_label = label
        return best_label

    def predict(self, X):
        return [self.predict_one(x) for x in X]

    def accuracy(self, X, y):
        preds = self.predict(X)
        return sum(p == t for p, t in zip(preds, y)) / len(y)

def make_blobs(n=150, centers=3, dim=2, seed=0):
    rng = random.Random(seed)
    X, y = [], []
    for c in range(centers):
        cx = [rng.uniform(-6, 6) for _ in range(dim)]
        for _ in range(n // centers):
            X.append([cx[d] + rng.gauss(0, 1.1) for d in range(dim)])
            y.append(c)
    return X, y

if __name__ == "__main__":
    random.seed(1)
    X, y = make_blobs(300, centers=3, dim=2, seed=4)
    data = list(zip(X, y))
    random.shuffle(data)
    X, y = zip(*data)
    X, y = list(X), list(y)
    split = int(0.7 * len(X))
    clf = NaiveBayes()
    clf.fit(X[:split], y[:split])
    acc = clf.accuracy(X[split:], y[split:])
    print("Naive Bayes Gaussian")
    print("  train size :", split)
    print("  test size  :", len(X) - split)
    print("  accuracy   :", round(acc, 3))
    print("  priors     :", {k: round(v, 3) for k, v in clf.priors.items()})
