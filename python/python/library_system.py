class Book:
    def __init__(self, isbn, title, author):
        self.isbn = isbn
        self.title = title
        self.author = author
        self.available = True

    def __str__(self):
        status = "available" if self.available else "checked out"
        return f"{self.title} by {self.author} [{status}]"


class Member:
    MAX_BOOKS = 3

    def __init__(self, member_id, name):
        self.member_id = member_id
        self.name = name
        self.borrowed = []

    def can_borrow(self):
        return len(self.borrowed) < Member.MAX_BOOKS


class Library:
    def __init__(self):
        self.books = {}
        self.members = {}
        self.log = []

    def add_book(self, book):
        self.books[book.isbn] = book

    def add_member(self, member):
        self.members[member.member_id] = member

    def checkout(self, member_id, isbn):
        member = self.members.get(member_id)
        book = self.books.get(isbn)
        if member is None:
            return "Unknown member"
        if book is None:
            return "Unknown book"
        if not book.available:
            return f"'{book.title}' is already checked out"
        if not member.can_borrow():
            return f"{member.name} has reached the limit of {Member.MAX_BOOKS} books"
        book.available = False
        member.borrowed.append(isbn)
        self.log.append(("checkout", member.name, book.title))
        return f"{member.name} borrowed '{book.title}'"

    def return_book(self, member_id, isbn):
        member = self.members.get(member_id)
        book = self.books.get(isbn)
        if member is None or book is None:
            return "Invalid member or book"
        if isbn not in member.borrowed:
            return f"{member.name} does not have '{book.title}'"
        member.borrowed.remove(isbn)
        book.available = True
        self.log.append(("return", member.name, book.title))
        return f"{member.name} returned '{book.title}'"

    def search(self, keyword):
        keyword = keyword.lower()
        return [
            b for b in self.books.values()
            if keyword in b.title.lower() or keyword in b.author.lower()
        ]

    def available_books(self):
        return [b for b in self.books.values() if b.available]

    def report(self):
        print("Library report")
        print("-" * 40)
        for book in self.books.values():
            print(book)
        print("-" * 40)
        for member in self.members.values():
            titles = [self.books[i].title for i in member.borrowed]
            print(f"{member.name}: {titles}")


if __name__ == "__main__":
    lib = Library()
    lib.add_book(Book("111", "Clean Code", "Robert Martin"))
    lib.add_book(Book("222", "The Pragmatic Programmer", "Andrew Hunt"))
    lib.add_book(Book("333", "Introduction to Algorithms", "Thomas Cormen"))
    lib.add_book(Book("444", "Python Crash Course", "Eric Matthes"))
    lib.add_book(Book("555", "Fluent Python", "Luciano Ramalho"))

    lib.add_member(Member(1, "Sudeep"))
    lib.add_member(Member(2, "Ravi"))

    print(lib.checkout(1, "111"))
    print(lib.checkout(2, "111"))
    print(lib.checkout(1, "222"))
    print(lib.checkout(1, "333"))
    print(lib.checkout(1, "444"))
    print(lib.return_book(1, "111"))
    print(lib.checkout(2, "111"))
    print(lib.return_book(2, "999"))

    print([b.title for b in lib.search("python")])
    print(len(lib.available_books()))
    lib.report()
    print(len(lib.log))
