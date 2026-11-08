import math
import random
from collections import defaultdict


class HMM:
    def __init__(self, states, observations, start_prob, trans_prob, emit_prob):
        self.states = states
        self.observations = observations
        self.start = start_prob
        self.trans = trans_prob
        self.emit = emit_prob

    def viterbi(self, sequence):
        V = [{}]
        path = {}

        for s in self.states:
            V[0][s] = math.log(self.start[s] + 1e-12) + math.log(self.emit[s].get(sequence[0], 1e-12))
            path[s] = [s]

        for t in range(1, len(sequence)):
            V.append({})
            new_path = {}
            for s in self.states:
                best, best_prev = max(
                    (
                        V[t - 1][prev]
                        + math.log(self.trans[prev].get(s, 1e-12))
                        + math.log(self.emit[s].get(sequence[t], 1e-12)),
                        prev,
                    )
                    for prev in self.states
                )
                V[t][s] = best
                new_path[s] = path[best_prev] + [s]
            path = new_path

        best_final = max(self.states, key=lambda s: V[-1][s])
        return path[best_final], V[-1][best_final]

    def forward(self, sequence):
        """Scaled forward algorithm, returns log-likelihood."""
        alpha = [{}]
        scale = []
        for s in self.states:
            alpha[0][s] = self.start[s] * self.emit[s].get(sequence[0], 1e-12)
        c = sum(alpha[0].values())
        scale.append(c)
        for s in self.states:
            alpha[0][s] /= c

        for t in range(1, len(sequence)):
            alpha.append({})
            for s in self.states:
                alpha[t][s] = sum(
                    alpha[t - 1][prev] * self.trans[prev].get(s, 1e-12)
                    for prev in self.states
                ) * self.emit[s].get(sequence[t], 1e-12)
            c = sum(alpha[t].values())
            scale.append(c)
            for s in self.states:
                alpha[t][s] /= c
        return -sum(math.log(c) for c in scale)


if __name__ == "__main__":
    # classic weather / activity example
    states = ["Rainy", "Sunny"]
    obs = ["walk", "shop", "clean"]
    start = {"Rainy": 0.6, "Sunny": 0.4}
    trans = {
        "Rainy": {"Rainy": 0.7, "Sunny": 0.3},
        "Sunny": {"Rainy": 0.4, "Sunny": 0.6},
    }
    emit = {
        "Rainy": {"walk": 0.1, "shop": 0.4, "clean": 0.5},
        "Sunny": {"walk": 0.6, "shop": 0.3, "clean": 0.1},
    }
    hmm = HMM(states, obs, start, trans, emit)

    seq = ["walk", "shop", "walk", "clean"]
    path, logp = hmm.viterbi(seq)
    print("Observation sequence :", seq)
    print("Most likely weather  :", path)
    print("Log probability      :", round(logp, 3))

    # known short example
    seq2 = ["walk", "clean"]
    path2, _ = hmm.viterbi(seq2)
    print()
    print("Short sequence       :", seq2)
    print("Viterbi path         :", path2)

    ll = hmm.forward(seq)
    print("Forward loglik       :", round(ll, 3))
    print("Finite likelihood    :", math.isfinite(ll))

    # deterministic HMM
    states3 = ["A", "B"]
    start3 = {"A": 1.0, "B": 0.0}
    trans3 = {"A": {"A": 0.0, "B": 1.0}, "B": {"A": 0.0, "B": 1.0}}
    emit3 = {"A": {"x": 1.0}, "B": {"y": 1.0}}
    hmm3 = HMM(states3, ["x", "y"], start3, trans3, emit3)
    path3, _ = hmm3.viterbi(["x", "y", "y"])
    print()
    print("Deterministic path   :", path3)
    print("Expected A,B,B       :", path3 == ["A", "B", "B"])
