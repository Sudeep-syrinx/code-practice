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
