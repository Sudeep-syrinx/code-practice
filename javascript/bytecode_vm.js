const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(38) + shown.padEnd(46) + (ok ? 'ok' : 'MISMATCH expected ' + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ''; }

const OP = {
  NOP: 0,
  PUSH: 1,
  POP: 2,
  ADD: 3,
  SUB: 4,
  MUL: 5,
  DIV: 6,
  MOD: 7,
  NEG: 8,
  EQ: 9,
  NEQ: 10,
  LT: 11,
  GT: 12,
  LTE: 13,
  GTE: 14,
  AND: 15,
  OR: 16,
  NOT: 17,
  LOAD: 18,
  STORE: 19,
  JMP: 20,
  JZ: 21,
  JNZ: 22,
  CALL: 23,
  RET: 24,
  PRINT: 25,
  HALT: 26,
  DUP: 27,
  SWAP: 28,
  OVER: 29,
  ROT: 30
};

class Chunk {
  constructor() {
    this.code = [];
    this.constants = [];
    this.lines = [];
  }
  emit(byte, line) {
    this.code.push(byte);
    this.lines.push(line || 0);
  }
  emitOp(op, line) {
    this.emit(op, line);
  }
  addConstant(value) {
    const idx = this.constants.indexOf(value);
    if (idx !== -1) return idx;
    this.constants.push(value);
    return this.constants.length - 1;
  }
  emitPush(value, line) {
    const idx = this.addConstant(value);
    this.emit(OP.PUSH, line);
    this.emit(idx, line);
  }
  emitLoad(slot, line) {
    this.emit(OP.LOAD, line);
    this.emit(slot, line);
  }
  emitStore(slot, line) {
    this.emit(OP.STORE, line);
    this.emit(slot, line);
  }
  emitJmp(offset, line) {
    this.emit(OP.JMP, line);
    this.emit(offset, line);
  }
  emitJz(offset, line) {
    this.emit(OP.JZ, line);
    this.emit(offset, line);
  }
  emitJnz(offset, line) {
    this.emit(OP.JNZ, line);
    this.emit(offset, line);
  }
  size() { return this.code.length; }
  getByte(ip) { return this.code[ip]; }
  getConstant(idx) { return this.constants[idx]; }
}

