/**
 * TitleMenuScene — The live 3D diegetic title screen.
 *
 * Renders inside a React Three Fiber <Canvas>:
 *   - Volumetric storm cloud sphere (BackSide)
 *   - Ecumenopolis globe with progressive city growth
 *   - Hypercane spiral band around the globe
 *   - Jagged lightning bolt overlay
 *   - Ambient + point lighting
 *
 * The globe slowly rotates and cities spread from continents to ocean,
 * telling the game's premise before the player clicks "New Game."
 */

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
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
} from "./shaders";

// ─── Storm Cloud Dome ────────────────────────────────────────────────────────

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

// ─── Lightning Bolt Overlay ──────────────────────────────────────────────────

function LightningEffect() {
	const _meshRef = useRef<THREE.Mesh>(null);
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

		// Random bolt triggering — ~3% chance per frame
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

// ─── Ecumenopolis Globe ──────────────────────────────────────────────────────

function GlobeWithCities({ growth = 0 }: { growth?: number }) {
	const meshRef = useRef<THREE.Mesh>(null);

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uGrowth: { value: 0 },
		}),
		[],
	);

	useFrame((state) => {
		if (meshRef.current) {
			uniforms.uTime.value = state.clock.elapsedTime;
			uniforms.uGrowth.value = growth;
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

// ─── Hypercane Spiral ────────────────────────────────────────────────────────

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

// ─── Composed Scene ──────────────────────────────────────────────────────────

export interface TitleMenuSceneProps {
	/** 0→1 ecumenopolis city coverage. Animated externally. */
	growth: number;
}

export function TitleMenuScene({ growth }: TitleMenuSceneProps) {
	return (
		<>
			<PerspectiveCamera makeDefault position={[0, 0, 10]} />
			<ambientLight intensity={0.15} />
			<pointLight position={[10, 10, 10]} intensity={0.4} color="#8be6ff" />
			<pointLight position={[-8, -4, -8]} intensity={0.2} color="#350a55" />

			<StormClouds radius={8} />
			<LightningEffect />
			<GlobeWithCities growth={growth} />
			<Hypercane />
		</>
	);
}
