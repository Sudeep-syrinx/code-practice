const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

const OP = {
  NOP:0x00, UNREACHABLE:0x01, DROP:0x1A, SELECT:0x1B,
  LOCAL_GET:0x20, LOCAL_SET:0x21, LOCAL_TEE:0x22,
  GLOBAL_GET:0x23, GLOBAL_SET:0x24,
  I32_CONST:0x41, I32_EQZ:0x45, I32_EQ:0x46, I32_NE:0x47,
  I32_LT_S:0x48, I32_LE_S:0x4C, I32_GT_S:0x4A, I32_GE_S:0x4E,
  I32_ADD:0x6A, I32_SUB:0x6B, I32_MUL:0x6C, I32_DIV_S:0x6D,
  I32_REM_S:0x6F, I32_AND:0x71, I32_OR:0x72, I32_XOR:0x73,
  I32_SHL:0x74, I32_SHR_S:0x75, I32_ROTL:0x77, I32_ROTR:0x78,
  I32_CLZ:0x67, I32_CTZ:0x68, I32_POPCNT:0x69,
  CALL:0x10, RETURN:0x0F, BR:0x0C, BR_IF:0x0D,
  BLOCK:0x02, LOOP:0x03, END:0x0B, IF:0x04, ELSE:0x05,
  MEMORY_LOAD:0x28, MEMORY_STORE:0x36
};

class WasmModule {
  constructor() {
    this.functions = [];
    this.globals = [];
    this.memorySize = 65536;
  }
  addFunction(paramCount, localCount, body) {
    const idx = this.functions.length;
    this.functions.push({ paramCount, localCount, body });
    return idx;
  }
  addGlobal(value, mutable) {
    const idx = this.globals.length;
    this.globals.push({ value, mutable: mutable !== false });
    return idx;
  }
}

class Frame {
  constructor(func, args, stackBase) {
    this.func = func;
    this.locals = new Array(func.paramCount + func.localCount).fill(0);
    for (let i = 0; i < args.length; i++) this.locals[i] = args[i];
    this.ip = 0;
    this.stackBase = stackBase;
    this.labelStack = [];
  }
}

class WasmRuntime {
  constructor(module) {
    this.module = module;
    this.stack = [];
    this.frames = [];
    this.globals = module.globals.map(g => g.value);
    this.memory = new Int32Array(module.memorySize / 4);
    this.trap = null;
    this.stepCount = 0;
    this.maxSteps = 2000000;
  }

  invoke(funcIdx, args) {
    const func = this.module.functions[funcIdx];
    if (!func) throw new Error("invalid function index");
    if (args.length !== func.paramCount) throw new Error("param count mismatch: expected " + func.paramCount + " got " + args.length);
    this.frames.push(new Frame(func, args, 0));
    while (this.frames.length > 0 && !this.trap) {
      this.stepCount++;
      if (this.stepCount > this.maxSteps) throw new Error("step limit exceeded");
      this._step();
    }
    if (this.trap) { const t = this.trap; this.trap = null; throw new Error("trap: " + t); }
    return this.stack.length > 0 ? this.stack.pop() : undefined;
  }

