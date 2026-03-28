/**
 * Browser tests for NarrativeOverlay component.
 *
 * Renders the real NarrativeOverlay in headed Chromium and verifies:
 * - NarrativeOverlay renders with a sequence
 * - SKIP button is visible and clickable
 * - Progress dots are rendered for each frame
 * - Click on overlay advances text
 */

import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import type { DialogueSequence } from "../../src/config/narrativeDefs";
import { NarrativeOverlay } from "../../src/views/game/NarrativeOverlay";

// ─── Test data ────────────────────────────────────────────────────────────────

const TEST_SEQUENCE: DialogueSequence = {
	id: "test",
	frames: [
		{ text: "First frame text.", speaker: "SYSTEM", mood: "glitch", delay: 0 },
		{ text: "Second frame text.", mood: "calm", delay: 0 },
		{ text: "Third and final frame.", mood: "urgent", delay: 0 },
	],
};

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

async function flush(ms = 50) {
	await new Promise((r) => setTimeout(r, ms));
}

function renderOverlay(onComplete: () => void) {
	root!.render(
		<NarrativeOverlay sequence={TEST_SEQUENCE} onComplete={onComplete} />,
	);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("NarrativeOverlay renders with a sequence", async () => {
	setup();
	const onComplete = vi.fn();
	renderOverlay(onComplete);
	await flush();

	// The overlay should be in the DOM
	expect(container!.children.length).toBeGreaterThan(0);
});

test("NarrativeOverlay SKIP button is visible and clickable", async () => {
	setup();
	const onComplete = vi.fn();
	renderOverlay(onComplete);
	await flush();

	const skipButton = container!.querySelector("button");
	expect(skipButton).not.toBeNull();
	expect(skipButton!.textContent).toBe("SKIP");

	skipButton!.click();
	await flush();

	expect(onComplete).toHaveBeenCalledTimes(1);
});

test("NarrativeOverlay renders progress dots for each frame", async () => {
	setup();
	const onComplete = vi.fn();
	renderOverlay(onComplete);
	await flush();

	const allDivs = container!.querySelectorAll("div");
	const dots = Array.from(allDivs).filter((d) => {
		const style = d.style;
		return style.width === "6px" && style.height === "6px";
	});
	expect(dots.length).toBe(3);
});

test("NarrativeOverlay shows speaker label", async () => {
	setup();
	const onComplete = vi.fn();
	renderOverlay(onComplete);
	await flush(100);

	const text = container!.textContent ?? "";
	expect(text).toContain("SYSTEM");
});

test("NarrativeOverlay typewriter starts displaying text", async () => {
	setup();
	const onComplete = vi.fn();
	renderOverlay(onComplete);
	await flush(300);

	const text = container!.textContent ?? "";
	expect(text).toContain("First");
});

test("NarrativeOverlay click completes current typing then advances", async () => {
	setup();
	const onComplete = vi.fn();
	renderOverlay(onComplete);
	await flush(100);

	const overlay = container!.querySelector("[role='button']");
	expect(overlay).not.toBeNull();

	// First click: complete typing of first frame
	(overlay as HTMLElement).click();
	await flush();

	const textAfterFirstClick = container!.textContent ?? "";
	expect(textAfterFirstClick).toContain("First frame text.");

	// Second click: advance to second frame
	(overlay as HTMLElement).click();
	await flush(100);

	expect(onComplete).not.toHaveBeenCalled();
});

test("NarrativeOverlay covers full viewport (fullscreen)", async () => {
	setup();
	const onComplete = vi.fn();
	renderOverlay(onComplete);
	await flush();

	const overlay = container!.querySelector("[role='button']") as HTMLDivElement;
	expect(overlay, "overlay root should exist").not.toBeNull();

	const style = overlay.style;
	expect(style.position, "overlay should be absolute").toBe("absolute");
	expect(
		style.inset === "0" || style.inset === "0px",
		`overlay should have inset: 0, got: ${style.inset}`,
	).toBe(true);
	expect(
		style.background === "#000" || style.background.includes("rgb(0, 0, 0)"),
		`overlay should have black background, got: ${style.background}`,
	).toBe(true);
});

test("SKIP button is in top-right corner", async () => {
	setup();
	const onComplete = vi.fn();
	renderOverlay(onComplete);
	await flush();

	const skipBtn = container!.querySelector("button") as HTMLButtonElement;
	expect(skipBtn, "SKIP button should exist").not.toBeNull();

	const style = skipBtn.style;
	expect(style.position, "SKIP should be absolute").toBe("absolute");
	expect(style.top, "SKIP should be at top").toBe("20px");
	expect(style.right, "SKIP should be at right").toBe("20px");
});

test("progress dots are positioned at bottom", async () => {
	setup();
	const onComplete = vi.fn();
	renderOverlay(onComplete);
	await flush();

	const allDivs = container!.querySelectorAll("div");
	const dotContainer = Array.from(allDivs).find((d) => {
		return d.style.bottom === "30px" && d.style.display === "flex";
	});
	expect(dotContainer, "dot container should exist at bottom").toBeDefined();
	expect(dotContainer!.style.gap, "dots should have gap").toBe("8px");
});

test("active progress dot has brighter color than inactive dots", async () => {
	setup();
	const onComplete = vi.fn();
	renderOverlay(onComplete);
	await flush(100);

	const allDivs = container!.querySelectorAll("div");
	const dots = Array.from(allDivs).filter(
		(d) => d.style.width === "6px" && d.style.height === "6px",
	);
	expect(dots.length, "should have 3 progress dots").toBe(3);

	const activeBg = dots[0].style.background;
	const inactiveBg = dots[1].style.background;
	expect(activeBg, "active dot should have color").toBeTruthy();
	expect(inactiveBg, "inactive dot should have color").toBeTruthy();
	expect(activeBg, "active and inactive dots should differ").not.toBe(
		inactiveBg,
	);
});

test("text uses monospace font family", async () => {
	setup();
	const onComplete = vi.fn();
	renderOverlay(onComplete);
	await flush(300);

	const overlay = container!.querySelector("[role='button']") as HTMLDivElement;
	const textDivs = overlay.querySelectorAll("div");
	const textEl = Array.from(textDivs).find((d) =>
		d.style.fontFamily?.includes("Courier"),
	);
	expect(textEl, "text should use Courier New font family").toBeDefined();
});
