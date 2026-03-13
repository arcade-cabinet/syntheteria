import { aiSystem } from "../ai";
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
import { hackingSystem } from "../systems/hacking";
import { movementSystem } from "../systems/movement";
import {
	getActiveThought,
	narrativeSystem,
	type Thought,
} from "../systems/narrative";
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
	lightningSystem,
	resetLightningSystem,
} from "../systems/lightning";
import {
	networkOverlaySystem,
	resetNetworkOverlay,
} from "../systems/networkOverlay";
import { signalNetworkSystem } from "../systems/signalNetworkSystem";
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
	updateDisplayOffsets,
} from "../world/structuralSpace";
import {
	Identity,
} from "./traits";
import { units } from "./world";
import {
	getStructuralFragments,
	type StructuralFragment as MapFragment,
} from "../world/structuralSpace";

export interface GameSnapshot {
	tick: number;
	gameSpeed: number;
	paused: boolean;
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

	const delta = FIXED_SIM_STEP_SECONDS * gameSpeed;

	enemySystem();
	aiSystem(delta, tick);
	movementSystem(delta, gameSpeed);
	explorationSystem();
	lastMergeEvents = fragmentMergeSystem();
	powerSystem(tick);
	weatherSystem(tick, gameSpeed, getPowerSnapshot().stormIntensity);
	lightningSystem(tick, getPowerSnapshot().stormIntensity);
	signalNetworkSystem();
	networkOverlaySystem(tick);
	resourceSystem();
	repairSystem();
	fabricationSystem();
	combatSystem();
	hackingSystem();
	narrativeSystem();
	poiSystem();
	persistenceSystem(tick);
	updateDisplayOffsets();

	snapshot = null;
	notify();
}

export function resetGameState() {
	tick = 0;
	gameSpeed = 1.0;
	paused = false;
	lastMergeEvents = [];
	snapshot = null;
	resetWeatherSystem();
	resetLightningSystem();
	resetNetworkOverlay();
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