  _step() {
    const frame = this.frames[this.frames.length - 1];
    if (frame.ip >= frame.func.body.length) {
      const retVal = this.stack.length > frame.stackBase ? this.stack[this.stack.length - 1] : undefined;
      this.stack.length = frame.stackBase;
      if (retVal !== undefined) this.stack.push(retVal);
      this.frames.pop();
      return;
    }
    const instr = frame.func.body[frame.ip++];
    switch (instr.op) {
      case OP.NOP: break;
      case OP.UNREACHABLE: this.trap = "unreachable"; break;
      case OP.I32_CONST: this.stack.push(instr.value | 0); break;
      case OP.DROP: this.stack.pop(); break;
      case OP.SELECT: {
        const c = this.stack.pop(), b = this.stack.pop(), a = this.stack.pop();
        this.stack.push(c !== 0 ? a : b);
        break;
      }
      case OP.LOCAL_GET: this.stack.push(frame.locals[instr.index]); break;
      case OP.LOCAL_SET: frame.locals[instr.index] = this.stack.pop(); break;
      case OP.LOCAL_TEE: frame.locals[instr.index] = this.stack[this.stack.length - 1]; break;
      case OP.GLOBAL_GET: this.stack.push(this.globals[instr.index]); break;
      case OP.GLOBAL_SET: {
        if (!this.module.globals[instr.index].mutable) { this.trap = "immutable global"; break; }
        this.globals[instr.index] = this.stack.pop();
        break;
      }
      case OP.I32_ADD: { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push((a + b) | 0); break; }
      case OP.I32_SUB: { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push((a - b) | 0); break; }
      case OP.I32_MUL: { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(Math.imul(a, b)); break; }
      case OP.I32_DIV_S: {
        const b = this.stack.pop(), a = this.stack.pop();
        if (b === 0) { this.trap = "integer divide by zero"; break; }
        if (a === -2147483648 && b === -1) { this.trap = "integer overflow"; break; }
        this.stack.push((a / b) | 0);
        break;
      }
      case OP.I32_REM_S: {
        const b = this.stack.pop(), a = this.stack.pop();
        if (b === 0) { this.trap = "integer remainder by zero"; break; }
        this.stack.push(a % b);
        break;
      }
      case OP.I32_AND: { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a & b); break; }
      case OP.I32_OR: { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a | b); break; }
      case OP.I32_XOR: { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a ^ b); break; }
      case OP.I32_SHL: { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a << (b & 31)); break; }
      case OP.I32_SHR_S: { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a >> (b & 31)); break; }
      case OP.I32_ROTL: { const b = this.stack.pop(), a = this.stack.pop(); const s = b & 31; this.stack.push(((a << s) | (a >>> (32 - s))) | 0); break; }
      case OP.I32_ROTR: { const b = this.stack.pop(), a = this.stack.pop(); const s = b & 31; this.stack.push(((a >>> s) | (a << (32 - s))) | 0); break; }
      case OP.I32_CLZ: { const v = this.stack.pop(); this.stack.push(v === 0 ? 32 : Math.clz32(v)); break; }
      case OP.I32_CTZ: {
        const v = this.stack.pop();
        if (v === 0) { this.stack.push(32); break; }
        let c = 0; let x = v;
        while ((x & 1) === 0) { c++; x >>>= 1; }
        this.stack.push(c);
        break;
      }
      case OP.I32_POPCNT: {
        let v = this.stack.pop() >>> 0; let c = 0;
        while (v) { c += v & 1; v >>>= 1; }
        this.stack.push(c);
        break;
      }
      case OP.I32_EQZ: this.stack.push(this.stack.pop() === 0 ? 1 : 0); break;
      case OP.I32_EQ: { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a === b ? 1 : 0); break; }
      case OP.I32_NE: { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a !== b ? 1 : 0); break; }
      case OP.I32_LT_S: { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a < b ? 1 : 0); break; }
      case OP.I32_LE_S: { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a <= b ? 1 : 0); break; }
      case OP.I32_GT_S: { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a > b ? 1 : 0); break; }
      case OP.I32_GE_S: { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a >= b ? 1 : 0); break; }
      case OP.CALL: {
        const callee = this.module.functions[instr.funcIdx];
        const args = [];
        for (let i = 0; i < callee.paramCount; i++) args.unshift(this.stack.pop());
        this.frames.push(new Frame(callee, args, this.stack.length));
        break;
      }
      case OP.RETURN: {
        const retVal = this.stack.length > frame.stackBase ? this.stack[this.stack.length - 1] : undefined;
        this.stack.length = frame.stackBase;
        if (retVal !== undefined) this.stack.push(retVal);
        this.frames.pop();
        break;
      }
      case OP.BLOCK: frame.labelStack.push({ type: "block", ip: instr.endIp, stackBase: this.stack.length }); break;
      case OP.LOOP: frame.labelStack.push({ type: "loop", ip: frame.ip - 1, stackBase: this.stack.length }); break;
      case OP.END: {
        if (frame.labelStack.length > 0) frame.labelStack.pop();
        break;
      }
      case OP.BR: {
        const depth = instr.depth;
        const label = frame.labelStack[frame.labelStack.length - 1 - depth];
        if (!label) { this.trap = "invalid br depth"; break; }
        if (label.type === "loop") {
          frame.ip = label.ip;
        } else {
          frame.ip = label.ip;
          for (let d = 0; d <= depth; d++) frame.labelStack.pop();
        }
        break;
      }
      case OP.BR_IF: {
        const cond = this.stack.pop();
        if (cond !== 0) {
          const depth = instr.depth;
          const label = frame.labelStack[frame.labelStack.length - 1 - depth];
          if (!label) { this.trap = "invalid br_if depth"; break; }
          if (label.type === "loop") {
            frame.ip = label.ip;
          } else {
            frame.ip = label.ip;
            for (let d = 0; d <= depth; d++) frame.labelStack.pop();
          }
        }
        break;
      }
      case OP.IF: {
        const cond = this.stack.pop();
        if (cond !== 0) {
          frame.labelStack.push({ type: "block", ip: instr.endIp, stackBase: this.stack.length });
        } else {
          if (instr.elseIp !== undefined) {
            frame.ip = instr.elseIp;
            frame.labelStack.push({ type: "block", ip: instr.endIp, stackBase: this.stack.length });
          } else {
            frame.ip = instr.endIp;
          }
        }
        break;
      }
      case OP.ELSE: {
        const label = frame.labelStack[frame.labelStack.length - 1];
        if (label) frame.ip = label.ip;
        break;
      }
      case OP.MEMORY_LOAD: {
        const addr = this.stack.pop();
        const offset = instr.offset || 0;
        const effectiveAddr = addr + offset;
        if (effectiveAddr < 0 || effectiveAddr >= this.memory.length) { this.trap = "out of bounds memory access"; break; }
        this.stack.push(this.memory[effectiveAddr]);
        break;
      }
      case OP.MEMORY_STORE: {
        const val = this.stack.pop(), addr = this.stack.pop();
        const offset = instr.offset || 0;
        const effectiveAddr = addr + offset;
        if (effectiveAddr < 0 || effectiveAddr >= this.memory.length) { this.trap = "out of bounds memory access"; break; }
        this.memory[effectiveAddr] = val;
        break;
      }
      default: this.trap = "unknown opcode 0x" + instr.op.toString(16); break;
    }
  }
}

