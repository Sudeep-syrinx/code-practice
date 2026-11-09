const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class ConvexHull {
  static cross(O, A, B) {
    return (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
  }

  static grahamScan(points) {
    if (points.length < 3) return [...points];
    const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const lower = [];
    for (const p of pts) {
      while (lower.length >= 2 && ConvexHull.cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
        lower.pop();
      lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && ConvexHull.cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
        upper.pop();
      upper.push(p);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  static area(hull) {
    if (hull.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < hull.length; i++) {
      const j = (i + 1) % hull.length;
      area += hull[i].x * hull[j].y;
      area -= hull[j].x * hull[i].y;
    }
    return Math.abs(area) / 2;
  }

  static perimeter(hull) {
    if (hull.length < 2) return 0;
    let perim = 0;
    for (let i = 0; i < hull.length; i++) {
      const j = (i + 1) % hull.length;
      const dx = hull[j].x - hull[i].x;
      const dy = hull[j].y - hull[i].y;
      perim += Math.sqrt(dx * dx + dy * dy);
    }
    return perim;
  }

  static pointInConvexPolygon(point, hull) {
    const n = hull.length;
    if (n < 3) return false;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (ConvexHull.cross(hull[i], hull[j], point) < 0) return false;
    }
    return true;
  }
}

class LineSegment {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2;
  }
  intersects(other) {
    const d1 = ConvexHull.cross({ x: other.x1, y: other.y1 }, { x: other.x2, y: other.y2 }, { x: this.x1, y: this.y1 });
    const d2 = ConvexHull.cross({ x: other.x1, y: other.y1 }, { x: other.x2, y: other.y2 }, { x: this.x2, y: this.y2 });
    const d3 = ConvexHull.cross({ x: this.x1, y: this.y1 }, { x: this.x2, y: this.y2 }, { x: other.x1, y: other.y1 });
    const d4 = ConvexHull.cross({ x: this.x1, y: this.y1 }, { x: this.x2, y: this.y2 }, { x: other.x2, y: other.y2 });
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    if (d1 === 0 && this._onSegment(other.x1, other.y1, other.x2, other.y2, this.x1, this.y1)) return true;
    if (d2 === 0 && this._onSegment(other.x1, other.y1, other.x2, other.y2, this.x2, this.y2)) return true;
    if (d3 === 0 && this._onSegment(this.x1, this.y1, this.x2, this.y2, other.x1, other.y1)) return true;
    if (d4 === 0 && this._onSegment(this.x1, this.y1, this.x2, this.y2, other.x2, other.y2)) return true;
    return false;
  }
  _onSegment(px, py, qx, qy, rx, ry) {
    return Math.min(px, qx) <= rx && rx <= Math.max(px, qx) && Math.min(py, qy) <= ry && ry <= Math.max(py, qy);
  }
  length() {
    const dx = this.x2 - this.x1, dy = this.y2 - this.y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

class Polygon {
  constructor(vertices) {
    this.vertices = vertices;
  }
  area() {
    let area = 0;
    const n = this.vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += this.vertices[i].x * this.vertices[j].y;
      area -= this.vertices[j].x * this.vertices[i].y;
    }
    return Math.abs(area) / 2;
  }
  isConvex() {
    const n = this.vertices.length;
    if (n < 3) return false;
    let sign = 0;
    for (let i = 0; i < n; i++) {
      const cross = ConvexHull.cross(
        this.vertices[i],
        this.vertices[(i + 1) % n],
        this.vertices[(i + 2) % n]
      );
      if (cross !== 0) {
        if (sign === 0) sign = cross > 0 ? 1 : -1;
        else if ((cross > 0 ? 1 : -1) !== sign) return false;
      }
    }
    return true;
  }
  containsPoint(point) {
    let inside = false;
    const n = this.vertices.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = this.vertices[i].x, yi = this.vertices[i].y;
      const xj = this.vertices[j].x, yj = this.vertices[j].y;
      if (((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }
  centroid() {
    let cx = 0, cy = 0, signedArea = 0;
    const n = this.vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const cross = this.vertices[i].x * this.vertices[j].y - this.vertices[j].x * this.vertices[i].y;
      signedArea += cross;
      cx += (this.vertices[i].x + this.vertices[j].x) * cross;
      cy += (this.vertices[i].y + this.vertices[j].y) * cross;
    }
    signedArea *= 0.5;
    if (Math.abs(signedArea) < 1e-12) return { x: 0, y: 0 };
    cx /= (6 * signedArea);
    cy /= (6 * signedArea);
    return { x: cx, y: cy };
  }
}

class VoronoiApproximation {
  static nearestSite(point, sites) {
    let minDist = Infinity, nearest = null;
    for (const site of sites) {
      const dx = point.x - site.x, dy = point.y - site.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) { minDist = dist; nearest = site; }
    }
    return nearest;
  }
  static classifyPoints(points, sites) {
    const regions = new Map();
    for (const site of sites) regions.set(site.id, []);
    for (const point of points) {
      const nearest = VoronoiApproximation.nearestSite(point, sites);
      if (nearest) regions.get(nearest.id).push(point);
    }
    return regions;
  }
}

console.log("=== CONVEX HULL ===");
check("hull triangle", (() => {
  const hull = ConvexHull.grahamScan([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 3 }]);
  return hull.length;
})(), 3);
check("hull square", (() => {
  const hull = ConvexHull.grahamScan([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]);
  return hull.length;
})(), 4);
check("hull with interior points", (() => {
  const hull = ConvexHull.grahamScan([
    { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 },
    { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 1 }
  ]);
  return hull.length;
})(), 4);
check("hull collinear returns endpoints", (() => {
  const hull = ConvexHull.grahamScan([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]);
  return hull.length <= 2;
})(), true);
check("hull area triangle", (() => {
  const hull = ConvexHull.grahamScan([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }]);
  return Math.abs(ConvexHull.area(hull) - 6) < 0.001;
})(), true);
check("hull perimeter square", (() => {
  const hull = ConvexHull.grahamScan([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]);
  return Math.abs(ConvexHull.perimeter(hull) - 4) < 0.001;
})(), true);
check("point inside convex hull", (() => {
  const hull = ConvexHull.grahamScan([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }]);
  return ConvexHull.pointInConvexPolygon({ x: 2, y: 2 }, hull);
})(), true);
check("point outside convex hull", (() => {
  const hull = ConvexHull.grahamScan([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }]);
  return ConvexHull.pointInConvexPolygon({ x: 5, y: 5 }, hull);
})(), false);

