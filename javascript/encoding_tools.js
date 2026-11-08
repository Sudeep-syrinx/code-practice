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

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function byteList(text) {
  if (typeof text !== "string") {
    throw new Error("text must be a string");
  }
  const bytes = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 255) {
      throw new Error("character is outside the 0 to 255 range");
    }
    bytes.push(code);
  }
  return bytes;
}

function toBase64(text) {
  const bytes = byteList(text);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (b0 << 16) | (b1 << 8) | b2;
    out += B64[(n >> 18) & 63];
    out += B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? B64[n & 63] : "=";
  }
  return out;
}

function fromBase64(code) {
  if (typeof code !== "string" || code.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(code)) {
    throw new Error("bad base64 text");
  }
  let out = "";
  for (let i = 0; i < code.length; i += 4) {
    const chunk = code.slice(i, i + 4);
    const pad = chunk.split("=").length - 1;
    let n = 0;
    for (const ch of chunk) {
      n = n * 64 + (ch === "=" ? 0 : B64.indexOf(ch));
    }
    out += String.fromCharCode((n >> 16) & 255);
    if (pad < 2) {
      out += String.fromCharCode((n >> 8) & 255);
    }
    if (pad < 1) {
      out += String.fromCharCode(n & 255);
    }
  }
  return out;
}

