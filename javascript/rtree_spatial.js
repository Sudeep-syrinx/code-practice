const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class BBox {
  constructor(minX, minY, maxX, maxY) {
    this.minX = minX; this.minY = minY; this.maxX = maxX; this.maxY = maxY;
  }
  area() { return Math.max(0, this.maxX - this.minX) * Math.max(0, this.maxY - this.minY); }
  overlap(other) {
    return this.minX <= other.maxX && this.maxX >= other.minX && this.minY <= other.maxY && this.maxY >= other.minY;
  }
  contains(x, y) { return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY; }
  expandedArea(other) {
    const minX = Math.min(this.minX, other.minX);
    const minY = Math.min(this.minY, other.minY);
    const maxX = Math.max(this.maxX, other.maxX);
    const maxY = Math.max(this.maxY, other.maxY);
    return (maxX - minX) * (maxY - minY);
  }
  static merge(a, b) {
    return new BBox(Math.min(a.minX, b.minX), Math.min(a.minY, b.minY), Math.max(a.maxX, b.maxX), Math.max(a.maxY, b.maxY));
  }
  equals(other) {
    return this.minX === other.minX && this.minY === other.minY && this.maxX === other.maxX && this.maxY === other.maxY;
  }
}

class RTreeNode {
  constructor(isLeaf) {
    this.isLeaf = isLeaf;
    this.entries = [];
    this.children = [];
  }
}

class RTree {
  constructor(maxEntries) {
    this.maxEntries = maxEntries || 8;
    this.minEntries = Math.ceil(this.maxEntries / 2);
    this.root = new RTreeNode(true);
    this.size = 0;
  }
  insert(bbox, data) {
    const leaf = this._chooseLeaf(this.root, bbox);
    leaf.entries.push({ bbox, data });
    this.size++;
    if (leaf.entries.length > this.maxEntries) {
      this._splitNode(leaf);
    }
    this._adjustTree(leaf);
  }
  _chooseLeaf(node, bbox) {
    if (node.isLeaf) return node;
    let bestChild = null, bestEnlargement = Infinity, bestArea = Infinity;
    for (const child of node.children) {
      const enlargement = child.bbox.expandedArea(bbox) - child.bbox.area();
      const area = child.bbox.area();
      if (enlargement < bestEnlargement || (enlargement === bestEnlargement && area < bestArea)) {
        bestEnlargement = enlargement;
        bestArea = area;
        bestChild = child;
      }
    }
    return this._chooseLeaf(bestChild.node, bbox);
  }
  _splitNode(node) {
    const items = node.isLeaf ? node.entries : node.children;
    const splitAxis = this._pickSplitAxis(items, node.isLeaf);
    items.sort((a, b) => {
      const ab = node.isLeaf ? a.bbox : a.bbox;
      const bb = node.isLeaf ? b.bbox : b.bbox;
      return splitAxis === "x" ? ab.minX - bb.minX : ab.minY - bb.minY;
    });
    const splitPoint = Math.floor(items.length / 2);
    const group1 = items.slice(0, splitPoint);
    const group2 = items.slice(splitPoint);
    if (node.isLeaf) {
      node.entries = group1;
      const newNode = new RTreeNode(true);
      newNode.entries = group2;
      this._insertIntoParent(node, newNode);
    } else {
      node.children = group1;
      const newNode = new RTreeNode(false);
      newNode.children = group2;
      this._insertIntoParent(node, newNode);
    }
  }
  _pickSplitAxis(items, isLeaf) {
    let xSpread = 0, ySpread = 0;
    for (const item of items) {
      const bb = isLeaf ? item.bbox : item.bbox;
      xSpread = Math.max(xSpread, bb.maxX - bb.minX);
      ySpread = Math.max(ySpread, bb.maxY - bb.minY);
    }
    return xSpread >= ySpread ? "x" : "y";
  }
  _insertIntoParent(oldNode, newNode) {
    const newBbox = this._computeBbox(newNode);
    if (oldNode === this.root) {
      const newRoot = new RTreeNode(false);
      const oldBbox = this._computeBbox(oldNode);
      newRoot.children = [{ bbox: oldBbox, node: oldNode }, { bbox: newBbox, node: newNode }];
      this.root = newRoot;
    }
  }
  _computeBbox(node) {
    if (node.isLeaf) {
      if (node.entries.length === 0) return new BBox(0, 0, 0, 0);
      let bb = node.entries[0].bbox;
      for (let i = 1; i < node.entries.length; i++) bb = BBox.merge(bb, node.entries[i].bbox);
      return bb;
    }
    if (node.children.length === 0) return new BBox(0, 0, 0, 0);
    let bb = node.children[0].bbox;
    for (let i = 1; i < node.children.length; i++) bb = BBox.merge(bb, node.children[i].bbox);
    return bb;
  }
  _adjustTree(node) {
    // Simplified: bbox recalculation would propagate up in full impl
  }
  search(queryBbox) {
    const results = [];
    this._searchNode(this.root, queryBbox, results);
    return results;
  }
  _searchNode(node, queryBbox, results) {
    if (node.isLeaf) {
      for (const entry of node.entries) {
        if (entry.bbox.overlap(queryBbox)) results.push(entry.data);
      }
    } else {
      for (const child of node.children) {
        if (child.bbox.overlap(queryBbox)) this._searchNode(child.node, queryBbox, results);
      }
    }
  }
  pointSearch(x, y) {
    const results = [];
    this._pointSearchNode(this.root, x, y, results);
    return results;
  }
  _pointSearchNode(node, x, y, results) {
    if (node.isLeaf) {
      for (const entry of node.entries) {
        if (entry.bbox.contains(x, y)) results.push(entry.data);
      }
    } else {
      for (const child of node.children) {
        if (child.bbox.contains(x, y)) this._pointSearchNode(child.node, x, y, results);
      }
    }
  }
  count() { return this.size; }
}

