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

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      if (field !== "") {
        throw new Error("quote in the middle of a field");
      }
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      if (row.length === 0 && field === "") {
        i++;
        continue;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (inQuotes) {
    throw new Error("unterminated quote");
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toCSV(rows) {
  const lines = [];
  for (const row of rows) {
    const cells = row.map((cell) => {
      const text = String(cell);
      if (/[",\r\n]/.test(text)) {
        return '"' + text.replace(/"/g, '""') + '"';
      }
      return text;
    });
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

function parseObjects(text) {
  const rows = parseCSV(text);
  if (rows.length === 0) {
    return [];
  }
  const header = rows[0];
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    if (rows[r].length !== header.length) {
      throw new Error("row " + r + " has " + rows[r].length + " fields, expected " + header.length);
    }
    const obj = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = rows[r][c];
    }
    out.push(obj);
  }
  return out;
}

function columnSum(objects, column) {
  let total = 0;
  for (const o of objects) {
    const n = Number(o[column]);
    if (Number.isNaN(n)) {
      throw new Error("not a number in column " + column);
    }
    total += n;
  }
  return total;
}

function groupCount(objects, column) {
  const out = {};
  for (const o of objects) {
    out[o[column]] = (out[o[column]] || 0) + 1;
  }
  return out;
}

function sortBy(objects, column, numeric) {
  return objects.slice().sort((a, b) => {
    if (numeric) {
      return Number(a[column]) - Number(b[column]);
    }
    if (a[column] === b[column]) {
      return 0;
    }
    return a[column] < b[column] ? -1 : 1;
  });
}

check("simple rows", parseCSV("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
check("trailing newline", parseCSV("a,b\n"), [["a", "b"]]);
check("crlf endings", parseCSV("a,b\r\nc,d\r\n"), [["a", "b"], ["c", "d"]]);
check("blank lines skipped", parseCSV("a\n\nb"), [["a"], ["b"]]);
check("empty text", parseCSV(""), []);
check("empty middle field", parseCSV("a,,c"), [["a", "", "c"]]);
check("trailing comma", parseCSV("a,b,"), [["a", "b", ""]]);
check("single field", parseCSV("hello"), [["hello"]]);
check("spaces kept", parseCSV(" a , b "), [[" a ", " b "]]);

console.log();
check("quoted comma", parseCSV('a,"b,c",d'), [["a", "b,c", "d"]]);
check("escaped quote", parseCSV('"he said ""hi"""'), [['he said "hi"']]);
check("newline in quotes", parseCSV('a,"x\ny"\nb,c'), [["a", "x\ny"], ["b", "c"]]);
check("quoted empty", parseCSV('a,"",c'), [["a", "", "c"]]);
check("unterminated quote", raises(() => parseCSV('"abc')), true);
check("quote in middle", raises(() => parseCSV('ab"c')), true);

console.log();
check("to csv simple", toCSV([["a", "b"], ["1", "2"]]), "a,b\n1,2");
check("to csv comma", toCSV([["x,y", "z"]]), '"x,y",z');
check("to csv quote", toCSV([['say "hi"', "ok"]]), '"say ""hi""",ok');
check("to csv numbers", toCSV([[1, 2.5]]), "1,2.5");
check("to csv newline", toCSV([["a\nb", "c"]]), '"a\nb",c');
check("to csv empty", toCSV([]), "");
check("to csv empty cell", toCSV([["a", ""]]), "a,");

console.log();
const data = "name,team,score\nAnn,red,30\nBob,blue,25\nCy,red,40\nDee,blue,10\nEli,red,5";
const objs = parseObjects(data);
check("object count", objs.length, 5);
check("first object", objs[0], { name: "Ann", team: "red", score: "30" });
check("column sum", columnSum(objs, "score"), 110);
check("group count", groupCount(objs, "team"), { red: 3, blue: 2 });
check("sort numeric", sortBy(objs, "score", true).map((o) => o.name), ["Eli", "Dee", "Bob", "Ann", "Cy"]);
check("sort text", sortBy(objs, "name", false).map((o) => o.name), ["Ann", "Bob", "Cy", "Dee", "Eli"]);
check("sort keeps original", objs[0].name, "Ann");
check("filter high", objs.filter((o) => Number(o.score) >= 25).length, 3);
check("header only", parseObjects("a,b"), []);
check("no text objects", parseObjects(""), []);
check("ragged row raises", raises(() => parseObjects("a,b\n1")), true);
check("missing column raises", raises(() => columnSum(objs, "nope")), true);
check("text column raises", raises(() => columnSum(objs, "name")), true);

console.log();
const sample = [["name", "note"], ["Ann", "likes, commas"], ["Bob", 'says "hi"'], ["Cy", "two\nlines"], ["Dee", ""]];
check("round trip sample", parseCSV(toCSV(sample)), sample);

let seed = 1357;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const pool = ["a", "b c", "x,y", 'q"t', "line\nbreak", "", "42", " lead", "end ", "a,b,c", '""'];
let roundOk = true;
for (let n = 0; n < 300; n++) {
  const rows = [];
  const rowCount = 1 + nextRandom(5);
  for (let r = 0; r < rowCount; r++) {
    const row = [];
    for (let c = 0; c < 3; c++) {
      row.push(pool[nextRandom(pool.length)]);
    }
    rows.push(row);
  }
  const back = parseCSV(toCSV(rows));
  if (JSON.stringify(back) !== JSON.stringify(rows)) {
    roundOk = false;
  }
}
check("300 random round trips", roundOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
