import random
import math
from typing import List, Callable, Any

class Node:
    def evaluate(self, x: float) -> float: raise NotImplementedError
    def __str__(self) -> str: raise NotImplementedError
    def clone(self) -> 'Node': raise NotImplementedError

class ConstNode(Node):
    def __init__(self, val: float): self.val = val
    def evaluate(self, x: float) -> float: return self.val
    def __str__(self): return f"{self.val:.2f}"
    def clone(self): return ConstNode(self.val)

class VarNode(Node):
    def evaluate(self, x: float) -> float: return x
    def __str__(self): return "x"
    def clone(self): return VarNode()

class OpNode(Node):
    def __init__(self, op: str, left: Node, right: Node):
        self.op = op
        self.left = left
        self.right = right

    def evaluate(self, x: float) -> float:
        l_val = self.left.evaluate(x)
        r_val = self.right.evaluate(x)
        try:
            if self.op == '+': return l_val + r_val
            elif self.op == '-': return l_val - r_val
            elif self.op == '*': return l_val * r_val
            elif self.op == '/': return l_val / r_val if abs(r_val) > 1e-5 else 1.0
            elif self.op == '^': return math.pow(max(min(l_val, 10.0), -10.0), 2.0)
        except:
            return 1.0
        return 0.0

    def __str__(self): return f"({self.left} {self.op} {self.right})"
    def clone(self): return OpNode(self.op, self.left.clone(), self.right.clone())

def random_tree(depth: int) -> Node:
    if depth == 0 or (depth > 1 and random.random() < 0.3):
        return random.choice([VarNode(), ConstNode(random.uniform(-5, 5))])
    op = random.choice(['+', '-', '*', '/', '^'])
    return OpNode(op, random_tree(depth - 1), random_tree(depth - 1))

class GeneticProgrammer:
    def __init__(self, target_func: Callable[[float], float], pop_size: int = 100):
        self.target_func = target_func
        self.pop_size = pop_size
        self.dataset = [(x / 10.0, target_func(x / 10.0)) for x in range(-20, 21)]
        self.population = [random_tree(depth=3) for _ in range(pop_size)]

    def fitness(self, node: Node) -> float:
        err = 0.0
        for x, y in self.dataset:
            try:
                res = node.evaluate(x)
                if math.isnan(res) or math.isinf(res): return float('inf')
                err += abs(res - y)
            except:
                return float('inf')
        return err

    def evolve(self, generations: int):
        for gen in range(generations):
            scored = [(node, self.fitness(node)) for node in self.population]
            scored.sort(key=lambda x: x[1])
            
            best_node, best_fit = scored[0]
            if best_fit < 1e-4:
                print(f"Gen {gen:3d} | Exact match found! Fitness: {best_fit:.5f} | Formula: {best_node}")
                return best_node
                
            if gen % 10 == 0:
                print(f"Gen {gen:3d} | Best Fitness: {best_fit:.4f} | Formula: {best_node}")
                
            # Selection & Breeding (Tournament selection)
            new_pop = [best_node.clone(), scored[1][0].clone()] # Elitism
            while len(new_pop) < self.pop_size:
                p1 = min(random.sample(scored, 5), key=lambda x: x[1])[0]
                p2 = min(random.sample(scored, 5), key=lambda x: x[1])[0]
                child = p1.clone() if random.random() < 0.5 else p2.clone()
                if random.random() < 0.1: # Mutation
                    child = random_tree(depth=2)
                new_pop.append(child)
            self.population = new_pop
        return scored[0][0]

if __name__ == "__main__":
    print("--- GENETIC PROGRAMMING SYMBOLIC REGRESSION ---")
    # Target function to discover: f(x) = x^2 + 2*x - 3
    target = lambda x: x**2 + 2*x - 3
    gp = GeneticProgrammer(target_func=target, pop_size=150)
    best = gp.evolve(generations=51)
    print(f"\nDiscovered Formula: {best}")
