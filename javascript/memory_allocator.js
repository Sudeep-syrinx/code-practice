const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class BumpAllocator {
  constructor(totalSize) {
    this.totalSize = totalSize;
    this.offset = 0;
    this.allocations = 0;
  }
  allocate(size, alignment) {
    if (alignment) {
      const remainder = this.offset % alignment;
      if (remainder !== 0) this.offset += alignment - remainder;
    }
    if (this.offset + size > this.totalSize) return null;
    const ptr = this.offset;
    this.offset += size;
    this.allocations++;
    return ptr;
  }
  reset() { this.offset = 0; }
  used() { return this.offset; }
  free() { return this.totalSize - this.offset; }
  getStats() { return { allocations: this.allocations, used: this.offset, total: this.totalSize }; }
}

class PoolAllocator {
  constructor(blockSize, blockCount) {
    this.blockSize = blockSize;
    this.blocks = new Array(blockCount).fill(false);
    this.blockCount = blockCount;
    this.allocated = 0;
  }
  allocate() {
    for (let i = 0; i < this.blockCount; i++) {
      if (!this.blocks[i]) {
        this.blocks[i] = true;
        this.allocated++;
        return i * this.blockSize;
      }
    }
    return null;
  }
  deallocate(ptr) {
    const idx = Math.floor(ptr / this.blockSize);
    if (idx >= 0 && idx < this.blockCount && this.blocks[idx]) {
      this.blocks[idx] = false;
      this.allocated--;
      return true;
    }
    return false;
  }
  isAllocated(ptr) {
    const idx = Math.floor(ptr / this.blockSize);
    return idx >= 0 && idx < this.blockCount && this.blocks[idx];
  }
  available() { return this.blockCount - this.allocated; }
  capacity() { return this.blockCount; }
}

class FreeListAllocator {
  constructor(totalSize) {
    this.totalSize = totalSize;
    this.freeBlocks = [{ offset: 0, size: totalSize }];
    this.allocatedBlocks = new Map();
    this.allocationCount = 0;
  }
  allocate(size, strategy) {
    strategy = strategy || "first-fit";
    let blockIdx = -1;
    if (strategy === "first-fit") {
      blockIdx = this.freeBlocks.findIndex(b => b.size >= size);
    } else if (strategy === "best-fit") {
      let bestIdx = -1, bestSize = Infinity;
      for (let i = 0; i < this.freeBlocks.length; i++) {
        if (this.freeBlocks[i].size >= size && this.freeBlocks[i].size < bestSize) {
          bestSize = this.freeBlocks[i].size;
          bestIdx = i;
        }
      }
      blockIdx = bestIdx;
    } else if (strategy === "worst-fit") {
      let worstIdx = -1, worstSize = -1;
      for (let i = 0; i < this.freeBlocks.length; i++) {
        if (this.freeBlocks[i].size >= size && this.freeBlocks[i].size > worstSize) {
          worstSize = this.freeBlocks[i].size;
          worstIdx = i;
        }
      }
      blockIdx = worstIdx;
    }
    if (blockIdx === -1) return null;
    const block = this.freeBlocks[blockIdx];
    const ptr = block.offset;
    if (block.size === size) {
      this.freeBlocks.splice(blockIdx, 1);
    } else {
      block.offset += size;
      block.size -= size;
    }
    this.allocatedBlocks.set(ptr, size);
    this.allocationCount++;
    return ptr;
  }
  deallocate(ptr) {
    const size = this.allocatedBlocks.get(ptr);
    if (size === undefined) return false;
    this.allocatedBlocks.delete(ptr);
    this.freeBlocks.push({ offset: ptr, size });
    this._coalesce();
    return true;
  }
  _coalesce() {
    this.freeBlocks.sort((a, b) => a.offset - b.offset);
    const merged = [];
    for (const block of this.freeBlocks) {
      if (merged.length > 0) {
        const last = merged[merged.length - 1];
        if (last.offset + last.size === block.offset) {
          last.size += block.size;
          continue;
        }
      }
      merged.push({ ...block });
    }
    this.freeBlocks = merged;
  }
  largestFreeBlock() {
    if (this.freeBlocks.length === 0) return 0;
    return Math.max(...this.freeBlocks.map(b => b.size));
  }
  fragmentation() {
    if (this.freeBlocks.length <= 1) return 0;
    const totalFree = this.freeBlocks.reduce((s, b) => s + b.size, 0);
    const largest = this.largestFreeBlock();
    return 1 - largest / totalFree;
  }
  getStats() {
    return { allocations: this.allocationCount, freeBlocks: this.freeBlocks.length, totalFree: this.freeBlocks.reduce((s, b) => s + b.size, 0) };
  }
}

check("bump allocator sequential", (() => {
  const ba = new BumpAllocator(100);
  return [ba.allocate(10), ba.allocate(20), ba.allocate(5)];
})(), [0, 10, 30]);
check("bump allocator alignment", (() => {
  const ba = new BumpAllocator(100);
  ba.allocate(3);
  return ba.allocate(8, 8);
})(), 8);
check("bump allocator oom returns null", (() => {
  const ba = new BumpAllocator(10);
  return ba.allocate(20);
})(), null);
check("bump allocator reset", (() => {
  const ba = new BumpAllocator(50);
  ba.allocate(30);
  ba.reset();
  return ba.used();
})(), 0);
check("pool allocator alloc dealloc", (() => {
  const pa = new PoolAllocator(16, 4);
  const p1 = pa.allocate();
  const p2 = pa.allocate();
  pa.deallocate(p1);
  return pa.available();
})(), 3);
check("pool allocator full returns null", (() => {
  const pa = new PoolAllocator(8, 2);
  pa.allocate(); pa.allocate();
  return pa.allocate();
})(), null);
check("pool allocator is allocated", (() => {
  const pa = new PoolAllocator(16, 4);
  const p = pa.allocate();
  return pa.isAllocated(p) && !pa.isAllocated(p + 16);
})(), true);
check("free list first fit", (() => {
  const fl = new FreeListAllocator(100);
  fl.allocate(30); fl.allocate(20);
  fl.deallocate(0);
  return fl.allocate(10, "first-fit");
})(), 0);
check("free list best fit", (() => {
  const fl = new FreeListAllocator(100);
  fl.allocate(10); fl.allocate(40); fl.allocate(10);
  fl.deallocate(0); fl.deallocate(60);
  return fl.allocate(8, "best-fit");
})(), 60);
check("free list coalesces adjacent", (() => {
  const fl = new FreeListAllocator(100);
  fl.allocate(20); fl.allocate(20); fl.allocate(20);
  fl.deallocate(0); fl.deallocate(40);
  fl.deallocate(20);
  return fl.freeBlocks.length;
})(), 1);
check("free list fragmentation zero when contiguous", (() => {
  const fl = new FreeListAllocator(100);
  return fl.fragmentation();
})(), 0);
check("free list dealloc unknown returns false", (() => {
  const fl = new FreeListAllocator(100);
  return fl.deallocate(999);
})(), false);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
