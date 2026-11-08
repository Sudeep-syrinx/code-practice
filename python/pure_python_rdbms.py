import re
import math
import operator
from collections import defaultdict
from typing import List, Dict, Any, Optional

# --- 1. LEXER ---
class TokenType:
    KEYWORD, IDENTIFIER, STRING, NUMBER, OPERATOR, PUNCTUATION, EOF = range(7)

KEYWORDS = {"SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "CREATE", "TABLE", 
            "UPDATE", "SET", "DELETE", "AND", "OR", "INT", "VARCHAR", "FLOAT", "PRIMARY", "KEY"}

class Token:
    def __init__(self, type_: int, value: str):
        self.type = type_
        self.value = value
    def __repr__(self):
        return f"Token({self.type}, {self.value})"

class Lexer:
    def __init__(self, text: str):
        self.text = text
        self.pos = 0
        self.current_char = self.text[0] if self.text else None

    def advance(self):
        self.pos += 1
        self.current_char = self.text[self.pos] if self.pos < len(self.text) else None

    def skip_whitespace(self):
        while self.current_char is not None and self.current_char.isspace():
            self.advance()

    def get_next_token(self) -> Token:
        while self.current_char is not None:
            if self.current_char.isspace():
                self.skip_whitespace()
                continue
            if self.current_char.isalpha():
                return self._id_or_keyword()
            if self.current_char.isdigit():
                return self._number()
            if self.current_char == "'":
                return self._string()
            if self.current_char in "=<>!+-*/":
                return self._operator()
            if self.current_char in "(),;*":
                char = self.current_char
                self.advance()
                return Token(TokenType.PUNCTUATION, char)
            raise ValueError(f"Unknown character: {self.current_char}")
        return Token(TokenType.EOF, "")

    def _id_or_keyword(self) -> Token:
        result = ""
        while self.current_char is not None and (self.current_char.isalnum() or self.current_char == "_"):
            result += self.current_char
            self.advance()
        if result.upper() in KEYWORDS:
            return Token(TokenType.KEYWORD, result.upper())
        return Token(TokenType.IDENTIFIER, result)

    def _number(self) -> Token:
        result = ""
        while self.current_char is not None and (self.current_char.isdigit() or self.current_char == "."):
            result += self.current_char
            self.advance()
        return Token(TokenType.NUMBER, result)

    def _string(self) -> Token:
        result = ""
        self.advance() # skip quote
        while self.current_char is not None and self.current_char != "'":
            result += self.current_char
            self.advance()
        self.advance() # skip closing quote
        return Token(TokenType.STRING, result)

    def _operator(self) -> Token:
        result = self.current_char
        self.advance()
        if self.current_char in "=>":
            result += self.current_char
            self.advance()
        return Token(TokenType.OPERATOR, result)

# --- 2. PARSER ---
class Parser:
    def __init__(self, lexer: Lexer):
        self.lexer = lexer
        self.current_token = self.lexer.get_next_token()

    def eat(self, type_: int, val: str = None):
        if self.current_token.type == type_ and (val is None or self.current_token.value.upper() == val):
            self.current_token = self.lexer.get_next_token()
        else:
            raise SyntaxError(f"Expected {val or type_}, got {self.current_token.value}")

    def parse(self):
        token = self.current_token
        if token.type == TokenType.KEYWORD:
            if token.value == "CREATE": return self.parse_create()
            if token.value == "INSERT": return self.parse_insert()
            if token.value == "SELECT": return self.parse_select()
        raise SyntaxError(f"Unsupported statement: {token.value}")

    def parse_create(self):
        self.eat(TokenType.KEYWORD, "CREATE")
        self.eat(TokenType.KEYWORD, "TABLE")
        table_name = self.current_token.value
        self.eat(TokenType.IDENTIFIER)
        self.eat(TokenType.PUNCTUATION, "(")
        columns = []
        while self.current_token.value != ")":
            col_name = self.current_token.value
            self.eat(TokenType.IDENTIFIER)
            col_type = self.current_token.value
            self.eat(TokenType.KEYWORD)
            is_pk = False
            if self.current_token.value == "PRIMARY":
                self.eat(TokenType.KEYWORD, "PRIMARY")
                self.eat(TokenType.KEYWORD, "KEY")
                is_pk = True
            columns.append({"name": col_name, "type": col_type, "pk": is_pk})
            if self.current_token.value == ",":
                self.eat(TokenType.PUNCTUATION, ",")
        self.eat(TokenType.PUNCTUATION, ")")
        return {"stmt": "CREATE", "table": table_name, "columns": columns}

    def parse_insert(self):
        self.eat(TokenType.KEYWORD, "INSERT")
        self.eat(TokenType.KEYWORD, "INTO")
        table_name = self.current_token.value
        self.eat(TokenType.IDENTIFIER)
        self.eat(TokenType.KEYWORD, "VALUES")
        self.eat(TokenType.PUNCTUATION, "(")
        values = []
        while self.current_token.value != ")":
            val = self.current_token.value
            if self.current_token.type == TokenType.NUMBER:
                values.append(float(val) if "." in val else int(val))
            else:
                values.append(val)
            self.eat(self.current_token.type)
            if self.current_token.value == ",":
                self.eat(TokenType.PUNCTUATION, ",")
        self.eat(TokenType.PUNCTUATION, ")")
        return {"stmt": "INSERT", "table": table_name, "values": values}

    def parse_select(self):
        self.eat(TokenType.KEYWORD, "SELECT")
        columns = []
        if self.current_token.value == "*":
            columns.append("*")
            self.eat(TokenType.PUNCTUATION, "*")
        else:
            while self.current_token.type == TokenType.IDENTIFIER:
                columns.append(self.current_token.value)
                self.eat(TokenType.IDENTIFIER)
                if self.current_token.value == ",":
                    self.eat(TokenType.PUNCTUATION, ",")
                else:
                    break
        self.eat(TokenType.KEYWORD, "FROM")
        table_name = self.current_token.value
        self.eat(TokenType.IDENTIFIER)
        where_clause = None
        if self.current_token.value == "WHERE":
            self.eat(TokenType.KEYWORD, "WHERE")
            left = self.current_token.value
            self.eat(TokenType.IDENTIFIER)
            op = self.current_token.value
            self.eat(TokenType.OPERATOR)
            right_tok = self.current_token
            right = right_tok.value
            if right_tok.type == TokenType.NUMBER:
                right = float(right) if "." in right else int(right)
            self.eat(right_tok.type)
            where_clause = (left, op, right)
        return {"stmt": "SELECT", "table": table_name, "columns": columns, "where": where_clause}

