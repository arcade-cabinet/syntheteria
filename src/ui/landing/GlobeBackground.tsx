/**
 * GlobeBackground — Full-screen R3F Canvas behind the landing page.
 *
 * Renders a slowly rotating ecumenopolis globe with storm atmosphere,
 * lightning bolts, and hypercane spiral. Purely decorative — no
 * interactivity, no input handling, no game state.
 *
 * The lattice growth slowly animates from 0.3 -> 0.5 over time,
 * showing cities spreading across the globe surface.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import {
	globeFragmentShader,
	globeVertexShader,
	hypercaneFragmentShader,
	hypercaneVertexShader,
	lightningFragmentShader,
	lightningVertexShader,
	stormFragmentShader,
	stormVertexShader,
} from "./title/shaders";

// --- Storm Cloud Sky ---

function StormClouds({ radius = 8 }: { radius?: number }) {
	const meshRef = useRef<THREE.Mesh>(null);

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uColor1: { value: new THREE.Color(0x020307) },
			uColor2: { value: new THREE.Color(0x0a1428) },
		}),
		[],
	);

	useFrame((state) => {
		if (meshRef.current) {
			uniforms.uTime.value = state.clock.elapsedTime;
			meshRef.current.rotation.y = state.clock.elapsedTime * 0.02;
		}
	});

	return (
		<mesh ref={meshRef}>
			<sphereGeometry args={[radius, 64, 64]} />
			<shaderMaterial
				vertexShader={stormVertexShader}
				fragmentShader={stormFragmentShader}
				uniforms={uniforms}
				transparent
				side={THREE.BackSide}
				depthWrite={false}
			/>
		</mesh>
	);
}

// --- Lightning Bolt Overlay ---

function LightningEffect() {
	const flashRef = useRef(0);
	const boltStartRef = useRef(new THREE.Vector2(0, 0.8));
	const boltEndRef = useRef(new THREE.Vector2(0, -0.8));

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uFlash: { value: 0 },
			uBoltStart: { value: new THREE.Vector2(0, 0.8) },
			uBoltEnd: { value: new THREE.Vector2(0, -0.8) },
		}),
		[],
	);

	useFrame((state) => {
		uniforms.uTime.value = state.clock.elapsedTime;

		if (Math.random() > 0.97) {
			flashRef.current = 1;
			const angle = Math.random() * Math.PI * 2;
			const radius = 0.6 + Math.random() * 0.3;
			boltStartRef.current.set(
				Math.cos(angle) * radius,
				Math.sin(angle) * radius,
			);
			boltEndRef.current.set(
				Math.cos(angle + Math.PI) * (radius * 0.3),
				Math.sin(angle + Math.PI) * (radius * 0.3),
			);
		} else {
			flashRef.current *= 0.85;
		}

		uniforms.uFlash.value = flashRef.current;
		uniforms.uBoltStart.value.copy(boltStartRef.current);
		uniforms.uBoltEnd.value.copy(boltEndRef.current);
	});

	return (
		<mesh position={[0, 0, 2]}>
			<planeGeometry args={[15, 15]} />
			<shaderMaterial
				vertexShader={lightningVertexShader}
				fragmentShader={lightningFragmentShader}
				uniforms={uniforms}
				transparent
				blending={THREE.AdditiveBlending}
				depthWrite={false}
			/>
		</mesh>
	);
}

// --- Ecumenopolis Globe ---

function GlobeWithCities() {
	const meshRef = useRef<THREE.Mesh>(null);
	const growthRef = useRef(0.3);

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uGrowth: { value: 0.3 },
		}),
		[],
	);

	useFrame((state) => {
		if (meshRef.current) {
			uniforms.uTime.value = state.clock.elapsedTime;
			// Slowly grow lattice from 0.3 to 0.5 over ~2 minutes
			growthRef.current = Math.min(0.5, 0.3 + state.clock.elapsedTime * 0.0017);
			uniforms.uGrowth.value = growthRef.current;
			meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
		}
	});

	return (
		<mesh ref={meshRef}>
			<sphereGeometry args={[2.5, 64, 64]} />
			<shaderMaterial
				vertexShader={globeVertexShader}
				fragmentShader={globeFragmentShader}
				uniforms={uniforms}
			/>
		</mesh>
	);
}

// --- Hypercane Spiral ---

function Hypercane() {
	const meshRef = useRef<THREE.Mesh>(null);

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
		}),
		[],
	);

	useFrame((state) => {
		if (meshRef.current) {
			uniforms.uTime.value = state.clock.elapsedTime;
			meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
		}
	});

	return (
		<mesh ref={meshRef} scale={[3, 0.5, 3]}>
			<cylinderGeometry args={[1, 1.5, 2, 64, 32, true]} />
			<shaderMaterial
				vertexShader={hypercaneVertexShader}
				fragmentShader={hypercaneFragmentShader}
				uniforms={uniforms}
				transparent
				side={THREE.DoubleSide}
				blending={THREE.AdditiveBlending}
				depthWrite={false}
			/>
		</mesh>
	);
}

// --- Scene (no Canvas — rendered inside the Canvas below) ---

function TitleScene() {
	return (
		<>
			<ambientLight intensity={0.15} />
			<pointLight position={[10, 10, 10]} intensity={0.4} color="#8be6ff" />
			<pointLight position={[-8, -4, -8]} intensity={0.2} color="#350a55" />

			<StormClouds radius={8} />
			<LightningEffect />
			<GlobeWithCities />
			<Hypercane />
		</>
	);
}

// --- Public Component ---

/**
 * Full-screen R3F Canvas showing the storm globe.
 * Position behind the LandingScreen DOM overlay with a lower z-index.
 */
export function GlobeBackground() {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 100,
			}}
		>
			<Canvas
				camera={{ position: [0, 0, 10], fov: 45 }}
				style={{ width: "100%", height: "100%" }}
				gl={{ antialias: true, alpha: false }}
			>
				<Suspense fallback={null}>
					<TitleScene />
				</Suspense>
			</Canvas>
		</div>
	);
}
