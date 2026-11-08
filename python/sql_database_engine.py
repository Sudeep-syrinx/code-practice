"""
A custom SQL Database Engine implementation.
Includes a Lexer, Parser, B-Tree Indexing, and a Query Executor.
"""

import re
import bisect

class SQLError(Exception):
    pass

class Tokenizer:
    def __init__(self, sql):
        self.sql = sql
        self.tokens = []
        self.pos = 0
        self.token_regex = re.compile(r"\s*(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|AND|OR|\(|\)|=|<|>|,|;|\d+|'[^']*'|[a-zA-Z_][a-zA-Z0-9_]*)")

    def tokenize(self):
        pos = 0
        while pos < len(self.sql):
            match = self.token_regex.match(self.sql, pos)
            if not match:
                if self.sql[pos:].strip() == "":
                    break
                raise SQLError(f"Unexpected character at position {pos}: {self.sql[pos]}")
            val = match.group(1)
            self.tokens.append(val)
            pos = match.end()
        return self.tokens

class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def consume(self, expected=None):
        token = self.peek()
        if expected and token != expected:
            raise SQLError(f"Expected {expected}, got {token}")
        self.pos += 1
        return token

    def parse(self):
        stmt = self.peek()
        if stmt == "SELECT":
            return self.parse_select()
        elif stmt == "INSERT":
            return self.parse_insert()
        elif stmt == "CREATE":
            return self.parse_create()
        raise SQLError("Unknown SQL statement")

    def parse_create(self):
        self.consume("CREATE")
        self.consume("TABLE")
        table_name = self.consume()
        self.consume("(")
        columns = []
        while True:
            col_name = self.consume()
            columns.append(col_name)
            if self.peek() == ",":
                self.consume(",")
            else:
                break
        self.consume(")")
        return {"type": "create", "table": table_name, "columns": columns}

    def parse_insert(self):
        self.consume("INSERT")
        self.consume("INTO")
        table_name = self.consume()
        self.consume("VALUES")
        self.consume("(")
        values = []
        while True:
            val = self.consume()
            values.append(val.strip("'"))
            if self.peek() == ",":
                self.consume(",")
            else:
                break
        self.consume(")")
        return {"type": "insert", "table": table_name, "values": values}

    def parse_select(self):
        self.consume("SELECT")
        columns = []
        while True:
            columns.append(self.consume())
            if self.peek() == ",":
                self.consume(",")
            else:
                break
        self.consume("FROM")
        table_name = self.consume()
        condition = None
        if self.peek() == "WHERE":
            self.consume("WHERE")
            col = self.consume()
            op = self.consume()
            val = self.consume().strip("'")
            condition = (col, op, val)
        return {"type": "select", "table": table_name, "columns": columns, "condition": condition}

class BTreeIndex:
    def __init__(self, name):
        self.name = name
        self.keys = []
        self.values = []

    def insert(self, key, row_id):
        idx = bisect.bisect_left(self.keys, key)
        self.keys.insert(idx, key)
        self.values.insert(idx, row_id)

    def search(self, key):
        idx = bisect.bisect_left(self.keys, key)
        if idx < len(self.keys) and self.keys[idx] == key:
            return self.values[idx]
        return None

class Table:
    def __init__(self, name, columns):
        self.name = name
        self.columns = columns
        self.rows = []
        self.indices = {}

    def create_index(self, column_name):
        if column_name not in self.columns:
            raise SQLError("Column does not exist")
        self.indices[column_name] = BTreeIndex(column_name)
        for i, row in enumerate(self.rows):
            self.indices[column_name].insert(row[column_name], i)

    def insert(self, values):
        if len(values) != len(self.columns):
            raise SQLError("Column count mismatch")
        row = {self.columns[i]: values[i] for i in range(len(self.columns))}
        row_id = len(self.rows)
        self.rows.append(row)
        for col, idx in self.indices.items():
            idx.insert(row[col], row_id)

    def select(self, columns, condition=None):
        results = []
        for row in self.rows:
            if condition:
                col, op, val = condition
                row_val = row[col]
                if op == "=" and str(row_val) != val:
                    continue
                elif op == ">" and not (float(row_val) > float(val)):
                    continue
                elif op == "<" and not (float(row_val) < float(val)):
                    continue
            results.append({c: row[c] for c in columns if c in row})
        return results

class Database:
    def __init__(self):
        self.tables = {}

    def execute(self, sql):
        tok = Tokenizer(sql)
        tokens = tok.tokenize()
        parser = Parser(tokens)
        ast = parser.parse()

        if ast["type"] == "create":
            self.tables[ast["table"]] = Table(ast["table"], ast["columns"])
            return f"Table {ast['table']} created."
        elif ast["type"] == "insert":
            if ast["table"] not in self.tables:
                raise SQLError("Table does not exist")
            self.tables[ast["table"]].insert(ast["values"])
            return f"1 row inserted into {ast['table']}."
        elif ast["type"] == "select":
            if ast["table"] not in self.tables:
                raise SQLError("Table does not exist")
            return self.tables[ast["table"]].select(ast["columns"], ast["condition"])

if __name__ == "__main__":
    db = Database()
    print("Executing SQL Queries...")
    print(db.execute("CREATE TABLE users (id, name, age);"))
    print(db.execute("INSERT INTO users VALUES (1, 'Alice', 30);"))
    print(db.execute("INSERT INTO users VALUES (2, 'Bob', 25);"))
    print(db.execute("INSERT INTO users VALUES (3, 'Charlie', 35);"))
    
    print("Selecting all names:")
    print(db.execute("SELECT name FROM users;"))
    
    print("Selecting users with age > 28:")
    print(db.execute("SELECT name FROM users WHERE age > 28;"))
