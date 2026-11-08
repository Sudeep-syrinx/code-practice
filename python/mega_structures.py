class DataStructure1:
    def __init__(self):
        self.data = []
        self.size = 0
    def add(self, val):
        self.data.append(val)
        self.size += 1
    def remove(self, val):
        if val in self.data:
            self.data.remove(val)
            self.size -= 1
            return True
        return False
    def get(self, index):
        if 0 <= index < self.size:
            return self.data[index]
        return None
    def update(self, index, val):
        if 0 <= index < self.size:
            self.data[index] = val
            return True
        return False
    def clear(self):
        self.data = []
        self.size = 0
    def contains(self, val):
        return val in self.data
    def to_list(self):
        return list(self.data)
    def sort_data(self):
        self.data.sort()
    def reverse_data(self):
        self.data.reverse()
    def find_max(self):
        if self.data:
            return max(self.data)
        return None
    def find_min(self):
        if self.data:
            return min(self.data)
        return None
    def sum_data(self):
        return sum(self.data)
    def average_data(self):
        if self.size > 0:
            return sum(self.data) / self.size
        return 0
    def filter_data(self, condition):
        return [x for x in self.data if condition(x)]
    def map_data(self, transform):
        return [transform(x) for x in self.data]
    def test_ds1(self):
        ds = DataStructure1()
        ds.add(1)
        ds.add(2)
        ds.add(3)
        assert ds.size == 3
        assert ds.get(0) == 1
        assert ds.find_max() == 3
        assert ds.find_min() == 1
        assert ds.sum_data() == 6
        assert ds.remove(1) is True
        assert ds.size == 2
        assert ds.contains(1) is False
        assert ds.filter_data(lambda x: x > 1) == [2, 3]
        assert ds.map_data(lambda x: x + 1) == [3, 4]
        ds.sort_data()
        assert ds.to_list() == [2, 3]
        print("DataStructure1 tests passed.")