class VM {
  constructor(chunk) {
    this.chunk = chunk;
    this.ip = 0;
    this.stack = [];
    this.frames = [];
    this.globals = new Map();
    this.output = [];
    this.maxSteps = 100000;
    this.steps = 0;
  }
  push(val) { this.stack.push(val); }
  pop() {
    if (this.stack.length === 0) throw new Error('stack underflow');
    return this.stack.pop();
  }
  peek() {
    if (this.stack.length === 0) throw new Error('stack underflow');
    return this.stack[this.stack.length - 1];
  }
  readByte() {
    if (this.ip >= this.chunk.size()) throw new Error('ip out of bounds');
    return this.chunk.getByte(this.ip++);
  }
  run() {
    while (true) {
      this.steps++;
      if (this.steps > this.maxSteps) throw new Error('max steps exceeded');
      const op = this.readByte();
      switch (op) {
        case OP.NOP: break;
        case OP.PUSH: {
          const idx = this.readByte();
          this.push(this.chunk.getConstant(idx));
          break;
        }
        case OP.POP: this.pop(); break;
        case OP.ADD: { const b = this.pop(); const a = this.pop(); this.push(a + b); break; }
        case OP.SUB: { const b = this.pop(); const a = this.pop(); this.push(a - b); break; }
        case OP.MUL: { const b = this.pop(); const a = this.pop(); this.push(a * b); break; }
        case OP.DIV: {
          const b = this.pop();
          const a = this.pop();
          if (b === 0) throw new Error('division by zero');
          this.push(a / b);
          break;
        }
        case OP.MOD: {
          const b = this.pop();
          const a = this.pop();
          if (b === 0) throw new Error('modulo by zero');
          this.push(a % b);
          break;
        }
        case OP.NEG: this.push(-this.pop()); break;
        case OP.EQ: { const b = this.pop(); const a = this.pop(); this.push(a === b); break; }
        case OP.NEQ: { const b = this.pop(); const a = this.pop(); this.push(a !== b); break; }
        case OP.LT: { const b = this.pop(); const a = this.pop(); this.push(a < b); break; }
        case OP.GT: { const b = this.pop(); const a = this.pop(); this.push(a > b); break; }
        case OP.LTE: { const b = this.pop(); const a = this.pop(); this.push(a <= b); break; }
        case OP.GTE: { const b = this.pop(); const a = this.pop(); this.push(a >= b); break; }
        case OP.AND: { const b = this.pop(); const a = this.pop(); this.push(a && b); break; }
        case OP.OR: { const b = this.pop(); const a = this.pop(); this.push(a || b); break; }
        case OP.NOT: this.push(!this.pop()); break;
        case OP.LOAD: {
          const slot = this.readByte();
          if (!this.globals.has(slot)) throw new Error('undefined variable slot ' + slot);
          this.push(this.globals.get(slot));
          break;
        }
        case OP.STORE: {
          const slot = this.readByte();
          const val = this.pop();
          this.globals.set(slot, val);
          break;
        }
        case OP.JMP: {
          const offset = this.readByte();
          this.ip += offset;
          break;
        }
        case OP.JZ: {
          const offset = this.readByte();
          const val = this.pop();
          if (!val) this.ip += offset;
          break;
        }
        case OP.JNZ: {
          const offset = this.readByte();
          const val = this.pop();
          if (val) this.ip += offset;
          break;
        }
        case OP.CALL: {
          const addr = this.readByte();
          this.frames.push(this.ip);
          this.ip = addr;
          break;
        }
        case OP.RET: {
          if (this.frames.length === 0) throw new Error('return without call');
          this.ip = this.frames.pop();
          break;
        }
        case OP.PRINT: {
          const val = this.pop();
          this.output.push(val);
          break;
        }
        case OP.HALT: return this.output;
        case OP.DUP: { const v = this.peek(); this.push(v); break; }
        case OP.SWAP: {
          const b = this.pop();
          const a = this.pop();
          this.push(b);
          this.push(a);
          break;
        }
        case OP.OVER: {
          if (this.stack.length < 2) throw new Error('over requires 2 values');
          this.push(this.stack[this.stack.length - 2]);
          break;
        }
        case OP.ROT: {
          if (this.stack.length < 3) throw new Error('rot requires 3 values');
          const c = this.pop();
          const b = this.pop();
          const a = this.pop();
          this.push(b);
          this.push(c);
          this.push(a);
          break;
        }
        default: throw new Error('unknown opcode ' + op);
      }
    }
  }
}

class Compiler {
  constructor() {
    this.chunk = new Chunk();
    this.locals = new Map();
    this.nextSlot = 0;
    this.loopStack = [];
  }
  compileNumber(val, line) {
    this.chunk.emitPush(val, line);
  }
  compileBinaryOp(op, line) {
    this.chunk.emitOp(op, line);
  }
  compileUnaryOp(op, line) {
    this.chunk.emitOp(op, line);
  }
  declareLocal(name) {
    const slot = this.nextSlot++;
    this.locals.set(name, slot);
    return slot;
  }
  resolveLocal(name) {
    if (!this.locals.has(name)) throw new Error('undefined variable ' + name);
    return this.locals.get(name);
  }
  compileAssign(name, line) {
    const slot = this.resolveLocal(name);
    this.chunk.emitStore(slot, line);
  }
  compileRead(name, line) {
    const slot = this.resolveLocal(name);
    this.chunk.emitLoad(slot, line);
  }
  beginLoop() {
    this.loopStack.push({ breaks: [], continues: [] });
  }
  endLoop(loopStart) {
    const loop = this.loopStack.pop();
    for (const patch of loop.continues) {
      this.chunk.code[patch] = loopStart - patch - 1;
    }
    const endIp = this.chunk.size();
    for (const patch of loop.breaks) {
      this.chunk.code[patch] = endIp - patch - 1;
    }
  }
  compileBreak(line) {
    if (this.loopStack.length === 0) throw new Error('break outside loop');
    this.chunk.emitOp(OP.JMP, line);
    const patchLoc = this.chunk.size();
    this.chunk.emit(0, line);
    this.loopStack[this.loopStack.length - 1].breaks.push(patchLoc);
  }
  compileContinue(loopStart, line) {
    if (this.loopStack.length === 0) throw new Error('continue outside loop');
    this.chunk.emitOp(OP.JMP, line);
    const patchLoc = this.chunk.size();
    this.chunk.emit(0, line);
    this.loopStack[this.loopStack.length - 1].continues.push(patchLoc);
  }
  getChunk() { return this.chunk; }
}