function op(opcode, extra) { return Object.assign({ op: opcode }, extra || {}); }
function i32Const(v) { return op(OP.I32_CONST, { value: v }); }
function localGet(i) { return op(OP.LOCAL_GET, { index: i }); }
function localSet(i) { return op(OP.LOCAL_SET, { index: i }); }
function localTee(i) { return op(OP.LOCAL_TEE, { index: i }); }
function globalGet(i) { return op(OP.GLOBAL_GET, { index: i }); }
function globalSet(i) { return op(OP.GLOBAL_SET, { index: i }); }
function call(idx) { return op(OP.CALL, { funcIdx: idx }); }
function br(depth) { return op(OP.BR, { depth }); }
function brIf(depth) { return op(OP.BR_IF, { depth }); }
function block(endIp) { return op(OP.BLOCK, { endIp }); }
function loop() { return op(OP.LOOP); }
function if_(endIp, elseIp) { return op(OP.IF, { endIp, elseIp }); }
function else_(endIp) { return op(OP.ELSE, { endIp }); }
function memLoad(offset) { return op(OP.MEMORY_LOAD, { offset: offset || 0 }); }
function memStore(offset) { return op(OP.MEMORY_STORE, { offset: offset || 0 }); }

console.log("=== BASIC ARITHMETIC ===");
check("i32.const returns value", (() => {
  const m = new WasmModule();
  m.addFunction(0, 0, [i32Const(42), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, []);
})(), 42);
check("i32.add two params", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_ADD), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [17, 25]);
})(), 42);
check("i32.sub", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_SUB), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [50, 8]);
})(), 42);
check("i32.mul", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_MUL), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [6, 7]);
})(), 42);
check("i32.div_s", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_DIV_S), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [100, 4]);
})(), 25);
check("i32.rem_s", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_REM_S), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [17, 5]);
})(), 2);
check("div by zero traps", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_DIV_S)]);
  return raises(() => new WasmRuntime(m).invoke(0, [10, 0]));
})(), true);
check("rem by zero traps", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_REM_S)]);
  return raises(() => new WasmRuntime(m).invoke(0, [10, 0]));
})(), true);
check("i32 overflow traps", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_DIV_S)]);
  return raises(() => new WasmRuntime(m).invoke(0, [-2147483648, -1]));
})(), true);

