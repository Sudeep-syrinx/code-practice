import re
from typing import List, Dict, Any, Union

# --- 1. LEXER ---
class TokenType:
    INT, FLOAT, ID, PLUS, MINUS, MUL, DIV, ASSIGN, EQ, NEQ, LT, GT, LPAREN, RPAREN, LBRACE, RBRACE, SEMI, COMMA, IF, ELSE, WHILE, FUNC, RETURN, EOF = range(24)

class Token:
    def __init__(self, type_: int, value: str, line: int):
        self.type = type_
        self.value = value
        self.line = line
    def __repr__(self): return f"Token({self.type}, '{self.value}')"

class Lexer:
    rules = [
        (TokenType.FLOAT, r'\d+\.\d+'),
        (TokenType.INT, r'\d+'),
        (TokenType.IF, r'\bif\b'),
        (TokenType.ELSE, r'\belse\b'),
        (TokenType.WHILE, r'\bwhile\b'),
        (TokenType.FUNC, r'\bfunc\b'),
        (TokenType.RETURN, r'\breturn\b'),
        (TokenType.ID, r'[a-zA-Z_]\w*'),
        (TokenType.EQ, r'=='),
        (TokenType.NEQ, r'!='),
        (TokenType.ASSIGN, r'='),
        (TokenType.PLUS, r'\+'),
        (TokenType.MINUS, r'-'),
        (TokenType.MUL, r'\*'),
        (TokenType.DIV, r'/'),
        (TokenType.LT, r'<'),
        (TokenType.GT, r'>'),
        (TokenType.LPAREN, r'\('),
        (TokenType.RPAREN, r'\)'),
        (TokenType.LBRACE, r'\{'),
        (TokenType.RBRACE, r'\}'),
        (TokenType.SEMI, r';'),
        (TokenType.COMMA, r','),
    ]
    def __init__(self, text: str):
        self.text = text
        self.pos = 0
        self.line = 1

    def tokenize(self) -> List[Token]:
        tokens = []
        while self.pos < len(self.text):
            if self.text[self.pos] in ' \t\r':
                self.pos += 1
                continue
            if self.text[self.pos] == '\n':
                self.line += 1
                self.pos += 1
                continue
            match = None
            for token_type, regex in self.rules:
                regex_match = re.match(regex, self.text[self.pos:])
                if regex_match:
                    match = regex_match.group(0)
                    tokens.append(Token(token_type, match, self.line))
                    self.pos += len(match)
                    break
            if not match:
                raise SyntaxError(f"Illegal character at line {self.line}: {self.text[self.pos]}")
        tokens.append(Token(TokenType.EOF, "", self.line))
        return tokens

# --- 2. PARSER (AST Nodes) ---
class AST: pass
class BinOp(AST):
    def __init__(self, left, op, right): self.left, self.op, self.right = left, op, right
class Num(AST):
    def __init__(self, token): self.value = float(token.value) if token.type == TokenType.FLOAT else int(token.value)
class VarDecl(AST):
    def __init__(self, name, expr): self.name, self.expr = name, expr
class Var(AST):
    def __init__(self, token): self.name = token.value
class Block(AST):
    def __init__(self, statements): self.statements = statements
class IfStmt(AST):
    def __init__(self, condition, true_branch, false_branch):
        self.condition, self.true_branch, self.false_branch = condition, true_branch, false_branch
class WhileStmt(AST):
    def __init__(self, condition, body): self.condition, self.body = condition, body
class FuncDecl(AST):
    def __init__(self, name, params, body): self.name, self.params, self.body = name, params, body
class FuncCall(AST):
    def __init__(self, name, args): self.name, self.args = name, args
class ReturnStmt(AST):
    def __init__(self, expr): self.expr = expr

