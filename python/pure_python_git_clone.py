import os
import hashlib
import zlib
import struct
from datetime import datetime

# --- Miniature Git Implementation ---
class MiniGit:
    def __init__(self, repo_path=".minigit"):
        self.repo_path = repo_path
        self.obj_path = os.path.join(self.repo_path, "objects")
        self.refs_path = os.path.join(self.repo_path, "refs", "heads")
        self.index_path = os.path.join(self.repo_path, "index")
        
    def init(self):
        if os.path.exists(self.repo_path):
            print("Repository already exists.")
            return
        os.makedirs(self.obj_path)
        os.makedirs(self.refs_path)
        with open(os.path.join(self.repo_path, "HEAD"), 'w') as f:
            f.write("ref: refs/heads/master\n")
        print(f"Initialized empty MiniGit repository in {os.path.abspath(self.repo_path)}")

    def _hash_object(self, data, obj_type, write=True):
        header = f"{obj_type} {len(data)}\0".encode()
        full_data = header + data if isinstance(data, bytes) else header + data.encode()
        sha1 = hashlib.sha1(full_data).hexdigest()
        
        if write:
            path = os.path.join(self.obj_path, sha1[:2])
            os.makedirs(path, exist_ok=True)
            file_path = os.path.join(path, sha1[2:])
            if not os.path.exists(file_path):
                with open(file_path, 'wb') as f:
                    f.write(zlib.compress(full_data))
        return sha1

    def _read_object(self, sha1):
        path = os.path.join(self.obj_path, sha1[:2], sha1[2:])
        if not os.path.exists(path):
            raise ValueError(f"Object {sha1} not found")
        with open(path, 'rb') as f:
            raw = zlib.decompress(f.read())
        null_idx = raw.index(b'\0')
        header = raw[:null_idx].decode()
        obj_type, size = header.split()
        data = raw[null_idx+1:]
        return obj_type, data

    def add(self, file_path):
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            return
        with open(file_path, 'rb') as f:
            data = f.read()
        sha1 = self._hash_object(data, "blob")
        
        # Simple index implementation (append only for simplicity in this demo)
        index_entries = self._read_index()
        index_entries[file_path] = sha1
        self._write_index(index_entries)
        print(f"Added {file_path} (Blob: {sha1[:7]})")

    def _read_index(self):
        entries = {}
        if os.path.exists(self.index_path):
            with open(self.index_path, 'r') as f:
                for line in f:
                    path, sha1 = line.strip().split()
                    entries[path] = sha1
        return entries

    def _write_index(self, entries):
        with open(self.index_path, 'w') as f:
            for path, sha1 in entries.items():
                f.write(f"{path} {sha1}\n")

    def _write_tree(self):
        entries = self._read_index()
        tree_data = b""
        for path, sha1 in sorted(entries.items()):
            mode = b"100644"
            name = os.path.basename(path).encode()
            bin_sha = bytes.fromhex(sha1)
            tree_data += mode + b" " + name + b"\0" + bin_sha
        return self._hash_object(tree_data, "tree")

    def _get_head_commit(self):
        head_path = os.path.join(self.repo_path, "HEAD")
        if not os.path.exists(head_path): return None
        with open(head_path, 'r') as f:
            ref = f.read().strip()
        if ref.startswith("ref: "):
            ref_path = os.path.join(self.repo_path, ref[5:])
            if os.path.exists(ref_path):
                with open(ref_path, 'r') as f:
                    return f.read().strip()
        return None

    def _update_ref(self, ref_path, sha1):
        full_path = os.path.join(self.repo_path, ref_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w') as f:
            f.write(sha1 + "\n")

    def commit(self, message):
        tree_sha1 = self._write_tree()
        parent_sha1 = self._get_head_commit()
        
        timestamp = int(datetime.now().timestamp())
        tz_offset = "+0000"
        author = f"MiniGit User <user@example.com> {timestamp} {tz_offset}"
        
        commit_data = f"tree {tree_sha1}\n"
        if parent_sha1:
            commit_data += f"parent {parent_sha1}\n"
        commit_data += f"author {author}\ncommitter {author}\n\n{message}\n"
        
        commit_sha1 = self._hash_object(commit_data, "commit")
        
        # Update HEAD (assuming master)
        with open(os.path.join(self.repo_path, "HEAD"), 'r') as f:
            ref = f.read().strip()
            if ref.startswith("ref: "):
                self._update_ref(ref[5:], commit_sha1)
                
        print(f"[{'master'} {commit_sha1[:7]}] {message}")

    def log(self):
        current_sha1 = self._get_head_commit()
        if not current_sha1:
            print("No commits yet.")
            return
            
        while current_sha1:
            obj_type, data = self._read_object(current_sha1)
            lines = data.decode().split('\n')
            
            print(f"commit {current_sha1}")
            parent = None
            message_start = False
            for line in lines:
                if line.startswith("author "):
                    print(f"Author: {line[7:]}")
                elif line.startswith("parent "):
                    parent = line[7:]
                elif line == "" and not message_start:
                    message_start = True
                elif message_start and line:
                    print(f"\n    {line}\n")
                    
            current_sha1 = parent

if __name__ == "__main__":
    print("--- MINIATURE GIT IMPLEMENTATION ---")
    
    # Create test environment
    test_dir = "minigit_test_env"
    if not os.path.exists(test_dir):
        os.makedirs(test_dir)
    os.chdir(test_dir)
    
    mg = MiniGit()
    mg.init()
    
    print("\nCreating file1.txt...")
    with open("file1.txt", "w") as f:
        f.write("Hello MiniGit World!\n")
    
    mg.add("file1.txt")
    mg.commit("Initial commit with file1")
    
    print("\nCreating file2.txt...")
    with open("file2.txt", "w") as f:
        f.write("This is the second file.\n")
        
    mg.add("file2.txt")
    mg.commit("Add file2.txt")
    
    print("\nCommit History:")
    mg.log()
