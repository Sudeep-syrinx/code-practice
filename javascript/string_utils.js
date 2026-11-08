const results = [];

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}

function capitalize(text) {
  if (text.length === 0) {
    return text;
  }
  return text[0].toUpperCase() + text.slice(1).toLowerCase();
}

function titleCase(text) {
  return text
    .split(" ")
    .filter((w) => w.length > 0)
    .map(capitalize)
    .join(" ");
}

function reverseText(text) {
  return text.split("").reverse().join("");
}

function isPalindrome(text) {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned === reverseText(cleaned);
}

function countVowels(text) {
  let count = 0;
  for (const ch of text.toLowerCase()) {
    if ("aeiou".includes(ch)) {
      count++;
    }
  }
  return count;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function camelCase(text) {
  const words = text.split(/[\s_-]+/).filter(Boolean);
  return words
    .map((w, i) => (i === 0 ? w.toLowerCase() : capitalize(w)))
    .join("");
}

function snakeCase(text) {
  return text
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase())
    .join("_");
}

function truncate(text, max) {
  if (text.length <= max) {
    return text;
  }
  return text.slice(0, max - 3) + "...";
}

function caesar(text, shift) {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 97 && code <= 122) {
      out += String.fromCharCode(((code - 97 + shift) % 26 + 26) % 26 + 97);
    } else if (code >= 65 && code <= 90) {
      out += String.fromCharCode(((code - 65 + shift) % 26 + 26) % 26 + 65);
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

function mostCommonChar(text) {
  const counts = {};
  let best = "";
  let bestCount = 0;
  for (const ch of text) {
    counts[ch] = (counts[ch] || 0) + 1;
    if (counts[ch] > bestCount) {
      best = ch;
      bestCount = counts[ch];
    }
  }
  return best;
}

function countOccurrences(text, part) {
  if (part.length === 0) {
    return 0;
  }
  let count = 0;
  let pos = text.indexOf(part);
  while (pos !== -1) {
    count++;
    pos = text.indexOf(part, pos + part.length);
  }
  return count;
}

function repeatText(text, times) {
  let out = "";
  for (let i = 0; i < times; i++) {
    out += text;
  }
  return out;
}

function isNumeric(text) {
  return /^-?\d+(\.\d+)?$/.test(text.trim());
}

function removeDuplicates(text) {
  let out = "";
  for (const ch of text) {
    if (!out.includes(ch)) {
      out += ch;
    }
  }
  return out;
}

function padCenter(text, width, fill) {
  if (text.length >= width) {
    return text;
  }
  const total = width - text.length;
  const left = Math.floor(total / 2);
  const right = total - left;
  return fill.repeat(left) + text + fill.repeat(right);
}

check("capitalize", capitalize("hELLO"), "Hello");
check("capitalize empty", capitalize(""), "");
check("title case", titleCase("hello big WORLD"), "Hello Big World");
check("title case spaces", titleCase("  a   b "), "A B");
check("reverse", reverseText("abc"), "cba");
check("reverse empty", reverseText(""), "");

console.log();
check("palindrome yes", isPalindrome("A man, a plan, a canal: Panama"), true);
check("palindrome no", isPalindrome("hello"), false);
check("palindrome empty", isPalindrome(""), true);
check("count vowels", countVowels("Hello World"), 3);
check("no vowels", countVowels("rhythm"), 0);
check("word count", wordCount("  the quick  brown fox "), 4);
check("word count empty", wordCount("   "), 0);

console.log();
check("camel case", camelCase("hello big world"), "helloBigWorld");
check("camel from snake", camelCase("my_var_name"), "myVarName");
check("snake case", snakeCase("Hello Big World"), "hello_big_world");
check("snake from dash", snakeCase("my-var-name"), "my_var_name");
check("truncate long", truncate("abcdefgh", 5), "ab...");
check("truncate short", truncate("abc", 5), "abc");
check("truncate exact", truncate("abcde", 5), "abcde");

console.log();
check("caesar encode", caesar("Hello, World!", 3), "Khoor, Zruog!");
check("caesar decode", caesar("Khoor, Zruog!", -3), "Hello, World!");
check("caesar wraps", caesar("xyz", 3), "abc");
check("caesar big shift", caesar("abc", 29), "def");
check("caesar round trip", caesar(caesar("Node 22", 9), -9), "Node 22");

console.log();
check("anagram yes", isAnagram("Listen", "Silent"), true);
check("anagram no", isAnagram("hello", "world"), false);
check("most common", mostCommonChar("hello"), "l");
check("most common tie", mostCommonChar("abab"), "a");
check("occurrences", countOccurrences("banana", "an"), 2);
check("occurrences none", countOccurrences("banana", "xyz"), 0);
check("occurrences empty", countOccurrences("banana", ""), 0);
check("repeat", repeatText("ab", 3), "ababab");
check("repeat zero", repeatText("ab", 0), "");

console.log();
check("numeric int", isNumeric("42"), true);
check("numeric decimal", isNumeric("-3.14"), true);
check("numeric bad", isNumeric("12a"), false);
check("numeric empty", isNumeric(""), false);
check("remove duplicates", removeDuplicates("banana"), "ban");
check("pad center", padCenter("hi", 6, "*"), "**hi**");
check("pad center odd", padCenter("hi", 7, "-"), "--hi---");
check("pad no change", padCenter("hello", 3, "*"), "hello");

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
