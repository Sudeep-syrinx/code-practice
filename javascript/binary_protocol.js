const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class BinaryWriter {
  constructor(buffer) {
    this.buffer = buffer || new ArrayBuffer(1024);
    this.view = new DataView(this.buffer);
    this.offset = 0;
  }
  writeUint8(val) { this.view.setUint8(this.offset++, val); return this; }
  writeUint16(val, le) { this.view.setUint16(this.offset, val, le !== false); this.offset += 2; return this; }
  writeUint32(val, le) { this.view.setUint32(this.offset, val, le !== false); this.offset += 4; return this; }
  writeFloat32(val, le) { this.view.setFloat32(this.offset, val, le !== false); this.offset += 4; return this; }
  writeFloat64(val, le) { this.view.setFloat64(this.offset, val, le !== false); this.offset += 8; return this; }
  writeBytes(arr) { for (const b of arr) this.writeUint8(b); return this; }
  writeString(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    this.writeUint32(bytes.length);
    this.writeBytes(bytes);
    return this;
  }
  writeVarint(val) {
    let v = val >>> 0;
    while (v > 0x7F) {
      this.writeUint8((v & 0x7F) | 0x80);
      v >>>= 7;
    }
    this.writeUint8(v & 0x7F);
    return this;
  }
  toArray() { return new Uint8Array(this.buffer, 0, this.offset); }
  getOffset() { return this.offset; }
}

class BinaryReader {
  constructor(buffer) {
    this.buffer = buffer instanceof Uint8Array ? buffer.buffer : buffer;
    this.view = new DataView(this.buffer);
    this.offset = 0;
  }
  readUint8() { return this.view.getUint8(this.offset++); }
  readUint16(le) { const v = this.view.getUint16(this.offset, le !== false); this.offset += 2; return v; }
  readUint32(le) { const v = this.view.getUint32(this.offset, le !== false); this.offset += 4; return v; }
  readFloat32(le) { const v = this.view.getFloat32(this.offset, le !== false); this.offset += 4; return v; }
  readFloat64(le) { const v = this.view.getFloat64(this.offset, le !== false); this.offset += 8; return v; }
  readBytes(n) {
    const arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) arr[i] = this.readUint8();
    return arr;
  }
  readString() {
    const len = this.readUint32();
    const bytes = this.readBytes(len);
    return new TextDecoder().decode(bytes);
  }
  readVarint() {
    let result = 0, shift = 0;
    while (true) {
      const b = this.readUint8();
      result |= (b & 0x7F) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    return result >>> 0;
  }
  remaining() { return this.view.byteLength - this.offset; }
  isEOF() { return this.offset >= this.view.byteLength; }
}

class ProtocolSchema {
  constructor(fields) {
    this.fields = fields;
  }
  serialize(obj) {
    const writer = new BinaryWriter();
    for (const field of this.fields) {
      const val = obj[field.name];
      switch (field.type) {
        case "uint8": writer.writeUint8(val); break;
        case "uint16": writer.writeUint16(val); break;
        case "uint32": writer.writeUint32(val); break;
        case "float32": writer.writeFloat32(val); break;
        case "float64": writer.writeFloat64(val); break;
        case "string": writer.writeString(val); break;
        case "varint": writer.writeVarint(val); break;
        case "bytes": writer.writeUint32(val.length); writer.writeBytes(val); break;
      }
    }
    return writer.toArray();
  }
  deserialize(buffer) {
    const reader = new BinaryReader(buffer);
    const obj = {};
    for (const field of this.fields) {
      switch (field.type) {
        case "uint8": obj[field.name] = reader.readUint8(); break;
        case "uint16": obj[field.name] = reader.readUint16(); break;
        case "uint32": obj[field.name] = reader.readUint32(); break;
        case "float32": obj[field.name] = reader.readFloat32(); break;
        case "float64": obj[field.name] = reader.readFloat64(); break;
        case "string": obj[field.name] = reader.readString(); break;
        case "varint": obj[field.name] = reader.readVarint(); break;
        case "bytes": { const len = reader.readUint32(); obj[field.name] = reader.readBytes(len); break; }
      }
    }
    return obj;
  }
  fieldCount() { return this.fields.length; }
}

check("writer uint8 roundtrip", (() => {
  const w = new BinaryWriter(); w.writeUint8(255);
  const r = new BinaryReader(w.toArray());
  return r.readUint8();
})(), 255);
check("writer uint16 roundtrip", (() => {
  const w = new BinaryWriter(); w.writeUint16(1000);
  const r = new BinaryReader(w.toArray());
  return r.readUint16();
})(), 1000);
check("writer uint32 roundtrip", (() => {
  const w = new BinaryWriter(); w.writeUint32(100000);
  const r = new BinaryReader(w.toArray());
  return r.readUint32();
})(), 100000);
check("writer float32 roundtrip", (() => {
  const w = new BinaryWriter(); w.writeFloat32(3.14);
  const r = new BinaryReader(w.toArray());
  return Math.abs(r.readFloat32() - 3.14) < 0.001;
})(), true);
check("writer float64 roundtrip", (() => {
  const w = new BinaryWriter(); w.writeFloat64(2.718281828);
  const r = new BinaryReader(w.toArray());
  return Math.abs(r.readFloat64() - 2.718281828) < 0.0000001;
})(), true);
check("writer string roundtrip", (() => {
  const w = new BinaryWriter(); w.writeString("hello world");
  const r = new BinaryReader(w.toArray());
  return r.readString();
})(), "hello world");
check("writer varint small", (() => {
  const w = new BinaryWriter(); w.writeVarint(42);
  const r = new BinaryReader(w.toArray());
  return r.readVarint();
})(), 42);
check("writer varint large", (() => {
  const w = new BinaryWriter(); w.writeVarint(300);
  const r = new BinaryReader(w.toArray());
  return r.readVarint();
})(), 300);
check("writer bytes roundtrip", (() => {
  const w = new BinaryWriter(); w.writeBytes([1, 2, 3, 4]);
  const r = new BinaryReader(w.toArray());
  return [...r.readBytes(4)];
})(), [1, 2, 3, 4]);
check("schema serialize deserialize", (() => {
  const schema = new ProtocolSchema([
    { name: "id", type: "uint32" },
    { name: "name", type: "string" },
    { name: "score", type: "float64" }
  ]);
  const obj = { id: 42, name: "Alice", score: 99.5 };
  const buf = schema.serialize(obj);
  return schema.deserialize(buf);
})(), { id: 42, name: "Alice", score: 99.5 });
check("schema complex types", (() => {
  const schema = new ProtocolSchema([
    { name: "tag", type: "uint8" },
    { name: "count", type: "varint" },
    { name: "data", type: "bytes" }
  ]);
  const obj = { tag: 7, count: 1000, data: new Uint8Array([10, 20, 30]) };
  const buf = schema.serialize(obj);
  const result = schema.deserialize(buf);
  return result.tag === 7 && result.count === 1000 && [...result.data].join(",") === "10,20,30";
})(), true);
check("reader eof detection", (() => {
  const w = new BinaryWriter(); w.writeUint8(1);
  const r = new BinaryReader(w.toArray());
  r.readUint8();
  return r.isEOF();
})(), true);
check("writer offset tracking", (() => {
  const w = new BinaryWriter();
  w.writeUint8(1); w.writeUint32(2);
  return w.getOffset();
})(), 5);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
