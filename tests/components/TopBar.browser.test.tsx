/**
 * Browser tests for TopBar component.
 *
 * Renders the real TopBar in headless Chromium and verifies:
 * - Resource badges render with correct text content
 * - Speed buttons render and are clickable
 * - Pause button renders
 * - Save/Load buttons render
 */

import { afterEach, expect, test, vi } from "vitest";
import { type Root, createRoot } from "react-dom/client";

// ─── Mocks ────────────────────────────────────────────────────────────────────

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
	tick: 42,
	gameSpeed: 1,
	paused: false,
	fragments: [],
	unitCount: 3,
	enemyCount: 1,
	mergeEvents: [],
	combatEvents: [],
	power: Object.freeze({ totalGeneration: 10, totalDemand: 5, stormIntensity: 0.5 }),
	resources: Object.freeze({ scrapMetal: 15, circuitry: 8, powerCells: 3, durasteel: 0 }),
	fabricationJobs: [],
	gamePhase: "awakening",
	gamePhaseDisplayName: "Awakening",
	gamePhaseElapsedSec: 100,
	phaseTransitionId: null,
	humanTemperature: 10,
	humanTemperatureTier: "dormant",
	compute: Object.freeze({ totalCompute: 0, usedCompute: 0, nodeCount: 0 }),
	hackEvents: [],
});

vi.mock("../../src/ecs/gameState", () => ({
	getSnapshot: vi.fn(() => CACHED_SNAPSHOT),
	subscribe: vi.fn((_cb: () => void) => () => {}),
	getElapsedTicks: vi.fn(() => 42),
	getGameConfig: vi.fn(() => ({ seed: "test", difficulty: "normal" })),
	isPaused: vi.fn(() => false),
	setGameSpeed: vi.fn(),
	togglePause: vi.fn(),
}));

vi.mock("../../src/ecs/world", () => ({
	world: { query: vi.fn(() => []) },
}));

import { TopBar } from "../../src/ui/layout/TopBar";

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
	// Allow React to flush
	await new Promise((r) => setTimeout(r, 50));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("TopBar renders resource badges", async () => {
	await render(<TopBar />);

	const text = container!.textContent ?? "";
	expect(text).toContain("15"); // scrapMetal
	expect(text).toContain("8"); // circuitry
	expect(text).toContain("3"); // powerCells
});

test("TopBar renders speed buttons", async () => {
	await render(<TopBar />);

	const buttons = container!.querySelectorAll("button");
	const labels = Array.from(buttons).map((b) => b.textContent);

	expect(labels).toContain("0.5x");
	expect(labels).toContain("1x");
	expect(labels).toContain("2x");
	expect(labels).toContain("4x");
});

test("TopBar renders pause button", async () => {
	await render(<TopBar />);

	const buttons = container!.querySelectorAll("button");
	const labels = Array.from(buttons).map((b) => b.textContent);
	// When not paused, button shows "PAUSE"
	expect(labels).toContain("PAUSE");
});

test("TopBar renders save/load buttons", async () => {
	await render(<TopBar />);

	const buttons = container!.querySelectorAll("button");
	const labels = Array.from(buttons).map((b) => b.textContent);
	expect(labels).toContain("SAVE");
	expect(labels).toContain("LOAD");
});

test("TopBar speed buttons are clickable", async () => {
	await render(<TopBar />);

	const buttons = container!.querySelectorAll("button");
	const speedBtn = Array.from(buttons).find((b) => b.textContent === "2x");
	expect(speedBtn).toBeDefined();

	speedBtn!.click();
	// No crash = success
});

test("TopBar shows unit and enemy counts", async () => {
	await render(<TopBar />);

	const text = container!.textContent ?? "";
	expect(text).toContain("3 UNITS");
	expect(text).toContain("1 HOSTILE");
});

test("TopBar shows tick number", async () => {
	await render(<TopBar />);

	const text = container!.textContent ?? "";
	expect(text).toContain("T42");
});
