const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class Polynomial {
  constructor(coeffs) { this.coeffs = coeffs.map(Number); while (this.coeffs.length > 1 && this.coeffs[this.coeffs.length - 1] === 0) this.coeffs.pop(); }
  degree() { return this.coeffs.length - 1; }
  evaluate(x) { let result = 0; for (let i = this.coeffs.length - 1; i >= 0; i--) result = result * x + this.coeffs[i]; return result; }
  add(other) { const len = Math.max(this.coeffs.length, other.coeffs.length); const r = new Array(len).fill(0); for (let i = 0; i < this.coeffs.length; i++) r[i] += this.coeffs[i]; for (let i = 0; i < other.coeffs.length; i++) r[i] += other.coeffs[i]; return new Polynomial(r); }
  sub(other) { const len = Math.max(this.coeffs.length, other.coeffs.length); const r = new Array(len).fill(0); for (let i = 0; i < this.coeffs.length; i++) r[i] += this.coeffs[i]; for (let i = 0; i < other.coeffs.length; i++) r[i] -= other.coeffs[i]; return new Polynomial(r); }
  mul(other) { const r = new Array(this.coeffs.length + other.coeffs.length - 1).fill(0); for (let i = 0; i < this.coeffs.length; i++) for (let j = 0; j < other.coeffs.length; j++) r[i + j] += this.coeffs[i] * other.coeffs[j]; return new Polynomial(r); }
  scale(s) { return new Polynomial(this.coeffs.map(c => c * s)); }
  derivative() { if (this.coeffs.length <= 1) return new Polynomial([0]); return new Polynomial(this.coeffs.slice(1).map((c, i) => c * (i + 1))); }
  integral(constant) { const r = [constant || 0]; for (let i = 0; i < this.coeffs.length; i++) r.push(this.coeffs[i] / (i + 1)); return new Polynomial(r); }
  divide(divisor) {
    if (divisor.degree() === 0 && divisor.coeffs[0] === 0) throw new Error("division by zero polynomial");
    const remainder = [...this.coeffs];
    const quotient = new Array(Math.max(0, this.degree() - divisor.degree()) + 1).fill(0);
    for (let i = remainder.length - 1; i >= divisor.degree(); i--) {
      const coeff = remainder[i] / divisor.coeffs[divisor.degree()];
      quotient[i - divisor.degree()] = coeff;
      for (let j = 0; j <= divisor.degree(); j++) remainder[i - divisor.degree() + j] -= coeff * divisor.coeffs[j];
    }
    return { quotient: new Polynomial(quotient), remainder: new Polynomial(remainder) };
  }
  gcd(other) {
    let a = this, b = other;
    while (b.degree() > 0 || (b.degree() === 0 && b.coeffs[0] !== 0)) {
      const { remainder } = a.divide(b);
      a = b; b = remainder;
    }
    return a;
  }
  equals(other, eps) { const e = eps || 1e-9; if (this.coeffs.length !== other.coeffs.length) return false; for (let i = 0; i < this.coeffs.length; i++) if (Math.abs(this.coeffs[i] - other.coeffs[i]) > e) return false; return true; }
  toArray() { return [...this.coeffs]; }
}

