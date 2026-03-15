/**
 * GlowRingRenderer — ground-plane glow rings showing unit state.
 *
 * Every unit gets a ring indicating:
 *   - READY (has AP+MP): pulsing cyan ring, full brightness
 *   - PARTIALLY SPENT (some points): dim cyan, slower pulse
 *   - FULLY SPENT (no points): dim gray ring, no pulse
 *   - SELECTED: bright white pulsing ring, larger radius
 *
 * Uses instanced mesh for performance — one draw call for all rings.
 * Ring material uses additive blending for glow effect.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Identity, MapFragment, Unit, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import { getUnitTurnState, hasAnyPoints } from "../systems/turnSystem";
import { getStructuralFragment } from "../world/structuralSpace";
import {
	getCultistVisualConfig,
	getDamageRatio,
	getDamageVisuals,
	isCultistVisual,
} from "./unitVisuals";

const MAX_RINGS = 128;

const COLOR_READY = new THREE.Color(0x00ffff);
const COLOR_PARTIAL = new THREE.Color(0x007799);
const COLOR_SPENT = new THREE.Color(0x333333);
const COLOR_SELECTED = new THREE.Color(0xffffff);
const COLOR_FERAL = new THREE.Color(0xff8844);
const COLOR_CULTIST = new THREE.Color(getCultistVisualConfig().auraColor);

const READY_RADIUS = 0.6;
const SELECTED_RADIUS = 0.8;
const SPENT_RADIUS = 0.5;

const READY_PULSE_SPEED = 2.5;
const SELECTED_PULSE_SPEED = 4.0;
const PARTIAL_PULSE_SPEED = 1.5;

export function GlowRingRenderer() {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const dummyMatrix = useMemo(() => new THREE.Matrix4(), []);
	const tempColor = useMemo(() => new THREE.Color(), []);

	const { geometry, material } = useMemo(() => {
		const geo = new THREE.TorusGeometry(1, 0.05, 8, 32);
		geo.rotateX(-Math.PI / 2);

		const mat = new THREE.MeshStandardMaterial({
			color: 0x00ffff,
			emissive: 0x00ffff,
			emissiveIntensity: 0.5,
			transparent: true,
			opacity: 0.7,
			side: THREE.DoubleSide,
			depthWrite: false,
		});

		return { geometry: geo, material: mat };
	}, []);

	useFrame(({ clock }) => {
		const mesh = meshRef.current;
		if (!mesh) return;

		const allUnits = Array.from(units);
		const count = Math.min(allUnits.length, MAX_RINGS);

		for (let i = 0; i < count; i++) {
			const entity = allUnits[i];
			const wp = entity.get(WorldPosition);
			if (!wp) {
				dummyMatrix.makeScale(0, 0, 0);
				mesh.setMatrixAt(i, dummyMatrix);
				continue;
			}

			const frag = entity.has(MapFragment)
				? getStructuralFragment(entity.get(MapFragment)!.fragmentId)
				: null;
			const ox = frag?.displayOffset.x ?? 0;
			const oz = frag?.displayOffset.z ?? 0;

			const entityId = entity.get(Identity)?.id ?? "";
			const isSelected = entity.get(Unit)?.selected ?? false;
			const hasPoints = hasAnyPoints(entityId);
			const turnState = getUnitTurnState(entityId);

			const hasPartialPoints =
				turnState != null &&
				(turnState.actionPoints > 0 || turnState.movementPoints > 0) &&
				(turnState.actionPoints < turnState.maxActionPoints ||
					turnState.movementPoints < turnState.maxMovementPoints);

			// Determine ring state
			let radius: number;
			let color: THREE.Color;
			let pulseIntensity: number;

			if (isSelected) {
				radius = SELECTED_RADIUS;
				color = COLOR_SELECTED;
				const pulse =
					0.6 + 0.4 * Math.sin(clock.elapsedTime * SELECTED_PULSE_SPEED);
				pulseIntensity = pulse;
			} else if (hasPoints && !hasPartialPoints) {
				radius = READY_RADIUS;
				color = COLOR_READY;
				const pulse =
					0.4 + 0.6 * Math.sin(clock.elapsedTime * READY_PULSE_SPEED);
				pulseIntensity = pulse;
			} else if (hasPartialPoints) {
				radius = READY_RADIUS * 0.9;
				color = COLOR_PARTIAL;
				const pulse =
					0.3 + 0.4 * Math.sin(clock.elapsedTime * PARTIAL_PULSE_SPEED);
				pulseIntensity = pulse;
			} else {
				radius = SPENT_RADIUS;
				color = COLOR_SPENT;
				pulseIntensity = 0.15;
			}

			// Faction-specific ring color overrides
			const faction = entity.get(Identity)?.faction ?? "player";
			if (isCultistVisual(faction)) {
				color = COLOR_CULTIST;
				// Cultist rings pulse with eerie flicker
				const cultPulse = 0.1 * Math.sin(clock.elapsedTime * 2.5);
				pulseIntensity = Math.max(0.15, pulseIntensity + cultPulse);
			} else if (faction === "feral") {
				color = COLOR_FERAL;
			}

			// Health-driven opacity degradation via unitVisuals
			const components = entity.get(Unit)?.components ?? [];
			const damageRatio = getDamageRatio(components);
			const damageVisuals = getDamageVisuals(damageRatio);
			pulseIntensity *= damageVisuals.glowIntensity;

			// Set transform
			dummyMatrix.makeScale(radius, radius, radius);
			dummyMatrix.setPosition(wp.x + ox, wp.y + 0.03, wp.z + oz);
			mesh.setMatrixAt(i, dummyMatrix);

			// Set color with pulse
			tempColor.copy(color).multiplyScalar(Math.max(0.1, pulseIntensity));
			mesh.setColorAt(i, tempColor);
		}

		// Hide unused instances
		for (let i = count; i < MAX_RINGS; i++) {
			dummyMatrix.makeScale(0, 0, 0);
			mesh.setMatrixAt(i, dummyMatrix);
		}

		mesh.count = count;
		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) {
			mesh.instanceColor.needsUpdate = true;
		}
	});

	return (
		<instancedMesh
			ref={meshRef}
			args={[geometry, material, MAX_RINGS]}
			frustumCulled={false}
		/>
	);
}
