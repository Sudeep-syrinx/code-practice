"""
A complete implementation of a Lexer, Parser, AST, Bytecode Compiler,
and a Stack-based Virtual Machine for a custom programming language.
"""

import math

class TokenType:
    INT = "INT"
    FLOAT = "FLOAT"
    PLUS = "PLUS"
    MINUS = "MINUS"
    MUL = "MUL"
    DIV = "DIV"
    LPAREN = "LPAREN"
    RPAREN = "RPAREN"
    ASSIGN = "ASSIGN"
    IDENTIFIER = "IDENTIFIER"
    PRINT = "PRINT"
    EOF = "EOF"

class Token:
    def __init__(self, type_, value):
        self.type = type_
        self.value = value

    def __repr__(self):
        return f"Token({self.type}, {self.value})"

class Lexer:
    def __init__(self, text):
        self.text = text
        self.pos = 0
        self.current_char = self.text[self.pos] if self.text else None

    def advance(self):
        self.pos += 1
        if self.pos < len(self.text):
            self.current_char = self.text[self.pos]
        else:
            self.current_char = None

    def skip_whitespace(self):
        while self.current_char is not None and self.current_char.isspace():
            self.advance()

    def read_number(self):
        result = ""
        while self.current_char is not None and (self.current_char.isdigit() or self.current_char == "."):
            result += self.current_char
            self.advance()
        if "." in result:
            return Token(TokenType.FLOAT, float(result))
        return Token(TokenType.INT, int(result))

    def read_identifier(self):
        result = ""
        while self.current_char is not None and (self.current_char.isalnum() or self.current_char == "_"):
            result += self.current_char
            self.advance()
        if result == "print":
            return Token(TokenType.PRINT, result)
        return Token(TokenType.IDENTIFIER, result)

    def get_next_token(self):
        while self.current_char is not None:
            if self.current_char.isspace():
                self.skip_whitespace()
                continue
            if self.current_char.isdigit():
                return self.read_number()
            if self.current_char.isalpha():
                return self.read_identifier()
            if self.current_char == "+":
                self.advance()
                return Token(TokenType.PLUS, "+")
            if self.current_char == "-":
                self.advance()
                return Token(TokenType.MINUS, "-")
            if self.current_char == "*":
                self.advance()
                return Token(TokenType.MUL, "*")
            if self.current_char == "/":
                self.advance()
                return Token(TokenType.DIV, "/")
            if self.current_char == "(":
                self.advance()
                return Token(TokenType.LPAREN, "(")
            if self.current_char == ")":
                self.advance()
                return Token(TokenType.RPAREN, ")")
            if self.current_char == "=":
                self.advance()
                return Token(TokenType.ASSIGN, "=")
            raise Exception(f"Invalid character: {self.current_char}")
        return Token(TokenType.EOF, None)

class ASTNode:
    pass

class BinOp(ASTNode):
    def __init__(self, left, op, right):
        self.left = left
        self.op = op
        self.right = right

class Num(ASTNode):
    def __init__(self, value):
        self.value = value

class UnaryOp(ASTNode):
    def __init__(self, op, expr):
        self.op = op
        self.expr = expr

class Assign(ASTNode):
    def __init__(self, name, value):
        self.name = name
        self.value = value

class Var(ASTNode):
    def __init__(self, name):
        self.name = name

class Print(ASTNode):
    def __init__(self, expr):
        self.expr = expr

