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

function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function typeOf(v) {
  if (v === null) {
    return "null";
  }
  if (Array.isArray(v)) {
    return "array";
  }
  return typeof v;
}

function matchesType(v, t) {
  if (t === "integer") {
    return typeof v === "number" && Number.isInteger(v);
  }
  if (t === "number") {
    return typeof v === "number" && Number.isFinite(v);
  }
  if (["string", "boolean", "object", "array", "null"].indexOf(t) === -1) {
    throw new Error("unknown type: " + t);
  }
  return typeOf(v) === t;
}

function validate(value, schema, path = "$") {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error("schema must be an object");
  }
  const errors = [];
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      errors.push({ path: path, message: "expected " + types.join(" or ") + " but got " + typeOf(value) });
      return errors;
    }
  }
  if (schema.enum !== undefined) {
    const text = JSON.stringify(value);
    if (!schema.enum.some((e) => JSON.stringify(e) === text)) {
      errors.push({ path: path, message: "must be one of " + JSON.stringify(schema.enum) });
    }
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({ path: path, message: "must be at least " + schema.minLength + " characters" });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({ path: path, message: "must be at most " + schema.maxLength + " characters" });
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      errors.push({ path: path, message: "does not match pattern " + schema.pattern });
    }
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({ path: path, message: "must be >= " + schema.minimum });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({ path: path, message: "must be <= " + schema.maximum });
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({ path: path, message: "must have at least " + schema.minItems + " items" });
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push({ path: path, message: "must have at most " + schema.maxItems + " items" });
    }
    if (schema.items !== undefined) {
      value.forEach((item, i) => {
        errors.push(...validate(item, schema.items, path + "[" + i + "]"));
      });
    }
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const props = schema.properties || {};
    for (const key of schema.required || []) {
      if (!has(value, key)) {
        errors.push({ path: path + "." + key, message: "is required" });
      }
    }
    for (const key of Object.keys(props)) {
      if (has(value, key)) {
        errors.push(...validate(value[key], props[key], path + "." + key));
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!has(props, key)) {
          errors.push({ path: path + "." + key, message: "is not allowed" });
        }
      }
    }
  }
  return errors;
}

function isValid(value, schema) {
  return validate(value, schema).length === 0;
}

function firstError(value, schema) {
  const errors = validate(value, schema);
  return errors.length === 0 ? null : errors[0].path + " " + errors[0].message;
}

check("string ok", validate("a", { type: "string" }), []);
check("string wrong", validate(5, { type: "string" }), [{ path: "$", message: "expected string but got number" }]);
check("number ok", validate(1.5, { type: "number" }), []);
check("integer ok", validate(3, { type: "integer" }), []);
check("integer wrong", validate(1.5, { type: "integer" }), [{ path: "$", message: "expected integer but got number" }]);
check("number rejects NaN", isValid(NaN, { type: "number" }), false);
check("boolean ok", isValid(false, { type: "boolean" }), true);
check("null ok", isValid(null, { type: "null" }), true);
check("array is not object", validate([], { type: "object" }), [{ path: "$", message: "expected object but got array" }]);
check("null is not object", validate(null, { type: "object" }), [{ path: "$", message: "expected object but got null" }]);
check("object ok", isValid({}, { type: "object" }), true);
check("type list ok", isValid(null, { type: ["string", "null"] }), true);
check("type list wrong", validate(5, { type: ["string", "null"] }), [{ path: "$", message: "expected string or null but got number" }]);
check("no schema rules", isValid({ any: 1 }, {}), true);
check("unknown type raises", raises(() => validate(1, { type: "foo" })), true);
check("null schema raises", raises(() => validate(1, null)), true);
check("array schema raises", raises(() => validate(1, [])), true);

console.log();
check("min length", validate("ab", { minLength: 3 }), [{ path: "$", message: "must be at least 3 characters" }]);
check("max length", validate("abcd", { maxLength: 3 }), [{ path: "$", message: "must be at most 3 characters" }]);
check("length ok", isValid("abc", { minLength: 3, maxLength: 3 }), true);
check("pattern ok", isValid("abc", { pattern: "^a" }), true);
check("pattern fail", validate("xbc", { pattern: "^a" }), [{ path: "$", message: "does not match pattern ^a" }]);
check("length ignores numbers", isValid(5, { minLength: 3 }), true);
check("minimum ok", isValid(1, { minimum: 1 }), true);
check("minimum fail", validate(0, { minimum: 1 }), [{ path: "$", message: "must be >= 1" }]);
check("maximum fail", validate(11, { maximum: 10 }), [{ path: "$", message: "must be <= 10" }]);
check("range ok", isValid(5, { minimum: 1, maximum: 10 }), true);
check("enum ok", isValid("a", { enum: ["a", "b"] }), true);
check("enum fail", validate("c", { enum: ["a", "b"] }), [{ path: "$", message: "must be one of [\"a\",\"b\"]" }]);
check("enum numbers", isValid(2, { enum: [1, 2, 3] }), true);
check("enum objects", isValid({ a: 1 }, { enum: [{ a: 1 }] }), true);
check("enum null", isValid(null, { enum: [null, 1] }), true);

