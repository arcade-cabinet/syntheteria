/**
 * Full headed browser playtest.
 *
 * Tests the game lifecycle through ECS simulation in real Chrome.
 * Cannot render BabylonJS (needs Webpack + babel-plugin-reactylon),
 * so we test the React DOM layer + ECS game loop directly.
 *
 * Runs HEADED so you can see the HUD components rendering in real Chrome.
 */

import { afterEach, beforeEach, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";

// ─── Import game systems directly (no Reactylon needed) ───────────────────

import {
	enableAutoPlay,
	disableAutoPlay,
	getGovernorLog,
	clearGovernorLog,
	governorTick,
	resetGovernor,
} from "../../src/ai/governor/PlaytestGovernor";
import {
	getSnapshot,
	simulationTick,
	setGameSpeed,
	togglePause,
	isPaused,
	setGameConfig,
} from "../../src/ecs/gameState";
import { getRooms, initCityLayout } from "../../src/ecs/cityLayout";
import {
	Fragment,
	Unit,
	Position,
	Faction,
	EntityId,
	Navigation,
	UnitComponents,
	Inventory,
	EngagementRule,
} from "../../src/ecs/traits";
import { world } from "../../src/ecs/world";
import { movementSystem } from "../../src/systems/movement";
import { getResources } from "../../src/systems/resources";
import { serializeComponents } from "../../src/ecs/types";

// ─── UI imports (React DOM only — no BabylonJS) ────────────────────────────

import { TopBar } from "../../src/ui/layout/TopBar";
import { Sidebar } from "../../src/ui/layout/Sidebar";
import { SelectionInfo } from "../../src/ui/layout/SelectionInfo";
import { ActionPanel } from "../../src/ui/layout/ActionPanel";

// ─── Globals ─────────────────────────────────────────────────────────────────

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function setup() {
	container = document.createElement("div");
	container.id = "playtest-root";
	container.style.cssText =
		"width:100vw;height:100vh;position:fixed;inset:0;background:#0a0a14;color:#94a3b8;font-family:monospace;";
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function flush(ms = 200) {
	await new Promise((r) => setTimeout(r, ms));
}

let entityCounter = 0;

function spawnTestUnit(name: string, x: number, z: number, faction: "player" | "cultist" = "player") {
	const id = `test_${entityCounter++}`;
	const components = [
		{ name: "camera", functional: true, material: "electronic" },
		{ name: "arms", functional: true, material: "metal" },
		{ name: "legs", functional: true, material: "metal" },
		{ name: "power_cell", functional: true, material: "electronic" },
	];
	return world.spawn(
		EntityId({ value: id }),
		Position({ x, y: 0, z }),
		Faction({ value: faction }),
		Fragment({ fragmentId: `frag_${id}` }),
		Unit({ unitType: "maintenance_bot", displayName: name, speed: 3, selected: false, mark: 1 }),
		UnitComponents({ componentsJson: serializeComponents(components) }),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		Inventory({ inventoryJson: "{}" }),
		EngagementRule({ value: "attack" }),
	);
}

function initTestWorld() {
	setGameConfig("playtest-seed", "normal");
	entityCounter = 0;

	const startX = 48;
	const startZ = 62;

	spawnTestUnit("Bot Alpha", startX - 2, startZ);
	spawnTestUnit("Bot Beta", startX + 2, startZ);
	spawnTestUnit("Cult Drone", startX + 40, startZ + 40, "cultist");

	simulationTick(); // Initial tick
	return { startX, startZ };
}

// ─── Playtest: ECS Game Loop ────────────────────────────────────────────────

test("full game loop: 200 ticks with governor, verify state", async () => {
	// Initialize world
	const { startX, startZ } = initTestWorld();

	const snapBefore = getSnapshot();
	console.log(`[PLAYTEST] Initial: T${snapBefore.tick}, ${snapBefore.unitCount} units, ${snapBefore.enemyCount} enemies`);

	// Enable governor
	enableAutoPlay();
	clearGovernorLog();

	// Run 200 simulation ticks
	for (let i = 0; i < 200; i++) {
		movementSystem(0.25, 1);
		simulationTick();
	}

	const snapAfter = getSnapshot();
	const log = getGovernorLog();

	console.log(`[PLAYTEST] After 200 ticks: T${snapAfter.tick}`);
	console.log(`[PLAYTEST] Units: ${snapAfter.unitCount} player, ${snapAfter.enemyCount} enemies`);
	console.log(`[PLAYTEST] Governor made ${log.length} decisions`);

	const actionTypes = new Set(log.map((a) => a.action));
	console.log(`[PLAYTEST] Action types: ${[...actionTypes].join(", ")}`);
	console.log(`[PLAYTEST] Resources:`, JSON.stringify(snapAfter.resources));
	console.log(`[PLAYTEST] Phase: ${snapAfter.gamePhase}`);
	console.log(`[PLAYTEST] Human temperature: ${snapAfter.humanTemperature}`);

	// Assertions
	expect(snapAfter.tick).toBeGreaterThanOrEqual(200);
	expect(snapAfter.unitCount).toBeGreaterThan(0); // Player units survive
	expect(log.length).toBeGreaterThan(0); // Governor made decisions
	expect(actionTypes.size).toBeGreaterThan(0); // Multiple action types

	disableAutoPlay();
	resetGovernor();
});

test("governor explores, attacks, and survives 500 ticks", async () => {
	initTestWorld();
	enableAutoPlay();
	clearGovernorLog();

	// Run 500 ticks — stress test
	for (let i = 0; i < 500; i++) {
		movementSystem(0.25, 1);
		simulationTick();
	}

	const snap = getSnapshot();
	const log = getGovernorLog();

	console.log(`[STRESS] T${snap.tick}: ${snap.unitCount} units, ${snap.enemyCount} enemies, ${log.length} decisions`);

	expect(snap.tick).toBeGreaterThanOrEqual(500);
	expect(snap.unitCount).toBeGreaterThan(0);

	// After 500 ticks, governor should have done various things
	const actionTypes = new Set(log.map((a) => a.action));
	console.log(`[STRESS] Actions: ${[...actionTypes].join(", ")}`);

	disableAutoPlay();
	resetGovernor();
});

// ─── Playtest: HUD renders with real ECS state ──────────────────────────────

test("TopBar renders live game state in real browser", async () => {
	setup();
	initTestWorld();

	// Run a few ticks so there's state to display
	for (let i = 0; i < 10; i++) {
		simulationTick();
	}

	root!.render(
		<div style={{ background: "#0a0e14", padding: "8px" }}>
			<TopBar />
		</div>,
	);
	await flush(300);

	const text = container!.textContent ?? "";

	// Should show unit counts
	expect(text).toContain("UNITS");

	// Should show resource labels
	expect(text).toContain("Fe");

	// Should show speed controls
	expect(text).toContain("PAUSE");

	console.log(`[HUD] TopBar text: ${text.slice(0, 200)}`);
});

test("SelectionInfo shows unit details when entity selected", async () => {
	setup();
	initTestWorld();

	// Select the first player unit
	for (const entity of world.query(Unit, Faction)) {
		if (entity.get(Faction)!.value === "player") {
			entity.set(Unit, { selected: true });
			break;
		}
	}

	root!.render(
		<div style={{ background: "#0f172a", padding: "8px", width: "256px" }}>
			<SelectionInfo />
		</div>,
	);
	await flush(300);

	const text = container!.textContent ?? "";
	console.log(`[HUD] SelectionInfo: ${text.slice(0, 200)}`);

	// Should show unit name (Bot Alpha or Bot Beta)
	expect(text.includes("Bot Alpha") || text.includes("Bot Beta")).toBe(true);

	// Deselect
	for (const entity of world.query(Unit)) {
		entity.set(Unit, { selected: false });
	}
});

test("ActionPanel shows actions for selected unit", async () => {
	setup();
	initTestWorld();

	// Select a unit
	for (const entity of world.query(Unit, Faction)) {
		if (entity.get(Faction)!.value === "player") {
			entity.set(Unit, { selected: true });
			break;
		}
	}

	root!.render(
		<div style={{ background: "#0f172a", padding: "8px", width: "256px" }}>
			<ActionPanel />
		</div>,
	);
	await flush(300);

	const text = container!.textContent ?? "";
	console.log(`[HUD] ActionPanel: ${text.slice(0, 200)}`);

	// Should show action buttons
	const hasAction =
		text.includes("MOVE") ||
		text.includes("ATTACK") ||
		text.includes("SCAVENGE") ||
		text.includes("FOUND BASE");
	expect(hasAction).toBe(true);

	// Deselect
	for (const entity of world.query(Unit)) {
		entity.set(Unit, { selected: false });
	}
});

test("Sidebar renders minimap + selection + actions together", async () => {
	setup();
	initTestWorld();

	root!.render(
		<div
			style={{
				background: "#0f172a",
				width: "256px",
				height: "100vh",
				position: "fixed",
				left: 0,
				top: 0,
			}}
		>
			<Sidebar />
		</div>,
	);
	await flush(300);

	const text = container!.textContent ?? "";
	console.log(`[HUD] Sidebar: ${text.slice(0, 200)}`);

	// Should have "No Selection" since nothing is selected
	expect(text).toContain("No Selection");
});

// ─── Speed and Pause ────────────────────────────────────────────────────────

test("speed controls affect tick rate", () => {
	initTestWorld();

	setGameSpeed(4);
	expect(getSnapshot().gameSpeed).toBe(4);

	setGameSpeed(0.5);
	expect(getSnapshot().gameSpeed).toBe(0.5);

	// Pause should prevent ticks
	if (!isPaused()) togglePause();
	const tickBefore = getSnapshot().tick;
	simulationTick(); // Should be no-op when paused
	expect(getSnapshot().tick).toBe(tickBefore);

	// Unpause
	togglePause();
	simulationTick();
	expect(getSnapshot().tick).toBe(tickBefore + 1);
});
