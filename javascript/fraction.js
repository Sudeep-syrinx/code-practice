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

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

class Fraction {
  constructor(num, den = 1) {
    if (!Number.isInteger(num) || !Number.isInteger(den)) {
      throw new Error("numerator and denominator must be integers");
    }
    if (den === 0) {
      throw new Error("denominator cannot be zero");
    }
    if (den < 0) {
      num = -num;
      den = -den;
    }
    const g = gcd(num, den);
    this.num = num / g + 0;
    this.den = den / g;
  }

  static of(x) {
    return x instanceof Fraction ? x : new Fraction(x);
  }

  static parse(text) {
    if (typeof text !== "string") {
      throw new Error("text must be a string");
    }
    const m = /^\s*(-?\d+)\s*(?:\/\s*(-?\d+))?\s*$/.exec(text);
    if (m === null) {
      throw new Error("bad fraction text: " + text);
    }
    return new Fraction(Number(m[1]), m[2] === undefined ? 1 : Number(m[2]));
  }

  add(other) {
    const o = Fraction.of(other);
    return new Fraction(this.num * o.den + o.num * this.den, this.den * o.den);
  }

  sub(other) {
    const o = Fraction.of(other);
    return new Fraction(this.num * o.den - o.num * this.den, this.den * o.den);
  }

  mul(other) {
    const o = Fraction.of(other);
    return new Fraction(this.num * o.num, this.den * o.den);
  }

  div(other) {
    return this.mul(Fraction.of(other).inverse());
  }

  neg() {
    return new Fraction(-this.num, this.den);
  }

  inverse() {
    if (this.num === 0) {
      throw new Error("zero has no inverse");
    }
    return new Fraction(this.den, this.num);
  }

  pow(n) {
    if (!Number.isInteger(n)) {
      throw new Error("exponent must be an integer");
    }
    const base = n < 0 ? this.inverse() : this;
    let result = new Fraction(1);
    for (let i = 0; i < Math.abs(n); i++) {
      result = result.mul(base);
    }
    return result;
  }

  compare(other) {
    const o = Fraction.of(other);
    return Math.sign(this.num * o.den - o.num * this.den);
  }

  equals(other) {
    return this.compare(other) === 0;
  }

  toNumber() {
    return this.num / this.den;
  }

  toString() {
    return this.den === 1 ? String(this.num) : this.num + "/" + this.den;
  }
}

function egyptian(f) {
  if (!(f instanceof Fraction) || f.num <= 0 || f.num >= f.den) {
    throw new Error("needs a fraction between 0 and 1");
  }
  const parts = [];
  let rest = f;
  while (rest.num > 0) {
    const d = Math.ceil(rest.den / rest.num);
    const unit = new Fraction(1, d);
    parts.push(unit.toString());
    rest = rest.sub(unit);
  }
  return parts;
}

check("reduces", new Fraction(6, 8).toString(), "3/4");
check("negative den", new Fraction(1, -2).toString(), "-1/2");
check("both negative", new Fraction(-3, -6).toString(), "1/2");
check("zero numerator", new Fraction(0, 5).toString(), "0");
check("whole number", new Fraction(4, 2).toString(), "2");
check("default den", new Fraction(7).toString(), "7");
check("zero den raises", raises(() => new Fraction(1, 0)), true);
check("decimal raises", raises(() => new Fraction(1.5, 2)), true);
check("text raises", raises(() => new Fraction("1", 2)), true);

console.log();
const half = new Fraction(1, 2);
const third = new Fraction(1, 3);
check("add", half.add(third).toString(), "5/6");
check("sub", half.sub(third).toString(), "1/6");
check("sub negative", third.sub(half).toString(), "-1/6");
check("mul", half.mul(third).toString(), "1/6");
check("div", half.div(third).toString(), "3/2");
check("add integer", half.add(2).toString(), "5/2");
check("neg", half.neg().toString(), "-1/2");
check("inverse", new Fraction(-2, 3).inverse().toString(), "-3/2");
check("inverse zero", raises(() => new Fraction(0).inverse()), true);
check("div by zero", raises(() => half.div(0)), true);
check("add to zero", half.add(half.neg()).toString(), "0");
check("original unchanged", half.toString(), "1/2");
check("pow 2", new Fraction(2, 3).pow(2).toString(), "4/9");
check("pow 0", new Fraction(2, 3).pow(0).toString(), "1");
check("pow negative", new Fraction(2, 3).pow(-2).toString(), "9/4");
check("pow decimal", raises(() => half.pow(0.5)), true);

