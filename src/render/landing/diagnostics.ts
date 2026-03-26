import type { Scene as BScene } from "@babylonjs/core";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { ShaderStore } from "@babylonjs/core/Engines/shaderStore";
import "@babylonjs/core/Misc/screenshotTools";
import { Tools } from "@babylonjs/core/Misc/tools";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";

export interface LandingShaderDiagnostic {
	name: string;
	status: "pending" | "compiled" | "failed";
	error: string | null;
}

export interface LandingSceneDiagnostics {
	canvas: {
		width: number;
		height: number;
		clientWidth: number;
		clientHeight: number;
	};
	engine: {
		name: string;
		isWebGPU: boolean;
		renderWidth: number;
		renderHeight: number;
		hardwareScalingLevel: number | null;
	};
	scene: {
		activeCamera: string | null;
		meshCount: number;
		materialCount: number;
	};
	camera: {
		position: { x: number; y: number; z: number } | null;
		target: { x: number; y: number; z: number } | null;
		alpha: number | null;
		beta: number | null;
		radius: number | null;
		fov: number | null;
	};
	meshes: Array<{
		name: string;
		position: { x: number; y: number; z: number };
		scaling: { x: number; y: number; z: number };
		rotation: { x: number; y: number; z: number };
		visibility: number;
		isVisible: boolean;
		isEnabled: boolean;
		materialName: string | null;
		materialAlpha: number | null;
	}>;
	shaders: Record<string, LandingShaderDiagnostic>;
	gpuErrors: string[];
	resizeEvents: Array<{ renderWidth: number; renderHeight: number }>;
	shaderStorePreview: Record<string, string>;
	renderWatchdog: {
		triggered: boolean;
		reason: string | null;
		samplesTaken: number;
	};
}

declare global {
	interface Window {
		__syntheteriaLandingDiagnostics?: {
			getSnapshot: () => LandingSceneDiagnostics;
			captureCanvasDataUrl: () => Promise<string | null>;
			setProbeMode?: (mode: "normal" | "debugGlobe") => void;
			setMeshVisibility?: (name: string, visible: boolean) => void;
			setRenderMode?: (mode: "legacy" | "hero") => void;
		};
	}
}

function getShaderStorePreview() {
	return {
		stormVertexShader: ShaderStore.ShadersStoreWGSL.stormVertexShader.slice(0, 80),
		stormFragmentShader:
			ShaderStore.ShadersStoreWGSL.stormFragmentShader.slice(0, 80),
		lightningVertexShader:
			ShaderStore.ShadersStoreWGSL.lightningVertexShader.slice(0, 80),
		lightningFragmentShader:
			ShaderStore.ShadersStoreWGSL.lightningFragmentShader.slice(0, 80),
		globeVertexShader: ShaderStore.ShadersStoreWGSL.globeVertexShader.slice(0, 80),
		globeFragmentShader:
			ShaderStore.ShadersStoreWGSL.globeFragmentShader.slice(0, 80),
		hypercaneVertexShader:
			ShaderStore.ShadersStoreWGSL.hypercaneVertexShader.slice(0, 80),
		hypercaneFragmentShader:
			ShaderStore.ShadersStoreWGSL.hypercaneFragmentShader.slice(0, 80),
	};
}

