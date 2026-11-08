"""
A Pure Python Quantum Computing Simulator.
Includes Qubits, Quantum Registers, and standard Quantum Gates.
"""

import math
import cmath
import random

class ComplexMatrix:
    def __init__(self, rows, cols, data=None):
        self.rows = rows
        self.cols = cols
        if data:
            self.data = data
        else:
            self.data = [[0j for _ in range(cols)] for _ in range(rows)]

    def multiply(self, other):
        result = ComplexMatrix(self.rows, other.cols)
        for i in range(self.rows):
            for j in range(other.cols):
                total = 0j
                for k in range(self.cols):
                    total += self.data[i][k] * other.data[k][j]
                result.data[i][j] = total
        return result

    def tensor_product(self, other):
        result = ComplexMatrix(self.rows * other.rows, self.cols * other.cols)
        for i in range(self.rows):
            for j in range(self.cols):
                for k in range(other.rows):
                    for l in range(other.cols):
                        result.data[i * other.rows + k][j * other.cols + l] = self.data[i][j] * other.data[k][l]
        return result

class QuantumGates:
    @staticmethod
    def I():
        return ComplexMatrix(2, 2, [[1, 0], [0, 1]])

    @staticmethod
    def X():
        return ComplexMatrix(2, 2, [[0, 1], [1, 0]])

    @staticmethod
    def Y():
        return ComplexMatrix(2, 2, [[0, -1j], [1j, 0]])

    @staticmethod
    def Z():
        return ComplexMatrix(2, 2, [[1, 0], [0, -1]])

    @staticmethod
    def H():
        val = 1 / math.sqrt(2)
        return ComplexMatrix(2, 2, [[val, val], [val, -val]])

    @staticmethod
    def CNOT():
        return ComplexMatrix(4, 4, [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 1],
            [0, 0, 1, 0]
        ])

class QuantumRegister:
    def __init__(self, num_qubits):
        self.num_qubits = num_qubits
        self.state = ComplexMatrix(2**num_qubits, 1)
        self.state.data[0][0] = 1.0 + 0j

    def apply_gate(self, gate, target_qubit):
        full_gate = ComplexMatrix(1, 1, [[1]])
        for i in range(self.num_qubits):
            if i == target_qubit:
                full_gate = full_gate.tensor_product(gate)
            else:
                full_gate = full_gate.tensor_product(QuantumGates.I())
        self.state = full_gate.multiply(self.state)

    def apply_cnot(self, control_qubit, target_qubit):
        full_gate = ComplexMatrix(2**self.num_qubits, 2**self.num_qubits)
        for i in range(2**self.num_qubits):
            control_val = (i >> control_qubit) & 1
            if control_val == 1:
                target_val = (i >> target_qubit) & 1
                new_i = i ^ (1 << target_qubit) if target_val == 0 else i ^ (1 << target_qubit)
                full_gate.data[new_i][i] = 1
            else:
                full_gate.data[i][i] = 1
        self.state = full_gate.multiply(self.state)

    def measure(self):
        probabilities = [abs(self.state.data[i][0])**2 for i in range(2**self.num_qubits)]
        r = random.random()
        cumulative = 0
        for i, p in enumerate(probabilities):
            cumulative += p
            if r <= cumulative:
                return format(i, f'0{self.num_qubits}b')
        return format(2**self.num_qubits - 1, f'0{self.num_qubits}b')

if __name__ == "__main__":
    print("Testing Quantum Entanglement...")
    qr = QuantumRegister(2)
    qr.apply_gate(QuantumGates.H(), 0)
    qr.apply_cnot(0, 1)
    
    results = {"00": 0, "01": 0, "10": 0, "11": 0}
    for _ in range(1000):
        results[qr.measure()] += 1
        
    print("Measurement results:", results)
    print("Bell State verified if only 00 and 11 appear.")
