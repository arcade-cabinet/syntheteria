/**
 * @module gameState
 *
 * Core game loop and snapshot orchestrator. Runs a fixed 60fps simulation tick
 * that sequences all gameplay systems and builds a unified GameSnapshot for UI consumption.
 *
 * @exports GameSnapshot - Composite state interface consumed by all UI panels
 * @exports subscribe - Register a listener for snapshot changes
 * @exports getSnapshot - Get the current lazily-built GameSnapshot
 * @exports simulationTick - Execute one frame of the simulation pipeline
 * @exports setGameSpeed - Adjust simulation speed multiplier
 * @exports togglePause / setPaused / isPaused - Pause control
 * @exports registerAudioTick - Callback registration for Tone.js audio tick (avoids ESM import)
 * @exports resetGameState - Full reset for new game
 *
 * @dependencies ai, combat, enemies, exploration, fabrication, fragmentMerge, hacking,
 *   harvestSystem, lightning, movement, narrative, networkOverlay, power, repair,
 *   resources, signalNetworkSystem, weather, persistenceSystem, territorySystem,
 *   poiSystem, runtimeState, session, structuralSpace, traits, world
 * @consumers GameUI, GameHUD, TopBar, ResourceStrip, Notifications, ThoughtOverlay,
 *   Minimap, PlacementHUD, ResourceBreakdownPanel, SelectedInfo, BuildToolbar,
 *   SlideOutPanel, HarvestProgressOverlay, CityRenderer, UnitRosterPanel,
 *   radialProviders, playtestBridge, initialization
 */
import { aiSystem } from "../ai";
import { botSpeechSystem } from "../systems/botSpeech";
import {
	type CombatEvent,
	combatSystem,
	getLastCombatEvents,
} from "../systems/combat";
import { enemySystem } from "../systems/enemies";
import { explorationSystem } from "../systems/exploration";
import {
	type FabricationJob,
	fabricationSystem,
	getActiveJobs,
} from "../systems/fabrication";
import { fragmentMergeSystem, type MergeEvent } from "../systems/fragmentMerge";
import { governorSystem } from "../systems/governorSystem";
import { hackingSystem } from "../systems/hacking";
import { hackingCaptureSystem } from "../systems/hackingSystem";
import { harvestSystem, resetHarvestSystem } from "../systems/harvestSystem";
import { lightningSystem, resetLightningSystem } from "../systems/lightning";
import { motorPoolUpgradeSystem } from "../systems/motorPool";
import { movementSystem } from "../systems/movement";
import {
	getActiveThought,
	narrativeSystem,
	type Thought,
} from "../systems/narrative";
import {
	networkOverlaySystem,
	resetNetworkOverlay,
} from "../systems/networkOverlay";
import {
	getPowerSnapshot,
	type PowerSnapshot,
	powerSystem,
} from "../systems/power";
import { repairSystem } from "../systems/repair";
import {
	getResources,
	type ResourcePool,
	resourceSystem,
} from "../systems/resources";
import {
	resetRivalEncounterState,
	rivalEncounterSystem,
} from "../systems/rivalEncounters";
import { signalNetworkSystem } from "../systems/signalNetworkSystem";
import {
	resetTerritorySystem,
	territorySystem,
} from "../systems/territorySystem";
import {
	getWeatherSnapshot,
	resetWeatherSystem,
	type WeatherSnapshot,
	weatherSystem,
} from "../systems/weather";
import { persistenceSystem } from "../world/persistenceSystem";
import { poiSystem } from "../world/poiSystem";
import {
	getRuntimeState,
	setRuntimeTick,
	subscribeRuntimeState,
} from "../world/runtimeState";
import { getActiveWorldSession as getLoadedWorldSession } from "../world/session";
import type { NearbyPoiContext } from "../world/snapshots";
import {
	getStructuralFragments,
	type StructuralFragment as MapFragment,
	updateDisplayOffsets,
} from "../world/structuralSpace";
import { Identity } from "./traits";
import { units } from "./world";

export interface GameSnapshot {
	tick: number;
	gameSpeed: number;
	paused: boolean;
	worldReady: boolean;
	fragments: MapFragment[];
	unitCount: number;
	enemyCount: number;
	mergeEvents: MergeEvent[];
	combatEvents: CombatEvent[];
	power: PowerSnapshot;
	resources: ResourcePool;
	fabricationJobs: FabricationJob[];
	activeThought: Thought | null;
	activeScene: "world" | "city";
	activeCityInstanceId: number | null;
	cityKitLabOpen: boolean;
	nearbyPoiName: string | null;
	nearbyPoi: NearbyPoiContext | null;
	districtEvents: ReturnType<typeof getRuntimeState>["districtEvents"];
	weather: WeatherSnapshot;
}

