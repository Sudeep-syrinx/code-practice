import random
import math
from collections import defaultdict

class Individual:
    def __init__(self, genes):
        self.genes = genes
        self.fitness = None

def tsp_distance(cities, order):
    total = 0
    for i in range(len(order)):
        a = cities[order[i]]
        b = cities[order[(i + 1) % len(order)]]
        total += math.hypot(a[0] - b[0], a[1] - b[1])
    return total

def create_tsp_individual(n):
    genes = list(range(n))
    random.shuffle(genes)
    return Individual(genes)

def tournament_select(pop, k=3):
    contenders = random.sample(pop, k)
    return min(contenders, key=lambda ind: ind.fitness)

def order_crossover(parent1, parent2):
    n = len(parent1.genes)
    a, b = sorted(random.sample(range(n), 2))
    child = [None] * n
    child[a:b] = parent1.genes[a:b]
    fill = [g for g in parent2.genes if g not in child]
    idx = 0
    for i in range(n):
        if child[i] is None:
            child[i] = fill[idx]
            idx += 1
    return Individual(child)

def mutate_swap(ind, rate=0.1):
    genes = ind.genes[:]
    if random.random() < rate:
        i, j = random.sample(range(len(genes)), 2)
        genes[i], genes[j] = genes[j], genes[i]
    return Individual(genes)

def genetic_tsp(cities, pop_size=80, generations=200, elite=4):
    n = len(cities)
    population = [create_tsp_individual(n) for _ in range(pop_size)]
    for ind in population:
        ind.fitness = tsp_distance(cities, ind.genes)

    history = []
    for gen in range(generations):
        population.sort(key=lambda ind: ind.fitness)
        history.append(population[0].fitness)
        next_gen = population[:elite]
        while len(next_gen) < pop_size:
            p1 = tournament_select(population)
            p2 = tournament_select(population)
            child = order_crossover(p1, p2)
            child = mutate_swap(child, rate=0.15)
            child.fitness = tsp_distance(cities, child.genes)
            next_gen.append(child)
        population = next_gen
    population.sort(key=lambda ind: ind.fitness)
    return population[0], history

def sphere_fitness(x):
    return sum(v * v for v in x)

def create_real_individual(dim, bounds=(-5, 5)):
    genes = [random.uniform(*bounds) for _ in range(dim)]
    return Individual(genes)

def blend_crossover(p1, p2, alpha=0.5):
    child = []
    for a, b in zip(p1.genes, p2.genes):
        lo, hi = min(a, b), max(a, b)
        spread = hi - lo
        child.append(random.uniform(lo - alpha * spread, hi + alpha * spread))
    return Individual(child)

def mutate_gaussian(ind, rate=0.2, sigma=0.3):
    genes = []
    for g in ind.genes:
        if random.random() < rate:
            g += random.gauss(0, sigma)
        genes.append(g)
    return Individual(genes)

def genetic_optimize(fitness_fn, dim=5, pop_size=60, generations=150):
    population = [create_real_individual(dim) for _ in range(pop_size)]
    for ind in population:
        ind.fitness = fitness_fn(ind.genes)
    best_history = []
    for gen in range(generations):
        population.sort(key=lambda ind: ind.fitness)
        best_history.append(population[0].fitness)
        next_gen = population[:3]
        while len(next_gen) < pop_size:
            p1 = tournament_select(population)
            p2 = tournament_select(population)
            child = blend_crossover(p1, p2)
            child = mutate_gaussian(child)
            child.fitness = fitness_fn(child.genes)
            next_gen.append(child)
        population = next_gen
    population.sort(key=lambda ind: ind.fitness)
    return population[0], best_history

if __name__ == "__main__":
    random.seed(42)
    cities = [(random.uniform(0, 100), random.uniform(0, 100)) for _ in range(15)]
    best, history = genetic_tsp(cities, generations=120)
    print("TSP with 15 cities")
    print("Best distance     :", round(best.fitness, 2))
    print("Start distance    :", round(history[0], 2))
    print("Improved          :", history[0] > history[-1])
    print("Tour              :", best.genes)
    print()

    best2, hist2 = genetic_optimize(sphere_fitness, dim=6, generations=100)
    print("Sphere function optimization (dim=6)")
    print("Best fitness      :", round(best2.fitness, 6))
    print("Genes near zero   :", all(abs(g) < 0.5 for g in best2.genes))
    print("Final genes       :", [round(g, 4) for g in best2.genes])
    print("History improved  :", hist2[0] > hist2[-1])
