/**
 * Browser tests for SelectionInfo component.
 *
 * Renders the real SelectionInfo in headless Chromium and verifies:
 * - Shows "No Selection" when no unit is selected in ECS
 * - Renders without crashing
 */

import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

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
}));

vi.mock("../../src/ecs/world", () => ({
	world: { query: vi.fn(() => []) },
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

import { SelectionInfo } from "../../src/ui/layout/SelectionInfo";

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

test("SelectionInfo shows 'No Selection' when nothing selected", async () => {
	await render(<SelectionInfo />);

	const text = container!.textContent ?? "";
	expect(text).toContain("No Selection");
});

test("SelectionInfo renders without crashing", async () => {
	await render(<SelectionInfo />);

	expect(container!.children.length).toBeGreaterThan(0);
});
