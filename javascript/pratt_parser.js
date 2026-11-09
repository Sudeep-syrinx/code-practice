const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class Token {
  constructor(type, value, line, col) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
  }
}

class PrattParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.prefixParsers = new Map();
    this.infixParsers = new Map();
    this.prefixPrecedences = new Map();
    this.infixPrecedences = new Map();
  }

  registerPrefix(tokenType, parser, precedence) {
    this.prefixParsers.set(tokenType, parser);
    if (precedence !== undefined) this.prefixPrecedences.set(tokenType, precedence);
  }

  registerInfix(tokenType, parser, precedence) {
    this.infixParsers.set(tokenType, parser);
    this.infixPrecedences.set(tokenType, precedence);
  }

  peek() {
    if (this.pos >= this.tokens.length) return null;
    return this.tokens[this.pos];
  }

  advance() {
    const tok = this.peek();
    if (tok) this.pos++;
    return tok;
  }

  expect(type) {
    const tok = this.advance();
    if (!tok || tok.type !== type) throw new Error("expected " + type + " but got " + (tok ? tok.type : "EOF"));
    return tok;
  }

  match(type) {
    const tok = this.peek();
    if (tok && tok.type === type) { this.advance(); return true; }
    return false;
  }

  parseExpression(precedence) {
    const tok = this.peek();
    if (!tok) throw new Error("unexpected EOF");
    const prefixParser = this.prefixParsers.get(tok.type);
    if (!prefixParser) throw new Error("no prefix parser for " + tok.type);
    let left = prefixParser(this);
    while (true) {
      const next = this.peek();
      if (!next) break;
      const infixParser = this.infixParsers.get(next.type);
      if (!infixParser) break;
      const prec = this.infixPrecedences.get(next.type) || 0;
      if (prec <= precedence) break;
      left = infixParser(this, left);
    }
    return left;
  }

  parse() {
    return this.parseExpression(0);
  }
}

const PREC = { NONE: 0, ASSIGN: 1, OR: 2, AND: 3, EQUALITY: 4, COMPARISON: 5, TERM: 6, FACTOR: 7, UNARY: 8, CALL: 9 };

