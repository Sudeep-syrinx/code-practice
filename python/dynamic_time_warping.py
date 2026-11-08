import math

class DynamicTimeWarping:
    def __init__(self, seq1, seq2):
        self.seq1 = seq1
        self.seq2 = seq2
        self.n = len(seq1)
        self.m = len(seq2)
        self.cost_matrix = [[float('inf')] * self.m for _ in range(self.n)]
        self.dtw_matrix = [[float('inf')] * self.m for _ in range(self.n)]
        
    def distance(self, x, y):
        return abs(x - y)
        
    def compute(self):
        for i in range(self.n):
            for j in range(self.m):
                self.cost_matrix[i][j] = self.distance(self.seq1[i], self.seq2[j])
                
        self.dtw_matrix[0][0] = self.cost_matrix[0][0]
        
        for i in range(1, self.n):
            self.dtw_matrix[i][0] = self.dtw_matrix[i-1][0] + self.cost_matrix[i][0]
            
        for j in range(1, self.m):
            self.dtw_matrix[0][j] = self.dtw_matrix[0][j-1] + self.cost_matrix[0][j]
            
        for i in range(1, self.n):
            for j in range(1, self.m):
                choices = [
                    self.dtw_matrix[i-1][j],
                    self.dtw_matrix[i][j-1],
                    self.dtw_matrix[i-1][j-1]
                ]
                self.dtw_matrix[i][j] = self.cost_matrix[i][j] + min(choices)
                
        return self.dtw_matrix[self.n-1][self.m-1]
        
    def get_path(self):
        path = []
        i, j = self.n - 1, self.m - 1
        path.append((i, j))
        
        while i > 0 or j > 0:
            if i == 0:
                j -= 1
            elif j == 0:
                i -= 1
            else:
                min_val = min(
                    self.dtw_matrix[i-1][j],
                    self.dtw_matrix[i][j-1],
                    self.dtw_matrix[i-1][j-1]
                )
                if self.dtw_matrix[i-1][j-1] == min_val:
                    i -= 1
                    j -= 1
                elif self.dtw_matrix[i-1][j] == min_val:
                    i -= 1
                else:
                    j -= 1
            path.append((i, j))
            
        return path[::-1]

if __name__ == "__main__":
    a = [1, 2, 3, 4, 5]
    b = [1, 3, 4, 5]
    dtw = DynamicTimeWarping(a, b)
    dist = dtw.compute()
    path = dtw.get_path()
    print("Sequence A:", a)
    print("Sequence B:", b)
    print("DTW Distance:", dist)
    print("Optimal Warping Path:", path)
    print("Test passed:", dist == 0 and len(path) > 0)
