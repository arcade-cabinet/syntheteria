/**
 * Fog of War shader — renders a translucent overlay plane.
 *
 * The fog DataTexture encodes per-cell visibility as greyscale:
 *   0.0 = UNEXPLORED (fully black, alpha 1.0)
 *   0.5 = EXPLORED   (dark overlay, alpha = exploredDarkness)
 *   1.0 = VISIBLE    (no overlay, alpha 0.0)
 *
 * Edge blending smooths transitions between visibility zones using
 * bilinear sampling of the fog texture.
 */

export const fogVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fogFragmentShader = /* glsl */ `
uniform sampler2D fogTexture;
uniform float exploredDarkness;
uniform float edgeBlendSize;
uniform vec2 texelSize;

varying vec2 vUv;

void main() {
  // Sample the fog texture — value encodes visibility level.
  // 0.0 = unexplored, 0.5 = explored, 1.0 = visible
  float fog = texture2D(fogTexture, vUv).r;

  // Smooth the value by averaging a small kernel for edge blending.
  // The blend radius is edgeBlendSize texels.
  float blendRadius = edgeBlendSize;
  float sum = fog;
  float count = 1.0;

  for (float dy = -2.0; dy <= 2.0; dy += 1.0) {
    for (float dx = -2.0; dx <= 2.0; dx += 1.0) {
      if (dx == 0.0 && dy == 0.0) continue;
      float w = 1.0 - length(vec2(dx, dy)) / (blendRadius + 0.001);
      if (w <= 0.0) continue;
      vec2 offset = vec2(dx, dy) * texelSize;
      sum += texture2D(fogTexture, vUv + offset).r * w;
      count += w;
    }
  }

  float smoothFog = sum / count;

  // Map fog value to alpha:
  // 0.0 (unexplored) -> alpha 1.0
  // 0.5 (explored)   -> alpha exploredDarkness
  // 1.0 (visible)    -> alpha 0.0
  float alpha;
  if (smoothFog < 0.5) {
    // Unexplored to explored transition
    float t = smoothFog / 0.5;
    alpha = mix(1.0, exploredDarkness, t);
  } else {
    // Explored to visible transition
    float t = (smoothFog - 0.5) / 0.5;
    alpha = mix(exploredDarkness, 0.0, t);
  }

  // Fully transparent fragments can be discarded
  if (alpha < 0.005) discard;

  gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
}
`;