function buildExprParser(tokens) {
  const p = new PrattParser(tokens);

  p.registerPrefix("NUMBER", (parser) => {
    const tok = parser.advance();
    return { type: "literal", value: tok.value };
  });

  p.registerPrefix("STRING", (parser) => {
    const tok = parser.advance();
    return { type: "string", value: tok.value };
  });

  p.registerPrefix("IDENT", (parser) => {
    const tok = parser.advance();
    return { type: "var", name: tok.value };
  });

  p.registerPrefix("LPAREN", (parser) => {
    parser.advance();
    const expr = parser.parseExpression(PREC.NONE);
    parser.expect("RPAREN");
    return expr;
  });

  p.registerPrefix("MINUS", (parser) => {
    parser.advance();
    const operand = parser.parseExpression(PREC.UNARY);
    return { type: "unary", op: "-", operand };
  }, PREC.UNARY);

  p.registerPrefix("NOT", (parser) => {
    parser.advance();
    const operand = parser.parseExpression(PREC.UNARY);
    return { type: "unary", op: "!", operand };
  }, PREC.UNARY);

  p.registerPrefix("IF", (parser) => {
    parser.advance();
    const condition = parser.parseExpression(PREC.NONE);
    parser.expect("THEN");
    const consequent = parser.parseExpression(PREC.NONE);
    parser.expect("ELSE");
    const alternate = parser.parseExpression(PREC.NONE);
    return { type: "ternary", condition, consequent, alternate };
  });

  p.registerInfix("PLUS", (parser, left) => {
    parser.advance();
    const right = parser.parseExpression(PREC.TERM);
    return { type: "binary", op: "+", left, right };
  }, PREC.TERM);

  p.registerInfix("MINUS", (parser, left) => {
    parser.advance();
    const right = parser.parseExpression(PREC.TERM);
    return { type: "binary", op: "-", left, right };
  }, PREC.TERM);

  p.registerInfix("STAR", (parser, left) => {
    parser.advance();
    const right = parser.parseExpression(PREC.FACTOR);
    return { type: "binary", op: "*", left, right };
  }, PREC.FACTOR);

  p.registerInfix("SLASH", (parser, left) => {
    parser.advance();
    const right = parser.parseExpression(PREC.FACTOR);
    return { type: "binary", op: "/", left, right };
  }, PREC.FACTOR);

  p.registerInfix("EQ", (parser, left) => {
    parser.advance();
    const right = parser.parseExpression(PREC.EQUALITY);
    return { type: "binary", op: "==", left, right };
  }, PREC.EQUALITY);

  p.registerInfix("NEQ", (parser, left) => {
    parser.advance();
    const right = parser.parseExpression(PREC.EQUALITY);
    return { type: "binary", op: "!=", left, right };
  }, PREC.EQUALITY);

  p.registerInfix("LT", (parser, left) => {
    parser.advance();
    const right = parser.parseExpression(PREC.COMPARISON);
    return { type: "binary", op: "<", left, right };
  }, PREC.COMPARISON);

  p.registerInfix("GT", (parser, left) => {
    parser.advance();
    const right = parser.parseExpression(PREC.COMPARISON);
    return { type: "binary", op: ">", left, right };
  }, PREC.COMPARISON);

  p.registerInfix("LTE", (parser, left) => {
    parser.advance();
    const right = parser.parseExpression(PREC.COMPARISON);
    return { type: "binary", op: "<=", left, right };
  }, PREC.COMPARISON);

  p.registerInfix("GTE", (parser, left) => {
    parser.advance();
    const right = parser.parseExpression(PREC.COMPARISON);
    return { type: "binary", op: ">=", left, right };
  }, PREC.COMPARISON);

  p.registerInfix("AND", (parser, left) => {
    parser.advance();
    const right = parser.parseExpression(PREC.AND);
    return { type: "binary", op: "&&", left, right };
  }, PREC.AND);

  p.registerInfix("OR", (parser, left) => {
    parser.advance();
    const right = parser.parseExpression(PREC.OR);
    return { type: "binary", op: "||", left, right };
  }, PREC.OR);

  p.registerInfix("ASSIGN", (parser, left) => {
    parser.advance();
    const right = parser.parseExpression(PREC.ASSIGN);
    return { type: "assign", target: left, value: right };
  }, PREC.ASSIGN);

  p.registerInfix("LPAREN", (parser, left) => {
    parser.advance();
    const args = [];
    if (!parser.match("RPAREN")) {
      args.push(parser.parseExpression(PREC.NONE));
      while (parser.match("COMMA")) {
        args.push(parser.parseExpression(PREC.NONE));
      }
      parser.expect("RPAREN");
    }
    return { type: "call", callee: left, args };
  }, PREC.CALL);

  p.registerInfix("DOT", (parser, left) => {
    parser.advance();
    const prop = parser.expect("IDENT");
    return { type: "member", object: left, property: prop.value };
  }, PREC.CALL);

  return p;
}

function tokenizeExpr(src) {
  const tokens = [];
  let i = 0, line = 1, col = 1;
  while (i < src.length) {
    if (/\s/.test(src[i])) { if (src[i] === "\n") { line++; col = 1; } else col++; i++; continue; }
    const startCol = col;
    if (/[0-9]/.test(src[i])) {
      let num = "";
      while (i < src.length && /[0-9.]/.test(src[i])) { num += src[i]; i++; col++; }
      tokens.push(new Token("NUMBER", parseFloat(num), line, startCol));
      continue;
    }
    if (/[A-Za-z_]/.test(src[i])) {
      let id = "";
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) { id += src[i]; i++; col++; }
      const keywords = { if: "IF", then: "THEN", else: "ELSE", not: "NOT", and: "AND", or: "OR" };
      tokens.push(new Token(keywords[id] || "IDENT", id, line, startCol));
      continue;
    }
    if (src[i] === '"') {
      i++; col++;
      let str = "";
      while (i < src.length && src[i] !== '"') { str += src[i]; i++; col++; }
      i++; col++;
      tokens.push(new Token("STRING", str, line, startCol));
      continue;
    }
    const twoChar = src.slice(i, i + 2);
    const twoMap = { "==": "EQ", "!=": "NEQ", "<=": "LTE", ">=": "GTE", "&&": "AND", "||": "OR" };
    if (twoMap[twoChar]) { tokens.push(new Token(twoMap[twoChar], twoChar, line, startCol)); i += 2; col += 2; continue; }
    const oneMap = { "+": "PLUS", "-": "MINUS", "*": "STAR", "/": "SLASH", "=": "ASSIGN", "<": "LT", ">": "GT", "(": "LPAREN", ")": "RPAREN", ",": "COMMA", ".": "DOT", "!": "NOT" };
    if (oneMap[src[i]]) { tokens.push(new Token(oneMap[src[i]], src[i], line, startCol)); i++; col++; continue; }
    throw new Error("unexpected char '" + src[i] + "' at " + line + ":" + startCol);
  }
  return tokens;
}

