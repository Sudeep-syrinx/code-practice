from typing import List, Dict, Any

class WasmException(Exception):
    pass

class WasmVM:
    """
    A Stack-based Virtual Machine designed to execute a high-level representation
    of WebAssembly (WASM) instructions.
    """
    def __init__(self):
        self.stack: List[float] = []
        self.locals: Dict[int, float] = {}
        self.memory: bytearray = bytearray(65536) # 1 Page of WASM memory (64KB)
        self.pc: int = 0
        self.call_stack: List[Dict[str, Any]] = []

    def execute(self, instructions: List[tuple], start_pc: int = 0):
        self.pc = start_pc
        
        while self.pc < len(instructions):
            instr = instructions[self.pc]
            opcode = instr[0]
            args = instr[1:] if len(instr) > 1 else ()
            
            if opcode == "f64.const":
                self.stack.append(float(args[0]))
            elif opcode == "i32.const":
                self.stack.append(int(args[0]))
            elif opcode == "f64.add":
                b = self.stack.pop()
                a = self.stack.pop()
                self.stack.append(a + b)
            elif opcode == "f64.sub":
                b = self.stack.pop()
                a = self.stack.pop()
                self.stack.append(a - b)
            elif opcode == "f64.mul":
                b = self.stack.pop()
                a = self.stack.pop()
                self.stack.append(a * b)
            elif opcode == "f64.div":
                b = self.stack.pop()
                a = self.stack.pop()
                if b == 0: raise WasmException("Division by zero")
                self.stack.append(a / b)
            elif opcode == "i32.add":
                b = int(self.stack.pop())
                a = int(self.stack.pop())
                self.stack.append(a + b)
            elif opcode == "i32.eq":
                b = int(self.stack.pop())
                a = int(self.stack.pop())
                self.stack.append(1 if a == b else 0)
            elif opcode == "local.get":
                self.stack.append(self.locals.get(args[0], 0.0))
            elif opcode == "local.set":
                self.locals[args[0]] = self.stack.pop()
            elif opcode == "local.tee":
                self.locals[args[0]] = self.stack[-1]
            elif opcode == "br_if":
                cond = self.stack.pop()
                if cond != 0:
                    self.pc = args[0]
                    continue
            elif opcode == "br":
                self.pc = args[0]
                continue
            elif opcode == "call":
                # Save current context
                self.call_stack.append({
                    "pc": self.pc + 1,
                    "locals": self.locals.copy()
                })
                self.pc = args[0]
                continue
            elif opcode == "return":
                if not self.call_stack:
                    break
                frame = self.call_stack.pop()
                self.pc = frame["pc"]
                self.locals = frame["locals"]
                continue
            elif opcode == "i32.load":
                addr = int(self.stack.pop())
                val = int.from_bytes(self.memory[addr:addr+4], byteorder='little')
                self.stack.append(val)
            elif opcode == "i32.store":
                val = int(self.stack.pop())
                addr = int(self.stack.pop())
                self.memory[addr:addr+4] = val.to_bytes(4, byteorder='little')
            elif opcode == "drop":
                self.stack.pop()
            else:
                raise WasmException(f"Unknown opcode: {opcode}")
                
            self.pc += 1

        return self.stack.pop() if self.stack else None

if __name__ == "__main__":
    print("--- WEB-ASSEMBLY (WASM) STACK MACHINE VM ---")
    
    vm = WasmVM()
    
    # 1. Simple Arithmetic
    # (10.5 + 20.0) * 2.0
    arithmetic_prog = [
        ("f64.const", 10.5),
        ("f64.const", 20.0),
        ("f64.add",),
        ("f64.const", 2.0),
        ("f64.mul",)
    ]
    print("\nExecuting Arithmetic: (10.5 + 20.0) * 2.0")
    result = vm.execute(arithmetic_prog)
    print(f"Result: {result} | Expected: 61.0")
    
    # 2. Local Variables & Loop (Factorial of 5)
    # local 0 = counter (starts at 5)
    # local 1 = accumulator (starts at 1)
    factorial_prog = [
        ("i32.const", 5),
        ("local.set", 0),      # counter = 5
        ("i32.const", 1),
        ("local.set", 1),      # acc = 1
        
        # Loop start (PC = 4)
        ("local.get", 1),
        ("local.get", 0),
        ("i32.mul",),          # acc * counter
        ("local.set", 1),      # acc = acc * counter
        
        ("local.get", 0),
        ("i32.const", 1),
        ("i32.sub",),          # counter - 1
        ("local.tee", 0),      # counter = counter - 1 (leaves value on stack)
        
        ("i32.const", 0),
        ("i32.eq",),           # is counter == 0?
        
        ("i32.const", 0),
        ("i32.eq",),           # Invert condition (is counter != 0?)
        
        ("br_if", 4),          # If counter != 0, branch to Loop start (PC=4)
        
        ("local.get", 1)       # Push final accumulator
    ]
    
    vm.stack.clear()
    vm.locals.clear()
    print("\nExecuting Loop: Factorial of 5")
    result = vm.execute(factorial_prog)
    print(f"Result: {result} | Expected: 120")
    
    # 3. Memory Operations
    mem_prog = [
        ("i32.const", 1024),   # Memory Address
        ("i32.const", 4242),   # Value
        ("i32.store",),        # Store value at address
        
        ("i32.const", 1024),   # Memory Address
        ("i32.load",)          # Load value back onto stack
    ]
    vm.stack.clear()
    print("\nExecuting Linear Memory Ops")
    result = vm.execute(mem_prog)
    print(f"Result from memory[1024]: {result} | Expected: 4242")
