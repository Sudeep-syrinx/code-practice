const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
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

class KNNClassifier {
  constructor(k) {
    this.k = k || 3;
    this.data = [];
  }
  addSample(features, label) {
    this.data.push({ features, label });
  }
  distance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
  }
  classify(query) {
    const distances = this.data.map(d => ({ dist: this.distance(d.features, query), label: d.label }));
    distances.sort((a, b) => a.dist - b.dist);
    const votes = new Map();
    for (let i = 0; i < Math.min(this.k, distances.length); i++) {
      const lbl = distances[i].label;
      votes.set(lbl, (votes.get(lbl) || 0) + 1);
    }
    let bestLabel = null, bestCount = 0;
    for (const [lbl, cnt] of votes) { if (cnt > bestCount) { bestCount = cnt; bestLabel = lbl; } }
    return bestLabel;
  }
  size() { return this.data.length; }
}

class NaiveBayes {
  constructor(smoothing) {
    this.smoothing = smoothing || 1;
    this.classCounts = new Map();
    this.featureCounts = new Map();
    this.totalSamples = 0;
  }
  train(features, label) {
    this.classCounts.set(label, (this.classCounts.get(label) || 0) + 1);
    this.totalSamples++;
    for (let i = 0; i < features.length; i++) {
      const key = label + ":" + i + ":" + features[i];
      this.featureCounts.set(key, (this.featureCounts.get(key) || 0) + 1);
    }
  }
  classify(features) {
    let bestLabel = null, bestScore = -Infinity;
    for (const [label, count] of this.classCounts) {
      let score = Math.log(count / this.totalSamples);
      for (let i = 0; i < features.length; i++) {
        const key = label + ":" + i + ":" + features[i];
        const featCount = (this.featureCounts.get(key) || 0) + this.smoothing;
        const totalForClass = count + this.smoothing * 2;
        score += Math.log(featCount / totalForClass);
      }
      if (score > bestScore) { bestScore = score; bestLabel = label; }
    }
    return bestLabel;
  }
  getClassCount(label) { return this.classCounts.get(label) || 0; }
}

class LinearRegression {
  constructor() {
    this.slope = 0;
    this.intercept = 0;
    this.trained = false;
  }
  fit(xs, ys) {
    const n = xs.length;
    if (n !== ys.length || n === 0) throw new Error("invalid data");
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += xs[i]; sumY += ys[i];
      sumXY += xs[i] * ys[i]; sumXX += xs[i] * xs[i];
    }
    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) throw new Error("singular matrix");
    this.slope = (n * sumXY - sumX * sumY) / denom;
    this.intercept = (sumY - this.slope * sumX) / n;
    this.trained = true;
  }
  predict(x) {
    if (!this.trained) throw new Error("not trained");
    return this.slope * x + this.intercept;
  }
  rSquared(xs, ys) {
    const meanY = ys.reduce((s, y) => s + y, 0) / ys.length;
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < xs.length; i++) {
      ssTot += (ys[i] - meanY) ** 2;
      ssRes += (ys[i] - this.predict(xs[i])) ** 2;
    }
    return 1 - ssRes / ssTot;
  }
}

check("perceptron learns AND", (() => {
  const p = new Perceptron(2, 0.1);
  const data = [[[0,0],0],[[0,1],0],[[1,0],0],[[1,1],1]];
  p.trainBatch(data, 100);
  return data.every(([inp, tgt]) => p.predict(inp) === tgt);
})(), true);
check("perceptron initial weights exist", (() => {
  const p = new Perceptron(3);
  return p.getWeights().length === 3;
})(), true);
check("knn classify basic", (() => {
  const knn = new KNNClassifier(3);
  knn.addSample([0, 0], "A"); knn.addSample([0, 1], "A");
  knn.addSample([10, 10], "B"); knn.addSample([10, 11], "B");
  return knn.classify([1, 0]);
})(), "A");
check("knn classify far point", (() => {
  const knn = new KNNClassifier(1);
  knn.addSample([0], "X"); knn.addSample([100], "Y");
  return knn.classify([99]);
})(), "Y");
check("naive bayes train and classify", (() => {
  const nb = new NaiveBayes();
  nb.train([1, 0], "spam"); nb.train([1, 1], "spam");
  nb.train([0, 0], "ham"); nb.train([0, 1], "ham");
  return nb.classify([1, 0]);
})(), "spam");
check("naive bayes class count", (() => {
  const nb = new NaiveBayes();
  nb.train([0], "A"); nb.train([1], "A"); nb.train([0], "B");
  return nb.getClassCount("A");
})(), 2);
check("linear regression perfect fit", (() => {
  const lr = new LinearRegression();
  lr.fit([1, 2, 3, 4], [2, 4, 6, 8]);
  return Math.abs(lr.predict(5) - 10) < 0.001;
})(), true);
check("linear regression r squared", (() => {
  const lr = new LinearRegression();
  lr.fit([1, 2, 3], [2, 4, 6]);
  return Math.abs(lr.rSquared([1, 2, 3], [2, 4, 6]) - 1) < 0.001;
})(), true);
check("linear regression untrained throws", raises(() => new LinearRegression().predict(1)), true);
check("linear regression bad data throws", raises(() => new LinearRegression().fit([1, 2], [1])), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
