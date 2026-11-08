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

const NEED = { motorcycle: 1, car: 2, truck: 3 };
const SIZE_RANK = { S: 1, M: 2, L: 3 };

function parkingFee(minutes) {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error("minutes must be a non-negative integer");
  }
  const hours = Math.max(1, Math.ceil(minutes / 60));
  const fee = 300 + (hours - 1) * 200;
  return Math.min(fee, 2000);
}

class ParkingLot {
  constructor(config) {
    this.spots = [];
    const sizes = [["S", config.small || 0], ["M", config.medium || 0], ["L", config.large || 0]];
    for (const [letter, count] of sizes) {
      for (let i = 1; i <= count; i++) {
        this.spots.push({ id: letter + i, rank: SIZE_RANK[letter], plate: null });
      }
    }
    this.parked = new Map();
    this.revenue = 0;
    this.visits = 0;
  }

  findSpot(type) {
    const need = NEED[type];
    for (const spot of this.spots) {
      if (spot.plate === null && spot.rank >= need) {
        return spot;
      }
    }
    return null;
  }

  park(plate, type, minute) {
    if (!plate) {
      throw new Error("plate is required");
    }
    if (!(type in NEED)) {
      throw new Error("unknown vehicle type: " + type);
    }
    if (this.parked.has(plate)) {
      throw new Error("already parked: " + plate);
    }
    const spot = this.findSpot(type);
    if (spot === null) {
      throw new Error("no free spot for " + type);
    }
    spot.plate = plate;
    this.parked.set(plate, { spot: spot, type: type, start: minute });
    return spot.id;
  }

  leave(plate, minute) {
    if (!this.parked.has(plate)) {
      throw new Error("not parked: " + plate);
    }
    const entry = this.parked.get(plate);
    if (minute < entry.start) {
      throw new Error("cannot leave before arriving");
    }
    const fee = parkingFee(minute - entry.start);
    entry.spot.plate = null;
    this.parked.delete(plate);
    this.revenue += fee;
    this.visits++;
    return fee;
  }

  spotOf(plate) {
    if (!this.parked.has(plate)) {
      return null;
    }
    return this.parked.get(plate).spot.id;
  }

  totalSpots() {
    return this.spots.length;
  }

  occupiedCount() {
    return this.parked.size;
  }

  freeCount() {
    return this.spots.length - this.parked.size;
  }

  isFull() {
    return this.freeCount() === 0;
  }

  occupiedSpots() {
    return this.spots.filter((s) => s.plate !== null).map((s) => s.id).sort();
  }

  freeSpots() {
    return this.spots.filter((s) => s.plate === null).map((s) => s.id).sort();
  }

  plates() {
    return Array.from(this.parked.keys()).sort();
  }

  countType(type) {
    let count = 0;
    for (const entry of this.parked.values()) {
      if (entry.type === type) {
        count++;
      }
    }
    return count;
  }
}

check("fee 0 minutes", parkingFee(0), 300);
check("fee 1 minute", parkingFee(1), 300);
check("fee 60 minutes", parkingFee(60), 300);
check("fee 61 minutes", parkingFee(61), 500);
check("fee 120 minutes", parkingFee(120), 500);
check("fee 180 minutes", parkingFee(180), 700);
check("fee 540 minutes", parkingFee(540), 1900);
check("fee 600 minutes", parkingFee(600), 2000);
check("fee 5000 minutes", parkingFee(5000), 2000);
check("fee negative", raises(() => parkingFee(-1)), true);
check("fee decimal", raises(() => parkingFee(1.5)), true);

console.log();
const lot = new ParkingLot({ small: 2, medium: 3, large: 1 });
check("total spots", lot.totalSpots(), 6);
check("all free", lot.freeCount(), 6);
check("not full", lot.isFull(), false);
check("motorcycle spot", lot.park("AAA", "motorcycle", 0), "S1");
check("car spot", lot.park("BBB", "car", 0), "M1");
check("truck spot", lot.park("CCC", "truck", 0), "L1");
check("second truck full", raises(() => lot.park("DDD", "truck", 0)), true);
check("second motorcycle", lot.park("EEE", "motorcycle", 0), "S2");
check("motorcycle uses medium", lot.park("FFF", "motorcycle", 0), "M2");
check("third car", lot.park("GGG", "car", 0), "M3");
check("lot is full", lot.isFull(), true);
check("occupied count", lot.occupiedCount(), 6);
check("extra car refused", raises(() => lot.park("HHH", "car", 0)), true);
check("spot of plate", lot.spotOf("BBB"), "M1");
check("spot of unknown", lot.spotOf("ZZZ"), null);
check("cars parked", lot.countType("car"), 2);
check("motorcycles parked", lot.countType("motorcycle"), 2);
check("trucks parked", lot.countType("truck"), 1);

console.log();
check("leave BBB", lot.leave("BBB", 30), 300);
check("free count", lot.freeCount(), 1);
check("free spots", lot.freeSpots(), ["M1"]);
check("car takes freed spot", lot.park("HHH", "car", 30), "M1");
check("leave AAA", lot.leave("AAA", 61), 500);
check("leave CCC", lot.leave("CCC", 600), 2000);
check("leave EEE", lot.leave("EEE", 120), 500);
check("leave FFF", lot.leave("FFF", 0), 300);
check("leave HHH", lot.leave("HHH", 150), 500);
check("revenue", lot.revenue, 4100);
check("visits", lot.visits, 6);
check("still parked", lot.plates(), ["GGG"]);
check("occupied spots", lot.occupiedSpots(), ["M3"]);
check("free spots after", lot.freeSpots(), ["L1", "M1", "M2", "S1", "S2"]);

console.log();
check("duplicate plate", raises(() => lot.park("GGG", "car", 0)), true);
check("leave unknown", raises(() => lot.leave("ZZZ", 10)), true);
check("leave twice", raises(() => lot.leave("AAA", 100)), true);
check("leave too early", raises(() => lot.leave("GGG", -5)), true);
check("bad type", raises(() => lot.park("NEW", "bus", 0)), true);
check("empty plate", raises(() => lot.park("", "car", 0)), true);
check("failed park safe", lot.occupiedCount(), 1);
check("revenue unchanged", lot.revenue, 4100);
check("truck now fits", lot.park("TTT", "truck", 200), "L1");

console.log();
const big = new ParkingLot({ small: 100, medium: 100, large: 100 });
check("big spots", big.totalSpots(), 300);
for (let i = 0; i < 100; i++) {
  big.park("M" + i, "motorcycle", 0);
}
for (let i = 0; i < 100; i++) {
  big.park("C" + i, "car", 0);
}
for (let i = 0; i < 100; i++) {
  big.park("T" + i, "truck", 0);
}
check("big full", big.isFull(), true);
check("big occupied", big.occupiedCount(), 300);
check("big extra refused", raises(() => big.park("X", "motorcycle", 0)), true);
check("big first motorcycle", big.spotOf("M0"), "S1");
check("big first car", big.spotOf("C0"), "M1");
check("big last truck", big.spotOf("T99"), "L100");
for (let i = 0; i < 100; i++) {
  big.leave("M" + i, 60);
  big.leave("C" + i, 60);
  big.leave("T" + i, 60);
}
check("big revenue", big.revenue, 90000);
check("big empty", big.occupiedCount(), 0);
check("big visits", big.visits, 300);
check("big free again", big.freeCount(), 300);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
