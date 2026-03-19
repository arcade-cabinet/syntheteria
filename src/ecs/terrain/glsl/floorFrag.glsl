precision mediump float;

// PBR texture atlas — 3x3 grid (3072x3072), 1024 per cell
uniform sampler2D uColorAtlas;
uniform sampler2D uNormalAtlas;
uniform sampler2D uRoughnessAtlas;
uniform sampler2D uMetalnessAtlas;
uniform sampler2D uOpacityAtlas;

varying vec2  vWorldXZ;
varying vec3  vWorldNormal;
varying float vFloorIndex;

// ── Lighting uniforms (from common) ──────────────────────────────────────
uniform vec3 uSunDir;
uniform vec3 uSunColor;

// ── Three.js fog (injected automatically when fog:true on ShaderMaterial) ──
#include <fog_pars_fragment>

// ── Atlas UV ─────────────────────────────────────────────────────────────
// Maps world XZ to atlas cell UV. Continuous world-space coordinates —
// the texture flows seamlessly across entire biome regions.
// cellIndex: 0-8 (row-major in 3x3 grid)
vec2 atlasUV(vec2 worldXZ, float cellIndex) {
  float col = mod(cellIndex, 3.0);
  float row = floor(cellIndex / 3.0);
  // Continuous world UV — texture covers 16 world units before repeating
  vec2 cellUV = fract(worldXZ * 0.0625);
  // Map into atlas cell
  vec2 cellOrigin = vec2(col, row) / 3.0;
  float inset = 0.002;
  vec2 cellSize = vec2(1.0 / 3.0);
  return cellOrigin + inset + cellUV * (cellSize - 2.0 * inset);
}

// ── PBR Lighting ─────────────────────────────────────────────────────────
vec3 applyPBR(vec3 albedo, vec3 N, float roughness, float metalness) {
  vec3 n = normalize(N);
  float ndotl = max(dot(n, uSunDir), 0.0);

  // Fresnel (Schlick)
  vec3 F0 = mix(vec3(0.04), albedo, metalness);

  // Diffuse (non-metallic)
  vec3 diffuse = albedo * (1.0 - metalness);

  // Industrial dome — bright artificial overhead lighting
  // This is a sealed ecumenopolis with artificial sun on the dome ceiling
  // Moderate ambient so individual texture colors remain distinct at game zoom
  vec3 skyTint    = vec3(0.92, 0.88, 0.82);
  vec3 groundTint = vec3(0.30, 0.28, 0.24);
  vec3 hemi = mix(groundTint, skyTint, n.y * 0.5 + 0.5) * 0.5;

  // Reduced ambient to preserve per-cell color contrast between atlas textures
  vec3 ambient = vec3(0.38, 0.36, 0.34);

  // Specular (Blinn-Phong for perf)
  vec3 viewDir = vec3(0.0, 1.0, 0.0);
  vec3 halfVec = normalize(uSunDir + viewDir);
  float spec = pow(max(dot(n, halfVec), 0.0), mix(8.0, 128.0, 1.0 - roughness));
  vec3 specular = F0 * spec * uSunColor * 0.8;

  // Strong sun contribution — artificial illuminator at dome zenith
  vec3 lit = diffuse * (ambient + hemi + uSunColor * ndotl * 1.4) + specular;

  // Reinhard tone-map — lower denominator preserves more brightness
  return lit / (lit + vec3(1.2));
}

void main() {
  vec2 p = vWorldXZ;
  float cell = floor(vFloorIndex + 0.5); // round to nearest integer

  // Sample PBR from the atlas cell assigned by the generator
  vec2 uv = atlasUV(p, cell);
  vec3 color = texture2D(uColorAtlas, uv).rgb;

  // Normal map → world space (flat floor = Y-up)
  vec3 texNormal = texture2D(uNormalAtlas, uv).rgb * 2.0 - 1.0;
  vec3 worldNormal = normalize(vec3(texNormal.x, texNormal.z, -texNormal.y));
  worldNormal = normalize(mix(vWorldNormal, worldNormal, 0.8));

  float roughness = texture2D(uRoughnessAtlas, uv).r;
  float metalness = texture2D(uMetalnessAtlas, uv).r;

  // PBR lighting
  color = applyPBR(color, worldNormal, roughness, metalness);

  // Grating opacity cutout — cell 7 is abyssal_platform (Grate001)
  if (cell > 6.5 && cell < 7.5) {
    float opacity = texture2D(uOpacityAtlas, uv).r;
    if (opacity < 0.5) discard;
  }

  // Void pit (cell 8) — fully transparent
  if (cell > 7.5) discard;

  gl_FragColor = vec4(color, 1.0);

  // Apply Three.js scene fog (fogExp2)
  #include <fog_fragment>
}
