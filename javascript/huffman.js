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

function frequencies(text) {
  if (typeof text !== "string") {
    throw new Error("text must be a string");
  }
  const map = new Map();
  for (const ch of text) {
    map.set(ch, (map.get(ch) || 0) + 1);
  }
  return map;
}

function buildTree(freq) {
  const chars = Array.from(freq.keys()).sort();
  let id = 0;
  const nodes = chars.map((ch) => ({ freq: freq.get(ch), ch: ch, id: id++, left: null, right: null }));
  if (nodes.length === 0) {
    return null;
  }
  while (nodes.length > 1) {
    nodes.sort((a, b) => a.freq - b.freq || a.id - b.id);
    const left = nodes.shift();
    const right = nodes.shift();
    nodes.push({ freq: left.freq + right.freq, ch: null, id: id++, left: left, right: right });
  }
  return nodes[0];
}

function buildCodes(text) {
  const tree = buildTree(frequencies(text));
  const codes = {};
  if (tree === null) {
    return codes;
  }
  if (tree.left === null) {
    codes[tree.ch] = "0";
    return codes;
  }
  const walk = (node, prefix) => {
    if (node.left === null) {
      codes[node.ch] = prefix;
      return;
    }
    walk(node.left, prefix + "0");
    walk(node.right, prefix + "1");
  };
  walk(tree, "");
  return codes;
}

function encode(text) {
  const codes = buildCodes(text);
  let bits = "";
  for (const ch of text) {
    bits += codes[ch];
  }
  return { bits: bits, codes: codes };
}

function decode(bits, codes) {
  if (typeof bits !== "string") {
    throw new Error("bits must be a string");
  }
  const reverse = new Map();
  for (const ch of Object.keys(codes)) {
    reverse.set(codes[ch], ch);
  }
  let out = "";
  let current = "";
  for (const bit of bits) {
    if (bit !== "0" && bit !== "1") {
      throw new Error("bits must be 0 or 1");
    }
    current += bit;
    if (reverse.has(current)) {
      out += reverse.get(current);
      current = "";
    }
  }
  if (current !== "") {
    throw new Error("bits end in the middle of a code");
  }
  return out;
}

function huffmanCost(freq) {
  const weights = Array.from(freq.values());
  if (weights.length === 0) {
    return 0;
  }
  if (weights.length === 1) {
    return weights[0];
  }
  let total = 0;
  while (weights.length > 1) {
    weights.sort((a, b) => a - b);
    const sum = weights.shift() + weights.shift();
    total += sum;
    weights.push(sum);
  }
  return total;
}

function isPrefixFree(codes) {
  const list = Object.keys(codes).map((k) => codes[k]);
  for (let i = 0; i < list.length; i++) {
    for (let j = 0; j < list.length; j++) {
      if (i !== j && list[j].startsWith(list[i])) {
        return false;
      }
    }
  }
  return true;
}

function entropy(freq) {
  let total = 0;
  for (const n of freq.values()) {
    total += n;
  }
  let h = 0;
  for (const n of freq.values()) {
    h -= (n / total) * Math.log2(n / total);
  }
  return h;
}

function compressionRatio(text) {
  return encode(text).bits.length / (text.length * 8);
}

const freq = frequencies("abracadabra");
check("freq a", freq.get("a"), 5);
check("freq b", freq.get("b"), 2);
check("freq r", freq.get("r"), 2);
check("freq c", freq.get("c"), 1);
check("freq distinct", freq.size, 5);
check("freq empty", frequencies("").size, 0);
check("freq not string", raises(() => frequencies(5)), true);

console.log();
const tiny = encode("aab");
check("tiny code a", tiny.codes.a, "1");
check("tiny code b", tiny.codes.b, "0");
check("tiny bits", tiny.bits, "110");
check("tiny decode", decode(tiny.bits, tiny.codes), "aab");
const one = encode("aaaa");
check("single symbol code", one.codes, { a: "0" });
check("single symbol bits", one.bits, "0000");
check("single symbol decode", decode(one.bits, one.codes), "aaaa");
const none = encode("");
check("empty codes", none.codes, {});
check("empty bits", none.bits, "");
check("empty decode", decode("", {}), "");
check("empty tree", buildTree(new Map()), null);

console.log();
const word = encode("abracadabra");
check("abracadabra bits", word.bits.length, 23);
check("abracadabra cost", huffmanCost(frequencies("abracadabra")), 23);
check("abracadabra decode", decode(word.bits, word.codes), "abracadabra");
check("abracadabra prefix free", isPrefixFree(word.codes), true);
check("most common is shortest", word.codes.a.length <= word.codes.c.length, true);
check("code count", Object.keys(word.codes).length, 5);
check("codes are binary", Object.values(word.codes).every((c) => /^[01]+$/.test(c)), true);
const accent = encode("h\u00e9llo w\u00f6rld");
check("unicode decode", decode(accent.bits, accent.codes), "h\u00e9llo w\u00f6rld");
check("ratio repeated", compressionRatio("aaaaaaaa"), 0.125);
check("ratio below one", compressionRatio("abracadabra") < 1, true);

console.log();
check("decode bad digit", raises(() => decode("102", word.codes)), true);
check("decode cut short", raises(() => decode(word.bits + "1", { a: "00", b: "01", c: "10", d: "110" })), true);
check("decode not string", raises(() => decode(5, {})), true);
check("prefix free false", isPrefixFree({ a: "0", b: "01" }), false);
check("prefix free true", isPrefixFree({ a: "0", b: "10", c: "11" }), true);
check("entropy even", entropy(frequencies("abab")), 1);
check("entropy single", entropy(frequencies("aaaa")), 0);
check("entropy four way", entropy(frequencies("abcd")), 2);

console.log();
let seed = 1952;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const letters = "abcdefg";
let roundOk = true;
let costOk = true;
let prefixOk = true;
let boundOk = true;
for (let round = 0; round < 300; round++) {
  let text = "";
  const len = 1 + nextRandom(60);
  for (let i = 0; i < len; i++) {
    text += letters[nextRandom(nextRandom(7) + 1)];
  }
  const result = encode(text);
  if (decode(result.bits, result.codes) !== text) {
    roundOk = false;
  }
  const f = frequencies(text);
  if (result.bits.length !== huffmanCost(f)) {
    costOk = false;
  }
  if (!isPrefixFree(result.codes)) {
    prefixOk = false;
  }
  if (f.size >= 2) {
    const h = entropy(f);
    if (result.bits.length < h * len - 1e-9 || result.bits.length >= (h + 1) * len) {
      boundOk = false;
    }
  }
}
check("300 round trips", roundOk, true);
check("300 optimal costs", costOk, true);
check("300 prefix free sets", prefixOk, true);
check("300 entropy bounds", boundOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
