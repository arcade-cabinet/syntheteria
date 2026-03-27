/**
 * Browser E2E playthrough test.
 *
 * Renders the REAL App component in headed Chrome. Navigates from title
 * through narration into gameplay. No physics engine — collision detection
 * is tile-based via Yuka NavGraph.
 *
 * No mocks — Vite compiles everything including Reactylon.
 */

import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import {
	clearGovernorLog,
	enableAutoPlay,
	getGovernorLog,
} from "../../src/ai/governor/PlaytestGovernor";
import App from "../../src/app/App";
import { getSnapshot, simulationTick } from "../../src/ecs/gameState";
import { Faction, Unit } from "../../src/ecs/traits";
import { world } from "../../src/ecs/world";
import { movementSystem } from "../../src/systems/movement";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function setup() {
	container = document.createElement("div");
	container.id = "playtest-root";
	container.style.cssText = "width:100vw;height:100vh;position:fixed;inset:0;";
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

afterEach(cleanup);

async function flush(ms = 200) {
	await new Promise((r) => setTimeout(r, ms));
}

async function waitForText(text: string, timeoutMs = 8000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		if ((container!.textContent ?? "").includes(text)) return;
		await flush(100);
	}
	throw new Error(
		`Timed out waiting for "${text}" in DOM. Got: ${(container!.textContent ?? "").slice(0, 200)}`,
	);
}

function findButton(text: string): HTMLButtonElement | undefined {
	return Array.from(container!.querySelectorAll("button")).find((b) =>
		b.textContent?.includes(text),
	) as HTMLButtonElement | undefined;
}

test("full playthrough: title -> new game -> narration -> gameplay -> governor ticks", async () => {
	setup();

	// 1. Render App (no physics — tile-based collision via NavGraph)
	root!.render(<App />);
	await flush(500);

	// 2. Wait for landing page (title is in BabylonJS canvas, buttons are DOM)
	await waitForText("NEW GAME", 8000);
	expect(container!.textContent).toContain("NEW GAME");

	// 3. Click NEW GAME
	const newGameBtn = findButton("NEW GAME");
	expect(newGameBtn).toBeDefined();
	newGameBtn!.click();
	await flush(300);

	// 4. Click START in modal
	const startBtn = findButton("START");
	expect(startBtn).toBeDefined();
	startBtn!.click();
	await flush(500);

	// 5. Wait for narration, then SKIP
	await waitForText("SKIP", 5000);
	const skipBtn = findButton("SKIP");
	expect(skipBtn).toBeDefined();
	skipBtn!.click();
	await flush(2000);

	// 6. Gameplay phase — HUD should be visible
	// The GameCanvas renders via Reactylon/BabylonJS.
	// Check for any HUD text that indicates gameplay started.
	const bodyText = container!.textContent ?? "";
	const hasGameplay =
		bodyText.includes("UNITS") ||
		bodyText.includes("PAUSE") ||
		bodyText.includes("No Selection") ||
		bodyText.includes("HOSTILE");

	if (!hasGameplay) {
		// Story trigger dialogue may have fired — skip it
		const skip2 = findButton("SKIP");
		if (skip2) {
			skip2.click();
			await flush(2000);
		}
	}

	// 7. Enable governor and force-tick
	enableAutoPlay();
	clearGovernorLog();

	for (let i = 0; i < 100; i++) {
		movementSystem(0.25, 1);
		simulationTick();
	}

	// 8. Verify game state advanced
	const snap = getSnapshot();
	expect(snap.tick).toBeGreaterThan(0);

	// 9. Verify governor made decisions
	const log = getGovernorLog();
	expect(log.length).toBeGreaterThan(0);

	// 10. Verify units exist (direct query — snapshot may be stale)
	let playerCount = 0;
	for (const entity of world.query(Unit, Faction)) {
		if (entity.get(Faction)!.value === "player") playerCount++;
	}
	expect(playerCount).toBeGreaterThan(0);

	// 11. Verify action types
	const actionTypes = new Set(log.map((a) => a.action));
	expect(actionTypes.size).toBeGreaterThan(0);
});
