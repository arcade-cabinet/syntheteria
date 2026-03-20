precision mediump float;

uniform sampler2D uVisibility;
uniform vec2 uBoardSize;  // width, height in tiles

varying vec2  vTileUV;    // [0,1] tile UV from vertex shader
varying vec3  vWorldPos;  // sphere-space position for noise

// ── Hash / noise (same as fogOfWarFrag.glsl) ────────────────────────────────
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
	vec2 tileUV = clamp(vTileUV, 0.0, 1.0);

	float vis = texture2D(uVisibility, tileUV).r;

	// Storm interference haze — purple-violet matching the hypercane palette
	vec3 deepFog  = vec3(0.10, 0.06, 0.16);  // dark violet — dense storm interference
	vec3 stormFog = vec3(0.20, 0.12, 0.28);  // lighter purple — distant storm haze

	// Use sphere world position for noise sampling — gives organic 3D variation
	vec2 noiseCoord = vWorldPos.xz * 0.15;
	float n1 = valueNoise(noiseCoord * 0.8);
	float n2 = valueNoise(noiseCoord * 1.7 + 42.0);
	float noise = n1 * 0.6 + n2 * 0.4;

	// Blend between deep and storm fog based on visibility gradient
	// More visible = more storm-colored (distant haze), less visible = darker
	vec3 fogTint = mix(deepFog, stormFog, vis * 0.8 + noise * 0.2);

	float fogAlpha = 1.0 - vis;

	// Add noise variation to alpha for organic edges
	fogAlpha += (noise - 0.5) * 0.08;
	fogAlpha = clamp(fogAlpha, 0.0, 1.0);

	// Cap alpha — storm interference is a translucent haze, not total blackout
	gl_FragColor = vec4(fogTint, fogAlpha * 0.50);
}