function buildFactorialProgram() {
  const c = new Compiler();
  const nSlot = c.declareLocal('n');
  const resultSlot = c.declareLocal('result');
  const iSlot = c.declareLocal('i');
  c.compileNumber(5, 1);
  c.compileAssign('n', 1);
  c.compileNumber(1, 2);
  c.compileAssign('result', 2);
  c.compileNumber(1, 3);
  c.compileAssign('i', 3);
  const loopStart = c.getChunk().size();
  c.compileRead('i', 4);
  c.compileRead('n', 4);
  c.compileBinaryOp(OP.LTE, 4);
  const exitPatch = c.getChunk().size();
  c.chunk.emitOp(OP.JZ, 4);
  c.chunk.emit(0, 4);
  c.compileRead('result', 5);
  c.compileRead('i', 5);
  c.compileBinaryOp(OP.MUL, 5);
  c.compileAssign('result', 5);
  c.compileRead('i', 6);
  c.compileNumber(1, 6);
  c.compileBinaryOp(OP.ADD, 6);
  c.compileAssign('i', 6);
  const backJump = loopStart - c.getChunk().size() - 1;
  c.chunk.emitOp(OP.JMP, 6);
  c.chunk.emit(backJump, 6);
  c.chunk.code[exitPatch + 1] = c.getChunk().size() - exitPatch - 2;
  c.compileRead('result', 7);
  c.chunk.emitOp(OP.PRINT, 7);
  c.chunk.emitOp(OP.HALT, 8);
  return c.getChunk();
}

function buildFibonacciProgram() {
  const c = new Compiler();
  const aSlot = c.declareLocal('a');
  const bSlot = c.declareLocal('b');
  const tempSlot = c.declareLocal('temp');
  const countSlot = c.declareLocal('count');
  const iSlot = c.declareLocal('i');
  c.compileNumber(0, 1);
  c.compileAssign('a', 1);
  c.compileNumber(1, 2);
  c.compileAssign('b', 2);
  c.compileNumber(10, 3);
  c.compileAssign('count', 3);
  c.compileNumber(0, 4);
  c.compileAssign('i', 4);
  const loopStart = c.getChunk().size();
  c.compileRead('i', 5);
  c.compileRead('count', 5);
  c.compileBinaryOp(OP.LT, 5);
  const exitPatch = c.getChunk().size();
  c.chunk.emitOp(OP.JZ, 5);
  c.chunk.emit(0, 5);
  c.compileRead('a', 6);
  c.chunk.emitOp(OP.PRINT, 6);
  c.compileRead('a', 7);
  c.compileRead('b', 7);
  c.compileBinaryOp(OP.ADD, 7);
  c.compileAssign('temp', 7);
  c.compileRead('b', 8);
  c.compileAssign('a', 8);
  c.compileRead('temp', 9);
  c.compileAssign('b', 9);
  c.compileRead('i', 10);
  c.compileNumber(1, 10);
  c.compileBinaryOp(OP.ADD, 10);
  c.compileAssign('i', 10);
  const backJump = loopStart - c.getChunk().size() - 1;
  c.chunk.emitOp(OP.JMP, 10);
  c.chunk.emit(backJump, 10);
  c.chunk.code[exitPatch + 1] = c.getChunk().size() - exitPatch - 2;
  c.chunk.emitOp(OP.HALT, 11);
  return c.getChunk();
}

