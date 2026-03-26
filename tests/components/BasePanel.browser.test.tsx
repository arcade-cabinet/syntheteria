/**
 * Browser tests for BasePanel component.
 *
 * Renders the real BasePanel in headless Chromium and verifies:
 * - BasePanel renders nothing when no base is selected
 * - BasePanel returns null when selectedBaseEntityId is null
 */

import { afterEach, expect, test, vi } from "vitest";
import { type Root, createRoot } from "react-dom/client";

// ─── Mocks ────────────────────────────────────────────────────────────────────

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
	power: Object.freeze({ totalGeneration: 0, totalDemand: 0, stormIntensity: 0 }),
	resources: Object.freeze({ scrapMetal: 0, circuitry: 0, powerCells: 0, durasteel: 0 }),
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
}));

vi.mock("../../src/ecs/world", () => ({
	world: { query: vi.fn(() => []) },
}));

vi.mock("../../src/systems/baseManagement", () => ({
	getProductionQueue: vi.fn(() => []),
	getInfrastructure: vi.fn(() => []),
	getBaseStorage: vi.fn(() => ({})),
	foundBase: vi.fn(),
	validateBaseLocation: vi.fn(() => null),
}));

import { BasePanel, selectBase } from "../../src/ui/base/BasePanel";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function setup() {
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
}

function cleanup() {
	// Reset base selection
	selectBase(null);
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

test("BasePanel renders nothing when no base selected", async () => {
	await render(<BasePanel />);

	// When no base is selected, BasePanel returns null
	expect(container!.innerHTML).toBe("");
});

test("BasePanel returns null when selectedBaseEntityId is null", async () => {
	selectBase(null);
	await render(<BasePanel />);

	expect(container!.innerHTML).toBe("");
});

test("BasePanel renders nothing even after selecting non-existent entity", async () => {
	// Select an entity ID that doesn't exist in the mocked world
	selectBase("nonexistent-id");
	await render(<BasePanel />);

	// The world.query returns [], so no matching entity will be found
	// and BasePanel returns null
	expect(container!.innerHTML).toBe("");
});
