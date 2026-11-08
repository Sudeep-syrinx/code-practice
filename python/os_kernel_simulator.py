"""
A simulated Operating System Kernel.
Includes Process Control Blocks, Memory Paging, 
File System Inodes, Interrupt Handling, and System Calls.
"""

import time
import random
import collections

class ProcessState:
    NEW = "NEW"
    READY = "READY"
    RUNNING = "RUNNING"
    WAITING = "WAITING"
    TERMINATED = "TERMINATED"

class ProcessControlBlock:
    def __init__(self, pid, name, priority):
        self.pid = pid
        self.name = name
        self.priority = priority
        self.state = ProcessState.NEW
        self.registers = {"PC": 0, "SP": 0, "ACC": 0}
        self.page_table = {}
        self.arrival_time = time.time()
        self.burst_time = random.randint(1, 10)
        self.remaining_time = self.burst_time
        self.wait_time = 0

    def __repr__(self):
        return f"PCB({self.pid}, {self.name}, {self.state})"

class MemoryPage:
    def __init__(self, page_num, size=4096):
        self.page_num = page_num
        self.size = size
        self.data = bytearray(size)
        self.valid = False
        self.dirty = False
        self.referenced = False

class MemoryManager:
    def __init__(self, total_frames=16, page_size=4096):
        self.total_frames = total_frames
        self.page_size = page_size
        self.frames = [None] * total_frames
        self.free_frames = list(range(total_frames))
        self.page_faults = 0

    def allocate_frame(self):
        if self.free_frames:
            return self.free_frames.pop(0)
        return self.evict_frame()

    def evict_frame(self):
        self.page_faults += 1
        victim = random.randint(0, self.total_frames - 1)
        old_page = self.frames[victim]
        if old_page:
            old_page.valid = False
        return victim

    def map_page(self, pid, page_num):
        frame = self.allocate_frame()
        page = MemoryPage(page_num)
        page.valid = True
        self.frames[frame] = page
        return frame

class Inode:
    def __init__(self, inode_num, is_directory=False):
        self.inode_num = inode_num
        self.is_directory = is_directory
        self.size = 0
        self.permissions = "rw-r--r--"
        self.created_time = time.time()
        self.blocks = []
        self.children = {} if is_directory else None

class FileSystem:
    def __init__(self):
        self.inodes = {}
        self.next_inode = 1
        self.root = self.create_inode(is_directory=True)

    def create_inode(self, is_directory=False):
        inode = Inode(self.next_inode, is_directory)
        self.inodes[self.next_inode] = inode
        self.next_inode += 1
        return inode

    def mkdir(self, parent_inode, name):
        if parent_inode.is_directory:
            if name not in parent_inode.children:
                new_dir = self.create_inode(is_directory=True)
                parent_inode.children[name] = new_dir
                return new_dir
        return None

    def touch(self, parent_inode, name):
        if parent_inode.is_directory:
            if name not in parent_inode.children:
                new_file = self.create_inode(is_directory=False)
                parent_inode.children[name] = new_file
                return new_file
        return None

class Interrupt:
    def __init__(self, interrupt_type, data=None):
        self.type = interrupt_type
        self.data = data

class Kernel:
    def __init__(self):
        self.process_table = {}
        self.next_pid = 1
        self.ready_queue = collections.deque()
        self.memory = MemoryManager()
        self.fs = FileSystem()
        self.interrupts = collections.deque()
        self.running_process = None
        self.clock_ticks = 0

    def fork(self, name, priority=1):
        pid = self.next_pid
        self.next_pid += 1
        pcb = ProcessControlBlock(pid, name, priority)
        self.process_table[pid] = pcb
        pcb.state = ProcessState.READY
        self.ready_queue.append(pcb)
        return pid

    def schedule(self):
        if not self.ready_queue:
            return None
        highest_priority = min(self.ready_queue, key=lambda p: p.priority)
        self.ready_queue.remove(highest_priority)
        self.running_process = highest_priority
        self.running_process.state = ProcessState.RUNNING
        return self.running_process

    def tick(self):
        self.clock_ticks += 1
        if self.interrupts:
            intr = self.interrupts.popleft()
            self.handle_interrupt(intr)
            
        if not self.running_process:
            self.schedule()
            
        if self.running_process:
            self.running_process.remaining_time -= 1
            if self.running_process.remaining_time <= 0:
                self.running_process.state = ProcessState.TERMINATED
                self.running_process = None
            elif self.clock_ticks % 5 == 0:
                self.running_process.state = ProcessState.READY
                self.ready_queue.append(self.running_process)
                self.running_process = None

    def handle_interrupt(self, intr):
        if intr.type == "SYSCALL_READ":
            self.memory.page_faults += 1
        elif intr.type == "SYSCALL_WRITE":
            pass

if __name__ == "__main__":
    kernel = Kernel()
    kernel.fork("init", 0)
    kernel.fork("bash", 1)
    kernel.fork("python", 2)
    kernel.fork("gcc", 3)
    
    print("Simulating OS Kernel...")
    for i in range(20):
        kernel.tick()
        state = kernel.running_process.name if kernel.running_process else "Idle"
        print(f"Tick {i+1}: Running={state}, Ready Queue={len(kernel.ready_queue)}")
