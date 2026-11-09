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

const URL_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(?:([^:@\/?#]*)(?::([^@\/?#]*))?@)?([^:\/?#]*)(?::(\d+))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/;
const DEFAULT_PORTS = { http: 80, https: 443, ftp: 21, ssh: 22 };

function parseUrl(text) {
  if (typeof text !== "string") {
    throw new Error("url must be a string");
  }
  const m = URL_RE.exec(text.trim());
  if (m === null) {
    throw new Error("bad url: " + text);
  }
  if (m[4] === "") {
    throw new Error("url has no host");
  }
  let port = null;
  if (m[5] !== undefined) {
    port = Number(m[5]);
    if (port > 65535) {
      throw new Error("port out of range");
    }
  }
  return {
    scheme: m[1].toLowerCase(),
    user: m[2] === undefined ? null : m[2],
    password: m[3] === undefined ? null : m[3],
    host: m[4].toLowerCase(),
    port: port,
    path: m[6] === "" ? "/" : m[6],
    query: m[7] === undefined ? "" : m[7],
    hash: m[8] === undefined ? "" : m[8],
  };
}

function formatUrl(u) {
  let out = u.scheme + "://";
  if (u.user !== null) {
    out += u.user;
    if (u.password !== null) {
      out += ":" + u.password;
    }
    out += "@";
  }
  out += u.host;
  if (u.port !== null) {
    out += ":" + u.port;
  }
  out += u.path;
  if (u.query !== "") {
    out += "?" + u.query;
  }
  if (u.hash !== "") {
    out += "#" + u.hash;
  }
  return out;
}

function effectivePort(u) {
  if (u.port !== null) {
    return u.port;
  }
  return Object.prototype.hasOwnProperty.call(DEFAULT_PORTS, u.scheme) ? DEFAULT_PORTS[u.scheme] : null;
}

function sameOrigin(a, b) {
  const x = parseUrl(a);
  const y = parseUrl(b);
  return x.scheme === y.scheme && x.host === y.host && effectivePort(x) === effectivePort(y);
}

function decode(s) {
  return decodeURIComponent(s.replace(/\+/g, " "));
}

function parseQuery(text) {
  if (typeof text !== "string") {
    throw new Error("query must be a string");
  }
  const out = {};
  const body = text.startsWith("?") ? text.slice(1) : text;
  for (const part of body.split("&")) {
    if (part === "") {
      continue;
    }
    const eq = part.indexOf("=");
    const key = decode(eq === -1 ? part : part.slice(0, eq));
    const value = eq === -1 ? "" : decode(part.slice(eq + 1));
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      if (Array.isArray(out[key])) {
        out[key].push(value);
      } else {
        out[key] = [out[key], value];
      }
    } else {
      out[key] = value;
    }
  }
  return out;
}

function buildQuery(obj) {
  if (obj === null || typeof obj !== "object") {
    throw new Error("query must be an object");
  }
  const parts = [];
  for (const key of Object.keys(obj)) {
    const values = Array.isArray(obj[key]) ? obj[key] : [obj[key]];
    for (const v of values) {
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(v)));
    }
  }
  return parts.join("&");
}

function normalizePath(path) {
  if (typeof path !== "string") {
    throw new Error("path must be a string");
  }
  const segments = path.split("/");
  const stack = [];
  for (const seg of segments) {
    if (seg === "" || seg === ".") {
      continue;
    }
    if (seg === "..") {
      stack.pop();
    } else {
      stack.push(seg);
    }
  }
  const last = segments[segments.length - 1];
  const trailing = last === "" || last === "." || last === "..";
  if (stack.length === 0) {
    return "/";
  }
  return "/" + stack.join("/") + (trailing ? "/" : "");
}

const full = parseUrl("https://user:pw@example.com:8080/a/b?x=1&y=2#top");
check("scheme", full.scheme, "https");
check("user", full.user, "user");
check("password", full.password, "pw");
check("host", full.host, "example.com");
check("port", full.port, 8080);
check("path", full.path, "/a/b");
check("query", full.query, "x=1&y=2");
check("hash", full.hash, "top");

console.log();
const bare = parseUrl("http://example.com");
check("bare path", bare.path, "/");
check("bare port", bare.port, null);
check("bare query", bare.query, "");
check("bare hash", bare.hash, "");
check("bare user", bare.user, null);
check("user only", parseUrl("http://bob@host.com/").password, null);
check("user only name", parseUrl("http://bob@host.com/").user, "bob");
check("query no path", parseUrl("http://example.com?x=1").query, "x=1");
check("hash no path", parseUrl("http://example.com#h").hash, "h");
check("lowercases", parseUrl("HTTP://EXAMPLE.com/Path").host, "example.com");
check("lowercase scheme", parseUrl("HTTP://EXAMPLE.com/Path").scheme, "http");
check("keeps path case", parseUrl("HTTP://EXAMPLE.com/Path").path, "/Path");
check("trims", parseUrl("  http://a.com/  ").host, "a.com");
check("no scheme", raises(() => parseUrl("example.com")), true);
check("one slash", raises(() => parseUrl("ftp:/x")), true);
check("mailto style", raises(() => parseUrl("mailto:a@b.com")), true);
check("empty host", raises(() => parseUrl("http:///path")), true);
check("port too big", raises(() => parseUrl("http://x.com:99999/")), true);
check("not a string", raises(() => parseUrl(5)), true);

