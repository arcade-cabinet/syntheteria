/**
 * Browser tests for LandingScreen.
 *
 * Renders the real LandingScreen component in headed Chrome.
 * GlobeBackground is the only mock — it uses Reactylon which requires
 * Webpack's babel-plugin-reactylon (not available in Vite/vitest).
 */

import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

// GlobeBackground uses Reactylon Engine which needs babel-plugin-reactylon (Webpack only)
vi.mock("../../src/ui/landing/GlobeBackground", () => ({
	GlobeBackground: () => <div data-testid="globe-stub" />,
}));

import {
	LandingScreen,
	type NewGameConfig,
} from "../../src/ui/landing/LandingScreen";

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

async function flush(ms = 100) {
	await new Promise((r) => setTimeout(r, ms));
}

function render(onStart: (c: NewGameConfig) => void = () => {}) {
	root!.render(<LandingScreen onStartGame={onStart} />);
}

test("title SYNTHETERIA renders", async () => {
	setup();
	render();
	await flush(300);
	expect(container!.textContent).toContain("SYNTHETERIA");
});

test("subtitle visible", async () => {
	setup();
	render();
	await flush(300);
	expect(container!.textContent).toContain("AWAKEN");
	expect(container!.textContent).toContain("REBUILD");
});

test("NEW GAME button enabled and clickable", async () => {
	setup();
	let clicked = false;
	render(() => {
		clicked = true;
	});
	await flush(300);

	const buttons = container!.querySelectorAll("button");
	const newGame = Array.from(buttons).find((b) =>
		b.textContent?.includes("NEW GAME"),
	);
	expect(newGame).toBeDefined();
	expect(newGame!.disabled).toBe(false);
});

test("CONTINUE button is disabled", async () => {
	setup();
	render();
	await flush(300);

	const buttons = container!.querySelectorAll("button");
	const cont = Array.from(buttons).find((b) =>
		b.textContent?.includes("CONTINUE"),
	);
	expect(cont).toBeDefined();
	expect(cont!.disabled).toBe(true);
});

test("SETTINGS button is disabled", async () => {
	setup();
	render();
	await flush(300);

	const buttons = container!.querySelectorAll("button");
	const settings = Array.from(buttons).find((b) =>
		b.textContent?.includes("SETTINGS"),
	);
	expect(settings).toBeDefined();
	expect(settings!.disabled).toBe(true);
});

test("version number visible", async () => {
	setup();
	render();
	await flush(300);
	expect(container!.textContent).toContain("v0.1.0");
});

test("clicking NEW GAME opens modal with START button", async () => {
	setup();
	render();
	await flush(300);

	const newGame = Array.from(container!.querySelectorAll("button")).find((b) =>
		b.textContent?.includes("NEW GAME"),
	);
	newGame!.click();
	await flush(100);

	// Modal should now show START button
	const start = Array.from(container!.querySelectorAll("button")).find((b) =>
		b.textContent?.includes("START"),
	);
	expect(start).toBeDefined();
});
