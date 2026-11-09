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

function luhnSum(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) {
        d -= 9;
      }
    }
    sum += d;
    double = !double;
  }
  return sum;
}

function luhnValid(text) {
  if (typeof text !== "string") {
    return false;
  }
  const digits = text.replace(/[\s-]/g, "");
  if (!/^\d{2,}$/.test(digits)) {
    return false;
  }
  return luhnSum(digits) % 10 === 0;
}

function luhnCompute(partial) {
  if (typeof partial !== "string" || !/^\d+$/.test(partial)) {
    throw new Error("partial must be digits");
  }
  return (10 - (luhnSum(partial + "0") % 10)) % 10;
}

function isbn10Valid(text) {
  if (typeof text !== "string") {
    return false;
  }
  const s = text.replace(/[\s-]/g, "");
  if (!/^\d{9}[\dX]$/.test(s)) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const d = s[i] === "X" ? 10 : Number(s[i]);
    sum += (10 - i) * d;
  }
  return sum % 11 === 0;
}

function isbn13Check(first12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

function isbn13Valid(text) {
  if (typeof text !== "string") {
    return false;
  }
  const s = text.replace(/[\s-]/g, "");
  if (!/^\d{13}$/.test(s)) {
    return false;
  }
  return isbn13Check(s.slice(0, 12)) === Number(s[12]);
}

function isbn10To13(text) {
  if (!isbn10Valid(text)) {
    throw new Error("not a valid isbn 10");
  }
  const body = "978" + text.replace(/[\s-]/g, "").slice(0, 9);
  return body + isbn13Check(body);
}

function mod97(text) {
  let rem = 0;
  for (const ch of text) {
    rem = (rem * 10 + Number(ch)) % 97;
  }
  return rem;
}

function toDigits(text) {
  let out = "";
  for (const ch of text) {
    out += /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
  }
  return out;
}

function ibanValid(text) {
  if (typeof text !== "string") {
    return false;
  }
  const s = text.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) {
    return false;
  }
  return mod97(toDigits(s.slice(4) + s.slice(0, 4))) === 1;
}

function ibanCheckDigits(country, bban) {
  if (!/^[A-Z]{2}$/.test(country) || !/^[A-Z0-9]+$/.test(bban)) {
    throw new Error("bad country or account number");
  }
  const rem = mod97(toDigits(bban + country + "00"));
  return String(98 - rem).padStart(2, "0");
}

function adler32(text) {
  const bytes = Buffer.from(text, "utf8");
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

const TABLE = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  TABLE.push(c >>> 0);
}

