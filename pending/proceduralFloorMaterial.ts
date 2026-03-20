/**
 * Procedural floor material for BoardRenderer.
 *
 * THREE.ShaderMaterial that generates metal grid plates, concrete panels, and
 * gravel debris clusters entirely in GLSL — no texture files needed.
 *
 * Cluster placement is driven by the board seed (uSeed uniform), so the same
 * seed always produces the same floor pattern. Cluster types are large
 * noise-driven regions (Approach C from design).
 *
 * Always-on: BoardRenderer uses this exclusively (no texture fallback).
 */

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Seed → float
// ---------------------------------------------------------------------------

/** FNV-1a hash of seed string → normalised float for GLSL uniform. */
function seedToFloat(seed: string): number {
	let hash = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		hash ^= seed.charCodeAt(i);
		hash = Math.imul(hash, 16777619) >>> 0;
	}
	return (hash >>> 0) / 0xffffffff;
}

// ---------------------------------------------------------------------------
// Vertex shader
// ---------------------------------------------------------------------------

const VERT = /* glsl */ `
varying vec2 vWorldXZ;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldXZ = worldPos.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Fragment shader
// ---------------------------------------------------------------------------

const FRAG = /* glsl */ `
precision mediump float;

uniform float uSeed;
varying vec2 vWorldXZ;

// ── Hash / noise ─────────────────────────────────────────────────────────
float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i),               hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  return valueNoise(p) * 0.50
       + valueNoise(p * 2.1) * 0.30
       + valueNoise(p * 4.3) * 0.20;
}

// ── Metal floor plates ───────────────────────────────────────────────────
// 2m × 2m plates with seams, bolt holes at corners, surface scratches.
vec3 metalPattern(vec2 p) {
  const float PLATE = 2.0;

  vec2 plateId  = floor(p / PLATE);
  vec2 plateUV  = fract(p / PLATE);

  // Per-plate brightness variation
  float pv = hash21(plateId + uSeed * 0.13) * 0.06;
  vec3 base = vec3(0.11 + pv, 0.13 + pv, 0.155 + pv);

  // Seam: dark recessed gap at plate edges
  float eSX = min(plateUV.x, 1.0 - plateUV.x);
  float eSZ = min(plateUV.y, 1.0 - plateUV.y);
  float edgeDist = min(eSX, eSZ);
  float seam = 1.0 - smoothstep(0.0, 0.055, edgeDist);
  base = mix(base, vec3(0.03, 0.03, 0.04), seam * 0.88);

  // Bolt holes at plate corners (nearest corner in world space)
  vec2 nearCorner = round(p / PLATE) * PLATE;
  float boltDist  = length(p - nearCorner);
  float boltBody  = 1.0 - smoothstep(0.06, 0.14, boltDist);
  float boltGlint = 1.0 - smoothstep(0.01, 0.06, boltDist);
  base = mix(base, vec3(0.03), boltBody * 0.75);
  base = mix(base, vec3(0.42, 0.44, 0.48), boltGlint * 0.45);

  // Surface: fine noise + occasional scratch
  float surf = fbm(p * 5.0 + uSeed * 1.7);
  base += vec3(surf * 0.028 - 0.014);

  return clamp(base, 0.0, 1.0);
}

// ── Concrete panels ──────────────────────────────────────────────────────
// 5m × 5m poured panels with dark seams, microdetail FBM.
vec3 concretePattern(vec2 p) {
  const float PANEL = 5.0;

  vec2 panelId = floor(p / PANEL);
  vec2 panelUV = fract(p / PANEL);

  // Per-panel tint
  float pv = hash21(panelId + uSeed * 0.21) * 0.05;
  vec3 base = vec3(0.14 + pv, 0.135 + pv, 0.125 + pv);

  // Seam
  float eSX = min(panelUV.x, 1.0 - panelUV.x);
  float eSZ = min(panelUV.y, 1.0 - panelUV.y);
  float edgeDist = min(eSX, eSZ);
  float seam = 1.0 - smoothstep(0.0, 0.028, edgeDist);
  base = mix(base, vec3(0.035, 0.03, 0.03), seam * 0.92);

  // FBM surface detail (staining + roughness variation)
  float n = fbm(p * 1.1 + uSeed * 0.5);
  base += vec3(n * 0.045 - 0.022);

  // Slight dark staining patches
  float stain = valueNoise(p * 0.4 + uSeed * 0.9);
  base -= vec3(stain * 0.025);

  return clamp(base, 0.0, 1.0);
}

// ── Gravel / debris scatter ──────────────────────────────────────────────
// No hard geometry — pure FBM in dark ash palette.
vec3 gravelPattern(vec2 p) {
  float n1 = valueNoise(p * 2.8 + uSeed * 0.6);
  float n2 = valueNoise(p * 7.5 + uSeed * 0.4);
  float n3 = valueNoise(p * 17.0 + uSeed * 0.2);
  float v = 0.075 + (n1 * 0.5 + n2 * 0.3 + n3 * 0.2) * 0.09;
  return vec3(v, v * 0.96, v * 0.93);
}

// ── Cluster selection ────────────────────────────────────────────────────
// Low-frequency noise → large contiguous regions (Approach C).
void main() {
  vec2 p = vWorldXZ;

  // Two-octave cluster noise for organic, chunky regions
  vec2 seedOff1 = vec2(uSeed * 17.3, uSeed * 11.7);
  vec2 seedOff2 = vec2(uSeed * 5.1,  uSeed * 8.3);
  float cluster = valueNoise((p + seedOff1) * 0.10) * 0.65
                + valueNoise((p + seedOff2) * 0.055) * 0.35;

  vec3 color;
  if (cluster < 0.38) {
    color = metalPattern(p);
  } else if (cluster < 0.70) {
    color = concretePattern(p);
  } else {
    color = gravelPattern(p);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export function makeProceduralFloorMaterial(seed: string): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		uniforms: {
			uSeed: { value: seedToFloat(seed) },
		},
		vertexShader: VERT,
		fragmentShader: FRAG,
		side: THREE.FrontSide,
	});
}
