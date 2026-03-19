/**
 * StormDome — game-world sky system.
 *
 * A BackSide sphere (r=300) that encloses the entire game board.
 * Three visually independent layers composited in one draw call:
 *
 *   L1 Storm clouds  — FBM bands at mid-sky latitudes, profile-driven intensity
 *   L2 Wormhole      — hurricane vortex at the zenith (machine anomaly)
 *   L3 Illuminator   — fixed zenith glow; warm-white industrial dome light
 *
 * Storm profile (stable / volatile / cataclysmic) drives cloud speed, density,
 * detail scale, lightning frequency, and sky tint via weatherDefs.ts.
 *
 * Wormhole glow intensity driven by storm intensity — the wormhole is
 * visible through the storm eye but is NOT a light source for the board.
 * Interior lighting comes from the fixed dome zenith illuminator.
 *
 * Seasonal progression:
 *   uSeason    [0, 1]  — 0=spring, 0.25=summer, 0.5=autumn, 0.75=winter
 *
 * Architecture note:
 *   The dome is a structural container; the storm, wormhole, and illuminator
 *   are distinct systems co-rendered here for a single draw call.
 *   See src/rendering/sky/chronometry.ts for the turn→time-of-day math.
 */

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { type StormProfile, STORM_PROFILE_SPECS } from "../world/config";
import { STORM_VISUAL_PARAMS, WORMHOLE_CYCLE } from "../config/weatherDefs";
import { getWormholeProjectState } from "../ecs/systems/wormholeProject";
import { WORMHOLE_PROJECT_TURNS } from "../config/gameDefaults";

// ---------------------------------------------------------------------------
// Vertex shader
// ---------------------------------------------------------------------------

