function makePRNG(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = s + 1831565813 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967295;
  };
}
const ADJECTIVES = [
  "hollow",
  "bright",
  "silent",
  "broken",
  "cold",
  "deep",
  "feral",
  "ashen",
  "ruined",
  "lost",
  "ancient",
  "static",
  "dark",
  "pale",
  "copper",
  "crimson",
  "iron",
  "rusted",
  "storm",
  "void",
  "null",
  "hard",
  "soft",
  "lone",
  "veiled",
  "bleak",
  "stark",
  "raw",
  "slack",
  "split",
  "sharp",
  "worn",
  "bare",
  "grim",
  "grey",
  "amber",
  "azure",
  "black",
  "white",
  "scarred",
  "dim",
  "bright",
  "wet",
  "dry",
  "slow",
  "fast",
  "wide",
  "thin",
  "tall",
  "low",
  "old",
  "new",
  "dead",
  "live",
  "hot",
  "cool",
  "mild",
  "harsh"
];
const NOUNS = [
  "forge",
  "delta",
  "circuit",
  "signal",
  "grid",
  "shard",
  "node",
  "echo",
  "static",
  "ruin",
  "tower",
  "ward",
  "vault",
  "rift",
  "core",
  "shell",
  "pulse",
  "tide",
  "wave",
  "stream",
  "flow",
  "arc",
  "link",
  "chain",
  "bridge",
  "gate",
  "lock",
  "key",
  "cell",
  "loop",
  "line",
  "point",
  "dot",
  "mark",
  "sign",
  "trace",
  "wire",
  "beam",
  "spark",
  "flash",
  "surge",
  "drain",
  "field",
  "zone",
  "sector",
  "block",
  "patch",
  "band",
  "mesh",
  "stack",
  "heap",
  "root",
  "seed",
  "leaf",
  "stem",
  "branch"
];
function seedToPhrase(seed) {
  const s = seed >>> 0;
  const ai = s % ADJECTIVES.length;
  const bi = Math.floor(s / ADJECTIVES.length) % ADJECTIVES.length;
  const ni = Math.floor(s / (ADJECTIVES.length * ADJECTIVES.length)) % NOUNS.length;
  return `${ADJECTIVES[ai]}-${ADJECTIVES[bi]}-${NOUNS[ni]}`;
}
function phraseToSeed(phrase) {
  const trimmed = phrase.trim().toLowerCase().replace(/\s+/g, "-");
  const asNum = Number(trimmed);
  if (!Number.isNaN(asNum) && Number.isInteger(asNum)) {
    return asNum >>> 0;
  }
  const parts = trimmed.split("-");
  if (parts.length !== 3) return null;
  const ai = ADJECTIVES.indexOf(parts[0]);
  const bi = ADJECTIVES.indexOf(parts[1]);
  const ni = NOUNS.indexOf(parts[2]);
  if (ai === -1 || bi === -1 || ni === -1) return null;
  const seed = ai + bi * ADJECTIVES.length + ni * ADJECTIVES.length * ADJECTIVES.length;
  return seed >>> 0;
}
function randomSeed() {
  return Math.random() * 4294967295 >>> 0;
}
let _currentSeed = 42;
function setWorldSeed(seed) {
  _currentSeed = seed >>> 0;
}
function getWorldSeed() {
  return _currentSeed;
}
function worldPRNG(purpose) {
  let h = _currentSeed;
  for (let i = 0; i < purpose.length; i++) {
    h = Math.imul(h, 31) + purpose.charCodeAt(i) >>> 0;
  }
  return makePRNG(h);
}
let _gameplayPRNG = makePRNG(Date.now());
function initGameplayPRNG(seed) {
  _gameplayPRNG = makePRNG(seed);
}
function gameplayRandom() {
  return _gameplayPRNG();
}

export { gameplayRandom as g, phraseToSeed as p, randomSeed as r, seedToPhrase as s, worldPRNG as w };
//# sourceMappingURL=seed-BwjLk4HQ.js.map
