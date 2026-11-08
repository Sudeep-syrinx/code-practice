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

function round2(value) {
  return Math.round(value * 100) / 100;
}

class Leaderboard {
  constructor() {
    this.players = new Map();
  }

  addPlayer(name) {
    if (!name) {
      throw new Error("name is required");
    }
    if (this.players.has(name)) {
      throw new Error("duplicate player: " + name);
    }
    this.players.set(name, []);
  }

  need(name) {
    if (!this.players.has(name)) {
      throw new Error("unknown player: " + name);
    }
    return this.players.get(name);
  }

  addScore(name, score) {
    const scores = this.need(name);
    if (!Number.isInteger(score) || score < 0) {
      throw new Error("score must be a non-negative integer");
    }
    scores.push(score);
  }

  needScores(name) {
    const scores = this.need(name);
    if (scores.length === 0) {
      throw new Error("no scores for " + name);
    }
    return scores;
  }

  playerCount() {
    return this.players.size;
  }

  names() {
    return Array.from(this.players.keys()).sort();
  }

  best(name) {
    return Math.max(...this.needScores(name));
  }

  total(name) {
    return this.needScores(name).reduce((a, b) => a + b, 0);
  }

  average(name) {
    const scores = this.needScores(name);
    return round2(this.total(name) / scores.length);
  }

  last(name) {
    const scores = this.needScores(name);
    return scores[scores.length - 1];
  }

  gamesPlayed(name) {
    return this.need(name).length;
  }

  totalGames() {
    let total = 0;
    for (const scores of this.players.values()) {
      total += scores.length;
    }
    return total;
  }

  scoredNames() {
    return this.names().filter((n) => this.players.get(n).length > 0);
  }

  sortedBy(measure) {
    return this.scoredNames().sort((x, y) => {
      const diff = measure(y) - measure(x);
      if (diff !== 0) {
        return diff;
      }
      return x < y ? -1 : 1;
    });
  }

  ranking() {
    return this.sortedBy((n) => this.best(n));
  }

  rankingByTotal() {
    return this.sortedBy((n) => this.total(n));
  }

  rankingByAverage() {
    return this.sortedBy((n) => this.average(n));
  }

  top(count) {
    return this.ranking().slice(0, count);
  }

  rank(name) {
    const index = this.ranking().indexOf(name);
    if (index === -1) {
      throw new Error("player has no rank: " + name);
    }
    return index + 1;
  }

  highest() {
    const first = this.ranking()[0];
    if (first === undefined) {
      return null;
    }
    return { name: first, score: this.best(first) };
  }

  mostGames() {
    let bestName = null;
    let bestCount = 0;
    for (const name of this.names()) {
      const count = this.players.get(name).length;
      if (count > bestCount) {
        bestName = name;
        bestCount = count;
      }
    }
    return bestName;
  }

  bestAtLeast(limit) {
    return this.scoredNames().filter((n) => this.best(n) >= limit);
  }

  improved(name) {
    const scores = this.needScores(name);
    return scores.length > 1 && scores[scores.length - 1] > scores[0];
  }

  remove(name) {
    this.need(name);
    this.players.delete(name);
  }

  resetScores(name) {
    this.need(name);
    this.players.set(name, []);
  }
}

const board = new Leaderboard();
const data = {
  Ann: [50, 80, 70],
  Bob: [90, 40],
  Cara: [80],
  Dan: [10, 20, 30, 40],
};
for (const name of Object.keys(data)) {
  board.addPlayer(name);
  for (const score of data[name]) {
    board.addScore(name, score);
  }
}

check("player count", board.playerCount(), 4);
check("names", board.names(), ["Ann", "Bob", "Cara", "Dan"]);
check("total games", board.totalGames(), 10);
check("ann best", board.best("Ann"), 80);
check("bob best", board.best("Bob"), 90);
check("ann total", board.total("Ann"), 200);
check("bob total", board.total("Bob"), 130);
check("dan total", board.total("Dan"), 100);
check("ann average", board.average("Ann"), 66.67);
check("bob average", board.average("Bob"), 65);
check("cara average", board.average("Cara"), 80);
check("dan average", board.average("Dan"), 25);

