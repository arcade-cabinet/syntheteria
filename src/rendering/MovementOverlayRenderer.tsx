/**
 * Movement Overlay Renderer
 *
 * When a player unit is selected and has MP remaining, renders translucent
 * cyan overlays on all reachable cells within MP range. Cells that cost more
 * MP to reach appear dimmer. Uses instanced plane geometry for performance.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Identity, Unit, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import { getUnitTurnState } from "../systems/turnSystem";
import {
	gridToWorld,
	SECTOR_LATTICE_SIZE,
} from "../world/sectorCoordinates";
import { computeMovementOverlay } from "./movementOverlay";

const MAX_OVERLAY_INSTANCES = 512;
const OVERLAY_Y = 0.06;
const BASE_OPACITY = 0.15;
const OVERLAY_COLOR = new THREE.Color(0x00e5ff);

const tempMatrix = new THREE.Matrix4();
const tempColor = new THREE.Color();

function getSelectedPlayerUnit(): {
	entityId: string;
	x: number;
	z: number;
	mp: number;
} | null {
	for (const entity of units) {
		const unit = entity.get(Unit);
		if (!unit?.selected) continue;

		const identity = entity.get(Identity);
		if (!identity) continue;

		if (identity.faction !== "player") continue;

		const turnState = getUnitTurnState(identity.id);
		if (!turnState || turnState.movementPoints <= 0) continue;

		const pos = entity.get(WorldPosition);
		if (!pos) continue;

		return {
			entityId: identity.id,
			x: pos.x,
			z: pos.z,
			mp: turnState.movementPoints,
		};
	}
	return null;
}

export function MovementOverlayRenderer() {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const [cellCount, setCellCount] = useState(0);

	const geometry = useMemo(() => {
		const size = SECTOR_LATTICE_SIZE * 0.92;
		return new THREE.PlaneGeometry(size, size);
	}, []);

	const material = useMemo(
		() =>
			new THREE.MeshBasicMaterial({
				color: OVERLAY_COLOR,
				transparent: true,
				opacity: BASE_OPACITY,
				side: THREE.DoubleSide,
				depthWrite: false,
			}),
		[],
	);

	const lastSelectionRef = useRef<string | null>(null);

	useFrame(() => {
		const mesh = meshRef.current;
		if (!mesh) return;

		const selected = getSelectedPlayerUnit();

		if (!selected) {
			if (cellCount > 0) {
				setCellCount(0);
				mesh.count = 0;
				lastSelectionRef.current = null;
			}
			return;
		}

		const selectionKey = `${selected.entityId}:${selected.x}:${selected.z}:${selected.mp}`;
		if (selectionKey === lastSelectionRef.current) {
			return;
		}
		lastSelectionRef.current = selectionKey;

		const overlayCells = computeMovementOverlay(
			selected.x,
			selected.z,
			selected.mp,
		);

		let instanceIndex = 0;
		for (const cell of overlayCells) {
			if (instanceIndex >= MAX_OVERLAY_INSTANCES) break;

			const worldPos = gridToWorld(cell.q, cell.r);

			tempMatrix.makeRotationX(-Math.PI / 2);
			tempMatrix.setPosition(worldPos.x, OVERLAY_Y, worldPos.z);
			mesh.setMatrixAt(instanceIndex, tempMatrix);

			const alpha = Math.max(0.06, BASE_OPACITY * cell.intensity);
			tempColor.setRGB(
				OVERLAY_COLOR.r * alpha * 4,
				OVERLAY_COLOR.g * alpha * 4,
				OVERLAY_COLOR.b * alpha * 4,
			);
			mesh.setColorAt(instanceIndex, tempColor);

			instanceIndex++;
		}

		mesh.count = instanceIndex;
		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) {
			mesh.instanceColor.needsUpdate = true;
		}
		setCellCount(instanceIndex);
	});

	return (
		<instancedMesh
			ref={meshRef}
			args={[geometry, material, MAX_OVERLAY_INSTANCES]}
			frustumCulled={false}
		/>
	);
}
