const results = [];

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function words(text) {
  return text.toLowerCase().match(/[a-z0-9']+/g) || [];
}

function countWords(text) {
  return words(text).length;
}

function countSentences(text) {
  return text
    .split(/[.!?]+/)
    .filter((part) => part.trim() !== "").length;
}

function countLines(text) {
  return text.split("\n").filter((line) => line.trim() !== "").length;
}

function charCount(text) {
  return text.replace(/\s/g, "").length;
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

function avgWordLength(text) {
  const list = words(text);
  if (list.length === 0) {
    return 0;
  }
  let total = 0;
  for (const w of list) {
    total += w.length;
  }
  return round2(total / list.length);
}

function wordFrequency(text) {
  const freq = {};
  for (const w of words(text)) {
    freq[w] = (freq[w] || 0) + 1;
  }
  return freq;
}

function topWords(text, n) {
  const freq = wordFrequency(text);
  return Object.keys(freq)
    .sort((a, b) => {
      if (freq[b] !== freq[a]) {
        return freq[b] - freq[a];
      }
      return a < b ? -1 : 1;
    })
    .slice(0, n);
}

function uniqueWords(text) {
  return Object.keys(wordFrequency(text)).length;
}

function longestWord(text) {
  let best = "";
  for (const w of words(text)) {
    if (w.length > best.length) {
      best = w;
    }
  }
  return best;
}

function wordsStartingWith(text, letter) {
  const found = new Set();
  for (const w of words(text)) {
    if (w.startsWith(letter.toLowerCase())) {
      found.add(w);
    }
  }
  return Array.from(found).sort();
}

function isPangram(text) {
  const letters = new Set(text.toLowerCase().replace(/[^a-z]/g, "").split(""));
  return letters.size === 26;
}

function readingTime(text) {
  const count = countWords(text);
  if (count === 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(count / 200));
}

function findPalindromes(text) {
  const found = new Set();
  for (const w of words(text)) {
    if (w.length > 1 && w === w.split("").reverse().join("")) {
      found.add(w);
    }
  }
  return Array.from(found).sort();
}

const sample = "The quick brown fox jumps over the lazy dog. The dog sleeps!";

check("word count", countWords(sample), 12);
check("sentence count", countSentences(sample), 2);
check("unique words", uniqueWords(sample), 9);
check("average length", avgWordLength(sample), 3.92);
check("longest word", longestWord(sample), "sleeps");
check("count the", wordFrequency(sample).the, 3);
check("count dog", wordFrequency(sample).dog, 2);
check("count fox", wordFrequency(sample).fox, 1);
check("top 2 words", topWords(sample, 2), ["the", "dog"]);
check("top 4 words", topWords(sample, 4), ["the", "dog", "brown", "fox"]);
check("top 0 words", topWords(sample, 0), []);
check("reading time", readingTime(sample), 1);

console.log();
check("words simple", words("Hello, World!"), ["hello", "world"]);
check("words apostrophe", words("Don't stop"), ["don't", "stop"]);
check("words numbers", words("room 42 now"), ["room", "42", "now"]);
check("words empty", words(""), []);
check("words only symbols", words("!!! ???"), []);
check("count empty", countWords("   "), 0);
check("avg empty", avgWordLength(""), 0);
check("longest empty", longestWord(""), "");
check("longest tie first", longestWord("aa bb c"), "aa");

console.log();
check("sentences three", countSentences("Hello world. How are you? Fine!"), 3);
check("sentences none", countSentences("no punctuation"), 1);
check("sentences empty", countSentences(""), 0);
check("sentences dots", countSentences("Wait... what?!"), 2);
check("lines", countLines("a\n\nb\nc"), 3);
check("lines empty", countLines(""), 0);
check("lines spaces", countLines("  \n \n"), 0);
check("char count", charCount("a b c"), 3);
check("char count tabs", charCount("a\tb\nc"), 3);
check("vowels", countVowels("Hello World"), 3);
check("vowels none", countVowels("rhythm"), 0);
check("vowels upper", countVowels("AEIOU"), 5);

console.log();
check("starts with t", wordsStartingWith(sample, "t"), ["the"]);
check("starts with d", wordsStartingWith(sample, "d"), ["dog"]);
check("starts with upper", wordsStartingWith(sample, "J"), ["jumps"]);
check("starts with none", wordsStartingWith(sample, "z"), []);
check("pangram yes", isPangram("The quick brown fox jumps over the lazy dog"), true);
check("pangram no", isPangram("hello world"), false);
check("pangram empty", isPangram(""), false);
check("pangram mixed", isPangram("Pack my box with five dozen liquor jugs!"), true);
check("palindromes", findPalindromes("level noon abc racecar a"), ["level", "noon", "racecar"]);
check("palindromes none", findPalindromes("one two three"), []);
check("palindromes repeat", findPalindromes("noon noon"), ["noon"]);

console.log();
check("reading 400 words", readingTime("word ".repeat(400)), 2);
check("reading 401 words", readingTime("word ".repeat(401)), 3);
check("reading 200 words", readingTime("word ".repeat(200)), 1);
check("reading 1 word", readingTime("word"), 1);
check("reading empty", readingTime(""), 0);

console.log();
const big = "alpha beta gamma. ".repeat(1000);
check("big word count", countWords(big), 3000);
check("big sentences", countSentences(big), 1000);
check("big unique", uniqueWords(big), 3);
check("big frequency", wordFrequency(big), { alpha: 1000, beta: 1000, gamma: 1000 });
check("big top word", topWords(big, 1), ["alpha"]);
check("big reading time", readingTime(big), 15);
check("big longest", longestWord(big), "alpha");
check("big average", avgWordLength(big), 4.67);
check("big starts with b", wordsStartingWith(big, "b"), ["beta"]);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