console.log();
check("ranking by best", board.ranking(), ["Bob", "Ann", "Cara", "Dan"]);
check("ranking by total", board.rankingByTotal(), ["Ann", "Bob", "Dan", "Cara"]);
check("ranking by average", board.rankingByAverage(), ["Cara", "Ann", "Bob", "Dan"]);
check("top 2", board.top(2), ["Bob", "Ann"]);
check("top 10", board.top(10).length, 4);
check("top 0", board.top(0), []);
check("rank bob", board.rank("Bob"), 1);
check("rank ann", board.rank("Ann"), 2);
check("rank cara", board.rank("Cara"), 3);
check("rank dan", board.rank("Dan"), 4);
check("highest", board.highest(), { name: "Bob", score: 90 });
check("most games", board.mostGames(), "Dan");

console.log();
check("games played ann", board.gamesPlayed("Ann"), 3);
check("games played cara", board.gamesPlayed("Cara"), 1);
check("last score ann", board.last("Ann"), 70);
check("last score bob", board.last("Bob"), 40);
check("best at least 60", board.bestAtLeast(60), ["Ann", "Bob", "Cara"]);
check("best at least 85", board.bestAtLeast(85), ["Bob"]);
check("best at least 100", board.bestAtLeast(100), []);
check("ann improved", board.improved("Ann"), true);
check("bob not improved", board.improved("Bob"), false);
check("cara single game", board.improved("Cara"), false);
check("dan improved", board.improved("Dan"), true);

console.log();
board.addPlayer("Eve");
check("new player", board.playerCount(), 5);
check("eve not scored", board.scoredNames().length, 4);
check("ranking ignores eve", board.ranking(), ["Bob", "Ann", "Cara", "Dan"]);
check("eve best fails", raises(() => board.best("Eve")), true);
check("eve average fails", raises(() => board.average("Eve")), true);
check("eve rank fails", raises(() => board.rank("Eve")), true);
check("eve games", board.gamesPlayed("Eve"), 0);
board.addScore("Eve", 95);
check("eve now first", board.ranking()[0], "Eve");
check("bob now second", board.rank("Bob"), 2);
check("new highest", board.highest(), { name: "Eve", score: 95 });
board.addScore("Eve", 100);
check("eve best", board.best("Eve"), 100);
check("eve average", board.average("Eve"), 97.5);

console.log();
board.remove("Dan");
check("after remove", board.playerCount(), 5 - 1);
check("ranking after remove", board.ranking(), ["Eve", "Bob", "Ann", "Cara"]);
check("removed is gone", raises(() => board.best("Dan")), true);
board.resetScores("Cara");
check("reset scores", board.gamesPlayed("Cara"), 0);
check("ranking after reset", board.ranking(), ["Eve", "Bob", "Ann"]);
check("total games now", board.totalGames(), 3 + 2 + 0 + 2);

console.log();
check("duplicate player", raises(() => board.addPlayer("Ann")), true);
check("empty name", raises(() => board.addPlayer("")), true);
check("unknown player", raises(() => board.addScore("Zed", 5)), true);
check("negative score", raises(() => board.addScore("Ann", -1)), true);
check("decimal score", raises(() => board.addScore("Ann", 1.5)), true);
check("text score", raises(() => board.addScore("Ann", "9")), true);
check("remove unknown", raises(() => board.remove("Zed")), true);
check("reset unknown", raises(() => board.resetScores("Zed")), true);
check("empty board highest", new Leaderboard().highest(), null);
check("empty board most games", new Leaderboard().mostGames(), null);

console.log();
const big = new Leaderboard();
for (let i = 0; i < 300; i++) {
  big.addPlayer("P" + i);
  big.addScore("P" + i, i);
}
check("300 players", big.playerCount(), 300);
check("big total games", big.totalGames(), 300);
check("big top 3", big.top(3), ["P299", "P298", "P297"]);
check("big rank first", big.rank("P299"), 1);
check("big rank last", big.rank("P0"), 300);
check("big average", big.average("P10"), 10);
check("big highest", big.highest(), { name: "P299", score: 299 });
check("big best at least 290", big.bestAtLeast(290).length, 10);
check("big ranking size", big.ranking().length, 300);
check("big total ranking first", big.rankingByTotal()[0], "P299");

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
