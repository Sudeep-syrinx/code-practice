const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class NFAState {
  constructor(id) {
    this.id = id;
    this.epsilonTransitions = [];
    this.charTransition = null;
    this.charLabel = null;
    this.isAccept = false;
  }
}

class NFA {
  constructor() {
    this.states = [];
    this.startState = null;
    this.acceptStates = [];
    this.nextId = 0;
  }
  newState(isAccept) {
    const state = new NFAState(this.nextId++);
    if (isAccept) { state.isAccept = true; this.acceptStates.push(state); }
    this.states.push(state);
    return state;
  }
  addEpsilon(from, to) { from.epsilonTransitions.push(to); }
  addCharTransition(from, to, char) { from.charTransition = to; from.charLabel = char; }
  epsilonClosure(states) {
    const closure = new Set(states);
    const stack = [...states];
    while (stack.length > 0) {
      const state = stack.pop();
      for (const eps of state.epsilonTransitions) {
        if (!closure.has(eps)) { closure.add(eps); stack.push(eps); }
      }
    }
    return closure;
  }
  move(states, char) {
    const next = new Set();
    for (const state of states) {
      if (state.charTransition && state.charLabel === char) next.add(state.charTransition);
    }
    return next;
  }
  accepts(input) {
    let current = this.epsilonClosure(new Set([this.startState]));
    for (const ch of input) {
      const moved = this.move(current, ch);
      if (moved.size === 0) return false;
      current = this.epsilonClosure(moved);
    }
    for (const state of current) {
      if (state.isAccept) return true;
    }
    return false;
  }
}

class RegexToNFA {
  constructor() {
    this.nfa = new NFA();
  }
  buildLiteral(char) {
    const start = this.nfa.newState(false);
    const end = this.nfa.newState(true);
    this.nfa.addCharTransition(start, end, char);
    return { start, end };
  }
  buildConcat(a, b) {
    for (const acc of this.nfa.acceptStates) {
      if (acc === a.end) {
        acc.isAccept = false;
        this.nfa.acceptStates = this.nfa.acceptStates.filter(s => s !== acc);
        this.nfa.addEpsilon(acc, b.start);
      }
    }
    return { start: a.start, end: b.end };
  }
  buildUnion(a, b) {
    const start = this.nfa.newState(false);
    const end = this.nfa.newState(true);
    this.nfa.addEpsilon(start, a.start);
    this.nfa.addEpsilon(start, b.start);
    for (const acc of this.nfa.acceptStates) {
      if (acc === a.end || acc === b.end) {
        acc.isAccept = false;
        this.nfa.acceptStates = this.nfa.acceptStates.filter(s => s !== acc);
        this.nfa.addEpsilon(acc, end);
      }
    }
    return { start, end };
  }
  buildStar(a) {
    const start = this.nfa.newState(false);
    const end = this.nfa.newState(true);
    this.nfa.addEpsilon(start, a.start);
    this.nfa.addEpsilon(start, end);
    for (const acc of this.nfa.acceptStates) {
      if (acc === a.end) {
        acc.isAccept = false;
        this.nfa.acceptStates = this.nfa.acceptStates.filter(s => s !== acc);
        this.nfa.addEpsilon(acc, a.start);
        this.nfa.addEpsilon(acc, end);
      }
    }
    return { start, end };
  }
  buildPlus(a) {
    const end = this.nfa.newState(true);
    for (const acc of this.nfa.acceptStates) {
      if (acc === a.end) {
        acc.isAccept = false;
        this.nfa.acceptStates = this.nfa.acceptStates.filter(s => s !== acc);
        this.nfa.addEpsilon(acc, a.start);
        this.nfa.addEpsilon(acc, end);
      }
    }
    return { start: a.start, end };
  }
  buildQuestion(a) {
    const start = this.nfa.newState(false);
    const end = this.nfa.newState(true);
    this.nfa.addEpsilon(start, a.start);
    this.nfa.addEpsilon(start, end);
    for (const acc of this.nfa.acceptStates) {
      if (acc === a.end) {
        acc.isAccept = false;
        this.nfa.acceptStates = this.nfa.acceptStates.filter(s => s !== acc);
        this.nfa.addEpsilon(acc, end);
      }
    }
    return { start, end };
  }
  compile(pattern) {
    this.nfa = new NFA();
    const fragment = this._parse(pattern);
    this.nfa.startState = fragment.start;
    return this.nfa;
  }
  _parse(pattern) {
    const tokens = this._tokenize(pattern);
    return this._parseExpr(tokens, { pos: 0 });
  }
  _tokenize(pattern) {
    const tokens = [];
    let i = 0;
    while (i < pattern.length) {
      const ch = pattern[i];
      if (ch === "(" || ch === ")" || ch === "|" || ch === "*" || ch === "+" || ch === "?") {
        tokens.push({ type: ch });
      } else if (ch === ".") {
        tokens.push({ type: "CHAR", value: "." });
      } else if (ch === "[") {
        i++;
        let charset = "";
        while (i < pattern.length && pattern[i] !== "]") { charset += pattern[i]; i++; }
        tokens.push({ type: "CHARSET", value: charset });
      } else {
        tokens.push({ type: "CHAR", value: ch });
      }
      i++;
    }
    return tokens;
  }
  _parseExpr(tokens, ctx) {
    let left = this._parseTerm(tokens, ctx);
    while (ctx.pos < tokens.length && tokens[ctx.pos].type === "|") {
      ctx.pos++;
      const right = this._parseTerm(tokens, ctx);
      left = this.buildUnion(left, right);
    }
    return left;
  }
  _parseTerm(tokens, ctx) {
    let result = null;
    while (ctx.pos < tokens.length && tokens[ctx.pos].type !== "|" && tokens[ctx.pos].type !== ")") {
      const atom = this._parseAtom(tokens, ctx);
      result = result ? this.buildConcat(result, atom) : atom;
    }
    return result || this.buildLiteral("");
  }
  _parseAtom(tokens, ctx) {
    let fragment;
    const tok = tokens[ctx.pos];
    if (tok.type === "(") {
      ctx.pos++;
      fragment = this._parseExpr(tokens, ctx);
      ctx.pos++;
    } else if (tok.type === "CHAR") {
      ctx.pos++;
      if (tok.value === ".") {
        const start = this.nfa.newState(false);
        const end = this.nfa.newState(true);
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        for (const ch of chars) {
          const mid = this.nfa.newState(false);
          this.nfa.addCharTransition(start, mid, ch);
          this.nfa.addEpsilon(mid, end);
        }
        fragment = { start, end };
      } else {
        fragment = this.buildLiteral(tok.value);
      }
    } else if (tok.type === "CHARSET") {
      ctx.pos++;
      const start = this.nfa.newState(false);
      const end = this.nfa.newState(true);
      for (const ch of tok.value) {
        const mid = this.nfa.newState(false);
        this.nfa.addCharTransition(start, mid, ch);
        this.nfa.addEpsilon(mid, end);
      }
      fragment = { start, end };
    } else {
      ctx.pos++;
      fragment = this.buildLiteral(tok.value || "");
    }
    while (ctx.pos < tokens.length && (tokens[ctx.pos].type === "*" || tokens[ctx.pos].type === "+" || tokens[ctx.pos].type === "?")) {
      if (tokens[ctx.pos].type === "*") fragment = this.buildStar(fragment);
      else if (tokens[ctx.pos].type === "+") fragment = this.buildPlus(fragment);
      else fragment = this.buildQuestion(fragment);
      ctx.pos++;
    }
    return fragment;
  }
}

