class Tokenizer:
    def __init__(self, text):
        self.text = text
        self.pos = 0

    def peek(self):
        while self.pos < len(self.text) and self.text[self.pos] in " \t\n\r":
            self.pos += 1
        return self.text[self.pos] if self.pos < len(self.text) else ""

    def next(self):
        ch = self.peek()
        if ch:
            self.pos += 1
        return ch

    def read_string(self):
        self.pos += 1
        result = []
        while self.pos < len(self.text):
            ch = self.text[self.pos]
            self.pos += 1
            if ch == '"':
                return "".join(result)
            if ch == '\\':
                esc = self.text[self.pos]
                self.pos += 1
                mapping = {'"': '"', '\\': '\\', '/': '/', 'b': '\b', 'f': '\f', 'n': '\n', 'r': '\r', 't': '\t'}
                result.append(mapping.get(esc, esc))
            else:
                result.append(ch)
        raise ValueError("Unterminated string")

    def read_number(self):
        start = self.pos
        if self.text[self.pos] == '-':
            self.pos += 1
        while self.pos < len(self.text) and (self.text[self.pos].isdigit() or self.text[self.pos] in ".eE+-"):
            self.pos += 1
        return float(self.text[start:self.pos])


def parse_json(text):
    tok = Tokenizer(text)

    def parse_value():
        ch = tok.peek()
        if ch == "{":
            return parse_object()
        if ch == "[":
            return parse_array()
        if ch == '"':
            return tok.read_string()
        if ch.isdigit() or ch == "-":
            return tok.read_number()
        if text[tok.pos:tok.pos+4] == "true":
            tok.pos += 4
            return True
        if text[tok.pos:tok.pos+5] == "false":
            tok.pos += 5
            return False
        if text[tok.pos:tok.pos+4] == "null":
            tok.pos += 4
            return None
        raise ValueError(f"Unexpected character: {ch}")

    def parse_object():
        tok.next()
        obj = {}
        if tok.peek() == "}":
            tok.next()
            return obj
        while True:
            key = tok.read_string()
            if tok.next() != ":":
                raise ValueError("Expected ':'")
            obj[key] = parse_value()
            ch = tok.next()
            if ch == "}":
                return obj
            if ch != ",":
                raise ValueError("Expected ',' or '}'")

    def parse_array():
        tok.next()
        arr = []
        if tok.peek() == "]":
            tok.next()
            return arr
        while True:
            arr.append(parse_value())
            ch = tok.next()
            if ch == "]":
                return arr
            if ch != ",":
                raise ValueError("Expected ',' or ']'")

    return parse_value()


if __name__ == "__main__":
    sample = '{"name": "Alice", "age": 30, "active": true, "scores": [95, 88, 92], "meta": {"id": 1, "tags": ["dev", "lead"]}}'
    parsed = parse_json(sample)
    print("Parsed successfully!")
    print(f"  Name: {parsed['name']}")
    print(f"  Age: {parsed['age']}")
    print(f"  Scores: {parsed['scores']}")
    print(f"  Tags: {parsed['meta']['tags']}")
    print(f"  Is active: {parsed['active'] is True}")
