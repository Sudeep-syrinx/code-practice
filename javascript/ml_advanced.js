const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(30) + shown.padEnd(44) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class Perceptron {
  constructor(inputSize, learningRate) {
    this.weights = new Float64Array(inputSize).map(() => Math.random() - 0.5);
    this.bias = 0;
    this.lr = learningRate || 0.1;
  }
  predict(inputs) {
    let sum = this.bias;
    for (let i = 0; i < inputs.length; i++) sum += inputs[i] * this.weights[i];
    return sum >= 0 ? 1 : 0;
  }
  train(inputs, target) {
    const output = this.predict(inputs);
    const error = target - output;
    for (let i = 0; i < inputs.length; i++) this.weights[i] += this.lr * error * inputs[i];
    this.bias += this.lr * error;
    return error;
  }
  trainBatch(dataset, epochs) {
    let totalErrors = 0;
    for (let e = 0; e < epochs; e++) {
      let epochErrors = 0;
      for (const [inputs, target] of dataset) epochErrors += Math.abs(this.train(inputs, target));
      totalErrors += epochErrors;
    }
    return totalErrors;
  }
  getWeights() { return [...this.weights]; }
}

class MultiLayerPerceptron {
  constructor(layerSizes) {
    this.layers = [];
    for (let i = 0; i < layerSizes.length - 1; i++) {
      const w = Array.from({ length: layerSizes[i + 1] }, () =>
        new Float64Array(layerSizes[i]).map(() => (Math.random() - 0.5) * Math.sqrt(2 / layerSizes[i]))
      );
      const b = new Float64Array(layerSizes[i + 1]);
      this.layers.push({ weights: w, biases: b });
    }
    this.lr = 0.1;
  }
  forward(input) {
    const activations = [new Float64Array(input)];
    const zs = [];
    let current = input;
    for (const layer of this.layers) {
      const z = new Float64Array(layer.biases.length);
      for (let j = 0; j < layer.biases.length; j++) {
        let sum = layer.biases[j];
        for (let i = 0; i < current.length; i++) sum += layer.weights[j][i] * current[i];
        z[j] = sum;
      }
      zs.push(z);
      current = z.map(v => 1 / (1 + Math.exp(-v)));
      activations.push(new Float64Array(current));
    }
    return { activations, zs };
  }
  predict(input) {
    const { activations } = this.forward(input);
    return [...activations[activations.length - 1]];
  }
  train(input, target) {
    const { activations, zs } = this.forward(input);
    const deltas = new Array(this.layers.length);
    const output = activations[activations.length - 1];
    const outputDelta = new Float64Array(output.length);
    for (let j = 0; j < output.length; j++) {
      const sigDeriv = output[j] * (1 - output[j]);
      outputDelta[j] = (output[j] - target[j]) * sigDeriv;
    }
    deltas[deltas.length - 1] = outputDelta;
    for (let l = deltas.length - 2; l >= 0; l--) {
      const delta = new Float64Array(this.layers[l].biases.length);
      for (let j = 0; j < delta.length; j++) {
        let sum = 0;
        for (let k = 0; k < deltas[l + 1].length; k++) sum += this.layers[l + 1].weights[k][j] * deltas[l + 1][k];
        const sigDeriv = activations[l + 1][j] * (1 - activations[l + 1][j]);
        delta[j] = sum * sigDeriv;
      }
      deltas[l] = delta;
    }
    for (let l = 0; l < this.layers.length; l++) {
      for (let j = 0; j < this.layers[l].biases.length; j++) {
        this.layers[l].biases[j] -= this.lr * deltas[l][j];
        for (let i = 0; i < this.layers[l].weights[j].length; i++) {
          this.layers[l].weights[j][i] -= this.lr * deltas[l][j] * activations[l][i];
        }
      }
    }
    let error = 0;
    for (let j = 0; j < output.length; j++) error += (output[j] - target[j]) ** 2;
    return error / 2;
  }
  trainBatch(dataset, epochs) {
    const losses = [];
    for (let e = 0; e < epochs; e++) {
      let totalLoss = 0;
      for (const [input, target] of dataset) totalLoss += this.train(input, target);
      losses.push(totalLoss / dataset.length);
    }
    return losses;
  }
}