console.log("\n=== BITWISE OPERATIONS ===");
check("i32.and", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_AND), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [0xFF00, 0x0FF0]);
})(), 0x0F00);
check("i32.or", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_OR), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [0xF0, 0x0F]);
})(), 0xFF);
check("i32.xor", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_XOR), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [0xFF, 0x0F]);
})(), 0xF0);
check("i32.shl", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_SHL), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [1, 4]);
})(), 16);
check("i32.shr_s negative", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_SHR_S), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [-8, 2]);
})(), -2);
check("i32.rotl", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_ROTL), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [1, 4]) >>> 0;
})(), 16);
check("i32.rotr", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_ROTR), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [16, 4]) >>> 0;
})(), 1);
check("i32.clz zero", (() => {
  const m = new WasmModule();
  m.addFunction(1, 0, [localGet(0), op(OP.I32_CLZ), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [0]);
})(), 32);
check("i32.clz one", (() => {
  const m = new WasmModule();
  m.addFunction(1, 0, [localGet(0), op(OP.I32_CLZ), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [1]);
})(), 31);
check("i32.ctz", (() => {
  const m = new WasmModule();
  m.addFunction(1, 0, [localGet(0), op(OP.I32_CTZ), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [8]);
})(), 3);
check("i32.popcnt", (() => {
  const m = new WasmModule();
  m.addFunction(1, 0, [localGet(0), op(OP.I32_POPCNT), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [0xFF]);
})(), 8);

console.log("\n=== COMPARISONS ===");
check("i32.eqz true", (() => {
  const m = new WasmModule();
  m.addFunction(1, 0, [localGet(0), op(OP.I32_EQZ), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [0]);
})(), 1);
check("i32.eqz false", (() => {
  const m = new WasmModule();
  m.addFunction(1, 0, [localGet(0), op(OP.I32_EQZ), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [5]);
})(), 0);
check("i32.eq true", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_EQ), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [7, 7]);
})(), 1);
check("i32.ne", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_NE), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [3, 4]);
})(), 1);
check("i32.lt_s", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_LT_S), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [-5, 3]);
})(), 1);
check("i32.ge_s", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [localGet(0), localGet(1), op(OP.I32_GE_S), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, [5, 5]);
})(), 1);

