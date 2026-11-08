class FileNode:
    def __init__(self, name, is_dir=False, content=""):
        self.name = name
        self.is_dir = is_dir
        self.content = content
        self.children = {} if is_dir else None
        self.parent = None
        self.created = 0
        self.modified = 0

class FileSystem:
    def __init__(self):
        self.root = FileNode("/", is_dir=True)
        self.cwd = self.root
        self.time = 0

    def _resolve(self, path):
        if path.startswith("/"):
            node = self.root
            parts = [p for p in path.split("/") if p]
        else:
            node = self.cwd
            parts = [p for p in path.split("/") if p]
        for part in parts:
            if part == ".":
                continue
            if part == "..":
                if node.parent:
                    node = node.parent
                continue
            if not node.is_dir or part not in node.children:
                return None
            node = node.children[part]
        return node

    def _path_of(self, node):
        parts = []
        while node and node != self.root:
            parts.append(node.name)
            node = node.parent
        return "/" + "/".join(reversed(parts)) if parts else "/"

    def mkdir(self, path):
        self.time += 1
        if path.startswith("/"):
            parent = self.root
            parts = [p for p in path.split("/") if p]
        else:
            parent = self.cwd
            parts = [p for p in path.split("/") if p]
        if not parts:
            return False
        for part in parts[:-1]:
            if part not in parent.children:
                new = FileNode(part, is_dir=True)
                new.parent = parent
                new.created = new.modified = self.time
                parent.children[part] = new
            parent = parent.children[part]
            if not parent.is_dir:
                return False
        name = parts[-1]
        if name in parent.children:
            return False
        node = FileNode(name, is_dir=True)
        node.parent = parent
        node.created = node.modified = self.time
        parent.children[name] = node
        return True

    def write(self, path, content):
        self.time += 1
        node = self._resolve(path)
        if node and not node.is_dir:
            node.content = content
            node.modified = self.time
            return True
        # create file
        if path.startswith("/"):
            parent = self.root
            parts = [p for p in path.split("/") if p]
        else:
            parent = self.cwd
            parts = [p for p in path.split("/") if p]
        if not parts:
            return False
        for part in parts[:-1]:
            if part not in parent.children:
                new = FileNode(part, is_dir=True)
                new.parent = parent
                new.created = new.modified = self.time
                parent.children[part] = new
            parent = parent.children[part]
            if not parent.is_dir:
                return False
        name = parts[-1]
        if name in parent.children and parent.children[name].is_dir:
            return False
        if name in parent.children:
            node = parent.children[name]
            node.content = content
            node.modified = self.time
        else:
            node = FileNode(name, is_dir=False, content=content)
            node.parent = parent
            node.created = node.modified = self.time
            parent.children[name] = node
        return True

    def read(self, path):
        node = self._resolve(path)
        if node and not node.is_dir:
            return node.content
        return None

    def ls(self, path=None):
        node = self._resolve(path) if path else self.cwd
        if not node or not node.is_dir:
            return None
        return sorted(node.children.keys())

    def cd(self, path):
        node = self._resolve(path)
        if node and node.is_dir:
            self.cwd = node
            return True
        return False

    def pwd(self):
        return self._path_of(self.cwd)

    def rm(self, path):
        node = self._resolve(path)
        if not node or node == self.root:
            return False
        parent = node.parent
        del parent.children[node.name]
        return True

    def tree(self, node=None, prefix=""):
        if node is None:
            node = self.root
        lines = []
        if node == self.root:
            lines.append("/")
        children = sorted(node.children.items()) if node.is_dir else []
        for i, (name, child) in enumerate(children):
            is_last = i == len(children) - 1
            connector = "└── " if is_last else "├── "
            lines.append(prefix + connector + name + ("/" if child.is_dir else ""))
            if child.is_dir:
                extension = "    " if is_last else "│   "
                lines.extend(self.tree(child, prefix + extension))
        return lines

if __name__ == "__main__":
    fs = FileSystem()
    fs.mkdir("/home")
    fs.mkdir("/home/sudeep")
    fs.mkdir("/home/sudeep/projects")
    fs.mkdir("/var/log")
    fs.write("/home/sudeep/notes.txt", "Learning Python algorithms\nDay 1: trees and graphs")
    fs.write("/home/sudeep/projects/readme.md", "# Code Practice\nLots of good stuff here.")
    fs.write("/var/log/system.log", "boot ok\nservice started")
    fs.write("/home/sudeep/todo.txt", "1. Finish AVL\n2. Write filesystem\n3. Sleep")

    print("PWD:", fs.pwd())
    print("LS /home:", fs.ls("/home"))
    print()
    print("Tree:")
    for line in fs.tree():
        print(line)
    print()
    print("Read notes.txt:")
    print(fs.read("/home/sudeep/notes.txt"))
    print()
    fs.cd("/home/sudeep")
    print("After cd, PWD:", fs.pwd())
    print("LS . :", fs.ls())
    print("LS projects:", fs.ls("projects"))
    print()
    fs.write("projects/main.py", "print('hello from simulated fs')")
    print("Created main.py")
    print("Tree now:")
    for line in fs.tree():
        print(line)
    print()
    print("rm todo.txt:", fs.rm("todo.txt"))
    print("LS after rm:", fs.ls())
    print("Read missing:", fs.read("todo.txt"))
