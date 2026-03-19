attribute float elevation;
attribute float floorIndex;

uniform vec2  uBoardCenter;
uniform float uCurve;
uniform float uBoardWidth;

varying vec2  vWorldXZ;
varying vec3  vWorldNormal;
varying float vFloorIndex;

// Three.js fog support
#include <fog_pars_vertex>

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);

  // Curvature is BAKED INTO THE GEOMETRY (boardGeometry.ts).
  // Only add tile elevation displacement here.
  worldPos.y += elevation;

  vWorldXZ     = worldPos.xz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vFloorIndex  = floorIndex;

  vec4 mvPosition = viewMatrix * worldPos;

  gl_Position = projectionMatrix * mvPosition;

  // Three.js fog depth
  #include <fog_vertex>
}
