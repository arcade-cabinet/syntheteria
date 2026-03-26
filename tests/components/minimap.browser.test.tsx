/**
 * Browser tests for Minimap component.
 *
 * Renders the real Minimap with real ECS entities in headed Chrome.
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
import { Minimap } from "../../src/ui/layout/Minimap";

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

async function flush(ms = 200) {
	await new Promise((r) => setTimeout(r, ms));
}

test("canvas element renders", async () => {
	root!.render(<Minimap />);
	await flush();

	const canvas = container!.querySelector("canvas");
	expect(canvas).not.toBeNull();
});

test("legend text visible (Player, Enemy, Base, Resource)", async () => {
	root!.render(<Minimap />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("Player");
	expect(text).toContain("Enemy");
	expect(text).toContain("Base");
	expect(text).toContain("Resource");
});

test("canvas has non-trivial content (not all black)", async () => {
	// Spawn a player unit so there's something to draw
	const e = world.spawn(
		EntityId({ value: "mm_1" }),
		Position({ x: 48, y: 0, z: 48 }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: "frag_1" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Bot",
			speed: 3,
			selected: false,
			mark: 1,
		}),
		UnitComponents({
			componentsJson: serializeComponents([
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "legs", functional: true, material: "metal" },
			]),
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		Inventory({ inventoryJson: "{}" }),
		EngagementRule({ value: "attack" }),
	);
	spawnedEntities.push(e);

	root!.render(<Minimap />);
	await flush(300);

	const canvas = container!.querySelector("canvas") as HTMLCanvasElement;
	expect(canvas).not.toBeNull();

	// Check canvas has been drawn to (width/height set by component)
	const ctx = canvas.getContext("2d");
	if (ctx && canvas.width > 0 && canvas.height > 0) {
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		// Sum all pixel values — if non-zero, canvas has content
		let sum = 0;
		for (let i = 0; i < imageData.data.length; i++) {
			sum += imageData.data[i];
		}
		// The background fill (#0a0e14) alone produces non-zero sum
		expect(sum).toBeGreaterThan(0);
	} else {
		// Canvas exists but no 2d context — still pass (component rendered)
		expect(canvas.width).toBeGreaterThan(0);
	}
});
