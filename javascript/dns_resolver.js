const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class DNSResolver {
  constructor() {
    this.cache = new Map();
    this.records = new Map();
    this.stats = { hits: 0, misses: 0, queries: 0 };
  }
  addRecord(name, type, value, ttl) {
    const key = name + ":" + type;
    if (!this.records.has(key)) this.records.set(key, []);
    this.records.get(key).push({ value, ttl, created: Date.now() });
  }
  _isExpired(entry) {
    return (Date.now() - entry.created) / 1000 > entry.ttl;
  }
  _lookup(name, type) {
    const key = name + ":" + type;
    const records = this.records.get(key);
    if (!records) return null;
    const valid = records.filter(r => !this._isExpired(r));
    if (valid.length === 0) return null;
    return valid.map(r => r.value);
  }
  resolve(name, type) {
    this.stats.queries++;
    const cacheKey = name + ":" + type;
    const cached = this.cache.get(cacheKey);
    if (cached && !this._isExpired(cached)) {
      this.stats.hits++;
      return cached.values;
    }
    this.stats.misses++;
    const values = this._lookup(name, type);
    if (values) {
      this.cache.set(cacheKey, { values, created: Date.now(), ttl: 300 });
    }
    return values;
  }
  resolveCNAME(name) {
    const cnames = this.resolve(name, "CNAME");
    if (!cnames || cnames.length === 0) return name;
    return this.resolveCNAME(cnames[0]);
  }
  resolveWithCNAME(name, type) {
    const resolvedName = this.resolveCNAME(name);
    return this.resolve(resolvedName, type);
  }
  clearCache() { this.cache.clear(); }
  getStats() { return { ...this.stats, cacheSize: this.cache.size }; }
}

class DNSPacket {
  constructor() {
    this.id = 0;
    this.qr = 0;
    this.questions = [];
    this.answers = [];
  }
  addQuestion(name, type) {
    this.questions.push({ name, type });
  }
  addAnswer(name, type, value, ttl) {
    this.answers.push({ name, type, value, ttl });
  }
  encode() {
    const parts = [];
    parts.push(this.id.toString(16).padStart(4, "0"));
    parts.push(this.qr.toString());
    parts.push(this.questions.length.toString());
    parts.push(this.answers.length.toString());
    for (const q of this.questions) parts.push("Q:" + q.name + ":" + q.type);
    for (const a of this.answers) parts.push("A:" + a.name + ":" + a.type + ":" + a.value + ":" + a.ttl);
    return parts.join("|");
  }
  static decode(raw) {
    const parts = raw.split("|");
    const pkt = new DNSPacket();
    pkt.id = parseInt(parts[0], 16);
    pkt.qr = parseInt(parts[1]);
    const qCount = parseInt(parts[2]);
    const aCount = parseInt(parts[3]);
    let idx = 4;
    for (let i = 0; i < qCount; i++) {
      const segs = parts[idx++].split(":");
      pkt.addQuestion(segs[1], segs[2]);
    }
    for (let i = 0; i < aCount; i++) {
      const segs = parts[idx++].split(":");
      pkt.addAnswer(segs[1], segs[2], segs[3], parseInt(segs[4]));
    }
    return pkt;
  }
}

class DNSServer {
  constructor() {
    this.zones = new Map();
  }
  addZone(domain, records) {
    this.zones.set(domain, records);
  }
  handleQuery(packet) {
    const response = new DNSPacket();
    response.id = packet.id;
    response.qr = 1;
    for (const q of packet.questions) {
      response.addQuestion(q.name, q.type);
      for (const [domain, records] of this.zones) {
        if (q.name.endsWith(domain) || q.name === domain) {
          const matching = records.filter(r => r.name === q.name && r.type === q.type);
          for (const r of matching) response.addAnswer(r.name, r.type, r.value, r.ttl || 300);
        }
      }
    }
    return response;
  }
}

check("dns resolver basic lookup", (() => {
  const dns = new DNSResolver();
  dns.addRecord("example.com", "A", "93.184.216.34", 300);
  return dns.resolve("example.com", "A");
})(), ["93.184.216.34"]);
check("dns resolver miss returns null", (() => {
  const dns = new DNSResolver();
  return dns.resolve("missing.com", "A");
})(), null);
check("dns resolver cache hit", (() => {
  const dns = new DNSResolver();
  dns.addRecord("test.com", "A", "1.2.3.4", 300);
  dns.resolve("test.com", "A");
  dns.resolve("test.com", "A");
  return dns.getStats().hits;
})(), 1);
check("dns resolver cname chain", (() => {
  const dns = new DNSResolver();
  dns.addRecord("alias.com", "CNAME", "real.com", 300);
  dns.addRecord("real.com", "A", "5.6.7.8", 300);
  return dns.resolveWithCNAME("alias.com", "A");
})(), ["5.6.7.8"]);
check("dns packet encode decode roundtrip", (() => {
  const pkt = new DNSPacket();
  pkt.id = 0xABCD;
  pkt.addQuestion("example.com", "A");
  pkt.addAnswer("example.com", "A", "1.2.3.4", 300);
  const decoded = DNSPacket.decode(pkt.encode());
  return decoded.id === 0xABCD && decoded.questions.length === 1 && decoded.answers.length === 1;
})(), true);
check("dns server handles query", (() => {
  const srv = new DNSServer();
  srv.addZone("example.com", [{ name: "example.com", type: "A", value: "10.0.0.1", ttl: 60 }]);
  const q = new DNSPacket();
  q.addQuestion("example.com", "A");
  const resp = srv.handleQuery(q);
  return resp.qr === 1 && resp.answers.length === 1 && resp.answers[0].value === "10.0.0.1";
})(), true);
check("dns server no match empty answers", (() => {
  const srv = new DNSServer();
  const q = new DNSPacket();
  q.addQuestion("unknown.com", "A");
  return srv.handleQuery(q).answers.length;
})(), 0);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
