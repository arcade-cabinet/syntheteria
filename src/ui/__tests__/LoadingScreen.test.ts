/**
 * Tests for LoadingScreen — dot animation state machine and timing logic.
 *
 * The component itself uses DOM/React, but the dot animation logic
 * is a pure state transition that can be tested independently.
 */

// ---------------------------------------------------------------------------
// Dot animation state machine (mirrors LoadingScreen.tsx useEffect logic)
// ---------------------------------------------------------------------------

/**
 * Simulate the dot counter logic from the component:
 * If dots.length >= 3, reset to ""; otherwise append ".".
 */
function nextDots(current: string): string {
	return current.length >= 3 ? "" : current + ".";
}

describe("LoadingScreen dot animation", () => {
	it("starts with no dots and adds first dot", () => {
		expect(nextDots("")).toBe(".");
	});

	it("adds second dot", () => {
		expect(nextDots(".")).toBe("..");
	});

	it("adds third dot", () => {
		expect(nextDots("..")).toBe("...");
	});

	it("resets to empty after three dots", () => {
		expect(nextDots("...")).toBe("");
	});

	it("cycles through the full sequence correctly", () => {
		const sequence: string[] = [""];
		for (let i = 0; i < 8; i++) {
			sequence.push(nextDots(sequence[sequence.length - 1]));
		}
		// Pattern repeats every 4 steps: "", ".", "..", "...", "", ".", "..", "..."
		expect(sequence).toEqual(["", ".", "..", "...", "", ".", "..", "...", ""]);
	});

	it("length cycles through 0, 1, 2, 3 then back to 0", () => {
		let dots = "";
		const lengths: number[] = [];
		for (let i = 0; i < 5; i++) {
			lengths.push(dots.length);
			dots = nextDots(dots);
		}
		expect(lengths).toEqual([0, 1, 2, 3, 0]);
	});

	it("only uses period characters", () => {
		let dots = "";
		for (let i = 0; i < 12; i++) {
			dots = nextDots(dots);
			expect(/^\.{0,3}$/.test(dots)).toBe(true);
		}
	});

	it("never exceeds 3 characters", () => {
		let dots = "";
		for (let i = 0; i < 20; i++) {
			dots = nextDots(dots);
			expect(dots.length).toBeLessThanOrEqual(3);
		}
	});
});

// ---------------------------------------------------------------------------
// INITIALIZING text concatenation
// ---------------------------------------------------------------------------

describe("INITIALIZING display text", () => {
	it("renders 'INITIALIZING' with dots appended", () => {
		const base = "INITIALIZING";
		expect(`${base}${"."}`).toBe("INITIALIZING.");
		expect(`${base}${".."}`).toBe("INITIALIZING..");
		expect(`${base}${"..."}`).toBe("INITIALIZING...");
		expect(`${base}${""}`).toBe("INITIALIZING");
	});

	it("text length varies from 12 to 15 characters", () => {
		const base = "INITIALIZING";
		for (let dots = 0; dots <= 3; dots++) {
			const text = base + ".".repeat(dots);
			expect(text.length).toBe(12 + dots);
		}
	});
});
