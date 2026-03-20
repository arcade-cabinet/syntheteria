// Common noise and lighting utilities — shared across all floor shaders.
// Included via #include "common.glsl".

// ── Hash / noise ──────────────────────────────────────────────────────────
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
    mix(hash21(i),                  hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  return valueNoise(p) * 0.50
       + valueNoise(p * 2.1) * 0.30
       + valueNoise(p * 4.3) * 0.20;
}

// ── Directional lighting ──────────────────────────────────────────────────
uniform vec3 uSunDir;
uniform vec3 uSunColor;

vec3 applyLighting(vec3 color, vec3 N) {
  vec3 n = normalize(N);
  float ndotl = max(dot(n, uSunDir), 0.0);
  // Industrial storm overhead: warm bounce off cloud layer, warm concrete floor
  vec3 skyTint    = vec3(0.82, 0.78, 0.72);
  vec3 groundTint = vec3(0.22, 0.20, 0.18);
  vec3 hemi = mix(groundTint, skyTint, n.y * 0.5 + 0.5) * 0.5;
  vec3 ambient = vec3(0.40, 0.38, 0.36);
  vec3 lit = color * (ambient + hemi + uSunColor * ndotl * 1.2);
  // Reinhard tone-map: high burn preserves midtones, only compresses highlights
  return lit / (lit + vec3(1.6));
}
