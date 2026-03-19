/**
 * LodGlobe — procedural ecumenopolis shader rendered at the game sphere's scale.
 *
 * At far zoom (camera distance > LOD_FAR), the procedural globe shader from
 * the title screen (uGrowth=1.0) is fully visible, providing a rich "planet
 * from space" look without needing to render thousands of individual tiles.
 *
 * At close zoom (camera distance < LOD_NEAR), the procedural globe is fully
 * transparent, letting the PBR atlas board + GLB structures show through.
 *
 * Between LOD_NEAR and LOD_FAR, opacity crossfades smoothly.
 *
 * The LOD globe is rendered slightly INSIDE the board sphere (scale 0.999)
 * so it never z-fights with the PBR surface.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { sphereRadius } from "./boardGeometry";
import { globeFragmentShader, globeVertexShader } from "./globe/shaders";

// ── LOD distance thresholds ──────────────────────────────────────────────────
// Expressed as multiples of the sphere radius.
// NEAR: below this, procedural globe is invisible (PBR + GLBs only).
// FAR:  above this, procedural globe is fully opaque.

/** Camera distance / R below which procedural globe is invisible. */
const LOD_NEAR_FACTOR = 1.6;
/** Camera distance / R above which procedural globe is fully opaque. */
const LOD_FAR_FACTOR = 2.8;

// ── Modified globe fragment shader with alpha support ────────────────────────
// The original globeFragmentShader outputs vec4(color, 1.0).
// We replace the last line to use uOpacity for crossfading.

const lodFragmentShader = globeFragmentShader.replace(
	"gl_FragColor = vec4(color, 1.0);",
	`gl_FragColor = vec4(color, uOpacity);`,
);

// Inject uOpacity uniform declaration after existing uniforms
const lodFragmentShaderFull = lodFragmentShader.replace(
	"uniform float uGrowth;",
	"uniform float uGrowth;\n  uniform float uOpacity;",
);

type LodGlobeProps = {
	boardWidth: number;
	boardHeight: number;
};

export function LodGlobe({ boardWidth, boardHeight }: LodGlobeProps) {
	const meshRef = useRef<THREE.Mesh>(null);
	const { camera } = useThree();

	const R = useMemo(
		() => sphereRadius(boardWidth, boardHeight),
		[boardWidth, boardHeight],
	);

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uGrowth: { value: 1.0 }, // Always fully grown in game
			uOpacity: { value: 0 },
		}),
		[],
	);

	// Sphere segment count — 64x64 matches the title globe
	const segments = 64;

	useFrame((state) => {
		if (!meshRef.current) return;

		// Update time for animated lattice lights
		uniforms.uTime.value = state.clock.elapsedTime;

		// Camera distance from sphere center (origin)
		const dist = camera.position.length();
		const ratio = dist / R;

		// Smoothstep crossfade between NEAR and FAR
		const t = Math.max(
			0,
			Math.min(
				1,
				(ratio - LOD_NEAR_FACTOR) / (LOD_FAR_FACTOR - LOD_NEAR_FACTOR),
			),
		);
		// Smooth hermite interpolation (same as GLSL smoothstep)
		const opacity = t * t * (3 - 2 * t);
		uniforms.uOpacity.value = opacity;

		// Hide mesh entirely when fully transparent (skip draw call)
		meshRef.current.visible = opacity > 0.001;
	});

	return (
		<mesh ref={meshRef} renderOrder={-10}>
			<sphereGeometry args={[R * 0.999, segments, segments]} />
			<shaderMaterial
				vertexShader={globeVertexShader}
				fragmentShader={lodFragmentShaderFull}
				uniforms={uniforms}
				transparent
				depthWrite={false}
			/>
		</mesh>
	);
}
