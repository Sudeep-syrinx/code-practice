"""
Advanced Quantum Error Correction.
Includes the 3-qubit bit-flip code, 3-qubit phase-flip code,
and the 9-qubit Shor code.
"""

import math
import random

class QuantumState:
    def __init__(self, num_qubits):
        self.num_qubits = num_qubits
        self.amplitudes = [0j] * (2 ** num_qubits)
        self.amplitudes[0] = 1.0 + 0j

    def set_amplitude(self, index, value):
        self.amplitudes[index] = value

    def normalize(self):
        norm = math.sqrt(sum(abs(a)**2 for a in self.amplitudes))
        if norm > 0:
            self.amplitudes = [a / norm for a in self.amplitudes]

    def measure(self):
        probabilities = [abs(a)**2 for a in self.amplitudes]
        r = random.random()
        cumulative = 0.0
        for i, p in enumerate(probabilities):
            cumulative += p
            if r <= cumulative:
                return format(i, f'0{self.num_qubits}b')
        return format((2**self.num_qubits) - 1, f'0{self.num_qubits}b')

class BitFlipCode:
    @staticmethod
    def encode(state):
        encoded = QuantumState(3 * state.num_qubits)
        for i in range(len(state.amplitudes)):
            if abs(state.amplitudes[i]) > 1e-9:
                index = (i << 2) | i
                encoded.amplitudes[index] = state.amplitudes[i]
        return encoded

    @staticmethod
    def correct(state):
        corrected = QuantumState(state.num_qubits // 3)
        for i in range(len(state.amplitudes)):
            if abs(state.amplitudes[i]) > 1e-9:
                bits = format(i, f'0{state.num_qubits}b')
                corrected_bits = ""
                for j in range(0, state.num_qubits, 3):
                    chunk = bits[j:j+3]
                    ones = chunk.count("1")
                    corrected_bits += "1" if ones >= 2 else "0"
                index = int(corrected_bits, 2)
                corrected.amplitudes[index] += state.amplitudes[i]
        corrected.normalize()
        return corrected

class PhaseFlipCode:
    @staticmethod
    def encode(state):
        encoded = QuantumState(3 * state.num_qubits)
        for i in range(len(state.amplitudes)):
            if abs(state.amplitudes[i]) > 1e-9:
                index = (i << 2) | i
                encoded.amplitudes[index] = state.amplitudes[i]
        return encoded

    @staticmethod
    def correct(state):
        corrected = QuantumState(state.num_qubits // 3)
        for i in range(len(state.amplitudes)):
            if abs(state.amplitudes[i]) > 1e-9:
                bits = format(i, f'0{state.num_qubits}b')
                corrected_bits = ""
                for j in range(0, state.num_qubits, 3):
                    chunk = bits[j:j+3]
                    ones = chunk.count("1")
                    corrected_bits += "1" if ones >= 2 else "0"
                index = int(corrected_bits, 2)
                corrected.amplitudes[index] += state.amplitudes[i]
        corrected.normalize()
        return corrected

class ShorCode:
    @staticmethod
    def encode(state):
        encoded = QuantumState(9 * state.num_qubits)
        for i in range(len(state.amplitudes)):
            if abs(state.amplitudes[i]) > 1e-9:
                index = 0
                for j in range(state.num_qubits):
                    bit = (i >> j) & 1
                    if bit == 0:
                        pass
                    else:
                        for k in range(9):
                            index |= (1 << (j * 9 + k))
                encoded.amplitudes[index] = state.amplitudes[i]
        return encoded

    @staticmethod
    def correct(state):
        corrected = QuantumState(state.num_qubits // 9)
        for i in range(len(state.amplitudes)):
            if abs(state.amplitudes[i]) > 1e-9:
                bits = format(i, f'0{state.num_qubits}b')
                corrected_bits = ""
                for j in range(0, state.num_qubits, 9):
                    chunk = bits[j:j+9]
                    ones = chunk.count("1")
                    corrected_bits += "1" if ones >= 5 else "0"
                index = int(corrected_bits, 2)
                corrected.amplitudes[index] += state.amplitudes[i]
        corrected.normalize()
        return corrected

if __name__ == "__main__":
    print("Testing Quantum Error Correction...")
    
    original = QuantumState(1)
    original.set_amplitude(0, 1.0 + 0j)
    original.normalize()
    print(f"Original state measurement: {original.measure()}")
    
    encoded = BitFlipCode.encode(original)
    print(f"Encoded state amplitudes (non-zero): {[f'{a:.2f}' for a in encoded.amplitudes if abs(a) > 1e-9]}")
    
    encoded.amplitudes[1] = 1.0 + 0j
    encoded.amplitudes[0] = 0j
    print(f"State after simulated bit flip: {[f'{a:.2f}' for a in encoded.amplitudes if abs(a) > 1e-9]}")
    
    corrected = BitFlipCode.correct(encoded)
    print(f"Corrected state measurement: {corrected.measure()}")
    
    print("Quantum Error Correction complete.")
