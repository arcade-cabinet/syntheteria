/**
 * Browser tests for SelectionInfo component.
 *
 * Renders the real SelectionInfo with real ECS entities in headed Chrome.
 * No mocks — Vite compiles everything.
 */

import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import {
	EntityId,
	Faction,
	Fragment,
	Navigation,
	Position,
	Unit,
	UnitComponents,
	Inventory,
	EngagementRule,
} from "../../src/ecs/traits";
import { serializeComponents } from "../../src/ecs/types";
import { world } from "../../src/ecs/world";
import { SelectionInfo } from "../../src/ui/layout/SelectionInfo";

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

function spawnUnit(opts: {
	id: string;
	name: string;
	selected: boolean;
	faction?: "player" | "cultist";
	mark?: number;
	components?: { name: string; functional: boolean; material: "electronic" | "metal" | "plastic" }[];
}) {
	const e = world.spawn(
		EntityId({ value: opts.id }),
		Position({ x: 10, y: 0, z: 20 }),
		Faction({ value: opts.faction ?? "player" }),
		Fragment({ fragmentId: "frag_1" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: opts.name,
			speed: 3,
			selected: opts.selected,
			mark: opts.mark ?? 1,
		}),
		UnitComponents({
			componentsJson: serializeComponents(
				opts.components ?? [
					{ name: "camera", functional: true, material: "electronic" },
					{ name: "arms", functional: false, material: "metal" },
					{ name: "legs", functional: true, material: "metal" },
					{ name: "power_cell", functional: true, material: "electronic" },
				],
			),
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		Inventory({ inventoryJson: "{}" }),
		EngagementRule({ value: "attack" }),
	);
	spawnedEntities.push(e);
	return e;
}

test("shows 'No Selection' when nothing selected", async () => {
	root!.render(<SelectionInfo />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("No Selection");
});

test("shows unit displayName when entity selected", async () => {
	spawnUnit({ id: "sel_1", name: "Bot Alpha", selected: true });
	root!.render(<SelectionInfo />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("Bot Alpha");
	expect(text).not.toContain("No Selection");
});

test("shows component status (camera/arms/legs/power_cell)", async () => {
	spawnUnit({
		id: "sel_2",
		name: "Bot Beta",
		selected: true,
		components: [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "arms", functional: false, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		],
	});
	root!.render(<SelectionInfo />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("camera");
	expect(text).toContain("arms");
	expect(text).toContain("legs");
	expect(text).toContain("power cell");
	// Broken arms should show BROKEN
	expect(text).toContain("BROKEN");
});

test("shows HOSTILE badge for enemy faction", async () => {
	spawnUnit({
		id: "sel_3",
		name: "Cult Drone",
		selected: true,
		faction: "cultist",
	});
	root!.render(<SelectionInfo />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("HOSTILE");
});

test("deselecting reverts to No Selection", async () => {
	const entity = spawnUnit({ id: "sel_4", name: "Bot Gamma", selected: true });
	root!.render(<SelectionInfo />);
	await flush();

	expect(container!.textContent).toContain("Bot Gamma");

	// Deselect
	entity.set(Unit, { selected: false });
	// Re-render to pick up change
	root!.render(<SelectionInfo />);
	await flush();

	expect(container!.textContent).toContain("No Selection");
});

test("shows mark level for upgraded units", async () => {
	spawnUnit({
		id: "sel_5",
		name: "Bot Delta",
		selected: true,
		mark: 2,
	});
	root!.render(<SelectionInfo />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("MK2");
});
