/**
 * Audio Hooks — Wires audio triggers into game system events.
 *
 * This module polls game system state each tick and fires
 * appropriate SFX, music transitions, and ambient updates.
 *
 * Designed to be called from the game loop's audio phase.
 */

import type { CombatEvent } from "../systems/combat";
import { getLastCombatEvents } from "../systems/combat";
import {
	type BuildingConstructionState,
	getAllConstructionStates,
} from "../systems/constructionVisualization";
import {
	getLastAttackEvents,
	getLastSpawnEvents,
} from "../systems/cultistIncursion";
import { getHarvestYieldEvents } from "../systems/harvestEvents";
import { getActiveHarvests } from "../systems/harvestSystem";
import { getTurnState, type TurnPhase } from "../systems/turnSystem";
import { getWeatherSnapshot } from "../systems/weather";
import { type MusicState, setMusicState } from "./adaptiveMusic";
import { updateStormIntensity } from "./ambientSoundscape";
import { isAudioInitialized } from "./audioEngine";
import {
	playAIPhaseDrone,
	playAttackClang,
	playBuildingComplete,
	playComponentBreak,
	playConstructionHammer,
	playCultistAttack,
	playCultistSpawn,
	playHarvestGrind,
	playHitImpact,
	playLightningCall,
	playMaterialCollected,
	playNewTurnFanfare,
	playStageComplete,
	playTurnStartChime,
	playUnitDestroyed,
} from "./sfxLibrary";

// ─── Tracking State (detect changes between ticks) ───────────────────────────

let lastCombatEventCount = 0;
let lastHarvestYieldCount = 0;
let lastTurnNumber = 0;
let lastTurnPhase: TurnPhase = "player";
let lastCultistSpawnCount = 0;
let lastCultistAttackCount = 0;
let harvestGrindCooldown = 0;
let constructionHammerCooldown = 0;

// Track construction stages for stage-change detection
const lastConstructionStages = new Map<string, string>();

// ─── Combat Audio ────────────────────────────────────────────────────────────

function processCombatAudio() {
	const events = getLastCombatEvents();
	if (events.length === 0) {
		lastCombatEventCount = 0;
		return;
	}

	// Only process new events (compare count — events are reset each tick)
	if (events.length === lastCombatEventCount) return;

	const newEvents = events.slice(lastCombatEventCount);
	lastCombatEventCount = events.length;

	for (const event of newEvents) {
		playAttackClang();

		if (event.componentDamaged) {
			playHitImpact();
		}

		if (event.targetDestroyed) {
			playUnitDestroyed();
		} else if (event.componentDamaged) {
			playComponentBreak();
		}
	}
}

// ─── Harvest Audio ───────────────────────────────────────────────────────────

function processHarvestAudio() {
	// Active harvests → periodic grinding sound
	const activeHarvests = getActiveHarvests();
	if (activeHarvests.length > 0 && harvestGrindCooldown <= 0) {
		playHarvestGrind();
		// Cooldown: don't spam grind sounds (play every ~60 ticks = 1 second)
		harvestGrindCooldown = 60;
	}
	if (harvestGrindCooldown > 0) harvestGrindCooldown--;

	// Completed harvests → material collected chime
	const yieldEvents = getHarvestYieldEvents();
	if (yieldEvents.length > lastHarvestYieldCount) {
		playMaterialCollected();
	}
	lastHarvestYieldCount = yieldEvents.length;
}

// ─── Construction Audio ──────────────────────────────────────────────────────

function processConstructionAudio() {
	const states = getAllConstructionStates();

	if (states.length > 0 && constructionHammerCooldown <= 0) {
		playConstructionHammer();
		constructionHammerCooldown = 90; // every ~1.5 seconds
	}
	if (constructionHammerCooldown > 0) constructionHammerCooldown--;

	// Check for stage changes
	for (const state of states) {
		const lastStage = lastConstructionStages.get(state.entityId);
		if (lastStage && lastStage !== state.currentStage) {
			if (state.currentStage === "operational") {
				playBuildingComplete();
			} else {
				playStageComplete();
			}
		}
		lastConstructionStages.set(state.entityId, state.currentStage);
	}

	// Clean up tracked buildings that are no longer under construction
	const activeIds = new Set(states.map((s) => s.entityId));
	for (const id of lastConstructionStages.keys()) {
		if (!activeIds.has(id)) {
			lastConstructionStages.delete(id);
		}
	}
}

// ─── Turn Audio ──────────────────────────────────────────────────────────────

function processTurnAudio() {
	const turnState = getTurnState();

	// New turn started
	if (turnState.turnNumber !== lastTurnNumber) {
		if (lastTurnNumber > 0) {
			playNewTurnFanfare();
		}
		playTurnStartChime();
		lastTurnNumber = turnState.turnNumber;
	}

	// Phase changed to AI
	if (turnState.phase !== lastTurnPhase) {
		if (turnState.phase === "ai_faction") {
			playAIPhaseDrone();
		}
		lastTurnPhase = turnState.phase;
	}
}

// ─── Cultist Audio ───────────────────────────────────────────────────────────

function processCultistAudio() {
	const spawnEvents = getLastSpawnEvents();
	if (spawnEvents.length > lastCultistSpawnCount) {
		const newSpawns = spawnEvents.length - lastCultistSpawnCount;
		// Play spawn screech for each new cultist (max 2 to avoid spam)
		for (let i = 0; i < Math.min(newSpawns, 2); i++) {
			playCultistSpawn();
		}
	}
	lastCultistSpawnCount = spawnEvents.length;

	const attackEvents = getLastAttackEvents();
	if (attackEvents.length > lastCultistAttackCount) {
		playCultistAttack();
	}
	lastCultistAttackCount = attackEvents.length;
}

// ─── Adaptive Music State ────────────────────────────────────────────────────

function updateMusicState() {
	const combatEvents = getLastCombatEvents();
	const cultistSpawns = getLastSpawnEvents();
	const cultistAttacks = getLastAttackEvents();
	const turnState = getTurnState();

	// Priority: combat > cultist > expansion > exploration
	let targetState: MusicState = "exploration";

	if (combatEvents.length > 0 || cultistAttacks.length > 0) {
		targetState = "combat";
	} else if (cultistSpawns.length > 0) {
		targetState = "cultist";
	} else if (
		turnState.turnNumber > 1 &&
		turnState.phase === "player" &&
		turnState.playerHasActions
	) {
		// During active play with no threats — expansion feel
		targetState = "expansion";
	}

	setMusicState(targetState);
}

// ─── Ambient Updates ─────────────────────────────────────────────────────────

function updateAmbient() {
	const weather = getWeatherSnapshot();
	// Storm intensity drives wind and thunder
	updateStormIntensity(1 - weather.visibilityMultiplier);
}

// ─── Main Tick ───────────────────────────────────────────────────────────────

/**
 * Audio system tick — call once per simulation frame.
 * Polls game systems for state changes and fires appropriate audio.
 */
export function audioSystemTick() {
	if (!isAudioInitialized()) return;

	processCombatAudio();
	processHarvestAudio();
	processConstructionAudio();
	processTurnAudio();
	processCultistAudio();
	updateMusicState();
	updateAmbient();
}

/**
 * Reset audio hooks tracking state — call on new game.
 */
export function resetAudioHooks() {
	lastCombatEventCount = 0;
	lastHarvestYieldCount = 0;
	lastTurnNumber = 0;
	lastTurnPhase = "player";
	lastCultistSpawnCount = 0;
	lastCultistAttackCount = 0;
	harvestGrindCooldown = 0;
	constructionHammerCooldown = 0;
	lastConstructionStages.clear();
}