check("bbox area", new BBox(0, 0, 4, 5).area(), 20);
check("bbox overlap true", (() => {
  return new BBox(0, 0, 3, 3).overlap(new BBox(2, 2, 5, 5));
})(), true);
check("bbox overlap false", (() => {
  return new BBox(0, 0, 1, 1).overlap(new BBox(5, 5, 6, 6));
})(), false);
check("bbox contains", new BBox(0, 0, 10, 10).contains(5, 5), true);
check("bbox merge", (() => {
  const m = BBox.merge(new BBox(0, 0, 2, 2), new BBox(3, 3, 5, 5));
  return m.equals(new BBox(0, 0, 5, 5));
})(), true);
check("rtree insert and search", (() => {
  const tree = new RTree(4);
  tree.insert(new BBox(0, 0, 2, 2), "A");
  tree.insert(new BBox(3, 3, 5, 5), "B");
  return tree.search(new BBox(1, 1, 4, 4)).sort();
})(), ["A", "B"]);
check("rtree search miss", (() => {
  const tree = new RTree(4);
  tree.insert(new BBox(0, 0, 1, 1), "X");
  return tree.search(new BBox(10, 10, 11, 11));
})(), []);
check("rtree point search", (() => {
  const tree = new RTree(4);
  tree.insert(new BBox(0, 0, 5, 5), "P");
  return tree.pointSearch(3, 3);
})(), ["P"];
check("rtree point search miss", (() => {
  const tree = new RTree(4);
  tree.insert(new BBox(0, 0, 1, 1), "Q");
  return tree.pointSearch(5, 5);
})(), []);
check("rtree count", (() => {
  const tree = new RTree(4);
  tree.insert(new BBox(0, 0, 1, 1), "a");
  tree.insert(new BBox(2, 2, 3, 3), "b");
  return tree.count();
})(), 2);
check("rtree many inserts searchable", (() => {
  const tree = new RTree(4);
  for (let i = 0; i < 20; i++) tree.insert(new BBox(i, i, i + 1, i + 1), "item" + i);
  const found = tree.search(new BBox(5, 5, 15, 15));
  return found.length;
})(), 11);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