let tick = 0;
let gameSpeed = 1.0;
let paused = false;
let worldReady = false;
let lastMergeEvents: MergeEvent[] = [];
const listeners = new Set<() => void>();
let snapshot: GameSnapshot | null = null;
const FIXED_SIM_STEP_SECONDS = 1 / 60;

function buildSnapshot(): GameSnapshot {
	let playerCount = 0;
	let enemyCount = 0;

	for (const u of units) {
		const id = u.get(Identity);
		if (id?.faction === "player") playerCount++;
		else enemyCount++;
	}

	return {
		tick,
		gameSpeed,
		paused,
		worldReady,
		fragments: getStructuralFragments(),
		unitCount: playerCount,
		enemyCount,
		mergeEvents: lastMergeEvents,
		combatEvents: getLastCombatEvents(),
		power: getPowerSnapshot(),
		resources: getResources(),
		fabricationJobs: getActiveJobs(),
		activeThought: getActiveThought(),
		activeScene: getRuntimeState().activeScene,
		activeCityInstanceId: getRuntimeState().activeCityInstanceId,
		cityKitLabOpen: getRuntimeState().cityKitLabOpen,
		nearbyPoiName: getRuntimeState().nearbyPoi?.name ?? null,
		nearbyPoi: getRuntimeState().nearbyPoi,
		districtEvents: getRuntimeState().districtEvents,
		weather: getWeatherSnapshot(),
	};
}

export function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getSnapshot(): GameSnapshot {
	if (!snapshot) {
		snapshot = buildSnapshot();
	}
	return snapshot;
}

export function setGameSpeed(speed: number) {
	gameSpeed = speed;
	snapshot = null;
	notify();
}

export function togglePause() {
	paused = !paused;
	snapshot = null;
	notify();
}

export function setPaused(value: boolean) {
	if (paused === value) return;
	paused = value;
	snapshot = null;
	notify();
}

export function isPaused() {
	return paused;
}

export function isWorldReady(): boolean {
	return worldReady;
}

export function setWorldReady(ready: boolean) {
	worldReady = ready;
	snapshot = null;
	notify();
}

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

subscribeRuntimeState(() => {
	snapshot = null;
	notify();
});

export function simulationTick() {
	if (paused) {
		return;
	}
	if (!getLoadedWorldSession()) {
		return;
	}

	tick++;
	setRuntimeTick(tick);

	if (!worldReady) {
		snapshot = null;
		notify();
		return;
	}

	const delta = FIXED_SIM_STEP_SECONDS * gameSpeed;

	enemySystem();
	aiSystem(delta, tick);
	governorSystem(tick);
	movementSystem(delta, gameSpeed);
	explorationSystem();
	lastMergeEvents = fragmentMergeSystem();
	powerSystem(tick);
	weatherSystem(tick, gameSpeed, getPowerSnapshot().stormIntensity);
	lightningSystem(tick, getPowerSnapshot().stormIntensity);
	signalNetworkSystem();
	networkOverlaySystem(tick);
	resourceSystem();
	harvestSystem(tick);
	repairSystem();
	fabricationSystem();
	combatSystem();
	hackingSystem();
	hackingCaptureSystem();
	motorPoolUpgradeSystem();
	rivalEncounterSystem(tick);
	territorySystem();
	narrativeSystem();
	botSpeechSystem(tick, []);
	poiSystem();
	persistenceSystem(tick);
	if (_audioTickFn) _audioTickFn();
	updateDisplayOffsets();

	snapshot = null;
	notify();
}

// ─── Audio tick registration ─────────────────────────────────────────────────
// Audio uses Tone.js (ESM-only), so we use a callback registration pattern
// instead of a direct import to avoid breaking Jest's CJS transform chain.
let _audioTickFn: (() => void) | null = null;
export function registerAudioTick(fn: () => void) {
	_audioTickFn = fn;
}

export function resetGameState() {
	tick = 0;
	gameSpeed = 1.0;
	paused = false;
	worldReady = false;
	lastMergeEvents = [];
	snapshot = null;
	resetWeatherSystem();
	resetLightningSystem();
	resetNetworkOverlay();
	resetHarvestSystem();
	resetRivalEncounterState();
	resetTerritorySystem();
}

const simulationInterval = setInterval(simulationTick, 1000 / 60);

if (
	typeof simulationInterval === "object" &&
	simulationInterval !== null &&
	"unref" in simulationInterval &&
	typeof simulationInterval.unref === "function"
) {
	simulationInterval.unref();
}
