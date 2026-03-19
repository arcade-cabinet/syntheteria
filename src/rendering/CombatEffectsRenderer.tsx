/**
 * CombatEffectsRenderer — combat visual feedback.
 *
 * Each frame, queries entities with CombatResult traits and:
 *   - Pushes particle effects (sparks, destruction) via effectEvents
 *   - Renders floating damage text that billboards toward camera
 *   - Shows flash on hit, "DESTROYED" label on kills
 *   - Decrements framesRemaining; removes CombatResult when expired
 *
 * Adapted from pending/rendering/CombatEffectsRenderer.tsx — rewired to
 * current ECS (UnitPos + CombatResult instead of old Identity/WorldPosition/combat).
 */

import { useFrame } from "@react-three/fiber";
import type { World } from "koota";
import { useRef, useState } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../config/gameDefaults";
import { CombatResult, UnitPos } from "../ecs/traits/unit";
import { pushEffect } from "./particles/effectEvents";

interface FloatingText {
	id: number;
	text: string;
	x: number;
	y: number;
	z: number;
	age: number;
	lifetime: number;
	color: number;
	isDestroy: boolean;
}

const TEXT_LIFETIME = 1.2;
const DESTROY_LIFETIME = 2.0;
const FLOAT_SPEED = 1.5;

let nextTextId = 0;

function FloatingDamageText({ text }: { text: FloatingText }) {
	const meshRef = useRef<THREE.Mesh>(null);

	useFrame((state, delta) => {
		if (!meshRef.current) return;
		text.age += delta;

		// Float upward
		meshRef.current.position.y = text.y + 1.5 + text.age * FLOAT_SPEED;
		meshRef.current.position.x = text.x;
		meshRef.current.position.z = text.z;

		// Fade out
		const t = text.age / text.lifetime;
		const opacity = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
		const scale = text.isDestroy
			? 1.0 + Math.sin(text.age * 8) * 0.05
			: 0.8 + t * 0.2;

		meshRef.current.scale.setScalar(scale);

		const mat = meshRef.current.material as THREE.MeshBasicMaterial;
		mat.opacity = Math.max(0, opacity);

		// Billboard: face camera
		meshRef.current.quaternion.copy(state.camera.quaternion);
	});

	const size = text.isDestroy ? 0.4 : 0.25;

	return (
		<mesh ref={meshRef} position={[text.x, text.y + 1.5, text.z]}>
			<planeGeometry args={[size * text.text.length * 0.6, size]} />
			<meshBasicMaterial
				color={text.color}
				transparent
				opacity={1}
				side={THREE.DoubleSide}
				depthWrite={false}
			/>
		</mesh>
	);
}

export function CombatEffectsRenderer({ world }: { world: World }) {
	const [texts, setTexts] = useState<FloatingText[]>([]);
	const processedRef = useRef(new Set<number>());

	useFrame(() => {
		const newTexts: FloatingText[] = [];

		for (const entity of world.query(CombatResult, UnitPos)) {
			const result = entity.get(CombatResult);
			const pos = entity.get(UnitPos);
			if (!result || !pos) continue;

			const eid = entity.id();
			const worldX = pos.tileX * TILE_SIZE_M;
			const worldZ = pos.tileZ * TILE_SIZE_M;

			// Only spawn effects on the first frame of a CombatResult
			if (!processedRef.current.has(eid)) {
				processedRef.current.add(eid);

				// Push particle effects
				pushEffect({
					type: result.kind === "destroyed" ? "combat_destroy" : "combat_hit",
					x: worldX,
					y: 0.5,
					z: worldZ,
					color: 0xff4444,
					intensity: result.kind === "destroyed" ? 1.0 : 0.8,
				});

				// Floating damage text
				const label =
					result.kind === "destroyed" ? "DESTROYED" : `-${result.damage}`;
				newTexts.push({
					id: nextTextId++,
					text: label,
					x: worldX + (Math.random() - 0.5) * 0.5,
					y: 0.5,
					z: worldZ + (Math.random() - 0.5) * 0.5,
					age: 0,
					lifetime:
						result.kind === "destroyed" ? DESTROY_LIFETIME : TEXT_LIFETIME,
					color: result.kind === "destroyed" ? 0xff2222 : 0xff6644,
					isDestroy: result.kind === "destroyed",
				});
			}

			// Decrement timer
			if (result.framesRemaining <= 1) {
				processedRef.current.delete(eid);
				entity.remove(CombatResult);
			} else {
				entity.set(CombatResult, {
					...result,
					framesRemaining: result.framesRemaining - 1,
				});
			}
		}

		if (newTexts.length > 0) {
			setTexts((prev) => [...prev, ...newTexts]);
		}

		// Remove expired texts
		setTexts((prev) => prev.filter((t) => t.age < t.lifetime));
	});

	return (
		<>
			{texts.map((text) => (
				<FloatingDamageText key={text.id} text={text} />
			))}
		</>
	);
}
