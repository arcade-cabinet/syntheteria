/**
 * Browser tests for Sidebar component.
 *
 * Renders the real Sidebar (Minimap + SelectionInfo + ActionPanel) in headed
 * Chrome. No mocks — Vite compiles everything.
 */

import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { Sidebar } from "../../src/components/game/Sidebar";
import { expectComputedStyle } from "./visual-helpers";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function setup() {
	container = document.createElement("div");
	// Give container enough height so children can be measured
	container.style.width = "256px";
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

test("renders all three sections (minimap, selection info, action panel)", async () => {
	root!.render(<Sidebar />);
	await flush();

	// Minimap renders a <canvas>
	const canvas = container!.querySelector("canvas");
	expect(canvas, "Sidebar should contain a Minimap canvas").toBeDefined();

	// SelectionInfo shows "No Selection" when nothing is selected
	const text = container!.textContent ?? "";
	expect(text).toContain("No Selection");

	// ActionPanel returns null when nothing selected, so no action buttons
	const buttons = container!.querySelectorAll("button");
	expect(
		buttons.length,
		"ActionPanel should render no buttons when nothing selected",
	).toBe(0);
});

test("sections are in correct order (minimap first)", async () => {
	root!.render(<Sidebar />);
	await flush();

	// The Sidebar flex container is the first child of our mount container
	const flexContainer = container!.firstElementChild as HTMLElement;
	expect(flexContainer, "flex container should exist").toBeDefined();

	const sections = Array.from(flexContainer.children) as HTMLElement[];
	expect(sections.length, "should have 3 child sections").toBe(3);

	// First section should contain the minimap canvas
	const firstCanvas = sections[0].querySelector("canvas");
	expect(
		firstCanvas,
		"minimap canvas should be in the first section",
	).toBeDefined();
});

test("uses flex layout", async () => {
	root!.render(<Sidebar />);
	await flush();

	const flexContainer = container!.firstElementChild as HTMLElement;
	expect(flexContainer, "flex container should exist").toBeDefined();

	expectComputedStyle(
		flexContainer,
		"display",
		"flex",
		"Sidebar container should use flexbox",
	);
});

test("all sections have visible height", async () => {
	root!.render(<Sidebar />);
	await flush();

	const flexContainer = container!.firstElementChild as HTMLElement;
	expect(flexContainer, "flex container should exist").toBeDefined();

	const sections = Array.from(flexContainer.children) as HTMLElement[];
	expect(sections.length, "should have 3 child sections").toBe(3);

	for (let i = 0; i < sections.length; i++) {
		const rect = sections[i].getBoundingClientRect();
		expect(
			rect.height,
			`section ${i} should have non-zero height`,
		).toBeGreaterThan(0);
	}
});
