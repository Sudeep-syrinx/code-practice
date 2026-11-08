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

function round2(value) {
  return Math.round(value * 100) / 100;
}

class Rectangle {
  constructor(width, height) {
    if (!(width > 0) || !(height > 0)) {
      throw new Error("sides must be positive");
    }
    this.width = width;
    this.height = height;
  }

  name() {
    return "rectangle";
  }

  area() {
    return round2(this.width * this.height);
  }

  perimeter() {
    return round2(2 * (this.width + this.height));
  }

  scale(k) {
    return new Rectangle(this.width * k, this.height * k);
  }

  describe() {
    return this.name() + " area=" + this.area() + " perimeter=" + this.perimeter();
  }
}

class Square extends Rectangle {
  constructor(side) {
    super(side, side);
  }

  name() {
    return "square";
  }

  scale(k) {
    return new Square(this.width * k);
  }
}

class Circle {
  constructor(radius) {
    if (!(radius > 0)) {
      throw new Error("radius must be positive");
    }
    this.radius = radius;
  }

  name() {
    return "circle";
  }

  area() {
    return round2(Math.PI * this.radius * this.radius);
  }

  perimeter() {
    return round2(2 * Math.PI * this.radius);
  }

  scale(k) {
    return new Circle(this.radius * k);
  }

  describe() {
    return this.name() + " area=" + this.area() + " perimeter=" + this.perimeter();
  }
}

class Triangle {
  constructor(a, b, c) {
    if (!(a > 0) || !(b > 0) || !(c > 0)) {
      throw new Error("sides must be positive");
    }
    if (a + b <= c || a + c <= b || b + c <= a) {
      throw new Error("these sides cannot make a triangle");
    }
    this.a = a;
    this.b = b;
    this.c = c;
  }

  name() {
    return "triangle";
  }

  perimeter() {
    return round2(this.a + this.b + this.c);
  }

  area() {
    const s = (this.a + this.b + this.c) / 2;
    return round2(Math.sqrt(s * (s - this.a) * (s - this.b) * (s - this.c)));
  }

  kind() {
    if (this.a === this.b && this.b === this.c) {
      return "equilateral";
    }
    if (this.a === this.b || this.b === this.c || this.a === this.c) {
      return "isosceles";
    }
    return "scalene";
  }

  isRight() {
    const sides = [this.a, this.b, this.c].sort((x, y) => x - y);
    return sides[0] * sides[0] + sides[1] * sides[1] === sides[2] * sides[2];
  }

  scale(k) {
    return new Triangle(this.a * k, this.b * k, this.c * k);
  }

  describe() {
    return this.name() + " area=" + this.area() + " perimeter=" + this.perimeter();
  }
}

function totalArea(shapes) {
  let total = 0;
  for (const shape of shapes) {
    total += shape.area();
  }
  return round2(total);
}

function largest(shapes) {
  if (shapes.length === 0) {
    throw new Error("no shapes");
  }
  let best = shapes[0];
  for (const shape of shapes) {
    if (shape.area() > best.area()) {
      best = shape;
    }
  }
  return best;
}

function smallest(shapes) {
  if (shapes.length === 0) {
    throw new Error("no shapes");
  }
  let best = shapes[0];
  for (const shape of shapes) {
    if (shape.area() < best.area()) {
      best = shape;
    }
  }
  return best;
}

function sortByArea(shapes) {
  return shapes.slice().sort((x, y) => x.area() - y.area());
}

function names(shapes) {
  return shapes.map((s) => s.name());
}

function countByName(shapes) {
  const counts = {};
  for (const shape of shapes) {
    counts[shape.name()] = (counts[shape.name()] || 0) + 1;
  }
  return counts;
}

const rect = new Rectangle(3, 4);
check("rect area", rect.area(), 12);
check("rect perimeter", rect.perimeter(), 14);
check("rect name", rect.name(), "rectangle");
check("rect describe", rect.describe(), "rectangle area=12 perimeter=14");
check("rect scaled", rect.scale(2).area(), 48);
check("rect scale sides", [rect.scale(2).width, rect.scale(2).height], [6, 8]);
check("rect decimals", new Rectangle(1.5, 2).area(), 3);

console.log();
const sq = new Square(5);
check("square area", sq.area(), 25);
check("square perimeter", sq.perimeter(), 20);
check("square name", sq.name(), "square");
check("square scaled", sq.scale(2).area(), 100);
check("square scale name", sq.scale(2).name(), "square");
check("square is rectangle", sq instanceof Rectangle, true);
check("rect is not square", rect instanceof Square, false);

console.log();
const c1 = new Circle(1);
const c5 = new Circle(5);
check("circle 1 area", c1.area(), 3.14);
check("circle 1 perimeter", c1.perimeter(), 6.28);
check("circle 5 area", c5.area(), 78.54);
check("circle 5 perimeter", c5.perimeter(), 31.42);
check("circle 2 area", new Circle(2).area(), 12.57);
check("circle scaled", c1.scale(3).area(), 28.27);
check("circle describe", c1.describe(), "circle area=3.14 perimeter=6.28");

console.log();
const t345 = new Triangle(3, 4, 5);
check("triangle area", t345.area(), 6);
check("triangle perimeter", t345.perimeter(), 12);
check("triangle kind", t345.kind(), "scalene");
check("triangle right", t345.isRight(), true);
check("equilateral kind", new Triangle(5, 5, 5).kind(), "equilateral");
check("equilateral area", new Triangle(5, 5, 5).area(), 10.83);
check("equilateral not right", new Triangle(5, 5, 5).isRight(), false);
check("isosceles kind", new Triangle(5, 5, 8).kind(), "isosceles");
check("isosceles area", new Triangle(5, 5, 8).area(), 12);
check("triangle scaled", t345.scale(2).area(), 24);
check("scaled still right", t345.scale(3).isRight(), true);

console.log();
check("zero width", raises(() => new Rectangle(0, 5)), true);
check("negative height", raises(() => new Rectangle(5, -1)), true);
check("zero radius", raises(() => new Circle(0)), true);
check("negative radius", raises(() => new Circle(-2)), true);
check("bad square", raises(() => new Square(0)), true);
check("impossible triangle", raises(() => new Triangle(1, 2, 10)), true);
check("flat triangle", raises(() => new Triangle(1, 2, 3)), true);
check("negative triangle", raises(() => new Triangle(-3, 4, 5)), true);
check("text side", raises(() => new Rectangle("a", 5)), true);

console.log();
const shapes = [new Rectangle(3, 4), new Square(5), new Circle(1), new Triangle(3, 4, 5)];
check("total area", totalArea(shapes), 46.14);
check("largest", largest(shapes).name(), "square");
check("smallest", smallest(shapes).name(), "circle");
check("sorted by area", names(sortByArea(shapes)), ["circle", "triangle", "rectangle", "square"]);
check("original order kept", names(shapes), ["rectangle", "square", "circle", "triangle"]);
check("count by name", countByName(shapes), { rectangle: 1, square: 1, circle: 1, triangle: 1 });
check("empty total", totalArea([]), 0);
check("empty largest", raises(() => largest([])), true);
check("empty smallest", raises(() => smallest([])), true);

console.log();
const many = [];
for (let i = 1; i <= 1000; i++) {
  many.push(new Rectangle(i, 2));
}
check("1000 rectangles", many.length, 1000);
check("big total area", totalArea(many), 1001000);
check("big largest", largest(many).width, 1000);
check("big smallest", smallest(many).width, 1);
check("big sorted first", sortByArea(many)[0].width, 1);
check("big count", countByName(many), { rectangle: 1000 });

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
