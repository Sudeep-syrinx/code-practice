import random
from collections import defaultdict, Counter

class MarkovChain:
    def __init__(self, order=2):
        self.order = order
        self.model = defaultdict(Counter)
        self.starters = []

    def train(self, text):
        words = text.split()
        if len(words) <= self.order:
            return
        for i in range(len(words) - self.order):
            key = tuple(words[i:i + self.order])
            nxt = words[i + self.order]
            self.model[key][nxt] += 1
            if i == 0 or words[i - 1].endswith((".", "!", "?")):
                self.starters.append(key)

    def generate(self, max_words=50, seed=None):
        if not self.model:
            return ""
        if seed and len(seed) >= self.order:
            state = tuple(seed[-self.order:])
            if state not in self.model:
                state = random.choice(list(self.model.keys()))
        else:
            state = random.choice(self.starters) if self.starters else random.choice(list(self.model.keys()))
        output = list(state)
        for _ in range(max_words - self.order):
            choices = self.model.get(state)
            if not choices:
                break
            words, weights = zip(*choices.items())
            nxt = random.choices(words, weights=weights)[0]
            output.append(nxt)
            state = tuple(output[-self.order:])
        return " ".join(output)

    def probability(self, sequence):
        words = sequence.split()
        if len(words) <= self.order:
            return 0.0
        prob = 1.0
        for i in range(len(words) - self.order):
            key = tuple(words[i:i + self.order])
            nxt = words[i + self.order]
            total = sum(self.model[key].values())
            if total == 0 or nxt not in self.model[key]:
                return 0.0
            prob *= self.model[key][nxt] / total
        return prob

def char_markov(text, order=3):
    model = defaultdict(Counter)
    for i in range(len(text) - order):
        key = text[i:i + order]
        model[key][text[i + order]] += 1
    return model

def generate_chars(model, order, length=200, seed=None):
    if seed and len(seed) >= order:
        state = seed[-order:]
    else:
        state = random.choice(list(model.keys()))
    out = state
    for _ in range(length - order):
        choices = model.get(state)
        if not choices:
            break
        chars, weights = zip(*choices.items())
        nxt = random.choices(chars, weights=weights)[0]
        out += nxt
        state = out[-order:]
    return out

if __name__ == "__main__":
    random.seed(7)
    corpus = """
    the quick brown fox jumps over the lazy dog.
    the lazy dog sleeps under the warm sun.
    a quick fox runs past the sleeping dog.
    brown foxes are quick and clever animals.
    the dog and the fox are not friends.
    under the sun the fox finds food.
    the warm sun makes the dog sleepy.
    clever animals jump and run quickly.
    """
    mc = MarkovChain(order=2)
    mc.train(corpus)
    print("Word-level Markov (order=2)")
    for i in range(4):
        print(f"  {i+1}: {mc.generate(max_words=20)}")
    print()
    print("Probability of known phrase:", round(mc.probability("the quick brown fox"), 6))
    print("Probability of nonsense   :", mc.probability("fox fox fox fox"))
    print()

    text = corpus.replace("\n", " ").strip()
    cmodel = char_markov(text, order=4)
    print("Character-level Markov (order=4)")
    for i in range(3):
        sample = generate_chars(cmodel, 4, length=80)
        print(f"  {i+1}: {sample}")
    print()
    print("Model states:", len(cmodel))
    print("Most common after 'the ':", cmodel.get("the ", Counter()).most_common(3))
