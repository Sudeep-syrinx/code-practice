import collections
import random

class MarkovTextGenerator:
    def __init__(self, order=2):
        self.order = order
        self.model = collections.defaultdict(list)

    def train(self, text):
        tokens = text.split()
        for i in range(len(tokens) - self.order):
            state = tuple(tokens[i:i + self.order])
            next_word = tokens[i + self.order]
            self.model[state].append(next_word)

    def generate(self, length=20, seed=None):
        if not self.model:
            return ""
        if seed:
            state = tuple(seed.split())
        else:
            state = random.choice(list(self.model.keys()))
            
        result = list(state)
        for _ in range(length):
            if state not in self.model:
                break
            next_word = random.choice(self.model[state])
            result.append(next_word)
            state = tuple(result[-self.order:])
            
        return " ".join(result)

if __name__ == "__main__":
    text = """
    The quick brown fox jumps over the lazy dog. 
    The quick brown fox is very fast and clever. 
    The lazy dog sleeps all day under the tree.
    """
    
    generator = MarkovTextGenerator(order=2)
    generator.train(text)
    random.seed(42)
    print("Generated Text:")
    print(generator.generate(length=10))
    print()
    print("Model size:", len(generator.model))
    print("Is functional:", len(generator.generate()) > 0)