class KMeans {
  constructor(k, maxIterations) {
    this.k = k;
    this.maxIterations = maxIterations || 100;
    this.centroids = [];
    this.assignments = [];
  }
  fit(data) {
    const n = data.length;
    const dim = data[0].length;
    this.centroids = [];
    const usedIndices = new Set();
    while (this.centroids.length < this.k) {
      const idx = Math.floor(Math.random() * n);
      if (!usedIndices.has(idx)) { usedIndices.add(idx); this.centroids.push([...data[idx]]); }
    }
    this.assignments = new Int32Array(n);
    for (let iter = 0; iter < this.maxIterations; iter++) {
      let changed = false;
      for (let i = 0; i < n; i++) {
        let bestCluster = 0, bestDist = Infinity;
        for (let c = 0; c < this.k; c++) {
          let dist = 0;
          for (let d = 0; d < dim; d++) dist += (data[i][d] - this.centroids[c][d]) ** 2;
          if (dist < bestDist) { bestDist = dist; bestCluster = c; }
        }
        if (this.assignments[i] !== bestCluster) { this.assignments[i] = bestCluster; changed = true; }
      }
      if (!changed) break;
      const sums = Array.from({ length: this.k }, () => new Float64Array(dim));
      const counts = new Int32Array(this.k);
      for (let i = 0; i < n; i++) {
        const c = this.assignments[i];
        counts[c]++;
        for (let d = 0; d < dim; d++) sums[c][d] += data[i][d];
      }
      for (let c = 0; c < this.k; c++) {
        if (counts[c] > 0) for (let d = 0; d < dim; d++) this.centroids[c][d] = sums[c][d] / counts[c];
      }
    }
    return this.assignments;
  }
  predict(point) {
    let bestCluster = 0, bestDist = Infinity;
    for (let c = 0; c < this.k; c++) {
      let dist = 0;
      for (let d = 0; d < point.length; d++) dist += (point[d] - this.centroids[c][d]) ** 2;
      if (dist < bestDist) { bestDist = dist; bestCluster = c; }
    }
    return bestCluster;
  }
  inertia(data) {
    let total = 0;
    for (let i = 0; i < data.length; i++) {
      const c = this.assignments[i];
      for (let d = 0; d < data[i].length; d++) total += (data[i][d] - this.centroids[c][d]) ** 2;
    }
    return total;
  }
}

class DecisionTree {
  constructor(maxDepth) {
    this.maxDepth = maxDepth || 10;
    this.tree = null;
  }
  fit(X, y) {
    this.tree = this._buildTree(X, y, 0);
  }
  _gini(y) {
    const counts = new Map();
    for (const label of y) counts.set(label, (counts.get(label) || 0) + 1);
    let impurity = 1;
    for (const count of counts.values()) impurity -= (count / y.length) ** 2;
    return impurity;
  }
  _buildTree(X, y, depth) {
    if (depth >= this.maxDepth || y.length <= 1 || new Set(y).size === 1) {
      const counts = new Map();
      for (const label of y) counts.set(label, (counts.get(label) || 0) + 1);
      let bestLabel = null, bestCount = 0;
      for (const [label, count] of counts) { if (count > bestCount) { bestCount = count; bestLabel = label; } }
      return { type: "leaf", label: bestLabel, count: bestCount };
    }
    let bestFeature = -1, bestThreshold = 0, bestGini = Infinity;
    const nFeatures = X[0].length;
    for (let f = 0; f < nFeatures; f++) {
      const values = [...new Set(X.map(row => row[f]))].sort((a, b) => a - b);
      for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i + 1]) / 2;
        const leftY = [], rightY = [];
        for (let j = 0; j < X.length; j++) {
          if (X[j][f] <= threshold) leftY.push(y[j]); else rightY.push(y[j]);
        }
        if (leftY.length === 0 || rightY.length === 0) continue;
        const gini = (leftY.length * this._gini(leftY) + rightY.length * this._gini(rightY)) / y.length;
        if (gini < bestGini) { bestGini = gini; bestFeature = f; bestThreshold = threshold; }
      }
    }
    if (bestFeature === -1) {
      const counts = new Map();
      for (const label of y) counts.set(label, (counts.get(label) || 0) + 1);
      let bestLabel = null, bestCount = 0;
      for (const [label, count] of counts) { if (count > bestCount) { bestCount = count; bestLabel = label; } }
      return { type: "leaf", label: bestLabel, count: bestCount };
    }
    const leftX = [], leftY = [], rightX = [], rightY = [];
    for (let j = 0; j < X.length; j++) {
      if (X[j][bestFeature] <= bestThreshold) { leftX.push(X[j]); leftY.push(y[j]); }
      else { rightX.push(X[j]); rightY.push(y[j]); }
    }
    return {
      type: "split", feature: bestFeature, threshold: bestThreshold,
      left: this._buildTree(leftX, leftY, depth + 1),
      right: this._buildTree(rightX, rightY, depth + 1)
    };
  }
  predict(sample) {
    let node = this.tree;
    while (node.type === "split") {
      node = sample[node.feature] <= node.threshold ? node.left : node.right;
    }
    return node.label;
  }
  accuracy(X, y) {
    let correct = 0;
    for (let i = 0; i < X.length; i++) if (this.predict(X[i]) === y[i]) correct++;
    return correct / y.length;
  }
}

