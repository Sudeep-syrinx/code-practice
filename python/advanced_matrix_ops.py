import collections
import math

class Matrix:
    def __init__(self, rows, cols, data=None):
        self.rows = rows
        self.cols = cols
        if data:
            self.data = data
        else:
            self.data = [[0.0] * cols for _ in range(rows)]

    def __add__(self, other):
        if self.rows != other.rows or self.cols != other.cols:
            raise ValueError("Matrix dimensions must match for addition")
        result = Matrix(self.rows, self.cols)
        for i in range(self.rows):
            for j in range(self.cols):
                result.data[i][j] = self.data[i][j] + other.data[i][j]
        return result

    def __mul__(self, other):
        if isinstance(other, (int, float)):
            result = Matrix(self.rows, self.cols)
            for i in range(self.rows):
                for j in range(self.cols):
                    result.data[i][j] = self.data[i][j] * other
            return result
        if self.cols != other.rows:
            raise ValueError("Matrix dimensions incompatible for multiplication")
        result = Matrix(self.rows, other.cols)
        for i in range(self.rows):
            for j in range(other.cols):
                for k in range(self.cols):
                    result.data[i][j] += self.data[i][k] * other.data[k][j]
        return result

    def transpose(self):
        result = Matrix(self.cols, self.rows)
        for i in range(self.rows):
            for j in range(self.cols):
                result.data[j][i] = self.data[i][j]
        return result

    def determinant(self):
        if self.rows != self.cols:
            raise ValueError("Determinant only for square matrices")
        if self.rows == 1:
            return self.data[0][0]
        if self.rows == 2:
            return self.data[0][0] * self.data[1][1] - self.data[0][1] * self.data[1][0]
        det = 0
        for c in range(self.cols):
            submatrix = Matrix(self.rows - 1, self.cols - 1)
            for i in range(1, self.rows):
                col_idx = 0
                for j in range(self.cols):
                    if j == c:
                        continue
                    submatrix.data[i - 1][col_idx] = self.data[i][j]
                    col_idx += 1
            det += ((-1) ** c) * self.data[0][c] * submatrix.determinant()
        return det

if __name__ == "__main__":
    m1 = Matrix(2, 2, [[1, 2], [3, 4]])
    m2 = Matrix(2, 2, [[5, 6], [7, 8]])
    print("M1 + M2:")
    print((m1 + m2).data)
    print("M1 * M2:")
    print((m1 * m2).data)
    print("Determinant of M1:", m1.determinant())
    print("Transpose of M1:")
    print(m1.transpose().data)
    print("Test passed:", m1.determinant() == -2.0)
