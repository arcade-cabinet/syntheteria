/**
 * Fog of War vertex shader for sphere geometry.
 *
 * Unlike the flat fog shader, this doesn't apply curvature displacement --
 * the sphere shape is already baked into the geometry by buildSphereGeometry().
 *
 * Computes tile UV from the equirectangular projection:
 *   longitude = atan2(z, x) → tileX
 *   latitude  = asin(y/r)   → tileZ
 */

uniform vec2  uBoardSize;  // (width, height) in tiles

varying vec2  vTileUV;
varying vec3  vWorldPos;

const float PI     = 3.14159265358979;
const float TWO_PI = 6.28318530717958;

void main() {
	vec4 worldPos = modelMatrix * vec4(position, 1.0);
	vWorldPos = worldPos.xyz;

	// Derive tile UV from sphere position via inverse equirectangular projection.
	// The sphere is centered at origin, so we normalize the position.
	vec3 n = normalize(position);

	// Longitude: atan2(z, x) → [0, 2*PI)
	float lon = atan(n.z, n.x);
	if (lon < 0.0) lon += TWO_PI;

	// Latitude: asin(y) → [-PI/2, PI/2]
	float lat = asin(clamp(n.y, -1.0, 1.0));

	// Map to tile UV:
	//   tileX = lon * W / (2*PI) - 0.5  →  uv.x = tileX / W = lon / (2*PI) - 0.5/W
	//   tileZ = (PI/2 - lat) * H / PI - 0.5  →  uv.y = tileZ / H = (PI/2 - lat) / PI - 0.5/H
	// But the visibility texture is sampled at tile centers, so we keep the +0.5 offset
	// from tileToSpherePos: lon = ((tileX + 0.5) / W) * 2*PI
	// → tileX = lon * W / (2*PI) - 0.5
	// → UV.x = (tileX + 0.5) / W = lon / (2*PI)
	vTileUV = vec2(
		lon / TWO_PI,
		(PI * 0.5 - lat) / PI
	);

	gl_Position = projectionMatrix * viewMatrix * worldPos;
}
