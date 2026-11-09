const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}
function raises(fn) { try { fn(); } catch (e) { return true; } return false; }
function messageOf(fn) { try { fn(); } catch (e) { return e.message; } return ""; }

class FFT {
  static transform(real, imag) {
    const n = real.length;
    if (n !== imag.length) throw new Error("length mismatch");
    if ((n & (n - 1)) !== 0) throw new Error("length must be power of 2");
    const outR = [...real];
    const outI = [...imag];
    FFT._fft(outR, outI, 0, n, 1);
    return { real: outR, imag: outI };
  }
  static inverse(real, imag) {
    const n = real.length;
    const conjI = imag.map(v => -v);
    const result = FFT.transform(real, conjI);
    return {
      real: result.real.map(v => v / n),
      imag: result.imag.map(v => -v / n)
    };
  }
  static _fft(re, im, offset, n, stride) {
    if (n === 1) return;
    const half = n >> 1;
    FFT._fft(re, im, offset, half, stride * 2);
    FFT._fft(re, im, offset + stride, half, stride * 2);
    for (let k = 0; k < half; k++) {
      const angle = -2 * Math.PI * k / n;
      const twR = Math.cos(angle);
      const twI = Math.sin(angle);
      const evenIdx = offset + k * stride;
      const oddIdx = offset + (k + half) * stride;
      const tR = twR * re[oddIdx] - twI * im[oddIdx];
      const tI = twR * im[oddIdx] + twI * re[oddIdx];
      re[oddIdx] = re[evenIdx] - tR;
      im[oddIdx] = im[evenIdx] - tI;
      re[evenIdx] += tR;
      im[evenIdx] += tI;
    }
  }
  static magnitude(real, imag) {
    return real.map((r, i) => Math.sqrt(r * r + imag[i] * imag[i]));
  }
  static phase(real, imag) {
    return real.map((r, i) => Math.atan2(imag[i], r));
  }
}

class FIRFilter {
  constructor(coefficients) {
    this.coeffs = coefficients;
    this.buffer = new Float64Array(coefficients.length);
    this.pos = 0;
  }
  process(sample) {
    this.buffer[this.pos] = sample;
    let sum = 0;
    for (let i = 0; i < this.coeffs.length; i++) {
      const idx = (this.pos - i + this.coeffs.length) % this.coeffs.length;
      sum += this.coeffs[i] * this.buffer[idx];
    }
    this.pos = (this.pos + 1) % this.coeffs.length;
    return sum;
  }
  processBlock(samples) {
    return samples.map(s => this.process(s));
  }
  reset() {
    this.buffer.fill(0);
    this.pos = 0;
  }
}

class WindowFunction {
  static hann(n) {
    const w = new Float64Array(n);
    for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1)));
    return w;
  }
  static hamming(n) {
    const w = new Float64Array(n);
    for (let i = 0; i < n; i++) w[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1));
    return w;
  }
  static apply(signal, window) {
    if (signal.length !== window.length) throw new Error("length mismatch");
    return signal.map((s, i) => s * window[i]);
  }
}

check("fft identity roundtrip", (() => {
  const re = [1, 2, 3, 4];
  const im = [0, 0, 0, 0];
  const fwd = FFT.transform(re, im);
  const inv = FFT.inverse(fwd.real, fwd.imag);
  return inv.real.map(v => Math.round(v * 1000) / 1000);
})(), [1, 2, 3, 4]);
check("fft dc component", (() => {
  const re = [1, 1, 1, 1];
  const im = [0, 0, 0, 0];
  const result = FFT.transform(re, im);
  return Math.round(result.real[0]);
})(), 4);
check("fft non-power-of-2 throws", raises(() => FFT.transform([1, 2, 3], [0, 0, 0])), true);
check("fft length mismatch throws", raises(() => FFT.transform([1, 2], [0])), true);
check("fft magnitude", (() => {
  const mag = FFT.magnitude([3, 0], [4, 0]);
  return [Math.round(mag[0]), Math.round(mag[1])];
})(), [5, 0]);
check("fir filter impulse response", (() => {
  const fir = new FIRFilter([0.5, 0.3, 0.2]);
  const out = [];
  out.push(fir.process(1));
  out.push(fir.process(0));
  out.push(fir.process(0));
  return out.map(v => Math.round(v * 100) / 100);
})(), [0.5, 0.3, 0.2]);
check("fir filter constant input", (() => {
  const fir = new FIRFilter([0.25, 0.25, 0.25, 0.25]);
  let val = 0;
  for (let i = 0; i < 10; i++) val = fir.process(1);
  return Math.round(val * 100) / 100;
})(), 1);
check("fir reset clears state", (() => {
  const fir = new FIRFilter([1, 0]);
  fir.process(5);
  fir.reset();
  return fir.process(0);
})(), 0);
check("window hann endpoints", (() => {
  const w = WindowFunction.hann(8);
  return Math.abs(w[0]) < 0.001 && Math.abs(w[7]) < 0.001;
})(), true);
check("window hamming center", (() => {
  const w = WindowFunction.hamming(9);
  return Math.abs(w[4] - 1) < 0.01;
})(), true);
check("window apply length mismatch throws", raises(() => WindowFunction.apply([1], [1, 2])), true);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