function toHex(text) {
  return byteList(text)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(code) {
  if (typeof code !== "string" || code.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(code)) {
    throw new Error("bad hex text");
  }
  let out = "";
  for (let i = 0; i < code.length; i += 2) {
    out += String.fromCharCode(parseInt(code.slice(i, i + 2), 16));
  }
  return out;
}

function rleEncode(text) {
  if (typeof text !== "string") {
    throw new Error("text must be a string");
  }
  if (/[0-9]/.test(text)) {
    throw new Error("text must not contain digits");
  }
  let out = "";
  let i = 0;
  while (i < text.length) {
    let j = i;
    while (j < text.length && text[j] === text[i]) {
      j++;
    }
    out += String(j - i) + text[i];
    i = j;
  }
  return out;
}

function rleDecode(code) {
  if (typeof code !== "string" || !/^([0-9]+[^0-9])*$/.test(code)) {
    throw new Error("bad run length text");
  }
  let out = "";
  const re = /([0-9]+)([^0-9])/g;
  let m = re.exec(code);
  while (m !== null) {
    out += m[2].repeat(Number(m[1]));
    m = re.exec(code);
  }
  return out;
}

function longestRun(text) {
  if (text === "") {
    return null;
  }
  let best = { char: text[0], length: 1 };
  let i = 0;
  while (i < text.length) {
    let j = i;
    while (j < text.length && text[j] === text[i]) {
      j++;
    }
    if (j - i > best.length) {
      best = { char: text[i], length: j - i };
    }
    i = j;
  }
  return best;
}

check("base64 Man", toBase64("Man"), "TWFu");
check("base64 Ma", toBase64("Ma"), "TWE=");
check("base64 M", toBase64("M"), "TQ==");
check("base64 empty", toBase64(""), "");
check("base64 hello world", toBase64("hello world"), "aGVsbG8gd29ybGQ=");
check("base64 greeting", toBase64("Hello, World!"), "SGVsbG8sIFdvcmxkIQ==");
check("base64 abcdefg", toBase64("abcdefg"), "YWJjZGVmZw==");
check("base64 latin letter", toBase64("\u00e9"), "6Q==");
check("base64 wide char raises", raises(() => toBase64("\u20ac")), true);
check("base64 number raises", raises(() => toBase64(5)), true);

console.log();
check("decode Man", fromBase64("TWFu"), "Man");
check("decode Ma", fromBase64("TWE="), "Ma");
check("decode M", fromBase64("TQ=="), "M");
check("decode empty", fromBase64(""), "");
check("decode hello", fromBase64("aGVsbG8gd29ybGQ="), "hello world");
check("decode latin letter", fromBase64("6Q=="), "\u00e9");
check("decode bad length", raises(() => fromBase64("abc")), true);
check("decode bad char", raises(() => fromBase64("ab$d")), true);
check("decode early pad", raises(() => fromBase64("=abc")), true);
check("decode too much pad", raises(() => fromBase64("A===")), true);
check("decode only pad", raises(() => fromBase64("====")), true);
check("decode number raises", raises(() => fromBase64(5)), true);

console.log();
check("hex Hi", toHex("Hi"), "4869");
check("hex empty", toHex(""), "");
check("hex newline", toHex("\n"), "0a");
check("hex top byte", toHex("\u00ff"), "ff");
check("hex wide char raises", raises(() => toHex("\u20ac")), true);
check("from hex Hi", fromHex("4869"), "Hi");
check("from hex upper", fromHex("4A"), "J");
check("from hex empty", fromHex(""), "");
check("from hex odd raises", raises(() => fromHex("486")), true);
check("from hex bad raises", raises(() => fromHex("zz")), true);

console.log();
check("rle simple", rleEncode("aaabccdddd"), "3a1b2c4d");
check("rle empty", rleEncode(""), "");
check("rle single", rleEncode("a"), "1a");
check("rle one run", rleEncode("aaaa"), "4a");
check("rle no runs", rleEncode("abc"), "1a1b1c");
check("rle split runs", rleEncode("aaabaaa"), "3a1b3a");
check("rle spaces", rleEncode("aa  b"), "2a2 1b");
check("rle digit raises", raises(() => rleEncode("a1")), true);
check("rle number raises", raises(() => rleEncode(5)), true);
check("rle decode", rleDecode("3a1b"), "aaab");
check("rle decode empty", rleDecode(""), "");
check("rle decode long", rleDecode("12a").length, 12);
check("rle decode spaces", rleDecode("2a2 1b"), "aa  b");
check("rle decode text raises", raises(() => rleDecode("abc")), true);
check("rle decode count only", raises(() => rleDecode("3")), true);
check("rle decode reversed", raises(() => rleDecode("a3")), true);
check("rle decode mixed", raises(() => rleDecode("3a4")), true);

console.log();
check("longest run", longestRun("aabbbcc"), { char: "b", length: 3 });
check("longest run all single", longestRun("abc"), { char: "a", length: 1 });
check("longest run tie", longestRun("aabb"), { char: "a", length: 2 });
check("longest run empty", longestRun(""), null);
check("longest run one char", longestRun("zzzzz"), { char: "z", length: 5 });
check("longest run last", longestRun("abbccc"), { char: "c", length: 3 });

console.log();
let seed = 31;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
function randomBytes(maxLen) {
  let s = "";
  const len = nextRandom(maxLen);
  for (let i = 0; i < len; i++) {
    s += String.fromCharCode(nextRandom(256));
  }
  return s;
}
let b64Ok = true;
let hexOk = true;
for (let n = 0; n < 300; n++) {
  const text = randomBytes(40);
  const encoded = toBase64(text);
  if (fromBase64(encoded) !== text) {
    b64Ok = false;
  }
  if (encoded.length !== Math.ceil(text.length / 3) * 4) {
    b64Ok = false;
  }
  if (fromHex(toHex(text)) !== text) {
    hexOk = false;
  }
  if (toHex(text).length !== text.length * 2) {
    hexOk = false;
  }
}
check("300 base64 round trips", b64Ok, true);
check("300 hex round trips", hexOk, true);

const letters = "abcxyz ";
let rleOk = true;
let runOk = true;
for (let n = 0; n < 300; n++) {
  let text = "";
  const len = nextRandom(40);
  for (let i = 0; i < len; i++) {
    text += letters[nextRandom(letters.length)];
  }
  if (rleDecode(rleEncode(text)) !== text) {
    rleOk = false;
  }
  const run = longestRun(text);
  if (text.length > 0 && !text.includes(run.char.repeat(run.length))) {
    runOk = false;
  }
  if (text.length > 0 && text.includes(run.char.repeat(run.length + 1))) {
    runOk = false;
  }
}
check("300 rle round trips", rleOk, true);
check("300 longest runs valid", runOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
