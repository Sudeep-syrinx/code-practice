const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class Tokenizer {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.col = 1;
  }
  peek() { return this.source[this.pos]; }
  advance() {
    const ch = this.source[this.pos++];
    if (ch === "\n") { this.line++; this.col = 1; } else { this.col++; }
    return ch;
  }
  skipWhitespace() { while (this.pos < this.source.length && /\s/.test(this.source[this.pos])) this.advance(); }
  readWhile(predicate) {
    let result = "";
    while (this.pos < this.source.length && predicate(this.source[this.pos])) result += this.advance();
    return result;
  }
  tokenize() {
    const tokens = [];
    while (this.pos < this.source.length) {
      this.skipWhitespace();
      if (this.pos >= this.source.length) break;
      const ch = this.peek();
      const startLine = this.line, startCol = this.col;
      if (/[0-9]/.test(ch)) {
        const num = this.readWhile(c => /[0-9.]/.test(c));
        tokens.push({ type: "NUMBER", value: parseFloat(num), line: startLine, col: startCol });
      } else if (/[A-Za-z_]/.test(ch)) {
        const id = this.readWhile(c => /[A-Za-z0-9_]/.test(c));
        const keywords = { fn: "FN", let: "LET", if: "IF", then: "THEN", else: "ELSE", in: "IN", match: "MATCH", with: "WITH", type: "TYPE", data: "DATA", module: "MODULE", import: "IMPORT", export: "EXPORT" };
        tokens.push({ type: keywords[id] || "IDENT", value: id, line: startLine, col: startCol });
      } else if (ch === '"') {
        this.advance();
        let str = "";
        while (this.pos < this.source.length && this.peek() !== '"') {
          if (this.peek() === "\\") { this.advance(); str += this.advance(); }
          else str += this.advance();
        }
        this.advance();
        tokens.push({ type: "STRING", value: str, line: startLine, col: startCol });
      } else {
        const twoChar = this.source.slice(this.pos, this.pos + 2);
        const twoMap = { "->": "ARROW", "=>": "FATARROW", "::": "DCOLON", "==": "EQ", "!=": "NEQ", "<=": "LTE", ">=": "GTE", "&&": "AND", "||": "OR" };
        if (twoMap[twoChar]) {
          this.advance(); this.advance();
          tokens.push({ type: twoMap[twoChar], value: twoChar, line: startLine, col: startCol });
        } else {
          const oneMap = { "+": "PLUS", "-": "MINUS", "*": "STAR", "/": "SLASH", "=": "ASSIGN", "<": "LT", ">": "GT", "(": "LPAREN", ")": "RPAREN", "[": "LBRACKET", "]": "RBRACKET", "{": "LBRACE", "}": "RBRACE", ",": "COMMA", ":": "COLON", ";": "SEMICOLON", ".": "DOT", "|": "PIPE", "\\": "BACKSLASH", "!": "NOT" };
          if (oneMap[ch]) {
            this.advance();
            tokens.push({ type: oneMap[ch], value: ch, line: startLine, col: startCol });
          } else {
            throw new Error("unexpected char '" + ch + "' at " + startLine + ":" + startCol);
          }
        }
      }
    }
    return tokens;
  }
}

