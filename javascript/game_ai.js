const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class MinimaxNode {
  constructor(move, value, children) {
    this.move = move;
    this.value = value;
    this.children = children || [];
  }
}

class GameTree {
  constructor(game) {
    this.game = game;
    this.nodesExplored = 0;
    this.cacheHits = 0;
    this.transpositionTable = new Map();
  }

  minimax(state, depth, maximizing) {
    this.nodesExplored++;
    if (depth === 0 || this.game.isTerminal(state)) {
      return { value: this.game.evaluate(state), move: null };
    }
    const moves = this.game.getMoves(state);
    if (moves.length === 0) return { value: this.game.evaluate(state), move: null };
    let bestMove = moves[0];
    if (maximizing) {
      let maxValue = -Infinity;
      for (const move of moves) {
        const next = this.game.applyMove(state, move);
        const result = this.minimax(next, depth - 1, false);
        if (result.value > maxValue) { maxValue = result.value; bestMove = move; }
      }
      return { value: maxValue, move: bestMove };
    } else {
      let minValue = Infinity;
      for (const move of moves) {
        const next = this.game.applyMove(state, move);
        const result = this.minimax(next, depth - 1, true);
        if (result.value < minValue) { minValue = result.value; bestMove = move; }
      }
      return { value: minValue, move: bestMove };
    }
  }

  alphaBeta(state, depth, alpha, beta, maximizing) {
    this.nodesExplored++;
    const stateKey = this.game.stateKey(state);
    const cached = this.transpositionTable.get(stateKey + ":" + depth);
    if (cached !== undefined) { this.cacheHits++; return cached; }
    if (depth === 0 || this.game.isTerminal(state)) {
      const val = { value: this.game.evaluate(state), move: null };
      this.transpositionTable.set(stateKey + ":" + depth, val);
      return val;
    }
    const moves = this.game.getMoves(state);
    if (moves.length === 0) {
      const val = { value: this.game.evaluate(state), move: null };
      this.transpositionTable.set(stateKey + ":" + depth, val);
      return val;
    }
    let bestMove = moves[0];
    if (maximizing) {
      let maxValue = -Infinity;
      for (const move of moves) {
        const next = this.game.applyMove(state, move);
        const result = this.alphaBeta(next, depth - 1, alpha, beta, false);
        if (result.value > maxValue) { maxValue = result.value; bestMove = move; }
        alpha = Math.max(alpha, maxValue);
        if (beta <= alpha) break;
      }
      const val = { value: maxValue, move: bestMove };
      this.transpositionTable.set(stateKey + ":" + depth, val);
      return val;
    } else {
      let minValue = Infinity;
      for (const move of moves) {
        const next = this.game.applyMove(state, move);
        const result = this.alphaBeta(next, depth - 1, alpha, beta, true);
        if (result.value < minValue) { minValue = result.value; bestMove = move; }
        beta = Math.min(beta, minValue);
        if (beta <= alpha) break;
      }
      const val = { value: minValue, move: bestMove };
      this.transpositionTable.set(stateKey + ":" + depth, val);
      return val;
    }
  }

  negamax(state, depth, alpha, beta) {
    this.nodesExplored++;
    if (depth === 0 || this.game.isTerminal(state)) {
      return { value: this.game.evaluate(state), move: null };
    }
    const moves = this.game.getMoves(state);
    if (moves.length === 0) return { value: this.game.evaluate(state), move: null };
    let bestValue = -Infinity;
    let bestMove = moves[0];
    for (const move of moves) {
      const next = this.game.applyMove(state, move);
      const result = this.negamax(next, depth - 1, -beta, -alpha);
      const value = -result.value;
      if (value > bestValue) { bestValue = value; bestMove = move; }
      alpha = Math.max(alpha, bestValue);
      if (alpha >= beta) break;
    }
    return { value: bestValue, move: bestMove };
  }

  resetStats() {
    this.nodesExplored = 0;
    this.cacheHits = 0;
    this.transpositionTable.clear();
  }
}

class TicTacToeGame {
  constructor() { this.emptyBoard = "_________"; }
  getMoves(state) {
    const moves = [];
    for (let i = 0; i < 9; i++) if (state[i] === "_") moves.push(i);
    return moves;
  }
  applyMove(state, move) {
    const player = this.getPlayer(state);
    return state.slice(0, move) + player + state.slice(move + 1);
  }
  getPlayer(state) {
    const xCount = (state.match(/X/g) || []).length;
    const oCount = (state.match(/O/g) || []).length;
    return xCount === oCount ? "X" : "O";
  }
  isTerminal(state) { return this.winner(state) !== null || !state.includes("_"); }
  winner(state) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a, b, c] of lines) {
      if (state[a] !== "_" && state[a] === state[b] && state[b] === state[c]) return state[a];
    }
    return null;
  }
  evaluate(state) {
    const w = this.winner(state);
    if (w === "X") return 10;
    if (w === "O") return -10;
    return 0;
  }
  stateKey(state) { return state + ":" + this.getPlayer(state); }
}

