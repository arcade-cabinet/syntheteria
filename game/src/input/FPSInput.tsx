/**
 * FPS interaction handler — handles E to interact, clicking to
 * place/build, and looking at things to get contextual info.
 *
 * This replaces the old UnitInput which was click-to-select/move
 * for top-down view.
 */

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect } from "react";
import * as THREE from "three";
import type { Entity } from "../ecs/types";
import { buildings, getActivePlayerBot, units } from "../ecs/world";
import {
	cancelPlacement,
	confirmPlacement,
	getActivePlacement,
	updateGhostPosition,
} from "../systems/buildingPlacement";

const raycaster = new THREE.Raycaster();
const INTERACT_RANGE = 4.0;

/** Find the closest entity within interact range of the player. */
function findNearbyEntity(playerX: number, playerZ: number): Entity | null {
	let closest: Entity | null = null;
	let closestDist = INTERACT_RANGE;

	for (const entity of units) {
		if (entity.playerControlled?.isActive) continue; // skip self
		const dx = entity.worldPosition.x - playerX;
		const dz = entity.worldPosition.z - playerZ;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < closestDist) {
			closest = entity;
			closestDist = dist;
		}
	}

	for (const entity of buildings) {
		const dx = entity.worldPosition.x - playerX;
		const dz = entity.worldPosition.z - playerZ;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < closestDist) {
			closest = entity;
			closestDist = dist;
		}
	}

	return closest;
}

export function FPSInput() {
	const { camera, gl } = useThree();

	const handleInteract = useCallback(() => {
		const bot = getActivePlayerBot();
		if (!bot) return;

		const wp = bot.worldPosition;

		// Building placement mode — place at the point we're looking at
		if (getActivePlacement()) {
			// Cast a ray forward from camera to find ground placement point
			raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
			const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
			const hitPoint = new THREE.Vector3();
			const hit = raycaster.ray.intersectPlane(groundPlane, hitPoint);
			if (hit) {
				const dx = hitPoint.x - wp.x;
				const dz = hitPoint.z - wp.z;
				const dist = Math.sqrt(dx * dx + dz * dz);
				if (dist < 15) {
					updateGhostPosition(hitPoint.x, hitPoint.z);
					confirmPlacement();
				}
			}
			return;
		}

		// Find and interact with nearest entity
		const nearby = findNearbyEntity(wp.x, wp.z);
		if (nearby) {
			// Select it for the HUD to display info
			// Deselect everything first
			for (const u of units) u.unit.selected = false;
			for (const b of buildings) b.building.selected = false;

			if (nearby.unit) {
				nearby.unit.selected = true;
			} else if (nearby.building) {
				nearby.building.selected = true;
			}
		}
	}, [camera]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			const key = e.key.toLowerCase();
			if (key === "e") {
				handleInteract();
			}
			if (key === "escape" && getActivePlacement()) {
				cancelPlacement();
			}
		};

		// Desktop left-click with pointer lock = interact (touch uses mobile action buttons)
		const canvas = gl.domElement;
		const onPointerDown = (e: PointerEvent) => {
			if (e.pointerType === "touch") return;
			if (e.button === 0 && document.pointerLockElement === canvas) {
				handleInteract();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		canvas.addEventListener("pointerdown", onPointerDown);

		return () => {
			window.removeEventListener("keydown", onKeyDown);
			canvas.removeEventListener("pointerdown", onPointerDown);
		};
	}, [gl, handleInteract]);

	return null;
}
