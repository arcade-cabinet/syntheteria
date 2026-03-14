/**
 * TurretAttackRenderer — visual beam + muzzle flash for turret auto-attacks.
 *
 * Reads from turretAutoAttack system's event queue each frame.
 * For each TurretAttackEvent:
 *   - Draws a red energy beam from turret barrel to target
 *   - Shows a muzzle flash sphere at the turret barrel
 *   - Pushes combat_hit particle effects at the target
 *   - If target killed, pushes combat_destroy effect
 *
 * Beams persist for ~0.8s then fade out since turret attacks
 * happen during the environment phase (turn-based, not real-time).
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Building, Identity, WorldPosition } from "../ecs/traits";
import { buildings, units } from "../ecs/world";
import {
	getLastTurretEvents,
	type TurretAttackEvent,
} from "../systems/turretAutoAttack";
import { pushEffect } from "./particles/effectEvents";

// ─── Config ──────────────────────────────────────────────────────────────────

const BEAM_LIFETIME = 0.8;
const MUZZLE_FLASH_LIFETIME = 0.3;
const BEAM_COLOR = 0xff3322;
const MUZZLE_COLOR = 0xff6644;
const _BEAM_WIDTH = 0.04;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActiveBeam {
	id: number;
	turretId: string;
	targetId: string;
	turretPos: THREE.Vector3;
	targetPos: THREE.Vector3;
	age: number;
	targetKilled: boolean;
}

let nextBeamId = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findBuildingPosition(entityId: string): THREE.Vector3 | null {
	for (const entity of buildings) {
		if (entity.get(Identity)?.id === entityId) {
			const pos = entity.get(WorldPosition);
			if (pos) return new THREE.Vector3(pos.x, pos.y + 0.7, pos.z + 0.85);
		}
	}
	return null;
}

function findUnitPosition(entityId: string): THREE.Vector3 | null {
	for (const entity of units) {
		if (entity.get(Identity)?.id === entityId) {
			const pos = entity.get(WorldPosition);
			if (pos) return new THREE.Vector3(pos.x, pos.y + 0.6, pos.z);
		}
	}
	return null;
}

// ─── TurretBeam Component ────────────────────────────────────────────────────

function TurretBeam({ beam }: { beam: ActiveBeam }) {
	const muzzleRef = useRef<THREE.Mesh>(null);
	const muzzleMatRef = useRef<THREE.MeshStandardMaterial>(null);

	const lineObj = useMemo(() => {
		const geo = new THREE.BufferGeometry().setFromPoints([
			beam.turretPos.clone(),
			beam.targetPos.clone(),
		]);
		const mat = new THREE.LineBasicMaterial({
			color: BEAM_COLOR,
			transparent: true,
			opacity: 0.9,
			linewidth: 2,
		});
		return new THREE.Line(geo, mat);
	}, [beam.turretPos, beam.targetPos]);

	useFrame(({ clock }, delta) => {
		beam.age += delta;
		const t = beam.age / BEAM_LIFETIME;
		const fadeOut = t > 0.5 ? 1 - (t - 0.5) / 0.5 : 1;

		// Update beam positions (entities may have moved slightly)
		const turretPos = findBuildingPosition(beam.turretId);
		const targetPos = findUnitPosition(beam.targetId);
		if (turretPos && targetPos) {
			const positions = lineObj.geometry.attributes
				.position as THREE.BufferAttribute;
			const arr = positions.array as Float32Array;
			arr[0] = turretPos.x;
			arr[1] = turretPos.y;
			arr[2] = turretPos.z;
			arr[3] = targetPos.x;
			arr[4] = targetPos.y;
			arr[5] = targetPos.z;
			positions.needsUpdate = true;
		}

		// Fade beam
		const mat = lineObj.material as THREE.LineBasicMaterial;
		mat.opacity = Math.max(0, 0.9 * fadeOut);

		// Muzzle flash — bright sphere at turret barrel, rapid fade
		if (muzzleRef.current) {
			const muzzleT = beam.age / MUZZLE_FLASH_LIFETIME;
			if (muzzleT < 1) {
				muzzleRef.current.visible = true;
				const flashScale = 0.15 + 0.1 * Math.sin(beam.age * 30);
				muzzleRef.current.scale.setScalar(flashScale);
				if (muzzleMatRef.current) {
					muzzleMatRef.current.opacity = Math.max(0, 1 - muzzleT);
					muzzleMatRef.current.emissiveIntensity =
						1.5 + Math.sin(clock.elapsedTime * 20) * 0.5;
				}
			} else {
				muzzleRef.current.visible = false;
			}
		}
	});

	return (
		<>
			{/* Energy beam from turret to target */}
			<primitive object={lineObj} />

			{/* Muzzle flash at turret barrel */}
			<mesh
				ref={muzzleRef}
				position={[beam.turretPos.x, beam.turretPos.y, beam.turretPos.z]}
			>
				<sphereGeometry args={[1, 8, 8]} />
				<meshStandardMaterial
					ref={muzzleMatRef}
					color={MUZZLE_COLOR}
					emissive={BEAM_COLOR}
					emissiveIntensity={1.5}
					transparent
					opacity={1}
					depthWrite={false}
				/>
			</mesh>
		</>
	);
}

// ─── Main Renderer ───────────────────────────────────────────────────────────

export function TurretAttackRenderer() {
	const [activeBeams, setActiveBeams] = useState<ActiveBeam[]>([]);
	const prevEventsRef = useRef<readonly TurretAttackEvent[]>([]);

	useFrame((_state, delta) => {
		const events = getLastTurretEvents();

		// Process new turret events
		if (events !== prevEventsRef.current && events.length > 0) {
			prevEventsRef.current = events;

			const newBeams: ActiveBeam[] = [];

			for (const event of events) {
				const turretPos = findBuildingPosition(event.turretEntityId);
				const targetPos = findUnitPosition(event.targetEntityId);
				if (!turretPos || !targetPos) continue;

				// Push impact particle effect at target
				pushEffect({
					type: "combat_hit",
					x: targetPos.x,
					y: targetPos.y,
					z: targetPos.z,
					color: BEAM_COLOR,
					intensity: 0.7,
				});

				// Push sparks at muzzle
				pushEffect({
					type: "sparks",
					x: turretPos.x,
					y: turretPos.y,
					z: turretPos.z,
					color: MUZZLE_COLOR,
					intensity: 0.5,
				});

				if (event.targetKilled) {
					pushEffect({
						type: "combat_destroy",
						x: targetPos.x,
						y: targetPos.y,
						z: targetPos.z,
						intensity: 1.0,
					});
				}

				newBeams.push({
					id: nextBeamId++,
					turretId: event.turretEntityId,
					targetId: event.targetEntityId,
					turretPos,
					targetPos,
					age: 0,
					targetKilled: event.targetKilled,
				});
			}

			if (newBeams.length > 0) {
				setActiveBeams((prev) => [...prev, ...newBeams]);
			}
		}

		// Remove expired beams
		setActiveBeams((prev) => prev.filter((b) => b.age < BEAM_LIFETIME));
	});

	return (
		<>
			{activeBeams.map((beam) => (
				<TurretBeam key={beam.id} beam={beam} />
			))}
		</>
	);
}
