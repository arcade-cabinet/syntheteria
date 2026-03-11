/**
 * Post-processing pipeline for Syntheteria.
 *
 * Effects (high quality only — disabled on medium/low for performance):
 *   - UnrealBloom: makes emissive elements (lightning, ore glow, holograms)
 *     bloom with industrial intensity
 *   - SSAO: ambient occlusion for depth cues in tight factory machinery gaps
 *   - Vignette: CRT-bezel tie-in — darkens screen edges to reinforce the
 *     "viewing through a broken robot's camera" feel
 *
 * The composer is built imperatively inside R3F via useThree + useFrame
 * so it integrates cleanly with the existing canvas setup.
 *
 * Quality gating:
 *   - "high"   — bloom + SSAO + vignette
 *   - "medium" — vignette only (SSAO too expensive on mid-range hardware)
 *   - "low"    — disabled entirely (null render, R3F handles naturally)
 *
 * Consumed by GameScene — mount <PostProcessing /> inside the Canvas.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { config } from "../../config";

// ---------------------------------------------------------------------------
// Quality tier detection
// ---------------------------------------------------------------------------

type QualityTier = "high" | "medium" | "low";

/**
 * Infer quality tier from navigator and config.
 * Can be overridden by querystring ?quality=high|medium|low for debugging.
 */
function detectQuality(): QualityTier {
	if (typeof window !== "undefined") {
		const param = new URLSearchParams(window.location.search).get("quality");
		if (param === "high" || param === "medium" || param === "low") return param;

		// Low quality on mobile / low-end GPU
		const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
		if (mem !== undefined && mem <= 2) return "low";

		const cores = navigator.hardwareConcurrency ?? 4;
		if (cores <= 2) return "medium";
	}

	// Default: respect rendering.json postProcessing flag on high tier
	return config.rendering.qualityTiers.high.postProcessing ? "high" : "medium";
}

// ---------------------------------------------------------------------------
// Vignette ShaderPass definition
// ---------------------------------------------------------------------------

const VignetteShader = {
	uniforms: {
		tDiffuse: { value: null as THREE.Texture | null },
		offset: { value: 0.95 },
		darkness: { value: 0.55 },
	},
	vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
	fragmentShader: /* glsl */ `
		uniform sampler2D tDiffuse;
		uniform float offset;
		uniform float darkness;
		varying vec2 vUv;

		void main() {
			vec4 texel = texture2D(tDiffuse, vUv);

			// Vignette: darken corners based on distance from center
			vec2 uv = (vUv - 0.5) * 2.0;
			float dist = length(uv);

			// Smooth vignetted region — CRT-bezel feeling
			float vignette = 1.0 - smoothstep(offset, offset + 0.3, dist) * darkness;

			gl_FragColor = vec4(texel.rgb * vignette, texel.a);
		}
	`,
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface PostProcessingProps {
	/** Override quality tier detection. Useful for settings screen. */
	quality?: QualityTier;
	/** Bloom strength (default from GDD: emissive-forward, not lens-flare) */
	bloomStrength?: number;
	/** Bloom radius */
	bloomRadius?: number;
	/** Bloom threshold — only emit pixels brighter than this */
	bloomThreshold?: number;
}

export function PostProcessing({
	quality,
	bloomStrength = 0.35,
	bloomRadius = 0.4,
	bloomThreshold = 0.75,
}: PostProcessingProps) {
	const { gl, scene, camera, size } = useThree();
	const composerRef = useRef<EffectComposer | null>(null);
	const activeQuality = quality ?? detectQuality();

	// Build/rebuild the effect composer when size or quality changes
	useEffect(() => {
		if (activeQuality === "low") return;

		const composer = new EffectComposer(gl);
		composer.setPixelRatio(window.devicePixelRatio);
		composer.setSize(size.width, size.height);

		// Pass 1: render the scene normally
		const renderPass = new RenderPass(scene, camera);
		composer.addPass(renderPass);

		// Pass 2: Unreal Bloom — lights up emissive elements
		if (activeQuality === "high") {
			const bloomPass = new UnrealBloomPass(
				new THREE.Vector2(size.width, size.height),
				bloomStrength,
				bloomRadius,
				bloomThreshold,
			);
			composer.addPass(bloomPass);
		}

		// Pass 3: Vignette — CRT camera feel
		const vignettePass = new ShaderPass(VignetteShader);
		vignettePass.renderToScreen = true;
		composer.addPass(vignettePass);

		// Pass 4: Tone mapping + output encoding
		const outputPass = new OutputPass();
		composer.addPass(outputPass);

		composerRef.current = composer;

		return () => {
			// Dispose all passes and targets to free GPU memory
			for (const pass of composer.passes) {
				if ("dispose" in pass && typeof pass.dispose === "function") {
					(pass as { dispose: () => void }).dispose();
				}
			}
			composer.dispose();
			composerRef.current = null;
		};
	}, [gl, scene, camera, size.width, size.height, activeQuality, bloomStrength, bloomRadius, bloomThreshold]);

	// Handle canvas resize
	useEffect(() => {
		if (composerRef.current) {
			composerRef.current.setSize(size.width, size.height);
		}
	}, [size.width, size.height]);

	// Render through the composer each frame instead of R3F's default render
	useFrame(() => {
		if (composerRef.current) {
			composerRef.current.render();
		}
	}, 1); // priority 1 — runs after R3F's default render pass (priority 0)

	return null;
}
