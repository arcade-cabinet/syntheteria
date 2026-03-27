/**
 * Browser integration tests for the landing page.
 *
 * These tests render the real LandingScreen + Reactylon/Babylon globe scene
 * in Chromium. They validate both the DOM contract and the Babylon scene
 * contract, while collecting diagnostics that make sizing/render failures
 * actionable instead of opaque.
 */

import { Engine as BabylonEngine } from "@babylonjs/core/Engines/engine";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import {
	LandingScreen,
	type NewGameConfig,
} from "../../src/views/landing/LandingScreen";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function setup() {
	container = document.createElement("div");
	container.style.position = "fixed";
	container.style.inset = "0";
	container.style.width = "100vw";
	container.style.height = "100vh";
	document.body.appendChild(container);
	root = createRoot(container);
}

async function cleanup() {
	if (root) {
		root.unmount();
		root = null;
	}
	if (container) {
		container.remove();
		container = null;
	}
	await flush(50);
}

afterEach(async () => {
	await cleanup();
});

async function flush(ms = 100) {
	await new Promise((r) => setTimeout(r, ms));
}

async function waitFor<T>(
	getValue: () => T | null | undefined,
	{
		timeoutMs = 4000,
		intervalMs = 50,
		onTimeout,
	}: {
		timeoutMs?: number;
		intervalMs?: number;
		onTimeout?: () => string;
	} = {},
): Promise<T> {
	const start = performance.now();
	// Poll until the condition is met or timeout expires.
	while (performance.now() - start < timeoutMs) {
		const value = getValue();
		if (value != null) {
			return value;
		}
		await flush(intervalMs);
	}
	const details = onTimeout?.();
	throw new Error(
		details
			? `Timed out after ${timeoutMs}ms waiting for condition\n${details}`
			: `Timed out after ${timeoutMs}ms waiting for condition`,
	);
}

function render(onStart: (config: NewGameConfig) => void = () => {}) {
	root!.render(<LandingScreen onStartGame={onStart} />);
}

type LandingDiagnostics = ReturnType<typeof collectLandingDiagnostics>;

function collectLandingDiagnostics() {
	const appDiagnostics =
		window.__syntheteriaLandingDiagnostics?.getSnapshot() ?? null;
	const canvas = document.querySelector<HTMLCanvasElement>("#reactylon-canvas");
	const engine = BabylonEngine.LastCreatedEngine;
	const scene = BabylonEngine.LastCreatedScene;

	return {
		appDiagnostics,
		canvasCount: document.querySelectorAll("canvas").length,
		canvas: canvas
			? {
					width: canvas.width,
					height: canvas.height,
					clientWidth: canvas.clientWidth,
					clientHeight: canvas.clientHeight,
					bounds: {
						width: canvas.getBoundingClientRect().width,
						height: canvas.getBoundingClientRect().height,
					},
				}
			: null,
		engine: engine
			? {
					name: engine.constructor.name,
					isWebGPU: "isWebGPU" in engine ? Boolean(engine.isWebGPU) : false,
					renderWidth: engine.getRenderWidth(),
					renderHeight: engine.getRenderHeight(),
					hardwareScalingLevel:
						"getHardwareScalingLevel" in engine
							? engine.getHardwareScalingLevel()
							: null,
				}
			: null,
		scene: scene
			? {
					meshCount: scene.meshes.length,
					meshNames: scene.meshes.map((mesh) => mesh.name).sort(),
					materialCount: scene.materials.length,
					materials: scene.materials.map((material) => ({
						name: material.name,
						className: material.getClassName(),
						alphaMode: material.alphaMode,
						isReady: material.isReady(),
					})),
					activeCamera: scene.activeCamera?.name ?? null,
				}
			: null,
		text: container?.textContent ?? "",
	};
}

function diagnosticsJson(diag: LandingDiagnostics): string {
	return JSON.stringify(diag, null, 2);
}

async function waitForLandingReady() {
	return waitFor(
		() => {
			const diag = collectLandingDiagnostics();
			if (!diag.canvas || !diag.engine || !diag.scene || !diag.appDiagnostics) {
				return null;
			}
			if (diag.scene.meshCount < 4) {
				return null;
			}
			if (!diag.scene.activeCamera) {
				return null;
			}
			return diag;
		},
		{
			onTimeout: () => diagnosticsJson(collectLandingDiagnostics()),
		},
	);
}

