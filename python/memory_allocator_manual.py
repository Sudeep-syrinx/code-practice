class SimpleMemoryAllocator:
    def __init__(self, size):
        self.memory = [None] * size
        self.free_blocks = [(0, size)]

    def allocate(self, size):
        for i, (start, block_size) in enumerate(self.free_blocks):
            if block_size >= size:
                if block_size == size:
                    self.free_blocks.pop(i)
                else:
                    self.free_blocks[i] = (start + size, block_size - size)
                return start
        return -1

    def free(self, start, size):
        self.free_blocks.append((start, size))
        self.free_blocks.sort()
        merged = []
        for block in self.free_blocks:
            if merged and merged[-1][0] + merged[-1][1] == block[0]:
                merged[-1] = (merged[-1][0], merged[-1][1] + block[1])
            else:
                merged.append(block)
        self.free_blocks = merged

if __name__ == "__main__":
    allocator = SimpleMemoryAllocator(100)
    print("Allocate 10:", allocator.allocate(10))
    print("Allocate 20:", allocator.allocate(20))
    print("Allocate 5:", allocator.allocate(5))
    print("Free block at 10 size 20")
    allocator.free(10, 20)
    print("Free blocks after merge:", allocator.free_blocks)
    print("Test passed:", allocator.free_blocks == [(0, 10), (10, 20), (30, 70)])