const DOME_VERT = /* glsl */ `
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    vPosition = position;
    vNormal   = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Fragment shader — three composited layers
// ---------------------------------------------------------------------------

const DOME_FRAG = /* glsl */ `
  precision mediump float;

  uniform float uTime;
  uniform float uDayAngle;  // [0, 2π] — reserved (illuminator is now fixed zenith)
  uniform float uSeason;    // [0, 1]  — 0=spring, 0.25=summer, 0.5=autumn, 0.75=winter

  // Storm profile uniforms (from weatherDefs.ts STORM_VISUAL_PARAMS)
  uniform float uCloudSpeed;       // base animation speed multiplier
  uniform float uCloudDetailScale; // FBM frequency for third octave
  uniform float uStormIntensity;   // base cloud density [0, 1]
  uniform float uSkyTintShift;     // warm→cold tint shift [0, 1]
  uniform float uLightningMin;     // min seconds between flashes
  uniform float uLightningMax;     // max seconds between flashes
  uniform float uFogDensity;       // atmospheric haze at horizon

  // Wormhole cycle uniforms (from weatherDefs.ts WORMHOLE_CYCLE)
  uniform float uWormholeGlowMin;
  uniform float uWormholeGlowMax;
  uniform vec3  uWormholeColorDay;
  uniform vec3  uWormholeColorNight;

  // Wormhole project progress [0, 1] — 0=inactive, 1=completed
  uniform float uWormholeProgress;

  varying vec3 vPosition;
  varying vec3 vNormal;

  const float PI     = 3.14159265358979;
  const float TWO_PI = 6.28318530717958;

  // ── Noise ──────────────────────────────────────────────────────────────────

  float hash3(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  }

  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i),                    hash3(i+vec3(1,0,0)), f.x),
          mix(hash3(i+vec3(0,1,0)),        hash3(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(hash3(i+vec3(0,0,1)),        hash3(i+vec3(1,0,1)), f.x),
          mix(hash3(i+vec3(0,1,1)),        hash3(i+vec3(1,1,1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 6; i++) { v += a * noise3(p); p *= 2.1; a *= 0.45; }
    return v;
  }

  // ── L1: Storm cloud bands ──────────────────────────────────────────────────
  //
  // FBM storm covers the entire sky dome with visible cloud structures.
  // Storm intensity peaks in winter (uSeason ≈ 0.75).
  // Cloud speed, detail, and density driven by storm profile.

  vec4 stormLayer(vec3 pos) {
    // Storm stronger in winter — cos peaks when season is near 0.75
    float stormPeak = 0.5 + 0.5 * cos((uSeason - 0.75) * TWO_PI);

    // Cloud density thresholds — lower = more coverage
    // uStormIntensity shifts the baseline: higher intensity = lower thresholds = denser clouds
    float intensityShift = (uStormIntensity - 0.55) * 0.3;
    float lo = 0.18 - intensityShift + 0.08 * stormPeak;
    float hi = 0.42 - intensityShift + 0.12 * stormPeak;

    // Cloud animation speed driven by profile
    float speed = uCloudSpeed;
    float s1 = fbm(pos * 3.0 + uTime * speed * 1.5);
    float s2 = fbm(pos * 5.0 - vec3(uTime * speed * 2.25, 0.0, uTime * speed * 1.75));
    // Third octave — detail scale driven by profile
    float detailFreq = uCloudDetailScale;
    float s3 = fbm(pos * detailFreq + vec3(0.0, uTime * speed, uTime * speed * 1.25));
    float density = smoothstep(lo, hi, s1 * 0.4 + s2 * 0.35 + s3 * 0.25);

    // Clouds everywhere but thinner near zenith (wormhole) and at very bottom
    float band = smoothstep(-0.10, 0.20, pos.y) * (1.0 - smoothstep(0.80, 0.96, pos.y));
    density *= 0.40 + 0.60 * band;

    // Season-tinted colours: cold blue in winter, slightly warmer in summer
    // uSkyTintShift pushes towards colder, more dramatic tones
    // Boosted contrast — brighter highlights against darker voids
    float warmth = 0.5 + 0.5 * sin(uSeason * TWO_PI); // peaks at summer
    warmth *= (1.0 - uSkyTintShift); // storm profile dampens warmth
    vec3 dark  = mix(vec3(0.06, 0.07, 0.14), vec3(0.08, 0.09, 0.16), warmth);
    vec3 lit   = mix(vec3(0.30, 0.35, 0.60), vec3(0.34, 0.38, 0.52), warmth);
    vec3 color = mix(dark, lit, s1);

    // Lightning flashes — bright enough to illuminate the surface below
    // Use noise threshold modulated by profile lightning frequency
    float flashThreshold = mix(0.90, 0.70, uStormIntensity);
    float flash = step(flashThreshold, s2) * step(0.60, density) * 0.8;
    // Cataclysmic storms get brighter, more purple-tinged lightning
    vec3 flashColor = mix(vec3(0.50, 0.55, 0.90), vec3(0.70, 0.45, 1.0), uSkyTintShift);
    color += flashColor * flash;

    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
    float alpha   = density * (0.70 + fresnel * 0.30);
    return vec4(color, alpha);
  }

  // ── L2: Wormhole / hypercane eye at zenith ──────────────────────────────────
  //
  // Dramatic vortex at the top of the dome — the "eye" of the permanent
  // hypercane that defines Syntheteria's sky. Spiral arms + pulsing core.
  // Glow intensity driven by storm intensity — the wormhole is visible
  // through the storm eye above but is NOT a light source for the board.
  // Interior lighting comes from the artificial dome sun (scene directional light).

  vec4 wormholeLayer(vec3 pos) {
    float zenith  = length(pos.xz);

    // Vortex radius expands with storm intensity AND wormhole project progress
    float progressExpand = uWormholeProgress * 0.25; // up to 0.25 extra radius
    float baseRadius = 0.30 + 0.08 * uStormIntensity + progressExpand;
    float wRadius = baseRadius + 0.06 * sin(uTime * 0.45);

    // Core glow — bright at centre, fading outward
    float glow = smoothstep(wRadius, 0.0, zenith);

    // Logarithmic spiral — creates natural vortex pull effect
    // (technique from Codrops 2025 procedural vortex research)
    float angle = atan(pos.z, pos.x);
    float logRadius = -log2(max(zenith, 0.001));
    float armSpeed = 0.8 + 0.4 * uStormIntensity;

    // Multiple spiral arms with FBM turbulence for organic detail
    float spiral1 = sin(angle * 4.0 + logRadius * 3.0 + uTime * armSpeed) * 0.5 + 0.5;
    float spiral2 = sin(angle * 3.0 - logRadius * 2.5 + uTime * armSpeed * 0.7) * 0.5 + 0.5;
    float turbulence = fbm(vec3(pos.xz * 8.0, uTime * 0.3)) * 0.3;
    float spiral = mix(spiral1, spiral2, 0.4) + turbulence;

    float armMask = smoothstep(wRadius * 2.0, wRadius * 0.2, zenith);
    float arms = clamp(spiral, 0.0, 1.0) * armMask * 0.6;

    float pulse = 0.5 + 0.5 * sin(uTime * 0.65);
    float stormPeak = 0.5 + 0.5 * cos((uSeason - 0.75) * TWO_PI);

    // Wormhole glow intensity driven by storm intensity AND project progress.
    // Stronger storms = brighter, more visible wormhole through the eye.
    // Active project progressively intensifies the vortex.
    float stormFactor = clamp(uStormIntensity, 0.0, 1.0);
    float progressBoost = 1.0 + uWormholeProgress * 2.0; // up to 3x at completion
    float glowIntensity = mix(uWormholeGlowMin, uWormholeGlowMax, stormFactor) * progressBoost;
    vec3 wormholeColor = mix(uWormholeColorNight, uWormholeColorDay, stormFactor);

    // At high progress, shift color toward bright white-violet (transcendence)
    wormholeColor = mix(wormholeColor, vec3(0.8, 0.6, 1.0), uWormholeProgress * 0.5);

    // Multi-colored vortex: storm-intensity-tinted core + arms
    // Boosted brightness — wormhole should be the most dramatic sky feature
    vec3 coreColor = wormholeColor * glow * (0.6 + 0.4 * pulse) * glowIntensity * 2.5;
    vec3 armColor  = wormholeColor * 0.8 * arms;
    float rimIntensity = 0.6 + uWormholeProgress * 1.4; // rim glows brighter with progress
    vec3 rimColor  = vec3(0.25, 0.50, 0.85) * smoothstep(wRadius * 1.5, wRadius * 0.8, zenith) * rimIntensity;

    // Hot white core at very center — brightest point in the sky
    // Expands with project progress
    float coreRadius = 0.12 + uWormholeProgress * 0.08;
    float hotCore = smoothstep(coreRadius, 0.0, zenith);
    vec3 hotWhite = vec3(1.2, 1.0, 1.4) * hotCore * glowIntensity * 1.5;

    // Completion flash — when progress hits 1.0, dramatic bright burst
    float completionFlash = smoothstep(0.95, 1.0, uWormholeProgress);
    vec3 flashColor = vec3(1.5, 1.3, 2.0) * completionFlash * glow * 3.0;

    vec3 color = (coreColor + armColor + rimColor + hotWhite + flashColor) * (0.65 + 0.35 * stormPeak);

    // Only visible above horizon line
    float vis = smoothstep(-0.05, 0.15, pos.y);
    float alpha = max(glow, arms * 0.7) * vis * 0.95;
    return vec4(color * vis, alpha);
  }

  // ── L3: Zenith illuminator (fixed dome light) ──────────────────────────────
  //
  // No external sun — the sky is a permanent hypercane. Interior lighting
  // comes from a fixed industrial array at the dome zenith, powered by
  // storm energy. Warm-white glow, no orbit, no seasonal elevation change.
  // The scene directional light handles actual board illumination.

  vec4 illuminatorLayer(vec3 pos) {
    // Fixed zenith direction — straight up
    vec3 zenithDir = vec3(0.0, 1.0, 0.0);
    float d = dot(pos, zenithDir);

    // Soft glow layers radiating from zenith — wider and softer than the old disc
    float halo   = smoothstep(0.75, 0.92, d) * 0.10;  // broad warm haze
    float corona = smoothstep(0.88, 0.97, d) * 0.30;  // inner glow ring
    float disc   = smoothstep(0.96, 0.995, d);         // bright core
    float core   = smoothstep(0.995, 0.999, d) * 0.5;  // hot centre

    // Warm white — industrial sodium-arc feel, not cold starlight
    vec3 haloColor   = vec3(0.25, 0.20, 0.12);
    vec3 coronaColor = vec3(0.60, 0.50, 0.35);
    vec3 discColor   = vec3(0.92, 0.88, 0.78);
    vec3 coreColor   = vec3(1.00, 0.97, 0.90);

    vec3 color = haloColor   * halo
               + coronaColor * corona
               + discColor   * disc
               + coreColor   * core;

    // Subtle pulse — the array flickers with storm energy feed
    float pulse = 0.92 + 0.08 * sin(uTime * 0.4);
    color *= pulse;

    float alpha = clamp(halo + corona * 0.9 + disc * 0.95, 0.0, 1.0);
    return vec4(color, alpha);
  }

  // ── Main compositor ────────────────────────────────────────────────────────

  void main() {
    vec3 pos = normalize(vPosition);

    // Base: deep storm void — dark but with enough luminance for cloud contrast
    vec3 voidColor = vec3(0.04, 0.05, 0.10);

    vec4 storm  = stormLayer(pos);
    vec4 vortex = wormholeLayer(pos);
    vec4 sun    = illuminatorLayer(pos);

    // Over-composite: storm over void, wormhole additive, sun additive
    vec3 color = mix(voidColor, storm.rgb, storm.a);
    color += vortex.rgb;
    color += sun.rgb;

    // Alpha fade near horizon — wide atmospheric blend where dome meets board sphere.
    // pos.y < 0 is below equator; fade over a broad band to avoid hard geometric edges.
    float horizonFade = smoothstep(-0.15, 0.30, pos.y);

    gl_FragColor = vec4(color, horizonFade);
  }
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type StormDomeProps = {
	/** XZ centre of the game board in world space. */
	centerX?: number;
	centerZ?: number;
	/** Sphere radius — should comfortably exceed board diagonal. */
	radius?: number;
	/**
	 * Day angle [0, 2π] — reserved for future use.
	 * Illuminator is now fixed at dome zenith (no orbit).
	 */
	dayAngle?: number;
	/**
	 * Orbital year progress [0, 1].
	 * 0=spring, 0.25=summer, 0.5=autumn, 0.75=winter.
	 */
	season?: number;
	/**
	 * Storm profile — drives cloud speed, density, detail, lightning,
	 * and atmospheric haze. Defaults to "stable" (calm skies).
	 */
	stormProfile?: StormProfile;
};

export function StormDome({
	centerX = 0,
	centerZ = 0,
	radius = 300,
	dayAngle = 0.8, // reserved — illuminator is now fixed at zenith
	season = 0,
	stormProfile = "stable",
}: StormDomeProps) {
	const meshRef = useRef<THREE.Mesh>(null);

	const stormParams = STORM_VISUAL_PARAMS[stormProfile];

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uDayAngle: { value: dayAngle },
			uSeason: { value: season },
			// Storm profile params
			uCloudSpeed: { value: stormParams.cloudSpeed },
			uCloudDetailScale: { value: stormParams.cloudDetailScale },
			uStormIntensity: { value: 0.55 }, // will be set per-frame from profile
			uSkyTintShift: { value: stormParams.skyTintShift },
			uLightningMin: { value: stormParams.lightningIntervalMin },
			uLightningMax: { value: stormParams.lightningIntervalMax },
			uFogDensity: { value: stormParams.fogDensity },
			// Wormhole cycle params
			uWormholeGlowMin: { value: WORMHOLE_CYCLE.minGlowIntensity },
			uWormholeGlowMax: { value: WORMHOLE_CYCLE.maxGlowIntensity },
			uWormholeColorDay: {
				value: new THREE.Vector3(...WORMHOLE_CYCLE.glowColor.day),
			},
			uWormholeColorNight: {
				value: new THREE.Vector3(...WORMHOLE_CYCLE.glowColor.night),
			},
			// Wormhole project progress
			uWormholeProgress: { value: 0 },
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	useFrame((state) => {
		uniforms.uTime.value = state.clock.elapsedTime;
		// Props-driven: update per frame so turn changes propagate immediately
		uniforms.uDayAngle.value = dayAngle;
		uniforms.uSeason.value = season;

		// Storm profile params — update per frame so profile changes propagate
		const params = STORM_VISUAL_PARAMS[stormProfile];
		uniforms.uCloudSpeed.value = params.cloudSpeed;
		uniforms.uCloudDetailScale.value = params.cloudDetailScale;
		uniforms.uSkyTintShift.value = params.skyTintShift;
		uniforms.uLightningMin.value = params.lightningIntervalMin;
		uniforms.uLightningMax.value = params.lightningIntervalMax;
		uniforms.uFogDensity.value = params.fogDensity;

		// Storm intensity oscillates around base intensity with the storm oscillation range
		// This creates the "breathing" effect where storms wax and wane
		const profileSpec = STORM_PROFILE_SPECS[stormProfile];
		uniforms.uStormIntensity.value =
			profileSpec.baseStormIntensity +
			profileSpec.stormOscillation * Math.sin(state.clock.elapsedTime * 0.15);

		// Wormhole project progress — read from module state
		const whState = getWormholeProjectState();
		if (whState.status === "building") {
			uniforms.uWormholeProgress.value =
				1 - whState.turnsRemaining / WORMHOLE_PROJECT_TURNS;
		} else if (whState.status === "completed") {
			uniforms.uWormholeProgress.value = 1.0;
		} else {
			uniforms.uWormholeProgress.value = 0;
		}
	});

	return (
		<>
			<mesh
				ref={meshRef}
				position={[centerX, 0, centerZ]}
				renderOrder={-1000}
				frustumCulled={false}
			>
				<sphereGeometry args={[radius, 128, 96]} />
				<shaderMaterial
					vertexShader={DOME_VERT}
					fragmentShader={DOME_FRAG}
					uniforms={uniforms}
					side={THREE.BackSide}
					transparent
					depthTest={false}
					depthWrite={false}
				/>
			</mesh>

			{/* Wormhole eye sparkles — purple/violet particles at zenith */}
			<Sparkles
				count={60}
				scale={[40, 20, 40]}
				position={[centerX, radius * 0.85, centerZ]}
				size={6}
				speed={0.8}
				color="#bb66ff"
				opacity={0.85}
			/>
		</>
	);
}
