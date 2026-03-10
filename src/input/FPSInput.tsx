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
import { isCompressing, startCompression } from "../systems/compression";
import {
	getAllFurnaces,
	insertCubeIntoFurnace,
} from "../systems/furnace";
import { startSmelting } from "../systems/furnaceProcessing";
import {
	dropCube,
	getCube,
	getHeldCube,
	grabCube,
	unregisterCube,
} from "../systems/grabber";
import { getPowderStorage, startHarvesting } from "../systems/harvesting";
import { getHoveredEntity } from "./ObjectSelectionSystem";
import { setSelected } from "./selectionState";

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

	// --- Quick-grab: G key toggles grab/drop ---
	const handleGrab = useCallback(() => {
		const bot = getActivePlayerBot();
		if (!bot) return;
		const wp = bot.worldPosition;

		if (getHeldCube() !== null) {
			const heldId = getHeldCube()!;
			const heldCube = getCube(heldId);

			// Check if we're looking at or near a furnace — auto-feed the cube
			const furnaces = getAllFurnaces();
			const FURNACE_FEED_RANGE = 3.0;
			let fedToFurnace = false;

			for (const furnace of furnaces) {
				const dx = furnace.position.x - wp.x;
				const dz = furnace.position.z - wp.z;
				const dist = Math.sqrt(dx * dx + dz * dz);
				if (dist < FURNACE_FEED_RANGE && heldCube) {
					const inserted = insertCubeIntoFurnace(
						furnace.id,
						heldId,
						heldCube.material,
						() => {
							unregisterCube(heldId);
						},
					);
					if (inserted) {
						// Release the held cube (clear held state without physics drop)
						dropCube({ x: 0, y: -1000, z: 0 }); // drop off-screen, cube is already unregistered
						// Auto-start smelting if furnace is powered and not already processing
						if (furnace.isPowered && !furnace.isProcessing) {
							startSmelting(furnace.id);
						}
						fedToFurnace = true;
						break;
					}
				}
			}

			if (!fedToFurnace) {
				// Normal drop in front of player
				const forward = new THREE.Vector3();
				camera.getWorldDirection(forward);
				dropCube({
					x: wp.x + forward.x * 1.5,
					y: 0.25,
					z: wp.z + forward.z * 1.5,
				});
			}
			return;
		}

		// Try to grab the hovered entity
		const hovered = getHoveredEntity();
		if (hovered.entityId) {
			grabCube(hovered.entityId, wp);
		}
	}, [camera]);

	// --- Compress: C key starts compression of highest-quantity powder ---
	const handleCompress = useCallback(() => {
		if (isCompressing()) return;
		const powderStorage = getPowderStorage();
		if (powderStorage.size === 0) return;

		// Find material with most powder
		let bestMaterial = "";
		let bestAmount = 0;
		for (const [material, amount] of powderStorage) {
			if (amount > bestAmount) {
				bestMaterial = material;
				bestAmount = amount;
			}
		}
		if (bestMaterial) {
			startCompression(bestMaterial, powderStorage);
		}
	}, []);

	// --- Harvest: F key starts harvesting the looked-at deposit ---
	const handleHarvest = useCallback(() => {
		const bot = getActivePlayerBot();
		if (!bot) return;
		const wp = bot.worldPosition;
		const hovered = getHoveredEntity();
		if (hovered.entityId) {
			// Tell InteractionSystem by selecting + dispatching
			setSelected(hovered.entityId);
			startHarvesting(hovered.entityId, wp, () => {
				// Return deposit position (approximate from hover)
				if (hovered.hitPoint) {
					return {
						x: hovered.hitPoint.x,
						y: hovered.hitPoint.y,
						z: hovered.hitPoint.z,
					};
				}
				return wp;
			});
		}
	}, []);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			const key = e.key.toLowerCase();
			if (key === "e") {
				handleInteract();
			}
			if (key === "g") {
				handleGrab();
			}
			if (key === "c") {
				handleCompress();
			}
			if (key === "f") {
				handleHarvest();
			}
			if (key === "escape" && getActivePlacement()) {
				cancelPlacement();
			}
		};

		// Mouse left-click with pointer lock = interact (touch is ignored here; mobile controls handle it)
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
	}, [gl, handleInteract, handleGrab, handleCompress, handleHarvest]);

	return null;
}