class ConnectFourGame {
  constructor(rows, cols) { this.rows = rows || 6; this.cols = cols || 7; }
  _getBoard(state) {
    const board = Array.from({ length: this.rows }, () => new Array(this.cols).fill("_"));
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const idx = r * this.cols + c;
        if (idx < state.length) board[r][c] = state[idx];
      }
    }
    return board;
  }
  getMoves(state) {
    const moves = [];
    for (let c = 0; c < this.cols; c++) {
      if (state[c] === "_") moves.push(c);
    }
    return moves;
  }
  applyMove(state, col) {
    const player = this._getPlayer(state);
    const arr = state.split("");
    for (let r = this.rows - 1; r >= 0; r--) {
      const idx = r * this.cols + col;
      if (arr[idx] === "_") { arr[idx] = player; break; }
    }
    return arr.join("");
  }
  _getPlayer(state) {
    const xCount = (state.match(/X/g) || []).length;
    const oCount = (state.match(/O/g) || []).length;
    return xCount === oCount ? "X" : "O";
  }
  isTerminal(state) { return this.winner(state) !== null || !state.includes("_"); }
  winner(state) {
    const board = this._getBoard(state);
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (board[r][c] === "_") continue;
        for (const [dr, dc] of dirs) {
          let count = 1;
          for (let k = 1; k < 4; k++) {
            const nr = r + dr * k, nc = c + dc * k;
            if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols || board[nr][nc] !== board[r][c]) break;
            count++;
          }
          if (count >= 4) return board[r][c];
        }
      }
    }
    return null;
  }
  evaluate(state) {
    const w = this.winner(state);
    if (w === "X") return 1000;
    if (w === "O") return -1000;
    return 0;
  }
  stateKey(state) { return state + ":" + this._getPlayer(state); }
}

console.log("=== TIC-TAC-TOE MINIMAX ===");
check("ttt empty board not terminal", (() => {
  const g = new TicTacToeGame();
  return g.isTerminal(g.emptyBoard);
})(), false);
check("ttt winning state terminal", (() => {
  const g = new TicTacToeGame();
  return g.isTerminal("XXX______");
})(), true);
check("ttt full board terminal", (() => {
  const g = new TicTacToeGame();
  return g.isTerminal("XOXOXOXOX");
})(), true);
check("ttt winner X", (() => new TicTacToeGame().winner("XXX______"))(), "X");
check("ttt winner O", (() => new TicTacToeGame().winner("___OOO___"))(), "O");
check("ttt no winner", (() => new TicTacToeGame().winner("XOXOXOXOX"))(), null);
check("ttt minimax optimal play draw", (() => {
  const gt = new GameTree(new TicTacToeGame());
  const result = gt.minimax("_________", 9, true);
  return result.value;
})(), 0);
check("ttt minimax X wins when possible", (() => {
  const gt = new GameTree(new TicTacToeGame());
  const result = gt.minimax("XX_O_____", 9, true);
  return result.value;
})(), 10);
check("ttt alpha-beta same result as minimax", (() => {
  const game = new TicTacToeGame();
  const gt1 = new GameTree(game);
  const gt2 = new GameTree(game);
  const mm = gt1.minimax("_________", 6, true);
  const ab = gt2.alphaBeta("_________", 6, -Infinity, Infinity, true);
  return mm.value === ab.value;
})(), true);
check("ttt alpha-beta explores fewer nodes", (() => {
  const game = new TicTacToeGame();
  const gt1 = new GameTree(game);
  gt1.minimax("_________", 6, true);
  const mmNodes = gt1.nodesExplored;
  gt1.resetStats();
  gt1.alphaBeta("_________", 6, -Infinity, Infinity, true);
  return gt1.nodesExplored <= mmNodes;
})(), true);
check("ttt negamax matches minimax", (() => {
  const game = new TicTacToeGame();
  const gt1 = new GameTree(game);
  const gt2 = new GameTree(game);
  const mm = gt1.minimax("_________", 5, true);
  const nm = gt2.negamax("_________", 5, -Infinity, Infinity);
  return mm.value === nm.value;
})(), true);

console.log("\n=== TRANSPOSITION TABLE ===");
check("transposition table caches", (() => {
  const game = new TicTacToeGame();
  const gt = new GameTree(game);
  gt.alphaBeta("_________", 4, -Infinity, Infinity, true);
  const hits1 = gt.cacheHits;
  gt.alphaBeta("_________", 4, -Infinity, Infinity, true);
  return gt.cacheHits > hits1;
})(), true);

console.log("\n=== CONNECT FOUR ===");
check("c4 initial moves", (() => {
  const g = new ConnectFourGame(6, 7);
  const state = "_".repeat(42);
  return g.getMoves(state).length;
})(), 7);
check("c4 apply move drops piece", (() => {
  const g = new ConnectFourGame(6, 7);
  const state = "_".repeat(42);
  const next = g.applyMove(state, 3);
  return next[35 + 3] === "X";
})(), true);
check("c4 horizontal win detected", (() => {
  const g = new ConnectFourGame(6, 7);
  let state = "_".repeat(42);
  state = g.applyMove(state, 0); state = g.applyMove(state, 0);
  state = g.applyMove(state, 1); state = g.applyMove(state, 1);
  state = g.applyMove(state, 2); state = g.applyMove(state, 2);
  state = g.applyMove(state, 3);
  return g.winner(state);
})(), "X");
check("c4 alpha-beta finds win", (() => {
  const g = new ConnectFourGame(4, 4);
  let state = "_".repeat(16);
  state = g.applyMove(state, 0); state = g.applyMove(state, 1);
  state = g.applyMove(state, 0); state = g.applyMove(state, 1);
  state = g.applyMove(state, 0);
  const gt = new GameTree(g);
  const result = gt.alphaBeta(state, 6, -Infinity, Infinity, true);
  return result.value > 0;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