# --- 3. STORAGE & B-TREE ---
class BTreeNode:
    def __init__(self, leaf=False):
        self.leaf = leaf
        self.keys = []
        self.child = []

class BTree:
    def __init__(self, t):
        self.root = BTreeNode(True)
        self.t = t

    def search(self, k, x=None):
        if x is not None:
            i = 0
            while i < len(x.keys) and k > x.keys[i][0]:
                i += 1
            if i < len(x.keys) and k == x.keys[i][0]:
                return x.keys[i]
            elif x.leaf:
                return None
            else:
                return self.search(k, x.child[i])
        else:
            return self.search(k, self.root)

    def insert(self, k):
        root = self.root
        if len(root.keys) == (2 * self.t) - 1:
            temp = BTreeNode()
            self.root = temp
            temp.child.insert(0, root)
            self.split_child(temp, 0)
            self.insert_non_full(temp, k)
        else:
            self.insert_non_full(root, k)

    def insert_non_full(self, x, k):
        i = len(x.keys) - 1
        if x.leaf:
            x.keys.append((None, None))
            while i >= 0 and k[0] < x.keys[i][0]:
                x.keys[i + 1] = x.keys[i]
                i -= 1
            x.keys[i + 1] = k
        else:
            while i >= 0 and k[0] < x.keys[i][0]:
                i -= 1
            i += 1
            if len(x.child[i].keys) == (2 * self.t) - 1:
                self.split_child(x, i)
                if k[0] > x.keys[i][0]:
                    i += 1
            self.insert_non_full(x.child[i], k)

    def split_child(self, x, i):
        t = self.t
        y = x.child[i]
        z = BTreeNode(y.leaf)
        x.child.insert(i + 1, z)
        x.keys.insert(i, y.keys[t - 1])
        z.keys = y.keys[t: (2 * t) - 1]
        y.keys = y.keys[0: t - 1]
        if not y.leaf:
            z.child = y.child[t: 2 * t]
            y.child = y.child[0: t - 1]

# --- 4. ENGINE ---
class Table:
    def __init__(self, name: str, columns: List[Dict]):
        self.name = name
        self.columns = columns
        self.rows = []
        self.pk_idx = next((i for i, c in enumerate(columns) if c.get("pk")), -1)
        self.index = BTree(t=3) if self.pk_idx != -1 else None

    def insert(self, values: List[Any]):
        if len(values) != len(self.columns):
            raise ValueError("Column count mismatch")
        row_id = len(self.rows)
        self.rows.append(values)
        if self.index:
            self.index.insert((values[self.pk_idx], row_id))

class Database:
    def __init__(self):
        self.tables = {}

    def execute(self, query: str):
        lexer = Lexer(query)
        parser = Parser(lexer)
        ast = parser.parse()
        
        if ast["stmt"] == "CREATE":
            self.tables[ast["table"]] = Table(ast["table"], ast["columns"])
            return f"Table {ast['table']} created."
        
        elif ast["stmt"] == "INSERT":
            table = self.tables.get(ast["table"])
            if not table: raise ValueError("Table not found")
            table.insert(ast["values"])
            return "1 row inserted."
            
        elif ast["stmt"] == "SELECT":
            table = self.tables.get(ast["table"])
            if not table: raise ValueError("Table not found")
            results = []
            col_names = [c["name"] for c in table.columns]
            
            # Using index if available and querying PK
            where = ast["where"]
            if where and table.index and where[0] == table.columns[table.pk_idx]["name"] and where[1] == "=":
                idx_res = table.index.search(where[2])
                if idx_res:
                    results.append(table.rows[idx_res[1]])
            else:
                for row in table.rows:
                    if where:
                        l_idx = col_names.index(where[0])
                        val = row[l_idx]
                        op = where[1]
                        target = where[2]
                        if op == "=" and val != target: continue
                        if op == ">" and val <= target: continue
                        if op == "<" and val >= target: continue
                    results.append(row)
                    
            if ast["columns"] != ["*"]:
                idxs = [col_names.index(c) for c in ast["columns"]]
                results = [[r[i] for i in idxs] for r in results]
                
            return results