console.log();
check("compare less", third.compare(half), -1);
check("compare greater", half.compare(third), 1);
check("compare equal", new Fraction(2, 4).compare(half), 0);
check("equals", new Fraction(3, 6).equals(half), true);
check("not equals", third.equals(half), false);
check("compare integer", half.compare(1), -1);
check("to number", half.toNumber(), 0.5);
check("to number negative", new Fraction(-1, 4).toNumber(), -0.25);

console.log();
check("parse simple", Fraction.parse("3/4").toString(), "3/4");
check("parse reduces", Fraction.parse("-6/8").toString(), "-3/4");
check("parse integer", Fraction.parse(" 5 ").toString(), "5");
check("parse spaces", Fraction.parse("2 / 4").toString(), "1/2");
check("parse bad text", raises(() => Fraction.parse("abc")), true);
check("parse decimal", raises(() => Fraction.parse("1.5")), true);
check("parse zero den", raises(() => Fraction.parse("3/0")), true);
check("parse number", raises(() => Fraction.parse(5)), true);

console.log();
let harmonic = new Fraction(0);
for (let k = 1; k <= 10; k++) {
  harmonic = harmonic.add(new Fraction(1, k));
}
check("harmonic 10", harmonic.toString(), "7381/2520");
check("egyptian 3/4", egyptian(new Fraction(3, 4)), ["1/2", "1/4"]);
check("egyptian 4/13", egyptian(new Fraction(4, 13)), ["1/4", "1/18", "1/468"]);
check("egyptian unit", egyptian(new Fraction(1, 5)), ["1/5"]);
check("egyptian too big", raises(() => egyptian(new Fraction(3, 2))), true);
check("egyptian zero", raises(() => egyptian(new Fraction(0))), true);
let egyptOk = true;
for (let d = 2; d <= 12; d++) {
  for (let nn = 1; nn < d; nn++) {
    const f = new Fraction(nn, d);
    let sum = new Fraction(0);
    for (const p of egyptian(f)) {
      sum = sum.add(Fraction.parse(p));
    }
    if (!sum.equals(f)) {
      egyptOk = false;
    }
  }
}
check("egyptian sums back", egyptOk, true);

console.log();
let seed = 2718;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
function randomFraction() {
  return new Fraction(nextRandom(41) - 20, nextRandom(20) + 1);
}
let algebraOk = true;
let orderOk = true;
let floatOk = true;
for (let i = 0; i < 300; i++) {
  const a = randomFraction();
  const b = randomFraction();
  if (!a.add(b).sub(b).equals(a)) {
    algebraOk = false;
  }
  if (b.num !== 0 && !a.mul(b).div(b).equals(a)) {
    algebraOk = false;
  }
  if (!a.add(b).equals(b.add(a)) || !a.mul(b).equals(b.mul(a))) {
    algebraOk = false;
  }
  if (a.compare(b) !== Math.sign(a.toNumber() - b.toNumber())) {
    orderOk = false;
  }
  if (a.compare(b) !== -b.compare(a)) {
    orderOk = false;
  }
  if (Math.abs(a.add(b).toNumber() - (a.toNumber() + b.toNumber())) > 1e-9) {
    floatOk = false;
  }
  if (Math.abs(a.mul(b).toNumber() - a.toNumber() * b.toNumber()) > 1e-9) {
    floatOk = false;
  }
}
check("300 algebra checks", algebraOk, true);
check("300 order checks", orderOk, true);
check("300 float checks", floatOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
