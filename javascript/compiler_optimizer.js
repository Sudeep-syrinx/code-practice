const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class IRInstruction {
  constructor(op, dest, src1, src2) {
    this.op = op;
    this.dest = dest;
    this.src1 = src1;
    this.src2 = src2;
  }
  toString() {
    if (this.op === "CONST") return this.dest + " = CONST " + this.src1;
    if (this.op === "COPY") return this.dest + " = COPY " + this.src1;
    if (this.op === "ADD") return this.dest + " = ADD " + this.src1 + " " + this.src2;
    if (this.op === "MUL") return this.dest + " = MUL " + this.src1 + " " + this.src2;
    if (this.op === "SUB") return this.dest + " = SUB " + this.src1 + " " + this.src2;
    if (this.op === "RET") return "RET " + this.src1;
    return this.op + " " + this.dest + " " + this.src1 + " " + this.src2;
  }
}

class BasicBlock {
  constructor(label) {
    this.label = label;
    this.instructions = [];
    this.successors = [];
    this.predecessors = [];
  }
  add(instr) { this.instructions.push(instr); }
  getLastInstr() { return this.instructions[this.instructions.length - 1]; }
}

class CFG {
  constructor() {
    this.blocks = new Map();
    this.entry = null;
  }
  addBlock(block) {
    this.blocks.set(block.label, block);
    if (!this.entry) this.entry = block.label;
  }
  addEdge(from, to) {
    this.blocks.get(from).successors.push(to);
    this.blocks.get(to).predecessors.push(from);
  }
  getBlock(label) { return this.blocks.get(label); }
  getAllBlocks() { return [...this.blocks.values()]; }
  reversePostOrder() {
    const visited = new Set();
    const order = [];
    const dfs = (label) => {
      if (visited.has(label)) return;
      visited.add(label);
      const block = this.blocks.get(label);
      for (const succ of block.successors) dfs(succ);
      order.push(label);
    };
    dfs(this.entry);
    return order.reverse();
  }
}

class ConstantPropagation {
  optimize(cfg) {
    const constants = new Map();
    const worklist = cfg.reversePostOrder();
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 100) {
      changed = false;
      iterations++;
      for (const label of worklist) {
        const block = cfg.getBlock(label);
        const localConsts = new Map(constants);
        for (const instr of block.instructions) {
          if (instr.op === "CONST") {
            if (localConsts.get(instr.dest) !== instr.src1) {
              localConsts.set(instr.dest, instr.src1);
              changed = true;
            }
          } else if (instr.op === "ADD" || instr.op === "MUL" || instr.op === "SUB") {
            const v1 = localConsts.get(instr.src1);
            const v2 = localConsts.get(instr.src2);
            if (v1 !== undefined && v2 !== undefined) {
              let result;
              if (instr.op === "ADD") result = v1 + v2;
              else if (instr.op === "MUL") result = v1 * v2;
              else result = v1 - v2;
              if (localConsts.get(instr.dest) !== result) {
                localConsts.set(instr.dest, result);
                changed = true;
              }
            }
          } else if (instr.op === "COPY") {
            const v = localConsts.get(instr.src1);
            if (v !== undefined && localConsts.get(instr.dest) !== v) {
              localConsts.set(instr.dest, v);
              changed = true;
            }
          }
        }
        for (const [k, v] of localConsts) {
          if (constants.get(k) !== v) { constants.set(k, v); changed = true; }
        }
      }
    }
    return constants;
  }
  applyConstants(cfg, constants) {
    const removed = 0;
    for (const block of cfg.getAllBlocks()) {
      const newInstrs = [];
      for (const instr of block.instructions) {
        if ((instr.op === "ADD" || instr.op === "MUL" || instr.op === "SUB") && constants.has(instr.dest)) {
          newInstrs.push(new IRInstruction("CONST", instr.dest, constants.get(instr.dest)));
        } else if (instr.op === "COPY" && constants.has(instr.dest)) {
          newInstrs.push(new IRInstruction("CONST", instr.dest, constants.get(instr.dest)));
        } else {
          const newSrc1 = constants.has(instr.src1) ? constants.get(instr.src1) : instr.src1;
          const newSrc2 = instr.src2 !== undefined && constants.has(instr.src2) ? constants.get(instr.src2) : instr.src2;
          newInstrs.push(new IRInstruction(instr.op, instr.dest, newSrc1, newSrc2));
        }
      }
      block.instructions = newInstrs;
    }
  }
}

class DeadCodeElimination {
  optimize(cfg) {
    const live = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      for (const block of cfg.getAllBlocks()) {
        for (const succ of block.successors) {
          const succBlock = cfg.getBlock(succ);
          for (const instr of succBlock.instructions) {
            if (instr.src1 && typeof instr.src1 === "string" && instr.src1.startsWith("t")) live.add(instr.src1);
            if (instr.src2 && typeof instr.src2 === "string" && instr.src2.startsWith("t")) live.add(instr.src2);
          }
        }
        for (let i = block.instructions.length - 1; i >= 0; i--) {
          const instr = block.instructions[i];
          if (instr.op === "RET") {
            if (instr.src1 && typeof instr.src1 === "string") live.add(instr.src1);
            continue;
          }
          if (live.has(instr.dest)) {
            if (instr.src1 && typeof instr.src1 === "string" && instr.src1.startsWith("t")) live.add(instr.src1);
            if (instr.src2 && typeof instr.src2 === "string" && instr.src2.startsWith("t")) live.add(instr.src2);
          }
        }
      }
    }
    let eliminated = 0;
    for (const block of cfg.getAllBlocks()) {
      const before = block.instructions.length;
      block.instructions = block.instructions.filter(instr => {
        if (instr.op === "RET") return true;
        if (instr.op === "CONST" && !live.has(instr.dest)) return false;
        if ((instr.op === "ADD" || instr.op === "MUL" || instr.op === "SUB" || instr.op === "COPY") && !live.has(instr.dest)) return false;
        return true;
      });
      eliminated += before - block.instructions.length;
    }
    return eliminated;
  }
}

