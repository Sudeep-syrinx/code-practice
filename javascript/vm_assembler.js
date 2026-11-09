const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class VirtualMachine {
  constructor() {
    this.instructions = [];
    this.labels = new Map();
    this.ip = 0;
    this.stack = [];
    this.heap = new Map();
    this.nextHeapAddr = 1;
    this.callStack = [];
    this.output = [];
    this.halted = false;
    this.steps = 0;
    this.maxSteps = 100000;
  }

  emit(op, ...args) { this.instructions.push({ op, args }); return this.instructions.length - 1; }
  label(name) { this.labels.set(name, this.instructions.length); }
  resolveLabels() {
    for (let i = 0; i < this.instructions.length; i++) {
      const instr = this.instructions[i];
      if (instr.op === "JMP" || instr.op === "JZ" || instr.op === "JNZ" || instr.op === "CALL") {
        const target = instr.args[0];
        if (typeof target === "string" && this.labels.has(target)) {
          instr.args[0] = this.labels.get(target);
        }
      }
    }
  }

  run() {
    this.resolveLabels();
    this.ip = 0;
    this.halted = false;
    while (!this.halted && this.ip < this.instructions.length) {
      this.steps++;
      if (this.steps > this.maxSteps) throw new Error("max steps exceeded");
      const instr = this.instructions[this.ip];
      this.ip++;
      this._execute(instr);
    }
    return this.output;
  }

  _execute(instr) {
    const { op, args } = instr;
    switch (op) {
      case "PUSH": this.stack.push(args[0]); break;
      case "POP": this.stack.pop(); break;
      case "DUP": this.stack.push(this.stack[this.stack.length - 1]); break;
      case "SWAP": { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(b, a); break; }
      case "ADD": { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a + b); break; }
      case "SUB": { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a - b); break; }
      case "MUL": { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a * b); break; }
      case "DIV": { const b = this.stack.pop(), a = this.stack.pop(); if (b === 0) throw new Error("div by zero"); this.stack.push(Math.floor(a / b)); break; }
      case "MOD": { const b = this.stack.pop(), a = this.stack.pop(); if (b === 0) throw new Error("mod by zero"); this.stack.push(a % b); break; }
      case "NEG": this.stack.push(-this.stack.pop()); break;
      case "EQ": { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a === b ? 1 : 0); break; }
      case "NEQ": { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a !== b ? 1 : 0); break; }
      case "LT": { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a < b ? 1 : 0); break; }
      case "GT": { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a > b ? 1 : 0); break; }
      case "AND": { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a & b); break; }
      case "OR": { const b = this.stack.pop(), a = this.stack.pop(); this.stack.push(a | b); break; }
      case "NOT": this.stack.push(this.stack.pop() === 0 ? 1 : 0); break;
      case "STORE": { const val = this.stack.pop(), addr = this.stack.pop(); this.heap.set(addr, val); break; }
      case "LOAD": { const addr = this.stack.pop(); this.stack.push(this.heap.get(addr) || 0); break; }
      case "ALLOC": { const addr = this.nextHeapAddr++; this.stack.push(addr); break; }
      case "PRINT": this.output.push(this.stack.pop()); break;
      case "JMP": this.ip = args[0]; break;
      case "JZ": if (this.stack.pop() === 0) this.ip = args[0]; break;
      case "JNZ": if (this.stack.pop() !== 0) this.ip = args[0]; break;
      case "CALL": this.callStack.push(this.ip); this.ip = args[0]; break;
      case "RET": this.ip = this.callStack.pop(); break;
      case "HALT": this.halted = true; break;
      case "NOP": break;
      default: throw new Error("unknown opcode: " + op);
    }
  }

  getStack() { return [...this.stack]; }
  getHeap() { return new Map(this.heap); }
  getOutput() { return [...this.output]; }
}

class Assembler {
  constructor() { this.vm = new VirtualMachine(); }
  parse(source) {
    const lines = source.split("\n").map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith(";"));
    for (const line of lines) {
      if (line.endsWith(":")) {
        this.vm.label(line.slice(0, -1));
      } else {
        const parts = line.split(/\s+/);
        const op = parts[0].toUpperCase();
        const args = parts.slice(1).map(a => {
          if (/^-?\d+$/.test(a)) return parseInt(a, 10);
          return a;
        });
        this.vm.emit(op, ...args);
      }
    }
    return this.vm;
  }
}

