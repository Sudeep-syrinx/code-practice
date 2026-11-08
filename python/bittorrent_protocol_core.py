import hashlib
import struct
from collections import OrderedDict

# --- Bencode Protocol (Torrent Files) ---
class Bencode:
    @staticmethod
    def encode(data):
        if isinstance(data, int):
            return f"i{data}e".encode('utf-8')
        elif isinstance(data, str):
            return f"{len(data)}:{data}".encode('utf-8')
        elif isinstance(data, bytes):
            return str(len(data)).encode('utf-8') + b':' + data
        elif isinstance(data, list):
            return b'l' + b''.join([Bencode.encode(item) for item in data]) + b'e'
        elif isinstance(data, (dict, OrderedDict)):
            # Dict keys must be strings and sorted
            encoded = b'd'
            for key in sorted(data.keys()):
                encoded += Bencode.encode(key) + Bencode.encode(data[key])
            encoded += b'e'
            return encoded
        else:
            raise TypeError(f"Unsupported data type for bencoding: {type(data)}")

    @staticmethod
    def decode(data):
        result, _ = Bencode._decode_internal(data, 0)
        return result

    @staticmethod
    def _decode_internal(data, index):
        if data[index:index+1] == b'i':
            end = data.find(b'e', index)
            return int(data[index+1:end]), end + 1
            
        elif data[index:index+1] == b'l':
            lst = []
            index += 1
            while data[index:index+1] != b'e':
                item, index = Bencode._decode_internal(data, index)
                lst.append(item)
            return lst, index + 1
            
        elif data[index:index+1] == b'd':
            dct = OrderedDict()
            index += 1
            while data[index:index+1] != b'e':
                key, index = Bencode._decode_internal(data, index)
                if isinstance(key, bytes):
                    key = key.decode('utf-8', errors='ignore')
                value, index = Bencode._decode_internal(data, index)
                dct[key] = value
            return dct, index + 1
            
        elif data[index:index+1] in b'0123456789':
            colon = data.find(b':', index)
            length = int(data[index:colon])
            string_data = data[colon+1:colon+1+length]
            return string_data, colon + 1 + length
            
        else:
            raise ValueError(f"Invalid bencode format at index {index}")

# --- Peer Wire Protocol Messages ---
class PeerMessage:
    # Message IDs
    CHOKE = 0
    UNCHOKE = 1
    INTERESTED = 2
    NOT_INTERESTED = 3
    HAVE = 4
    BITFIELD = 5
    REQUEST = 6
    PIECE = 7
    CANCEL = 8

    @staticmethod
    def handshake(info_hash: bytes, peer_id: bytes) -> bytes:
        pstr = b"BitTorrent protocol"
        pstrlen = bytes([len(pstr)])
        reserved = b'\x00' * 8
        return pstrlen + pstr + reserved + info_hash + peer_id

    @staticmethod
    def request(index: int, begin: int, length: int) -> bytes:
        payload = struct.pack(">III", index, begin, length)
        msg_len = struct.pack(">I", 1 + len(payload))
        return msg_len + bytes([PeerMessage.REQUEST]) + payload

    @staticmethod
    def piece(index: int, begin: int, block: bytes) -> bytes:
        payload = struct.pack(">II", index, begin) + block
        msg_len = struct.pack(">I", 1 + len(payload))
        return msg_len + bytes([PeerMessage.PIECE]) + payload

    @staticmethod
    def bitfield(bitfield_bytes: bytes) -> bytes:
        msg_len = struct.pack(">I", 1 + len(bitfield_bytes))
        return msg_len + bytes([PeerMessage.BITFIELD]) + bitfield_bytes

if __name__ == "__main__":
    print("--- BITTORRENT PROTOCOL CORE ---")
    
    # 1. Bencode Test
    torrent_data = OrderedDict({
        'announce': 'http://tracker.example.com/announce',
        'info': OrderedDict({
            'name': 'debian-11.3.0-amd64-netinst.iso',
            'length': 396361728,
            'piece length': 262144,
            'pieces': b'\x12\x34\x56' * 100 # Dummy SHA1 hashes
        })
    })
    
    print("\n1. Bencoding Complex Torrent Metadata")
    encoded = Bencode.encode(torrent_data)
    print(f"Encoded Preview: {encoded[:80]}...")
    
    decoded = Bencode.decode(encoded)
    print("Decoded verification matches original:", decoded['announce'] == b'http://tracker.example.com/announce')
    
    # 2. Info Hash Calculation
    # The info_hash is the SHA1 hash of the bencoded 'info' dictionary
    info_bencoded = Bencode.encode(torrent_data['info'])
    info_hash = hashlib.sha1(info_bencoded).digest()
    print(f"\n2. Generated Info Hash: {info_hash.hex()}")
    
    # 3. Peer Wire Protocol Packaging
    peer_id = b"-PC0001-123456789012"
    hs = PeerMessage.handshake(info_hash, peer_id)
    print(f"\n3. Constructed Handshake Packet (length {len(hs)}):")
    print(hs[:28], "...")
    
    req = PeerMessage.request(index=0, begin=16384, length=16384)
    print(f"Constructed Block Request Packet (length {len(req)}):")
    print(req.hex())
    
    # Decode the request packet to verify structure
    req_len = struct.unpack(">I", req[:4])[0]
    msg_id = req[4]
    idx, begin, length = struct.unpack(">III", req[5:])
    print(f"Decoded Request -> Length: {req_len}, ID: {msg_id}, Index: {idx}, Begin: {begin}, BlockLen: {length}")
