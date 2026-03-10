/**
 * SelectionHighlight — renders emissive glow outlines on hovered/selected entities.
 *
 * - Hovered: subtle green emissive pulse (fades in/out)
 * - Selected: brighter green steady glow
 *
 * Renders a slightly-scaled transparent mesh over the entity with additive
 * blending. Uses the entity's worldPosition and approximate bounding box
 * based on entity type.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { getFragment } from "../ecs/terrain";
import type { Entity } from "../ecs/types";
import {
	belts,
	buildings,
	hackables,
	items,
	miners,
	otters,
	processors,
	signalRelays,
	units,
} from "../ecs/world";
import {
	type EntityCategory,
	getHoveredEntity,
	getSelectedEntity,
} from "../input/ObjectSelectionSystem";

// ─── Colors ─────────────────────────────────────────────────────────────────

const HOVER_COLOR = new THREE.Color(0x00ff66);
const SELECT_COLOR = new THREE.Color(0x00ff88);

// ─── Approximate bounding box sizes per entity type ─────────────────────────

interface BoundsInfo {
	halfW: number;
	halfH: number;
	halfD: number;
	yOffset: number;
}

function getBoundsForType(type: EntityCategory): BoundsInfo {
	switch (type) {
		case "unit":
			return { halfW: 0.35, halfH: 0.55, halfD: 0.35, yOffset: 0.5 };
		case "building":
			return { halfW: 0.9, halfH: 0.8, halfD: 0.9, yOffset: 0.5 };
		case "miner":
			return { halfW: 0.75, halfH: 1.2, halfD: 0.75, yOffset: 1.0 };
		case "processor":
			return { halfW: 0.95, halfH: 0.7, halfD: 0.95, yOffset: 0.6 };
		case "belt":
			return { halfW: 0.55, halfH: 0.15, halfD: 0.55, yOffset: 0.1 };
		case "wire":
			return { halfW: 0.2, halfH: 0.2, halfD: 0.2, yOffset: 0.5 };
		case "item":
			return { halfW: 0.2, halfH: 0.15, halfD: 0.2, yOffset: 0.15 };
		case "otter":
			return { halfW: 0.3, halfH: 0.25, halfD: 0.3, yOffset: 0.2 };
		case "hackable":
			return { halfW: 0.5, halfH: 0.5, halfD: 0.5, yOffset: 0.5 };
		case "signalRelay":
			return { halfW: 0.4, halfH: 0.6, halfD: 0.4, yOffset: 0.5 };
		default:
			return { halfW: 0.5, halfH: 0.5, halfD: 0.5, yOffset: 0.5 };
	}
}

// ─── Entity lookup helper ───────────────────────────────────────────────────

function findEntityById(id: string): Entity | null {
	for (const e of units) if (e.id === id) return e;
	for (const e of buildings) if (e.id === id) return e;
	for (const e of belts) if (e.id === id) return e;
	for (const e of miners) if (e.id === id) return e;
	for (const e of processors) if (e.id === id) return e;
	for (const e of items) if (e.id === id) return e;
	for (const e of otters) if (e.id === id) return e;
	for (const e of hackables) if (e.id === id) return e;
	for (const e of signalRelays) if (e.id === id) return e;
	return null;
}

// Scale factor: the highlight box is slightly larger than the entity
const HIGHLIGHT_SCALE = 1.15;

// ─── Component ──────────────────────────────────────────────────────────────

export function SelectionHighlight() {
	const hoverRef = useRef<THREE.Mesh>(null);
	const selectRef = useRef<THREE.Mesh>(null);
	const hoverMatRef = useRef<THREE.MeshBasicMaterial>(null);
	const selectMatRef = useRef<THREE.MeshBasicMaterial>(null);

	useFrame((state) => {
		const hovered = getHoveredEntity();
		const selected = getSelectedEntity();
		const time = state.clock.elapsedTime;

		// ─── Hover highlight ─────────────────────────────────────────
		if (hoverRef.current && hoverMatRef.current) {
			if (hovered.entityId) {
				const entity = findEntityById(hovered.entityId);
				if (entity?.worldPosition) {
					const bounds = getBoundsForType(hovered.entityType);

					// Get display offset from map fragment
					const frag = entity.mapFragment
						? getFragment(entity.mapFragment.fragmentId)
						: null;
					const ox = frag?.displayOffset.x ?? 0;
					const oz = frag?.displayOffset.z ?? 0;

					hoverRef.current.visible = true;
					hoverRef.current.position.set(
						entity.worldPosition.x + ox,
						entity.worldPosition.y + bounds.yOffset,
						entity.worldPosition.z + oz,
					);
					hoverRef.current.scale.set(
						bounds.halfW * 2 * HIGHLIGHT_SCALE,
						bounds.halfH * 2 * HIGHLIGHT_SCALE,
						bounds.halfD * 2 * HIGHLIGHT_SCALE,
					);

					// Subtle pulse: opacity oscillates between 0.05 and 0.2
					const pulse = 0.05 + 0.15 * (0.5 + 0.5 * Math.sin(time * 4));
					hoverMatRef.current.opacity = pulse;
				} else {
					hoverRef.current.visible = false;
				}
			} else {
				hoverRef.current.visible = false;
			}
		}

		// ─── Selection highlight ─────────────────────────────────────
		if (selectRef.current && selectMatRef.current) {
			if (selected.entityId) {
				const entity = findEntityById(selected.entityId);
				if (entity?.worldPosition) {
					const bounds = getBoundsForType(selected.entityType);

					const frag = entity.mapFragment
						? getFragment(entity.mapFragment.fragmentId)
						: null;
					const ox = frag?.displayOffset.x ?? 0;
					const oz = frag?.displayOffset.z ?? 0;

					selectRef.current.visible = true;
					selectRef.current.position.set(
						entity.worldPosition.x + ox,
						entity.worldPosition.y + bounds.yOffset,
						entity.worldPosition.z + oz,
					);
					selectRef.current.scale.set(
						bounds.halfW * 2 * HIGHLIGHT_SCALE * 1.05,
						bounds.halfH * 2 * HIGHLIGHT_SCALE * 1.05,
						bounds.halfD * 2 * HIGHLIGHT_SCALE * 1.05,
					);

					// Steady brighter glow with very subtle breathing
					const breathe = 0.25 + 0.05 * Math.sin(time * 2);
					selectMatRef.current.opacity = breathe;
				} else {
					selectRef.current.visible = false;
				}
			} else {
				selectRef.current.visible = false;
			}
		}
	});

	return (
		<>
			{/* Hover highlight — subtle green pulse */}
			<mesh ref={hoverRef} visible={false} renderOrder={999}>
				<boxGeometry args={[1, 1, 1]} />
				<meshBasicMaterial
					ref={hoverMatRef}
					color={HOVER_COLOR}
					transparent
					opacity={0.1}
					depthWrite={false}
					blending={THREE.AdditiveBlending}
					side={THREE.FrontSide}
				/>
			</mesh>

			{/* Selection highlight — brighter green steady glow */}
			<mesh ref={selectRef} visible={false} renderOrder={998}>
				<boxGeometry args={[1, 1, 1]} />
				<meshBasicMaterial
					ref={selectMatRef}
					color={SELECT_COLOR}
					transparent
					opacity={0.25}
					depthWrite={false}
					blending={THREE.AdditiveBlending}
					side={THREE.FrontSide}
				/>
			</mesh>
		</>
	);
}