function crc32(text, previous = 0) {
  const bytes = Buffer.from(text, "utf8");
  let crc = (previous ^ 0xffffffff) >>> 0;
  for (const byte of bytes) {
    crc = (TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const hex32 = (n) => n.toString(16).padStart(8, "0");

check("luhn classic", luhnValid("79927398713"), true);
check("luhn wrong digit", luhnValid("79927398710"), false);
check("luhn visa test", luhnValid("4111111111111111"), true);
check("luhn with spaces", luhnValid("4111 1111 1111 1111"), true);
check("luhn with dashes", luhnValid("4111-1111-1111-1111"), true);
check("luhn other card", luhnValid("1234567812345670"), true);
check("luhn letters", luhnValid("abc"), false);
check("luhn empty", luhnValid(""), false);
check("luhn single digit", luhnValid("0"), false);
check("luhn number input", luhnValid(79927398713), false);
check("luhn compute", luhnCompute("7992739871"), 3);
check("luhn compute visa", luhnCompute("411111111111111"), 1);
check("luhn compute zero", luhnCompute("0"), 0);
check("luhn compute letters", raises(() => luhnCompute("12a")), true);

console.log();
check("isbn10 valid", isbn10Valid("0306406152"), true);
check("isbn10 with dashes", isbn10Valid("0-306-40615-2"), true);
check("isbn10 ends with X", isbn10Valid("080442957X"), true);
check("isbn10 wrong digit", isbn10Valid("0306406153"), false);
check("isbn10 too short", isbn10Valid("123"), false);
check("isbn10 early X", isbn10Valid("03064061X2"), false);
check("isbn10 not string", isbn10Valid(5), false);
check("isbn13 valid", isbn13Valid("9780306406157"), true);
check("isbn13 with dashes", isbn13Valid("978-0-306-40615-7"), true);
check("isbn13 other", isbn13Valid("9791234567896"), true);
check("isbn13 wrong digit", isbn13Valid("9780306406158"), false);
check("isbn13 too short", isbn13Valid("978030640615"), false);
check("convert 10 to 13", isbn10To13("0306406152"), "9780306406157");
check("convert with X", isbn10To13("080442957X"), "9780804429573");
check("convert dashed", isbn10To13("0-306-40615-2"), "9780306406157");
check("convert invalid", raises(() => isbn10To13("0306406153")), true);
check("converted is valid", isbn13Valid(isbn10To13("080442957X")), true);

console.log();
check("iban gb", ibanValid("GB82 WEST 1234 5698 7654 32"), true);
check("iban de", ibanValid("DE89370400440532013000"), true);
check("iban fr", ibanValid("FR1420041010050500013M02606"), true);
check("iban nl", ibanValid("NL91ABNA0417164300"), true);
check("iban lowercase", ibanValid("gb82west12345698765432"), true);
check("iban wrong digit", ibanValid("GB82WEST12345698765433"), false);
check("iban wrong check", ibanValid("GB83WEST12345698765432"), false);
check("iban too short", ibanValid("GB82"), false);
check("iban bad chars", ibanValid("GB82-WEST-1234!"), false);
check("iban not string", ibanValid(5), false);
check("check digits gb", ibanCheckDigits("GB", "WEST12345698765432"), "82");
check("check digits de", ibanCheckDigits("DE", "370400440532013000"), "89");
check("check digits bad country", raises(() => ibanCheckDigits("gb", "123")), true);

console.log();
check("adler empty", adler32(""), 1);
check("adler abc", hex32(adler32("abc")), "024d0127");
check("adler wikipedia", hex32(adler32("Wikipedia")), "11e60398");
check("crc empty", crc32(""), 0);
check("crc a", hex32(crc32("a")), "e8b7be43");
check("crc abc", hex32(crc32("abc")), "352441c2");
check("crc digits", hex32(crc32("123456789")), "cbf43926");
check("crc fox", hex32(crc32("The quick brown fox jumps over the lazy dog")), "414fa339");
check("crc chained", crc32("456789", crc32("123")), crc32("123456789"));
check("crc unicode differs", crc32("\u00e9") === crc32("e"), false);

console.log();
let seed = 1991;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
function randomDigits(len) {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += String(nextRandom(10));
  }
  return s;
}
let luhnOk = true;
let errorOk = true;
let ibanOk = true;
let isbnOk = true;
let crcOk = true;
for (let round = 0; round < 300; round++) {
  const partial = randomDigits(1 + nextRandom(18));
  const full = partial + luhnCompute(partial);
  if (!luhnValid(full)) {
    luhnOk = false;
  }
  const pos = nextRandom(full.length);
  const wrong = (Number(full[pos]) + 1 + nextRandom(9)) % 10;
  const broken = full.slice(0, pos) + wrong + full.slice(pos + 1);
  if (luhnValid(broken)) {
    errorOk = false;
  }
  const bban = randomDigits(11 + nextRandom(15));
  if (!ibanValid("XX" + ibanCheckDigits("XX", bban) + bban)) {
    ibanOk = false;
  }
  const body = "978" + randomDigits(9);
  if (!isbn13Valid(body + isbn13Check(body))) {
    isbnOk = false;
  }
  let a = "";
  let b = "";
  for (let i = 0; i < nextRandom(20); i++) {
    a += String.fromCharCode(32 + nextRandom(200));
  }
  for (let i = 0; i < nextRandom(20); i++) {
    b += String.fromCharCode(32 + nextRandom(200));
  }
  if (crc32(a + b) !== crc32(b, crc32(a))) {
    crcOk = false;
  }
}
check("300 luhn numbers", luhnOk, true);
check("300 single digit errors", errorOk, true);
check("300 iban numbers", ibanOk, true);
check("300 isbn13 numbers", isbnOk, true);
check("300 crc chains", crcOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