console.log("\n=== LOCALS AND GLOBALS ===");
check("local.set and get", (() => {
  const m = new WasmModule();
  m.addFunction(0, 1, [i32Const(99), localSet(0), localGet(0), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, []);
})(), 99);
check("local.tee preserves stack", (() => {
  const m = new WasmModule();
  m.addFunction(0, 1, [i32Const(77), localTee(0), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, []);
})(), 77);
check("global.get", (() => {
  const m = new WasmModule();
  m.addGlobal(42, false);
  m.addFunction(0, 0, [globalGet(0), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, []);
})(), 42);
check("global.set mutable", (() => {
  const m = new WasmModule();
  m.addGlobal(0, true);
  m.addFunction(0, 0, [i32Const(100), globalSet(0), globalGet(0), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, []);
})(), 100);
check("global.set immutable traps", (() => {
  const m = new WasmModule();
  m.addGlobal(0, false);
  m.addFunction(0, 0, [i32Const(1), globalSet(0)]);
  return raises(() => new WasmRuntime(m).invoke(0, []));
})(), true);

console.log("\n=== CONTROL FLOW ===");
check("select true branch", (() => {
  const m = new WasmModule();
  m.addFunction(0, 0, [i32Const(10), i32Const(20), i32Const(1), op(OP.SELECT), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, []);
})(), 10);
check("select false branch", (() => {
  const m = new WasmModule();
  m.addFunction(0, 0, [i32Const(10), i32Const(20), i32Const(0), op(OP.SELECT), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, []);
})(), 20);
check("br exits block", (() => {
  const m = new WasmModule();
  const body = [block(5), i32Const(42), br(0), i32Const(99), op(OP.END), op(OP.RETURN)];
  m.addFunction(0, 0, body);
  return new WasmRuntime(m).invoke(0, []);
})(), 42);
check("br_if taken", (() => {
  const m = new WasmModule();
  const body = [block(6), i32Const(1), brIf(0), i32Const(99), op(OP.RETURN), i32Const(42), op(OP.END), op(OP.RETURN)];
  m.addFunction(0, 0, body);
  return new WasmRuntime(m).invoke(0, []);
})(), 42);
check("br_if not taken", (() => {
  const m = new WasmModule();
  const body = [block(6), i32Const(0), brIf(0), i32Const(42), op(OP.RETURN), i32Const(99), op(OP.END), op(OP.RETURN)];
  m.addFunction(0, 0, body);
  return new WasmRuntime(m).invoke(0, []);
})(), 42);
check("if true branch", (() => {
  const m = new WasmModule();
  const body = [i32Const(1), if_(6), i32Const(42), op(OP.RETURN), op(OP.END), i32Const(99), op(OP.RETURN)];
  m.addFunction(0, 0, body);
  return new WasmRuntime(m).invoke(0, []);
})(), 42);
check("if false skips to end", (() => {
  const m = new WasmModule();
  const body = [i32Const(0), if_(5), i32Const(42), op(OP.END), i32Const(99), op(OP.RETURN)];
  m.addFunction(0, 0, body);
  return new WasmRuntime(m).invoke(0, []);
})(), 99);
check("loop with br counts down", (() => {
  const m = new WasmModule();
  const body = [
    i32Const(5), localSet(0),
    loop(),
    localGet(0), i32Const(1), op(OP.I32_SUB), localTee(0),
    i32Const(0), op(OP.I32_GT_S), brIf(0),
    op(OP.END),
    localGet(0), op(OP.RETURN)
  ];
  m.addFunction(0, 1, body);
  return new WasmRuntime(m).invoke(0, []);
})(), 0);

console.log("\n=== FUNCTION CALLS ===");
check("call other function", (() => {
  const m = new WasmModule();
  m.addFunction(1, 0, [localGet(0), i32Const(10), op(OP.I32_MUL), op(OP.RETURN)]);
  m.addFunction(0, 0, [i32Const(5), call(0), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(1, []);
})(), 50);
check("nested calls", (() => {
  const m = new WasmModule();
  m.addFunction(1, 0, [localGet(0), i32Const(2), op(OP.I32_ADD), op(OP.RETURN)]);
  m.addFunction(1, 0, [localGet(0), call(0), i32Const(3), op(OP.I32_MUL), op(OP.RETURN)]);
  m.addFunction(0, 0, [i32Const(1), call(1), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(2, []);
})(), 9);
check("recursive factorial", (() => {
  const m = new WasmModule();
  const body = [
    localGet(0), op(OP.I32_EQZ), if_(12),
    i32Const(1), op(OP.RETURN), op(OP.END),
    localGet(0), localGet(0), i32Const(1), op(OP.I32_SUB), call(0), op(OP.I32_MUL), op(OP.RETURN)
  ];
  m.addFunction(1, 0, body);
  return new WasmRuntime(m).invoke(0, [6]);
})(), 720);
check("mutual recursion even/odd", (() => {
  const m = new WasmModule();
  const isEven = [
    localGet(0), op(OP.I32_EQZ), if_(8), i32Const(1), op(OP.RETURN), op(OP.END),
    localGet(0), i32Const(1), op(OP.I32_SUB), call(1), op(OP.RETURN)
  ];
  const isOdd = [
    localGet(0), op(OP.I32_EQZ), if_(8), i32Const(0), op(OP.RETURN), op(OP.END),
    localGet(0), i32Const(1), op(OP.I32_SUB), call(0), op(OP.RETURN)
  ];
  m.addFunction(1, 0, isEven);
  m.addFunction(1, 0, isOdd);
  return [new WasmRuntime(m).invoke(0, [4]), new WasmRuntime(m).invoke(0, [5])];
})(), [1, 0]);

console.log("\n=== MEMORY ===");
check("memory store and load", (() => {
  const m = new WasmModule();
  const body = [i32Const(0), i32Const(42), memStore(0), i32Const(0), memLoad(0), op(OP.RETURN)];
  m.addFunction(0, 0, body);
  return new WasmRuntime(m).invoke(0, []);
})(), 42);
check("memory offset", (() => {
  const m = new WasmModule();
  const body = [i32Const(0), i32Const(99), memStore(4), i32Const(0), memLoad(4), op(OP.RETURN)];
  m.addFunction(0, 0, body);
  return new WasmRuntime(m).invoke(0, []);
})(), 99);
check("memory oob traps", (() => {
  const m = new WasmModule();
  const body = [i32Const(999999), i32Const(1), memStore(0)];
  m.addFunction(0, 0, body);
  return raises(() => new WasmRuntime(m).invoke(0, []));
})(), true);

console.log("\n=== INTEGRATION PROGRAMS ===");
check("fibonacci iterative", (() => {
  const m = new WasmModule();
  const body = [
    i32Const(0), localSet(1),
    i32Const(1), localSet(2),
    i32Const(0), localSet(3),
    loop(),
    localGet(3), localGet(0), op(OP.I32_LT_S), if_(28),
    localGet(1), localGet(2), op(OP.I32_ADD), localSet(4),
    localGet(2), localSet(1),
    localGet(4), localSet(2),
    localGet(3), i32Const(1), op(OP.I32_ADD), localSet(3),
    br(1),
    op(OP.END),
    op(OP.END),
    localGet(1), op(OP.RETURN)
  ];
  m.addFunction(1, 3, body);
  return new WasmRuntime(m).invoke(0, [10]);
})(), 55);
check("gcd euclidean algorithm", (() => {
  const m = new WasmModule();
  const body = [
    loop(),
    localGet(1), op(OP.I32_EQZ), if_(14),
    localGet(0), op(OP.RETURN), op(OP.END),
    localGet(1), localGet(0), localGet(1), op(OP.I32_REM_S), localSet(1), localSet(0),
    br(0),
    op(OP.END),
    localGet(0), op(OP.RETURN)
  ];
  m.addFunction(2, 0, body);
  return new WasmRuntime(m).invoke(0, [48, 18]);
})(), 6);
check("sum array via memory", (() => {
  const m = new WasmModule();
  const setupBody = [
    i32Const(0), i32Const(10), memStore(0),
    i32Const(1), i32Const(20), memStore(0),
    i32Const(2), i32Const(30), memStore(0),
    i32Const(3), i32Const(40), memStore(0),
    op(OP.RETURN)
  ];
  const sumBody = [
    i32Const(0), localSet(1),
    i32Const(0), localSet(2),
    loop(),
    localGet(2), localGet(0), op(OP.I32_LT_S), if_(18),
    localGet(1), localGet(2), memLoad(0), op(OP.I32_ADD), localSet(1),
    localGet(2), i32Const(1), op(OP.I32_ADD), localSet(2),
    br(1),
    op(OP.END),
    op(OP.END),
    localGet(1), op(OP.RETURN)
  ];
  m.addFunction(0, 0, setupBody);
  m.addFunction(1, 1, sumBody);
  const rt = new WasmRuntime(m);
  rt.invoke(0, []);
  return rt.invoke(1, [4]);
})(), 100);
check("isqrt integer square root", (() => {
  const m = new WasmModule();
  const body = [
    i32Const(0), localSet(1),
    i32Const(1), localSet(2),
    loop(),
    localGet(2), localGet(2), op(OP.I32_MUL), localGet(0), op(OP.I32_LE_S), if_(14),
    localGet(2), localSet(1),
    localGet(2), i32Const(1), op(OP.I32_ADD), localSet(2),
    br(1),
    op(OP.END),
    op(OP.END),
    localGet(1), op(OP.RETURN)
  ];
  m.addFunction(1, 2, body);
  return new WasmRuntime(m).invoke(0, [49]);
})(), 7);

console.log("\n=== EDGE CASES ===");
check("drop discards top", (() => {
  const m = new WasmModule();
  m.addFunction(0, 0, [i32Const(1), i32Const(2), op(OP.DROP), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, []);
})(), 1);
check("nop does nothing", (() => {
  const m = new WasmModule();
  m.addFunction(0, 0, [op(OP.NOP), i32Const(5), op(OP.NOP), op(OP.RETURN)]);
  return new WasmRuntime(m).invoke(0, []);
})(), 5);
check("unreachable traps", (() => {
  const m = new WasmModule();
  m.addFunction(0, 0, [op(OP.UNREACHABLE)]);
  return raises(() => new WasmRuntime(m).invoke(0, []));
})(), true);
check("param count mismatch throws", (() => {
  const m = new WasmModule();
  m.addFunction(2, 0, [op(OP.RETURN)]);
  return raises(() => new WasmRuntime(m).invoke(0, [1]));
})(), true);
check("invalid func index throws", (() => {
  const m = new WasmModule();
  return raises(() => new WasmRuntime(m).invoke(99, []));
})(), true);
check("complex expression: (a+b)*(c-d)", (() => {
  const m = new WasmModule();
  m.addFunction(4, 0, [
    localGet(0), localGet(1), op(OP.I32_ADD),
    localGet(2), localGet(3), op(OP.I32_SUB),
    op(OP.I32_MUL), op(OP.RETURN)
  ]);
  return new WasmRuntime(m).invoke(0, [3, 4, 10, 3]);
})(), 49);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
