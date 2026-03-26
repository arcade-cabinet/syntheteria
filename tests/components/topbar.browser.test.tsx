/**
 * Browser tests for TopBar component.
 *
 * Renders the real TopBar with real ECS state (Koota world) in headed Chrome.
 * No mocks — Vite compiles everything.
 */

import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import {
	getSnapshot,
	setGameSpeed,
	simulationTick,
	togglePause,
	isPaused,
} from "../../src/ecs/gameState";
import {
	EntityId,
	Faction,
	Navigation,
	Position,
	Unit,
	UnitComponents,
	Inventory,
	EngagementRule,
	Fragment,
} from "../../src/ecs/traits";
import { serializeComponents } from "../../src/ecs/types";
import { world } from "../../src/ecs/world";
import { TopBar } from "../../src/components/game/TopBar";

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const spawnedEntities: ReturnType<typeof world.spawn>[] = [];

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
	for (const e of spawnedEntities) {
		try {
			e.destroy();
		} catch {
			// already destroyed
		}
	}
	spawnedEntities.length = 0;
	// Unpause if paused
	if (isPaused()) togglePause();
}

beforeEach(setup);
afterEach(cleanup);

async function flush(ms = 150) {
	await new Promise((r) => setTimeout(r, ms));
}

function spawnPlayerUnit(id: string, name: string) {
	const e = world.spawn(
		EntityId({ value: id }),
		Position({ x: 10, y: 0, z: 20 }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "frag_1" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: name,
			speed: 3,
			selected: false,
			mark: 1,
		}),
		UnitComponents({
			componentsJson: serializeComponents([
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			]),
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		Inventory({ inventoryJson: "{}" }),
		EngagementRule({ value: "attack" }),
	);
	spawnedEntities.push(e);
	return e;
}

function spawnEnemyUnit(id: string) {
	const e = world.spawn(
		EntityId({ value: id }),
		Position({ x: 50, y: 0, z: 50 }),
		Faction({ value: "cultist" }),
		Fragment({ fragmentId: "frag_2" }),
		Unit({
			unitType: "cult_drone",
			displayName: "Cult Drone",
			speed: 2,
			selected: false,
			mark: 1,
		}),
		UnitComponents({
			componentsJson: serializeComponents([
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			]),
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		Inventory({ inventoryJson: "{}" }),
		EngagementRule({ value: "attack" }),
	);
	spawnedEntities.push(e);
	return e;
}

test("displays unit count matching world query", async () => {
	spawnPlayerUnit("p1", "Alpha");
	spawnPlayerUnit("p2", "Beta");
	// Force snapshot invalidation so TopBar sees new entities
	setGameSpeed(1);
	root!.render(<TopBar />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("2 UNITS");
});

test("displays HOSTILE with enemy count", async () => {
	spawnPlayerUnit("p1", "Alpha");
	spawnEnemyUnit("e1");
	spawnEnemyUnit("e2");
	// Force snapshot invalidation so TopBar sees new entities
	setGameSpeed(1);
	root!.render(<TopBar />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("HOSTILE");
	expect(text).toContain("2");
});

test("speed buttons present (0.5x, 1x, 2x, 4x)", async () => {
	root!.render(<TopBar />);
	await flush();

	const buttons = Array.from(container!.querySelectorAll("button"));
	const labels = buttons.map((b) => b.textContent?.trim());
	expect(labels).toContain("0.5x");
	expect(labels).toContain("1x");
	expect(labels).toContain("2x");
	expect(labels).toContain("4x");
});

test("PAUSE button present", async () => {
	root!.render(<TopBar />);
	await flush();

	const buttons = Array.from(container!.querySelectorAll("button"));
	const pauseBtn = buttons.find(
		(b) =>
			b.textContent?.includes("PAUSE") || b.textContent?.includes("PLAY"),
	);
	expect(pauseBtn).toBeDefined();
});

test("resource badges visible (Fe, Ci, Pw, Du)", async () => {
	root!.render(<TopBar />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("Fe");
	expect(text).toContain("Ci");
	expect(text).toContain("Pw");
	expect(text).toContain("Du");
});

test("tick counter shows after simulationTick()", async () => {
	// Unpause to allow tick
	if (isPaused()) togglePause();
	simulationTick();
	root!.render(<TopBar />);
	await flush();

	const snap = getSnapshot();
	const text = container!.textContent ?? "";
	expect(text).toContain(`T${snap.tick}`);
	expect(snap.tick).toBeGreaterThan(0);
});

test("SAVE/LOAD buttons present", async () => {
	root!.render(<TopBar />);
	await flush();

	const buttons = Array.from(container!.querySelectorAll("button"));
	const labels = buttons.map((b) => b.textContent?.trim());
	expect(labels).toContain("SAVE");
	expect(labels).toContain("LOAD");
});

test("clicking speed button changes game speed", async () => {
	root!.render(<TopBar />);
	await flush();

	const buttons = Array.from(container!.querySelectorAll("button"));
	const btn2x = buttons.find((b) => b.textContent?.trim() === "2x");
	expect(btn2x).toBeDefined();
	btn2x!.click();
	await flush(50);

	const snap = getSnapshot();
	expect(snap.gameSpeed).toBe(2);

	// Reset speed
	setGameSpeed(1);
});
