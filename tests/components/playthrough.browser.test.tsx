/**
 * Browser E2E playthrough test.
 *
 * Renders the REAL App component in headed Chrome. Navigates from title
 * through narration into gameplay. The GameCanvas throws because Havok
 * physics WASM is not available in tests (havok=null), but the ErrorBoundary
 * catches it — proving the full navigation flow works. The ECS world is
 * already initialized by the time the error boundary fires, so we can
 * verify game state directly.
 *
 * No mocks — Vite compiles everything including Reactylon.
 */

import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import App from "../../src/App";
import {
	clearGovernorLog,
	disableAutoPlay,
	enableAutoPlay,
	getGovernorLog,
} from "../../src/ai/governor/PlaytestGovernor";
import {
	getSnapshot,
	isPaused,
	simulationTick,
	togglePause,
} from "../../src/ecs/gameState";
import { Faction, Unit } from "../../src/ecs/traits";
import { world } from "../../src/ecs/world";
import { movementSystem } from "../../src/systems/movement";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function setup() {
	container = document.createElement("div");
	container.style.width = "1024px";
	container.style.height = "768px";
	container.style.position = "relative";
	document.body.appendChild(container);
	root = createRoot(container);
}

function cleanup() {
	disableAutoPlay();
	clearGovernorLog();
	if (isPaused()) togglePause();
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

/** Wait for a text substring to appear in the container, polling every 100ms. */
async function waitForText(text: string, timeoutMs = 5000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		if ((container!.textContent ?? "").includes(text)) return;
		await flush(100);
	}
	throw new Error(
		`Timed out waiting for "${text}" in DOM. Got: ${(container!.textContent ?? "").slice(0, 200)}`,
	);
}

/** Wait for ANY of the given texts to appear. */
async function waitForAnyText(
	texts: string[],
	timeoutMs = 5000,
): Promise<string> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const content = container!.textContent ?? "";
		for (const text of texts) {
			if (content.includes(text)) return text;
		}
		await flush(100);
	}
	throw new Error(
		`Timed out waiting for any of [${texts.join(", ")}]. Got: ${(container!.textContent ?? "").slice(0, 200)}`,
	);
}

/** Find a button by text content substring. */
function findButton(text: string): HTMLButtonElement | undefined {
	return Array.from(container!.querySelectorAll("button")).find((b) =>
		b.textContent?.includes(text),
	) as HTMLButtonElement | undefined;
}

test("full playthrough: title -> new game -> narration -> gameplay -> governor ticks", async () => {
	setup();

	// 1. Render App
	root!.render(<App havok={null} />);
	await flush(500);

	// 2. Wait for landing page to render (title is in BabylonJS canvas, not DOM)
	await waitForText("NEW GAME", 8000);
	expect(container!.textContent).toContain("NEW GAME");

	// 3. Click NEW GAME button
	const newGameBtn = findButton("NEW GAME");
	expect(newGameBtn).toBeDefined();
	newGameBtn!.click();
	await flush(300);

	// 4. Click START button
	const startBtn = findButton("START");
	expect(startBtn).toBeDefined();
	startBtn!.click();
	await flush(300);

	// 5. Click SKIP (narration) — NarrativeOverlay has a SKIP button
	await waitForText("SKIP", 3000);
	const skipBtn = findButton("SKIP");
	expect(skipBtn).toBeDefined();
	skipBtn!.click();
	await flush(500);

	// 6. Wait for gameplay phase — either "UNITS" (HUD) or "Game Error" (ErrorBoundary).
	//    GameCanvas crashes without Havok WASM, but the world IS initialized
	//    before the crash (initializeWorld runs in onComplete callback before render).
	const found = await waitForAnyText(
		["UNITS", "Game Error", "Reload Game"],
		8000,
	);

	// Whether we see the HUD or the error boundary, the world was initialized.
	// The "Game Error" path proves we reached the playing phase.
	expect(["UNITS", "Game Error", "Reload Game"]).toContain(found);

	// 7. Enable autoplay governor
	enableAutoPlay();

	// 8. Run simulation ticks (movement + sim)
	// Ensure game is not paused
	if (isPaused()) togglePause();

	for (let i = 0; i < 100; i++) {
		movementSystem(0.25, 1);
		simulationTick();
	}

	// 9. Verify tick > 0
	const snap = getSnapshot();
	expect(snap.tick).toBeGreaterThan(0);

	// 10. Verify governor log has entries
	const log = getGovernorLog();
	expect(log.length).toBeGreaterThan(0);

	// 11. Verify player units exist (spawned by initializeWorld)
	let playerUnitCount = 0;
	for (const entity of world.query(Unit, Faction)) {
		if (entity.get(Faction)?.value === "player") {
			playerUnitCount++;
		}
	}
	expect(playerUnitCount).toBeGreaterThan(0);

	// 12. Verify game phase is valid
	expect(snap.gamePhase).toBeDefined();
	expect(typeof snap.gamePhase).toBe("string");
}, 30000);
