import json
import re


class JSONError(Exception):
    pass


class JSONParser:
    def __init__(self, text):
        self.text = text
        self.pos = 0

    def error(self, message):
        raise JSONError(f"{message} at position {self.pos}")

    def peek(self):
        if self.pos < len(self.text):
            return self.text[self.pos]
        return ""

    def skip(self):
        while self.pos < len(self.text) and self.text[self.pos] in " \t\n\r":
            self.pos += 1

    def parse(self):
        value = self.value()
        self.skip()
        if self.pos != len(self.text):
            self.error("Extra data")
        return value

    def value(self):
        self.skip()
        ch = self.peek()
        if ch == "":
            self.error("Unexpected end of input")
        if ch == "{":
            return self.obj()
        if ch == "[":
            return self.array()
        if ch == '"':
            return self.string()
        if ch == "-" or ch.isdigit():
            return self.number()
        for word, result in (("true", True), ("false", False), ("null", None)):
            if self.text.startswith(word, self.pos):
                self.pos += len(word)
                return result
        self.error(f"Unexpected character {ch!r}")

    def obj(self):
        self.pos += 1
        result = {}
        self.skip()
        if self.peek() == "}":
            self.pos += 1
            return result
        while True:
            self.skip()
            if self.peek() != '"':
                self.error("Expected string key")
            key = self.string()
            self.skip()
            if self.peek() != ":":
                self.error("Expected ':'")
            self.pos += 1
            result[key] = self.value()
            self.skip()
            ch = self.peek()
            if ch == ",":
                self.pos += 1
            elif ch == "}":
                self.pos += 1
                return result
            else:
                self.error("Expected ',' or '}'")

    def array(self):
        self.pos += 1
        items = []
        self.skip()
        if self.peek() == "]":
            self.pos += 1
            return items
        while True:
            items.append(self.value())
            self.skip()
            ch = self.peek()
            if ch == ",":
                self.pos += 1
            elif ch == "]":
                self.pos += 1
                return items
            else:
                self.error("Expected ',' or ']'")

    def string(self):
        self.pos += 1
        out = []
        escapes = {'"': '"', "\\": "\\", "/": "/", "b": "\b", "f": "\f", "n": "\n", "r": "\r", "t": "\t"}
        while self.pos < len(self.text):
            ch = self.text[self.pos]
            if ch == '"':
                self.pos += 1
                return "".join(out)
            if ch == "\\":
                self.pos += 1
                if self.pos >= len(self.text):
                    break
                esc = self.text[self.pos]
                if esc == "u":
                    digits = self.text[self.pos + 1:self.pos + 5]
                    if len(digits) != 4:
                        self.error("Bad unicode escape")
                    try:
                        out.append(chr(int(digits, 16)))
                    except ValueError:
                        self.error("Bad unicode escape")
                    self.pos += 4
                elif esc in escapes:
                    out.append(escapes[esc])
                else:
                    self.error("Bad escape")
            else:
                out.append(ch)
            self.pos += 1
        self.error("Unterminated string")

    def number(self):
        start = self.pos
        is_float = False
        if self.peek() == "-":
            self.pos += 1
        while self.peek().isdigit():
            self.pos += 1
        if self.peek() == ".":
            is_float = True
            self.pos += 1
            while self.peek().isdigit():
                self.pos += 1
        if self.peek() in ("e", "E"):
            is_float = True
            self.pos += 1
            if self.peek() in ("+", "-"):
                self.pos += 1
            while self.peek().isdigit():
                self.pos += 1
        raw = self.text[start:self.pos]
        try:
            return float(raw) if is_float else int(raw)
        except ValueError:
            self.error(f"Bad number {raw!r}")


def loads(text):
    return JSONParser(text).parse()


def quote(text):
    out = ['"']
    for ch in text:
        if ch == '"':
            out.append('\\"')
        elif ch == "\\":
            out.append("\\\\")
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\t":
            out.append("\\t")
        elif ord(ch) < 32:
            out.append(f"\\u{ord(ch):04x}")
        else:
            out.append(ch)
    out.append('"')
    return "".join(out)


def dumps(value, indent=2, level=0):
    pad = " " * (indent * (level + 1))
    end_pad = " " * (indent * level)
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, str):
        return quote(value)
    if isinstance(value, list):
        if not value:
            return "[]"
        items = ",\n".join(pad + dumps(v, indent, level + 1) for v in value)
        return "[\n" + items + "\n" + end_pad + "]"
    if isinstance(value, dict):
        if not value:
            return "{}"
        items = ",\n".join(f"{pad}{quote(k)}: {dumps(v, indent, level + 1)}" for k, v in value.items())
        return "{\n" + items + "\n" + end_pad + "}"
    raise TypeError(f"Cannot serialise {type(value).__name__}")


def get_path(data, path):
    current = data
    for token in re.findall(r"[^.\[\]]+", path):
        if isinstance(current, list):
            current = current[int(token)]
        else:
            current = current[token]
    return current


def depth(value):
    if isinstance(value, dict):
        return 1 + max((depth(v) for v in value.values()), default=0)
    if isinstance(value, list):
        return 1 + max((depth(v) for v in value), default=0)
    return 0


def count_values(value):
    if isinstance(value, dict):
        return sum(count_values(v) for v in value.values())
    if isinstance(value, list):
        return sum(count_values(v) for v in value)
    return 1


if __name__ == "__main__":
    document = r"""
    {
        "name": "Sudeep",
        "age": 25,
        "score": 91.5,
        "ratio": -1.5e2,
        "active": true,
        "nothing": null,
        "tags": ["python", "git", "vscode"],
        "address": {"city": "Bengaluru", "pin": 560001, "geo": {"lat": 12.97, "lng": 77.59}},
        "projects": [
            {"title": "code-practice", "stars": 3},
            {"title": "notes", "stars": 0}
        ],
        "escaped": "line1\nline2 \u0041 \"quoted\""
    }
    """

    data = loads(document)
    print("Matches built-in json:", data == json.loads(document))
    print("Name          :", get_path(data, "name"))
    print("City          :", get_path(data, "address.city"))
    print("Longitude     :", get_path(data, "address.geo.lng"))
    print("Second tag    :", get_path(data, "tags[1]"))
    print("Project title :", get_path(data, "projects[0].title"))
    print("Depth         :", depth(data))
    print("Leaf values   :", count_values(data))
    print()
    pretty = dumps(data)
    print(pretty)
    print()
    print("Round trip    :", loads(pretty) == data)

    print()
    broken = ['{"a": }', "[1, 2", '{"a" 1}', '"abc', "[1,]", "tru", "[1] 2", '{"a": "\\q"}']
    for text in broken:
        try:
            loads(text)
            print(f"{text!r:<14} parsed")
        except JSONError as e:
            print(f"{text!r:<14} JSONError: {e}")