class Parser:
    def __init__(self, lexer):
        self.lexer = lexer
        self.current_token = self.lexer.get_next_token()

    def eat(self, token_type):
        if self.current_token.type == token_type:
            self.current_token = self.lexer.get_next_token()
        else:
            raise Exception(f"Expected {token_type}, got {self.current_token.type}")

    def factor(self):
        token = self.current_token
        if token.type == TokenType.INT or token.type == TokenType.FLOAT:
            self.eat(token.type)
            return Num(token.value)
        elif token.type == TokenType.LPAREN:
            self.eat(TokenType.LPAREN)
            node = self.expr()
            self.eat(TokenType.RPAREN)
            return node
        elif token.type == TokenType.MINUS:
            self.eat(TokenType.MINUS)
            return UnaryOp("-", self.factor())
        elif token.type == TokenType.IDENTIFIER:
            self.eat(TokenType.IDENTIFIER)
            return Var(token.value)
        raise Exception("Invalid factor syntax")

    def term(self):
        node = self.factor()
        while self.current_token.type in (TokenType.MUL, TokenType.DIV):
            op = self.current_token
            self.eat(op.type)
            node = BinOp(node, op.value, self.factor())
        return node

    def expr(self):
        node = self.term()
        while self.current_token.type in (TokenType.PLUS, TokenType.MINUS):
            op = self.current_token
            self.eat(op.type)
            node = BinOp(node, op.value, self.term())
        return node

    def statement(self):
        if self.current_token.type == TokenType.IDENTIFIER:
            name = self.current_token.value
            self.eat(TokenType.IDENTIFIER)
            self.eat(TokenType.ASSIGN)
            return Assign(name, self.expr())
        elif self.current_token.type == TokenType.PRINT:
            self.eat(TokenType.PRINT)
            return Print(self.expr())
        return self.expr()

    def parse(self):
        statements = []
        while self.current_token.type != TokenType.EOF:
            statements.append(self.statement())
        return statements

class OpCode:
    PUSH = "PUSH"
    POP = "POP"
    ADD = "ADD"
    SUB = "SUB"
    MUL = "MUL"
    DIV = "DIV"
    STORE = "STORE"
    LOAD = "LOAD"
    PRINT = "PRINT"
    HALT = "HALT"

class Compiler:
    def __init__(self):
        self.instructions = []

    def compile(self, node):
        if isinstance(node, Num):
            self.instructions.append((OpCode.PUSH, node.value))
        elif isinstance(node, UnaryOp):
            self.compile(node.expr)
            if node.op == "-":
                self.instructions.append((OpCode.PUSH, -1))
                self.instructions.append((OpCode.MUL,))
        elif isinstance(node, BinOp):
            self.compile(node.left)
            self.compile(node.right)
            if node.op == "+":
                self.instructions.append((OpCode.ADD,))
            elif node.op == "-":
                self.instructions.append((OpCode.SUB,))
            elif node.op == "*":
                self.instructions.append((OpCode.MUL,))
            elif node.op == "/":
                self.instructions.append((OpCode.DIV,))
        elif isinstance(node, Assign):
            self.compile(node.value)
            self.instructions.append((OpCode.STORE, node.name))
        elif isinstance(node, Var):
            self.instructions.append((OpCode.LOAD, node.name))
        elif isinstance(node, Print):
            self.compile(node.expr)
            self.instructions.append((OpCode.PRINT,))
        elif isinstance(node, list):
            for stmt in node:
                self.compile(stmt)

class VirtualMachine:
    def __init__(self):
        self.stack = []
        self.environment = {}
        self.halted = False

    def run(self, instructions):
        ip = 0
        while ip < len(instructions):
            op = instructions[ip]
            if op[0] == OpCode.PUSH:
                self.stack.append(op[1])
            elif op[0] == OpCode.POP:
                self.stack.pop()
            elif op[0] == OpCode.ADD:
                b, a = self.stack.pop(), self.stack.pop()
                self.stack.append(a + b)
            elif op[0] == OpCode.SUB:
                b, a = self.stack.pop(), self.stack.pop()
                self.stack.append(a - b)
            elif op[0] == OpCode.MUL:
                b, a = self.stack.pop(), self.stack.pop()
                self.stack.append(a * b)
            elif op[0] == OpCode.DIV:
                b, a = self.stack.pop(), self.stack.pop()
                self.stack.append(a / b)
            elif op[0] == OpCode.STORE:
                self.environment[op[1]] = self.stack.pop()
            elif op[0] == OpCode.LOAD:
                self.stack.append(self.environment[op[1]])
            elif op[0] == OpCode.PRINT:
                print(self.stack.pop())
            ip += 1

if __name__ == "__main__":
    code = """
    x = 10 + 5 * 2
    y = x - 8
    print y
    print x * y
    """
    print("Running Lexer...")
    lexer = Lexer(code)
    print("Running Parser...")
    parser = Parser(lexer)
    ast = parser.parse()
    print("Running Compiler...")
    compiler = Compiler()
    compiler.compile(ast)
    print("Running VM...")
    vm = VirtualMachine()
    vm.run(compiler.instructions)
