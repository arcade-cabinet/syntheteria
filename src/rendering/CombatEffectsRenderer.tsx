/**
 * CombatEffectsRenderer — shows floating damage text and combat flashes.
 *
 * Reads from the combat system's event queue each frame.
 * For each CombatEvent:
 *   - Pushes particle effects (sparks, destruction) via effectEvents
 *   - Renders floating 3D text showing component damage
 *   - Shows "DESTROYED" label on unit death
 *
 * Text uses billboard sprites that float upward and fade.
 */

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { Identity, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import { type CombatEvent, getLastCombatEvents } from "../systems/combat";
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

function findUnitPosition(
	entityId: string,
): { x: number; y: number; z: number } | null {
	for (const entity of units) {
		if (entity.get(Identity)?.id === entityId) {
			const pos = entity.get(WorldPosition);
			if (pos) return { x: pos.x, y: pos.y, z: pos.z };
		}
	}
	return null;
}

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

export function CombatEffectsRenderer() {
	const [texts, setTexts] = useState<FloatingText[]>([]);
	const prevEventsRef = useRef<CombatEvent[]>([]);

	useFrame(() => {
		const events = getLastCombatEvents();

		// Only process new events (avoid re-processing same tick)
		if (events !== prevEventsRef.current && events.length > 0) {
			prevEventsRef.current = events;

			const newTexts: FloatingText[] = [];

			for (const event of events) {
				// Find target position for effects
				const targetPos = findUnitPosition(event.targetId);
				if (!targetPos) continue;

				// Push particle effects
				pushEffect({
					type: "combat_hit",
					x: targetPos.x,
					y: targetPos.y,
					z: targetPos.z,
					color: 0xff4444,
					intensity: 0.8,
				});

				// Floating damage text
				newTexts.push({
					id: nextTextId++,
					text: event.componentDamaged.toUpperCase(),
					x: targetPos.x + (Math.random() - 0.5) * 0.5,
					y: targetPos.y,
					z: targetPos.z + (Math.random() - 0.5) * 0.5,
					age: 0,
					lifetime: TEXT_LIFETIME,
					color: 0xff6644,
					isDestroy: false,
				});

				if (event.targetDestroyed) {
					// Destruction explosion
					pushEffect({
						type: "combat_destroy",
						x: targetPos.x,
						y: targetPos.y,
						z: targetPos.z,
						intensity: 1.0,
					});

					newTexts.push({
						id: nextTextId++,
						text: "DESTROYED",
						x: targetPos.x,
						y: targetPos.y + 0.5,
						z: targetPos.z,
						age: 0,
						lifetime: DESTROY_LIFETIME,
						color: 0xff2222,
						isDestroy: true,
					});
				}
			}

			if (newTexts.length > 0) {
				setTexts((prev) => [...prev, ...newTexts]);
			}
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
