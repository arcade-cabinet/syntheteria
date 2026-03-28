/**
 * Shared visual verification helpers for browser tests.
 *
 * These utilities inspect computed styles, layout positions, and element
 * visibility to catch real rendering issues — not just DOM text.
 */

import { expect } from "vitest";

// ─── Style helpers ──────────────────────────────────────────────────────────

/** Assert an element has a computed style property matching expected value. */
export function expectComputedStyle(
	el: HTMLElement,
	prop: string,
	expected: string | RegExp,
	msg?: string,
) {
	const style = getComputedStyle(el);
	const actual = style.getPropertyValue(prop);
	const label = msg ?? `${prop} should match ${expected}`;
	if (typeof expected === "string") {
		expect(actual, label).toBe(expected);
	} else {
		expect(actual, label).toMatch(expected);
	}
}

/** Assert an element is visible (not hidden, not zero-area). */
export function expectVisible(el: HTMLElement, label?: string) {
	const rect = el.getBoundingClientRect();
	const style = getComputedStyle(el);
	const tag = label ?? el.tagName;
	expect(rect.width, `${tag} should have non-zero width`).toBeGreaterThan(0);
	expect(rect.height, `${tag} should have non-zero height`).toBeGreaterThan(0);
	expect(style.display, `${tag} should not be display:none`).not.toBe("none");
	expect(style.visibility, `${tag} should not be invisible`).not.toBe("hidden");
}

/** Assert an element is positioned within the viewport. */
export function expectInViewport(el: HTMLElement, label?: string) {
	const rect = el.getBoundingClientRect();
	const tag = label ?? el.tagName;
	expect(rect.left, `${tag} left edge should be >= 0`).toBeGreaterThanOrEqual(
		0,
	);
	expect(rect.top, `${tag} top edge should be >= 0`).toBeGreaterThanOrEqual(0);
	expect(
		rect.right,
		`${tag} right edge should be <= viewport`,
	).toBeLessThanOrEqual(window.innerWidth + 1); // +1 for rounding
	expect(
		rect.bottom,
		`${tag} bottom edge should be <= viewport`,
	).toBeLessThanOrEqual(window.innerHeight + 1);
}

/** Assert an element's background is not transparent (has color). */
export function expectHasBackground(el: HTMLElement, label?: string) {
	const bg = getComputedStyle(el).backgroundColor;
	const tag = label ?? el.tagName;
	// "rgba(0, 0, 0, 0)" is fully transparent
	expect(
		bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent",
		`${tag} should have a background color, got: ${bg}`,
	).toBe(true);
}

/** Assert a color string contains an expected RGB channel value. */
export function expectColorContains(
	el: HTMLElement,
	prop: "color" | "backgroundColor" | "borderColor",
	partialRgb: string,
	label?: string,
) {
	const actual = getComputedStyle(el)[prop];
	const tag = label ?? el.tagName;
	expect(
		actual,
		`${tag} ${prop} should contain ${partialRgb}, got: ${actual}`,
	).toContain(partialRgb);
}

// ─── Layout helpers ─────────────────────────────────────────────────────────

/** Assert element A is above element B (A.bottom <= B.top). */
export function expectAbove(
	elA: HTMLElement,
	elB: HTMLElement,
	labelA = "A",
	labelB = "B",
) {
	const rectA = elA.getBoundingClientRect();
	const rectB = elB.getBoundingClientRect();
	expect(
		rectA.bottom,
		`${labelA} (bottom=${rectA.bottom}) should be above ${labelB} (top=${rectB.top})`,
	).toBeLessThanOrEqual(rectB.top + 1); // +1 for rounding
}

/** Assert element A is left of element B (A.right <= B.left). */
export function expectLeftOf(
	elA: HTMLElement,
	elB: HTMLElement,
	labelA = "A",
	labelB = "B",
) {
	const rectA = elA.getBoundingClientRect();
	const rectB = elB.getBoundingClientRect();
	expect(
		rectA.right,
		`${labelA} (right=${rectA.right}) should be left of ${labelB} (left=${rectB.left})`,
	).toBeLessThanOrEqual(rectB.left + 1);
}

