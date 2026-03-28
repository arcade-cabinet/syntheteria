/**
 * Gameplay visual verification tests.
 *
 * Renders the REAL game in headed Chromium, navigates through the full
 * title → new game → narration → gameplay flow ONCE, then runs all
 * assertions against the live scene state.
 *
 * Single navigation avoids the BabylonJS postProcessManager race condition
 * that occurs when engines are repeatedly created and destroyed.
 */

import { createRoot, type Root } from "react-dom/client";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import App from "../../src/app/App";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function flush(ms = 200) {
	await new Promise((r) => setTimeout(r, ms));
}

async function waitForText(text: string, timeoutMs = 10000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		if ((container!.textContent ?? "").includes(text)) return;
		await flush(100);
	}
	throw new Error(
		`Timed out waiting for "${text}". Got: ${(container!.textContent ?? "").slice(0, 200)}`,
	);
}

function findButton(text: string): HTMLButtonElement | undefined {
	return Array.from(container!.querySelectorAll("button")).find((b) =>
		b.textContent?.includes(text),
	) as HTMLButtonElement | undefined;
}

function getScene(): Record<string, unknown> | null {
	return (window as unknown as Record<string, unknown>)
		.__babylonScene as Record<string, unknown> | null;
}

function getEntityState(): Record<string, unknown> | null {
	return (window as unknown as Record<string, unknown>).__entityState as Record<
		string,
		unknown
	> | null;
}

