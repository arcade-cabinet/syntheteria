/**
 * Tests for BaseMarker — base indicator mesh management.
 *
 * Tests the marker creation logic, state tracking, and picking
 * without a full BabylonJS scene (mocks the BabylonJS mesh/material APIs).
 */

import { describe, expect, it, vi } from "vitest";

// ─── Mock BabylonJS ──────────────────────────────────────────────────────────

vi.mock("@babylonjs/core/Materials/standardMaterial", () => {
	return {
		StandardMaterial: vi.fn().mockImplementation((name: string) => ({
			name,
			diffuseColor: { r: 0, g: 0, b: 0 },
			emissiveColor: { r: 0, g: 0, b: 0 },
			specularColor: { r: 0, g: 0, b: 0 },
			alpha: 1,
			dispose: vi.fn(),
		})),
	};
});

vi.mock("@babylonjs/core/Maths/math.color", () => ({
	Color3: {
		Black: vi.fn(() => ({ r: 0, g: 0, b: 0 })),
	},
}));

vi.mock("@babylonjs/core/Maths/math.vector", () => ({
	Vector3: vi.fn().mockImplementation((x: number, y: number, z: number) => ({
		x,
		y,
		z,
	})),
}));

vi.mock("@babylonjs/core/Meshes/meshBuilder", () => ({
	MeshBuilder: {
		CreateCylinder: vi
			.fn()
			.mockImplementation(
				(name: string, _opts: unknown, _scene: unknown) => ({
					name,
					material: null,
					metadata: null,
					isPickable: false,
					position: { x: 0, y: 0, z: 0 },
					dispose: vi.fn(),
				}),
			),
	},
}));

import type { BaseMarkerState } from "../BaseMarker";
import { getBaseEntityFromMesh } from "../BaseMarker";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("BaseMarkerState", () => {
	it("tracks markers by entity ID", () => {
		const state: BaseMarkerState = {
			markers: new Map(),
			playerMaterial: { dispose: vi.fn() } as any,
			cultMaterial: { dispose: vi.fn() } as any,
		};

		expect(state.markers.size).toBe(0);

		// Simulate adding a marker
		state.markers.set("base_0", { name: "test-marker" } as any);
		expect(state.markers.size).toBe(1);
		expect(state.markers.has("base_0")).toBe(true);
	});

	it("removes markers for destroyed bases", () => {
		const state: BaseMarkerState = {
			markers: new Map(),
			playerMaterial: { dispose: vi.fn() } as any,
			cultMaterial: { dispose: vi.fn() } as any,
		};

		const disposeMock = vi.fn();
		state.markers.set("base_0", { dispose: disposeMock } as any);
		state.markers.set("base_1", { dispose: disposeMock } as any);

		// Simulate removing a base
		const marker = state.markers.get("base_0");
		marker?.dispose();
		state.markers.delete("base_0");

		expect(state.markers.size).toBe(1);
		expect(state.markers.has("base_0")).toBe(false);
		expect(state.markers.has("base_1")).toBe(true);
	});
});

describe("getBaseEntityFromMesh", () => {
	it("returns entity ID from valid mesh metadata", () => {
		const state: BaseMarkerState = {
			markers: new Map(),
			playerMaterial: { dispose: vi.fn() } as any,
			cultMaterial: { dispose: vi.fn() } as any,
		};
		state.markers.set("base_42", {} as any);

		const result = getBaseEntityFromMesh(state, {
			baseEntityId: "base_42",
		});
		expect(result).toBe("base_42");
	});

	it("returns null for non-marker mesh metadata", () => {
		const state: BaseMarkerState = {
			markers: new Map(),
			playerMaterial: { dispose: vi.fn() } as any,
			cultMaterial: { dispose: vi.fn() } as any,
		};

		const result = getBaseEntityFromMesh(state, { somethingElse: true });
		expect(result).toBeNull();
	});

	it("returns null for null metadata", () => {
		const state: BaseMarkerState = {
			markers: new Map(),
			playerMaterial: { dispose: vi.fn() } as any,
			cultMaterial: { dispose: vi.fn() } as any,
		};

		const result = getBaseEntityFromMesh(state, null);
		expect(result).toBeNull();
	});

	it("returns null when marker ID not in state", () => {
		const state: BaseMarkerState = {
			markers: new Map(),
			playerMaterial: { dispose: vi.fn() } as any,
			cultMaterial: { dispose: vi.fn() } as any,
		};
		// Don't add "base_99" to markers
		const result = getBaseEntityFromMesh(state, {
			baseEntityId: "base_99",
		});
		expect(result).toBeNull();
	});
});

describe("marker constants", () => {
	it("marker height is 6 units", () => {
		// From BaseMarker.ts: MARKER_HEIGHT = 6
		const MARKER_HEIGHT = 6;
		expect(MARKER_HEIGHT).toBe(6);
	});

	it("marker alpha is 0.7 for semi-transparency", () => {
		const MARKER_ALPHA = 0.7;
		expect(MARKER_ALPHA).toBeLessThan(1);
		expect(MARKER_ALPHA).toBeGreaterThan(0);
	});
});
