/**
 * Browser tests for TopBar component.
 *
 * Renders the real TopBar with real ECS state (Koota world) in headed Chrome.
 * No mocks — Vite compiles everything.
 */

import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { TopBar } from "../../src/components/game/TopBar";
import {
	getSnapshot,
	isPaused,
	setGameSpeed,
	simulationTick,
	togglePause,
} from "../../src/ecs/gameState";
import {
	EngagementRule,
	EntityId,
	Faction,
	Fragment,
	Inventory,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../../src/ecs/traits";
import { serializeComponents } from "../../src/ecs/types";
import { world } from "../../src/ecs/world";
import {
	expectAllButtonsClickable,
	expectReadableFont,
	expectTouchTarget,
	expectVisible,
} from "./visual-helpers";

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
		(b) => b.textContent?.includes("PAUSE") || b.textContent?.includes("PLAY"),
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

test("speed buttons meet minimum touch target size", async () => {
	root!.render(<TopBar />);
	await flush();

	const buttons = Array.from(container!.querySelectorAll("button"));
	const speedButtons = buttons.filter((b) => {
		const text = b.textContent?.trim() ?? "";
		return ["0.5x", "1x", "2x", "4x"].includes(text);
	});
	expect(speedButtons.length).toBe(4);

	for (const btn of speedButtons) {
		expectTouchTarget(btn, 36, btn.textContent?.trim());
	}
});

test("resource badges are visible with readable font", async () => {
	root!.render(<TopBar />);
	await flush();

	// Find resource badge spans by their title attributes
	const badges = container!.querySelectorAll<HTMLSpanElement>("span[title]");
	const resourceBadges = Array.from(badges).filter((s) =>
		["Scrap Metal", "Circuitry", "Power Cells", "Durasteel"].includes(s.title),
	);
	expect(resourceBadges.length, "should find 4 resource badges").toBe(4);

	for (const badge of resourceBadges) {
		expectVisible(badge, badge.title);
		expectReadableFont(badge, badge.title);
	}
});

test("active speed button has distinct background from inactive", async () => {
	root!.render(<TopBar />);
	await flush();

	const buttons = Array.from(container!.querySelectorAll("button"));
	const btn1x = buttons.find((b) => b.textContent?.trim() === "1x");
	const btn2x = buttons.find((b) => b.textContent?.trim() === "2x");
	expect(btn1x).toBeDefined();
	expect(btn2x).toBeDefined();

	// 1x should be active by default
	const bg1x = getComputedStyle(btn1x!).backgroundColor;
	const bg2x = getComputedStyle(btn2x!).backgroundColor;
	expect(bg1x, "active button bg should differ from inactive").not.toBe(bg2x);
});

test("all TopBar buttons are clickable (not obscured)", async () => {
	spawnPlayerUnit("vis_p1", "Visual Test");
	root!.render(<TopBar />);
	await flush();

	expectAllButtonsClickable(container!);
});

test("HOSTILE indicator has red color styling", async () => {
	spawnPlayerUnit("vis_p2", "Alpha");
	spawnEnemyUnit("vis_e1");
	setGameSpeed(1);
	root!.render(<TopBar />);
	await flush();

	// Find the HOSTILE span
	const spans = container!.querySelectorAll("span");
	const hostile = Array.from(spans).find((s) =>
		s.textContent?.includes("HOSTILE"),
	);
	expect(hostile, "HOSTILE indicator should exist").toBeDefined();

	const color = getComputedStyle(hostile!).color;
	// Should be red-ish (rgb(239, 68, 68) for text-red-500 or similar)
	expect(color, "HOSTILE should have red color").toMatch(/rgb\(\s*2[0-9]{2}/);
});
