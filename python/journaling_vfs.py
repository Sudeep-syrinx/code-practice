import json
import time
from typing import Dict, List, Optional, Tuple

class Inode:
    def __init__(self, ino: int, is_dir: bool = False):
        self.ino = ino
        self.is_dir = is_dir
        self.size = 0
        self.created_at = time.time()
        self.modified_at = self.created_at
        self.blocks: List[int] = [] # Pointers to data blocks
        # For directories, data block contains JSON dict mapping filename -> ino

class FileDescriptor:
    def __init__(self, ino: int, mode: str):
        self.ino = ino
        self.mode = mode
        self.cursor = 0

class JournalEntry:
    def __init__(self, tx_id: int, operation: str, args: dict):
        self.tx_id = tx_id
        self.operation = operation
        self.args = args
        self.committed = False

class JournalingVFS:
    def __init__(self, block_size=4096, total_blocks=1024):
        self.block_size = block_size
        self.total_blocks = total_blocks
        
        self.inodes: Dict[int, Inode] = {}
        self.blocks: Dict[int, bytearray] = {}
        
        self.free_blocks = set(range(total_blocks))
        self.free_inodes = set(range(1, total_blocks)) # 0 reserved for root
        
        self.journal: List[JournalEntry] = []
        self.tx_counter = 0
        
        self.open_files: Dict[int, FileDescriptor] = {}
        self.fd_counter = 100
        
        self._format()

    def _format(self):
        root_ino = 0
        self.free_inodes.discard(root_ino)
        root = Inode(root_ino, is_dir=True)
        self.inodes[root_ino] = root
        
        dir_block = self._alloc_block()
        root.blocks.append(dir_block)
        self._write_dir(dir_block, {".": root_ino, "..": root_ino})

    def _alloc_block(self) -> int:
        if not self.free_blocks: raise Exception("Out of space")
        b = self.free_blocks.pop()
        self.blocks[b] = bytearray(self.block_size)
        return b

    def _alloc_inode(self) -> int:
        if not self.free_inodes: raise Exception("Out of inodes")
        i = self.free_inodes.pop()
        return i

    def _read_dir(self, block_idx: int) -> dict:
        data = self.blocks[block_idx].decode('utf-8').strip('\x00')
        return json.loads(data) if data else {}

    def _write_dir(self, block_idx: int, dir_data: dict):
        data = json.dumps(dir_data).encode('utf-8')
        if len(data) > self.block_size: raise Exception("Directory too large")
        self.blocks[block_idx][:len(data)] = data
        for i in range(len(data), self.block_size):
            self.blocks[block_idx][i] = 0

    def begin_transaction(self, op: str, args: dict) -> int:
        self.tx_counter += 1
        tx = JournalEntry(self.tx_counter, op, args)
        self.journal.append(tx)
        return self.tx_counter

    def commit_transaction(self, tx_id: int):
        for tx in self.journal:
            if tx.tx_id == tx_id:
                tx.committed = True
                break

    def path_to_inode(self, path: str) -> Optional[int]:
        if path == "/": return 0
        parts = [p for p in path.split("/") if p]
        curr = 0
        
        for part in parts:
            if not self.inodes[curr].is_dir: return None
            dir_data = self._read_dir(self.inodes[curr].blocks[0])
            if part not in dir_data: return None
            curr = dir_data[part]
        return curr

    def mkdir(self, path: str) -> bool:
        parent_path, _, name = path.rpartition("/")
        parent_path = parent_path or "/"
        
        parent_ino = self.path_to_inode(parent_path)
        if parent_ino is None: return False
        
        dir_data = self._read_dir(self.inodes[parent_ino].blocks[0])
        if name in dir_data: return False
        
        tx = self.begin_transaction("mkdir", {"parent": parent_ino, "name": name})
        
        new_ino = self._alloc_inode()
        new_inode = Inode(new_ino, is_dir=True)
        self.inodes[new_ino] = new_inode
        
        b = self._alloc_block()
        new_inode.blocks.append(b)
        self._write_dir(b, {".": new_ino, "..": parent_ino})
        
        dir_data[name] = new_ino
        self._write_dir(self.inodes[parent_ino].blocks[0], dir_data)
        
        self.commit_transaction(tx)
        return True

    def create_file(self, path: str) -> bool:
        parent_path, _, name = path.rpartition("/")
        parent_path = parent_path or "/"
        
        parent_ino = self.path_to_inode(parent_path)
        if parent_ino is None: return False
        
        dir_data = self._read_dir(self.inodes[parent_ino].blocks[0])
        if name in dir_data: return False
        
        tx = self.begin_transaction("create_file", {"parent": parent_ino, "name": name})
        
        new_ino = self._alloc_inode()
        self.inodes[new_ino] = Inode(new_ino, is_dir=False)
        
        dir_data[name] = new_ino
        self._write_dir(self.inodes[parent_ino].blocks[0], dir_data)
        
        self.commit_transaction(tx)
        return True

    def open(self, path: str, mode: str = "r") -> Optional[int]:
        ino = self.path_to_inode(path)
        if ino is None:
            if "w" in mode or "a" in mode:
                if not self.create_file(path): return None
                ino = self.path_to_inode(path)
            else:
                return None
                
        fd = self.fd_counter
        self.fd_counter += 1
        
        fdesc = FileDescriptor(ino, mode)
        if "a" in mode:
            fdesc.cursor = self.inodes[ino].size
        if "w" in mode and "a" not in mode:
            # Truncate
            for b in self.inodes[ino].blocks:
                self.free_blocks.add(b)
            self.inodes[ino].blocks = []
            self.inodes[ino].size = 0
            
        self.open_files[fd] = fdesc
        return fd

    def write(self, fd: int, data: bytes) -> int:
        if fd not in self.open_files: raise Exception("Invalid FD")
        fdesc = self.open_files[fd]
        if "w" not in fdesc.mode and "a" not in fdesc.mode: raise Exception("File not open for writing")
        
        inode = self.inodes[fdesc.ino]
        written = 0
        tx = self.begin_transaction("write", {"ino": fdesc.ino, "size": len(data)})
        
        while written < len(data):
            block_idx = fdesc.cursor // self.block_size
            offset = fdesc.cursor % self.block_size
            
            if block_idx >= len(inode.blocks):
                inode.blocks.append(self._alloc_block())
                
            b = inode.blocks[block_idx]
            chunk_size = min(len(data) - written, self.block_size - offset)
            
            self.blocks[b][offset:offset+chunk_size] = data[written:written+chunk_size]
            
            written += chunk_size
            fdesc.cursor += chunk_size
            inode.size = max(inode.size, fdesc.cursor)
            
        inode.modified_at = time.time()
        self.commit_transaction(tx)
        return written

    def read(self, fd: int, size: int = -1) -> bytes:
        if fd not in self.open_files: raise Exception("Invalid FD")
        fdesc = self.open_files[fd]
        if "r" not in fdesc.mode: raise Exception("File not open for reading")
        
        inode = self.inodes[fdesc.ino]
        if size == -1: size = inode.size - fdesc.cursor
        size = min(size, inode.size - fdesc.cursor)
        
        result = bytearray()
        read_bytes = 0
        
        while read_bytes < size:
            block_idx = fdesc.cursor // self.block_size
            offset = fdesc.cursor % self.block_size
            
            if block_idx >= len(inode.blocks): break
            b = inode.blocks[block_idx]
            
            chunk_size = min(size - read_bytes, self.block_size - offset)
            result.extend(self.blocks[b][offset:offset+chunk_size])
            
            read_bytes += chunk_size
            fdesc.cursor += chunk_size
            
        return bytes(result)

    def close(self, fd: int):
        if fd in self.open_files:
            del self.open_files[fd]

    def ls(self, path: str) -> List[str]:
        ino = self.path_to_inode(path)
        if ino is None or not self.inodes[ino].is_dir: return []
        dir_data = self._read_dir(self.inodes[ino].blocks[0])
        return list(dir_data.keys())

if __name__ == "__main__":
    print("--- JOURNALING VIRTUAL FILE SYSTEM ---")
    vfs = JournalingVFS()
    
    print("Creating directories...")
    vfs.mkdir("/etc")
    vfs.mkdir("/home")
    vfs.mkdir("/home/sudeep")
    
    print("Root ls:", vfs.ls("/"))
    print("Home ls:", vfs.ls("/home"))
    
    print("\nWriting to file /home/sudeep/config.txt...")
    fd = vfs.open("/home/sudeep/config.txt", "w")
    vfs.write(fd, b"SYSTEM_INIT=1\nUSER=sudeep\n")
    vfs.close(fd)
    
    print("Appending to file...")
    fd = vfs.open("/home/sudeep/config.txt", "a")
    vfs.write(fd, b"PATH=/usr/bin\n")
    vfs.close(fd)
    
    print("Reading file:")
    fd = vfs.open("/home/sudeep/config.txt", "r")
    data = vfs.read(fd)
    vfs.close(fd)
    print(data.decode('utf-8'))
    
    print("Journal Log:")
    for tx in vfs.journal:
        print(f"TX: {tx.tx_id} | OP: {tx.operation} | COMMITTED: {tx.committed} | ARGS: {tx.args}")