class CommonSubexpressionElimination {
  optimize(cfg) {
    let eliminated = 0;
    for (const block of cfg.getAllBlocks()) {
      const expressions = new Map();
      const newInstrs = [];
      for (const instr of block.instructions) {
        if (instr.op === "ADD" || instr.op === "MUL" || instr.op === "SUB") {
          const key = instr.op + ":" + instr.src1 + ":" + instr.src2;
          if (expressions.has(key)) {
            newInstrs.push(new IRInstruction("COPY", instr.dest, expressions.get(key)));
            eliminated++;
          } else {
            expressions.set(key, instr.dest);
            newInstrs.push(instr);
          }
        } else {
          newInstrs.push(instr);
        }
      }
      block.instructions = newInstrs;
    }
    return eliminated;
  }
}

check("constant propagation folds add", (() => {
  const cfg = new CFG();
  const bb = new BasicBlock("entry");
  bb.add(new IRInstruction("CONST", "t0", 3));
  bb.add(new IRInstruction("CONST", "t1", 4));
  bb.add(new IRInstruction("ADD", "t2", "t0", "t1"));
  bb.add(new IRInstruction("RET", null, "t2"));
  cfg.addBlock(bb);
  const cp = new ConstantPropagation();
  const consts = cp.optimize(cfg);
  return consts.get("t2");
})(), 7);
check("constant propagation chains", (() => {
  const cfg = new CFG();
  const bb = new BasicBlock("entry");
  bb.add(new IRInstruction("CONST", "t0", 2));
  bb.add(new IRInstruction("CONST", "t1", 3));
  bb.add(new IRInstruction("MUL", "t2", "t0", "t1"));
  bb.add(new IRInstruction("CONST", "t3", 4));
  bb.add(new IRInstruction("ADD", "t4", "t2", "t3"));
  bb.add(new IRInstruction("RET", null, "t4"));
  cfg.addBlock(bb);
  const cp = new ConstantPropagation();
  return cp.optimize(cfg).get("t4");
})(), 10);
check("dead code eliminates unused", (() => {
  const cfg = new CFG();
  const bb = new BasicBlock("entry");
  bb.add(new IRInstruction("CONST", "t0", 5));
  bb.add(new IRInstruction("CONST", "t1", 10));
  bb.add(new IRInstruction("RET", null, "t0"));
  cfg.addBlock(bb);
  const dce = new DeadCodeElimination();
  return dce.optimize(cfg);
})(), 1);
check("dead code keeps used", (() => {
  const cfg = new CFG();
  const bb = new BasicBlock("entry");
  bb.add(new IRInstruction("CONST", "t0", 5));
  bb.add(new IRInstruction("RET", null, "t0"));
  cfg.addBlock(bb);
  const dce = new DeadCodeElimination();
  return dce.optimize(cfg);
})(), 0);
check("cse eliminates duplicate expr", (() => {
  const cfg = new CFG();
  const bb = new BasicBlock("entry");
  bb.add(new IRInstruction("ADD", "t0", "a", "b"));
  bb.add(new IRInstruction("ADD", "t1", "a", "b"));
  bb.add(new IRInstruction("RET", null, "t1"));
  cfg.addBlock(bb);
  const cse = new CommonSubexpressionElimination();
  return cse.optimize(cfg);
})(), 1);
check("cfg reverse post order", (() => {
  const cfg = new CFG();
  const b0 = new BasicBlock("b0");
  const b1 = new BasicBlock("b1");
  const b2 = new BasicBlock("b2");
  cfg.addBlock(b0); cfg.addBlock(b1); cfg.addBlock(b2);
  cfg.addEdge("b0", "b1"); cfg.addEdge("b0", "b2");
  const order = cfg.reversePostOrder();
  return order[0];
})(), "b0");
check("pipeline cp then dce", (() => {
  const cfg = new CFG();
  const bb = new BasicBlock("entry");
  bb.add(new IRInstruction("CONST", "t0", 2));
  bb.add(new IRInstruction("CONST", "t1", 3));
  bb.add(new IRInstruction("ADD", "t2", "t0", "t1"));
  bb.add(new IRInstruction("CONST", "t3", 99));
  bb.add(new IRInstruction("RET", null, "t2"));
  cfg.addBlock(bb);
  const cp = new ConstantPropagation();
  cp.applyConstants(cfg, cp.optimize(cfg));
  const dce = new DeadCodeElimination();
  dce.optimize(cfg);
  return bb.instructions.length;
})(), 2);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
