import random
from collections import deque

class ReplayBuffer:
    def __init__(self, capacity=10000):
        self.buf = deque(maxlen=capacity)

    def push(self, state, action, reward, next_state, done):
        self.buf.append((state, action, reward, next_state, done))

    def sample(self, batch_size):
        return random.sample(self.buf, min(batch_size, len(self.buf)))

    def __len__(self):
        return len(self.buf)

class SimpleDQN:
    """Tiny linear Q approximator for discrete actions (no neural net)."""
    def __init__(self, state_dim, n_actions, lr=0.01, gamma=0.99):
        self.n_actions = n_actions
        self.lr = lr
        self.gamma = gamma
        self.w = [[random.gauss(0, 0.1) for _ in range(state_dim)] for _ in range(n_actions)]
        self.b = [0.0] * n_actions

    def q(self, state):
        return [sum(self.w[a][i] * state[i] for i in range(len(state))) + self.b[a]
                for a in range(self.n_actions)]

    def act(self, state, epsilon=0.1):
        if random.random() < epsilon:
            return random.randrange(self.n_actions)
        qs = self.q(state)
        return max(range(self.n_actions), key=lambda a: qs[a])

    def update(self, state, action, reward, next_state, done):
        qs = self.q(state)
        target = reward if done else reward + self.gamma * max(self.q(next_state))
        td = target - qs[action]
        for i in range(len(state)):
            self.w[action][i] += self.lr * td * state[i]
        self.b[action] += self.lr * td

class CatchEnv:
    """1D catch: paddle moves left/right, ball falls from top."""
    def __init__(self, size=8):
        self.size = size
        self.reset()

    def reset(self):
        self.paddle = self.size // 2
        self.ball_x = random.randrange(self.size)
        self.ball_y = 0
        return self._state()

    def _state(self):
        # one-hot paddle + ball position normalized
        s = [0.0] * (self.size * 2)
        s[self.paddle] = 1.0
        s[self.size + self.ball_x] = 1.0
        return s

    def step(self, action):
        # 0 left, 1 stay, 2 right
        if action == 0:
            self.paddle = max(0, self.paddle - 1)
        elif action == 2:
            self.paddle = min(self.size - 1, self.paddle + 1)
        self.ball_y += 1
        done = False
        reward = 0.0
        if self.ball_y >= self.size - 1:
            done = True
            reward = 1.0 if self.ball_x == self.paddle else -1.0
            self.ball_x = random.randrange(self.size)
            self.ball_y = 0
            self.paddle = self.size // 2
        return self._state(), reward, done

def train_catch(episodes=800):
    env = CatchEnv(6)
    agent = SimpleDQN(12, 3, lr=0.05, gamma=0.9)
    rewards = []
    for ep in range(episodes):
        state = env.reset()
        total = 0.0
        for _ in range(40):
            action = agent.act(state, epsilon=max(0.05, 0.4 - ep / episodes))
            next_state, reward, done = env.step(action)
            agent.update(state, action, reward, next_state, done)
            total += reward
            state = next_state
            if done and reward != 0:
                break
        rewards.append(total)
    return agent, rewards

if __name__ == "__main__":
    random.seed(9)
    agent, rewards = train_catch(1000)
    early = sum(rewards[:100]) / 100
    late = sum(rewards[-100:]) / 100
    print("Catch game linear DQN")
    print("  early avg reward :", round(early, 3))
    print("  late avg reward  :", round(late, 3))
    print("  improved         :", late > early)
    # greedy evaluation
    env = CatchEnv(6)
    wins = 0
    for _ in range(50):
        s = env.reset()
        for _ in range(30):
            a = agent.act(s, epsilon=0)
            s, r, d = env.step(a)
            if d:
                if r > 0:
                    wins += 1
                break
    print("  greedy win rate  :", wins / 50)
