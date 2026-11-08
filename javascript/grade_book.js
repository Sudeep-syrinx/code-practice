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

function letter(avg) {
  if (avg >= 90) {
    return "A";
  }
  if (avg >= 80) {
    return "B";
  }
  if (avg >= 70) {
    return "C";
  }
  if (avg >= 60) {
    return "D";
  }
  return "F";
}

class GradeBook {
  constructor() {
    this.students = new Map();
  }

  addStudent(name) {
    if (!name) {
      throw new Error("name is required");
    }
    if (this.students.has(name)) {
      throw new Error("duplicate student: " + name);
    }
    this.students.set(name, new Map());
  }

  scoresMap(name) {
    if (!this.students.has(name)) {
      throw new Error("no such student: " + name);
    }
    return this.students.get(name);
  }

  addScore(name, subject, score) {
    const scores = this.scoresMap(name);
    if (!subject) {
      throw new Error("subject is required");
    }
    if (typeof score !== "number" || Number.isNaN(score) || score < 0 || score > 100) {
      throw new Error("score must be a number from 0 to 100");
    }
    scores.set(subject, score);
  }

  rawAverage(name, bonus = 0) {
    const scores = this.scoresMap(name);
    if (scores.size === 0) {
      throw new Error("no scores for " + name);
    }
    let total = 0;
    for (const s of scores.values()) {
      total += Math.min(100, s + bonus);
    }
    return total / scores.size;
  }

  average(name) {
    return Math.round(this.rawAverage(name) * 100) / 100;
  }

  curvedAverage(name, points) {
    return Math.round(this.rawAverage(name, points) * 100) / 100;
  }

  gradeOf(name) {
    return letter(this.rawAverage(name));
  }

  studentCount() {
    return this.students.size;
  }

  names() {
    return Array.from(this.students.keys()).sort();
  }

  scoredNames() {
    return this.names().filter((n) => this.students.get(n).size > 0);
  }

  subjects() {
    const found = new Set();
    for (const scores of this.students.values()) {
      for (const subject of scores.keys()) {
        found.add(subject);
      }
    }
    return Array.from(found).sort();
  }

  subjectAverage(subject) {
    let total = 0;
    let count = 0;
    for (const scores of this.students.values()) {
      if (scores.has(subject)) {
        total += scores.get(subject);
        count++;
      }
    }
    if (count === 0) {
      throw new Error("no scores for subject " + subject);
    }
    return Math.round((total / count) * 100) / 100;
  }

  ranking() {
    return this.scoredNames().sort((a, b) => {
      const diff = this.rawAverage(b) - this.rawAverage(a);
      if (diff !== 0) {
        return diff;
      }
      return a < b ? -1 : 1;
    });
  }

  topStudent() {
    const ranked = this.ranking();
    if (ranked.length === 0) {
      throw new Error("no students with scores");
    }
    return ranked[0];
  }

  passing() {
    return this.scoredNames().filter((n) => this.rawAverage(n) >= 60);
  }

  failing() {
    return this.scoredNames().filter((n) => this.rawAverage(n) < 60);
  }

  maxScore() {
    let best = null;
    for (const name of this.names()) {
      for (const [subject, score] of this.students.get(name)) {
        if (best === null || score > best.score) {
          best = { name: name, subject: subject, score: score };
        }
      }
    }
    return best;
  }

  letterCounts() {
    const counts = {};
    for (const grade of ["A", "B", "C", "D", "F"]) {
      const n = this.scoredNames().filter((s) => this.gradeOf(s) === grade).length;
      if (n > 0) {
        counts[grade] = n;
      }
    }
    return counts;
  }

  report(name) {
    const scores = this.scoresMap(name);
    const lines = [name];
    for (const subject of Array.from(scores.keys()).sort()) {
      lines.push(subject + ": " + scores.get(subject));
    }
    lines.push("average: " + this.average(name) + " (" + this.gradeOf(name) + ")");
    return lines;
  }
}

