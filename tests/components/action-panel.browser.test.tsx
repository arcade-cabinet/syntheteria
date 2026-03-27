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
