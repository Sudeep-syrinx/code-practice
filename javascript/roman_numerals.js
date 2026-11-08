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

const VALUES = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

function toRoman(n) {
  if (!Number.isInteger(n) || n < 1 || n > 3999) {
    throw new Error("number must be an integer from 1 to 3999");
  }
  let out = "";
  for (const [value, symbol] of VALUES) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
}

function fromRoman(text) {
  let total = 0;
  let pos = 0;
  for (const [value, symbol] of VALUES) {
    while (text.startsWith(symbol, pos)) {
      total += value;
      pos += symbol.length;
    }
  }
  if (pos !== text.length) {
    throw new Error("bad roman numeral: " + text);
  }
  if (toRoman(total) !== text) {
    throw new Error("not a valid roman numeral: " + text);
  }
  return total;
}

check("1 is I", toRoman(1), "I");
check("4 is IV", toRoman(4), "IV");
check("9 is IX", toRoman(9), "IX");
check("14 is XIV", toRoman(14), "XIV");
check("40 is XL", toRoman(40), "XL");
check("90 is XC", toRoman(90), "XC");
check("400 is CD", toRoman(400), "CD");
check("2024", toRoman(2024), "MMXXIV");
check("1994", toRoman(1994), "MCMXCIV");
check("3999", toRoman(3999), "MMMCMXCIX");
check("zero raises", raises(() => toRoman(0)), true);
check("4000 raises", raises(() => toRoman(4000)), true);
check("decimal raises", raises(() => toRoman(1.5)), true);
check("text raises", raises(() => toRoman("5")), true);

console.log();
check("from I", fromRoman("I"), 1);
check("from IV", fromRoman("IV"), 4);
check("from XIV", fromRoman("XIV"), 14);
check("from MCMXCIV", fromRoman("MCMXCIV"), 1994);
check("from MMMCMXCIX", fromRoman("MMMCMXCIX"), 3999);
check("from IIII raises", raises(() => fromRoman("IIII")), true);
check("from ABC raises", raises(() => fromRoman("ABC")), true);
check("from IC raises", raises(() => fromRoman("IC")), true);
check("from empty raises", raises(() => fromRoman("")), true);

let allOk = true;
for (let i = 1; i <= 3999; i++) {
  if (fromRoman(toRoman(i)) !== i) {
    allOk = false;
  }
}
check("3999 round trips", allOk, true);

let lengthOk = true;
for (let i = 1; i <= 3999; i++) {
  if (toRoman(i).length > 15) {
    lengthOk = false;
  }
}
check("no numeral too long", lengthOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
