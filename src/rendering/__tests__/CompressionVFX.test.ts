/**
 * Tests for CompressionVFX pure utility functions.
 *
 * The React components (CameraShakeFromCompression, CompressionFlashOverlay)
 * require R3F Canvas context and are not tested here. The pure functions
 * computeShakeDisplacement, computeFlashColor, and computeVignetteOpacity
 * are fully testable without WebGL.
 */

// ---------------------------------------------------------------------------
// Mock compressionJuice to avoid importing the real system
// ---------------------------------------------------------------------------

jest.mock("../../systems/compressionJuice", () => ({
	getCompressionPhase: jest.fn(() => "idle"),
	getCompressionProgress: jest.fn(() => 0),
	isCompressionActive: jest.fn(() => false),
	updateCompression: jest.fn(() => ({
		active: false,
		progress: 0,
		phase: "idle",
		pressure: 0,
		temperature: 0,
		inDangerZone: false,
		shakeIntensity: 0,
		shakeFrequency: 0,
		flashIntensity: 0,
		flashColor: "255,255,200",
		vignetteIntensity: 0,
		soundEvents: [],
		pitchModifier: 1,
		particleEvents: [],
		showOverlay: false,
		overlayColor: "#ff6600",
		statusText: "",
	})),
}));

import {
	computeShakeDisplacement,
	computeFlashColor,
	computeVignetteOpacity,
} from "../CompressionVFX";
import type { CompressionFrame } from "../../systems/compressionJuice";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeFrame(overrides: Partial<CompressionFrame> = {}): CompressionFrame {
	return {
		active: true,
		progress: 0.5,
		phase: "building",
		pressure: 0.5,
		temperature: 0.4,
		inDangerZone: false,
		shakeIntensity: 0.5,
		shakeFrequency: 4,
		flashIntensity: 0,
		flashColor: "255,255,200",
		vignetteIntensity: 0.3,
		soundEvents: [],
		pitchModifier: 1,
		particleEvents: [],
		showOverlay: true,
		overlayColor: "#ff6600",
		statusText: "COMPRESSING...",
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// computeShakeDisplacement
// ---------------------------------------------------------------------------

describe("computeShakeDisplacement", () => {
	it("returns zero displacement when intensity is 0", () => {
		const result = computeShakeDisplacement(0, 4, 1.0);
		expect(result.dx).toBe(0);
		expect(result.dy).toBe(0);
		expect(result.dz).toBe(0);
	});

	it("returns zero displacement when intensity is negative", () => {
		const result = computeShakeDisplacement(-0.5, 4, 1.0);
		expect(result.dx).toBe(0);
		expect(result.dy).toBe(0);
		expect(result.dz).toBe(0);
	});

	it("returns non-zero displacement when intensity is positive", () => {
		const result = computeShakeDisplacement(1.0, 4, 0.5);
		const magnitude = Math.sqrt(result.dx ** 2 + result.dy ** 2 + result.dz ** 2);
		expect(magnitude).toBeGreaterThan(0);
	});

	it("displacement magnitude scales with intensity", () => {
		const low = computeShakeDisplacement(0.1, 4, 0.25);
		const high = computeShakeDisplacement(1.0, 4, 0.25);
		const lowMag = Math.sqrt(low.dx ** 2 + low.dy ** 2 + low.dz ** 2);
		const highMag = Math.sqrt(high.dx ** 2 + high.dy ** 2 + high.dz ** 2);
		expect(highMag).toBeGreaterThan(lowMag);
	});

	it("displacement stays within reasonable bounds even at max intensity", () => {
		// Max amplitude is 0.12 per component
		for (let t = 0; t < 10; t += 0.1) {
			const { dx, dy, dz } = computeShakeDisplacement(1.0, 8, t);
			expect(Math.abs(dx)).toBeLessThanOrEqual(0.15);
			expect(Math.abs(dy)).toBeLessThanOrEqual(0.15);
			expect(Math.abs(dz)).toBeLessThanOrEqual(0.15);
		}
	});

	it("returns numeric values for all fields", () => {
		const result = computeShakeDisplacement(0.5, 3, 2.7);
		expect(typeof result.dx).toBe("number");
		expect(typeof result.dy).toBe("number");
		expect(typeof result.dz).toBe("number");
	});

	it("different times produce different displacements (not periodic at short intervals)", () => {
		const r1 = computeShakeDisplacement(1.0, 4, 0.1);
		const r2 = computeShakeDisplacement(1.0, 4, 0.2);
		// Not all components will match at different times
		const same = r1.dx === r2.dx && r1.dy === r2.dy && r1.dz === r2.dz;
		expect(same).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// computeFlashColor
// ---------------------------------------------------------------------------

describe("computeFlashColor", () => {
	it("returns null when frame is inactive", () => {
		const result = computeFlashColor(makeFrame({ active: false, flashIntensity: 0.5 }));
		expect(result).toBeNull();
	});

	it("returns null when flashIntensity is 0", () => {
		const result = computeFlashColor(makeFrame({ active: true, flashIntensity: 0 }));
		expect(result).toBeNull();
	});

	it("returns null when flashIntensity is near 0", () => {
		const result = computeFlashColor(makeFrame({ active: true, flashIntensity: 0.005 }));
		expect(result).toBeNull();
	});

	it("returns an rgba string when active and flashIntensity > 0.01", () => {
		const result = computeFlashColor(makeFrame({ active: true, flashIntensity: 0.5 }));
		expect(result).not.toBeNull();
		expect(result).toMatch(/^rgba\(/);
	});

	it("includes the flashColor in the output", () => {
		const result = computeFlashColor(makeFrame({
			active: true,
			flashIntensity: 0.5,
			flashColor: "255,0,0",
		}));
		expect(result).toContain("255,0,0");
	});

	it("clamps alpha to max 0.9", () => {
		const result = computeFlashColor(makeFrame({
			active: true,
			flashIntensity: 1.5,
			flashColor: "255,255,200",
		}));
		expect(result).toContain("0.90");
	});

	it("uses fallback color when flashColor is empty string", () => {
		const result = computeFlashColor(makeFrame({
			active: true,
			flashIntensity: 0.5,
			flashColor: "",
		}));
		expect(result).not.toBeNull();
		// Should use the fallback "255,255,200"
		expect(result).toContain("255,255,200");
	});
});

// ---------------------------------------------------------------------------
// computeVignetteOpacity
// ---------------------------------------------------------------------------

describe("computeVignetteOpacity", () => {
	it("returns 0 when frame is inactive", () => {
		const result = computeVignetteOpacity(makeFrame({ active: false, vignetteIntensity: 0.5 }));
		expect(result).toBe(0);
	});

	it("returns 0 when vignetteIntensity is 0", () => {
		const result = computeVignetteOpacity(makeFrame({ active: true, vignetteIntensity: 0 }));
		expect(result).toBe(0);
	});

	it("returns vignetteIntensity when active", () => {
		const result = computeVignetteOpacity(makeFrame({ active: true, vignetteIntensity: 0.4 }));
		expect(result).toBe(0.4);
	});

	it("clamps to 0.85 max", () => {
		const result = computeVignetteOpacity(makeFrame({ active: true, vignetteIntensity: 1.5 }));
		expect(result).toBeLessThanOrEqual(0.85);
	});

	it("returns 0 when vignetteIntensity is undefined", () => {
		const frame = makeFrame({ active: true });
		delete (frame as Partial<CompressionFrame>).vignetteIntensity;
		const result = computeVignetteOpacity(frame);
		expect(result).toBe(0);
	});
});
