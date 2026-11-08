import re
from typing import List, Dict, Any, Tuple, Optional

# --- SQL LEXER ---
class SQLToken:
    def __init__(self, type_: str, value: str):
        self.type = type_
        self.value = value
    def __repr__(self): return f"<{self.type}:{self.value}>"

class SQLLexer:
    keywords = {'SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'AND', 'OR', 'GROUP', 'BY', 'AS', 'INNER', 'LEFT'}
    
    def __init__(self, query: str):
        self.query = query
        self.tokens = []
        self.tokenize()
        
    def tokenize(self):
        # A simple regex-based tokenizer for basic SQL
        token_specification = [
            ('NUMBER',   r'\d+(\.\d*)?'), 
            ('STRING',   r"'[^']*'"),     
            ('IDENT',    r'[A-Za-z_][A-Za-z0-9_\.]*'), 
            ('OP',       r'[=<>!]+'),     
            ('PUNCT',    r'[,\(\)\*]'),   
            ('SPACE',    r'[ \t\n]+'),    
        ]
        tok_regex = '|'.join('(?P<%s>%s)' % pair for pair in token_specification)
        for mo in re.finditer(tok_regex, self.query):
            kind = mo.lastgroup
            value = mo.group()
            if kind == 'SPACE': continue
            if kind == 'IDENT' and value.upper() in self.keywords:
                kind = 'KEYWORD'
                value = value.upper()
            if kind == 'STRING':
                value = value[1:-1] # Strip quotes
            self.tokens.append(SQLToken(kind, value))
        self.tokens.append(SQLToken('EOF', ''))

# --- SQL PARSER & AST ---
class ASTNode: pass
class SelectQuery(ASTNode):
    def __init__(self):
        self.columns = []
        self.tables = []
        self.joins = []
        self.where = None
        self.group_by = []

class SQLParser:
    def __init__(self, tokens: List[SQLToken]):
        self.tokens = tokens
        self.pos = 0

    def current(self) -> SQLToken: return self.tokens[self.pos]
    def advance(self): self.pos += 1
    def match(self, kind: str, value: str = None) -> bool:
        if self.current().type == kind and (value is None or self.current().value == value):
            self.advance()
            return True
        return False

    def expect(self, kind: str, value: str = None):
        if not self.match(kind, value):
            raise SyntaxError(f"Expected {kind}:{value}, got {self.current().type}:{self.current().value}")

    def parse(self) -> SelectQuery:
        query = SelectQuery()
        self.expect('KEYWORD', 'SELECT')
        
        # Parse Columns
        if self.match('PUNCT', '*'):
            query.columns.append('*')
        else:
            query.columns.append(self.current().value)
            self.expect('IDENT')
            while self.match('PUNCT', ','):
                query.columns.append(self.current().value)
                self.expect('IDENT')

        self.expect('KEYWORD', 'FROM')
        query.tables.append(self.current().value)
        self.expect('IDENT')

        # Parse Joins
        while self.match('KEYWORD', 'JOIN') or self.match('KEYWORD', 'INNER'):
            if self.current().value == 'JOIN': self.advance()
            target_table = self.current().value
            self.expect('IDENT')
            self.expect('KEYWORD', 'ON')
            left_col = self.current().value
            self.expect('IDENT')
            self.expect('OP', '=')
            right_col = self.current().value
            self.expect('IDENT')
            query.joins.append((target_table, left_col, right_col))

        # Parse Where
        if self.match('KEYWORD', 'WHERE'):
            left = self.current().value
            self.expect('IDENT')
            op = self.current().value
            self.expect('OP')
            right = self.current().value
            if self.current().type == 'STRING' or self.current().type == 'NUMBER':
                self.advance()
            else:
                self.expect('IDENT')
            query.where = (left, op, right)

        # Parse Group By
        if self.match('KEYWORD', 'GROUP'):
            self.expect('KEYWORD', 'BY')
            query.group_by.append(self.current().value)
            self.expect('IDENT')
            while self.match('PUNCT', ','):
                query.group_by.append(self.current().value)
                self.expect('IDENT')

        return query

# --- SQL EXECUTION ENGINE ---
class Database:
    def __init__(self):
        self.tables: Dict[str, List[Dict[str, Any]]] = {}

    def insert(self, table_name: str, rows: List[Dict[str, Any]]):
        if table_name not in self.tables:
            self.tables[table_name] = []
        self.tables[table_name].extend(rows)

    def execute(self, sql: str) -> List[Dict[str, Any]]:
        lexer = SQLLexer(sql)
        parser = SQLParser(lexer.tokens)
        ast = parser.parse()

        # 1. FROM clause
        main_table = ast.tables[0]
        result_set = [dict(row) for row in self.tables.get(main_table, [])]

        # 2. JOIN clause (Hash Join implementation)
        for join_table, left_col, right_col in ast.joins:
            right_rows = self.tables.get(join_table, [])
            
            # Build Hash Map for right table
            hash_map = {}
            right_col_name = right_col.split('.')[-1] if '.' in right_col else right_col
            for row in right_rows:
                key = str(row.get(right_col_name))
                if key not in hash_map: hash_map[key] = []
                hash_map[key].append(row)
                
            # Probe Phase
            joined_set = []
            left_col_name = left_col.split('.')[-1] if '.' in left_col else left_col
            for left_row in result_set:
                key = str(left_row.get(left_col_name))
                if key in hash_map:
                    for right_row in hash_map[key]:
                        # Merge rows, prefixing with table names if needed
                        new_row = {**left_row}
                        for k, v in right_row.items():
                            new_row[f"{join_table}.{k}"] = v
                        joined_set.append(new_row)
            result_set = joined_set

        # 3. WHERE clause
        if ast.where:
            left, op, right = ast.where
            left_col = left.split('.')[-1] if '.' in left else left
            filtered_set = []
            for row in result_set:
                val = row.get(left_col)
                # Type casting for comparison
                cmp_right = float(right) if right.replace('.','',1).isdigit() else right
                cmp_val = float(val) if isinstance(val, (int, float)) or (isinstance(val, str) and val.replace('.','',1).isdigit()) else str(val)
                
                if op == '=' and cmp_val == cmp_right: filtered_set.append(row)
                elif op == '!=' and cmp_val != cmp_right: filtered_set.append(row)
                elif op == '>' and cmp_val > cmp_right: filtered_set.append(row)
                elif op == '<' and cmp_val < cmp_right: filtered_set.append(row)
                elif op == '>=' and cmp_val >= cmp_right: filtered_set.append(row)
                elif op == '<=' and cmp_val <= cmp_right: filtered_set.append(row)
            result_set = filtered_set

        # 4. GROUP BY clause
        if ast.group_by:
            groups = {}
            for row in result_set:
                key = tuple(row.get(col.split('.')[-1] if '.' in col else col) for col in ast.group_by)
                if key not in groups: groups[key] = []
                groups[key].append(row)
            
            # Simple aggregation (Count) for grouped results
            grouped_set = []
            for key, rows in groups.items():
                agg_row = {col: key[i] for i, col in enumerate(ast.group_by)}
                agg_row['COUNT'] = len(rows)
                grouped_set.append(agg_row)
            result_set = grouped_set

        # 5. SELECT clause (Projection)
        if ast.columns != ['*'] and not ast.group_by:
            projected = []
            for row in result_set:
                proj_row = {}
                for col in ast.columns:
                    col_name = col.split('.')[-1] if '.' in col else col
                    # Try exact match first, then fallback to suffix match
                    if col in row: proj_row[col] = row[col]
                    elif col_name in row: proj_row[col_name] = row[col_name]
                    else:
                        for k, v in row.items():
                            if k.endswith(f".{col_name}"):
                                proj_row[col_name] = v
                                break
                projected.append(proj_row)
            result_set = projected

        return result_set

if __name__ == "__main__":
    print("--- PURE PYTHON SQL EXECUTION ENGINE ---")
    db = Database()
    
    db.insert('users', [
        {'id': 1, 'name': 'Alice', 'department_id': 10},
        {'id': 2, 'name': 'Bob', 'department_id': 20},
        {'id': 3, 'name': 'Charlie', 'department_id': 10},
        {'id': 4, 'name': 'David', 'department_id': 30},
    ])
    
    db.insert('departments', [
        {'id': 10, 'dname': 'Engineering'},
        {'id': 20, 'dname': 'Sales'},
        {'id': 30, 'dname': 'Marketing'},
    ])
    
    query1 = "SELECT name, dname FROM users JOIN departments ON users.department_id = departments.id WHERE department_id = 10"
    print(f"\nExecuting: {query1}")
    res1 = db.execute(query1)
    for r in res1: print(r)
    
    query2 = "SELECT department_id FROM users GROUP BY department_id"
    print(f"\nExecuting: {query2}")
    res2 = db.execute(query2)
    for r in res2: print(r)
