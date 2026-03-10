/**
 * CoreLoopSystem — R3F component that runs core loop systems each frame.
 *
 * Calls updateHarvesting, updateCompression, updateFurnaceProcessing, and
 * updateBeltTransport every frame via useFrame. Tracks harvesting and
 * compression state and exposes it for HUD consumption.
 *
 * Also handles initial ore deposit spawning on world init.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import {
	getCompressionProgress,
	isCompressing,
	updateCompression,
} from "./compression";
import { getAllFurnaces } from "./furnace";
import { updateFurnaceProcessing } from "./furnaceProcessing";
import { registerCube } from "./grabber";
import {
	getHarvestingState,
	getPowderStorage,
	updateHarvesting,
} from "./harvesting";

// ---------------------------------------------------------------------------
// Module-level state for HUD consumption (avoids per-frame React setState)
// ---------------------------------------------------------------------------

interface CoreLoopSnapshot {
	/** Whether the player is currently harvesting */
	isHarvesting: boolean;
	/** Total powder accumulated in the current harvest session */
	harvestPowder: number;
	/** Powder storage map (ore type -> amount) */
	powderStorage: ReadonlyMap<string, number>;
	/** Whether compression is currently active */
	isCompressing: boolean;
	/** Compression progress 0..1 */
	compressionProgress: number;
}

let currentSnapshot: CoreLoopSnapshot = {
	isHarvesting: false,
	harvestPowder: 0,
	powderStorage: new Map(),
	isCompressing: false,
	compressionProgress: 0,
};

const listeners = new Set<() => void>();

/** Get the current core loop state snapshot. */
export function getCoreLoopSnapshot(): CoreLoopSnapshot {
	return currentSnapshot;
}

/** Subscribe to core loop state changes. Returns unsubscribe function. */
export function subscribeCoreLoop(callback: () => void): () => void {
	listeners.add(callback);
	return () => {
		listeners.delete(callback);
	};
}

function notifyListeners(): void {
	for (const cb of listeners) {
		cb();
	}
}

// ---------------------------------------------------------------------------
// Reusable temp vector
// ---------------------------------------------------------------------------

const _playerPos = new THREE.Vector3();
const _playerDir = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoreLoopSystem() {
	const prevHashRef = useRef("");

	useFrame(({ camera }, delta) => {
		// Get player position from camera (the player IS the bot, FPS view)
		camera.getWorldPosition(_playerPos);
		camera.getWorldDirection(_playerDir);

		const playerPosition = {
			x: _playerPos.x,
			y: _playerPos.y,
			z: _playerPos.z,
		};

		// --- Harvesting ---
		updateHarvesting(delta, playerPosition);
		const harvestState = getHarvestingState();

		// --- Compression ---
		const compressionResult = updateCompression(delta);

		// If compression produced a cube, register it with the grabber system
		if (compressionResult.completed && compressionResult.cube) {
			const ejectPosition = {
				x: _playerPos.x + _playerDir.x * 1.0,
				y: 0.25, // half cube height above ground
				z: _playerPos.z + _playerDir.z * 1.0,
			};
			registerCube({
				id: compressionResult.cube.id,
				position: ejectPosition,
				traits: ["MaterialCube", "Grabbable"],
				material: compressionResult.cube.material,
			});
		}

		// --- Furnace Processing ---
		const furnaces = getAllFurnaces();
		for (const furnace of furnaces) {
			const result = updateFurnaceProcessing(furnace.id, delta);
			// If smelting completed, register the output cube
			if (result?.completed && result.outputMaterial && result.outputPosition) {
				registerCube({
					id: `furnace_output_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
					position: { ...result.outputPosition },
					traits: ["MaterialCube", "Grabbable"],
					material: result.outputMaterial,
				});
			}
		}

		// --- Update snapshot for HUD ---
		const powderStorage = getPowderStorage();
		const compressionProgress = getCompressionProgress();
		const compressing = isCompressing();

		const newHash = [
			harvestState?.isActive ? "1" : "0",
			harvestState?.powderAccumulated.toFixed(1) ?? "0",
			compressing ? "1" : "0",
			compressionProgress.toFixed(2),
			Array.from(powderStorage.entries())
				.map(([k, v]) => `${k}:${v.toFixed(1)}`)
				.join(","),
		].join("|");

		if (newHash !== prevHashRef.current) {
			prevHashRef.current = newHash;
			currentSnapshot = {
				isHarvesting: harvestState?.isActive ?? false,
				harvestPowder: harvestState?.powderAccumulated ?? 0,
				powderStorage,
				isCompressing: compressing,
				compressionProgress,
			};
			notifyListeners();
		}
	});

	return null;
}