console.log();
for (const u of ["https://user:pw@example.com:8080/a/b?x=1&y=2#top", "http://example.com/", "https://a.b/c#frag", "ftp://files.net:21/pub/"]) {
  check("round trip " + u.slice(0, 12), formatUrl(parseUrl(u)), u);
}
check("format adds slash", formatUrl(parseUrl("http://example.com")), "http://example.com/");
check("default port http", effectivePort(parseUrl("http://a.com")), 80);
check("default port https", effectivePort(parseUrl("https://a.com")), 443);
check("explicit port", effectivePort(parseUrl("https://a.com:8443")), 8443);
check("unknown scheme port", effectivePort(parseUrl("gopher://a.com")), null);
check("same origin", sameOrigin("https://a.com/x", "https://a.com:443/y"), true);
check("other host", sameOrigin("https://a.com", "https://b.com"), false);
check("other scheme", sameOrigin("http://a.com", "https://a.com"), false);
check("other port", sameOrigin("http://a.com", "http://a.com:81"), false);

console.log();
check("query simple", parseQuery("a=1&b=2"), { a: "1", b: "2" });
check("query question mark", parseQuery("?a=1"), { a: "1" });
check("query repeated", parseQuery("a=1&a=2&a=3"), { a: ["1", "2", "3"] });
check("query no equals", parseQuery("a"), { a: "" });
check("query empty value", parseQuery("a=&b"), { a: "", b: "" });
check("query percent", parseQuery("x=hello%20world"), { x: "hello world" });
check("query plus", parseQuery("x=hello+world"), { x: "hello world" });
check("query encoded equals", parseQuery("x=a%3Db"), { x: "a=b" });
check("query empty", parseQuery(""), {});
check("query stray ampersands", parseQuery("&&a=1&&"), { a: "1" });
check("query inherited name", parseQuery("constructor=1"), { constructor: "1" });
check("query bad escape", raises(() => parseQuery("x=%")), true);
check("query bad utf8", raises(() => parseQuery("x=%E9")), true);
check("query not string", raises(() => parseQuery(5)), true);
check("build simple", buildQuery({ a: "1", b: ["x", "y"] }), "a=1&b=x&b=y");
check("build empty", buildQuery({}), "");
check("build escapes", buildQuery({ q: "a b&c" }), "q=a%20b%26c");
check("build empty value", buildQuery({ k: "" }), "k=");
check("build number", buildQuery({ n: 5 }), "n=5");
check("build not object", raises(() => buildQuery("x")), true);

console.log();
check("path dots", normalizePath("/a/b/../c/./d"), "/a/c/d");
check("path trailing", normalizePath("/a/b/"), "/a/b/");
check("path above root", normalizePath("/../a"), "/a");
check("path to root", normalizePath("/a/.."), "/");
check("path root", normalizePath("/"), "/");
check("path empty", normalizePath(""), "/");
check("path doubles", normalizePath("/a//b"), "/a/b");
check("path trailing dots", normalizePath("/a/b/.."), "/a/");
check("path many ups", normalizePath("/a/b/c/../../.."), "/");
check("path not string", raises(() => normalizePath(5)), true);

console.log();
let seed = 303;
function nextRandom(limit) {
  seed = (seed * 16807) % 2147483647;
  return seed % limit;
}
const chars = ["a", "b", " ", "&", "=", "+", "%", "\u00e9", "#", "/"];
function randomText(maxLen) {
  let s = "";
  const len = nextRandom(maxLen);
  for (let i = 0; i < len; i++) {
    s += chars[nextRandom(chars.length)];
  }
  return s;
}
let queryOk = true;
for (let round = 0; round < 300; round++) {
  const obj = {};
  for (const key of ["a", "b", "c", "d"]) {
    if (nextRandom(2) === 0) {
      continue;
    }
    const count = 1 + nextRandom(3);
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push(randomText(8));
    }
    obj[key] = count === 1 ? values[0] : values;
  }
  if (JSON.stringify(parseQuery(buildQuery(obj))) !== JSON.stringify(obj)) {
    queryOk = false;
  }
}
check("300 query round trips", queryOk, true);

let pathOk = true;
const names = ["a", "b", "..", ".", "", "c"];
for (let round = 0; round < 300; round++) {
  let path = "";
  const len = nextRandom(8);
  for (let i = 0; i < len; i++) {
    path += "/" + names[nextRandom(names.length)];
  }
  const once = normalizePath(path);
  if (normalizePath(once) !== once || !once.startsWith("/") || once.includes("//") || once.includes("/./") || once.includes("/../")) {
    pathOk = false;
  }
}
check("300 paths idempotent", pathOk, true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