const book = new GradeBook();
const data = {
  Ann: { math: 90, science: 85, english: 95 },
  Bob: { math: 70, science: 65, english: 80 },
  Cara: { math: 55, science: 60, english: 50 },
  Dan: { math: 80, science: 85, english: 75 },
};
for (const name of Object.keys(data)) {
  book.addStudent(name);
  for (const subject of Object.keys(data[name])) {
    book.addScore(name, subject, data[name][subject]);
  }
}

check("student count", book.studentCount(), 4);
check("names sorted", book.names(), ["Ann", "Bob", "Cara", "Dan"]);
check("subjects", book.subjects(), ["english", "math", "science"]);
check("ann average", book.average("Ann"), 90);
check("bob average", book.average("Bob"), 71.67);
check("cara average", book.average("Cara"), 55);
check("dan average", book.average("Dan"), 80);

console.log();
check("letter ann", book.gradeOf("Ann"), "A");
check("letter bob", book.gradeOf("Bob"), "C");
check("letter cara", book.gradeOf("Cara"), "F");
check("letter dan", book.gradeOf("Dan"), "B");
check("letter edge 90", letter(90), "A");
check("letter edge 89", letter(89.99), "B");
check("letter edge 60", letter(60), "D");
check("letter zero", letter(0), "F");
check("letter counts", book.letterCounts(), { A: 1, B: 1, C: 1, F: 1 });

console.log();
check("math average", book.subjectAverage("math"), 73.75);
check("science average", book.subjectAverage("science"), 73.75);
check("english average", book.subjectAverage("english"), 75);
check("top student", book.topStudent(), "Ann");
check("ranking", book.ranking(), ["Ann", "Dan", "Bob", "Cara"]);
check("passing", book.passing(), ["Ann", "Bob", "Dan"]);
check("failing", book.failing(), ["Cara"]);
check("max score", book.maxScore(), { name: "Ann", subject: "english", score: 95 });

console.log();
check("curved ann", book.curvedAverage("Ann", 10), 98.33);
check("curved bob", book.curvedAverage("Bob", 10), 81.67);
check("curve zero", book.curvedAverage("Bob", 0), 71.67);
check("report", book.report("Ann"), ["Ann", "english: 95", "math: 90", "science: 85", "average: 90 (A)"]);
check("report last line", book.report("Bob")[4], "average: 71.67 (C)");

console.log();
book.addScore("Cara", "math", 100);
check("score replaced", book.average("Cara"), 70);
check("cara now passes", book.passing(), ["Ann", "Bob", "Cara", "Dan"]);
check("no failing now", book.failing(), []);
check("ranking changes", book.ranking(), ["Ann", "Dan", "Bob", "Cara"]);

book.addStudent("Eve");
check("new student", book.studentCount(), 5);
check("no scores listed", book.scoredNames().length, 4);
check("average no scores", raises(() => book.average("Eve")), true);

console.log();
check("duplicate student", raises(() => book.addStudent("Ann")), true);
check("empty name", raises(() => book.addStudent("")), true);
check("unknown student", raises(() => book.addScore("Zed", "math", 50)), true);
check("score too high", raises(() => book.addScore("Ann", "math", 101)), true);
check("score negative", raises(() => book.addScore("Ann", "math", -1)), true);
check("score not number", raises(() => book.addScore("Ann", "math", "90")), true);
check("score NaN", raises(() => book.addScore("Ann", "math", NaN)), true);
check("no subject", raises(() => book.addScore("Ann", "", 50)), true);
check("unknown subject", raises(() => book.subjectAverage("art")), true);
check("empty book top", raises(() => new GradeBook().topStudent()), true);
check("empty book max", new GradeBook().maxScore(), null);

console.log();
const big = new GradeBook();
for (let i = 0; i < 200; i++) {
  const name = "S" + i;
  big.addStudent(name);
  big.addScore(name, "a", i % 101);
  big.addScore(name, "b", i % 101);
}
check("200 students", big.studentCount(), 200);
check("big average", big.average("S150"), 49);
check("big top", big.topStudent(), "S100");
check("big ranking size", big.ranking().length, 200);
check("big passing", big.passing().length, 80);
check("big failing", big.failing().length, 120);
check("big subject avg", big.subjects(), ["a", "b"]);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