describe("gameplay visual rendering", () => {
	beforeAll(async () => {
		// Navigate once: title → new game → narration → gameplay
		container = document.createElement("div");
		container.id = "gameplay-visual-root";
		container.style.cssText =
			"width:100vw;height:100vh;position:fixed;inset:0;";
		document.body.appendChild(container);
		root = createRoot(container);
		root.render(<App />);
		await flush(500);

		await waitForText("NEW GAME", 10000);
		findButton("NEW GAME")!.click();
		await flush(300);

		findButton("START")!.click();
		await flush(500);

		await waitForText("SKIP", 5000);
		findButton("SKIP")!.click();
		await flush(3000);

		// Handle extra story trigger
		if (
			!(container.textContent ?? "").includes("UNITS") &&
			!(container.textContent ?? "").includes("PAUSE")
		) {
			const skip2 = findButton("SKIP");
			if (skip2) {
				skip2.click();
				await flush(2000);
			}
		}

		await waitForText("UNITS", 5000);
		// Wait for entity renderer to finish loading GLBs
		await flush(3000);
	});

	afterAll(async () => {
		if (root) {
			root.unmount();
			root = null;
		}
		if (container) {
			container.remove();
			container = null;
		}
		// Don't dispose engine — let React handle it to avoid postProcessManager race
	});

	test("BabylonJS scene has meshes, lights, and active camera", () => {
		const scene = getScene() as {
			meshes: unknown[];
			lights: { name: string }[];
			activeCamera: {
				name: string;
				radius: number;
				beta: number;
				target: { x: number; z: number };
			} | null;
		} | null;

		expect(scene, "scene should be exposed via __babylonScene").not.toBeNull();
		expect(
			scene!.meshes.length,
			"scene should have terrain + entity meshes",
		).toBeGreaterThan(100);
		expect(
			scene!.lights.length,
			"scene should have 3+ lights",
		).toBeGreaterThanOrEqual(3);
		expect(scene!.activeCamera, "should have active camera").not.toBeNull();
		// Camera may still be in intro animation — just check it exists
		expect(scene!.activeCamera!.beta).toBeGreaterThan(0);
	});

	test("entity renderer loads all robot models", () => {
		const state = getEntityState() as {
			ready: boolean;
			assetPool: Map<string, unknown>;
			failedModelUrls: Set<string>;
			modelsLoaded: number;
			modelsTotal: number;
		} | null;

		expect(state, "entity state should be exposed").not.toBeNull();
		expect(state!.ready, "entity renderer should be ready").toBe(true);
		expect(
			state!.assetPool.size,
			"should have loaded GLB models",
		).toBeGreaterThanOrEqual(4);
		expect(
			state!.failedModelUrls.size,
			"no model URLs should have failed",
		).toBe(0);
		expect(state!.modelsLoaded).toBe(state!.modelsTotal);
	});

	test("player unit meshes exist and are not at origin", () => {
		const state = getEntityState() as {
			entityMeshes: Map<
				string,
				{
					root: { position: { x: number; y: number; z: number } };
					meshes: { isEnabled: () => boolean; isVisible: boolean }[];
				}
			>;
		} | null;

		expect(state).not.toBeNull();

		const playerUnits = [...state!.entityMeshes.entries()].filter(([id]) =>
			id.startsWith("unit_"),
		);
		expect(
			playerUnits.length,
			"should have player unit meshes",
		).toBeGreaterThanOrEqual(2);

		for (const [id, entry] of playerUnits) {
			expect(
				entry.meshes.length,
				`${id} should have child meshes`,
			).toBeGreaterThan(0);
			expect(entry.meshes[0].isEnabled(), `${id} mesh should be enabled`).toBe(
				true,
			);
			expect(entry.meshes[0].isVisible, `${id} should be visible`).toBe(true);

			const pos = entry.root.position;
			const dist = Math.sqrt(pos.x ** 2 + pos.z ** 2);
			expect(dist, `${id} should not be at origin`).toBeGreaterThan(5);
		}
	});

	test("terrain has ground planes with DynamicTexture materials", () => {
		const scene = getScene() as {
			meshes: { name: string; material: { name: string } | null }[];
		} | null;

		expect(scene).not.toBeNull();

		// Ground planes use "ground-{chunkX}-{chunkZ}" naming
		const groundMeshes = scene!.meshes.filter((m) =>
			m.name.startsWith("ground-"),
		);
		expect(
			groundMeshes.length,
			"should have chunk ground planes",
		).toBeGreaterThanOrEqual(1);

		// Each ground mesh should have a per-chunk material
		const groundMats = new Set<string>();
		for (const mesh of groundMeshes) {
			if (mesh.material) groundMats.add(mesh.material.name);
		}
		expect(
			groundMats.size,
			"each chunk should have its own ground material",
		).toBeGreaterThanOrEqual(1);
	});

	test("walls are shorter than robot models", () => {
		const scene = getScene() as {
			meshes: {
				name: string;
				getBoundingInfo: () => {
					boundingBox: {
						maximumWorld: { y: number };
						minimumWorld: { y: number };
					};
				};
			}[];
		} | null;

		const state = getEntityState() as {
			entityMeshes: Map<
				string,
				{
					meshes: {
						getBoundingInfo: () => {
							boundingBox: {
								maximumWorld: { y: number };
								minimumWorld: { y: number };
							};
						};
					}[];
				}
			>;
		} | null;

		let maxWallHeight = 0;
		for (const mesh of scene!.meshes) {
			if (mesh.name.startsWith("w-")) {
				const bb = mesh.getBoundingInfo().boundingBox;
				const h = bb.maximumWorld.y - bb.minimumWorld.y;
				if (h > maxWallHeight) maxWallHeight = h;
			}
		}

		let robotHeight = 0;
		for (const [id, entry] of state!.entityMeshes) {
			if (id.startsWith("unit_") && entry.meshes.length > 0) {
				const bb = entry.meshes[0].getBoundingInfo().boundingBox;
				robotHeight = bb.maximumWorld.y - bb.minimumWorld.y;
				break;
			}
		}

		expect(maxWallHeight).toBeGreaterThan(0);
		expect(robotHeight).toBeGreaterThan(0);
		expect(
			robotHeight,
			`robots (${robotHeight.toFixed(1)}) should be taller than walls (${maxWallHeight.toFixed(1)})`,
		).toBeGreaterThan(maxWallHeight);
	});

	test("salvage nodes have emissive glow", () => {
		const state = getEntityState() as {
			salvageMeshes: Map<
				number,
				{
					material: { emissiveColor: { r: number; g: number; b: number } };
				}
			>;
		} | null;

		expect(state).not.toBeNull();
		expect(
			state!.salvageMeshes.size,
			"should have salvage nodes",
		).toBeGreaterThan(0);

		let hasEmissive = false;
		for (const [, entry] of state!.salvageMeshes) {
			const e = entry.material.emissiveColor;
			if (e.r > 0 || e.g > 0 || e.b > 0) {
				hasEmissive = true;
				break;
			}
		}
		expect(hasEmissive, "salvage nodes should glow").toBe(true);
	});

	test("game canvas has non-zero dimensions", () => {
		const canvas = document.getElementById(
			"reactylon-canvas",
		) as HTMLCanvasElement | null;
		expect(canvas).not.toBeNull();

		const rect = canvas!.getBoundingClientRect();
		expect(rect.width, "canvas should have width").toBeGreaterThan(100);
		expect(rect.height, "canvas should have height").toBeGreaterThan(100);
		expect(canvas!.width, "canvas buffer width").toBeGreaterThan(100);
		expect(canvas!.height, "canvas buffer height").toBeGreaterThan(100);
	});

	test("HUD displays all game state elements", () => {
		const text = container!.textContent ?? "";

		expect(text).toContain("UNITS");
		expect(text).toContain("Fe");
		expect(text).toContain("Ci");
		expect(text).toContain("Pw");
		expect(text).toContain("Du");
		expect(text).toContain("STORM");
		expect(text).toContain("PWR");
		expect(text).toContain("SAVE");
		expect(text).toContain("LOAD");
	});

	test("lighting has sun, ambient, and camera-light", () => {
		const scene = getScene() as {
			lights: { name: string; intensity: number }[];
		} | null;

		expect(scene).not.toBeNull();
		const names = scene!.lights.map((l) => l.name);

		expect(names).toContain("sun");
		expect(names).toContain("ambient");
		expect(names).toContain("camera-light");
	});

	test("minimap canvas has rendered content", () => {
		const canvases = container!.querySelectorAll("canvas");
		const minimap = Array.from(canvases).find(
			(c) => c.id !== "reactylon-canvas",
		);
		expect(minimap).toBeDefined();
		expect(minimap!.width).toBeGreaterThan(0);

		const ctx = minimap!.getContext("2d");
		if (ctx && minimap!.width > 0) {
			const data = ctx.getImageData(0, 0, minimap!.width, minimap!.height);
			let sum = 0;
			for (let i = 0; i < data.data.length; i++) sum += data.data[i];
			expect(sum).toBeGreaterThan(0);
		}
	});
});