function evalAST(node, env) {
  if (node.type === "literal") return node.value;
  if (node.type === "string") return node.value;
  if (node.type === "var") {
    if (!(node.name in env)) throw new Error("undefined: " + node.name);
    return env[node.name];
  }
  if (node.type === "unary") {
    const val = evalAST(node.operand, env);
    if (node.op === "-") return -val;
    if (node.op === "!") return !val;
  }
  if (node.type === "binary") {
    const l = evalAST(node.left, env);
    const r = evalAST(node.right, env);
    switch (node.op) {
      case "+": return typeof l === "string" ? l + r : l + r;
      case "-": return l - r;
      case "*": return l * r;
      case "/": return l / r;
      case "==": return l === r;
      case "!=": return l !== r;
      case "<": return l < r;
      case ">": return l > r;
      case "<=": return l <= r;
      case ">=": return l >= r;
      case "&&": return l && r;
      case "||": return l || r;
    }
  }
  if (node.type === "assign") {
    if (node.target.type !== "var") throw new Error("invalid assignment target");
    env[node.target.name] = evalAST(node.value, env);
    return env[node.target.name];
  }
  if (node.type === "call") {
    const fn = evalAST(node.callee, env);
    if (typeof fn !== "function") throw new Error("not callable");
    const args = node.args.map(a => evalAST(a, env));
    return fn(...args);
  }
  if (node.type === "member") {
    const obj = evalAST(node.object, env);
    return obj[node.property];
  }
  if (node.type === "ternary") {
    return evalAST(node.condition, env) ? evalAST(node.consequent, env) : evalAST(node.alternate, env);
  }
  throw new Error("unknown node type: " + node.type);
}

console.log("=== TOKENIZER ===");
check("tokenize number", (() => tokenizeExpr("42")[0].value)(), 42);
check("tokenize float", (() => tokenizeExpr("3.14")[0].value)(), 3.14);
check("tokenize ident", (() => tokenizeExpr("foo")[0].type)(), "IDENT");
check("tokenize string", (() => tokenizeExpr('"hello"')[0].value)(), "hello");
check("tokenize operators", (() => tokenizeExpr("+ - * /").map(t => t.type))(), ["PLUS", "MINUS", "STAR", "SLASH"]);
check("tokenize comparison", (() => tokenizeExpr("== != <= >=").map(t => t.type))(), ["EQ", "NEQ", "LTE", "GTE"]);
check("tokenize keywords", (() => tokenizeExpr("if then else").map(t => t.type))(), ["IF", "THEN", "ELSE"]);
check("tokenize unexpected throws", raises(() => tokenizeExpr("@")), true);

console.log("\n=== PARSER BASIC ===");
check("parse number literal", (() => {
  const ast = buildExprParser(tokenizeExpr("42")).parse();
  return ast;
})(), { type: "literal", value: 42 });
check("parse variable", (() => {
  const ast = buildExprParser(tokenizeExpr("x")).parse();
  return ast;
})(), { type: "var", name: "x" });
check("parse addition", (() => {
  const ast = buildExprParser(tokenizeExpr("1 + 2")).parse();
  return ast.type === "binary" && ast.op === "+";
})(), true);
check("parse precedence mul over add", (() => {
  const ast = buildExprParser(tokenizeExpr("1 + 2 * 3")).parse();
  return ast.type === "binary" && ast.op === "+" && ast.right.type === "binary" && ast.right.op === "*";
})(), true);
check("parse parentheses override", (() => {
  const ast = buildExprParser(tokenizeExpr("(1 + 2) * 3")).parse();
  return ast.type === "binary" && ast.op === "*" && ast.left.type === "binary" && ast.left.op === "+";
})(), true);
check("parse unary minus", (() => {
  const ast = buildExprParser(tokenizeExpr("-5")).parse();
  return ast.type === "unary" && ast.op === "-";
})(), true);
check("parse chained comparison", (() => {
  const ast = buildExprParser(tokenizeExpr("a < b")).parse();
  return ast.type === "binary" && ast.op === "<";
})(), true);

