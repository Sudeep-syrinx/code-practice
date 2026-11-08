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

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

class Game {
  constructor() {
    this.board = new Array(9).fill(null);
    this.current = "X";
    this.moveCount = 0;
  }

  computeWinner() {
    for (const [a, b, c] of LINES) {
      if (this.board[a] !== null && this.board[a] === this.board[b] && this.board[b] === this.board[c]) {
        return this.board[a];
      }
    }
    return null;
  }

  winner() {
    return this.computeWinner();
  }

  emptyCells() {
    const out = [];
    for (let i = 0; i < 9; i++) {
      if (this.board[i] === null) {
        out.push(i);
      }
    }
    return out;
  }

  isDraw() {
    return this.computeWinner() === null && this.emptyCells().length === 0;
  }

  isOver() {
    return this.computeWinner() !== null || this.emptyCells().length === 0;
  }

  move(index) {
    if (!Number.isInteger(index) || index < 0 || index > 8) {
      throw new Error("move must be an integer from 0 to 8");
    }
    if (this.isOver()) {
      throw new Error("the game is over");
    }
    if (this.board[index] !== null) {
      throw new Error("cell is taken: " + index);
    }
    this.board[index] = this.current;
    this.moveCount++;
    if (!this.isOver()) {
      this.current = this.current === "X" ? "O" : "X";
    }
    return this.current;
  }

  playAll(moves) {
    for (const m of moves) {
      this.move(m);
    }
  }

  winningMove(player) {
    for (const i of this.emptyCells()) {
      this.board[i] = player;
      const won = this.computeWinner() === player;
      this.board[i] = null;
      if (won) {
        return i;
      }
    }
    return -1;
  }

  bestMove() {
    const mine = this.current;
    const other = mine === "X" ? "O" : "X";
    const win = this.winningMove(mine);
    if (win !== -1) {
      return win;
    }
    const block = this.winningMove(other);
    if (block !== -1) {
      return block;
    }
    if (this.board[4] === null) {
      return 4;
    }
    return this.emptyCells()[0];
  }

  reset() {
    this.board = new Array(9).fill(null);
    this.current = "X";
    this.moveCount = 0;
  }

  toText() {
    const rows = [];
    for (let r = 0; r < 3; r++) {
      let row = "";
      for (let c = 0; c < 3; c++) {
        row += this.board[r * 3 + c] === null ? "." : this.board[r * 3 + c];
      }
      rows.push(row);
    }
    return rows.join("\n");
  }
}

const g = new Game();
check("starts with X", g.current, "X");
check("nine empty", g.emptyCells().length, 9);
check("not over", g.isOver(), false);
check("no winner", g.winner(), null);
check("not a draw", g.isDraw(), false);
check("empty text", g.toText(), "...\n...\n...");
check("move returns next", g.move(0), "O");
check("after one move", g.toText(), "X..\n...\n...");
check("move count", g.moveCount, 1);
check("eight empty", g.emptyCells(), [1, 2, 3, 4, 5, 6, 7, 8]);

console.log();
const top = new Game();
top.playAll([0, 3, 1, 4, 2]);
check("X wins top row", top.winner(), "X");
check("game over", top.isOver(), true);
check("not a draw", top.isDraw(), false);
check("winner keeps turn", top.current, "X");
check("five moves", top.moveCount, 5);
check("no move after win", raises(() => top.move(5)), true);

const oWin = new Game();
oWin.playAll([0, 3, 1, 4, 8, 5]);
check("O wins middle row", oWin.winner(), "O");
check("O six moves", oWin.moveCount, 6);

const diagonal = new Game();
diagonal.playAll([0, 1, 4, 2, 8]);
check("X wins diagonal", diagonal.winner(), "X");

const column = new Game();
column.playAll([0, 1, 3, 2, 6]);
check("X wins column", column.winner(), "X");

const anti = new Game();
anti.playAll([2, 0, 4, 1, 6]);
check("X wins anti diagonal", anti.winner(), "X");

console.log();
const draw = new Game();
draw.playAll([0, 1, 2, 4, 3, 5, 7, 6, 8]);
check("draw winner", draw.winner(), null);
check("draw is draw", draw.isDraw(), true);
check("draw is over", draw.isOver(), true);
check("draw nine moves", draw.moveCount, 9);
check("draw board", draw.toText(), "XOX\nXOO\nOXX");
check("no moves after draw", raises(() => draw.move(0)), true);

console.log();
const t = new Game();
t.move(4);
check("taken cell", raises(() => t.move(4)), true);
check("move too high", raises(() => t.move(9)), true);
check("move negative", raises(() => t.move(-1)), true);
check("move decimal", raises(() => t.move(1.5)), true);
check("move text", raises(() => t.move("1")), true);
check("failed moves ignored", t.moveCount, 1);
check("turn unchanged", t.current, "O");

console.log();
let linesOk = true;
for (const line of LINES) {
  for (const player of ["X", "O"]) {
    const test = new Game();
    for (const i of line) {
      test.board[i] = player;
    }
    if (test.computeWinner() !== player) {
      linesOk = false;
    }
  }
}
check("all 8 lines both players", linesOk, true);
check("mixed line no win", (() => {
  const test = new Game();
  test.board[0] = "X";
  test.board[1] = "O";
  test.board[2] = "X";
  return test.computeWinner();
})(), null);

console.log();
const winCase = new Game();
winCase.board = ["X", "X", null, "O", "O", null, null, null, null];
winCase.current = "X";
check("X takes win", winCase.bestMove(), 2);
winCase.current = "O";
check("O takes win", winCase.bestMove(), 5);

const blockCase = new Game();
blockCase.board = ["X", "X", null, null, "O", null, null, null, null];
blockCase.current = "O";
check("O blocks X", blockCase.bestMove(), 2);

check("empty board center", new Game().bestMove(), 4);
const firstCase = new Game();
firstCase.board[4] = "X";
firstCase.current = "O";
check("first empty cell", firstCase.bestMove(), 0);
check("winning move none", new Game().winningMove("X"), -1);
check("board unchanged by search", winCase.emptyCells(), [2, 5, 6, 7, 8]);

console.log();
const ai = new Game();
while (!ai.isOver()) {
  ai.move(ai.bestMove());
}
check("AI game ends", ai.isOver(), true);
check("AI moves within 9", ai.moveCount <= 9, true);
check("AI moves match board", ai.moveCount, 9 - ai.emptyCells().length);

ai.reset();
check("reset board", ai.toText(), "...\n...\n...");
check("reset turn", ai.current, "X");
check("reset count", ai.moveCount, 0);

console.log();
let seed = 12345;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
let gamesOk = true;
let xWins = 0;
let oWins = 0;
let draws = 0;
for (let n = 0; n < 500; n++) {
  const game = new Game();
  while (!game.isOver()) {
    const empty = game.emptyCells();
    game.move(empty[nextRandom(empty.length)]);
  }
  if (game.moveCount < 5 || game.moveCount > 9) {
    gamesOk = false;
  }
  if (game.moveCount !== 9 - game.emptyCells().length) {
    gamesOk = false;
  }
  if (game.winner() === "X") {
    xWins++;
  } else if (game.winner() === "O") {
    oWins++;
  } else if (game.isDraw()) {
    draws++;
  } else {
    gamesOk = false;
  }
}
check("500 random games valid", gamesOk, true);
check("every game has a result", xWins + oWins + draws, 500);
check("X wins sometimes", xWins > 0, true);
check("O wins sometimes", oWins > 0, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
