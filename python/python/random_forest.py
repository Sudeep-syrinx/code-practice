import random
from collections import Counter

def majority_vote(votes):
    return Counter(votes).most_common(1)[0][0]

class RandomForest:
    def __init__(self, n_trees=10, max_depth=4, min_samples=3, seed=0):
        self.n_trees = n_trees
        self.max_depth = max_depth
        self.min_samples = min_samples
        self.rng = random.Random(seed)
        self.trees = []

    def _gini(self, labels):
        n = len(labels)
        if n == 0:
            return 0
        counts = Counter(labels)
        return 1 - sum((c / n) ** 2 for c in counts.values())

    def _best_split(self, X, y, features):
        best_gain, best_feat, best_thresh = -1, None, None
        parent = self._gini(y)
        n = len(y)
        for f in features:
            vals = sorted(set(row[f] for row in X))
            for i in range(len(vals) - 1):
                thresh = (vals[i] + vals[i + 1]) / 2
                left = [y[j] for j, row in enumerate(X) if row[f] <= thresh]
                right = [y[j] for j, row in enumerate(X) if row[f] > thresh]
                if not left or not right:
                    continue
                gain = parent - (len(left)/n)*self._gini(left) - (len(right)/n)*self._gini(right)
                if gain > best_gain:
                    best_gain, best_feat, best_thresh = gain, f, thresh
        return best_feat, best_thresh

    def _build(self, X, y, depth):
        if depth >= self.max_depth or len(y) < self.min_samples or len(set(y)) == 1:
            return ("leaf", Counter(y).most_common(1)[0][0])
        n_features = len(X[0])
        k = max(1, int(math.sqrt(n_features)))
        features = self.rng.sample(range(n_features), k)
        feat, thresh = self._best_split(X, y, features)
        if feat is None:
            return ("leaf", Counter(y).most_common(1)[0][0])
        left_X, left_y, right_X, right_y = [], [], [], []
        for row, label in zip(X, y):
            if row[feat] <= thresh:
                left_X.append(row); left_y.append(label)
            else:
                right_X.append(row); right_y.append(label)
        return ("node", feat, thresh, self._build(left_X, left_y, depth+1), self._build(right_X, right_y, depth+1))

    def fit(self, X, y):
        self.trees = []
        n = len(X)
        for _ in range(self.n_trees):
            idx = [self.rng.randrange(n) for _ in range(n)]
            bx = [X[i] for i in idx]
            by = [y[i] for i in idx]
            self.trees.append(self._build(bx, by, 0))

    def _predict_tree(self, node, row):
        if node[0] == "leaf":
            return node[1]
        _, feat, thresh, left, right = node
        return self._predict_tree(left if row[feat] <= thresh else right, row)

    def predict(self, X):
        return [majority_vote([self._predict_tree(t, row) for t in self.trees]) for row in X]

    def accuracy(self, X, y):
        preds = self.predict(X)
        return sum(p == t for p, t in zip(preds, y)) / len(y)

import math

if __name__ == "__main__":
    random.seed(3)
    X, y = [], []
    for _ in range(250):
        a, b = random.gauss(0, 2), random.gauss(0, 2)
        label = 1 if a*a + b*b + random.gauss(0, 0.5) > 4 else 0
        X.append([a, b, a*b, a*a])
        y.append(label)
    data = list(zip(X, y))
    random.shuffle(data)
    X, y = zip(*data)
    X, y = list(X), list(y)
    split = 180
    rf = RandomForest(n_trees=15, max_depth=5, seed=11)
    rf.fit(X[:split], y[:split])
    acc = rf.accuracy(X[split:], y[split:])
    print("Random Forest")
    print("  trees    :", len(rf.trees))
    print("  accuracy :", round(acc, 3))
    print("  > 0.65   :", acc > 0.65)
