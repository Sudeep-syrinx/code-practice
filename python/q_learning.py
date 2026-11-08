import random
from collections import defaultdict


class QLearningAgent:
    def __init__(self, actions, alpha=0.1, gamma=0.99, epsilon=0.1):
        self.q = defaultdict(lambda: defaultdict(float))
        self.actions = actions
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon

    def choose(self, state):
        if random.random() < self.epsilon:
            return random.choice(self.actions)
        qvals = self.q[state]
        max_q = max((qvals[a] for a in self.actions), default=0.0)
        best = [a for a in self.actions if qvals[a] == max_q]
        return random.choice(best)

    def update(self, state, action, reward, next_state, done):
        old = self.q[state][action]
        future = 0.0 if done else max(self.q[next_state][a] for a in self.actions)
        self.q[state][action] = old + self.alpha * (reward + self.gamma * future - old)

    def greedy(self, state):
        qvals = self.q[state]
        max_q = max((qvals[a] for a in self.actions), default=0.0)
        best = [a for a in self.actions if qvals[a] == max_q]
        return random.choice(best) if best else random.choice(self.actions)


class GridWorld:
    def __init__(self, n=5, goal=None, traps=None):
        self.n = n
        self.goal = goal or (n - 1, n - 1)
        self.traps = set(traps or [])
        self.actions = ["U", "D", "L", "R"]
        self.delta = {"U": (-1, 0), "D": (1, 0), "L": (0, -1), "R": (0, 1)}
        self.reset()

    def reset(self):
        self.pos = (0, 0)
        return self.pos

    def step(self, action):
        dr, dc = self.delta[action]
        r, c = self.pos[0] + dr, self.pos[1] + dc
        if 0 <= r < self.n and 0 <= c < self.n:
            self.pos = (r, c)
        reward = -0.01
        done = False
        if self.pos in self.traps:
            reward = -1.0
            done = True
        elif self.pos == self.goal:
            reward = 1.0
            done = True
        return self.pos, reward, done


def train(env, episodes=3000, epsilon_start=0.3, epsilon_end=0.05):
    agent = QLearningAgent(env.actions, alpha=0.2, gamma=0.95, epsilon=epsilon_start)
    returns = []
    for ep in range(episodes):
        agent.epsilon = epsilon_start + (epsilon_end - epsilon_start) * ep / episodes
        state = env.reset()
        total = 0.0
        for _ in range(100):
            action = agent.choose(state)
            next_state, reward, done = env.step(action)
            agent.update(state, action, reward, next_state, done)
            total += reward
            state = next_state
            if done:
                break
        returns.append(total)
    return agent, returns


if __name__ == "__main__":
    random.seed(42)
    env = GridWorld(5, traps=[(1, 1), (2, 2), (3, 1)])
    agent, returns = train(env, episodes=2500)

    # evaluate greedy policy
    successes = 0
    path_lens = []
    for _ in range(100):
        state = env.reset()
        for t in range(50):
            action = agent.greedy(state)
            state, reward, done = env.step(action)
            if done:
                if reward > 0:
                    successes += 1
                    path_lens.append(t + 1)
                break

    print("Success rate (greedy):", successes / 100)
    print("Avg path length      :", round(sum(path_lens) / max(len(path_lens), 1), 1))
    print("Last 100 ep avg return:", round(sum(returns[-100:]) / 100, 3))
    print("Learned something     :", sum(returns[-100:]) / 100 > sum(returns[:100]) / 100)

    # Q values at start
    print("Q[start]              :", {a: round(agent.q[(0, 0)][a], 3) for a in env.actions})
