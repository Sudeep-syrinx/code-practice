"""
Advanced Deep Reinforcement Learning Algorithms.
Includes Tabular Q-Learning, SARSA, and a Deep Q-Network (DQN) from scratch.
"""

import random
import math
import collections

class Environment:
    def __init__(self, state_space, action_space):
        self.state_space = state_space
        self.action_space = action_space

    def reset(self):
        return random.randint(0, self.state_space - 1)

    def step(self, action):
        next_state = random.randint(0, self.state_space - 1)
        reward = random.uniform(-1, 1)
        done = random.random() < 0.1
        return next_state, reward, done

class QLearningAgent:
    def __init__(self, state_space, action_space, alpha=0.1, gamma=0.99, epsilon=0.1):
        self.q_table = collections.defaultdict(lambda: [0.0] * action_space)
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.action_space = action_space

    def choose_action(self, state):
        if random.random() < self.epsilon:
            return random.randint(0, self.action_space - 1)
        q_values = self.q_table[state]
        max_q = max(q_values)
        best_actions = [i for i, q in enumerate(q_values) if q == max_q]
        return random.choice(best_actions)

    def update(self, state, action, reward, next_state):
        current_q = self.q_table[state][action]
        max_next_q = max(self.q_table[next_state])
        new_q = current_q + self.alpha * (reward + self.gamma * max_next_q - current_q)
        self.q_table[state][action] = new_q

class SARSAAgent:
    def __init__(self, state_space, action_space, alpha=0.1, gamma=0.99, epsilon=0.1):
        self.q_table = collections.defaultdict(lambda: [0.0] * action_space)
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.action_space = action_space

    def choose_action(self, state):
        if random.random() < self.epsilon:
            return random.randint(0, self.action_space - 1)
        q_values = self.q_table[state]
        max_q = max(q_values)
        best_actions = [i for i, q in enumerate(q_values) if q == max_q]
        return random.choice(best_actions)

    def update(self, state, action, reward, next_state, next_action):
        current_q = self.q_table[state][action]
        next_q = self.q_table[next_state][next_action]
        new_q = current_q + self.alpha * (reward + self.gamma * next_q - current_q)
        self.q_table[state][action] = new_q

class NeuralNetwork:
    def __init__(self, input_size, hidden_size, output_size):
        self.w1 = [[random.uniform(-1, 1) for _ in range(input_size)] for _ in range(hidden_size)]
        self.b1 = [0.0] * hidden_size
        self.w2 = [[random.uniform(-1, 1) for _ in range(hidden_size)] for _ in range(output_size)]
        self.b2 = [0.0] * output_size

    def relu(self, x):
        return max(0.0, x)

    def forward(self, x):
        hidden = []
        for i in range(len(self.w1)):
            h = self.b1[i]
            for j in range(len(x)):
                h += x[j] * self.w1[i][j]
            hidden.append(self.relu(h))
            
        output = []
        for i in range(len(self.w2)):
            o = self.b2[i]
            for j in range(len(hidden)):
                o += hidden[j] * self.w2[i][j]
            output.append(o)
        return output, hidden

class DQNAgent:
    def __init__(self, state_size, action_size, learning_rate=0.001, gamma=0.95, epsilon=1.0, epsilon_decay=0.995):
        self.state_size = state_size
        self.action_size = action_size
        self.gamma = gamma
        self.epsilon = epsilon
        self.epsilon_decay = epsilon_decay
        self.learning_rate = learning_rate
        self.memory = collections.deque(maxlen=2000)
        self.model = NeuralNetwork(state_size, 24, action_size)
        self.target_model = NeuralNetwork(state_size, 24, action_size)

    def remember(self, state, action, reward, next_state, done):
        self.memory.append((state, action, reward, next_state, done))

    def act(self, state):
        if random.random() <= self.epsilon:
            return random.randrange(self.action_size)
        act_values, _ = self.model.forward(state)
        return max(range(len(act_values)), key=lambda i: act_values[i])

    def replay(self, batch_size=32):
        if len(self.memory) < batch_size:
            return
        minibatch = random.sample(self.memory, batch_size)
        for state, action, reward, next_state, done in minibatch:
            target = reward
            if not done:
                next_q_values, _ = self.target_model.forward(next_state)
                target = reward + self.gamma * max(next_q_values)
            target_f = self.model.forward(state)[0]
            target_f[action] = target
            self.model.forward(state)

if __name__ == "__main__":
    print("Testing Reinforcement Learning Agents...")
    env = Environment(10, 4)
    
    q_agent = QLearningAgent(10, 4)
    for _ in range(100):
        state = env.reset()
        done = False
        while not done:
            action = q_agent.choose_action(state)
            next_state, reward, done = env.step(action)
            q_agent.update(state, action, reward, next_state)
            state = next_state
            
    print("Q-Learning training complete.")
    
    dqn_agent = DQNAgent(4, 2)
    state = [0.1, 0.2, 0.3, 0.4]
    action = dqn_agent.act(state)
    print(f"DQN selected action: {action}")
    print("DRL Simulation complete.")
