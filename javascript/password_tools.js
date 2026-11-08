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

function hasUpper(text) {
  return /[A-Z]/.test(text);
}

function hasLower(text) {
  return /[a-z]/.test(text);
}

function hasDigit(text) {
  return /[0-9]/.test(text);
}

function hasSymbol(text) {
  return /[^A-Za-z0-9]/.test(text);
}

function strength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (hasUpper(password)) score++;
  if (hasLower(password)) score++;
  if (hasDigit(password)) score++;
  if (hasSymbol(password)) score++;
  return score;
}

function strengthLabel(password) {
  const score = strength(password);
  if (score <= 2) {
    return "weak";
  }
  if (score <= 4) {
    return "medium";
  }
  return "strong";
}

function caesar(text, shift) {
  const n = ((shift % 26) + 26) % 26;
  let out = "";
  for (const ch of text) {
    if (ch >= "a" && ch <= "z") {
      out += String.fromCharCode(((ch.charCodeAt(0) - 97 + n) % 26) + 97);
    } else if (ch >= "A" && ch <= "Z") {
      out += String.fromCharCode(((ch.charCodeAt(0) - 65 + n) % 26) + 65);
    } else {
      out += ch;
    }
  }
  return out;
}

function isAnagram(a, b) {
  const clean = (t) => t.toLowerCase().replace(/[^a-z]/g, "").split("").sort().join("");
  return clean(a) === clean(b);
}

function reverseWords(text) {
  return text.trim().split(/\s+/).reverse().join(" ");
}

function capitalizeWords(text) {
  return text
    .split(" ")
    .map((w) => (w === "" ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

check("has upper yes", hasUpper("abC"), true);
check("has upper no", hasUpper("abc"), false);
check("has lower yes", hasLower("ABc"), true);
check("has lower no", hasLower("ABC"), false);
check("has digit yes", hasDigit("a1"), true);
check("has digit no", hasDigit("abc"), false);
check("has symbol yes", hasSymbol("a!"), true);
check("has symbol no", hasSymbol("abc123"), false);

console.log();
check("strength empty", strength(""), 0);
check("strength abc", strength("abc"), 1);
check("strength 8 lower", strength("abcdefgh"), 2);
check("strength numbers", strength("12345678"), 2);
check("strength medium", strength("Abcdefg1"), 4);
check("strength 10 chars", strength("Abcdefgh1!"), 5);
check("strength max", strength("Abcdefg1!xyz"), 6);
check("label empty", strengthLabel(""), "weak");
check("label weak", strengthLabel("abcdefgh"), "weak");
check("label medium", strengthLabel("Abcdefg1"), "medium");
check("label strong", strengthLabel("Abcdefg1!xyz"), "strong");

console.log();
check("caesar plus one", caesar("abc", 1), "bcd");
check("caesar wraps", caesar("xyz", 3), "abc");
check("caesar minus one", caesar("abc", -1), "zab");
check("caesar full circle", caesar("hello", 26), "hello");
check("caesar keeps case", caesar("Hello, World!", 5), "Mjqqt, Btwqi!");
check("caesar empty", caesar("", 5), "");
let caesarOk = true;
for (let shift = -30; shift <= 30; shift++) {
  if (caesar(caesar("The Quick Brown Fox!", shift), -shift) !== "The Quick Brown Fox!") {
    caesarOk = false;
  }
}
check("61 shifts round trip", caesarOk, true);

console.log();
check("anagram yes", isAnagram("Listen", "Silent"), true);
check("anagram no", isAnagram("abc", "abd"), false);
check("anagram phrase", isAnagram("a gentleman", "elegant man"), true);
check("anagram empty", isAnagram("", ""), true);
check("reverse words", reverseWords("one two three"), "three two one");
check("reverse one word", reverseWords("solo"), "solo");
check("reverse spaces", reverseWords("  a   b  "), "b a");
check("capitalize", capitalizeWords("hello big world"), "Hello Big World");
check("capitalize empty", capitalizeWords(""), "");

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
