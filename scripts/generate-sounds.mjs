// Generates seamlessly-loopable placeholder ambience into assets/sounds/*.wav.
// Deterministic (seeded PRNG), so re-running produces identical files.
//   node scripts/generate-sounds.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 22_050;
const SECONDS = 8;
const N = SAMPLE_RATE * SECONDS;
const XFADE = Math.floor(SAMPLE_RATE * 0.5); // loop-seam crossfade length
// Leave headroom: the OS mixer *sums* concurrent players, and summed PCM clips hard.
const PEAK = 0.7;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const noise = (rand, len) => Float32Array.from({ length: len }, () => rand() * 2 - 1);

function lowpass(x, a) {
  const y = new Float32Array(x.length);
  let s = 0;
  for (let i = 0; i < x.length; i++) y[i] = s += a * (x[i] - s);
  return y;
}

/** Makes x (length N + XFADE) loop: the tail is blended into the head so the seam is continuous. */
function makeLoop(x) {
  const out = x.slice(0, N);
  for (let i = 0; i < XFADE; i++) {
    const w = i / XFADE;
    out[i] = x[i] * w + x[N + i] * (1 - w);
  }
  return out;
}

function normalize(x) {
  let max = 0;
  for (const v of x) max = Math.max(max, Math.abs(v));
  return x.map((v) => (v / max) * PEAK);
}

const LEN = N + XFADE;
const t = (i) => i / SAMPLE_RATE;

const recipes = {
  // Hiss + a hint of droplet clicks.
  rain(rand) {
    const w = noise(rand, LEN);
    const low = lowpass(w, 0.25);
    return w.map((v, i) => (v - low[i]) * (0.6 + 0.4 * rand()));
  },
  // Low rumble, slowly swelling twice per loop (integer cycles => seamless).
  wind(rand) {
    const base = lowpass(noise(rand, LEN), 0.03);
    return base.map((v, i) => v * (0.65 + 0.35 * Math.sin((2 * Math.PI * 2 * t(i)) / SECONDS)));
  },
  // Filtered noise with a once-per-loop swell envelope.
  waves(rand) {
    const base = lowpass(noise(rand, LEN), 0.06);
    return base.map((v, i) => {
      const e = 0.5 + 0.5 * Math.sin((2 * Math.PI * t(i)) / SECONDS - Math.PI / 2);
      return v * Math.pow(e, 1.5);
    });
  },
  // Soft bed + random exponentially-decaying clicks.
  fire(rand) {
    const out = lowpass(noise(rand, LEN), 0.015).map((v) => v * 0.5);
    for (let c = 0; c < SECONDS * 14; c++) {
      const start = Math.floor(rand() * LEN);
      const amp = (rand() * 2 - 1) * (0.3 + rand() * 0.7);
      for (let k = 0; k < 400; k++) out[(start + k) % LEN] += amp * Math.exp(-k / 40) * (rand() * 2 - 1);
    }
    return out;
  },
  brown(rand) {
    return lowpass(noise(rand, LEN), 0.008);
  },
};

function toWav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');
mkdirSync(outDir, { recursive: true });
Object.entries(recipes).forEach(([name, recipe], idx) => {
  const wav = toWav(normalize(makeLoop(recipe(mulberry32(1000 + idx)))));
  writeFileSync(join(outDir, `${name}.wav`), wav);
  console.log(`${name}.wav  ${(wav.length / 1024).toFixed(0)} KB`);
});
