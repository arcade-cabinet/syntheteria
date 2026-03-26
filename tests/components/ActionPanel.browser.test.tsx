/**
 * Browser tests for ActionPanel component.
 *
 * Renders the real ActionPanel in headless Chromium and verifies:
 * - Renders without crashing when no selection
 * - Returns null (renders nothing) when no unit/building is selected
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

vi.mock("../../src/board/coords", () => ({
	worldToTileX: vi.fn((x: number) => Math.floor(x / 2)),
	worldToTileZ: vi.fn((z: number) => Math.floor(z / 2)),
}));

vi.mock("../../src/systems/baseManagement", () => ({
	foundBase: vi.fn(() => ({
		get: () => ({ value: "mock_base" }),
	})),
	validateBaseLocation: vi.fn(() => null),
}));

vi.mock("../../src/ui/base/BasePanel", () => ({
	selectBase: vi.fn(),
}));

import { ActionPanel } from "../../src/ui/layout/ActionPanel";

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

test("ActionPanel renders without crashing when no selection", async () => {
	await render(<ActionPanel />);

	// ActionPanel returns null when nothing is selected,
	// so the container should be empty
	expect(container!.innerHTML).toBe("");
});

test("ActionPanel renders nothing when no unit or building is selected", async () => {
	await render(
		<div data-testid="wrapper">
			<ActionPanel />
			<span>sentinel</span>
		</div>,
	);

	// The sentinel should render, but ActionPanel contributes nothing
	const text = container!.textContent ?? "";
	expect(text).toContain("sentinel");
	// No action buttons should be present
	const buttons = container!.querySelectorAll("button");
	expect(buttons.length).toBe(0);
});