if __name__ == "__main__":
    db = Database()
    print("--- PURE PYTHON RDBMS ---")
    print(db.execute("CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR, age INT)"))
    print(db.execute("INSERT INTO users VALUES (1, 'Alice', 30)"))
    print(db.execute("INSERT INTO users VALUES (2, 'Bob', 25)"))
    print(db.execute("INSERT INTO users VALUES (3, 'Charlie', 35)"))
    print("SELECT * FROM users:")
    for row in db.execute("SELECT * FROM users"): print(row)
    print("SELECT name FROM users WHERE age > 26:")
    for row in db.execute("SELECT name FROM users WHERE age > 26"): print(row)
    print("SELECT * FROM users WHERE id = 2 (Using B-Tree):")
    for row in db.execute("SELECT * FROM users WHERE id = 2"): print(row)

# ==============================================================================
# MASSIVE EXPANSION: PURE PYTHON RDBMS (PART 2)
# ==============================================================================

class DatabaseError(Exception):
    pass

class Table:
    def __init__(self, name, columns):
        self.name = name
        self.columns = columns
        self.rows = []
        self.indices = {col: {} for col in columns}

    def insert(self, row):
        if len(row) != len(self.columns):
            raise DatabaseError("Column count mismatch")
        record = dict(zip(self.columns, row))
        row_id = len(self.rows)
        self.rows.append(record)
        for col, val in record.items():
            if val not in self.indices[col]:
                self.indices[col][val] = []
            self.indices[col][val].append(row_id)
        return row_id

    def select(self, condition=None):
        if condition is None:
            return self.rows
        return [row for row in self.rows if condition(row)]

    def update(self, condition, updates):
        updated = 0
        for i, row in enumerate(self.rows):
            if condition(row):
                for k, v in updates.items():
                    if k not in self.columns:
                        raise DatabaseError(f"Unknown column: {k}")
                    self.rows[i][k] = v
                updated += 1
        return updated

    def delete(self, condition):
        original_len = len(self.rows)
        self.rows = [row for row in self.rows if not condition(row)]
        return original_len - len(self.rows)

class SimpleRDBMS:
    def __init__(self):
        self.tables = {}
        self.transaction_log = []
        self.in_transaction = False

    def create_table(self, name, columns):
        if name in self.tables:
            raise DatabaseError(f"Table {name} already exists")
        self.tables[name] = Table(name, columns)

    def drop_table(self, name):
        if name not in self.tables:
            raise DatabaseError(f"Table {name} does not exist")
        del self.tables[name]

    def insert(self, table_name, row):
        if table_name not in self.tables:
            raise DatabaseError(f"Table {table_name} does not exist")
        row_id = self.tables[table_name].insert(row)
        if self.in_transaction:
            self.transaction_log.append(("insert", table_name, row_id, row))
        return row_id

    def select(self, table_name, condition=None):
        if table_name not in self.tables:
            raise DatabaseError(f"Table {table_name} does not exist")
        return self.tables[table_name].select(condition)

    def begin(self):
        if self.in_transaction:
            raise DatabaseError("Transaction already active")
        self.in_transaction = True
        self.transaction_log = []

    def commit(self):
        if not self.in_transaction:
            raise DatabaseError("No active transaction")
        self.in_transaction = False
        self.transaction_log = []

    def rollback(self):
        if not self.in_transaction:
            raise DatabaseError("No active transaction")
        for action in reversed(self.transaction_log):
            if action[0] == "insert":
                table_name, row_id, row = action[1], action[2], action[3]
                self.tables[table_name].rows.pop(row_id)
        self.in_transaction = False
        self.transaction_log = []

def test_rdbms():
    db = SimpleRDBMS()
    db.create_table("users", ["id", "name", "age"])
    db.insert("users", [1, "Alice", 30])
    db.insert("users", [2, "Bob", 25])
    db.insert("users", [3, "Charlie", 35])
    
    print("All users:", db.select("users"))
    print("Users over 28:", db.select("users", lambda r: r["age"] > 28))
    
    db.begin()
    db.insert("users", [4, "Dave", 40])
    print("Inside transaction:", len(db.select("users")))
    db.rollback()
    print("After rollback:", len(db.select("users")))

if __name__ == "__main__":
    test_rdbms()
