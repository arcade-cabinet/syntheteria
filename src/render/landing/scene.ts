import type { Scene as BScene } from "@babylonjs/core";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Constants } from "@babylonjs/core/Engines/constants";
import { ShaderStore } from "@babylonjs/core/Engines/shaderStore";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { reportFatalError } from "../../errors";
import {
	createLandingDiagnostics,
	attachShaderCompilationHook,
} from "./diagnostics";
import {
	globeFragmentShader,
	globeVertexShader,
	hypercaneFragmentShader,
	hypercaneVertexShader,
	landingHeroFragmentShader,
	landingHeroVertexShader,
	lightningFragmentShader,
	lightningVertexShader,
	stormFragmentShader,
	stormVertexShader,
} from "./shaders";

let shadersRegistered = false;

function createHeroLogoTexture(scene: BScene) {
	const canvas = document.createElement("canvas");
	canvas.width = 3072;
	canvas.height = 768;
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Failed to create landing hero logo canvas");
	}

	context.clearRect(0, 0, canvas.width, canvas.height);
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.save();
	context.translate(canvas.width, 0);
	context.scale(-1, 1);
	context.strokeStyle = "rgba(32, 61, 82, 0.82)";
	context.lineWidth = 18;
	context.shadowColor = "rgba(139, 230, 255, 0.55)";
	context.shadowBlur = 42;
	context.fillStyle = "#baf4ff";
	context.font = "700 208px 'Courier New', monospace";
	context.strokeText("SYNTHETERIA", canvas.width / 2, 372);
	context.fillText("SYNTHETERIA", canvas.width / 2, 372);

	context.shadowBlur = 18;
	context.strokeStyle = "rgba(18, 34, 48, 0.7)";
	context.lineWidth = 8;
	context.fillStyle = "rgba(168, 235, 255, 0.96)";
	context.font = "44px 'Courier New', monospace";
	context.strokeText(
		"AWAKEN  //  CONNECT  //  REBUILD",
		canvas.width / 2,
		510,
	);
	context.fillText(
		"AWAKEN  //  CONNECT  //  REBUILD",
		canvas.width / 2,
		510,
	);
	context.restore();

	const texture = new Texture(
		canvas.toDataURL("image/png"),
		scene,
		true,
		false,
	);
	texture.hasAlpha = true;
	texture.wrapU = Texture.WRAP_ADDRESSMODE;
	texture.wrapV = Texture.CLAMP_ADDRESSMODE;
	return texture;
}

export function registerLandingShaders() {
	if (shadersRegistered) return;
	ShaderStore.ShadersStoreWGSL.stormVertexShader = stormVertexShader;
	ShaderStore.ShadersStoreWGSL.stormFragmentShader = stormFragmentShader;
	ShaderStore.ShadersStoreWGSL.lightningVertexShader = lightningVertexShader;
	ShaderStore.ShadersStoreWGSL.lightningFragmentShader = lightningFragmentShader;
	ShaderStore.ShadersStoreWGSL.globeVertexShader = globeVertexShader;
	ShaderStore.ShadersStoreWGSL.globeFragmentShader = globeFragmentShader;
	ShaderStore.ShadersStoreWGSL.landingHeroVertexShader = landingHeroVertexShader;
	ShaderStore.ShadersStoreWGSL.landingHeroFragmentShader = landingHeroFragmentShader;
	ShaderStore.ShadersStoreWGSL.hypercaneVertexShader = hypercaneVertexShader;
	ShaderStore.ShadersStoreWGSL.hypercaneFragmentShader = hypercaneFragmentShader;
	shadersRegistered = true;
}

export function configureLandingScene(scene: BScene) {
	scene.clearColor = new Color4(0, 0, 0, 1);

	const camera = new ArcRotateCamera(
		"globe-cam",
		0,
		Math.PI / 2,
		10,
		Vector3.Zero(),
		scene,
	);
	camera.fov = 0.8;
	camera.inputs.clear();
}

