from collections import Counter
import math


def entropy(labels):
    total = len(labels)
    if total == 0:
        return 0.0
    counts = Counter(labels)
    return -sum((c / total) * math.log2(c / total) for c in counts.values() if c)

def information_gain(parent_labels, left_labels, right_labels):
    n = len(parent_labels)
    if n == 0:
        return 0.0
    return entropy(parent_labels) - (
        len(left_labels) / n * entropy(left_labels)
        + len(right_labels) / n * entropy(right_labels)
    )


class DecisionNode:
    def __init__(self, feature=None, threshold=None, left=None, right=None, label=None):
        self.feature = feature
        self.threshold = threshold
        self.left = left
        self.right = right
        self.label = label


def majority(labels):
    return Counter(labels).most_common(1)[0][0]


def build_tree(X, y, max_depth=5, min_samples=2):
    if len(set(y)) == 1 or len(y) < min_samples or max_depth == 0:
        return DecisionNode(label=majority(y))

    best_gain = -1
    best_feat = best_thresh = None
    best_left = best_right = None

    n_features = len(X[0])
    for feat in range(n_features):
        values = sorted(set(row[feat] for row in X))
        for i in range(len(values) - 1):
            thresh = (values[i] + values[i + 1]) / 2
            left_idx = [j for j, row in enumerate(X) if row[feat] <= thresh]
            right_idx = [j for j, row in enumerate(X) if row[feat] > thresh]
            if not left_idx or not right_idx:
                continue
            left_y = [y[j] for j in left_idx]
            right_y = [y[j] for j in right_idx]
            gain = information_gain(y, left_y, right_y)
            if gain > best_gain:
                best_gain = gain
                best_feat = feat
                best_thresh = thresh
                best_left = left_idx
                best_right = right_idx

    if best_gain <= 0:
        return DecisionNode(label=majority(y))

    left_X = [X[i] for i in best_left]
    left_y = [y[i] for i in best_left]
    right_X = [X[i] for i in best_right]
    right_y = [y[i] for i in best_right]

    return DecisionNode(
        feature=best_feat,
        threshold=best_thresh,
        left=build_tree(left_X, left_y, max_depth - 1, min_samples),
        right=build_tree(right_X, right_y, max_depth - 1, min_samples),
    )


def predict_one(node, row):
    while node.label is None:
        if row[node.feature] <= node.threshold:
            node = node.left
        else:
            node = node.right
    return node.label


def predict(tree, X):
    return [predict_one(tree, row) for row in X]


if __name__ == "__main__":
    # simple 2D dataset (approx XOR-like + linear)
    X = [
        [0.1, 0.2], [0.2, 0.1], [0.8, 0.9], [0.9, 0.8],
        [0.1, 0.9], [0.2, 0.8], [0.8, 0.1], [0.9, 0.2],
        [0.4, 0.5], [0.5, 0.4], [0.6, 0.5], [0.5, 0.6],
    ]
    y = [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1]

    tree = build_tree(X, y, max_depth=4)
    preds = predict(tree, X)
    acc = sum(p == t for p, t in zip(preds, y)) / len(y)
    print("Training accuracy      :", round(acc, 3))
    print("Predictions            :", preds)
    print("True labels            :", y)

    # pure set
    pure_X = [[1], [1], [1], [2], [2]]
    pure_y = [0, 0, 0, 1, 1]
    pure_tree = build_tree(pure_X, pure_y, max_depth=2)
    pure_preds = predict(pure_tree, pure_X)
    print("Pure dataset accuracy  :", pure_preds == pure_y)

    # entropy checks
    print("Entropy [0,0,0,0]      :", round(entropy([0, 0, 0, 0]), 4))
    print("Entropy [0,1]          :", round(entropy([0, 1]), 4))
    print("Entropy balanced       :", abs(entropy([0, 1, 0, 1]) - 1.0) < 1e-9)
