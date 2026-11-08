import math
import random
from collections import defaultdict

class MultiArmedBandit:
    def __init__(self, n_arms):
        self.n = n_arms
        self.counts = [0] * n_arms
        self.values = [0.0] * n_arms

    def select_epsilon_greedy(self, epsilon=0.1):
        if random.random() < epsilon:
            return random.randrange(self.n)
        return max(range(self.n), key=lambda i: self.values[i])

    def select_ucb1(self, total):
        for i in range(self.n):
            if self.counts[i] == 0:
                return i
        return max(range(self.n), key=lambda i: self.values[i] + math.sqrt(2 * math.log(total) / self.counts[i]))

    def update(self, arm, reward):
        self.counts[arm] += 1
        n = self.counts[arm]
        self.values[arm] += (reward - self.values[arm]) / n

class BernoulliArm:
    def __init__(self, p):
        self.p = p

    def pull(self):
        return 1.0 if random.random() < self.p else 0.0

def run_bandit(arms, steps=5000, method="epsilon"):
    agent = MultiArmedBandit(len(arms))
    total_reward = 0.0
    history = []
    for t in range(1, steps + 1):
        if method == "epsilon":
            arm = agent.select_epsilon_greedy(0.1)
        else:
            arm = agent.select_ucb1(t)
        reward = arms[arm].pull()
        agent.update(arm, reward)
        total_reward += reward
        if t % 500 == 0:
            history.append(total_reward / t)
    best = max(range(len(arms)), key=lambda i: arms[i].p)
    return total_reward / steps, agent.values, best, agent.counts, history

if __name__ == "__main__":
    random.seed(7)
    true_ps = [0.1, 0.3, 0.5, 0.7, 0.2]
    arms = [BernoulliArm(p) for p in true_ps]
    print("True arm probabilities:", true_ps)
    print()
    for method in ("epsilon", "ucb1"):
        avg, values, best, counts, hist = run_bandit(arms, steps=5000, method=method)
        print(f"Method {method}")
        print("  avg reward     :", round(avg, 4))
        print("  estimated means:", [round(v, 3) for v in values])
        print("  pull counts    :", counts)
        print("  best arm found :", max(range(5), key=lambda i: values[i]), "true best", best)
        print("  history        :", [round(h, 3) for h in hist])
        print()