class Parser:
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0

    def current(self) -> Token: return self.tokens[self.pos]
    def consume(self, type_: int):
        if self.current().type == type_:
            self.pos += 1
        else:
            raise SyntaxError(f"Expected {type_}, got {self.current().type} at line {self.current().line}")

    def parse(self):
        statements = []
        while self.current().type != TokenType.EOF:
            statements.append(self.statement())
        return Block(statements)

    def statement(self):
        if self.current().type == TokenType.FUNC: return self.func_decl()
        if self.current().type == TokenType.IF: return self.if_stmt()
        if self.current().type == TokenType.WHILE: return self.while_stmt()
        if self.current().type == TokenType.RETURN: return self.return_stmt()
        if self.current().type == TokenType.ID and self.tokens[self.pos+1].type == TokenType.ASSIGN:
            return self.var_decl()
        expr = self.expr()
        self.consume(TokenType.SEMI)
        return expr

    def func_decl(self):
        self.consume(TokenType.FUNC)
        name = self.current().value
        self.consume(TokenType.ID)
        self.consume(TokenType.LPAREN)
        params = []
        if self.current().type != TokenType.RPAREN:
            params.append(self.current().value)
            self.consume(TokenType.ID)
            while self.current().type == TokenType.COMMA:
                self.consume(TokenType.COMMA)
                params.append(self.current().value)
                self.consume(TokenType.ID)
        self.consume(TokenType.RPAREN)
        body = self.block()
        return FuncDecl(name, params, body)

    def if_stmt(self):
        self.consume(TokenType.IF)
        self.consume(TokenType.LPAREN)
        cond = self.expr()
        self.consume(TokenType.RPAREN)
        true_branch = self.block()
        false_branch = None
        if self.current().type == TokenType.ELSE:
            self.consume(TokenType.ELSE)
            false_branch = self.block()
        return IfStmt(cond, true_branch, false_branch)

    def while_stmt(self):
        self.consume(TokenType.WHILE)
        self.consume(TokenType.LPAREN)
        cond = self.expr()
        self.consume(TokenType.RPAREN)
        body = self.block()
        return WhileStmt(cond, body)

    def return_stmt(self):
        self.consume(TokenType.RETURN)
        expr = self.expr()
        self.consume(TokenType.SEMI)
        return ReturnStmt(expr)

    def var_decl(self):
        name = self.current().value
        self.consume(TokenType.ID)
        self.consume(TokenType.ASSIGN)
        expr = self.expr()
        self.consume(TokenType.SEMI)
        return VarDecl(name, expr)

    def block(self):
        self.consume(TokenType.LBRACE)
        stmts = []
        while self.current().type != TokenType.RBRACE:
            stmts.append(self.statement())
        self.consume(TokenType.RBRACE)
        return Block(stmts)

    def expr(self): return self.equality()

    def equality(self):
        node = self.relational()
        while self.current().type in (TokenType.EQ, TokenType.NEQ):
            op = self.current()
            self.consume(op.type)
            node = BinOp(node, op, self.relational())
        return node

    def relational(self):
        node = self.add_sub()
        while self.current().type in (TokenType.LT, TokenType.GT):
            op = self.current()
            self.consume(op.type)
            node = BinOp(node, op, self.add_sub())
        return node

    def add_sub(self):
        node = self.mul_div()
        while self.current().type in (TokenType.PLUS, TokenType.MINUS):
            op = self.current()
            self.consume(op.type)
            node = BinOp(node, op, self.mul_div())
        return node

    def mul_div(self):
        node = self.factor()
        while self.current().type in (TokenType.MUL, TokenType.DIV):
            op = self.current()
            self.consume(op.type)
            node = BinOp(node, op, self.factor())
        return node

    def factor(self):
        tok = self.current()
        if tok.type in (TokenType.INT, TokenType.FLOAT):
            self.consume(tok.type)
            return Num(tok)
        if tok.type == TokenType.ID:
            if self.tokens[self.pos+1].type == TokenType.LPAREN:
                name = tok.value
                self.consume(TokenType.ID)
                self.consume(TokenType.LPAREN)
                args = []
                if self.current().type != TokenType.RPAREN:
                    args.append(self.expr())
                    while self.current().type == TokenType.COMMA:
                        self.consume(TokenType.COMMA)
                        args.append(self.expr())
                self.consume(TokenType.RPAREN)
                return FuncCall(name, args)
            else:
                self.consume(TokenType.ID)
                return Var(tok)
        if tok.type == TokenType.LPAREN:
            self.consume(TokenType.LPAREN)
            node = self.expr()
            self.consume(TokenType.RPAREN)
            return node
        raise SyntaxError(f"Unexpected factor: {tok.value}")

# --- 3. BYTECODE COMPILER ---
class Opcodes:
    LOAD_CONST, LOAD_VAR, STORE_VAR, ADD, SUB, MUL, DIV, EQ, NEQ, LT, GT, JMP, JMP_IF_FALSE, CALL, RETURN, HALT = range(16)

