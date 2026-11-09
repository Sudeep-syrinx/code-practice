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

function valid(p) {
  if (!Array.isArray(p) || p.length === 0 || p.some((c) => typeof c !== "number" || !Number.isFinite(c))) {
    throw new Error("bad polynomial");
  }
}

function normalize(p) {
  const out = p.slice();
  while (out.length > 1 && out[out.length - 1] === 0) {
    out.pop();
  }
  return out.length === 0 ? [0] : out;
}

function degree(p) {
  valid(p);
  const n = normalize(p);
  return n.length === 1 && n[0] === 0 ? -1 : n.length - 1;
}

function add(a, b) {
  valid(a);
  valid(b);
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    out.push((a[i] || 0) + (b[i] || 0));
  }
  return normalize(out);
}

function sub(a, b) {
  valid(b);
  return add(a, b.map((c) => -c));
}

function mul(a, b) {
  valid(a);
  valid(b);
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      out[i + j] += a[i] * b[j];
    }
  }
  return normalize(out);
}

function evaluate(p, x) {
  valid(p);
  let result = 0;
  for (let i = p.length - 1; i >= 0; i--) {
    result = result * x + p[i];
  }
  return result;
}

function derivative(p) {
  valid(p);
  if (p.length === 1) {
    return [0];
  }
  return normalize(p.slice(1).map((c, i) => c * (i + 1)));
}

function compose(p, q) {
  valid(p);
  valid(q);
  let result = [0];
  for (let i = p.length - 1; i >= 0; i--) {
    result = add(mul(result, q), [p[i]]);
  }
  return result;
}

function fromRoots(roots) {
  let result = [1];
  for (const r of roots) {
    result = mul(result, [-r, 1]);
  }
  return result;
}

function divmod(a, b) {
  valid(a);
  valid(b);
  const d = normalize(b);
  if (d.length === 1 && d[0] === 0) {
    throw new Error("division by the zero polynomial");
  }
  const r = normalize(a);
  if (r.length < d.length) {
    return { quotient: [0], remainder: r };
  }
  const q = new Array(r.length - d.length + 1).fill(0);
  const lead = d[d.length - 1];
  for (let i = r.length - d.length; i >= 0; i--) {
    const coef = r[i + d.length - 1] / lead;
    q[i] = coef;
    for (let j = 0; j < d.length; j++) {
      r[i + j] -= coef * d[j];
    }
  }
  return { quotient: normalize(q), remainder: normalize(r.slice(0, d.length - 1)) };
}

function findRoot(p, guess, tolerance = 1e-12, maxIter = 100) {
  valid(p);
  const d = derivative(p);
  let x = guess;
  for (let i = 0; i < maxIter; i++) {
    const fx = evaluate(p, x);
    if (Math.abs(fx) < tolerance) {
      return x;
    }
    const dx = evaluate(d, x);
    if (dx === 0) {
      throw new Error("derivative is zero");
    }
    x -= fx / dx;
  }
  throw new Error("did not converge");
}

function toString(p) {
  valid(p);
  const parts = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const c = p[i];
    if (c === 0) {
      continue;
    }
    const abs = Math.abs(c);
    let body;
    if (i === 0) {
      body = String(abs);
    } else {
      body = (abs === 1 ? "" : String(abs)) + (i === 1 ? "x" : "x^" + i);
    }
    if (parts.length === 0) {
      parts.push((c < 0 ? "-" : "") + body);
    } else {
      parts.push((c < 0 ? "- " : "+ ") + body);
    }
  }
  return parts.length === 0 ? "0" : parts.join(" ");
}

check("normalize trailing", normalize([1, 2, 0, 0]), [1, 2]);
check("normalize zero", normalize([0, 0, 0]), [0]);
check("normalize empty", normalize([]), [0]);
check("normalize keeps", normalize([0, 1]), [0, 1]);
check("degree cubic", degree([1, 0, 0, 4]), 3);
check("degree constant", degree([5]), 0);
check("degree zero poly", degree([0]), -1);
check("degree trailing zeros", degree([1, 2, 0, 0]), 1);
check("bad empty", raises(() => degree([])), true);
check("bad type", raises(() => degree("x")), true);
check("bad element", raises(() => degree([1, "2"])), true);
check("bad infinity", raises(() => degree([1, Infinity])), true);

console.log();
check("add", add([1, 2, 3], [4, 5]), [5, 7, 3]);
check("add cancels", add([1, 2, 3], [1, -2, -3]), [2]);
check("add zero", add([1, 2], [0]), [1, 2]);
check("sub", sub([5, 5, 5], [1, 2, 3]), [4, 3, 2]);
check("sub self", sub([1, 2, 3], [1, 2, 3]), [0]);
check("mul", mul([1, 1], [1, 1]), [1, 2, 1]);
check("mul different", mul([-1, 1], [1, 1]), [-1, 0, 1]);
check("mul by zero", mul([1, 2], [0]), [0]);
check("mul by one", mul([3, 4, 5], [1]), [3, 4, 5]);
check("mul degrees", degree(mul([1, 2, 3], [4, 5])), 3);
check("inputs untouched", (() => {
  const a = [1, 2];
  add(a, [3, 4]);
  mul(a, [1, 1]);
  return a;
})(), [1, 2]);

