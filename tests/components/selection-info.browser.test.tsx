/**
 * Browser tests for SelectionInfo component.
 *
 * Renders the real SelectionInfo with real ECS entities in headed Chrome.
 * No mocks — Vite compiles everything.
 */

import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { SelectionInfo } from "../../src/components/game/SelectionInfo";
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
import { expectReadableFont, expectVisible } from "./visual-helpers";

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
	components?: {
		name: string;
		functional: boolean;
		material: "electronic" | "metal" | "plastic";
	}[];
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

test("component status dots have correct colors (green=functional, red=broken)", async () => {
	spawnUnit({
		id: "vis_1",
		name: "Visual Bot",
		selected: true,
		components: [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "arms", functional: false, material: "metal" },
		],
	});
	root!.render(<SelectionInfo />);
	await flush();

	// Find status dots (small round elements)
	const dots = container!.querySelectorAll<HTMLSpanElement>("span");
	const statusDots = Array.from(dots).filter((s) => {
		const style = getComputedStyle(s);
		return style.borderRadius === "9999px" && s.offsetWidth <= 10;
	});

	// Should have at least 2 dots (one green, one red)
	expect(
		statusDots.length,
		"should have component status dots",
	).toBeGreaterThanOrEqual(2);

	// Check that we have both green and red dots
	const bgColors = statusDots.map((d) => getComputedStyle(d).backgroundColor);
	// Green channel should dominate for functional, red channel for broken.
	// Extract RGB values and check channel dominance instead of exact values,
	// since Tailwind color resolution varies across environments.
	function parseRgb(c: string): [number, number, number] | null {
		const m = c.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)/);
		return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
	}
	const hasGreen = bgColors.some((c) => {
		const rgb = parseRgb(c);
		return rgb !== null && rgb[1] > rgb[0] && rgb[1] > 100; // green channel dominant and bright
	});
	const hasRed = bgColors.some((c) => {
		const rgb = parseRgb(c);
		return rgb !== null && rgb[0] > rgb[1] && rgb[0] > 150; // red channel dominant and bright
	});
	expect(
		hasGreen,
		`should have green dot for functional component, got: ${bgColors.join(", ")}`,
	).toBe(true);
	expect(
		hasRed,
		`should have red dot for broken component, got: ${bgColors.join(", ")}`,
	).toBe(true);
});

test("unit name has readable font and is visible", async () => {
	spawnUnit({ id: "vis_2", name: "Test Unit Alpha", selected: true });
	root!.render(<SelectionInfo />);
	await flush();

	// Find the unit name element (bold cyan text)
	const boldEls = container!.querySelectorAll<HTMLDivElement>("div");
	const nameEl = Array.from(boldEls).find(
		(d) =>
			d.textContent?.includes("Test Unit Alpha") &&
			Number(getComputedStyle(d).fontWeight) >= 700,
	);
	expect(nameEl, "should find unit name element").toBeDefined();
	expectVisible(nameEl!, "unit name");
	expectReadableFont(nameEl!, "unit name");
});

test("HOSTILE badge has red styling", async () => {
	spawnUnit({
		id: "vis_3",
		name: "Enemy Bot",
		selected: true,
		faction: "cultist",
	});
	root!.render(<SelectionInfo />);
	await flush();

	const spans = container!.querySelectorAll("span");
	const hostile = Array.from(spans).find((s) =>
		s.textContent?.includes("HOSTILE"),
	);
	expect(hostile, "HOSTILE badge should exist").toBeDefined();

	const color = getComputedStyle(hostile!).color;
	expect(color, "HOSTILE text should be red").toMatch(/rgb\(\s*2[0-9]{2}/);
});

test("No Selection state is visually centered", async () => {
	root!.render(<SelectionInfo />);
	await flush();

	const noSelEl = Array.from(container!.querySelectorAll("div")).find((d) =>
		d.textContent?.includes("No Selection"),
	);
	expect(noSelEl, "should find No Selection element").toBeDefined();
	const style = getComputedStyle(noSelEl!);
	expect(style.textAlign, "No Selection should be centered").toBe("center");
});

test("MK badge has distinct cyan styling", async () => {
	spawnUnit({ id: "vis_4", name: "Mk2 Bot", selected: true, mark: 2 });
	root!.render(<SelectionInfo />);
	await flush();

	const spans = container!.querySelectorAll("span");
	const mkBadge = Array.from(spans).find((s) => s.textContent?.includes("MK2"));
	expect(mkBadge, "MK2 badge should exist").toBeDefined();

	const color = getComputedStyle(mkBadge!).color;
	// Should be cyan-ish (blue+green channels high, red channel low)
	const m = color.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)/);
	expect(m, `MK badge should have rgb color, got: ${color}`).not.toBeNull();
	const [r, g, b] = [Number(m![1]), Number(m![2]), Number(m![3])];
	expect(
		g > r && b > r,
		`MK badge should be cyan (g=${g}, b=${b} > r=${r})`,
	).toBe(true);
});
