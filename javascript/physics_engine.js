const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class Vec2 {
  constructor(x, y) { this.x = x; this.y = y; }
  add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
  scale(s) { return new Vec2(this.x * s, this.y * s); }
  dot(v) { return this.x * v.x + this.y * v.y; }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  normalize() {
    const len = this.length();
    if (len === 0) return new Vec2(0, 0);
    return new Vec2(this.x / len, this.y / len);
  }
  equals(v, eps) { return Math.abs(this.x - v.x) < (eps || 0.001) && Math.abs(this.y - v.y) < (eps || 0.001); }
}

class Body {
  constructor(mass, pos, vel) {
    this.mass = mass;
    this.invMass = mass > 0 ? 1 / mass : 0;
    this.pos = pos || new Vec2(0, 0);
    this.vel = vel || new Vec2(0, 0);
    this.force = new Vec2(0, 0);
    this.restitution = 0.8;
    this.isStatic = mass === 0;
  }
  applyForce(f) { this.force = this.force.add(f); }
  integrate(dt) {
    if (this.isStatic) return;
    const acc = this.force.scale(this.invMass);
    this.vel = this.vel.add(acc.scale(dt));
    this.pos = this.pos.add(this.vel.scale(dt));
    this.force = new Vec2(0, 0);
  }
}

class AABB {
  constructor(min, max) { this.min = min; this.max = max; }
  overlaps(other) {
    return this.min.x <= other.max.x && this.max.x >= other.min.x && this.min.y <= other.max.y && this.max.y >= other.min.y;
  }
  contains(point) {
    return point.x >= this.min.x && point.x <= this.max.x && point.y >= this.min.y && point.y <= this.max.y;
  }
  area() { return (this.max.x - this.min.x) * (this.max.y - this.min.y); }
  static fromCircle(center, radius) {
    return new AABB(new Vec2(center.x - radius, center.y - radius), new Vec2(center.x + radius, center.y + radius));
  }
}

class CollisionManifold {
  constructor(normal, depth, contactPoint) {
    this.normal = normal;
    this.depth = depth;
    this.contactPoint = contactPoint;
  }
}

function circleVsCircle(a, aPos, b, bPos) {
  const diff = bPos.sub(aPos);
  const dist = diff.length();
  const sumRadii = a.radius + b.radius;
  if (dist >= sumRadii) return null;
  const normal = dist > 0 ? diff.normalize() : new Vec2(1, 0);
  return new CollisionManifold(normal, sumRadii - dist, aPos.add(diff.scale(0.5)));
}

function resolveCollision(bodyA, bodyB, manifold) {
  const relVel = bodyB.vel.sub(bodyA.vel);
  const velAlongNormal = relVel.dot(manifold.normal);
  if (velAlongNormal > 0) return;
  const e = Math.min(bodyA.restitution, bodyB.restitution);
  const j = -(1 + e) * velAlongNormal / (bodyA.invMass + bodyB.invMass);
  const impulse = manifold.normal.scale(j);
  bodyA.vel = bodyA.vel.sub(impulse.scale(bodyA.invMass));
  bodyB.vel = bodyB.vel.add(impulse.scale(bodyB.invMass));
  const percent = 0.8;
  const slop = 0.01;
  const correction = manifold.normal.scale(Math.max(manifold.depth - slop, 0) / (bodyA.invMass + bodyB.invMass) * percent);
  bodyA.pos = bodyA.pos.sub(correction.scale(bodyA.invMass));
  bodyB.pos = bodyB.pos.add(correction.scale(bodyB.invMass));
}