console.log("\n=== LINE SEGMENTS ===");
check("segments intersect", (() => {
  const a = new LineSegment(0, 0, 4, 4);
  const b = new LineSegment(0, 4, 4, 0);
  return a.intersects(b);
})(), true);
check("segments parallel no intersect", (() => {
  const a = new LineSegment(0, 0, 4, 0);
  const b = new LineSegment(0, 1, 4, 1);
  return a.intersects(b);
})(), false);
check("segments collinear overlap", (() => {
  const a = new LineSegment(0, 0, 4, 0);
  const b = new LineSegment(2, 0, 6, 0);
  return a.intersects(b);
})(), true);
check("segment length", (() => {
  const s = new LineSegment(0, 0, 3, 4);
  return Math.abs(s.length() - 5) < 0.001;
})(), true);
check("segments touching endpoint", (() => {
  const a = new LineSegment(0, 0, 2, 2);
  const b = new LineSegment(2, 2, 4, 0);
  return a.intersects(b);
})(), true);

console.log("\n=== POLYGON ===");
check("polygon area rectangle", (() => {
  const p = new Polygon([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }]);
  return Math.abs(p.area() - 12) < 0.001;
})(), true);
check("polygon isConvex true", (() => {
  const p = new Polygon([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }]);
  return p.isConvex();
})(), true);
check("polygon isConvex false", (() => {
  const p = new Polygon([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 0, y: 2 }]);
  return p.isConvex();
})(), false);
check("polygon contains point inside", (() => {
  const p = new Polygon([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }]);
  return p.containsPoint({ x: 2, y: 2 });
})(), true);
check("polygon contains point outside", (() => {
  const p = new Polygon([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }]);
  return p.containsPoint({ x: 5, y: 5 });
})(), false);
check("polygon centroid square", (() => {
  const p = new Polygon([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }]);
  const c = p.centroid();
  return Math.abs(c.x - 1) < 0.001 && Math.abs(c.y - 1) < 0.001;
})(), true);

console.log("\n=== VORONOI APPROXIMATION ===");
check("nearest site", (() => {
  const sites = [{ x: 0, y: 0, id: "A" }, { x: 10, y: 10, id: "B" }];
  return VoronoiApproximation.nearestSite({ x: 1, y: 1 }, sites).id;
})(), "A");
check("classify points", (() => {
  const sites = [{ x: 0, y: 0, id: "A" }, { x: 10, y: 0, id: "B" }];
  const points = [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 8, y: 0 }, { x: 9, y: 0 }];
  const regions = VoronoiApproximation.classifyPoints(points, sites);
  return regions.get("A").length === 2 && regions.get("B").length === 2;
})(), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