function buildCallRetProgram() {
  const chunk = new Chunk();
  chunk.emitPush(10, 1);
  chunk.emitPush(20, 1);
  const callAddr = 8;
  chunk.emit(OP.CALL, 2);
  chunk.emit(callAddr, 2);
  chunk.emitOp(OP.PRINT, 3);
  chunk.emitOp(OP.HALT, 4);
  chunk.emitOp(OP.ADD, 10);
  chunk.emitOp(OP.RET, 11);
  return chunk;
}

function buildNestedCallProgram() {
  const chunk = new Chunk();
  chunk.emitPush(5, 1);
  const outerAddr = 10;
  chunk.emit(OP.CALL, 1);
  chunk.emit(outerAddr, 1);
  chunk.emitOp(OP.PRINT, 2);
  chunk.emitOp(OP.HALT, 3);
  chunk.emitPush(3, 10);
  const innerAddr = 18;
  chunk.emit(OP.CALL, 11);
  chunk.emit(innerAddr, 11);
  chunk.emitOp(OP.MUL, 12);
  chunk.emitOp(OP.RET, 13);
  chunk.emitPush(2, 18);
  chunk.emitOp(OP.ADD, 19);
  chunk.emitOp(OP.RET, 20);
  return chunk;
}

console.log('=== CHUNK TESTS ===');
check('chunk emit stores byte', (() => {
  const ch = new Chunk();
  ch.emit(42, 1);
  return ch.getByte(0);
})(), 42);
check('chunk size tracks emits', (() => {
  const ch = new Chunk();
  ch.emit(1, 1);
  ch.emit(2, 1);
  ch.emit(3, 1);
  return ch.size();
})(), 3);
check('chunk add constant returns index', (() => {
  const ch = new Chunk();
  return ch.addConstant(99);
})(), 0);
check('chunk dedup constants', (() => {
  const ch = new Chunk();
  ch.addConstant(42);
  return ch.addConstant(42);
})(), 0);
check('chunk multiple constants', (() => {
  const ch = new Chunk();
  ch.addConstant(10);
  ch.addConstant(20);
  ch.addConstant(30);
  return ch.constants.length;
})(), 3);
check('chunk get constant', (() => {
  const ch = new Chunk();
  ch.addConstant(77);
  return ch.getConstant(0);
})(), 77);
check('chunk emit push encodes', (() => {
  const ch = new Chunk();
  ch.emitPush(42, 1);
  return ch.getByte(0) === OP.PUSH && ch.getConstant(ch.getByte(1)) === 42;
})(), true);
check('chunk emit load encodes', (() => {
  const ch = new Chunk();
  ch.emitLoad(3, 1);
  return ch.getByte(0) === OP.LOAD && ch.getByte(1) === 3;
})(), true);
check('chunk emit store encodes', (() => {
  const ch = new Chunk();
  ch.emitStore(5, 1);
  return ch.getByte(0) === OP.STORE && ch.getByte(1) === 5;
})(), true);

