"""
A Tensor Graph Compiler and Optimizer.
Includes Graph Construction, Topological Sorting,
Constant Folding, and Code Generation.
"""

class TensorNode:
    def __init__(self, op, inputs=None, value=None, name=None):
        self.op = op
        self.inputs = inputs if inputs else []
        self.value = value
        self.name = name if name else f"node_{id(self)}"
        self.output_shape = None

    def __repr__(self):
        return f"TensorNode({self.name}, op={self.op})"

class TensorGraph:
    def __init__(self):
        self.nodes = []
        self.inputs = []
        self.outputs = []

    def add_node(self, node):
        self.nodes.append(node)
        return node

    def topological_sort(self):
        visited = set()
        order = []

        def visit(node):
            if node in visited:
                return
            visited.add(node)
            for inp in node.inputs:
                visit(inp)
            order.append(node)

        for out in self.outputs:
            visit(out)
        return order

class Optimizer:
    @staticmethod
    def constant_folding(graph):
        for node in graph.topological_sort():
            if all(inp.value is not None for inp in node.inputs):
                if node.op == "add":
                    node.value = node.inputs[0].value + node.inputs[1].value
                elif node.op == "mul":
                    node.value = node.inputs[0].value * node.inputs[1].value
                elif node.op == "sub":
                    node.value = node.inputs[0].value - node.inputs[1].value
                elif node.op == "div":
                    node.value = node.inputs[0].value / node.inputs[1].value
        return graph

class CodeGenerator:
    @staticmethod
    def generate_python(graph):
        lines = []
        for node in graph.topological_sort():
            if node.value is not None:
                lines.append(f"{node.name} = {node.value}")
            elif node.op == "add":
                lines.append(f"{node.name} = {node.inputs[0].name} + {node.inputs[1].name}")
            elif node.op == "mul":
                lines.append(f"{node.name} = {node.inputs[0].name} * {node.inputs[1].name}")
            elif node.op == "sub":
                lines.append(f"{node.name} = {node.inputs[0].name} - {node.inputs[1].name}")
            elif node.op == "div":
                lines.append(f"{node.name} = {node.inputs[0].name} / {node.inputs[1].name}")
            elif node.op == "input":
                lines.append(f"{node.name} = input_value")
        return "\n".join(lines)

if __name__ == "__main__":
    print("Testing Tensor Graph Compiler...")
    
    graph = TensorGraph()
    a = graph.add_node(TensorNode("input", value=2.0, name="a"))
    b = graph.add_node(TensorNode("input", value=3.0, name="b"))
    c = graph.add_node(TensorNode("add", inputs=[a, b], name="c"))
    d = graph.add_node(TensorNode("mul", inputs=[c, a], name="d"))
    e = graph.add_node(TensorNode("sub", inputs=[d, b], name="e"))
    
    graph.outputs.append(e)
    
    print("Original Graph Topological Order:")
    for node in graph.topological_sort():
        print(f"  {node.name}: {node.op}")
        
    Optimizer.constant_folding(graph)
    print("After Constant Folding:")
    for node in graph.topological_sort():
        print(f"  {node.name} = {node.value}")
        
    print("Generated Python Code:")
    code = CodeGenerator.generate_python(graph)
    print(code)
    
    print("Tensor Compiler complete.")