console.log("\n=== EVALUATOR ===");
check("eval literal", evalAST({ type: "literal", value: 42 }, {}), 42);
check("eval addition", evalAST({ type: "binary", op: "+", left: { type: "literal", value: 3 }, right: { type: "literal", value: 4 } }, {}), 7);
check("eval multiplication", evalAST({ type: "binary", op: "*", left: { type: "literal", value: 6 }, right: { type: "literal", value: 7 } }, {}), 42);
check("eval variable lookup", evalAST({ type: "var", name: "x" }, { x: 99 }), 99);
check("eval undefined throws", raises(() => evalAST({ type: "var", name: "missing" }, {})), true);
check("eval unary negation", evalAST({ type: "unary", op: "-", operand: { type: "literal", value: 5 } }, {}), -5);
check("eval assignment", (() => {
  const env = {};
  evalAST({ type: "assign", target: { type: "var", name: "x" }, value: { type: "literal", value: 10 } }, env);
  return env.x;
})(), 10);
check("eval function call", (() => {
  const env = { double: (x) => x * 2 };
  return evalAST({ type: "call", callee: { type: "var", name: "double" }, args: [{ type: "literal", value: 21 }] }, env);
})(), 42);
check("eval member access", evalAST({ type: "member", object: { type: "literal", value: { x: 5 } }, property: "x" }, {}), 5);
check("eval ternary true", evalAST({ type: "ternary", condition: { type: "literal", value: true }, consequent: { type: "literal", value: 1 }, alternate: { type: "literal", value: 2 } }, {}), 1);
check("eval ternary false", evalAST({ type: "ternary", condition: { type: "literal", value: false }, consequent: { type: "literal", value: 1 }, alternate: { type: "literal", value: 2 } }, {}), 2);

console.log("\n=== END TO END ===");
check("e2e arithmetic", (() => {
  const ast = buildExprParser(tokenizeExpr("2 + 3 * 4")).parse();
  return evalAST(ast, {});
})(), 14);
check("e2e with variables", (() => {
  const ast = buildExprParser(tokenizeExpr("x + y * z")).parse();
  return evalAST(ast, { x: 1, y: 2, z: 3 });
})(), 7);
check("e2e nested parens", (() => {
  const ast = buildExprParser(tokenizeExpr("((2 + 3) * (4 - 1))")).parse();
  return evalAST(ast, {});
})(), 15);
check("e2e comparison", (() => {
  const ast = buildExprParser(tokenizeExpr("5 > 3")).parse();
  return evalAST(ast, {});
})(), true);
check("e2e logical and", (() => {
  const ast = buildExprParser(tokenizeExpr("true && false")).parse();
  return evalAST(ast, {});
})(), false);
check("e2e string concat", (() => {
  const ast = buildExprParser(tokenizeExpr('"hello" + " world"')).parse();
  return evalAST(ast, {});
})(), "hello world");
check("e2e complex expression", (() => {
  const ast = buildExprParser(tokenizeExpr("a * (b + c) - d / e")).parse();
  return evalAST(ast, { a: 2, b: 3, c: 4, d: 10, e: 2 });
})(), 9);
check("e2e function call in expr", (() => {
  const ast = buildExprParser(tokenizeExpr("max(3, 7) + 1")).parse();
  return evalAST(ast, { max: Math.max });
})(), 8);
check("e2e member access", (() => {
  const ast = buildExprParser(tokenizeExpr("obj.x + obj.y")).parse();
  return evalAST(ast, { obj: { x: 10, y: 20 } });
})(), 30);
check("e2e ternary in expression", (() => {
  const ast = buildExprParser(tokenizeExpr("if x > 0 then x else 0 - x")).parse();
  return evalAST(ast, { x: -5 });
})(), 5);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
