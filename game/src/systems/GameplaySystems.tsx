/**
 * GameplaySystems — R3F component that wires strategic systems into the frame loop.
 *
 * Runs less-frequent strategic checks that don't need per-frame updates:
 * - Cube stacking: snap-grid registration, topple detection
 * - Pattern matching: check cube arrangements against machine blueprints
 * - Machine assembly: consume matched cubes, spawn machines
 * - Signal network: update relay connections
 * - Power routing: propagate power through wire network
 *
 * These systems operate on slower cadences (every N frames or on events)
 * to avoid unnecessary per-frame overhead.
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { gridKey } from "./gridSnap";
import { matchBlueprint } from "./patternMatcher";
import type { Blueprint } from "./patternMatcher";
import {
	assembleMachine,
} from "./machineAssembly";
import {
	getCubeHP,
	initCubeHP,
	registerCubePosition,
	setOnCubeDestroyed,
} from "./cubeDamage";
import {
	getAllStackedCubes,
	removeAndTopple,
} from "./cubeStacking";
import { unregisterCube } from "./grabber";
import { gridToWorld } from "./gridSnap";
import { detectWallSegments } from "./wallBuilding";

// ---------------------------------------------------------------------------
// Blueprint definitions (passed to pattern matcher, not hardcoded in module)
// ---------------------------------------------------------------------------

const GAME_BLUEPRINTS: Blueprint[] = [
	{
		id: "basic_miner",
		name: "Mining Drill",
		pattern: [[["scrap_iron", "scrap_iron"]]],
		result: "miner",
	},
	{
		id: "basic_smelter",
		name: "Smelter",
		pattern: [
			[
				["iron", "iron"],
				["iron", "iron"],
			],
			[
				["copper", "copper"],
			],
		],
		result: "smelter",
	},
	{
		id: "basic_fabricator",
		name: "Fabricator",
		pattern: [
			[
				["copper", "scrap_iron"],
				["scrap_iron", "copper"],
			],
		],
		result: "fabricator",
	},
	{
		id: "lightning_rod",
		name: "Lightning Rod",
		pattern: [
			[["copper"]],
			[["copper"]],
			[["copper"]],
		],
		result: "lightning_rod",
	},
	{
		id: "signal_relay",
		name: "Signal Relay",
		pattern: [
			[["copper", "copper"]],
			[["silicon"]],
		],
		result: "signal_relay",
	},
	{
		id: "turret",
		name: "Defense Turret",
		pattern: [
			[["scrap_iron"]],
			[["scrap_iron"]],
			[["titanium"]],
		],
		result: "turret",
	},
	{
		id: "repair_bay",
		name: "Repair Bay",
		pattern: [
			[
				["copper", "copper"],
				["copper", "copper"],
			],
		],
		result: "repair_bay",
	},
	{
		id: "conveyor",
		name: "Conveyor Belt",
		pattern: [[["iron", "iron", "iron"]]],
		result: "belt",
	},
];

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Accumulator for pattern check frequency (don't check every frame). */
let patternCheckTimer = 0;
const PATTERN_CHECK_INTERVAL = 0.5; // seconds

/** Event listeners for machine assembly events. */
const assemblyEventListeners = new Set<
	(event: { machineType: string; position: { x: number; y: number; z: number } }) => void
>();

export function onMachineAssembled(
	listener: (event: { machineType: string; position: { x: number; y: number; z: number } }) => void,
): () => void {
	assemblyEventListeners.add(listener);
	return () => assemblyEventListeners.delete(listener);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GameplaySystems() {
	const frameCountRef = useRef(0);

	useEffect(() => {
		// Reset state on mount
		patternCheckTimer = 0;

		// Register cube destruction callback: when cubeDamage destroys a cube,
		// remove it from the stacking system and handle topple
		setOnCubeDestroyed((cubeId: string) => {
			const stacked = getAllStackedCubes();
			for (const [_key, data] of stacked) {
				if (data.entityId === cubeId) {
					const toppled = removeAndTopple(data.gridCoord);
					unregisterCube(cubeId);
					for (const t of toppled) {
						unregisterCube(t.entityId);
					}
					break;
				}
			}
		});
	}, []);

	useFrame((_, delta) => {
		frameCountRef.current++;

		// --- Pattern matching (every PATTERN_CHECK_INTERVAL seconds) ---
		patternCheckTimer += delta;
		if (patternCheckTimer >= PATTERN_CHECK_INTERVAL) {
			patternCheckTimer = 0;

			// Ensure all stacked cubes have HP initialized and positions registered
			// (only init cubes that don't already have HP to avoid resetting damage)
			const stacked = getAllStackedCubes();
			for (const [_key, data] of stacked) {
				if (!getCubeHP(data.entityId)) {
					initCubeHP(data.entityId, data.material);
				}
				const worldPos = gridToWorld(data.gridCoord);
				registerCubePosition(data.entityId, {
					x: worldPos.x,
					y: worldPos.y,
					z: worldPos.z,
				});
			}

			checkPatternMatches();
			// Recalculate wall segments when cube arrangements may have changed
			detectWallSegments();
		}
	});

	return null;
}

// ---------------------------------------------------------------------------
// Pattern matching logic
// ---------------------------------------------------------------------------

/**
 * Build a world grid map from the stack registry for pattern matching.
 * Key: gridKey string, Value: material type string.
 */
function buildWorldGrid(): Map<string, string> {
	const worldGrid = new Map<string, string>();
	const stacked = getAllStackedCubes();

	for (const [key, data] of stacked) {
		worldGrid.set(key, data.material);
	}

	return worldGrid;
}

/**
 * Check all stacked cubes against blueprints. If a match is found,
 * assemble the machine and remove the cubes.
 */
function checkPatternMatches(): void {
	const stacked = getAllStackedCubes();
	if (stacked.size < 2) return; // Need at least 2 cubes for any blueprint

	const worldGrid = buildWorldGrid();

	// Check each stacked cube as a potential anchor point
	for (const [_key, data] of stacked) {
		const anchor = data.gridCoord;
		const result = matchBlueprint(worldGrid, anchor, GAME_BLUEPRINTS);

		if (result) {
			// Found a match! Assemble the machine.
			const machine = assembleMachine(
				result,
				(coord) => worldGrid.get(gridKey(coord)),
				(coord) => {
					// Remove cube from stack registry
					const removed = removeAndTopple(coord);

					// Also unregister from grabber system
					const stackData = stacked.get(gridKey(coord));
					if (stackData) {
						unregisterCube(stackData.entityId);
					}

					// Handle toppled cubes (convert back to free cubes)
					for (const toppled of removed) {
						unregisterCube(toppled.entityId);
					}
				},
			);

			// Notify listeners
			const spawnPos = machine.anchor;
			for (const listener of assemblyEventListeners) {
				listener({
					machineType: machine.type,
					position: {
						x: spawnPos.x * 0.5,
						y: spawnPos.y * 0.5,
						z: spawnPos.z * 0.5,
					},
				});
			}

			// Only assemble one machine per check to avoid overlapping matches
			return;
		}
	}
}
