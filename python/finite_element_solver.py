"""
A Complete Finite Element Analysis (FEA) Solver for 2D Truss Structures.
Includes Node, Element, Material, Assembly of Stiffness Matrices,
and Solving for Displacements and Forces.
"""

import math

class Material:
    def __init__(self, name, elastic_modulus, poisson_ratio):
        self.name = name
        self.E = elastic_modulus
        self.nu = poisson_ratio

class Node:
    def __init__(self, node_id, x, y):
        self.id = node_id
        self.x = x
        self.y = y
        self.constrained_x = False
        self.constrained_y = False
        self.force_x = 0.0
        self.force_y = 0.0
        self.displacement_x = 0.0
        self.displacement_y = 0.0

class TrussElement:
    def __init__(self, elem_id, node1, node2, material, area):
        self.id = elem_id
        self.node1 = node1
        self.node2 = node2
        self.material = material
        self.area = area
        self.length = math.sqrt((node2.x - node1.x)**2 + (node2.y - node1.y)**2)
        self.angle = math.atan2(node2.y - node1.y, node2.x - node1.x)
        self.stiffness_matrix = self.compute_stiffness()

    def compute_stiffness(self):
        c = math.cos(self.angle)
        s = math.sin(self.angle)
        k = (self.material.E * self.area) / self.length
        return [
            [k * c * c, k * c * s, -k * c * c, -k * c * s],
            [k * c * s, k * s * s, -k * c * s, -k * s * s],
            [-k * c * c, -k * c * s, k * c * c, k * c * s],
            [-k * c * s, -k * s * s, k * c * s, k * s * s]
        ]

class TrussSolver:
    def __init__(self):
        self.nodes = {}
        self.elements = []
        self.material = None

    def add_node(self, node):
        self.nodes[node.id] = node

    def add_element(self, element):
        self.elements.append(element)

    def assemble_system(self):
        n = len(self.nodes)
        global_k = [[0.0] * (2 * n) for _ in range(2 * n)]
        for elem in self.elements:
            dofs = [2 * elem.node1.id - 2, 2 * elem.node1.id - 1,
                    2 * elem.node2.id - 2, 2 * elem.node2.id - 1]
            for i in range(4):
                for j in range(4):
                    global_k[dofs[i]][dofs[j]] += elem.stiffness_matrix[i][j]
        return global_k

    def apply_boundary_conditions(self, global_k, global_f):
        n = len(self.nodes)
        for node in self.nodes.values():
            if node.constrained_x:
                idx = 2 * node.id - 2
                for i in range(2 * n):
                    global_k[idx][i] = 0.0
                global_k[idx][idx] = 1.0
                global_f[idx] = 0.0
            if node.constrained_y:
                idx = 2 * node.id - 1
                for i in range(2 * n):
                    global_k[idx][i] = 0.0
                global_k[idx][idx] = 1.0
                global_f[idx] = 0.0
        return global_k, global_f

    def solve(self):
        n = len(self.nodes)
        global_k = self.assemble_system()
        global_f = [0.0] * (2 * n)
        for node in self.nodes.values():
            global_f[2 * node.id - 2] = node.force_x
            global_f[2 * node.id - 1] = node.force_y
            
        global_k, global_f = self.apply_boundary_conditions(global_k, global_f)
        
        aug = [row[:] + [global_f[i]] for i, row in enumerate(global_k)]
        for i in range(2 * n):
            pivot = aug[i][i]
            if abs(pivot) < 1e-12:
                continue
            for j in range(i, 2 * n + 1):
                aug[i][j] /= pivot
            for k in range(2 * n):
                if k != i:
                    factor = aug[k][i]
                    for j in range(i, 2 * n + 1):
                        aug[k][j] -= factor * aug[i][j]
                        
        displacements = [aug[i][2 * n] for i in range(2 * n)]
        for node in self.nodes.values():
            node.displacement_x = displacements[2 * node.id - 2]
            node.displacement_y = displacements[2 * node.id - 1]
            
        return displacements

if __name__ == "__main__":
    print("Testing Finite Element Solver...")
    solver = TrussSolver()
    steel = Material("Steel", 200e9, 0.3)
    
    n1 = Node(1, 0.0, 0.0)
    n1.constrained_x = True
    n1.constrained_y = True
    
    n2 = Node(2, 1.0, 0.0)
    n2.constrained_y = True
    n2.force_x = 10000.0
    
    n3 = Node(3, 0.5, 1.0)
    
    solver.add_node(n1)
    solver.add_node(n2)
    solver.add_node(n3)
    
    e1 = TrussElement(1, n1, n3, steel, 0.01)
    e2 = TrussElement(2, n2, n3, steel, 0.01)
    e3 = TrussElement(3, n1, n2, steel, 0.01)
    
    solver.add_element(e1)
    solver.add_element(e2)
    solver.add_element(e3)
    
    displacements = solver.solve()
    print("Calculated Displacements:")
    for node in solver.nodes.values():
        print(f"  Node {node.id}: x={node.displacement_x:.6e}, y={node.displacement_y:.6e}")
        
    print("FEA complete.")
