/**
 * HackingBeamRenderer — signal beam + progress ring for active hacking.
 *
 * Reads from the hacking system's event queue each frame.
 * For each active hack:
 *   - Draws a cyan pulsing line from hacker to target
 *   - Shows a progress ring around the target
 *   - On completion: pushes hack_complete effect for particle flash
 *
 * Uses Three.js Line (via primitive) for the beam and torus for the progress ring.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Identity, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import { getLastHackingEvents, type HackingEvent } from "../systems/hacking";
import { pushEffect } from "./particles/effectEvents";

interface ActiveHackVisual {
	hackerId: string;
	targetId: string;
	progress: number;
	hackerPos: THREE.Vector3;
	targetPos: THREE.Vector3;
}

function findEntityPosition(entityId: string): THREE.Vector3 | null {
	for (const entity of units) {
		if (entity.get(Identity)?.id === entityId) {
			const pos = entity.get(WorldPosition);
			if (pos) return new THREE.Vector3(pos.x, pos.y + 0.8, pos.z);
		}
	}
	return null;
}

function HackBeam({ hack }: { hack: ActiveHackVisual }) {
	const ringRef = useRef<THREE.Mesh>(null);
	const ringMatRef = useRef<THREE.MeshStandardMaterial>(null);

	// Create the Line object imperatively to avoid JSX <line> / SVGLineElement conflict
	const lineObj = useMemo(() => {
		const geo = new THREE.BufferGeometry().setFromPoints([
			hack.hackerPos.clone(),
			hack.targetPos.clone(),
		]);
		const mat = new THREE.LineBasicMaterial({
			color: 0x00ffff,
			transparent: true,
			opacity: 0.6,
		});
		return new THREE.Line(geo, mat);
	}, [hack.hackerPos, hack.targetPos]);

	useFrame(({ clock }) => {
		// Update line endpoint positions
		const hackerPos = findEntityPosition(hack.hackerId);
		const targetPos = findEntityPosition(hack.targetId);
		if (!hackerPos || !targetPos) return;

		const positions = lineObj.geometry.attributes
			.position as THREE.BufferAttribute;
		const arr = positions.array as Float32Array;
		arr[0] = hackerPos.x;
		arr[1] = hackerPos.y;
		arr[2] = hackerPos.z;
		arr[3] = targetPos.x;
		arr[4] = targetPos.y;
		arr[5] = targetPos.z;
		positions.needsUpdate = true;

		// Pulse the beam opacity
		const mat = lineObj.material as THREE.LineBasicMaterial;
		mat.opacity = 0.5 + 0.3 * Math.sin(clock.elapsedTime * 6);

		// Position and animate progress ring
		if (ringRef.current) {
			ringRef.current.position.copy(targetPos);
			ringRef.current.position.y = targetPos.y - 0.5;
			ringRef.current.rotation.x = -Math.PI / 2;
			ringRef.current.rotation.z = clock.elapsedTime * 2;
		}

		if (ringMatRef.current) {
			ringMatRef.current.emissiveIntensity =
				0.4 + 0.3 * Math.sin(clock.elapsedTime * 4);
		}
	});

	// Progress ring arc — scale the torus arc based on progress
	const ringArc = Math.max(0.1, hack.progress) * Math.PI * 2;

	return (
		<>
			{/* Signal beam — use primitive to avoid <line>/SVG conflict */}
			<primitive object={lineObj} />

			{/* Progress ring around target */}
			<mesh
				ref={ringRef}
				position={[hack.targetPos.x, hack.targetPos.y - 0.5, hack.targetPos.z]}
				rotation={[-Math.PI / 2, 0, 0]}
			>
				<torusGeometry args={[0.7, 0.04, 8, 32, ringArc]} />
				<meshStandardMaterial
					ref={ringMatRef}
					color={0x00cccc}
					emissive={0x00ffff}
					emissiveIntensity={0.5}
					transparent
					opacity={0.8}
					side={THREE.DoubleSide}
				/>
			</mesh>
		</>
	);
}

export function HackingBeamRenderer() {
	const [activeHacks, setActiveHacks] = useState<ActiveHackVisual[]>([]);
	const prevEventsRef = useRef<HackingEvent[]>([]);

	useFrame(() => {
		const events = getLastHackingEvents();

		if (events !== prevEventsRef.current) {
			prevEventsRef.current = events;

			const newHacks: ActiveHackVisual[] = [];

			for (const event of events) {
				const hackerPos = findEntityPosition(event.hackerId);
				const targetPos = findEntityPosition(event.targetId);
				if (!hackerPos || !targetPos) continue;

				if (event.completed) {
					// Push completion flash effect
					pushEffect({
						type: "hack_complete",
						x: targetPos.x,
						y: targetPos.y,
						z: targetPos.z,
						intensity: 1.0,
					});
				} else {
					// Push beam progress particles
					pushEffect({
						type: "hack_progress",
						x: hackerPos.x,
						y: hackerPos.y,
						z: hackerPos.z,
						targetX: targetPos.x,
						targetY: targetPos.y,
						targetZ: targetPos.z,
						progress: event.progress,
					});

					newHacks.push({
						hackerId: event.hackerId,
						targetId: event.targetId,
						progress: event.progress,
						hackerPos,
						targetPos,
					});
				}
			}

			setActiveHacks(newHacks);
		}
	});

	return (
		<>
			{activeHacks.map((hack) => (
				<HackBeam key={`hack-${hack.hackerId}-${hack.targetId}`} hack={hack} />
			))}
		</>
	);
}
