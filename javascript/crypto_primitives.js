const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class SHA256Simple {
  static hash(data) {
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const msgLen = bytes.length;
    const bitLen = msgLen * 8;
    const paddedLen = ((msgLen + 9 + 63) & ~63);
    const padded = new Uint8Array(paddedLen);
    padded.set(bytes);
    padded[msgLen] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(paddedLen - 4, bitLen, false);
    const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;
    const ch = (x, y, z) => ((x & y) ^ (~x & z)) >>> 0;
    const maj = (x, y, z) => ((x & y) ^ (x & z) ^ (y & z)) >>> 0;
    const sigma0 = (x) => (rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22)) >>> 0;
    const sigma1 = (x) => (rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25)) >>> 0;
    const gamma0 = (x) => (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
    const gamma1 = (x) => (rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10)) >>> 0;
    const state = [...H];
    for (let offset = 0; offset < paddedLen; offset += 64) {
      const W = new Array(64);
      for (let t = 0; t < 16; t++) W[t] = view.getUint32(offset + t * 4, false);
      for (let t = 16; t < 64; t++) W[t] = (gamma1(W[t - 2]) + W[t - 7] + gamma0(W[t - 15]) + W[t - 16]) >>> 0;
      let [a, b, c, d, e, f, g, h] = state;
      for (let t = 0; t < 64; t++) {
        const T1 = (h + sigma1(e) + ch(e, f, g) + K[t] + W[t]) >>> 0;
        const T2 = (sigma0(a) + maj(a, b, c)) >>> 0;
        h = g; g = f; f = e; e = (d + T1) >>> 0;
        d = c; c = b; b = a; a = (T1 + T2) >>> 0;
      }
      state[0] = (state[0] + a) >>> 0; state[1] = (state[1] + b) >>> 0;
      state[2] = (state[2] + c) >>> 0; state[3] = (state[3] + d) >>> 0;
      state[4] = (state[4] + e) >>> 0; state[5] = (state[5] + f) >>> 0;
      state[6] = (state[6] + g) >>> 0; state[7] = (state[7] + h) >>> 0;
    }
    return state.map(v => v.toString(16).padStart(8, "0")).join("");
  }
}

class HMAC {
  static compute(key, message, hashFn) {
    const blockSize = 64;
    let keyBytes = typeof key === "string" ? new TextEncoder().encode(key) : key;
    if (keyBytes.length > blockSize) {
      const hashed = hashFn(keyBytes);
      keyBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) keyBytes[i] = parseInt(hashed.substr(i * 2, 2), 16);
    }
    const paddedKey = new Uint8Array(blockSize);
    paddedKey.set(keyBytes);
    const ipad = new Uint8Array(blockSize);
    const opad = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
      ipad[i] = paddedKey[i] ^ 0x36;
      opad[i] = paddedKey[i] ^ 0x5c;
    }
    const msgBytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
    const inner = new Uint8Array(blockSize + msgBytes.length);
    inner.set(ipad); inner.set(msgBytes, blockSize);
    const innerHash = hashFn(inner);
    const innerHashBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) innerHashBytes[i] = parseInt(innerHash.substr(i * 2, 2), 16);
    const outer = new Uint8Array(blockSize + 32);
    outer.set(opad); outer.set(innerHashBytes, blockSize);
    return hashFn(outer);
  }
}

class PBKDF2 {
  static derive(password, salt, iterations, keyLen, hashFn) {
    const pwBytes = typeof password === "string" ? new TextEncoder().encode(password) : password;
    const saltBytes = typeof salt === "string" ? new TextEncoder().encode(salt) : salt;
    const blocksNeeded = Math.ceil(keyLen / 32);
    const dk = new Uint8Array(blocksNeeded * 32);
    for (let block = 1; block <= blocksNeeded; block++) {
      const saltBlock = new Uint8Array(saltBytes.length + 4);
      saltBlock.set(saltBytes);
      new DataView(saltBlock.buffer).setUint32(saltBytes.length, block, false);
      let u = HMAC.compute(pwBytes, saltBlock, hashFn);
      let result = new Uint8Array(32);
      for (let i = 0; i < 32; i++) result[i] = parseInt(u.substr(i * 2, 2), 16);
      let prev = result;
      for (let iter = 1; iter < iterations; iter++) {
        u = HMAC.compute(pwBytes, prev, hashFn);
        const uBytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) uBytes[i] = parseInt(u.substr(i * 2, 2), 16);
        for (let i = 0; i < 32; i++) result[i] ^= uBytes[i];
        prev = uBytes;
      }
      dk.set(result, (block - 1) * 32);
    }
    return dk.slice(0, keyLen);
  }
}

check("sha256 empty string", (() => {
  return SHA256Simple.hash("").substring(0, 16);
})(), "e3b0c44298fc1c14");
check("sha256 abc", (() => {
  return SHA256Simple.hash("abc").substring(0, 16);
})(), "ba7816bf8f01cfea");
check("sha256 deterministic", (() => {
  return SHA256Simple.hash("test") === SHA256Simple.hash("test");
})(), true);
check("sha256 different inputs differ", (() => {
  return SHA256Simple.hash("a") !== SHA256Simple.hash("b");
})(), true);
check("hmac produces hex string", (() => {
  const mac = HMAC.compute("key", "message", SHA256Simple.hash);
  return typeof mac === "string" && mac.length === 64;
})(), true);
check("hmac deterministic", (() => {
  const a = HMAC.compute("k", "m", SHA256Simple.hash);
  const b = HMAC.compute("k", "m", SHA256Simple.hash);
  return a === b;
})(), true);
check("hmac different keys differ", (() => {
  return HMAC.compute("k1", "m", SHA256Simple.hash) !== HMAC.compute("k2", "m", SHA256Simple.hash);
})(), true);
check("pbkdf2 produces correct length", (() => {
  const dk = PBKDF2.derive("password", "salt", 1, 32, SHA256Simple.hash);
  return dk.length;
})(), 32);
check("pbkdf2 deterministic", (() => {
  const a = PBKDF2.derive("pw", "s", 1, 16, SHA256Simple.hash);
  const b = PBKDF2.derive("pw", "s", 1, 16, SHA256Simple.hash);
  return a.every((v, i) => v === b[i]);
})(), true);
check("pbkdf2 different iterations differ", (() => {
  const a = PBKDF2.derive("pw", "s", 1, 16, SHA256Simple.hash);
  const b = PBKDF2.derive("pw", "s", 2, 16, SHA256Simple.hash);
  return !a.every((v, i) => v === b[i]);
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
