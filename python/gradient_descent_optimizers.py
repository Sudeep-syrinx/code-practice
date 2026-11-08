import math
import random


def rosenbrock(x, y):
    return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2


def rosenbrock_grad(x, y):
    dx = -2 * (1 - x) - 400 * x * (y - x ** 2)
    dy = 200 * (y - x ** 2)
    return dx, dy


class SGD:
    def __init__(self, lr=0.001):
        self.lr = lr

    def step(self, x, y):
        dx, dy = rosenbrock_grad(x, y)
        return x - self.lr * dx, y - self.lr * dy


class Momentum:
    def __init__(self, lr=0.001, beta=0.9):
        self.lr = lr
        self.beta = beta
        self.vx = 0
        self.vy = 0

    def step(self, x, y):
        dx, dy = rosenbrock_grad(x, y)
        self.vx = self.beta * self.vx + (1 - self.beta) * dx
        self.vy = self.beta * self.vy + (1 - self.beta) * dy
        return x - self.lr * self.vx, y - self.lr * self.vy


class Adam:
    def __init__(self, lr=0.01, beta1=0.9, beta2=0.999, eps=1e-8):
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.mx = self.my = 0
        self.vx = self.vy = 0
        self.t = 0

    def step(self, x, y):
        self.t += 1
        dx, dy = rosenbrock_grad(x, y)
        
        self.mx = self.beta1 * self.mx + (1 - self.beta1) * dx
        self.my = self.beta1 * self.my + (1 - self.beta1) * dy
        
        self.vx = self.beta2 * self.vx + (1 - self.beta2) * dx ** 2
        self.vy = self.beta2 * self.vy + (1 - self.beta2) * dy ** 2
        
        m_hat_x = self.mx / (1 - self.beta1 ** self.t)
        m_hat_y = self.my / (1 - self.beta1 ** self.t)
        v_hat_x = self.vx / (1 - self.beta2 ** self.t)
        v_hat_y = self.vy / (1 - self.beta2 ** self.t)
        
        nx = x - self.lr * m_hat_x / (math.sqrt(v_hat_x) + self.eps)
        ny = y - self.lr * m_hat_y / (math.sqrt(v_hat_y) + self.eps)
        return nx, ny


def optimize(optimizer, start_x, start_y, steps=1000):
    x, y = start_x, start_y
    for _ in range(steps):
        x, y = optimizer.step(x, y)
    return x, y, rosenbrock(x, y)


if __name__ == "__main__":
    print("Optimizing Rosenbrock function")
    print(f"{'Optimizer':<10} {'X':<10} {'Y':<10} {'Loss':<10}")
    print("-" * 45)
    
    results = []
    for name, opt in [("SGD", SGD(0.001)), ("Momentum", Momentum(0.001)), ("Adam", Adam(0.01))]:
        x, y, loss = optimize(opt, -1.2, 1.0, steps=2000)
        print(f"{name:<10} {x:>8.4f} {y:>8.4f} {loss:>10.6f}")
        results.append(loss)
        
    print("-" * 45)
    print("Adam is best:", results[2] < results[0] and results[2] < results[1])
