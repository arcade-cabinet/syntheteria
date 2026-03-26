/**
 * Browser tests for GameLayout component.
 *
 * Renders the real GameLayout in headless Chromium and verifies:
 * - GameLayout renders sidebar and game area divs
 * - Children are slotted into game area
 */

import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
// GameLayout imports TopBar -> gameState, BasePanel -> gameState, Sidebar -> ...

vi.mock("../../src/audio", () => ({
	getMasterVolume: vi.fn(() => 0.8),
	setMasterVolume: vi.fn(),
	initAudio: vi.fn(),
}));

vi.mock("../../src/config/humanEncounterDefs", () => ({
	getTemperatureTier: vi.fn(() => ({
		displayName: "dormant",
		color: "#00ffff",
		effect: "No effect",
	})),
}));

vi.mock("../../src/db/persistence", () => ({
	isPersistenceAvailable: vi.fn(() => false),
	listSaves: vi.fn(async () => []),
	loadGame: vi.fn(async () => false),
	saveGame: vi.fn(async () => false),
}));

// getSnapshot MUST return a cached object — useSyncExternalStore compares
// by reference and will infinite-loop if a new object is created each call.
const CACHED_SNAPSHOT = Object.freeze({
	tick: 0,
	gameSpeed: 1,
	paused: false,
	fragments: [],
	unitCount: 0,
	enemyCount: 0,
	mergeEvents: [],
	combatEvents: [],
	power: Object.freeze({
		totalGeneration: 0,
		totalDemand: 0,
		stormIntensity: 0,
	}),
	resources: Object.freeze({
		scrapMetal: 0,
		circuitry: 0,
		powerCells: 0,
		durasteel: 0,
	}),
	fabricationJobs: [],
	gamePhase: "awakening",
	gamePhaseDisplayName: "Awakening",
	gamePhaseElapsedSec: 0,
	phaseTransitionId: null,
	humanTemperature: 10,
	humanTemperatureTier: "dormant",
	compute: Object.freeze({ totalCompute: 0, usedCompute: 0, nodeCount: 0 }),
	hackEvents: [],
});

vi.mock("../../src/ecs/gameState", () => ({
	getSnapshot: vi.fn(() => CACHED_SNAPSHOT),
	subscribe: vi.fn((_cb: () => void) => () => {}),
	getElapsedTicks: vi.fn(() => 0),
	getGameConfig: vi.fn(() => ({ seed: "test", difficulty: "normal" })),
	isPaused: vi.fn(() => false),
	setGameSpeed: vi.fn(),
	togglePause: vi.fn(),
}));

vi.mock("../../src/ecs/world", () => ({
	world: { query: vi.fn(() => []) },
}));

vi.mock("../../src/ecs/cityLayout", () => ({
	getCityBuildings: vi.fn(() => []),
}));

vi.mock("../../src/ecs/terrain", () => ({
	getAllFragments: vi.fn(() => []),
	worldToFogIndex: vi.fn(() => -1),
}));

vi.mock("../../src/systems/resources", () => ({
	getScavengePoints: vi.fn(() => []),
	getResources: vi.fn(() => ({
		scrapMetal: 0,
		circuitry: 0,
		powerCells: 0,
		durasteel: 0,
	})),
}));

vi.mock("../../src/board/coords", () => ({
	worldToTileX: vi.fn((x: number) => Math.floor(x / 2)),
	worldToTileZ: vi.fn((z: number) => Math.floor(z / 2)),
}));

vi.mock("../../src/systems/baseManagement", () => ({
	foundBase: vi.fn(() => ({
		get: () => ({ value: "mock_base" }),
	})),
	validateBaseLocation: vi.fn(() => null),
	getProductionQueue: vi.fn(() => []),
	getInfrastructure: vi.fn(() => []),
	getBaseStorage: vi.fn(() => ({})),
}));

import { GameLayout } from "../../src/ui/layout/GameLayout";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function setup() {
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
}

function cleanup() {
	if (root) {
		root.unmount();
		root = null;
	}
	if (container) {
		container.remove();
		container = null;
	}
}

afterEach(cleanup);

async function render(element: React.JSX.Element) {
	setup();
	root!.render(element);
	await new Promise((r) => setTimeout(r, 50));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("GameLayout renders sidebar and game area", async () => {
	await render(
		<GameLayout>
			<div data-testid="game-canvas">Canvas Placeholder</div>
		</GameLayout>,
	);

	// The outer div should have two children: sidebar area and game area
	const outerDiv = container!.firstElementChild;
	expect(outerDiv).toBeDefined();
	expect(outerDiv!.children.length).toBe(2);
});

test("GameLayout slots children into game area", async () => {
	await render(
		<GameLayout>
			<div data-testid="child-content">CHILD_MARKER</div>
		</GameLayout>,
	);

	const text = container!.textContent ?? "";
	expect(text).toContain("CHILD_MARKER");
});

test("GameLayout renders TopBar within game area", async () => {
	await render(
		<GameLayout>
			<div>game</div>
		</GameLayout>,
	);

	// TopBar renders speed buttons
	const buttons = container!.querySelectorAll("button");
	const labels = Array.from(buttons).map((b) => b.textContent);
	expect(labels).toContain("PAUSE");
});

test("GameLayout renders Sidebar section", async () => {
	await render(
		<GameLayout>
			<div>game</div>
		</GameLayout>,
	);

	// Sidebar contains SelectionInfo which shows "No Selection"
	const text = container!.textContent ?? "";
	expect(text).toContain("No Selection");
});