console.log();
check("evaluate", evaluate([1, 2, 3], 2), 17);
check("evaluate at zero", evaluate([7, 5, 3], 0), 7);
check("evaluate constant", evaluate([9], 100), 9);
check("evaluate negative", evaluate([1, 0, 1], -3), 10);
check("derivative", derivative([5, 3, 2]), [3, 4]);
check("derivative cubic", derivative([0, 0, 0, 1]), [0, 0, 3]);
check("derivative constant", derivative([7]), [0]);
check("derivative linear", derivative([1, 2]), [2]);
check("compose square", compose([0, 0, 1], [1, 1]), [1, 2, 1]);
check("compose with x", compose([1, 2, 3], [0, 1]), [1, 2, 3]);
check("compose constant", compose([4], [1, 2, 3]), [4]);
check("compose twice", evaluate(compose([1, 1], [0, 2]), 5), 11);
check("from roots two", fromRoots([1, 2]), [2, -3, 1]);
check("from roots three", fromRoots([1, 2, 3]), [-6, 11, -6, 1]);
check("from roots none", fromRoots([]), [1]);
check("roots evaluate to zero", [1, 2, 3].map((r) => evaluate(fromRoots([1, 2, 3]), r)), [0, 0, 0]);
check("repeated root", fromRoots([2, 2]), [4, -4, 1]);

console.log();
check("divide exact", divmod([-1, 0, 1], [-1, 1]), { quotient: [1, 1], remainder: [0] });
check("divide with remainder", divmod([1, 0, 1], [1, 1]), { quotient: [-1, 1], remainder: [2] });
check("divide by constant", divmod([2, 4, 6], [2]), { quotient: [1, 2, 3], remainder: [0] });
check("divide smaller", divmod([1, 1], [1, 0, 1]), { quotient: [0], remainder: [1, 1] });
check("divide zero poly", divmod([0], [1, 1]), { quotient: [0], remainder: [0] });
check("divide by zero", raises(() => divmod([1, 1], [0])), true);
check("divide by zero padded", raises(() => divmod([1, 1], [0, 0])), true);
check("divide cubic", divmod([-6, 11, -6, 1], [-1, 1]).quotient, [6, -5, 1]);

console.log();
check("root of x^2-2", Math.round(findRoot([-2, 0, 1], 1) * 1e6) / 1e6, 1.414214);
check("root negative side", Math.round(findRoot([-2, 0, 1], -1) * 1e6) / 1e6, -1.414214);
check("root of linear", findRoot([-6, 2], 0), 3);
check("flat spot raises", raises(() => findRoot([1, 0, 1], 0)), true);
check("no real root raises", raises(() => findRoot([1, 0, 1], 1)), true);

console.log();
check("string quadratic", toString([1, 2, 3]), "3x^2 + 2x + 1");
check("string negative lead", toString([0, -1]), "-x");
check("string minus constant", toString([-1, 0, 1]), "x^2 - 1");
check("string constant", toString([5]), "5");
check("string zero", toString([0]), "0");
check("string single term", toString([0, 0, -2]), "-2x^2");
check("string linear", toString([1, 1]), "x + 1");
check("string coefficient one", toString([0, 1, 1]), "x^2 + x");

console.log();
let seed = 1729;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
function randomPoly(maxLen) {
  const p = [];
  const len = 1 + nextRandom(maxLen);
  for (let i = 0; i < len; i++) {
    p.push(nextRandom(11) - 5);
  }
  return p;
}
let mulOk = true;
let addOk = true;
let composeOk = true;
let productOk = true;
let divOk = true;
for (let round = 0; round < 200; round++) {
  const a = randomPoly(5);
  const b = randomPoly(4);
  const x = nextRandom(9) - 4;
  if (evaluate(mul(a, b), x) !== evaluate(a, x) * evaluate(b, x)) {
    mulOk = false;
  }
  if (evaluate(add(a, b), x) !== evaluate(a, x) + evaluate(b, x) || evaluate(sub(a, b), x) !== evaluate(a, x) - evaluate(b, x)) {
    addOk = false;
  }
  if (evaluate(compose(a, b), x) !== evaluate(a, evaluate(b, x))) {
    composeOk = false;
  }
  const left = derivative(mul(a, b));
  const right = add(mul(derivative(a), b), mul(a, derivative(b)));
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    productOk = false;
  }
  const monic = randomPoly(3).concat([1]);
  const result = divmod(a, monic);
  const rebuilt = add(mul(result.quotient, monic), result.remainder);
  if (JSON.stringify(rebuilt) !== JSON.stringify(normalize(a)) || degree(result.remainder) >= degree(monic)) {
    divOk = false;
  }
}
check("200 products", mulOk, true);
check("200 sums and differences", addOk, true);
check("200 compositions", composeOk, true);
check("200 product rules", productOk, true);
check("200 divisions rebuild", divOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
