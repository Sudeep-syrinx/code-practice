import random
from collections import defaultdict


class MDP:
    def __init__(self, states, actions, transitions, rewards, gamma=0.9):
        self.states = states
        self.actions = actions
        self.P = transitions          # P[s][a] = list of (prob, next_state)
        self.R = rewards              # R[s][a] = reward
        self.gamma = gamma

    def value_iteration(self, theta=1e-6):
        V = {s: 0.0 for s in self.states}
        while True:
            delta = 0.0
            new_V = {}
            for s in self.states:
                if s not in self.actions or not self.actions[s]:
                    new_V[s] = 0.0
                    continue
                q_values = []
                for a in self.actions[s]:
                    q = self.R[s][a]
                    for prob, s2 in self.P[s][a]:
                        q += self.gamma * prob * V[s2]
                    q_values.append(q)
                new_V[s] = max(q_values)
                delta = max(delta, abs(new_V[s] - V[s]))
            V = new_V
            if delta < theta:
                break
        return V

    def policy_from_values(self, V):
        policy = {}
        for s in self.states:
            if s not in self.actions or not self.actions[s]:
                policy[s] = None
                continue
            best_a, best_q = None, float("-inf")
            for a in self.actions[s]:
                q = self.R[s][a]
                for prob, s2 in self.P[s][a]:
                    q += self.gamma * prob * V[s2]
                if q > best_q:
                    best_q, best_a = q, a
            policy[s] = best_a
        return policy


def gridworld(n=4, slip=0.1, gamma=0.9):
    """Classic n x n grid, goal at bottom-right, start top-left."""
    states = [(r, c) for r in range(n) for c in range(n)]
    goal = (n - 1, n - 1)
    actions = {}
    transitions = defaultdict(dict)
    rewards = defaultdict(dict)

    dirs = {"U": (-1, 0), "D": (1, 0), "L": (0, -1), "R": (0, 1)}
    for r, c in states:
        if (r, c) == goal:
            actions[(r, c)] = []
            continue
        actions[(r, c)] = list(dirs)
        for a, (dr, dc) in dirs.items():
            outcomes = []
            for actual, (adr, adc) in dirs.items():
                prob = 1 - slip if actual == a else slip / 3
                nr, nc = r + adr, c + adc
                if not (0 <= nr < n and 0 <= nc < n):
                    nr, nc = r, c
                outcomes.append((prob, (nr, nc)))
            # merge duplicate next states
            merged = defaultdict(float)
            for p, s2 in outcomes:
                merged[s2] += p
            transitions[(r, c)][a] = list(merged.items())
            rewards[(r, c)][a] = 1.0 if (r + dirs[a][0], c + dirs[a][1]) == goal else -0.04

    return MDP(states, actions, transitions, rewards, gamma)


if __name__ == "__main__":
    mdp = gridworld(4, slip=0.1)
    V = mdp.value_iteration()
    policy = mdp.policy_from_values(V)

    print("Value at start (0,0) :", round(V[(0, 0)], 3))
    print("Value at goal        :", V[(3, 3)])
    print("Policy at (0,0)      :", policy[(0, 0)])
    print("Policy at (2,2)      :", policy[(2, 2)])
    print("Policy at (3,2)      :", policy[(3, 2)])

    # deterministic version should prefer right/down
    mdp2 = gridworld(3, slip=0.0)
    V2 = mdp2.value_iteration()
    pol2 = mdp2.policy_from_values(V2)
    print()
    print("Deterministic 3x3")
    print("Start value          :", round(V2[(0, 0)], 3))
    print("Policy map:")
    for r in range(3):
        row = []
        for c in range(3):
            a = pol2[(r, c)]
            row.append(a if a else "G")
        print(" ", row)

    # small chain MDP
    states = [0, 1, 2]
    actions = {0: ["R"], 1: ["L", "R"], 2: []}
    P = {
        0: {"R": [(1.0, 1)]},
        1: {"L": [(1.0, 0)], "R": [(1.0, 2)]},
        2: {},
    }
    R = {0: {"R": 0}, 1: {"L": 0, "R": 1}, 2: {}}
    chain = MDP(states, actions, P, R, gamma=0.9)
    Vc = chain.value_iteration()
    print()
    print("Chain values         :", {s: round(Vc[s], 3) for s in states})
    print("V[1] > V[0]          :", Vc[1] > Vc[0])
