"""
Machine Learning Algorithms implemented from scratch using NumPy.
Includes Linear Regression, Logistic Regression, K-Means, and KNN.
"""

import numpy as np
import math

class LinearRegression:
    def __init__(self, learning_rate=0.01, epochs=1000):
        self.lr = learning_rate
        self.epochs = epochs
        self.weights = None
        self.bias = None

    def fit(self, X, y):
        n_samples, n_features = X.shape
        self.weights = np.zeros(n_features)
        self.bias = 0

        for _ in range(self.epochs):
            y_pred = np.dot(X, self.weights) + self.bias
            dw = (1 / n_samples) * np.dot(X.T, (y_pred - y))
            db = (1 / n_samples) * np.sum(y_pred - y)
            self.weights -= self.lr * dw
            self.bias -= self.lr * db

    def predict(self, X):
        return np.dot(X, self.weights) + self.bias

class LogisticRegression:
    def __init__(self, learning_rate=0.01, epochs=1000):
        self.lr = learning_rate
        self.epochs = epochs
        self.weights = None
        self.bias = None

    def sigmoid(self, z):
        return 1 / (1 + np.exp(-z))

    def fit(self, X, y):
        n_samples, n_features = X.shape
        self.weights = np.zeros(n_features)
        self.bias = 0

        for _ in range(self.epochs):
            linear_model = np.dot(X, self.weights) + self.bias
            y_pred = self.sigmoid(linear_model)
            dw = (1 / n_samples) * np.dot(X.T, (y_pred - y))
            db = (1 / n_samples) * np.sum(y_pred - y)
            self.weights -= self.lr * dw
            self.bias -= self.lr * db

    def predict(self, X):
        linear_model = np.dot(X, self.weights) + self.bias
        y_pred = self.sigmoid(linear_model)
        return [1 if i > 0.5 else 0 for i in y_pred]

class KMeans:
    def __init__(self, k=3, max_iters=100):
        self.k = k
        self.max_iters = max_iters
        self.centroids = None

    def fit(self, X):
        n_samples, n_features = X.shape
        random_indices = np.random.choice(n_samples, self.k, replace=False)
        self.centroids = X[random_indices]

        for _ in range(self.max_iters):
            labels = self.predict(X)
            new_centroids = np.array([X[labels == i].mean(axis=0) for i in range(self.k)])
            if np.all(self.centroids == new_centroids):
                break
            self.centroids = new_centroids

    def predict(self, X):
        distances = np.sqrt(((X - self.centroids[:, np.newaxis])**2).sum(axis=2))
        return np.argmin(distances, axis=0)

class KNearestNeighbors:
    def __init__(self, k=3):
        self.k = k
        self.X_train = None
        self.y_train = None

    def fit(self, X, y):
        self.X_train = X
        self.y_train = y

    def predict(self, X):
        y_pred = []
        for i in range(len(X)):
            distances = np.sqrt(np.sum((self.X_train - X[i])**2, axis=1))
            nearest_indices = np.argsort(distances)[:self.k]
            nearest_labels = self.y_train[nearest_indices]
            most_common = max(set(nearest_labels), key=list(nearest_labels).count)
            y_pred.append(most_common)
        return np.array(y_pred)

if __name__ == "__main__":
    np.random.seed(42)
    
    X_lin = np.random.rand(100, 1) * 10
    y_lin = 2.5 * X_lin.squeeze() + 1.5 + np.random.randn(100) * 0.5
    
    lin_reg = LinearRegression(learning_rate=0.01, epochs=1000)
    lin_reg.fit(X_lin, y_lin)
    print("Linear Regression Weights:", lin_reg.weights)
    print("Linear Regression Bias:", lin_reg.bias)
    
    X_log = np.vstack([np.random.rand(50, 2) * 5, np.random.rand(50, 2) * 5 + 5])
    y_log = np.array([0]*50 + [1]*50)
    
    log_reg = LogisticRegression(learning_rate=0.1, epochs=1000)
    log_reg.fit(X_log, y_log)
    predictions = log_reg.predict(X_log)
    accuracy = np.mean(predictions == y_log)
    print("Logistic Regression Accuracy:", accuracy)
    
    X_kmeans = np.vstack([np.random.randn(50, 2) + 2, np.random.randn(50, 2) - 2])
    kmeans = KMeans(k=2)
    kmeans.fit(X_kmeans)
    print("KMeans Centroids:", kmeans.centroids)
    
    knn = KNearestNeighbors(k=3)
    knn.fit(X_log, y_log)
    print("KNN Accuracy:", np.mean(knn.predict(X_log) == y_log))
