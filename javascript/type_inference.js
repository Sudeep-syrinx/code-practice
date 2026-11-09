const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class TypeEnv {
  constructor(parent) {
    this.parent = parent || null;
    this.bindings = new Map();
  }
  bind(name, type) { this.bindings.set(name, type); }
  lookup(name) {
    if (this.bindings.has(name)) return this.bindings.get(name);
    if (this.parent) return this.parent.lookup(name);
    return null;
  }
  extend() { return new TypeEnv(this); }
}

class TypeInferencer {
  constructor() {
    this.nextVar = 0;
    this.substitutions = new Map();
  }
  freshVar() { return "T" + (this.nextVar++); }
  unify(t1, t2) {
    const r1 = this.resolve(t1);
    const r2 = this.resolve(t2);
    if (r1 === r2) return true;
    if (typeof r1 === "string" && r1.startsWith("T")) {
      this.substitutions.set(r1, r2);
      return true;
    }
    if (typeof r2 === "string" && r2.startsWith("T")) {
      this.substitutions.set(r2, r1);
      return true;
    }
    if (typeof r1 === "object" && typeof r2 === "object" && r1.kind === r2.kind) {
      if (r1.kind === "arrow") {
        return this.unify(r1.param, r2.param) && this.unify(r1.ret, r2.ret);
      }
      if (r1.kind === "tuple") {
        if (r1.elements.length !== r2.elements.length) return false;
        return r1.elements.every((e, i) => this.unify(e, r2.elements[i]));
      }
    }
    if (typeof r1 === "string" && typeof r2 === "string" && !r1.startsWith("T") && !r2.startsWith("T")) {
      return r1 === r2;
    }
    return false;
  }
  resolve(type) {
    if (typeof type === "string" && type.startsWith("T") && this.substitutions.has(type)) {
      return this.resolve(this.substitutions.get(type));
    }
    if (typeof type === "object" && type.kind === "arrow") {
      return { kind: "arrow", param: this.resolve(type.param), ret: this.resolve(type.ret) };
    }
    if (typeof type === "object" && type.kind === "tuple") {
      return { kind: "tuple", elements: type.elements.map(e => this.resolve(e)) };
    }
    return type;
  }
  infer(expr, env) {
    if (expr.kind === "literal") return expr.type;
    if (expr.kind === "var") {
      const t = env.lookup(expr.name);
      if (t === null) throw new Error("unbound variable: " + expr.name);
      return t;
    }
    if (expr.kind === "lambda") {
      const paramType = this.freshVar();
      const newEnv = env.extend();
      newEnv.bind(expr.param, paramType);
      const bodyType = this.infer(expr.body, newEnv);
      return { kind: "arrow", param: paramType, ret: bodyType };
    }
    if (expr.kind === "apply") {
      const funcType = this.infer(expr.func, env);
      const argType = this.infer(expr.arg, env);
      const retType = this.freshVar();
      if (!this.unify(funcType, { kind: "arrow", param: argType, ret: retType })) {
        throw new Error("type mismatch in application");
      }
      return this.resolve(retType);
    }
    if (expr.kind === "let") {
      const valType = this.infer(expr.value, env);
      const newEnv = env.extend();
      newEnv.bind(expr.name, valType);
      return this.infer(expr.body, newEnv);
    }
    if (expr.kind === "tuple") {
      return { kind: "tuple", elements: expr.elements.map(e => this.infer(e, env)) };
    }
    throw new Error("unknown expression kind: " + expr.kind);
  }
}

function lit(type, value) { return { kind: "literal", type, value }; }
function vr(name) { return { kind: "var", name }; }
function lam(param, body) { return { kind: "lambda", param, body }; }
function app(func, arg) { return { kind: "apply", func, arg }; }
function lt(name, value, body) { return { kind: "let", name, value, body }; }
function tup(...elements) { return { kind: "tuple", elements }; }
function arrow(param, ret) { return { kind: "arrow", param, ret }; }

check("infer literal int", (() => {
  const ti = new TypeInferencer();
  return ti.infer(lit("int", 42), new TypeEnv());
})(), "int");
check("infer variable from env", (() => {
  const ti = new TypeInferencer();
  const env = new TypeEnv();
  env.bind("x", "bool");
  return ti.infer(vr("x"), env);
})(), "bool");
check("infer unbound var throws", (() => {
  const ti = new TypeInferencer();
  return raises(() => ti.infer(vr("missing"), new TypeEnv()));
})(), true);
check("infer identity function", (() => {
  const ti = new TypeInferencer();
  const t = ti.infer(lam("x", vr("x")), new TypeEnv());
  const resolved = ti.resolve(t);
  return resolved.kind === "arrow" && resolved.param === resolved.ret;
})(), true);
check("infer application", (() => {
  const ti = new TypeInferencer();
  const env = new TypeEnv();
  env.bind("f", arrow("int", "bool"));
  const t = ti.infer(app(vr("f"), lit("int", 5)), env);
  return ti.resolve(t);
})(), "bool");
check("infer type mismatch throws", (() => {
  const ti = new TypeInferencer();
  const env = new TypeEnv();
  env.bind("f", arrow("int", "bool"));
  return raises(() => ti.infer(app(vr("f"), lit("bool", true)), env));
})(), true);
check("infer let binding", (() => {
  const ti = new TypeInferencer();
  const t = ti.infer(lt("x", lit("int", 1), vr("x")), new TypeEnv());
  return t;
})(), "int");
check("infer tuple", (() => {
  const ti = new TypeInferencer();
  const t = ti.infer(tup(lit("int", 1), lit("bool", true)), new TypeEnv());
  return ti.resolve(t);
})(), { kind: "tuple", elements: ["int", "bool"] });
check("unify same type vars", (() => {
  const ti = new TypeInferencer();
  const v = ti.freshVar();
  return ti.unify(v, v);
})(), true);
check("unify concrete types match", (() => {
  const ti = new TypeInferencer();
  return ti.unify("int", "int");
})(), true);
check("unify concrete types mismatch", (() => {
  const ti = new TypeInferencer();
  return ti.unify("int", "bool");
})(), false);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