console.log();
const nums = { type: "array", items: { type: "integer" } };
check("array ok", isValid([1, 2, 3], nums), true);
check("array empty", isValid([], nums), true);
check("array bad item", validate([1, "x", 3], nums), [{ path: "$[1]", message: "expected integer but got string" }]);
check("array two bad items", validate(["a", 2, "b"], nums).map((e) => e.path), ["$[0]", "$[2]"]);
check("min items", validate([], { minItems: 1 }), [{ path: "$", message: "must have at least 1 items" }]);
check("max items", validate([1, 2, 3], { maxItems: 2 }), [{ path: "$", message: "must have at most 2 items" }]);
check("not an array", validate("x", nums), [{ path: "$", message: "expected array but got string" }]);

console.log();
const user = {
  type: "object",
  required: ["name", "age"],
  properties: {
    name: { type: "string", minLength: 1 },
    age: { type: "integer", minimum: 0 },
    tags: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
};
check("user ok", validate({ name: "Al", age: 30 }, user), []);
check("user with tags", isValid({ name: "Al", age: 30, tags: ["a", "b"] }, user), true);
check("user missing both", validate({}, user), [
  { path: "$.name", message: "is required" },
  { path: "$.age", message: "is required" },
]);
check("user many errors", validate({ name: "", age: -1, extra: 1 }, user), [
  { path: "$.name", message: "must be at least 1 characters" },
  { path: "$.age", message: "must be >= 0" },
  { path: "$.extra", message: "is not allowed" },
]);
check("user extra allowed", isValid({ name: "A", age: 1, extra: 1 }, { properties: { name: {} } }), true);
check("nested path", validate({ tags: ["ok", 5] , name: "A", age: 1 }, user), [{ path: "$.tags[1]", message: "expected string but got number" }]);
check("first error text", firstError({ name: "A" }, user), "$.age is required");
check("first error none", firstError({ name: "A", age: 2 }, user), null);
const deep = { properties: { a: { type: "array", items: { properties: { b: { type: "integer" } } } } } };
check("deep path", validate({ a: [{ b: 1 }, { b: "x" }] }, deep), [{ path: "$.a[1].b", message: "expected integer but got string" }]);
check("required but wrong type", validate({ name: 5, age: 1 }, user), [{ path: "$.name", message: "expected string but got number" }]);
check("custom root path", validate(5, { type: "string" }, "$.root")[0].path, "$.root");

console.log();
let seed = 31337;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const samples = [0, 1, 5, 10, 11, -1, 2.5, "3", "", null, true, [], {}, [1], NaN, 100];
const intSchema = { type: "integer", minimum: 0, maximum: 10 };
let intOk = true;
let listOk = true;
let userOk = true;
for (let round = 0; round < 300; round++) {
  const v = samples[nextRandom(samples.length)];
  const expected = Number.isInteger(v) && v >= 0 && v <= 10;
  if (isValid(v, intSchema) !== expected) {
    intOk = false;
  }
  const items = [];
  const len = nextRandom(6);
  for (let i = 0; i < len; i++) {
    items.push(samples[nextRandom(samples.length)]);
  }
  const bad = items.filter((x) => !(Number.isInteger(x) && x >= 0 && x <= 10)).length;
  const errs = validate(items, { type: "array", items: intSchema });
  if (errs.length < bad || (bad === 0) !== (errs.length === 0)) {
    listOk = false;
  }
  const person = {};
  if (nextRandom(2) === 0) {
    person.name = samples[nextRandom(samples.length)];
  }
  if (nextRandom(2) === 0) {
    person.age = samples[nextRandom(samples.length)];
  }
  const good = typeof person.name === "string" && person.name.length >= 1 && Number.isInteger(person.age) && person.age >= 0;
  if (isValid(person, user) !== good) {
    userOk = false;
  }
}
check("300 integer checks", intOk, true);
check("300 list checks", listOk, true);
check("300 user checks", userOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