console.log("=== PERCEPTRON ===");
check("perceptron learns AND", (() => {
  const p = new Perceptron(2, 0.1);
  const data = [[[0,0],0],[[0,1],0],[[1,0],0],[[1,1],1]];
  p.trainBatch(data, 100);
  return data.every(([inp, tgt]) => p.predict(inp) === tgt);
})(), true);
check("perceptron learns OR", (() => {
  const p = new Perceptron(2, 0.1);
  const data = [[[0,0],0],[[0,1],1],[[1,0],1],[[1,1],1]];
  p.trainBatch(data, 100);
  return data.every(([inp, tgt]) => p.predict(inp) === tgt);
})(), true);
check("perceptron initial weights exist", (() => new Perceptron(3).getWeights().length)(), 3);

console.log("\n=== MLP ===");
check("mlp xor learns", (() => {
  const mlp = new MultiLayerPerceptron([2, 4, 1]);
  const data = [[[0,0],[0]],[[0,1],[1]],[[1,0],[1]],[[1,1],[0]]];
  const losses = mlp.trainBatch(data, 500);
  return losses[losses.length - 1] < 0.1;
})(), true);
check("mlp output shape", (() => {
  const mlp = new MultiLayerPerceptron([3, 4, 2]);
  return mlp.predict([1, 0, 1]).length;
})(), 2);
check("mlp loss decreases", (() => {
  const mlp = new MultiLayerPerceptron([2, 4, 1]);
  const data = [[[0,0],[0]],[[0,1],[1]],[[1,0],[1]],[[1,1],[0]]];
  const losses = mlp.trainBatch(data, 100);
  return losses[losses.length - 1] < losses[0];
})(), true);

console.log("\n=== K-MEANS ===");
check("kmeans assigns all points", (() => {
  const km = new KMeans(2);
  const data = [[0,0],[1,0],[0,1],[10,10],[11,10],[10,11]];
  km.fit(data);
  return km.assignments.length === 6;
})(), true);
check("kmeans separates clusters", (() => {
  const km = new KMeans(2);
  const data = [[0,0],[1,0],[0,1],[10,10],[11,10],[10,11]];
  km.fit(data);
  return km.assignments[0] === km.assignments[1] && km.assignments[3] === km.assignments[4] && km.assignments[0] !== km.assignments[3];
})(), true);
check("kmeans predict consistent", (() => {
  const km = new KMeans(2);
  km.fit([[0,0],[1,0],[10,10],[11,10]]);
  return km.predict([0.5, 0]) === km.predict([0, 0.5]);
})(), true);
check("kmeans inertia non-negative", (() => {
  const km = new KMeans(2);
  const data = [[0,0],[1,0],[10,10],[11,10]];
  km.fit(data);
  return km.inertia(data) >= 0;
})(), true);

console.log("\n=== DECISION TREE ===");
check("dt perfect classification", (() => {
  const dt = new DecisionTree(5);
  const X = [[0],[1],[2],[3]];
  const y = ["a","a","b","b"];
  dt.fit(X, y);
  return dt.accuracy(X, y);
})(), 1);
check("dt predicts unseen", (() => {
  const dt = new DecisionTree(5);
  dt.fit([[0],[1],[2],[3]], ["a","a","b","b"]);
  return dt.predict([0.5]) === "a" && dt.predict([2.5]) === "b";
})(), true);
check("dt single class", (() => {
  const dt = new DecisionTree(5);
  dt.fit([[0],[1],[2]], ["x","x","x"]);
  return dt.predict([99]);
})(), "x");
check("dt multi-feature", (() => {
  const dt = new DecisionTree(5);
  const X = [[0,0],[0,1],[1,0],[1,1]];
  const y = [0,1,1,0];
  dt.fit(X, y);
  return dt.accuracy(X, y);
})(), 1);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