class Compiler:
    def __init__(self):
        self.code = []
        self.env = {}
        self.functions = {}

    def compile(self, node):
        if isinstance(node, Block):
            for stmt in node.statements: self.compile(stmt)
        elif isinstance(node, Num):
            self.emit(Opcodes.LOAD_CONST, node.value)
        elif isinstance(node, Var):
            self.emit(Opcodes.LOAD_VAR, node.name)
        elif isinstance(node, VarDecl):
            self.compile(node.expr)
            self.emit(Opcodes.STORE_VAR, node.name)
        elif isinstance(node, BinOp):
            self.compile(node.left)
            self.compile(node.right)
            ops = {TokenType.PLUS: Opcodes.ADD, TokenType.MINUS: Opcodes.SUB,
                   TokenType.MUL: Opcodes.MUL, TokenType.DIV: Opcodes.DIV,
                   TokenType.EQ: Opcodes.EQ, TokenType.NEQ: Opcodes.NEQ,
                   TokenType.LT: Opcodes.LT, TokenType.GT: Opcodes.GT}
            self.emit(ops[node.op.type])
        elif isinstance(node, IfStmt):
            self.compile(node.condition)
            jmp_if_false_idx = self.emit(Opcodes.JMP_IF_FALSE, 0)
            self.compile(node.true_branch)
            jmp_end_idx = self.emit(Opcodes.JMP, 0)
            self.patch(jmp_if_false_idx, len(self.code))
            if node.false_branch:
                self.compile(node.false_branch)
            self.patch(jmp_end_idx, len(self.code))
        elif isinstance(node, WhileStmt):
            start_idx = len(self.code)
            self.compile(node.condition)
            jmp_if_false_idx = self.emit(Opcodes.JMP_IF_FALSE, 0)
            self.compile(node.body)
            self.emit(Opcodes.JMP, start_idx)
            self.patch(jmp_if_false_idx, len(self.code))
        elif isinstance(node, FuncDecl):
            jmp_over = self.emit(Opcodes.JMP, 0)
            self.functions[node.name] = len(self.code)
            for param in reversed(node.params):
                self.emit(Opcodes.STORE_VAR, param)
            self.compile(node.body)
            self.emit(Opcodes.RETURN)
            self.patch(jmp_over, len(self.code))
        elif isinstance(node, FuncCall):
            for arg in node.args:
                self.compile(arg)
            self.emit(Opcodes.CALL, node.name)
        elif isinstance(node, ReturnStmt):
            self.compile(node.expr)
            self.emit(Opcodes.RETURN)

    def emit(self, opcode, arg=None):
        self.code.append((opcode, arg))
        return len(self.code) - 1

    def patch(self, idx, val):
        op, _ = self.code[idx]
        self.code[idx] = (op, val)

# --- 4. VIRTUAL MACHINE ---
class VM:
    def __init__(self, code, functions):
        self.code = code
        self.functions = functions
        self.pc = 0
        self.stack = []
        self.call_stack = []
        self.env = {}

    def run(self):
        while self.pc < len(self.code):
            op, arg = self.code[self.pc]
            self.pc += 1
            if op == Opcodes.LOAD_CONST: self.stack.append(arg)
            elif op == Opcodes.LOAD_VAR: self.stack.append(self.env[arg])
            elif op == Opcodes.STORE_VAR: self.env[arg] = self.stack.pop()
            elif op == Opcodes.ADD: self.stack.append(self.stack.pop(-2) + self.stack.pop())
            elif op == Opcodes.SUB: self.stack.append(self.stack.pop(-2) - self.stack.pop())
            elif op == Opcodes.MUL: self.stack.append(self.stack.pop(-2) * self.stack.pop())
            elif op == Opcodes.DIV: self.stack.append(self.stack.pop(-2) / self.stack.pop())
            elif op == Opcodes.EQ: self.stack.append(1 if self.stack.pop(-2) == self.stack.pop() else 0)
            elif op == Opcodes.NEQ: self.stack.append(1 if self.stack.pop(-2) != self.stack.pop() else 0)
            elif op == Opcodes.LT: self.stack.append(1 if self.stack.pop(-2) < self.stack.pop() else 0)
            elif op == Opcodes.GT: self.stack.append(1 if self.stack.pop(-2) > self.stack.pop() else 0)
            elif op == Opcodes.JMP: self.pc = arg
            elif op == Opcodes.JMP_IF_FALSE:
                if not self.stack.pop(): self.pc = arg
            elif op == Opcodes.CALL:
                self.call_stack.append((self.pc, self.env.copy()))
                self.pc = self.functions[arg]
            elif op == Opcodes.RETURN:
                if self.call_stack:
                    self.pc, self.env = self.call_stack.pop()
                else:
                    return self.stack.pop() if self.stack else None
            elif op == Opcodes.HALT: break
        return self.env

if __name__ == "__main__":
    source_code = """
    func fibonacci(n) {
        if (n < 2) {
            return n;
        }
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
    
    result = fibonacci(10);
    
    fact = 1;
    i = 1;
    while (i < 6) {
        fact = fact * i;
        i = i + 1;
    }
    """
    
    print("--- ADVANCED COMPILER TOOLCHAIN ---")
    lexer = Lexer(source_code)
    tokens = lexer.tokenize()
    parser = Parser(tokens)
    ast = parser.parse()
    
    compiler = Compiler()
    compiler.compile(ast)
    
    vm = VM(compiler.code, compiler.functions)
    env = vm.run()
    
    print(f"Execution complete.")
    print(f"Fibonacci(10) result: {env.get('result')}")
    print(f"Factorial(5) result: {env.get('fact')}")
