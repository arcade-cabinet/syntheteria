/**
 * Audio event bridge — subscribes to gameplay events and triggers SFX.
 *
 * This module connects the synthesized audio system (GameSounds / SpatialAudio)
 * to actual gameplay events without modifying any gameplay files. It uses the
 * existing callback/subscriber patterns:
 *
 *   - onResourceGain()     from resources.ts  → grinding sound
 *   - onSelectionChange()  from selectionState.ts → cube grab sound
 *   - getSnapshot()        from gameState.ts  → combat, fabrication, power events
 *
 * Call initAudioBridge() once after audio is initialized. Call
 * disposeAudioBridge() on teardown.
 */

import { getSnapshot, subscribe } from "../ecs/gameState";
import { lightningRods, units } from "../ecs/world";
import {
	playAlert,
	playCompression,
	playCubeGrab,
	playCubePlace,
	playDamage,
	playGrinding,
	playLightningStrike,
	playMetalImpact,
	playUIBeep,
} from "./GameSounds";
import {
	playSpatialCrackle,
	playSpatialMetalImpact,
} from "./SpatialAudio";
import { onResourceGain } from "../systems/resources";
import { onSelectionChange } from "../input/selectionState";
import type { CombatEvent } from "../systems/combat";

// ---------------------------------------------------------------------------
// Internal tracking state
// ---------------------------------------------------------------------------

/** Unsubscribe functions collected during init, called on dispose. */
const unsubscribers: (() => void)[] = [];

/** Track previous snapshot values to detect transitions. */
let prevCombatEventCount = 0;
let prevFabJobCount = 0;
let prevFabJobIds: string[] = [];
let prevEnemyCount = 0;

/**
 * Throttle map — prevents the same sound from playing too frequently.
 * Maps sound name to the timestamp of last play.
 */
const lastPlayedAt = new Map<string, number>();

function throttle(key: string, minIntervalMs: number): boolean {
	const now = Date.now();
	const last = lastPlayedAt.get(key) ?? 0;
	if (now - last < minIntervalMs) return false;
	lastPlayedAt.set(key, now);
	return true;
}

// ---------------------------------------------------------------------------
// Snapshot-based polling (runs on every game state change)
// ---------------------------------------------------------------------------

/**
 * Called on every game state snapshot change. Compares previous and current
 * values to detect events and fire appropriate sounds.
 */