class ASTBuilder {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }
  peek() { return this.pos < this.tokens.length ? this.tokens[this.pos] : null; }
  advance() { return this.tokens[this.pos++]; }
  expect(type) {
    const tok = this.advance();
    if (!tok || tok.type !== type) throw new Error("expected " + type + " got " + (tok ? tok.type : "EOF"));
    return tok;
  }
  match(type) {
    if (this.peek() && this.peek().type === type) { this.advance(); return true; }
    return false;
  }
  parseProgram() {
    const decls = [];
    while (this.pos < this.tokens.length) decls.push(this.parseDeclaration());
    return { type: "Program", declarations: decls };
  }
  parseDeclaration() {
    const tok = this.peek();
    if (tok.type === "LET") return this.parseLetBinding();
    if (tok.type === "FN") return this.parseFnDecl();
    if (tok.type === "TYPE") return this.parseTypeDecl();
    return this.parseExpression();
  }
  parseLetBinding() {
    this.expect("LET");
    const name = this.expect("IDENT").value;
    this.expect("ASSIGN");
    const value = this.parseExpression();
    this.match("SEMICOLON");
    return { type: "LetBinding", name, value };
  }
  parseFnDecl() {
    this.expect("FN");
    const name = this.expect("IDENT").value;
    const params = [];
    if (this.match("LPAREN")) {
      if (!this.match("RPAREN")) {
        params.push(this.expect("IDENT").value);
        while (this.match("COMMA")) params.push(this.expect("IDENT").value);
        this.expect("RPAREN");
      }
    }
    let returnType = null;
    if (this.match("COLON")) returnType = this.expect("IDENT").value;
    this.expect("ASSIGN");
    const body = this.parseExpression();
    this.match("SEMICOLON");
    return { type: "FnDecl", name, params, returnType, body };
  }
  parseTypeDecl() {
    this.expect("TYPE");
    const name = this.expect("IDENT").value;
    this.expect("ASSIGN");
    const variants = [];
    variants.push(this.expect("IDENT").value);
    while (this.match("PIPE")) variants.push(this.expect("IDENT").value);
    this.match("SEMICOLON");
    return { type: "TypeDecl", name, variants };
  }
  parseExpression() { return this.parseIfExpr(); }
  parseIfExpr() {
    if (this.match("IF")) {
      const condition = this.parseExpression();
      this.expect("THEN");
      const consequent = this.parseExpression();
      this.expect("ELSE");
      const alternate = this.parseExpression();
      return { type: "IfExpr", condition, consequent, alternate };
    }
    return this.parseLambda();
  }
  parseLambda() {
    if (this.peek() && this.peek().type === "BACKSLASH") {
      this.advance();
      const params = [this.expect("IDENT").value];
      while (this.match("COMMA")) params.push(this.expect("IDENT").value);
      this.expect("ARROW");
      const body = this.parseExpression();
      return { type: "Lambda", params, body };
    }
    return this.parseBinaryOp();
  }
  parseBinaryOp() {
    let left = this.parseUnary();
    const ops = { PLUS: "+", MINUS: "-", STAR: "*", SLASH: "/", EQ: "==", NEQ: "!=", LT: "<", GT: ">", LTE: "<=", GTE: ">=", AND: "&&", OR: "||" };
    while (this.peek() && ops[this.peek().type]) {
      const op = ops[this.advance().type];
      const right = this.parseUnary();
      left = { type: "BinaryOp", op, left, right };
    }
    return left;
  }
  parseUnary() {
    if (this.match("MINUS")) return { type: "UnaryOp", op: "-", operand: this.parseUnary() };
    if (this.match("NOT")) return { type: "UnaryOp", op: "!", operand: this.parseUnary() };
    return this.parseApplication();
  }
  parseApplication() {
    let callee = this.parseAtom();
    while (this.peek() && (this.peek().type === "IDENT" || this.peek().type === "NUMBER" || this.peek().type === "LPAREN")) {
      if (this.peek().type === "LPAREN") {
        this.advance();
        const args = [];
        if (!this.match("RPAREN")) {
          args.push(this.parseExpression());
          while (this.match("COMMA")) args.push(this.parseExpression());
          this.expect("RPAREN");
        }
        callee = { type: "Call", callee, args };
      } else {
        const arg = this.parseAtom();
        callee = { type: "Call", callee, args: [arg] };
      }
    }
    return callee;
  }
  parseAtom() {
    const tok = this.peek();
    if (!tok) throw new Error("unexpected EOF");
    if (tok.type === "NUMBER") { this.advance(); return { type: "NumberLiteral", value: tok.value }; }
    if (tok.type === "STRING") { this.advance(); return { type: "StringLiteral", value: tok.value }; }
    if (tok.type === "IDENT") { this.advance(); return { type: "Identifier", name: tok.value }; }
    if (tok.type === "LPAREN") {
      this.advance();
      const expr = this.parseExpression();
      this.expect("RPAREN");
      return expr;
    }
    if (tok.type === "LBRACKET") {
      this.advance();
      const elements = [];
      if (!this.match("RBRACKET")) {
        elements.push(this.parseExpression());
        while (this.match("COMMA")) elements.push(this.parseExpression());
        this.expect("RBRACKET");
      }
      return { type: "ListLiteral", elements };
    }
    throw new Error("unexpected token: " + tok.type);
  }
}

