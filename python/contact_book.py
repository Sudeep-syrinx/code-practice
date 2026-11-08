class Contact:
    def __init__(self, name, phone, email="", tags=None):
        name = name.strip()
        if not name:
            raise ValueError("name is required")
        if "|" in name:
            raise ValueError("name cannot contain a pipe")
        digits = "".join(ch for ch in phone if ch.isdigit())
        if not 7 <= len(digits) <= 15:
            raise ValueError("phone must have 7 to 15 digits")
        if email and not self.valid_email(email):
            raise ValueError("bad email: " + email)
        self.name = name
        self.phone = digits
        self.email = email.strip()
        self.tags = sorted(set(tags or []))

    @staticmethod
    def valid_email(email):
        email = email.strip()
        if email.count("@") != 1:
            return False
        local, domain = email.split("@")
        if not local or "." not in domain:
            return False
        if domain.startswith(".") or domain.endswith("."):
            return False
        return True

    def to_line(self):
        return "|".join([self.name, self.phone, self.email, ",".join(self.tags)])

    @staticmethod
    def from_line(line):
        parts = line.split("|")
        if len(parts) != 4:
            raise ValueError("bad line: " + line)
        tags = [t for t in parts[3].split(",") if t]
        return Contact(parts[0], parts[1], parts[2], tags)


class ContactBook:
    def __init__(self):
        self.contacts = {}

    def add(self, contact):
        key = contact.name.lower()
        if key in self.contacts:
            raise ValueError("duplicate contact: " + contact.name)
        self.contacts[key] = contact

    def remove(self, name):
        key = name.strip().lower()
        if key not in self.contacts:
            raise KeyError(name)
        del self.contacts[key]

    def find(self, name):
        return self.contacts.get(name.strip().lower())

    def count(self):
        return len(self.contacts)

    def search(self, text):
        text = text.strip().lower()
        found = []
        for contact in self.contacts.values():
            if text in contact.name.lower() or text in contact.email.lower():
                found.append(contact)
        return sorted(found, key=lambda c: c.name.lower())

    def list_sorted(self):
        return sorted(self.contacts.values(), key=lambda c: c.name.lower())

    def names(self):
        return [c.name for c in self.list_sorted()]

    def update_phone(self, name, phone):
        contact = self.find(name)
        if contact is None:
            raise KeyError(name)
        updated = Contact(contact.name, phone, contact.email, contact.tags)
        self.contacts[name.strip().lower()] = updated

    def add_tag(self, name, tag):
        contact = self.find(name)
        if contact is None:
            raise KeyError(name)
        if tag not in contact.tags:
            contact.tags.append(tag)
            contact.tags.sort()

    def with_tag(self, tag):
        return [c.name for c in self.list_sorted() if tag in c.tags]

    def starting_with(self, letter):
        letter = letter.lower()
        return [c.name for c in self.list_sorted() if c.name.lower().startswith(letter)]

    def to_lines(self):
        return [c.to_line() for c in self.list_sorted()]

    @staticmethod
    def from_lines(lines):
        book = ContactBook()
        for line in lines:
            if line.strip():
                book.add(Contact.from_line(line))
        return book


def raises(fn, exc):
    try:
        fn()
    except exc:
        return True
    return False


if __name__ == "__main__":
    results = []

    def check(name, actual, expected):
        ok = actual == expected
        results.append(ok)
        print(f"{name:<26}{str(actual)[:40]:<42}{'ok' if ok else 'MISMATCH expected ' + repr(expected)}")

    book = ContactBook()
    book.add(Contact("Ann Lee", "555-123-4567", "ann@example.com", ["work"]))
    book.add(Contact("bob stone", "(555) 987 6543", "bob@mail.org", ["friend", "gym"]))
    book.add(Contact("Carl Young", "5551112222"))
    book.add(Contact("Anita Ray", "555 000 1234", "anita@site.net", ["work", "gym"]))

    check("count", book.count(), 4)
    check("sorted names", book.names(), ["Anita Ray", "Ann Lee", "bob stone", "Carl Young"])
    check("find ignores case", book.find("ANN LEE").phone, "5551234567")
    check("phone cleaned", book.find("bob stone").phone, "5559876543")
    check("find missing", book.find("nobody"), None)
    check("search name", [c.name for c in book.search("ann")], ["Anita Ray", "Ann Lee"])
    check("search email", [c.name for c in book.search("mail.org")], ["bob stone"])
    check("search nothing", book.search("zzz"), [])
    check("with tag work", book.with_tag("work"), ["Anita Ray", "Ann Lee"])
    check("with tag gym", book.with_tag("gym"), ["Anita Ray", "bob stone"])
    check("starts with", book.starting_with("a"), ["Anita Ray", "Ann Lee"])

    print()
    book.update_phone("Carl Young", "555-333-4444")
    check("update phone", book.find("carl young").phone, "5553334444")
    book.add_tag("Carl Young", "new")
    book.add_tag("Carl Young", "new")
    check("add tag once", book.find("Carl Young").tags, ["new"])
    book.remove("Anita Ray")
    check("after remove", book.count(), 3)
    check("remove missing", raises(lambda: book.remove("Anita Ray"), KeyError), True)
    check("update missing", raises(lambda: book.update_phone("x", "5551234567"), KeyError), True)

    print()
    check("duplicate", raises(lambda: book.add(Contact("ann lee", "5551234567")), ValueError), True)
    check("empty name", raises(lambda: Contact("  ", "5551234567"), ValueError), True)
    check("pipe in name", raises(lambda: Contact("a|b", "5551234567"), ValueError), True)
    check("short phone", raises(lambda: Contact("Zed", "123"), ValueError), True)
    check("bad email no at", raises(lambda: Contact("Zed", "5551234567", "zed.example.com"), ValueError), True)
    check("bad email no dot", raises(lambda: Contact("Zed", "5551234567", "zed@example"), ValueError), True)
    check("bad email two at", raises(lambda: Contact("Zed", "5551234567", "a@b@c.com"), ValueError), True)
    check("valid email", Contact.valid_email("x@y.co"), True)
    check("bad line", raises(lambda: Contact.from_line("only|two"), ValueError), True)

    print()
    lines = book.to_lines()
    check("line count", len(lines), 3)
    check("first line", lines[0], "Ann Lee|5551234567|ann@example.com|work")
    copy = ContactBook.from_lines(lines)
    check("copy names", copy.names(), book.names())
    check("copy lines", copy.to_lines(), lines)
    check("copy tags", copy.find("bob stone").tags, ["friend", "gym"])
    check("blank lines skipped", ContactBook.from_lines(["", "  "]).count(), 0)

    big = ContactBook()
    for i in range(500):
        big.add(Contact("Person %03d" % i, "55500%05d" % i))
    check("500 contacts", big.count(), 500)
    check("big search", len(big.search("person 49")), 10)
    check("big first", big.names()[0], "Person 000")

    print()
    print("Passed      :", sum(results), "of", len(results))
    print("All correct :", all(results))