class PhysicsWorld {
  constructor(gravity) {
    this.gravity = gravity || new Vec2(0, -9.81);
    this.bodies = [];
    this.colliders = [];
    this.steps = 0;
  }
  addBody(body, collider) {
    this.bodies.push(body);
    this.colliders.push(collider);
  }
  step(dt) {
    for (const body of this.bodies) {
      if (!body.isStatic) body.applyForce(this.gravity.scale(body.mass));
    }
    for (const body of this.bodies) body.integrate(dt);
    for (let i = 0; i < this.colliders.length; i++) {
      for (let j = i + 1; j < this.colliders.length; j++) {
        const ci = this.colliders[i], cj = this.colliders[j];
        const aabbI = AABB.fromCircle(this.bodies[i].pos, ci.radius);
        const aabbJ = AABB.fromCircle(this.bodies[j].pos, cj.radius);
        if (!aabbI.overlaps(aabbJ)) continue;
        const manifold = circleVsCircle(ci, this.bodies[i].pos, cj, this.bodies[j].pos);
        if (manifold) resolveCollision(this.bodies[i], this.bodies[j], manifold);
      }
    }
    this.steps++;
  }
  getBody(index) { return this.bodies[index]; }
  bodyCount() { return this.bodies.length; }
}

check("vec2 add", (() => {
  const a = new Vec2(1, 2), b = new Vec2(3, 4);
  return a.add(b).equals(new Vec2(4, 6));
})(), true);
check("vec2 sub", (() => {
  return new Vec2(5, 7).sub(new Vec2(2, 3)).equals(new Vec2(3, 4));
})(), true);
check("vec2 scale", (() => {
  return new Vec2(2, 3).scale(2).equals(new Vec2(4, 6));
})(), true);
check("vec2 dot", new Vec2(1, 0).dot(new Vec2(0, 1)), 0);
check("vec2 normalize", (() => {
  return new Vec2(3, 4).normalize().equals(new Vec2(0.6, 0.8));
})(), true);
check("vec2 zero normalize", (() => {
  return new Vec2(0, 0).normalize().equals(new Vec2(0, 0));
})(), true);
check("aabb overlaps", (() => {
  const a = new AABB(new Vec2(0, 0), new Vec2(2, 2));
  const b = new AABB(new Vec2(1, 1), new Vec2(3, 3));
  return a.overlaps(b);
})(), true);
check("aabb no overlap", (() => {
  const a = new AABB(new Vec2(0, 0), new Vec2(1, 1));
  const b = new AABB(new Vec2(5, 5), new Vec2(6, 6));
  return a.overlaps(b);
})(), false);
check("aabb contains", (() => {
  const a = new AABB(new Vec2(0, 0), new Vec2(10, 10));
  return a.contains(new Vec2(5, 5));
})(), true);
check("circle collision detected", (() => {
  const m = circleVsCircle({ radius: 1 }, new Vec2(0, 0), { radius: 1 }, new Vec2(1.5, 0));
  return m !== null && Math.abs(m.depth - 0.5) < 0.001;
})(), true);
check("circle no collision", (() => {
  return circleVsCircle({ radius: 1 }, new Vec2(0, 0), { radius: 1 }, new Vec2(5, 0));
})(), null);
check("physics free fall", (() => {
  const w = new PhysicsWorld(new Vec2(0, -10));
  const b = new Body(1, new Vec2(0, 100), new Vec2(0, 0));
  w.addBody(b, { radius: 1 });
  for (let i = 0; i < 10; i++) w.step(0.1);
  return b.pos.y < 100;
})(), true);
check("physics static body不动", (() => {
  const w = new PhysicsWorld(new Vec2(0, -10));
  const b = new Body(0, new Vec2(0, 0), new Vec2(0, 0));
  w.addBody(b, { radius: 1 });
  w.step(0.1);
  return b.pos.equals(new Vec2(0, 0));
})(), true);
check("physics collision bounce", (() => {
  const w = new PhysicsWorld(new Vec2(0, 0));
  const a = new Body(1, new Vec2(-2, 0), new Vec2(5, 0));
  const b = new Body(1, new Vec2(2, 0), new Vec2(-5, 0));
  w.addBody(a, { radius: 1 });
  w.addBody(b, { radius: 1 });
  for (let i = 0; i < 20; i++) w.step(0.05);
  return a.vel.x < 0 && b.vel.x > 0;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