test("renders the real landing DOM overlay and Babylon canvas together", async () => {
	setup();
	render();

	const diag = await waitForLandingReady();

	expect(diag.text).toContain("NEW GAME");
	expect(diag.text).toContain("v0.1.0");
	expect(diag.canvasCount).toBeGreaterThanOrEqual(1);
	expect(diag.canvas).not.toBeNull();
	expect(diag.engine).not.toBeNull();
	expect(diag.scene).not.toBeNull();
});

test("builds the expected landing Babylon scene composition", async () => {
	setup();
	render();

	const diag = await waitForLandingReady();
	const meshNames = diag.scene?.meshNames ?? [];
	const materialNames = (diag.scene?.materials ?? []).map((m) => m.name);

	expect(meshNames, diagnosticsJson(diag)).toEqual(
		expect.arrayContaining([
			"landing-hero",
			"globe",
			"storm-clouds",
			"lightning-plane",
		]),
	);
	expect(materialNames, diagnosticsJson(diag)).toEqual(
		expect.arrayContaining([
			"landing-hero-mat",
			"globe-mat",
			"storm-mat",
			"lightning-mat",
			"hypercane-mat",
		]),
	);
	expect(diag.scene?.activeCamera, diagnosticsJson(diag)).toBe("globe-cam");
});

test("publishes explicit shader diagnostics and a capturable screenshot hook", async () => {
	setup();
	render();

	const diag = await waitForLandingReady();
	const appDiagnostics = diag.appDiagnostics;
	expect(appDiagnostics, diagnosticsJson(diag)).not.toBeNull();

	const shaderNames = Object.keys(appDiagnostics!.shaders);
	expect(shaderNames, diagnosticsJson(diag)).toEqual(
		expect.arrayContaining([
			"storm-mat",
			"lightning-mat",
			"globe-mat",
			"landing-hero-mat",
			"hypercane-mat",
		]),
	);

	for (const shader of Object.values(appDiagnostics!.shaders)) {
		expect(["pending", "compiled", "failed"]).toContain(shader.status);
	}

	expect(
		appDiagnostics!.shaderStorePreview.globeVertexShader,
		diagnosticsJson(diag),
	).toContain("#include<sceneUboDeclaration>");

	const screenshot =
		await window.__syntheteriaLandingDiagnostics?.captureCanvasDataUrl();
	expect(typeof screenshot, diagnosticsJson(diag)).toBe("string");
	expect(screenshot as string, diagnosticsJson(diag)).toMatch(
		/^data:image\/png;base64,/,
	);
	expect((screenshot as string).length, diagnosticsJson(diag)).toBeGreaterThan(
		1_000,
	);

	const postCaptureDiagnostics =
		window.__syntheteriaLandingDiagnostics?.getSnapshot() ?? null;
	expect(postCaptureDiagnostics?.gpuErrors, diagnosticsJson(diag)).toEqual([]);
});

test("keeps the Reactylon canvas and Babylon render size aligned", async () => {
	setup();
	render();

	await waitForLandingReady();
	await flush(250);

	const diag = collectLandingDiagnostics();
	expect(diag.canvas, diagnosticsJson(diag)).not.toBeNull();
	expect(diag.engine, diagnosticsJson(diag)).not.toBeNull();

	expect(diag.engine?.renderWidth, diagnosticsJson(diag)).toBe(
		diag.canvas?.width,
	);
	expect(diag.engine?.renderHeight, diagnosticsJson(diag)).toBe(
		diag.canvas?.height,
	);
	expect(diag.canvas?.width, diagnosticsJson(diag)).toBe(
		diag.canvas?.clientWidth,
	);
	expect(diag.canvas?.height, diagnosticsJson(diag)).toBe(
		diag.canvas?.clientHeight,
	);
});

test("opens the New Game modal without tearing down the globe scene", async () => {
	setup();
	render();

	await waitForLandingReady();

	const buttons = Array.from(container!.querySelectorAll("button"));
	const newGame = buttons.find((button) =>
		button.textContent?.includes("NEW GAME"),
	);
	expect(newGame).toBeDefined();

	newGame!.click();
	await flush(150);

	const diag = collectLandingDiagnostics();
	expect(diag.text).toContain("INITIALIZE");
	expect(diag.text).toContain("WORLD SEED");
	expect(diag.scene?.meshNames, diagnosticsJson(diag)).toEqual(
		expect.arrayContaining(["globe", "storm-clouds"]),
	);
});
