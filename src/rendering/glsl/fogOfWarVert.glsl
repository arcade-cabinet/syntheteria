attribute float elevation;

uniform vec2  uBoardCenter;
uniform float uCurve;       // curvature strength (0 = flat, ~0.003 = subtle planet feel)
uniform float uBoardWidth;  // board width in world units (for cylindrical wrap)

varying vec2  vWorldXZ;

void main() {
	vec4 worldPos = modelMatrix * vec4(position, 1.0);

	// Curvature is BAKED INTO THE GEOMETRY (boardGeometry.ts).
	// Only add tile elevation displacement here.
	worldPos.y += elevation;

	vWorldXZ = worldPos.xz;

	vec4 mvPosition = viewMatrix * worldPos;

	gl_Position = projectionMatrix * mvPosition;
}
