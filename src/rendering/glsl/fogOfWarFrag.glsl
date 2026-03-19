precision mediump float;

uniform sampler2D uVisibility;
uniform vec2 uBoardSize;  // width, height in tiles
uniform float uTileSize;

varying vec2  vWorldXZ;

// ── Hash / noise (same as common.glsl) ────────────────────────────────────
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

void main() {
	// Convert world position to tile UV [0,1]
	vec2 tileUV = vWorldXZ / (uBoardSize * uTileSize);
	tileUV = clamp(tileUV, 0.0, 1.0);

	float vis = texture2D(uVisibility, tileUV).r;

	// Fog color: dark industrial haze (warm-neutral, not blue)
	vec3 baseFog = vec3(0.07, 0.06, 0.06);

	// Subtle noise to break up the flat fog plane — organic, swirling feel
	float n1 = valueNoise(vWorldXZ * 0.8);
	float n2 = valueNoise(vWorldXZ * 1.7 + 42.0);
	float noise = n1 * 0.6 + n2 * 0.4;

	// Modulate fog color with subtle warm variation
	vec3 fogTint = mix(baseFog, vec3(0.04, 0.03, 0.03), noise * 0.5);

	float fogAlpha = 1.0 - vis;

	// Add noise variation to alpha for organic edges
	fogAlpha += (noise - 0.5) * 0.06;
	fogAlpha = clamp(fogAlpha, 0.0, 1.0);

	gl_FragColor = vec4(fogTint, fogAlpha * 0.60);
}
