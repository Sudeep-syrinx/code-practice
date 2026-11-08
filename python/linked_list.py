class Node:
    def __init__(self, value):
        self.value = value
        self.next = None


class LinkedList:
    def __init__(self):
        self.head = None
        self.size = 0

    def append(self, value):
        node = Node(value)
        if self.head is None:
            self.head = node
        else:
            cur = self.head
            while cur.next:
                cur = cur.next
            cur.next = node
        self.size += 1

    def prepend(self, value):
        node = Node(value)
        node.next = self.head
        self.head = node
        self.size += 1

    def delete(self, value):
        cur = self.head
        prev = None
        while cur:
            if cur.value == value:
                if prev:
                    prev.next = cur.next
                else:
                    self.head = cur.next
                self.size -= 1
                return True
            prev = cur
            cur = cur.next
        return False

    def find(self, value):
        cur = self.head
        index = 0
        while cur:
            if cur.value == value:
                return index
            cur = cur.next
            index += 1
        return -1

    def reverse(self):
        prev = None
        cur = self.head
        while cur:
            nxt = cur.next
            cur.next = prev
            prev = cur
            cur = nxt
        self.head = prev

    def to_list(self):
        items = []
        cur = self.head
        while cur:
            items.append(cur.value)
            cur = cur.next
        return items

    def __len__(self):
        return self.size


if __name__ == "__main__":
    ll = LinkedList()
    for v in [1, 2, 3]:
        ll.append(v)
    ll.prepend(0)
    print(ll.to_list())     # expected [0, 1, 2, 3]
    print(ll.delete(2))     # expected True
    print(ll.to_list())     # expected [0, 1, 3]
    print(ll.find(3))       # expected 2
    print(ll.find(99))      # expected -1
    ll.reverse()
    print(ll.to_list())     # expected [3, 1, 0]
    print(len(ll))          # expected 3

# ==============================================================================
# EXTENDED LINKED LIST OPERATIONS
# ==============================================================================

class DoublyNode:
    def __init__(self, data):
        self.data = data
        self.next = None
        self.prev = None

class DoublyLinkedList:
    def __init__(self):
        self.head = None
        self.tail = None
        self.size = 0

    def append(self, data):
        new_node = DoublyNode(data)
        if not self.head:
            self.head = new_node
            self.tail = new_node
        else:
            new_node.prev = self.tail
            self.tail.next = new_node
            self.tail = new_node
        self.size += 1

    def prepend(self, data):
        new_node = DoublyNode(data)
        if not self.head:
            self.head = new_node
            self.tail = new_node
        else:
            new_node.next = self.head
            self.head.prev = new_node
            self.head = new_node
        self.size += 1

    def insert_at(self, index, data):
        if index < 0 or index > self.size:
            raise IndexError("Index out of bounds")
        if index == 0:
            self.prepend(data)
            return
        if index == self.size:
            self.append(data)
            return
        new_node = DoublyNode(data)
        current = self.head
        for _ in range(index - 1):
            current = current.next
        new_node.next = current.next
        new_node.prev = current
        current.next.prev = new_node
        current.next = new_node
        self.size += 1

    def remove(self, data):
        current = self.head
        while current:
            if current.data == data:
                if current.prev:
                    current.prev.next = current.next
                else:
                    self.head = current.next
                if current.next:
                    current.next.prev = current.prev
                else:
                    self.tail = current.prev
                self.size -= 1
                return True
            current = current.next
        return False

    def display_forward(self):
        elements = []
        current = self.head
        while current:
            elements.append(current.data)
            current = current.next
        return elements

    def display_backward(self):
        elements = []
        current = self.tail
        while current:
            elements.append(current.data)
            current = current.prev
        return elements

def test_doubly_linked_list():
    dll = DoublyLinkedList()
    dll.append(1)
    dll.append(2)
    dll.append(3)
    dll.prepend(0)
    dll.insert_at(2, 1.5)
    print("Forward:", dll.display_forward())
    print("Backward:", dll.display_backward())
    dll.remove(1.5)
    print("After remove:", dll.display_forward())

if __name__ == "__main__":
    test_doubly_linked_list()