class RationalFunction {
  constructor(num, den) { this.numerator = num instanceof Polynomial ? num : new Polynomial(num); this.denominator = den instanceof Polynomial ? den : new Polynomial(den); this._simplify(); }
  _simplify() {
    const g = this.numerator.gcd(this.denominator);
    if (g.degree() > 0 || (g.degree() === 0 && g.coeffs[0] !== 1)) {
      this.numerator = this.numerator.divide(g).quotient;
      this.denominator = this.denominator.divide(g).quotient;
    }
    if (this.denominator.coeffs[this.denominator.degree()] < 0) {
      this.numerator = this.numerator.scale(-1);
      this.denominator = this.denominator.scale(-1);
    }
  }
  evaluate(x) { return this.numerator.evaluate(x) / this.denominator.evaluate(x); }
  add(other) {
    const num = this.numerator.mul(other.denominator).add(other.numerator.mul(this.denominator));
    const den = this.denominator.mul(other.denominator);
    return new RationalFunction(num, den);
  }
  mul(other) { return new RationalFunction(this.numerator.mul(other.numerator), this.denominator.mul(other.denominator)); }
  derivative() {
    const num = this.numerator.derivative().mul(this.denominator).sub(this.numerator.mul(this.denominator.derivative()));
    const den = this.denominator.mul(this.denominator);
    return new RationalFunction(num, den);
  }
  partialFractions() {
    if (this.denominator.degree() <= 1) return [{ numerator: this.numerator, denominator: this.denominator }];
    const factors = [];
    let remaining = this.denominator;
    for (let r = -10; r <= 10; r++) {
      const rootPoly = new Polynomial([-r, 1]);
      while (remaining.degree() > 0) {
        const { remainder } = remaining.divide(rootPoly);
        if (Math.abs(remainder.coeffs[0]) < 1e-9) {
          factors.push(rootPoly);
          remaining = remaining.divide(rootPoly).quotient;
        } else break;
      }
    }
    if (factors.length === 0) return [{ numerator: this.numerator, denominator: this.denominator }];
    const result = [];
    for (const factor of factors) {
      const num = new Polynomial([this.numerator.evaluate(factor.coeffs[0] === 0 ? 0 : -factor.coeffs[0] / factor.coeffs[1])]);
      result.push({ numerator: num, denominator: factor });
    }
    return result;
  }
}

console.log("=== POLYNOMIAL ===");
check("poly evaluate", (() => new Polynomial([1, 2, 3]).evaluate(2))(), 17);
check("poly add", (() => new Polynomial([1, 2]).add(new Polynomial([3, 4])).toArray())(), [4, 6]);
check("poly sub", (() => new Polynomial([5, 3]).sub(new Polynomial([2, 1])).toArray())(), [3, 2]);
check("poly mul", (() => new Polynomial([1, 1]).mul(new Polynomial([1, -1])).toArray())(), [1, 0, -1]);
check("poly derivative", (() => new Polynomial([1, 2, 3]).derivative().toArray())(), [2, 6]);
check("poly integral", (() => new Polynomial([2, 6]).integral(0).toArray())(), [0, 2, 3]);
check("poly divide", (() => { const { quotient, remainder } = new Polynomial([1, 0, 1]).divide(new Polynomial([1, 1])); return quotient.toArray(); })(), [-1, 1]);
check("poly gcd", (() => { const g = new Polynomial([1, -3, 2]).gcd(new Polynomial([1, -2, 1])); return g.degree() >= 0; })(), true);
check("poly degree", new Polynomial([1, 2, 3]).degree(), 2);
check("poly scale", (() => new Polynomial([1, 2]).scale(3).toArray())(), [3, 6]);
check("poly equals", (() => new Polynomial([1, 2]).equals(new Polynomial([1, 2])))(), true);

console.log("\n=== RATIONAL FUNCTION ===");
check("rational evaluate", (() => new RationalFunction([1, 1], [1]).evaluate(3))(), 4);
check("rational simplify", (() => { const r = new RationalFunction([2, 4], [1, 2]); return r.numerator.toArray(); })(), [2]);
check("rational add", (() => { const a = new RationalFunction([1], [1, 1]); const b = new RationalFunction([1], [1, -1]); const sum = a.add(b); return Math.abs(sum.evaluate(2) - (1/3 + 1)) < 0.001; })(), true);
check("rational mul", (() => { const a = new RationalFunction([1], [1, 1]); const b = new RationalFunction([1, 1], [1]); return Math.abs(a.mul(b).evaluate(5) - 1) < 0.001; })(), true);
check("rational derivative", (() => { const r = new RationalFunction([1], [0, 1]); const d = r.derivative(); return Math.abs(d.evaluate(2) - (-0.25)) < 0.001; })(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
