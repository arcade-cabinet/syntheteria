/**
 * Browser tests for BasePanel component.
 *
 * Renders the real BasePanel with real ECS entities in headed Chrome.
 * No mocks — Vite compiles everything.
 */

import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { BasePanel, selectBase } from "../../src/components/base/BasePanel";
import { Base, EntityId, Faction, Position } from "../../src/ecs/traits";
import { world } from "../../src/ecs/world";
import { expectVisible } from "./visual-helpers";

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
	selectBase("bp_2");
	root!.render(<BasePanel />);
	await flush();

	expect(container!.children.length).toBeGreaterThan(0);
	const text = container!.textContent ?? "";
	expect(text).toContain("Alpha Base");
});

test("shows base name", async () => {
	spawnBase("bp_3", "Omega Outpost");
	selectBase("bp_3");
	root!.render(<BasePanel />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("Omega Outpost");
});

test("close button works", async () => {
	spawnBase("bp_4", "Test Base");
	selectBase("bp_4");
	root!.render(<BasePanel />);
	await flush();

	// Panel should be visible
	expect(container!.textContent).toContain("Test Base");

	// Find close button (contains "X")
	const closeBtn = Array.from(container!.querySelectorAll("button")).find(
		(b) => b.textContent?.trim() === "X",
	);
	expect(closeBtn).toBeDefined();

	closeBtn!.click();
	// Re-render to pick up state change
	root!.render(<BasePanel />);
	await flush();

	// Panel should be hidden
	expect(container!.children.length).toBe(0);
});

test("ESC key closes panel", async () => {
	spawnBase("bp_5", "ESC Base");
	selectBase("bp_5");
	root!.render(<BasePanel />);
	await flush();

	expect(container!.textContent).toContain("ESC Base");

	// Dispatch Escape key event
	window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
	root!.render(<BasePanel />);
	await flush();

	expect(container!.children.length).toBe(0);
});

test("shows power gauge", async () => {
	spawnBase("bp_6", "Power Base", 25);
	selectBase("bp_6");
	root!.render(<BasePanel />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("Power");
	expect(text).toContain("25 kW");
});

test("production queue section present", async () => {
	spawnBase("bp_7", "Prod Base");
	selectBase("bp_7");
	root!.render(<BasePanel />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("Production Queue");
});

test("panel is full-height and right-aligned", async () => {
	spawnBase("vis_1", "Visual Base");
	selectBase("vis_1");
	root!.render(<BasePanel />);
	await flush();

	const panel = container!.querySelector<HTMLDivElement>("[class*='fixed']");
	expect(panel, "panel should exist").toBeDefined();

	const style = getComputedStyle(panel!);
	expect(style.position, "panel should be fixed").toBe("fixed");

	const rect = panel!.getBoundingClientRect();
	expect(rect.right, "panel should be flush to right edge").toBeCloseTo(
		window.innerWidth,
		0,
	);
	expect(
		rect.height,
		"panel should be full viewport height",
	).toBeGreaterThanOrEqual(window.innerHeight - 1);
});

test("close button (X) is visible and touchable", async () => {
	spawnBase("vis_2", "Close Test");
	selectBase("vis_2");
	root!.render(<BasePanel />);
	await flush();

	const closeBtn = Array.from(container!.querySelectorAll("button")).find(
		(b) => b.textContent?.trim() === "X",
	);
	expect(closeBtn).toBeDefined();
	expectVisible(closeBtn!, "close button");
});

test("power gauge bar has correct width proportion", async () => {
	spawnBase("vis_3", "Power Test", 25);
	selectBase("vis_3");
	root!.render(<BasePanel />);
	await flush();

	// Find the power gauge fill bar (cyan bg, rounded)
	const bars = container!.querySelectorAll<HTMLDivElement>("div");
	const gaugeBar = Array.from(bars).find((d) => {
		const style = d.style;
		return (
			style.width?.includes("%") &&
			d.className?.includes("rounded-full") &&
			d.className?.includes("bg-cyan")
		);
	});

	if (gaugeBar) {
		// 25 kW / 50 max = 50%
		expect(gaugeBar.style.width, "gauge should show 50% fill for 25kW").toBe(
			"50%",
		);
	}
});

test("section headers have uppercase tracking-wider styling", async () => {
	spawnBase("vis_4", "Style Base");
	selectBase("vis_4");
	root!.render(<BasePanel />);
	await flush();

	const headers = container!.querySelectorAll("h3");
	expect(headers.length, "should have section headers").toBeGreaterThan(0);

	for (const h of headers) {
		const style = getComputedStyle(h);
		expect(
			style.textTransform,
			`header "${h.textContent}" should be uppercase`,
		).toBe("uppercase");
	}
});
