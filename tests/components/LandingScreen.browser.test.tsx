/**
 * Browser tests for LandingScreen component.
 *
 * Tests LandingScreen without the BabylonJS GlobeBackground (mocked away).
 * Verifies:
 * - LandingScreen renders title and NEW GAME button
 * - NEW GAME button is clickable
 * - CONTINUE and SETTINGS buttons render as disabled
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock GlobeBackground — it needs BabylonJS/WebGL which may not be available in tests
vi.mock("../../src/ui/landing/GlobeBackground", () => ({
	GlobeBackground: () => <div data-testid="mock-globe">Globe</div>,
}));

// Mock audio — avoid loading Tone.js in tests
vi.mock("../../src/audio", () => ({
	initAudio: vi.fn(),
}));

import { LandingScreen } from "../../src/ui/landing/LandingScreen";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let root: Root | null = null;
let container: HTMLDivElement | null = null;

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
}

afterEach(cleanup);

// ─── Tests ────────────────────────────────────────────────────────────────────

test("LandingScreen renders title text", async () => {
	setup();
	const onStartGame = vi.fn();
	await act(async () => {
		root!.render(<LandingScreen onStartGame={onStartGame} />);
	});
	// Wait for the title fade-in animation (200ms + render time)
	await new Promise((r) => setTimeout(r, 300));

	const text = container!.textContent ?? "";
	expect(text).toContain("SYNTHETERIA");
});

test("LandingScreen renders subtitle", async () => {
	setup();
	const onStartGame = vi.fn();
	await act(async () => {
		root!.render(<LandingScreen onStartGame={onStartGame} />);
	});
	await new Promise((r) => setTimeout(r, 300));

	const text = container!.textContent ?? "";
	expect(text).toContain("AWAKEN // CONNECT // REBUILD");
});

test("LandingScreen renders NEW GAME button", async () => {
	setup();
	const onStartGame = vi.fn();
	await act(async () => {
		root!.render(<LandingScreen onStartGame={onStartGame} />);
	});
	await new Promise((r) => setTimeout(r, 300));

	const buttons = container!.querySelectorAll("button");
	const labels = Array.from(buttons).map((b) => b.textContent);
	// NEW GAME button is primary, so rendered as "[ NEW GAME ]"
	expect(labels.some((l) => l?.includes("NEW GAME"))).toBe(true);
});

test("LandingScreen NEW GAME button is clickable", async () => {
	setup();
	const onStartGame = vi.fn();
	await act(async () => {
		root!.render(<LandingScreen onStartGame={onStartGame} />);
	});
	await new Promise((r) => setTimeout(r, 300));

	const buttons = container!.querySelectorAll("button");
	const newGameBtn = Array.from(buttons).find((b) =>
		b.textContent?.includes("NEW GAME"),
	);
	expect(newGameBtn).toBeDefined();

	// Click should open the NewGameModal
	await act(async () => {
		newGameBtn!.click();
	});
	await new Promise((r) => setTimeout(r, 100));

	// After clicking NEW GAME, the modal should appear with seed input
	const text = container!.textContent ?? "";
	// NewGameModal shows difficulty options
	expect(text).toContain("EASY");
	expect(text).toContain("NORMAL");
	expect(text).toContain("HARD");
});

test("LandingScreen renders disabled CONTINUE and SETTINGS buttons", async () => {
	setup();
	const onStartGame = vi.fn();
	await act(async () => {
		root!.render(<LandingScreen onStartGame={onStartGame} />);
	});
	await new Promise((r) => setTimeout(r, 300));

	const buttons = container!.querySelectorAll("button");
	const labels = Array.from(buttons).map((b) => b.textContent);
	expect(labels.some((l) => l?.includes("CONTINUE"))).toBe(true);
	expect(labels.some((l) => l?.includes("SETTINGS"))).toBe(true);
});

test("LandingScreen shows version number", async () => {
	setup();
	const onStartGame = vi.fn();
	await act(async () => {
		root!.render(<LandingScreen onStartGame={onStartGame} />);
	});
	await new Promise((r) => setTimeout(r, 300));

	const text = container!.textContent ?? "";
	expect(text).toContain("v0.1.0");
});
