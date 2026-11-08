const results = [];

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}

function raises(fn) {
  try {
    fn();
  } catch (e) {
    return true;
  }
  return false;
}

function roundTo(value, digits) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}

function isLetter(ch) {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_";
}

function tokenize(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }
    if (isDigit(ch) || ch === ".") {
      let j = i;
      let dots = 0;
      while (j < text.length && (isDigit(text[j]) || text[j] === ".")) {
        if (text[j] === ".") {
          dots++;
        }
        j++;
      }
      const str = text.slice(i, j);
      if (dots > 1 || str === ".") {
        throw new Error("bad number: " + str);
      }
      tokens.push({ type: "num", value: Number(str) });
      i = j;
      continue;
    }
    if (isLetter(ch)) {
      let j = i;
      while (j < text.length && (isLetter(text[j]) || isDigit(text[j]))) {
        j++;
      }
      tokens.push({ type: "id", value: text.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/^(),".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    throw new Error("unexpected character: " + ch);
  }
  return tokens;
}

const FUNCS = {
  sqrt: {
    arity: 1,
    run: (a) => {
      if (a[0] < 0) {
        throw new Error("sqrt of negative number");
      }
      return Math.sqrt(a[0]);
    },
  },
  abs: { arity: 1, run: (a) => Math.abs(a[0]) },
  floor: { arity: 1, run: (a) => Math.floor(a[0]) },
  ceil: { arity: 1, run: (a) => Math.ceil(a[0]) },
  max: { arity: -1, run: (a) => Math.max(...a) },
  min: { arity: -1, run: (a) => Math.min(...a) },
};

class Parser {
  constructor(tokens, vars) {
    this.tokens = tokens;
    this.vars = vars;
    this.pos = 0;
  }

  peek() {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  take() {
    const t = this.peek();
    if (t !== null) {
      this.pos++;
    }
    return t;
  }

  isOp(value) {
    const t = this.peek();
    return t !== null && t.type === "op" && t.value === value;
  }

  expect(value) {
    if (!this.isOp(value)) {
      throw new Error("expected " + value);
    }
    this.take();
  }

  parseExpr() {
    let left = this.parseTerm();
    while (this.isOp("+") || this.isOp("-")) {
      const op = this.take().value;
      const right = this.parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  parseTerm() {
    let left = this.parseUnary();
    while (this.isOp("*") || this.isOp("/")) {
      const op = this.take().value;
      const right = this.parseUnary();
      if (op === "/") {
        if (right === 0) {
          throw new Error("division by zero");
        }
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  parseUnary() {
    if (this.isOp("-")) {
      this.take();
      return -this.parseUnary();
    }
    if (this.isOp("+")) {
      this.take();
      return this.parseUnary();
    }
    return this.parsePower();
  }

  parsePower() {
    const base = this.parseAtom();
    if (this.isOp("^")) {
      this.take();
      const exp = this.parseUnary();
      return Math.pow(base, exp);
    }
    return base;
  }

  parseAtom() {
    const t = this.take();
    if (t === null) {
      throw new Error("unexpected end of input");
    }
    if (t.type === "num") {
      return t.value;
    }
    if (t.type === "id") {
      if (this.isOp("(")) {
        this.take();
        const args = [];
        if (!this.isOp(")")) {
          args.push(this.parseExpr());
          while (this.isOp(",")) {
            this.take();
            args.push(this.parseExpr());
          }
        }
        this.expect(")");
        if (!Object.prototype.hasOwnProperty.call(FUNCS, t.value)) {
          throw new Error("unknown function: " + t.value);
        }
        const fn = FUNCS[t.value];
        if (fn.arity === -1 && args.length < 1) {
          throw new Error(t.value + " needs at least one argument");
        }
        if (fn.arity !== -1 && args.length !== fn.arity) {
          throw new Error(t.value + " needs " + fn.arity + " argument(s)");
        }
        return fn.run(args);
      }
      if (!Object.prototype.hasOwnProperty.call(this.vars, t.value)) {
        throw new Error("unknown variable: " + t.value);
      }
      return this.vars[t.value];
    }
    if (t.value === "(") {
      const v = this.parseExpr();
      this.expect(")");
      return v;
    }
    throw new Error("unexpected token: " + t.value);
  }
}

function evaluate(text, vars) {
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    throw new Error("empty expression");
  }
  const parser = new Parser(tokens, vars || {});
  const value = parser.parseExpr();
  if (parser.pos < tokens.length) {
    throw new Error("unexpected token after expression");
  }
  return value;
}

check("tokenize simple", tokenize("1+2"), [{ type: "num", value: 1 }, { type: "op", value: "+" }, { type: "num", value: 2 }]);
check("tokenize names", tokenize("x1 * 2.5"), [{ type: "id", value: "x1" }, { type: "op", value: "*" }, { type: "num", value: 2.5 }]);
check("tokenize count", tokenize("max(1,2)").length, 6);
check("tokenize empty", tokenize("   "), []);
check("tokenize bad char", raises(() => tokenize("3 $ 4")), true);
check("tokenize two dots", raises(() => tokenize("1..2")), true);
check("tokenize lone dot", raises(() => tokenize(".")), true);

console.log();
check("add", evaluate("1+2"), 3);
check("precedence", evaluate("2+3*4"), 14);
check("parentheses", evaluate("(2+3)*4"), 20);
check("divide", evaluate("10/4"), 2.5);
check("left subtract", evaluate("10-4-3"), 3);
check("left divide", evaluate("100/10/5"), 2);
check("mixed mul div", evaluate("8/2*4"), 16);
check("power", evaluate("2^3"), 8);
check("power right assoc", evaluate("2^3^2"), 512);
check("negative power", evaluate("2^-1"), 0.5);
check("fractional power", roundTo(evaluate("2^0.5"), 6), 1.414214);
check("unary minus", evaluate("-5+2"), -3);
check("minus group", evaluate("-(2+3)"), -5);
check("times negative", evaluate("2*-3"), -6);
check("minus power", evaluate("-2^2"), -4);
check("decimal", evaluate("1.5*2"), 3);
check("leading dot", evaluate(".5+.5"), 1);
check("spaces", evaluate("  7  "), 7);
check("nested", evaluate("2*(3+(4-1))*2"), 24);
check("deep nesting", evaluate("((((1))))"), 1);
check("plus sign", evaluate("+4"), 4);

console.log();
check("variable", evaluate("x*2+y", { x: 5, y: 3 }), 13);
check("variable power", evaluate("x^2", { x: 7 }), 49);
check("variable name", evaluate("2*pi", { pi: 3 }), 6);
check("unknown variable", raises(() => evaluate("z+1")), true);
check("function as variable", raises(() => evaluate("max")), true);
check("sqrt", evaluate("sqrt(16)"), 4);
check("abs", evaluate("abs(-7)"), 7);
check("max", evaluate("max(3,9,4)"), 9);
check("min", evaluate("min(3,9,4)"), 3);
check("floor", evaluate("floor(2.9)"), 2);
check("ceil", evaluate("ceil(2.1)"), 3);
check("nested functions", evaluate("sqrt(max(4,9))"), 3);
check("function args math", evaluate("max(1+1, 2*3)"), 6);
check("function in sum", evaluate("abs(-2)+abs(-3)"), 5);

console.log();
check("divide by zero", raises(() => evaluate("1/0")), true);
check("divide by zero expr", raises(() => evaluate("5/(2-2)")), true);
check("sqrt negative", raises(() => evaluate("sqrt(-1)")), true);
check("missing operand", raises(() => evaluate("1+")), true);
check("missing close", raises(() => evaluate("(1+2")), true);
check("extra close", raises(() => evaluate("1+2)")), true);
check("two numbers", raises(() => evaluate("1 2")), true);
check("empty", raises(() => evaluate("")), true);
check("starts with star", raises(() => evaluate("*3")), true);
check("empty max", raises(() => evaluate("max()")), true);
check("wrong arity", raises(() => evaluate("sqrt(1,2)")), true);
check("unknown function", raises(() => evaluate("foo(1)")), true);
check("only paren", raises(() => evaluate("(")), true);
check("trailing comma", raises(() => evaluate("max(1,)")), true);

console.log();
let seed = 555;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const ops = ["+", "-", "*"];
let randomOk = true;
for (let n = 0; n < 300; n++) {
  const count = 2 + nextRandom(5);
  let expr = String(nextRandom(20));
  for (let i = 1; i < count; i++) {
    expr += " " + ops[nextRandom(3)] + " " + nextRandom(20);
  }
  const expected = Function("return " + expr)();
  if (evaluate(expr) !== expected) {
    randomOk = false;
  }
}
check("300 random expressions", randomOk, true);

let groupOk = true;
for (let n = 0; n < 200; n++) {
  const a = nextRandom(30);
  const b = nextRandom(30);
  const c = nextRandom(30) + 1;
  const expr = "(" + a + " + " + b + ") * " + c + " - " + a;
  if (evaluate(expr) !== (a + b) * c - a) {
    groupOk = false;
  }
}
check("200 grouped expressions", groupOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