console.log("=== NFA BASIC ===");
check("nfa literal match", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("abc");
  return nfa.accepts("abc");
})(), true);
check("nfa literal no match", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("abc");
  return nfa.accepts("abd");
})(), false);
check("nfa empty string", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("");
  return nfa.accepts("");
})(), true);

console.log("\n=== UNION ===");
check("union matches either", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("a|b");
  return nfa.accepts("a") && nfa.accepts("b");
})(), true);
check("union rejects neither", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("a|b");
  return nfa.accepts("c");
})(), false);
check("multi union", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("a|b|c");
  return nfa.accepts("a") && nfa.accepts("b") && nfa.accepts("c") && !nfa.accepts("d");
})(), true);

console.log("\n=== KLEENE STAR ===");
check("star zero occurrences", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("a*");
  return nfa.accepts("");
})(), true);
check("star one occurrence", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("a*");
  return nfa.accepts("a");
})(), true);
check("star many occurrences", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("a*");
  return nfa.accepts("aaaaaaa");
})(), true);
check("star rejects wrong char", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("a*");
  return nfa.accepts("b");
})(), false);

console.log("\n=== PLUS AND QUESTION ===");
check("plus requires at least one", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("a+");
  return !nfa.accepts("") && nfa.accepts("a") && nfa.accepts("aaa");
})(), true);
check("question zero or one", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("a?");
  return nfa.accepts("") && nfa.accepts("a") && !nfa.accepts("aa");
})(), true);

console.log("\n=== COMPLEX PATTERNS ===");
check("concat with star", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("ab*c");
  return nfa.accepts("ac") && nfa.accepts("abc") && nfa.accepts("abbbc") && !nfa.accepts("adc");
})(), true);
check("grouping", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("(ab)+");
  return !nfa.accepts("") && nfa.accepts("ab") && nfa.accepts("abab") && !nfa.accepts("aba");
})(), true);
check("union in group", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("(a|b)c");
  return nfa.accepts("ac") && nfa.accepts("bc") && !nfa.accepts("cc");
})(), true);
check("charset", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("[abc]+");
  return nfa.accepts("a") && nfa.accepts("abc") && !nfa.accepts("d");
})(), true);
check("dot wildcard", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("a.c");
  return nfa.accepts("abc") && nfa.accepts("axc") && !nfa.accepts("ac");
})(), true);
check("complex email-like", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("[a-z]+@[a-z]+");
  return nfa.accepts("user@host") && !nfa.accepts("@host") && !nfa.accepts("user@");
})(), true);
check("nested groups", (() => {
  const builder = new RegexToNFA();
  const nfa = builder.compile("((a|b)c)*");
  return nfa.accepts("") && nfa.accepts("ac") && nfa.accepts("bcac") && !nfa.accepts("dc");
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