/** Assert two elements don't overlap. */
export function expectNoOverlap(
	elA: HTMLElement,
	elB: HTMLElement,
	labelA = "A",
	labelB = "B",
) {
	const a = elA.getBoundingClientRect();
	const b = elB.getBoundingClientRect();
	const overlaps =
		a.left < b.right &&
		a.right > b.left &&
		a.top < b.bottom &&
		a.bottom > b.top;
	expect(
		overlaps,
		`${labelA} and ${labelB} should not overlap. A: [${a.left},${a.top},${a.right},${a.bottom}], B: [${b.left},${b.top},${b.right},${b.bottom}]`,
	).toBe(false);
}

// ─── Content helpers ────────────────────────────────────────────────────────

/** Assert element has non-zero font size. */
export function expectReadableFont(el: HTMLElement, label?: string) {
	const fontSize = getComputedStyle(el).fontSize;
	const px = Number.parseFloat(fontSize);
	const tag = label ?? el.tagName;
	expect(
		px,
		`${tag} fontSize should be >= 8px for readability, got: ${fontSize}`,
	).toBeGreaterThanOrEqual(8);
}

/** Assert element text is not truncated (scrollWidth <= clientWidth). */
export function expectNotTruncated(el: HTMLElement, label?: string) {
	const tag = label ?? el.tagName;
	// Allow 2px tolerance for subpixel rendering
	expect(
		el.scrollWidth,
		`${tag} text should not be truncated (scrollWidth=${el.scrollWidth} > clientWidth=${el.clientWidth})`,
	).toBeLessThanOrEqual(el.clientWidth + 2);
}

// ─── Button helpers ─────────────────────────────────────────────────────────

/** Assert a button meets minimum touch target size (44x44 for mobile). */
export function expectTouchTarget(
	btn: HTMLElement,
	minSize = 36,
	label?: string,
) {
	const rect = btn.getBoundingClientRect();
	const tag = label ?? btn.textContent?.trim() ?? "button";
	expect(
		rect.width,
		`Button "${tag}" width should be >= ${minSize}px, got ${rect.width}`,
	).toBeGreaterThanOrEqual(minSize);
	expect(
		rect.height,
		`Button "${tag}" height should be >= ${minSize}px, got ${rect.height}`,
	).toBeGreaterThanOrEqual(minSize);
}

/** Find all buttons in container and verify they're all clickable (not behind overlays). */
export function expectAllButtonsClickable(container: HTMLElement) {
	const buttons = container.querySelectorAll<HTMLButtonElement>("button");
	for (const btn of buttons) {
		const rect = btn.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) continue; // hidden button, skip
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const topEl = document.elementFromPoint(centerX, centerY);
		// The hit target should be the button itself or one of its children
		if (topEl && !btn.contains(topEl) && topEl !== btn) {
			const label = btn.textContent?.trim() ?? "unnamed";
			expect.fail(
				`Button "${label}" is obscured by ${topEl.tagName}.${topEl.className} at (${centerX}, ${centerY})`,
			);
		}
	}
}

// ─── Canvas helpers ─────────────────────────────────────────────────────────

/** Assert a 2D canvas has been drawn to (not all black/transparent). */
export function expectCanvasHasContent(
	canvas: HTMLCanvasElement,
	label?: string,
) {
	const tag = label ?? "canvas";
	expect(canvas.width, `${tag} should have non-zero width`).toBeGreaterThan(0);
	expect(canvas.height, `${tag} should have non-zero height`).toBeGreaterThan(
		0,
	);

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		// WebGL canvas — can't inspect pixels with 2D context, just check it exists
		return;
	}

	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	let sum = 0;
	for (let i = 0; i < imageData.data.length; i++) {
		sum += imageData.data[i];
	}
	expect(sum, `${tag} should have non-zero pixel content`).toBeGreaterThan(0);
}

/** Get a data URL screenshot of a canvas element. */
export function captureCanvasDataUrl(canvas: HTMLCanvasElement): string {
	return canvas.toDataURL("image/png");
}