console.log("=== VM BASIC OPS ===");
check("push and print", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 42); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [42]);
check("add", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 3); vm.emit("PUSH", 4); vm.emit("ADD"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [7]);
check("sub", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 10); vm.emit("PUSH", 3); vm.emit("SUB"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [7]);
check("mul", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 6); vm.emit("PUSH", 7); vm.emit("MUL"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [42]);
check("div", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 20); vm.emit("PUSH", 4); vm.emit("DIV"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [5]);
check("mod", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 17); vm.emit("PUSH", 5); vm.emit("MOD"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [2]);
check("neg", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 5); vm.emit("NEG"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [-5]);
check("dup", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 7); vm.emit("DUP"); vm.emit("ADD"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [14]);
check("swap", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 1); vm.emit("PUSH", 2); vm.emit("SWAP"); vm.emit("SUB"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [1]);
check("div by zero throws", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 1); vm.emit("PUSH", 0); vm.emit("DIV"); vm.emit("HALT"); return raises(() => vm.run()); })(), true);

console.log("\n=== VM COMPARISONS ===");
check("eq true", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 5); vm.emit("PUSH", 5); vm.emit("EQ"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [1]);
check("eq false", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 5); vm.emit("PUSH", 6); vm.emit("EQ"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [0]);
check("lt", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 3); vm.emit("PUSH", 5); vm.emit("LT"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [1]);
check("gt", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 5); vm.emit("PUSH", 3); vm.emit("GT"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [1]);
check("not", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 0); vm.emit("NOT"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [1]);

console.log("\n=== VM MEMORY ===");
check("store and load", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 0); vm.emit("PUSH", 42); vm.emit("STORE"); vm.emit("PUSH", 0); vm.emit("LOAD"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [42]);
check("alloc returns address", (() => { const vm = new VirtualMachine(); vm.emit("ALLOC"); vm.emit("PRINT"); vm.emit("HALT"); return vm.run()[0] > 0; })(), true);

console.log("\n=== VM CONTROL FLOW ===");
check("jmp skips code", (() => { const vm = new VirtualMachine(); vm.emit("JMP", 3); vm.emit("PUSH", 99); vm.emit("PRINT"); vm.emit("PUSH", 42); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [42]);
check("jz taken", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 0); vm.emit("JZ", 4); vm.emit("PUSH", 99); vm.emit("PRINT"); vm.emit("PUSH", 42); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [42]);
check("jnz taken", (() => { const vm = new VirtualMachine(); vm.emit("PUSH", 1); vm.emit("JNZ", 4); vm.emit("PUSH", 99); vm.emit("PRINT"); vm.emit("PUSH", 42); vm.emit("PRINT"); vm.emit("HALT"); return vm.run(); })(), [42]);
check("call and ret", (() => { const vm = new VirtualMachine(); vm.emit("CALL", 4); vm.emit("PRINT"); vm.emit("HALT"); vm.emit("PUSH", 42); vm.emit("RET"); return vm.run(); })(), [42]);

console.log("\n=== ASSEMBLER ===");
check("assembler parse and run", (() => {
  const asm = new Assembler();
  const vm = asm.parse("PUSH 10\nPUSH 20\nADD\nPRINT\nHALT");
  return vm.run();
})(), [30]);
check("assembler labels", (() => {
  const asm = new Assembler();
  const vm = asm.parse("JMP end\nPUSH 99\nPRINT\nend:\nPUSH 42\nPRINT\nHALT");
  return vm.run();
})(), [42]);
check("assembler comments ignored", (() => {
  const asm = new Assembler();
  const vm = asm.parse("; this is a comment\nPUSH 5\nPRINT\nHALT");
  return vm.run();
})(), [5]);
check("assembler loop program", (() => {
  const asm = new Assembler();
  const vm = asm.parse("PUSH 0\nloop:\nDUP\nPUSH 5\nLT\nJNZ body\nJMP done\nbody:\nDUP\nPRINT\nPUSH 1\nADD\nJMP loop\ndone:\nPOP\nHALT");
  return vm.run();
})(), [0, 1, 2, 3, 4]);
check("assembler factorial", (() => {
  const asm = new Assembler();
  const vm = asm.parse("PUSH 5\nPUSH 1\nfact_loop:\nSWAP\nDUP\nPUSH 1\nGT\nJZ fact_done\nSWAP\nOVER\nMUL\nSWAP\nPUSH 1\nSUB\nJMP fact_loop\nfact_done:\nSWAP\nPOP\nPRINT\nHALT");
  return vm.run();
})(), [120]);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