export function setupLandingScene(scene: BScene) {
	const startTime = performance.now();
	let renderMode: "legacy" | "hero" = "hero";
	let flash = 0;
	let growth = 0.3;
	const boltStart = new Vector2(0, 0.8);
	const boltEnd = new Vector2(0, -0.8);
	const diagnostics = createLandingDiagnostics(scene);

	const stormMesh = CreateSphere(
		"storm-clouds",
		{ diameter: 30, segments: 64 },
		scene,
	);
	const stormMat = new ShaderMaterial(
		"storm-mat",
		scene,
		{ vertex: "storm", fragment: "storm" },
		{
			attributes: ["position", "normal", "uv"],
			uniforms: ["uTime", "uColor1", "uColor2"],
			uniformBuffers: ["Scene", "Mesh"],
			shaderLanguage: ShaderLanguage.WGSL,
		},
	);
	stormMat.setColor3("uColor1", new Color3(0.008, 0.012, 0.027));
	stormMat.setColor3("uColor2", new Color3(0.039, 0.078, 0.157));
	stormMat.alpha = 1;
	stormMat.backFaceCulling = false;
	stormMat.alphaMode = Constants.ALPHA_COMBINE;
	stormMat.needDepthPrePass = false;
	stormMesh.scaling = new Vector3(-1, 1, 1);
	stormMesh.material = stormMat;
	attachShaderCompilationHook(
		"storm-mat",
		stormMat,
		stormMesh,
		diagnostics.shaderDiagnostics,
	);

	const lightningMesh = CreatePlane("lightning-plane", { size: 15 }, scene);
	lightningMesh.position.z = -2;
	lightningMesh.billboardMode = 7;
	const lightningMat = new ShaderMaterial(
		"lightning-mat",
		scene,
		{ vertex: "lightning", fragment: "lightning" },
		{
			attributes: ["position", "uv"],
			uniforms: ["uTime", "uFlash", "uBoltStart", "uBoltEnd"],
			uniformBuffers: ["Scene", "Mesh"],
			shaderLanguage: ShaderLanguage.WGSL,
		},
	);
	lightningMat.alphaMode = Constants.ALPHA_ADD;
	lightningMat.backFaceCulling = false;
	lightningMat.needDepthPrePass = false;
	lightningMesh.material = lightningMat;
	attachShaderCompilationHook(
		"lightning-mat",
		lightningMat,
		lightningMesh,
		diagnostics.shaderDiagnostics,
	);

	const globeMesh = CreateSphere("globe", { diameter: 5, segments: 64 }, scene);
	const globeMat = new ShaderMaterial(
		"globe-mat",
		scene,
		{ vertex: "globe", fragment: "globe" },
		{
			attributes: ["position", "normal", "uv"],
			uniforms: ["uTime", "uGrowth"],
			uniformBuffers: ["Scene", "Mesh"],
			shaderLanguage: ShaderLanguage.WGSL,
		},
	);
	globeMesh.material = globeMat;
	attachShaderCompilationHook(
		"globe-mat",
		globeMat,
		globeMesh,
		diagnostics.shaderDiagnostics,
	);

	const landingHeroMesh = CreateSphere(
		"landing-hero",
		{ diameter: 5, segments: 64 },
		scene,
	);
	const landingHeroMat = new ShaderMaterial(
		"landing-hero-mat",
		scene,
		{ vertex: "landingHero", fragment: "landingHero" },
		{
			attributes: ["position", "normal", "uv"],
			uniforms: ["uTime", "uGrowth"],
			uniformBuffers: ["Scene", "Mesh"],
			samplers: ["logoSampler"],
			shaderLanguage: ShaderLanguage.WGSL,
		},
	);
	const heroLogoTexture = createHeroLogoTexture(scene);
	landingHeroMat.setTexture("logoSampler", heroLogoTexture);
	landingHeroMesh.material = landingHeroMat;
	attachShaderCompilationHook(
		"landing-hero-mat",
		landingHeroMat,
		landingHeroMesh,
		diagnostics.shaderDiagnostics,
	);

	const hypercaneMesh = CreateTorus(
		"hypercane",
		{
			diameter: 5.6,
			thickness: 0.3,
			tessellation: 96,
		},
		scene,
	);
	const hypercaneMat = new ShaderMaterial(
		"hypercane-mat",
		scene,
		{ vertex: "hypercane", fragment: "hypercane" },
		{
			attributes: ["position", "normal", "uv"],
			uniforms: ["uTime"],
			uniformBuffers: ["Scene", "Mesh"],
			shaderLanguage: ShaderLanguage.WGSL,
		},
	);
	hypercaneMat.alphaMode = Constants.ALPHA_ADD;
	hypercaneMat.backFaceCulling = false;
	hypercaneMat.needDepthPrePass = false;
	hypercaneMesh.material = hypercaneMat;
	attachShaderCompilationHook(
		"hypercane-mat",
		hypercaneMat,
		hypercaneMesh,
		diagnostics.shaderDiagnostics,
	);

	const debugGlobeMat = new StandardMaterial("debug-globe-mat", scene);
	debugGlobeMat.disableLighting = true;
	debugGlobeMat.diffuseColor = new Color3(1, 0.1, 0.1);
	debugGlobeMat.emissiveColor = new Color3(1, 0.1, 0.1);
	debugGlobeMat.specularColor = Color3.Black();

	const landingDiagnostics = window.__syntheteriaLandingDiagnostics;
	if (!landingDiagnostics) {
		throw new Error("Landing diagnostics were not initialized");
	}

	const applyRenderMode = (mode: "legacy" | "hero") => {
		renderMode = mode;
		const heroVisible = mode === "hero";
		landingHeroMesh.setEnabled(heroVisible);
		landingHeroMesh.isVisible = heroVisible;

		const legacyVisible = mode === "legacy";
		const stormVisible = mode === "legacy" || mode === "hero";
		stormMesh.setEnabled(stormVisible);
		stormMesh.isVisible = stormVisible;
		lightningMesh.setEnabled(legacyVisible);
		globeMesh.setEnabled(legacyVisible);
		hypercaneMesh.setEnabled(legacyVisible);
		lightningMesh.isVisible = legacyVisible;
		globeMesh.isVisible = legacyVisible;
		hypercaneMesh.isVisible = legacyVisible;
	};

	window.__syntheteriaLandingDiagnostics = {
		...landingDiagnostics,
		setRenderMode: (mode: "legacy" | "hero") => {
			applyRenderMode(mode);
		},
		setProbeMode: (mode: "normal" | "debugGlobe") => {
			if (mode === "debugGlobe") {
				globeMesh.material = debugGlobeMat;
				landingHeroMesh.setEnabled(false);
				landingHeroMesh.isVisible = false;
				stormMesh.isVisible = false;
				lightningMesh.isVisible = false;
				hypercaneMesh.isVisible = false;
				globeMesh.setEnabled(true);
				globeMesh.isVisible = true;
				return;
			}
			globeMesh.material = globeMat;
			applyRenderMode(renderMode);
		},
		setMeshVisibility: (name: string, visible: boolean) => {
			scene.getMeshByName(name)?.setEnabled(visible);
			const mesh = scene.getMeshByName(name);
			if (mesh) {
				mesh.isVisible = visible;
			}
		},
	};
	applyRenderMode(renderMode);

	const renderLoop = () => {
		const elapsed = (performance.now() - startTime) / 1000;

		stormMat.setFloat("uTime", elapsed);
		stormMesh.rotation.y = elapsed * 0.02;

		lightningMat.setFloat("uTime", elapsed);
		if (Math.random() > 0.97) {
			flash = 1;
			const angle = Math.random() * Math.PI * 2;
			const radius = 0.6 + Math.random() * 0.3;
			boltStart.x = Math.cos(angle) * radius;
			boltStart.y = Math.sin(angle) * radius;
			boltEnd.x = Math.cos(angle + Math.PI) * (radius * 0.3);
			boltEnd.y = Math.sin(angle + Math.PI) * (radius * 0.3);
		} else {
			flash *= 0.85;
		}
		lightningMat.setFloat("uFlash", flash);
		lightningMat.setVector2("uBoltStart", boltStart);
		lightningMat.setVector2("uBoltEnd", boltEnd);

		globeMat.setFloat("uTime", elapsed);
		growth = Math.min(0.5, 0.3 + elapsed * 0.0017);
		globeMat.setFloat("uGrowth", growth);
		globeMesh.rotation.y = elapsed * 0.1;
		landingHeroMat.setFloat("uTime", elapsed);
		landingHeroMat.setFloat("uGrowth", growth);
		landingHeroMesh.rotation.y = elapsed * 0.1;

		hypercaneMat.setFloat("uTime", elapsed);
		hypercaneMesh.rotation.y = elapsed * 0.3;

		if (!diagnostics.renderWatchdog.triggered && elapsed > 1.5) {
			diagnostics.renderWatchdog.samplesTaken += 1;
			const anyShaderFailed = Object.values(diagnostics.shaderDiagnostics).some(
				(shader) => shader.status === "failed",
			);
			if (anyShaderFailed || diagnostics.gpuErrors.length > 0) {
				const reason = anyShaderFailed
					? "Landing shader compilation failed"
					: "Landing WebGPU validation errors detected";
				diagnostics.renderWatchdog.triggered = true;
				diagnostics.renderWatchdog.reason = reason;
				reportFatalError(
					new Error(
						`${reason}. Open window.__syntheteriaLandingDiagnostics for details.`,
					),
				);
			}
		}
	};

	scene.registerBeforeRender(renderLoop);

	return () => {
		scene.unregisterBeforeRender(renderLoop);
		diagnostics.dispose();
		stormMesh.dispose();
		stormMat.dispose();
		lightningMesh.dispose();
		lightningMat.dispose();
		globeMesh.dispose();
		globeMat.dispose();
		landingHeroMesh.dispose();
		landingHeroMat.dispose();
		heroLogoTexture.dispose();
		hypercaneMesh.dispose();
		hypercaneMat.dispose();
		debugGlobeMat.dispose();
	};
}
