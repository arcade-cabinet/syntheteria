/**
 * Browser tests for BasePanel component.
 *
 * Renders the real BasePanel with real ECS entities in headed Chrome.
 * No mocks — Vite compiles everything.
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { BasePanel, selectBase } from "../../src/components/base/BasePanel";
import { Base, EntityId, Faction, Position } from "../../src/ecs/traits";
import { world } from "../../src/ecs/world";

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const spawnedEntities: ReturnType<typeof world.spawn>[] = [];

function setup() {
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
}

function cleanup() {
	// Always close panel
	selectBase(null);
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
}

beforeEach(setup);
afterEach(cleanup);

async function flush(ms = 150) {
	await new Promise((r) => setTimeout(r, ms));
}

function spawnBase(id: string, name: string, power = 10) {
	const e = world.spawn(
		EntityId({ value: id }),
		Position({ x: 50, y: 0, z: 50 }),
		Faction({ value: "player" }),
		Base({
			name,
			tileX: 25,
			tileZ: 25,
			factionId: "player",
			infrastructureJson: "[]",
			productionQueueJson: "[]",
			power,
			storageJson: "{}",
		}),
	);
	spawnedEntities.push(e);
	return e;
}

test("panel hidden when no base selected", async () => {
	spawnBase("bp_1", "Alpha Base");
	root!.render(<BasePanel />);
	await flush();

	// BasePanel returns null when no base selected, so container should be empty
	expect(container!.children.length).toBe(0);
});

test("panel visible after selectBase()", async () => {
	spawnBase("bp_2", "Alpha Base");
	await act(async () => {
		selectBase("bp_2");
	});
	root!.render(<BasePanel />);
	await flush();

	expect(container!.children.length).toBeGreaterThan(0);
	const text = container!.textContent ?? "";
	expect(text).toContain("Alpha Base");
});

test("shows base name", async () => {
	spawnBase("bp_3", "Omega Outpost");
	await act(async () => {
		selectBase("bp_3");
	});
	root!.render(<BasePanel />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("Omega Outpost");
});

test("close button works", async () => {
	spawnBase("bp_4", "Test Base");
	await act(async () => {
		selectBase("bp_4");
	});
	root!.render(<BasePanel />);
	await flush();

	// Panel should be visible
	expect(container!.textContent).toContain("Test Base");

	// Find close button (contains "X")
	const closeBtn = Array.from(container!.querySelectorAll("button")).find(
		(b) => b.textContent?.trim() === "X",
	);
	expect(closeBtn).toBeDefined();

	await act(async () => {
		closeBtn!.click();
	});
	// Re-render to pick up state change
	root!.render(<BasePanel />);
	await flush();

	// Panel should be hidden
	expect(container!.children.length).toBe(0);
});

test("ESC key closes panel", async () => {
	spawnBase("bp_5", "ESC Base");
	await act(async () => {
		selectBase("bp_5");
	});
	root!.render(<BasePanel />);
	await flush();

	expect(container!.textContent).toContain("ESC Base");

	// Dispatch Escape key event
	await act(async () => {
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
	});
	root!.render(<BasePanel />);
	await flush();

	expect(container!.children.length).toBe(0);
});

test("shows power gauge", async () => {
	spawnBase("bp_6", "Power Base", 25);
	await act(async () => {
		selectBase("bp_6");
	});
	root!.render(<BasePanel />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("Power");
	expect(text).toContain("25 kW");
});

test("production queue section present", async () => {
	spawnBase("bp_7", "Prod Base");
	await act(async () => {
		selectBase("bp_7");
	});
	root!.render(<BasePanel />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("Production Queue");
});
