import copy
import random

ROOMS = {
    "cellar": {
        "desc": "A damp cellar with a stone stair leading up.",
        "exits": {"up": "hall"},
        "items": ["lamp"],
    },
    "hall": {
        "desc": "A grand hall with doors in every direction.",
        "exits": {"down": "cellar", "north": "library", "east": "kitchen", "west": "vault", "south": "garden"},
        "items": [],
    },
    "library": {
        "desc": "Dusty shelves reach the ceiling.",
        "exits": {"south": "hall"},
        "items": ["scroll"],
        "dark": True,
    },
    "kitchen": {
        "desc": "A cold kitchen that smells of old soup.",
        "exits": {"west": "hall"},
        "items": ["brass key", "bread"],
    },
    "vault": {
        "desc": "A small vault with a stone pedestal.",
        "exits": {"east": "hall"},
        "items": ["treasure"],
    },
    "garden": {
        "desc": "A quiet garden full of roses.",
        "exits": {"north": "hall"},
        "items": [],
    },
}

LOCKED = {"vault"}
POINTS = {"lamp": 5, "scroll": 5, "brass key": 10, "treasure": 50}
ALL_ITEMS = {"lamp", "scroll", "brass key", "bread", "treasure"}


class Game:
    def __init__(self):
        self.rooms = copy.deepcopy(ROOMS)
        self.room = "cellar"
        self.inventory = []
        self.score = 0
        self.moves = 0
        self.won = False
        self.unlocked = set()
        self.scored = set()

    def can_see(self):
        return not self.rooms[self.room].get("dark") or "lamp" in self.inventory

    def describe(self):
        if not self.can_see():
            return "It is pitch dark. You might need a lamp."
        room = self.rooms[self.room]
        text = room["desc"]
        if room["items"]:
            text += " You see: " + ", ".join(room["items"]) + "."
        text += " Exits: " + ", ".join(sorted(room["exits"])) + "."
        return text

    def execute(self, command):
        words = command.lower().split()
        if not words:
            return "Say something."
        if self.won:
            return "The game is already over."
        verb, rest = words[0], " ".join(words[1:])
        handlers = {
            "go": self.go,
            "take": self.take,
            "drop": self.drop,
            "look": lambda _: self.describe(),
            "inventory": lambda _: self.show_inventory(),
            "unlock": self.unlock,
            "eat": self.eat,
        }
        handler = handlers.get(verb)
        if handler is None:
            return f"I don't know how to {verb}."
        self.moves += 1
        return handler(rest)

    def go(self, direction):
        if not direction:
            return "Go where?"
        exits = self.rooms[self.room]["exits"]
        if direction not in exits:
            return "You can't go that way."
        target = exits[direction]
        if target in LOCKED and target not in self.unlocked:
            return f"The way to the {target} is locked."
        self.room = target
        if target == "garden" and "treasure" in self.inventory:
            self.score += 30
            self.won = True
            return "You step into the garden carrying the treasure. You win!"
        return self.describe()

    def take(self, item):
        if not self.can_see():
            return "It is too dark to find anything."
        if not item:
            return "Take what?"
        room = self.rooms[self.room]
        if item not in room["items"]:
            return f"There is no {item} here."
        room["items"].remove(item)
        self.inventory.append(item)
        if item in POINTS and item not in self.scored:
            self.scored.add(item)
            self.score += POINTS[item]
            return f"Taken: {item} (+{POINTS[item]} points)."
        return f"Taken: {item}."

    def drop(self, item):
        if item not in self.inventory:
            return f"You are not carrying {item}."
        self.inventory.remove(item)
        self.rooms[self.room]["items"].append(item)
        return f"Dropped: {item}."

    def show_inventory(self):
        if not self.inventory:
            return "You carry nothing."
        return "You carry: " + ", ".join(self.inventory) + "."

    def unlock(self, target):
        if target != "vault":
            return "Unlock what?"
        if self.room != "hall":
            return "The vault is not here."
        if "brass key" not in self.inventory:
            return "You don't have a key."
        if "vault" in self.unlocked:
            return "It is already unlocked."
        self.unlocked.add("vault")
        return "You unlock the vault with the brass key."

    def eat(self, item):
        if item != "bread" or "bread" not in self.inventory:
            return "You have nothing to eat."
        self.inventory.remove("bread")
        return "The bread tastes better than it smells."


WALKTHROUGH = [
    "look", "take lamp", "take sword", "go up", "go west", "go north", "take scroll",
    "go south", "go east", "take brass key", "take bread", "eat bread", "go west",
    "unlock vault", "go west", "take treasure", "go east", "go south",
]


if __name__ == "__main__":
    game = Game()
    for command in WALKTHROUGH:
        print(f"> {command}")
        print("  " + game.execute(command))

    print()
    print("After winning      :", game.execute("go north"))
    print("Unknown verb       :", Game().execute("dance"))
    print()
    print("Won                :", game.won)
    print("Score is 100       :", game.score == 100)
    print("Moves are 18       :", game.moves == 18)
    print("Inventory correct  :", game.inventory == ["lamp", "scroll", "brass key", "treasure"])
    print("Ended in the garden:", game.room == "garden")

    print()
    dark = Game()
    dark.execute("go up")
    print("Dark library       :", dark.execute("go north"))
    print("Take in the dark   :", dark.execute("take scroll"))
    print("Locked vault       :", dark.execute("go south") and dark.execute("go west"))

    rng = random.Random(77)
    verbs = ["go", "take", "drop", "look", "inventory", "unlock", "eat", "dance", ""]
    nouns = ["north", "south", "east", "west", "up", "down", "lamp", "scroll",
             "brass key", "bread", "treasure", "vault", "sword", ""]
    fuzz = Game()
    wins = 0
    safe = True
    for _ in range(5000):
        command = (rng.choice(verbs) + " " + rng.choice(nouns)).strip()
        fuzz.execute(command)
        items = fuzz.inventory + [i for r in fuzz.rooms.values() for i in r["items"]]
        if len(items) != len(set(items)) or not set(items) <= ALL_ITEMS or fuzz.room not in fuzz.rooms:
            safe = False
        if fuzz.won:
            wins += 1
            fuzz = Game()

    print()
    print("5000 random commands")
    print("  Items never duplicated or lost :", safe)
    print("  Games won by luck              :", wins)