console.log('\n=== VM ARITHMETIC TESTS ===');
check('vm push and halt', (() => {
  const ch = new Chunk();
  ch.emitPush(42, 1);
  ch.emitOp(OP.HALT, 2);
  return new VM(ch).run();
})(), []);
check('vm add', (() => {
  const ch = new Chunk();
  ch.emitPush(3, 1);
  ch.emitPush(4, 1);
  ch.emitOp(OP.ADD, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [7]);
check('vm sub', (() => {
  const ch = new Chunk();
  ch.emitPush(10, 1);
  ch.emitPush(3, 1);
  ch.emitOp(OP.SUB, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [7]);
check('vm mul', (() => {
  const ch = new Chunk();
  ch.emitPush(6, 1);
  ch.emitPush(7, 1);
  ch.emitOp(OP.MUL, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [42]);
check('vm div', (() => {
  const ch = new Chunk();
  ch.emitPush(20, 1);
  ch.emitPush(4, 1);
  ch.emitOp(OP.DIV, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [5]);
check('vm mod', (() => {
  const ch = new Chunk();
  ch.emitPush(17, 1);
  ch.emitPush(5, 1);
  ch.emitOp(OP.MOD, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [2]);
check('vm neg', (() => {
  const ch = new Chunk();
  ch.emitPush(5, 1);
  ch.emitOp(OP.NEG, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [-5]);
check('vm div by zero throws', (() => {
  const ch = new Chunk();
  ch.emitPush(1, 1);
  ch.emitPush(0, 1);
  ch.emitOp(OP.DIV, 1);
  ch.emitOp(OP.HALT, 1);
  return raises(() => new VM(ch).run());
})(), true);
check('vm mod by zero throws', (() => {
  const ch = new Chunk();
  ch.emitPush(1, 1);
  ch.emitPush(0, 1);
  ch.emitOp(OP.MOD, 1);
  ch.emitOp(OP.HALT, 1);
  return raises(() => new VM(ch).run());
})(), true);

console.log('\n=== VM COMPARISON TESTS ===');
check('vm eq true', (() => {
  const ch = new Chunk();
  ch.emitPush(5, 1);
  ch.emitPush(5, 1);
  ch.emitOp(OP.EQ, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [true]);
check('vm eq false', (() => {
  const ch = new Chunk();
  ch.emitPush(5, 1);
  ch.emitPush(6, 1);
  ch.emitOp(OP.EQ, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [false]);
check('vm neq', (() => {
  const ch = new Chunk();
  ch.emitPush(3, 1);
  ch.emitPush(4, 1);
  ch.emitOp(OP.NEQ, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [true]);
check('vm lt true', (() => {
  const ch = new Chunk();
  ch.emitPush(3, 1);
  ch.emitPush(5, 1);
  ch.emitOp(OP.LT, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [true]);
check('vm lt false', (() => {
  const ch = new Chunk();
  ch.emitPush(5, 1);
  ch.emitPush(3, 1);
  ch.emitOp(OP.LT, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [false]);
check('vm gt', (() => {
  const ch = new Chunk();
  ch.emitPush(10, 1);
  ch.emitPush(3, 1);
  ch.emitOp(OP.GT, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [true]);
check('vm lte equal', (() => {
  const ch = new Chunk();
  ch.emitPush(5, 1);
  ch.emitPush(5, 1);
  ch.emitOp(OP.LTE, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [true]);
check('vm gte less', (() => {
  const ch = new Chunk();
  ch.emitPush(3, 1);
  ch.emitPush(5, 1);
  ch.emitOp(OP.GTE, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [false]);

console.log('\n=== VM LOGIC TESTS ===');
check('vm and true', (() => {
  const ch = new Chunk();
  ch.emitPush(true, 1);
  ch.emitPush(true, 1);
  ch.emitOp(OP.AND, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [true]);
check('vm and false', (() => {
  const ch = new Chunk();
  ch.emitPush(true, 1);
  ch.emitPush(false, 1);
  ch.emitOp(OP.AND, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [false]);
check('vm or', (() => {
  const ch = new Chunk();
  ch.emitPush(false, 1);
  ch.emitPush(true, 1);
  ch.emitOp(OP.OR, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [true]);
check('vm not true', (() => {
  const ch = new Chunk();
  ch.emitPush(true, 1);
  ch.emitOp(OP.NOT, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [false]);
check('vm not false', (() => {
  const ch = new Chunk();
  ch.emitPush(false, 1);
  ch.emitOp(OP.NOT, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [true]);

console.log('\n=== VM STACK MANIPULATION TESTS ===');
check('vm dup', (() => {
  const ch = new Chunk();
  ch.emitPush(7, 1);
  ch.emitOp(OP.DUP, 1);
  ch.emitOp(OP.ADD, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [14]);
check('vm swap', (() => {
  const ch = new Chunk();
  ch.emitPush(1, 1);
  ch.emitPush(2, 1);
  ch.emitOp(OP.SWAP, 1);
  ch.emitOp(OP.SUB, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [1]);
check('vm over', (() => {
  const ch = new Chunk();
  ch.emitPush(3, 1);
  ch.emitPush(5, 1);
  ch.emitOp(OP.OVER, 1);
  ch.emitOp(OP.ADD, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [8]);
check('vm rot', (() => {
  const ch = new Chunk();
  ch.emitPush(1, 1);
  ch.emitPush(2, 1);
  ch.emitPush(3, 1);
  ch.emitOp(OP.ROT, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [1, 3, 2]);
check('vm pop', (() => {
  const ch = new Chunk();
  ch.emitPush(1, 1);
  ch.emitPush(2, 1);
  ch.emitOp(OP.POP, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [1]);
check('vm stack underflow throws', (() => {
  const ch = new Chunk();
  ch.emitOp(OP.POP, 1);
  ch.emitOp(OP.HALT, 1);
  return raises(() => new VM(ch).run());
})(), true);
check('vm over underflow throws', (() => {
  const ch = new Chunk();
  ch.emitPush(1, 1);
  ch.emitOp(OP.OVER, 1);
  ch.emitOp(OP.HALT, 1);
  return raises(() => new VM(ch).run());
})(), true);
check('vm rot underflow throws', (() => {
  const ch = new Chunk();
  ch.emitPush(1, 1);
  ch.emitPush(2, 1);
  ch.emitOp(OP.ROT, 1);
  ch.emitOp(OP.HALT, 1);
  return raises(() => new VM(ch).run());
})(), true);

console.log('\n=== VM VARIABLE TESTS ===');
check('vm store and load', (() => {
  const ch = new Chunk();
  ch.emitPush(42, 1);
  ch.emitStore(0, 1);
  ch.emitLoad(0, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [42]);
check('vm multiple vars', (() => {
  const ch = new Chunk();
  ch.emitPush(10, 1);
  ch.emitStore(0, 1);
  ch.emitPush(20, 1);
  ch.emitStore(1, 1);
  ch.emitLoad(0, 1);
  ch.emitLoad(1, 1);
  ch.emitOp(OP.ADD, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [30]);
check('vm overwrite var', (() => {
  const ch = new Chunk();
  ch.emitPush(1, 1);
  ch.emitStore(0, 1);
  ch.emitPush(2, 1);
  ch.emitStore(0, 1);
  ch.emitLoad(0, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [2]);
check('vm load undefined throws', (() => {
  const ch = new Chunk();
  ch.emitLoad(99, 1);
  ch.emitOp(OP.HALT, 1);
  return raises(() => new VM(ch).run());
})(), true);

console.log('\n=== VM CONTROL FLOW TESTS ===');
check('vm jmp forward', (() => {
  const ch = new Chunk();
  ch.emitPush(1, 1);
  ch.emitOp(OP.JMP, 1);
  ch.emit(3, 1);
  ch.emitPush(99, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [99]);
check('vm jz taken', (() => {
  const ch = new Chunk();
  ch.emitPush(false, 1);
  ch.emitOp(OP.JZ, 1);
  ch.emit(3, 1);
  ch.emitPush(1, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [1]);
check('vm jz not taken', (() => {
  const ch = new Chunk();
  ch.emitPush(true, 1);
  ch.emitOp(OP.JZ, 1);
  ch.emit(3, 1);
  ch.emitPush(2, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [2]);
check('vm jnz taken', (() => {
  const ch = new Chunk();
  ch.emitPush(true, 1);
  ch.emitOp(OP.JNZ, 1);
  ch.emit(3, 1);
  ch.emitPush(3, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [3]);
check('vm jnz not taken', (() => {
  const ch = new Chunk();
  ch.emitPush(false, 1);
  ch.emitOp(OP.JNZ, 1);
  ch.emit(3, 1);
  ch.emitPush(4, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [4]);

console.log('\n=== VM CALL/RET TESTS ===');
check('vm call and ret', (() => {
  const ch = buildCallRetProgram();
  return new VM(ch).run();
})(), [30]);
check('vm nested calls', (() => {
  const ch = buildNestedCallProgram();
  return new VM(ch).run();
})(), [10]);
check('vm ret without call throws', (() => {
  const ch = new Chunk();
  ch.emitOp(OP.RET, 1);
  ch.emitOp(OP.HALT, 1);
  return raises(() => new VM(ch).run());
})(), true);

console.log('\n=== INTEGRATION PROGRAM TESTS ===');
check('factorial of 5', (() => {
  const ch = buildFactorialProgram();
  return new VM(ch).run();
})(), [120]);
check('fibonacci first 10', (() => {
  const ch = buildFibonacciProgram();
  return new VM(ch).run();
})(), [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);

console.log('\n=== COMPILER TESTS ===');
check('compiler declare local', (() => {
  const c = new Compiler();
  return c.declareLocal('x');
})(), 0);
check('compiler declare multiple locals', (() => {
  const c = new Compiler();
  c.declareLocal('a');
  c.declareLocal('b');
  return c.declareLocal('c');
})(), 2);
check('compiler resolve local', (() => {
  const c = new Compiler();
  c.declareLocal('x');
  return c.resolveLocal('x');
})(), 0);
check('compiler resolve undefined throws', (() => {
  const c = new Compiler();
  return raises(() => c.resolveLocal('missing'));
})(), true);
check('compiler compile number emits push', (() => {
  const c = new Compiler();
  c.compileNumber(42, 1);
  const ch = c.getChunk();
  return ch.getByte(0) === OP.PUSH && ch.getConstant(ch.getByte(1)) === 42;
})(), true);
check('compiler compile assign emits store', (() => {
  const c = new Compiler();
  c.declareLocal('x');
  c.compileNumber(5, 1);
  c.compileAssign('x', 1);
  const ch = c.getChunk();
  return ch.getByte(2) === OP.STORE && ch.getByte(3) === 0;
})(), true);
check('compiler compile read emits load', (() => {
  const c = new Compiler();
  c.declareLocal('y');
  c.compileRead('y', 1);
  const ch = c.getChunk();
  return ch.getByte(0) === OP.LOAD && ch.getByte(1) === 0;
})(), true);
check('compiler begin end loop patches breaks', (() => {
  const c = new Compiler();
  c.beginLoop();
  c.compileBreak(1);
  c.compileNumber(1, 2);
  c.endLoop(0);
  const ch = c.getChunk();
  return ch.getByte(1) === ch.size() - 2;
})(), true);
check('compiler break outside loop throws', (() => {
  const c = new Compiler();
  return raises(() => c.compileBreak(1));
})(), true);
check('compiler continue outside loop throws', (() => {
  const c = new Compiler();
  return raises(() => c.compileContinue(0, 1));
})(), true);

console.log('\n=== VM EDGE CASE TESTS ===');
check('vm unknown opcode throws', (() => {
  const ch = new Chunk();
  ch.emit(255, 1);
  ch.emitOp(OP.HALT, 1);
  return raises(() => new VM(ch).run());
})(), true);
check('vm max steps exceeded throws', (() => {
  const ch = new Chunk();
  ch.emitOp(OP.NOP, 1);
  ch.emitOp(OP.JMP, 1);
  ch.emit(-2, 1);
  const vm = new VM(ch);
  vm.maxSteps = 50;
  return raises(() => vm.run());
})(), true);
check('vm ip out of bounds throws', (() => {
  const ch = new Chunk();
  const vm = new VM(ch);
  return raises(() => vm.run());
})(), true);
check('vm nop does nothing', (() => {
  const ch = new Chunk();
  ch.emitOp(OP.NOP, 1);
  ch.emitPush(1, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [1]);
check('vm chained arithmetic', (() => {
  const ch = new Chunk();
  ch.emitPush(2, 1);
  ch.emitPush(3, 1);
  ch.emitOp(OP.ADD, 1);
  ch.emitPush(4, 1);
  ch.emitOp(OP.MUL, 1);
  ch.emitPush(1, 1);
  ch.emitOp(OP.SUB, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [19]);
check('vm print multiple values', (() => {
  const ch = new Chunk();
  ch.emitPush(1, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitPush(2, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitPush(3, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [1, 2, 3]);
check('vm complex expression', (() => {
  const ch = new Chunk();
  ch.emitPush(10, 1);
  ch.emitPush(5, 1);
  ch.emitOp(OP.SUB, 1);
  ch.emitPush(2, 1);
  ch.emitOp(OP.MUL, 1);
  ch.emitPush(3, 1);
  ch.emitOp(OP.ADD, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  return new VM(ch).run();
})(), [13]);

console.log('\n=== STRESS TESTS ===');
let seed = 98765;
function nextRandom(limit) { seed = (seed * 16807) % 2147483647; return seed % limit; }

let arithOk = true;
for (let t = 0; t < 200; t++) {
  const a = nextRandom(100);
  const b = 1 + nextRandom(99);
  const ch = new Chunk();
  ch.emitPush(a, 1);
  ch.emitPush(b, 1);
  ch.emitOp(OP.ADD, 1);
  ch.emitOp(OP.PRINT, 1);
  ch.emitOp(OP.HALT, 1);
  const out = new VM(ch).run();
  if (out[0] !== a + b) { arithOk = false; break; }
}
check('200 random additions', arithOk, true);

let stackDepthOk = true;
for (let t = 0; t < 100; t++) {
  const depth = 5 + nextRandom(50);
  const ch = new Chunk();
  for (let i = 0; i < depth; i++) ch.emitPush(i, 1);
  for (let i = 0; i < depth; i++) ch.emitOp(OP.POP, 1);
  ch.emitOp(OP.HALT, 1);
  try {
    new VM(ch).run();
  } catch (e) {
    stackDepthOk = false;
    break;
  }
}
check('100 deep stack push-pop', stackDepthOk, true);

let varRoundtripOk = true;
for (let t = 0; t < 100; t++) {
  const numVars = 1 + nextRandom(10);
  const ch = new Chunk();
  const vals = [];
  for (let i = 0; i < numVars; i++) {
    const v = nextRandom(1000);
    vals.push(v);
    ch.emitPush(v, 1);
    ch.emitStore(i, 1);
  }
  for (let i = 0; i < numVars; i++) {
    ch.emitLoad(i, 1);
    ch.emitOp(OP.PRINT, 1);
  }
  ch.emitOp(OP.HALT, 1);
  const out = new VM(ch).run();
  if (JSON.stringify(out) !== JSON.stringify(vals)) { varRoundtripOk = false; break; }
}
check('100 variable roundtrips', varRoundtripOk, true);

let callDepthOk = true;
for (let t = 0; t < 50; t++) {
  const depth = 2 + nextRandom(8);
  const ch = new Chunk();
  let addr = 2;
  ch.emitPush(1, 1);
  ch.emit(OP.CALL, 1);
  ch.emit(addr, 1);
  ch.emitOp(OP.HALT, 1);
  for (let d = 0; d < depth; d++) {
    const nextAddr = ch.size() + 2;
    ch.emit(OP.CALL, 1);
    ch.emit(nextAddr, 1);
  }
  ch.emitOp(OP.PRINT, 1);
  for (let d = 0; d < depth; d++) ch.emitOp(OP.RET, 1);
  try {
    const out = new VM(ch).run();
    if (out[0] !== 1) { callDepthOk = false; break; }
  } catch (e) {
    callDepthOk = false;
    break;
  }
}
check('50 nested call depths', callDepthOk, true);

console.log();
console.log('Passed      :', results.filter(Boolean).length, 'of', results.length);
console.log('All correct :', results.every(Boolean));
