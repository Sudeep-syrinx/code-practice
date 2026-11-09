const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class Table {
  constructor(name, columns) {
    this.name = name;
    this.columns = columns;
    this.rows = [];
    this.indexes = new Map();
  }
  insert(row) {
    for (const col of this.columns) {
      if (!(col in row)) throw new Error("missing column: " + col);
    }
    this.rows.push({ ...row });
    for (const [col, idx] of this.indexes) {
      const val = row[col];
      if (!idx.has(val)) idx.set(val, []);
      idx.get(val).push(this.rows.length - 1);
    }
  }
  createIndex(column) {
    if (!this.columns.includes(column)) throw new Error("unknown column");
    const idx = new Map();
    for (let i = 0; i < this.rows.length; i++) {
      const val = this.rows[i][column];
      if (!idx.has(val)) idx.set(val, []);
      idx.get(val).push(i);
    }
    this.indexes.set(column, idx);
  }
  scan() { return [...this.rows]; }
  indexLookup(column, value) {
    const idx = this.indexes.get(column);
    if (!idx) return null;
    const positions = idx.get(value);
    if (!positions) return [];
    return positions.map(p => this.rows[p]);
  }
  rowCount() { return this.rows.length; }
}

class Database {
  constructor() {
    this.tables = new Map();
  }
  createTable(name, columns) {
    if (this.tables.has(name)) throw new Error("table exists");
    this.tables.set(name, new Table(name, columns));
  }
  getTable(name) {
    if (!this.tables.has(name)) throw new Error("table not found: " + name);
    return this.tables.get(name);
  }
  insert(tableName, row) {
    this.getTable(tableName).insert(row);
  }
}

