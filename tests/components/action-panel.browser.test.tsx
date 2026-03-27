/**
 * Browser tests for ActionPanel component.
 *
 * Renders the real ActionPanel with real ECS entities in headed Chrome.
 * No mocks — Vite compiles everything.
 */

import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { ActionPanel } from "../../src/components/game/ActionPanel";
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
import { expectAllButtonsClickable, expectTouchTarget } from "./visual-helpers";

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
}

beforeEach(setup);
afterEach(cleanup);

async function flush(ms = 150) {
	await new Promise((r) => setTimeout(r, ms));
}

function spawnSelectedPlayerUnit(id: string) {
	const e = world.spawn(
		EntityId({ value: id }),
		Position({ x: 10, y: 0, z: 20 }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "frag_1" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Bot Alpha",
			speed: 3,
			selected: true,
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

test("returns null when nothing selected", async () => {
	root!.render(
		<div data-testid="wrapper">
			<ActionPanel />
		</div>,
	);
	await flush();

	const wrapper = container!.querySelector("[data-testid='wrapper']");
	// ActionPanel returns null, so wrapper should have no child content
	expect(wrapper!.children.length).toBe(0);
});

test("shows action buttons when unit selected", async () => {
	spawnSelectedPlayerUnit("ap_1");
	root!.render(<ActionPanel />);
	await flush();

	const buttons = container!.querySelectorAll("button");
	expect(buttons.length).toBeGreaterThan(0);
});

test("FOUND BASE button present", async () => {
	spawnSelectedPlayerUnit("ap_2");
	root!.render(<ActionPanel />);
	await flush();

	const buttons = Array.from(container!.querySelectorAll("button"));
	const foundBase = buttons.find((b) => b.textContent?.includes("FOUND BASE"));
	expect(foundBase).toBeDefined();
});

test("STANCE button visible", async () => {
	spawnSelectedPlayerUnit("ap_3");
	root!.render(<ActionPanel />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("STANCE");
});

test("ATTACK button present", async () => {
	spawnSelectedPlayerUnit("ap_4");
	root!.render(<ActionPanel />);
	await flush();

	const buttons = Array.from(container!.querySelectorAll("button"));
	const attack = buttons.find((b) => b.textContent?.includes("ATTACK"));
	expect(attack).toBeDefined();
});

test("'Click ground to move' instruction text present", async () => {
	spawnSelectedPlayerUnit("ap_5");
	root!.render(<ActionPanel />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("Click ground to move");
});

test("STANCE cycles on click (ATK -> DEF -> HOLD -> FLEE)", async () => {
	const _entity = spawnSelectedPlayerUnit("ap_6");
	root!.render(<ActionPanel />);
	await flush();

	// Initial stance should be ATK
	let text = container!.textContent ?? "";
	expect(text).toContain("STANCE: ATK");

	// Click the STANCE button to cycle
	const stanceBtn = Array.from(container!.querySelectorAll("button")).find(
		(b) => b.textContent?.includes("STANCE"),
	);
	expect(stanceBtn).toBeDefined();

	// Click 1: ATK -> DEF
	stanceBtn!.click();
	root!.render(<ActionPanel />);
	await flush(50);
	text = container!.textContent ?? "";
	expect(text).toContain("STANCE: DEF");

	// Click 2: DEF -> HOLD
	stanceBtn!.click();
	root!.render(<ActionPanel />);
	await flush(50);
	text = container!.textContent ?? "";
	expect(text).toContain("STANCE: HOLD");

	// Click 3: HOLD -> FLEE
	stanceBtn!.click();
	root!.render(<ActionPanel />);
	await flush(50);
	text = container!.textContent ?? "";
	expect(text).toContain("STANCE: FLEE");
});

test("action buttons meet minimum touch target size", async () => {
	spawnSelectedPlayerUnit("vis_1");
	root!.render(<ActionPanel />);
	await flush();

	const buttons = container!.querySelectorAll<HTMLButtonElement>("button");
	expect(buttons.length, "should have action buttons").toBeGreaterThan(0);

	for (const btn of buttons) {
		const rect = btn.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) {
			expectTouchTarget(btn, 36, btn.textContent?.trim());
		}
	}
});

test("STANCE button has active/highlighted styling", async () => {
	spawnSelectedPlayerUnit("vis_2");
	root!.render(<ActionPanel />);
	await flush();

	const buttons = Array.from(container!.querySelectorAll("button"));
	const stanceBtn = buttons.find((b) => b.textContent?.includes("STANCE"));
	expect(stanceBtn, "STANCE button should exist").toBeDefined();

	// STANCE is always active — should have cyan border/background
	const style = getComputedStyle(stanceBtn!);
	const borderColor = style.borderColor;
	// Cyan border: rgb(34, 211, 238) or similar
	expect(
		borderColor,
		`STANCE button should have cyan border, got: ${borderColor}`,
	).toMatch(/rgb\(\s*\d+,\s*[12]\d{2},\s*2[0-9]{2}/);
});

test("action panel uses grid layout for buttons", async () => {
	spawnSelectedPlayerUnit("vis_3");
	root!.render(<ActionPanel />);
	await flush();

	// Find the grid container (parent of action buttons)
	const gridEl = container!.querySelector<HTMLDivElement>("[class*='grid']");
	expect(gridEl, "should have a grid layout container").toBeDefined();

	const style = getComputedStyle(gridEl!);
	expect(style.display, "container should use grid display").toBe("grid");
});

test("all action buttons are clickable (not obscured)", async () => {
	spawnSelectedPlayerUnit("vis_4");
	root!.render(<ActionPanel />);
	await flush();

	expectAllButtonsClickable(container!);
});

test("disabled buttons have distinct visual state", async () => {
	// Spawn unit with broken arms to get disabled ATTACK button
	const e = world.spawn(
		EntityId({ value: "vis_5" }),
		Position({ x: 10, y: 0, z: 20 }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "frag_1" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Broken Bot",
			speed: 3,
			selected: true,
			mark: 1,
		}),
		UnitComponents({
			componentsJson: serializeComponents([
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "arms", functional: false, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			]),
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		Inventory({ inventoryJson: "{}" }),
		EngagementRule({ value: "attack" }),
	);
	spawnedEntities.push(e);

	root!.render(<ActionPanel />);
	await flush();

	const buttons = Array.from(container!.querySelectorAll("button"));
	const attackBtn = buttons.find((b) => b.textContent?.includes("ATTACK"));
	expect(attackBtn, "ATTACK button should exist").toBeDefined();
	expect(
		attackBtn!.disabled,
		"ATTACK should be disabled with broken arms",
	).toBe(true);

	// Disabled button should have muted/dim styling
	const style = getComputedStyle(attackBtn!);
	expect(style.cursor, "disabled button should have not-allowed cursor").toBe(
		"not-allowed",
	);
});