export function createLandingDiagnostics(scene: BScene) {
	const shaderDiagnostics: Record<string, LandingShaderDiagnostic> = {
		"storm-mat": { name: "storm-mat", status: "pending", error: null },
		"lightning-mat": { name: "lightning-mat", status: "pending", error: null },
		"globe-mat": { name: "globe-mat", status: "pending", error: null },
		"landing-hero-mat": { name: "landing-hero-mat", status: "pending", error: null },
		"hypercane-mat": { name: "hypercane-mat", status: "pending", error: null },
	};
	const gpuErrors: string[] = [];
	const resizeEvents: Array<{ renderWidth: number; renderHeight: number }> = [];
	const renderWatchdog = {
		triggered: false,
		reason: null as string | null,
		samplesTaken: 0,
	};
	const engine = scene.getEngine();

	const getSnapshot = (): LandingSceneDiagnostics => {
		const canvas = engine.getRenderingCanvas();
		const camera = scene.activeCamera as ArcRotateCamera | null;
		return {
			canvas: {
				width: canvas?.width ?? 0,
				height: canvas?.height ?? 0,
				clientWidth: canvas?.clientWidth ?? 0,
				clientHeight: canvas?.clientHeight ?? 0,
			},
			engine: {
				name: engine.constructor.name,
				isWebGPU: "isWebGPU" in engine ? Boolean(engine.isWebGPU) : false,
				renderWidth: engine.getRenderWidth(),
				renderHeight: engine.getRenderHeight(),
				hardwareScalingLevel:
					"getHardwareScalingLevel" in engine
						? engine.getHardwareScalingLevel()
						: null,
			},
			scene: {
				activeCamera: scene.activeCamera?.name ?? null,
				meshCount: scene.meshes.length,
				materialCount: scene.materials.length,
			},
			camera: {
				position: camera
					? { x: camera.position.x, y: camera.position.y, z: camera.position.z }
					: null,
				target: camera
					? { x: camera.target.x, y: camera.target.y, z: camera.target.z }
					: null,
				alpha: camera ? camera.alpha : null,
				beta: camera ? camera.beta : null,
				radius: camera ? camera.radius : null,
				fov: camera ? camera.fov : null,
			},
			meshes: scene.meshes.map((mesh) => ({
				name: mesh.name,
				position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
				scaling: { x: mesh.scaling.x, y: mesh.scaling.y, z: mesh.scaling.z },
				rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
				visibility: mesh.visibility,
				isVisible: mesh.isVisible,
				isEnabled: mesh.isEnabled(),
				materialName: mesh.material?.name ?? null,
				materialAlpha: mesh.material?.alpha ?? null,
			})),
			shaders: structuredClone(shaderDiagnostics),
			gpuErrors: [...gpuErrors],
			resizeEvents: [...resizeEvents],
			shaderStorePreview: getShaderStorePreview(),
			renderWatchdog: { ...renderWatchdog },
		};
	};

	window.__syntheteriaLandingDiagnostics = {
		getSnapshot,
		captureCanvasDataUrl: async () => {
			const camera = scene.activeCamera;
			if (!camera) {
				return null;
			}
			try {
				return await Tools.CreateScreenshotUsingRenderTargetAsync(
					engine,
					camera,
					{
						width: engine.getRenderWidth(),
						height: engine.getRenderHeight(),
					},
					"image/png",
				);
			} catch (error) {
				gpuErrors.push(
					`Landing screenshot capture failed: ${error instanceof Error ? error.message : String(error)}`,
				);
				return null;
			}
		},
	};

	const resizeObserver = engine.onResizeObservable.add(() => {
		resizeEvents.push({
			renderWidth: engine.getRenderWidth(),
			renderHeight: engine.getRenderHeight(),
		});
	});

	const originalWarn = console.warn;
	console.warn = (...args: unknown[]) => {
		const message = args.map((arg) => String(arg)).join(" ");
		if (message.includes("WebGPU uncaptured error")) {
			gpuErrors.push(message);
		}
		originalWarn(...args);
	};

	return {
		shaderDiagnostics,
		gpuErrors,
		renderWatchdog,
		dispose: () => {
			engine.onResizeObservable.remove(resizeObserver);
			console.warn = originalWarn;
			delete window.__syntheteriaLandingDiagnostics;
		},
	};
}

export function attachShaderCompilationHook(
	name: keyof ReturnType<typeof createLandingDiagnostics>["shaderDiagnostics"],
	material: ShaderMaterial,
	mesh: Parameters<ShaderMaterial["forceCompilationAsync"]>[0],
	shaderDiagnostics: Record<string, LandingShaderDiagnostic>,
) {
	material
		.forceCompilationAsync(mesh)
		.then(() => {
			shaderDiagnostics[name].status = "compiled";
		})
		.catch((error: unknown) => {
			shaderDiagnostics[name].status = "failed";
			shaderDiagnostics[name].error =
				error instanceof Error ? error.message : String(error);
		});
}