function onSnapshotChange(): void {
	const snap = getSnapshot();

	// ── Combat events ─────────────────────────────────────────────────────
	// New combat events since last check
	const currentCombatCount = snap.combatEvents.length;
	if (currentCombatCount > prevCombatEventCount) {
		const newEvents = snap.combatEvents.slice(prevCombatEventCount);
		handleCombatEvents(newEvents);
	}
	prevCombatEventCount = currentCombatCount;

	// ── Fabrication tracking ──────────────────────────────────────────────
	const currentJobIds = snap.fabricationJobs.map((j) => j.fabricatorId);
	const currentJobCount = snap.fabricationJobs.length;

	// Fabrication started — new job appeared
	if (currentJobCount > prevFabJobCount) {
		for (const id of currentJobIds) {
			if (!prevFabJobIds.includes(id) && throttle("compression", 500)) {
				// Find the fabricator position for spatial audio
				playCompression();
				break;
			}
		}
	}

	// Fabrication completed — a job disappeared
	if (currentJobCount < prevFabJobCount) {
		if (throttle("ui_beep_fab", 300)) {
			playUIBeep();
		}
	}

	prevFabJobCount = currentJobCount;
	prevFabJobIds = currentJobIds;

	// ── Enemy detection ───────────────────────────────────────────────────
	// New enemies appeared (entered perception range / spawned nearby)
	const currentEnemyCount = snap.enemyCount;
	if (currentEnemyCount > prevEnemyCount && prevEnemyCount >= 0) {
		// Only alert if we actually had awareness before (not initial load)
		if (prevEnemyCount > 0 || snap.tick > 5) {
			if (throttle("alert", 3000)) {
				playAlert();
			}
		}
	}
	prevEnemyCount = currentEnemyCount;

	// ── Lightning / storm surges ──────────────────────────────────────────
	// Trigger lightning strike sound on high storm surges
	if (snap.power.stormIntensity > 1.2 && snap.power.rodCount > 0) {
		if (throttle("lightning", 8000)) {
			playLightningStrike();

			// Also play spatial crackle at a random rod position
			const rods = Array.from(lightningRods);
			if (rods.length > 0) {
				const rod = rods[Math.floor(Math.random() * rods.length)];
				if (rod.worldPosition) {
					playSpatialCrackle({
						x: rod.worldPosition.x,
						y: rod.worldPosition.y ?? 5,
						z: rod.worldPosition.z,
					});
				}
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Combat event handling
// ---------------------------------------------------------------------------

function handleCombatEvents(events: CombatEvent[]): void {
	for (const event of events) {
		// Find target unit position for spatial audio
		const targetPos = findUnitPosition(event.targetId);

		if (event.targetDestroyed) {
			// Destroyed — play damage sound
			if (throttle(`damage_${event.targetId}`, 200)) {
				if (targetPos) {
					playSpatialMetalImpact(targetPos);
				} else {
					playDamage();
				}
			}
		} else {
			// Component damaged — play metal impact spatially
			if (throttle(`impact_${event.targetId}`, 150)) {
				if (targetPos) {
					playSpatialMetalImpact(targetPos);
				} else {
					playMetalImpact();
				}
			}

			// If a player unit was damaged, also play the damage feedback
			const targetUnit = findUnit(event.targetId);
			if (targetUnit?.faction === "player") {
				if (throttle("player_damage", 300)) {
					playDamage();
				}
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Unit lookup helpers
// ---------------------------------------------------------------------------

function findUnitPosition(
	unitId: string,
): { x: number; y: number; z: number } | null {
	for (const unit of units) {
		if (unit.id === unitId && unit.worldPosition) {
			return {
				x: unit.worldPosition.x,
				y: unit.worldPosition.y ?? 1,
				z: unit.worldPosition.z,
			};
		}
	}
	return null;
}

function findUnit(unitId: string) {
	for (const unit of units) {
		if (unit.id === unitId) return unit;
	}
	return null;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Initialize all audio event subscriptions. Call once after audio engine
 * is initialized (typically inside AudioSystem.tsx's useEffect).
 */
export function initAudioBridge(): void {
	// Reset tracking state
	const snap = getSnapshot();
	prevCombatEventCount = snap.combatEvents.length;
	prevFabJobCount = snap.fabricationJobs.length;
	prevFabJobIds = snap.fabricationJobs.map((j) => j.fabricatorId);
	prevEnemyCount = snap.enemyCount;
	lastPlayedAt.clear();

	// ── Resource scavenging → grinding sound ──────────────────────────────
	const unsubResource = onResourceGain((_type, _amount) => {
		if (throttle("grinding", 800)) {
			playGrinding();
		}
	});
	unsubscribers.push(unsubResource);

	// ── Selection change → cube grab / UI beep ───────────────────────────
	const unsubSelection = onSelectionChange((event) => {
		if (event.newId !== null) {
			// Something was selected — play grab/select sound
			if (throttle("cube_grab", 200)) {
				playCubeGrab();
			}
		}
	});
	unsubscribers.push(unsubSelection);

	// ── Game state snapshot polling ───────────────────────────────────────
	// Subscribe to the game state store — fires on every simulation tick
	const unsubGameState = subscribe(onSnapshotChange);
	unsubscribers.push(unsubGameState);
}

/**
 * Tear down all audio event subscriptions. Safe to call multiple times.
 */
export function disposeAudioBridge(): void {
	for (const unsub of unsubscribers) {
		unsub();
	}
	unsubscribers.length = 0;
	lastPlayedAt.clear();
}

// ---------------------------------------------------------------------------
// Direct call helpers for gameplay code that wants to trigger sounds
// without going through the event/snapshot system. These are optional
// convenience re-exports — the bridge handles most events automatically.
// ---------------------------------------------------------------------------

/**
 * Call when a building is successfully placed. Triggers the cube-place
 * thunk sound. Intended for use from buildingPlacement.ts callbacks.
 */
export function onBuildingPlaced(): void {
	if (throttle("cube_place", 300)) {
		playCubePlace();
	}
}

/**
 * Call for generic UI interactions (button clicks, menu opens, etc.).
 */
export function onUIInteraction(): void {
	if (throttle("ui_beep", 100)) {
		playUIBeep();
	}
}
