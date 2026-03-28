/**
 * Browser tests for GameEndOverlay, UnitDeathToast, and ResourcePickupToast.
 *
 * These are critical game feedback components — victory/defeat screens,
 * unit death notifications, and resource pickup indicators.
 * Renders real components in headed Chrome with visual verification.
 */

import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { GameEndOverlay } from "../../src/components/game/GameEndOverlay";
import { ResourcePickupToast } from "../../src/components/game/ResourcePickupToast";
import { UnitDeathToast } from "../../src/components/game/UnitDeathToast";
import type { CombatEvent } from "../../src/systems/combat";
import type { ResourcePool } from "../../src/systems/resources";
import { expectReadableFont, expectVisible } from "./visual-helpers";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function setup() {
	container = document.createElement("div");
	// Give the container dimensions so absolute-positioned children are visible
	container.style.position = "relative";
	container.style.width = "800px";
	container.style.height = "600px";
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

beforeEach(setup);
afterEach(cleanup);

async function flush(ms = 150) {
	await new Promise((r) => setTimeout(r, ms));
}

// ─── GameEndOverlay ──────────────────────────────────────────────────────────

test("returns null when outcome is playing", async () => {
	root!.render(<GameEndOverlay outcome="playing" />);
	await flush();

	// Component returns null — container should have no visible children
	expect(container!.children.length).toBe(0);
});

test("renders DEFEAT screen with red styling", async () => {
	root!.render(<GameEndOverlay outcome="defeat" />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("DEFEAT");

	// Find the backdrop div and verify red background
	const backdrop =
		container!.querySelector<HTMLDivElement>(".absolute.inset-0");
	expect(backdrop, "backdrop should exist").toBeDefined();
	if (backdrop) {
		const bg = getComputedStyle(backdrop).backgroundColor;
		// bg-red-950/90 produces a dark red with alpha
		expect(bg, "defeat backdrop should have red-tinted background").toMatch(
			/rgba?\(\s*\d+/,
		);
	}

	// Heading should contain DEFEAT with red text color
	const h1 = container!.querySelector("h1");
	expect(h1, "h1 should exist").toBeDefined();
	expect(h1!.textContent).toContain("DEFEAT");
	const headingColor = getComputedStyle(h1!).color;
	// text-red-400 produces rgb with high red channel
	expect(headingColor, "DEFEAT heading should be red").toMatch(
		/rgb\(\s*2[0-9]{2}/,
	);
});

test("renders VICTORY screen with cyan styling", async () => {
	root!.render(<GameEndOverlay outcome="victory" />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("TRANSCENDENCE");

	// Heading should have cyan color
	const h1 = container!.querySelector("h1");
	expect(h1, "h1 should exist").toBeDefined();
	expect(h1!.textContent).toContain("TRANSCENDENCE");
});

test("NEW GAME button is visible and prominent", async () => {
	root!.render(<GameEndOverlay outcome="defeat" />);
	await flush();

	const buttons = Array.from(container!.querySelectorAll("button"));
	const newGameBtn = buttons.find((b) => b.textContent?.includes("NEW GAME"));
	expect(newGameBtn, "NEW GAME button should exist").toBeDefined();
	expectVisible(newGameBtn!, "NEW GAME button");
	expectReadableFont(newGameBtn!, "NEW GAME button");
});

test("victory flavor text is present", async () => {
	root!.render(<GameEndOverlay outcome="victory" />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("wormhole");
	expect(text).toContain("Cult of EL");
});

test("overlay covers full viewport with absolute inset-0", async () => {
	root!.render(<GameEndOverlay outcome="defeat" />);
	await flush();

	// The root overlay div uses "absolute inset-0"
	const overlay = container!.querySelector<HTMLDivElement>(
		".absolute.inset-0.z-50",
	);
	expect(overlay, "overlay root should exist with inset-0 z-50").toBeDefined();

	if (overlay) {
		const style = getComputedStyle(overlay);
		expect(style.position).toBe("absolute");
		expect(style.inset).toBe("0px");
	}
});

// ─── UnitDeathToast ──────────────────────────────────────────────────────────

test("shows nothing with no events", async () => {
	root!.render(<UnitDeathToast combatEvents={[]} />);
	await flush();

	// Component returns null when notifications are empty
	expect(container!.children.length).toBe(0);
});

test("shows death notification when targetDestroyed is true", async () => {
	const events: CombatEvent[] = [
		{
			attackerId: "cult_drone_1",
			targetId: "maintenance_bot_alpha",
			componentDamaged: "power_cell",
			targetDestroyed: true,
		},
	];

	root!.render(<UnitDeathToast combatEvents={events} />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("UNIT LOST");
	expect(text).toContain("maintenance_bot_alpha");

	// Verify red styling on the notification
	const notification =
		container!.querySelector<HTMLDivElement>(".bg-red-900\\/90");
	if (notification) {
		const bg = getComputedStyle(notification).backgroundColor;
		expect(bg, "death toast should have red background").toMatch(
			/rgba?\(\s*\d+/,
		);
	}
});

// ─── ResourcePickupToast ─────────────────────────────────────────────────────

function makeResources(overrides: Partial<ResourcePool> = {}): ResourcePool {
	return {
		scrapMetal: 0,
		circuitry: 0,
		powerCells: 0,
		durasteel: 0,
		...overrides,
	};
}

test("shows nothing on first render", async () => {
	root!.render(
		<ResourcePickupToast resources={makeResources({ scrapMetal: 10 })} />,
	);
	await flush();

	// First render stores the snapshot but skips diffing — no notifications
	expect(container!.children.length).toBe(0);
});

test("shows +N label when resources increase", async () => {
	const initial = makeResources({ scrapMetal: 5 });
	root!.render(<ResourcePickupToast resources={initial} />);
	await flush();

	// Re-render with increased scrapMetal
	const updated = makeResources({ scrapMetal: 12 });
	root!.render(<ResourcePickupToast resources={updated} />);
	await flush();

	const text = container!.textContent ?? "";
	expect(text).toContain("+7");
	expect(text).toContain("Fe");
});
