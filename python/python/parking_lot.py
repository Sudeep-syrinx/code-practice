import math
from enum import Enum


class VehicleType(Enum):
    MOTORCYCLE = 1
    CAR = 2
    TRUCK = 3


RATES = {
    VehicleType.MOTORCYCLE: 10,
    VehicleType.CAR: 20,
    VehicleType.TRUCK: 40,
}

PREFIX = {
    VehicleType.MOTORCYCLE: "M",
    VehicleType.CAR: "C",
    VehicleType.TRUCK: "T",
}


class LotFullError(Exception):
    pass


def fee(vtype, minutes):
    if minutes <= 15:
        return 0
    rate = RATES[vtype]
    cap = rate * 8
    days, rest = divmod(minutes, 1440)
    hours = math.ceil(rest / 60)
    return days * cap + min(cap, hours * rate)


class Spot:
    def __init__(self, spot_id, size):
        self.spot_id = spot_id
        self.size = size
        self.ticket = None


class Ticket:
    def __init__(self, ticket_id, plate, vtype, spot_id, entry):
        self.ticket_id = ticket_id
        self.plate = plate
        self.vtype = vtype
        self.spot_id = spot_id
        self.entry = entry


class ParkingLot:
    def __init__(self, layout):
        self.spots = []
        for vtype, count in layout.items():
            for i in range(1, count + 1):
                self.spots.append(Spot(f"{PREFIX[vtype]}{i}", vtype))
        self.by_id = {s.spot_id: s for s in self.spots}
        self.active = {}
        self.next_ticket = 1
        self.revenue = 0
        self.turned_away = 0
        self.completed = []

    def park(self, plate, vtype, minute):
        if plate in self.active:
            raise ValueError(f"{plate} is already parked")
        candidates = [
            s for s in self.spots
            if s.ticket is None and s.size.value >= vtype.value
        ]
        if not candidates:
            self.turned_away += 1
            raise LotFullError(f"No spot for {vtype.name.lower()} {plate}")
        spot = min(candidates, key=lambda s: (s.size.value, s.spot_id))
        ticket = Ticket(self.next_ticket, plate, vtype, spot.spot_id, minute)
        self.next_ticket += 1
        spot.ticket = ticket
        self.active[plate] = ticket
        return ticket

    def leave(self, plate, minute):
        if plate not in self.active:
            raise KeyError(f"{plate} is not in the lot")
        ticket = self.active[plate]
        minutes = minute - ticket.entry
        if minutes < 0:
            raise ValueError("Exit time is before entry time")
        del self.active[plate]
        self.by_id[ticket.spot_id].ticket = None
        amount = fee(ticket.vtype, minutes)
        self.revenue += amount
        self.completed.append((plate, ticket.vtype, minutes, amount))
        return minutes, amount

    def free_spots(self):
        return sum(1 for s in self.spots if s.ticket is None)

    def occupancy(self):
        used = len(self.spots) - self.free_spots()
        return round(used / len(self.spots) * 100, 1)

    def report(self):
        for s in self.spots:
            who = s.ticket.plate if s.ticket else "-"
            print(f"  {s.spot_id:<4}{s.size.name:<12}{who}")
        print(f"  free {self.free_spots()} of {len(self.spots)}, occupancy {self.occupancy()}%")


if __name__ == "__main__":
    lot = ParkingLot({VehicleType.MOTORCYCLE: 2, VehicleType.CAR: 3, VehicleType.TRUCK: 1})
    arrivals = [
        ("KA01AB1234", VehicleType.CAR, 0),
        ("KA02CD5678", VehicleType.MOTORCYCLE, 5),
        ("KA03EF9012", VehicleType.TRUCK, 10),
        ("KA04GH3456", VehicleType.CAR, 20),
        ("KA05IJ7890", VehicleType.MOTORCYCLE, 25),
        ("KA06KL1122", VehicleType.MOTORCYCLE, 30),
        ("KA07MN3344", VehicleType.CAR, 35),
        ("KA08OP5566", VehicleType.TRUCK, 40),
    ]
    for plate, vtype, minute in arrivals:
        try:
            ticket = lot.park(plate, vtype, minute)
            print(f"t={minute:>3}  {plate} {vtype.name:<11} -> spot {ticket.spot_id}, ticket {ticket.ticket_id}")
        except LotFullError as e:
            print(f"t={minute:>3}  {e}")

    print()
    lot.report()

    print()
    try:
        lot.park("KA01AB1234", VehicleType.CAR, 50)
    except ValueError as e:
        print("Error:", e)

    departures = [
        ("KA02CD5678", 12),
        ("KA01AB1234", 95),
        ("KA03EF9012", 400),
        ("KA04GH3456", 1700),
    ]
    print()
    for plate, minute in departures:
        minutes, amount = lot.leave(plate, minute)
        print(f"t={minute:>4}  {plate} stayed {minutes:>4} min, paid {amount}")

    try:
        lot.leave("KA99ZZ0000", 500)
    except KeyError as e:
        print("Error:", e.args[0])

    print()
    print("A truck can now park:", lot.park("KA08OP5566", VehicleType.TRUCK, 1800).spot_id)
    print("Revenue        :", lot.revenue)
    print("Turned away    :", lot.turned_away)
    print("Completed stays:", len(lot.completed))
    lot.report()

    print()
    print("Car fee table")
    for minutes in [10, 15, 16, 60, 61, 180, 500, 1440, 1500, 3000]:
        print(f"  {minutes:>5} minutes -> {fee(VehicleType.CAR, minutes)}")