class QueryPlan {
  constructor(db) {
    this.db = db;
  }
  execute(ast) {
    if (ast.type === "select") return this._executeSelect(ast);
    throw new Error("unknown query type: " + ast.type);
  }
  _executeSelect(ast) {
    const table = this.db.getTable(ast.from);
    let rows;
    if (ast.where && ast.where.op === "=" && table.indexes.has(ast.where.col)) {
      rows = table.indexLookup(ast.where.col, ast.where.val);
    } else {
      rows = table.scan();
    }
    if (ast.where) {
      rows = rows.filter(r => this._evalWhere(r, ast.where));
    }
    if (ast.columns && ast.columns[0] !== "*") {
      rows = rows.map(r => {
        const projected = {};
        for (const col of ast.columns) projected[col] = r[col];
        return projected;
      });
    }
    if (ast.orderBy) {
      const col = ast.orderBy.col;
      const dir = ast.orderBy.dir || "asc";
      rows.sort((a, b) => {
        if (a[col] < b[col]) return dir === "asc" ? -1 : 1;
        if (a[col] > b[col]) return dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    if (ast.limit !== undefined) {
      rows = rows.slice(0, ast.limit);
    }
    if (ast.aggregate) {
      return [this._computeAggregate(rows, ast.aggregate)];
    }
    return rows;
  }
  _evalWhere(row, where) {
    if (where.op === "=") return row[where.col] === where.val;
    if (where.op === ">") return row[where.col] > where.val;
    if (where.op === "<") return row[where.col] < where.val;
    if (where.op === ">=") return row[where.col] >= where.val;
    if (where.op === "<=") return row[where.col] <= where.val;
    if (where.op === "!=") return row[where.col] !== where.val;
    if (where.op === "AND") return this._evalWhere(row, where.left) && this._evalWhere(row, where.right);
    if (where.op === "OR") return this._evalWhere(row, where.left) || this._evalWhere(row, where.right);
    return true;
  }
  _computeAggregate(rows, agg) {
    if (agg.fn === "COUNT") return { [agg.alias || "count"]: rows.length };
    if (agg.fn === "SUM") {
      let sum = 0;
      for (const r of rows) sum += r[agg.col];
      return { [agg.alias || "sum"]: sum };
    }
    if (agg.fn === "AVG") {
      let sum = 0;
      for (const r of rows) sum += r[agg.col];
      return { [agg.alias || "avg"]: rows.length > 0 ? sum / rows.length : 0 };
    }
    if (agg.fn === "MIN") {
      let min = Infinity;
      for (const r of rows) if (r[agg.col] < min) min = r[agg.col];
      return { [agg.alias || "min"]: min };
    }
    if (agg.fn === "MAX") {
      let max = -Infinity;
      for (const r of rows) if (r[agg.col] > max) max = r[agg.col];
      return { [agg.alias || "max"]: max };
    }
    throw new Error("unknown aggregate: " + agg.fn);
  }
}

class SimpleParser {
  constructor(sql) {
    this.sql = sql.trim();
    this.pos = 0;
  }
  parse() {
    this._skipWhitespace();
    if (this._matchKeyword("SELECT")) return this._parseSelect();
    throw new Error("expected SELECT at position " + this.pos);
  }
  _parseSelect() {
    this._skipWhitespace();
    const columns = this._parseColumnList();
    this._skipWhitespace();
    if (!this._matchKeyword("FROM")) throw new Error("expected FROM");
    this._skipWhitespace();
    const from = this._parseIdentifier();
    let where = null, orderBy = null, limit = undefined, aggregate = null;
    this._skipWhitespace();
    if (this._matchKeyword("WHERE")) {
      this._skipWhitespace();
      where = this._parseWhereClause();
    }
    this._skipWhitespace();
    if (this._matchKeyword("ORDER")) {
      this._skipWhitespace();
      if (!this._matchKeyword("BY")) throw new Error("expected BY after ORDER");
      this._skipWhitespace();
      const col = this._parseIdentifier();
      this._skipWhitespace();
      let dir = "asc";
      if (this._matchKeyword("DESC")) dir = "desc";
      else this._matchKeyword("ASC");
      orderBy = { col, dir };
    }
    this._skipWhitespace();
    if (this._matchKeyword("LIMIT")) {
      this._skipWhitespace();
      limit = parseInt(this._parseNumber(), 10);
    }
    if (columns.length === 1 && ["COUNT", "SUM", "AVG", "MIN", "MAX"].includes(columns[0].fn)) {
      aggregate = columns[0];
      columns = ["*"];
    }
    return { type: "select", columns, from, where, orderBy, limit, aggregate };
  }
  _parseColumnList() {
    if (this._peek() === "*") { this.pos++; return ["*"]; }
    const cols = [];
    while (true) {
      this._skipWhitespace();
      const upper = this.sql.slice(this.pos, this.pos + 5).toUpperCase();
      if (["COUNT", "SUM(", "AVG(", "MIN(", "MAX("].some(k => upper.startsWith(k))) {
        cols.push(this._parseAggregate());
      } else {
        cols.push(this._parseIdentifier());
      }
      this._skipWhitespace();
      if (this._peek() === ",") { this.pos++; continue; }
      break;
    }
    return cols;
  }
  _parseAggregate() {
    const fn = this._parseIdentifier().toUpperCase();
    this._skipWhitespace();
    if (this._peek() !== "(") throw new Error("expected ( after aggregate");
    this.pos++;
    this._skipWhitespace();
    const col = this._parseIdentifier();
    this._skipWhitespace();
    if (this._peek() !== ")") throw new Error("expected )");
    this.pos++;
    let alias = null;
    this._skipWhitespace();
    if (this._matchKeyword("AS")) {
      this._skipWhitespace();
      alias = this._parseIdentifier();
    }
    return { fn, col, alias };
  }
  _parseWhereClause() {
    const left = this._parseComparison();
    this._skipWhitespace();
    if (this._matchKeyword("AND")) {
      this._skipWhitespace();
      return { op: "AND", left, right: this._parseWhereClause() };
    }
    if (this._matchKeyword("OR")) {
      this._skipWhitespace();
      return { op: "OR", left, right: this._parseWhereClause() };
    }
    return left;
  }
  _parseComparison() {
    const col = this._parseIdentifier();
    this._skipWhitespace();
    const ops = [">=", "<=", "!=", "=", ">", "<"];
    let op = null;
    for (const o of ops) {
      if (this.sql.slice(this.pos, this.pos + o.length) === o) { op = o; this.pos += o.length; break; }
    }
    if (!op) throw new Error("expected comparison operator");
    this._skipWhitespace();
    let val;
    if (this._peek() === "'" || this._peek() === '"') val = this._parseString();
    else val = parseFloat(this._parseNumber());
    return { op, col, val };
  }
  _parseIdentifier() {
    let id = "";
    while (this.pos < this.sql.length && /[A-Za-z_0-9]/.test(this.sql[this.pos])) id += this.sql[this.pos++];
    if (id.length === 0) throw new Error("expected identifier at " + this.pos);
    return id;
  }
  _parseNumber() {
    let num = "";
    while (this.pos < this.sql.length && /[0-9.]/.test(this.sql[this.pos])) num += this.sql[this.pos++];
    return num;
  }
  _parseString() {
    const quote = this.sql[this.pos++];
    let str = "";
    while (this.pos < this.sql.length && this.sql[this.pos] !== quote) str += this.sql[this.pos++];
    this.pos++;
    return str;
  }
  _peek() { return this.sql[this.pos]; }
  _skipWhitespace() { while (this.pos < this.sql.length && /\s/.test(this.sql[this.pos])) this.pos++; }
  _matchKeyword(kw) {
    const slice = this.sql.slice(this.pos, this.pos + kw.length).toUpperCase();
    if (slice === kw.toUpperCase()) {
      const nextChar = this.sql[this.pos + kw.length];
      if (nextChar && /[A-Za-z_0-9]/.test(nextChar)) return false;
      this.pos += kw.length;
      return true;
    }
    return false;
  }
}

check("table insert and scan", (() => {
  const t = new Table("users", ["id", "name"]);
  t.insert({ id: 1, name: "Alice" });
  t.insert({ id: 2, name: "Bob" });
  return t.scan().length;
})(), 2);
check("table missing column throws", (() => {
  const t = new Table("t", ["a"]);
  return raises(() => t.insert({ b: 1 }));
})(), true);
check("table index lookup", (() => {
  const t = new Table("t", ["id", "val"]);
  t.createIndex("id");
  t.insert({ id: 10, val: "x" });
  t.insert({ id: 20, val: "y" });
  return t.indexLookup("id", 10);
})(), [{ id: 10, val: "x" }]);
check("parser simple select", (() => {
  const ast = new SimpleParser("SELECT * FROM users").parse();
  return { type: ast.type, from: ast.from, columns: ast.columns };
})(), { type: "select", from: "users", columns: ["*"] });
check("parser with where", (() => {
  const ast = new SimpleParser("SELECT name FROM users WHERE id = 5").parse();
  return ast.where;
})(), { op: "=", col: "id", val: 5 });
check("parser order by desc", (() => {
  const ast = new SimpleParser("SELECT * FROM t ORDER BY age DESC").parse();
  return ast.orderBy;
})(), { col: "age", dir: "desc" });
check("parser limit", (() => {
  const ast = new SimpleParser("SELECT * FROM t LIMIT 10").parse();
  return ast.limit;
})(), 10);
check("query plan full scan", (() => {
  const db = new Database();
  db.createTable("t", ["id", "v"]);
  db.insert("t", { id: 1, v: 10 });
  db.insert("t", { id: 2, v: 20 });
  const qp = new QueryPlan(db);
  return qp.execute({ type: "select", columns: ["*"], from: "t" }).length;
})(), 2);
check("query plan where filter", (() => {
  const db = new Database();
  db.createTable("t", ["id", "v"]);
  db.insert("t", { id: 1, v: 10 });
  db.insert("t", { id: 2, v: 20 });
  const qp = new QueryPlan(db);
  return qp.execute({ type: "select", columns: ["*"], from: "t", where: { op: "=", col: "id", val: 2 } });
})(), [{ id: 2, v: 20 }]);
check("query plan projection", (() => {
  const db = new Database();
  db.createTable("t", ["a", "b", "c"]);
  db.insert("t", { a: 1, b: 2, c: 3 });
  const qp = new QueryPlan(db);
  return qp.execute({ type: "select", columns: ["a", "c"], from: "t" });
})(), [{ a: 1, c: 3 }]);
check("query plan count aggregate", (() => {
  const db = new Database();
  db.createTable("t", ["x"]);
  db.insert("t", { x: 1 }); db.insert("t", { x: 2 }); db.insert("t", { x: 3 });
  const qp = new QueryPlan(db);
  return qp.execute({ type: "select", columns: ["*"], from: "t", aggregate: { fn: "COUNT", alias: "cnt" } });
})(), [{ cnt: 3 }]);
check("query plan sum aggregate", (() => {
  const db = new Database();
  db.createTable("t", ["v"]);
  db.insert("t", { v: 10 }); db.insert("t", { v: 20 });
  const qp = new QueryPlan(db);
  return qp.execute({ type: "select", columns: ["*"], from: "t", aggregate: { fn: "SUM", col: "v" } });
})(), [{ sum: 30 }]);
check("end to end sql query", (() => {
  const db = new Database();
  db.createTable("emp", ["id", "name", "salary"]);
  db.insert("emp", { id: 1, name: "Alice", salary: 50000 });
  db.insert("emp", { id: 2, name: "Bob", salary: 60000 });
  db.insert("emp", { id: 3, name: "Carol", salary: 55000 });
  const ast = new SimpleParser("SELECT name FROM emp WHERE salary > 52000 ORDER BY name ASC").parse();
  const qp = new QueryPlan(db);
  return qp.execute(ast).map(r => r.name);
})(), ["Bob", "Carol"]);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
