import struct

def serialize_dict(data):
    buf = bytearray()
    buf.extend(struct.pack(">H", len(data)))
    for k, v in data.items():
        kb = k.encode("utf-8")
        vb = str(v).encode("utf-8")
        buf.extend(struct.pack(">H", len(kb)))
        buf.extend(kb)
        buf.extend(struct.pack(">I", len(vb)))
        buf.extend(vb)
    return bytes(buf)

def deserialize_dict(buf):
    offset = 0
    count = struct.unpack_from(">H", buf, offset)[0]
    offset += 2
    data = {}
    for _ in range(count):
        klen = struct.unpack_from(">H", buf, offset)[0]
        offset += 2
        key = buf[offset:offset+klen].decode("utf-8")
        offset += klen
        vlen = struct.unpack_from(">I", buf, offset)[0]
        offset += 4
        val = buf[offset:offset+vlen].decode("utf-8")
        offset += vlen
        data[key] = val
    return data

if __name__ == "__main__":
    original = {"name": "Alice", "age": "30", "city": "New York"}
    packed = serialize_dict(original)
    unpacked = deserialize_dict(packed)
    print("Original:", original)
    print("Packed size:", len(packed), "bytes")
    print("Unpacked:", unpacked)
    print("Roundtrip successful:", original == unpacked)