console.log("=== TOKENIZER ===");
check("tokenize number", (() => new Tokenizer("42").tokenize()[0])(), { type: "NUMBER", value: 42, line: 1, col: 1 });
check("tokenize ident", (() => new Tokenizer("foo").tokenize()[0].type)(), "IDENT");
check("tokenize keyword", (() => new Tokenizer("fn").tokenize()[0].type)(), "FN");
check("tokenize string", (() => new Tokenizer('"hello"').tokenize()[0].value)(), "hello");
check("tokenize arrow", (() => new Tokenizer("->").tokenize()[0].type)(), "ARROW");
check("tokenize operators", (() => new Tokenizer("+ - * /").tokenize().map(t => t.type))(), ["PLUS", "MINUS", "STAR", "SLASH"]);
check("tokenize unexpected throws", raises(() => new Tokenizer("@").tokenize()), true);
check("tokenize line tracking", (() => { const toks = new Tokenizer("a\nb").tokenize(); return [toks[0].line, toks[1].line]; })(), [1, 2]);

console.log("\n=== AST BUILDER ===");
check("parse number literal", (() => new ASTBuilder(new Tokenizer("42").tokenize()).parseExpression())(), { type: "NumberLiteral", value: 42 });
check("parse identifier", (() => new ASTBuilder(new Tokenizer("x").tokenize()).parseExpression())(), { type: "Identifier", name: "x" });
check("parse binary op", (() => {
  const ast = new ASTBuilder(new Tokenizer("1 + 2").tokenize()).parseExpression();
  return ast.type === "BinaryOp" && ast.op === "+";
})(), true);
check("parse precedence", (() => {
  const ast = new ASTBuilder(new Tokenizer("1 + 2 * 3").tokenize()).parseExpression();
  return ast.type === "BinaryOp" && ast.op === "+" && ast.right.type === "BinaryOp" && ast.right.op === "*";
})(), true);
check("parse let binding", (() => {
  const ast = new ASTBuilder(new Tokenizer("let x = 42").tokenize()).parseDeclaration();
  return ast.type === "LetBinding" && ast.name === "x";
})(), true);
check("parse fn declaration", (() => {
  const ast = new ASTBuilder(new Tokenizer("fn add(a, b) = a + b").tokenize()).parseDeclaration();
  return ast.type === "FnDecl" && ast.name === "add" && ast.params.length === 2;
})(), true);
check("parse lambda", (() => {
  const ast = new ASTBuilder(new Tokenizer("\\x -> x + 1").tokenize()).parseExpression();
  return ast.type === "Lambda" && ast.params[0] === "x";
})(), true);
check("parse if expression", (() => {
  const ast = new ASTBuilder(new Tokenizer("if x then 1 else 0").tokenize()).parseExpression();
  return ast.type === "IfExpr";
})(), true);
check("parse function call", (() => {
  const ast = new ASTBuilder(new Tokenizer("f(x, y)").tokenize()).parseExpression();
  return ast.type === "Call" && ast.args.length === 2;
})(), true);
check("parse curried call", (() => {
  const ast = new ASTBuilder(new Tokenizer("f x y").tokenize()).parseExpression();
  return ast.type === "Call" && ast.callee.type === "Call";
})(), true);
check("parse list literal", (() => {
  const ast = new ASTBuilder(new Tokenizer("[1, 2, 3]").tokenize()).parseExpression();
  return ast.type === "ListLiteral" && ast.elements.length === 3;
})(), true);
check("parse type declaration", (() => {
  const ast = new ASTBuilder(new Tokenizer("type Color = Red | Green | Blue").tokenize()).parseDeclaration();
  return ast.type === "TypeDecl" && ast.variants.length === 3;
})(), true);
check("parse unary minus", (() => {
  const ast = new ASTBuilder(new Tokenizer("-5").tokenize()).parseExpression();
  return ast.type === "UnaryOp" && ast.op === "-";
})(), true);
check("parse nested parens", (() => {
  const ast = new ASTBuilder(new Tokenizer("(1 + 2) * 3").tokenize()).parseExpression();
  return ast.type === "BinaryOp" && ast.op === "*" && ast.left.type === "BinaryOp";
})(), true);
check("parse program multiple decls", (() => {
  const ast = new ASTBuilder(new Tokenizer("let x = 1\nlet y = 2").tokenize()).parseProgram();
  return ast.type === "Program" && ast.declarations.length === 2;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
