/**
 * GlobeBackground — BabylonJS Canvas behind the landing page.
 *
 * Renders a slowly rotating ecumenopolis globe with storm atmosphere,
 * lightning bolts, and hypercane spiral. Purely decorative — no
 * interactivity, no input handling, no game state.
 *
 * Uses Reactylon Engine/Scene and imperative BabylonJS ShaderMaterial.
 * The lattice growth slowly animates from 0.3 -> 0.5 over time,
 * showing cities spreading across the globe surface.
 */

import type { Scene as BScene } from "@babylonjs/core";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Constants } from "@babylonjs/core/Engines/constants";
import { ShaderStore } from "@babylonjs/core/Engines/shaderStore";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { useEffect } from "react";
import { Scene, useScene } from "reactylon";
import { Engine } from "reactylon/web";

import {
	globeFragmentShader,
	globeVertexShader,
	hypercaneFragmentShader,
	hypercaneVertexShader,
	lightningFragmentShader,
	lightningVertexShader,
	stormFragmentShader,
	stormVertexShader,
} from "./title/shaders";

// ─── Register WGSL shaders in BabylonJS ShadersStoreWGSL ─────────────────────

ShaderStore.ShadersStoreWGSL["stormVertexShader"] = stormVertexShader;
ShaderStore.ShadersStoreWGSL["stormFragmentShader"] = stormFragmentShader;
ShaderStore.ShadersStoreWGSL["lightningVertexShader"] = lightningVertexShader;
ShaderStore.ShadersStoreWGSL["lightningFragmentShader"] = lightningFragmentShader;
ShaderStore.ShadersStoreWGSL["globeVertexShader"] = globeVertexShader;
ShaderStore.ShadersStoreWGSL["globeFragmentShader"] = globeFragmentShader;
ShaderStore.ShadersStoreWGSL["hypercaneVertexShader"] = hypercaneVertexShader;
ShaderStore.ShadersStoreWGSL["hypercaneFragmentShader"] = hypercaneFragmentShader;

// ─── Scene setup ─────────────────────────────────────────────────────────────

function onGlobeSceneReady(scene: BScene) {
	scene.clearColor = new Color4(0, 0, 0, 1);

	const camera = new ArcRotateCamera(
		"globe-cam",
		0, // alpha
		Math.PI / 2, // beta — front-on
		10, // radius
		Vector3.Zero(),
		scene,
	);
	camera.fov = 0.8; // ~45 degrees
	// No user interaction — purely decorative
	camera.inputs.clear();
}

// ─── Scene content ───────────────────────────────────────────────────────────

function GlobeSceneContent() {
	const scene = useScene();

	useEffect(() => {
		if (!scene) return;

		const startTime = performance.now();
		let flash = 0;
		let growth = 0.3;
		const boltStart = new Vector2(0, 0.8);
		const boltEnd = new Vector2(0, -0.8);

		// --- Storm Clouds (BackSide sphere) ---
		const stormMesh = CreateSphere(
			"storm-clouds",
			{ diameter: 16, segments: 64 },
			scene,
		);
		const stormMat = new ShaderMaterial("storm-mat", scene, {
			vertex: "storm",
			fragment: "storm",
		}, {
			attributes: ["position", "normal", "uv"],
			uniforms: ["uTime", "uColor1", "uColor2"],
			uniformBuffers: ["Scene", "Mesh"],
			shaderLanguage: ShaderLanguage.WGSL,
		});
		stormMat.setColor3("uColor1", new Color3(0.008, 0.012, 0.027));
		stormMat.setColor3("uColor2", new Color3(0.039, 0.078, 0.157));
		stormMat.alpha = 1;
		stormMat.backFaceCulling = false;
		// Render inside of sphere (back-side) — invert normals via negative scaling
		stormMesh.scaling = new Vector3(-1, 1, 1);
		stormMat.alphaMode = Constants.ALPHA_COMBINE;
		stormMat.needDepthPrePass = false;
		stormMesh.material = stormMat;

		// --- Lightning Bolt Overlay (additive plane) ---
		const lightningMesh = CreatePlane("lightning-plane", { size: 15 }, scene);
		lightningMesh.position.z = -2; // in front of globe, facing camera
		lightningMesh.billboardMode = 7; // BILLBOARDMODE_ALL
		const lightningMat = new ShaderMaterial(
			"lightning-mat",
			scene,
			{
				vertex: "lightning",
				fragment: "lightning",
			},
			{
				attributes: ["position", "uv"],
				uniforms: [
					"uTime",
					"uFlash",
					"uBoltStart",
					"uBoltEnd",
				],
				uniformBuffers: ["Scene", "Mesh"],
				shaderLanguage: ShaderLanguage.WGSL,
			},
		);
		lightningMat.alphaMode = Constants.ALPHA_ADD;
		lightningMat.backFaceCulling = false;
		lightningMat.needDepthPrePass = false;
		lightningMesh.material = lightningMat;

		// --- Globe with Ecumenopolis ---
		const globeMesh = CreateSphere(
			"globe",
			{ diameter: 5, segments: 64 },
			scene,
		);
		const globeMat = new ShaderMaterial("globe-mat", scene, {
			vertex: "globe",
			fragment: "globe",
		}, {
			attributes: ["position", "normal", "uv"],
			uniforms: ["uTime", "uGrowth"],
			uniformBuffers: ["Scene", "Mesh"],
			shaderLanguage: ShaderLanguage.WGSL,
		});
		globeMesh.material = globeMat;

		// --- Hypercane Spiral Band ---
		const hypercaneMesh = CreateCylinder(
			"hypercane",
			{
				diameterTop: 2,
				diameterBottom: 3,
				height: 2,
				tessellation: 64,
				subdivisions: 32,
				enclose: false,
			},
			scene,
		);
		hypercaneMesh.scaling = new Vector3(3, 0.5, 3);
		const hypercaneMat = new ShaderMaterial(
			"hypercane-mat",
			scene,
			{
				vertex: "hypercane",
				fragment: "hypercane",
			},
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

		// --- Animation loop ---
		const renderLoop = () => {
			const elapsed = (performance.now() - startTime) / 1000;

			// Storm clouds
			stormMat.setFloat("uTime", elapsed);
			stormMesh.rotation.y = elapsed * 0.02;

			// Lightning
			lightningMat.setFloat("uTime", elapsed);
			if (Math.random() > 0.97) {
				flash = 1;
				const angle = Math.random() * Math.PI * 2;
				const r = 0.6 + Math.random() * 0.3;
				boltStart.x = Math.cos(angle) * r;
				boltStart.y = Math.sin(angle) * r;
				boltEnd.x = Math.cos(angle + Math.PI) * (r * 0.3);
				boltEnd.y = Math.sin(angle + Math.PI) * (r * 0.3);
			} else {
				flash *= 0.85;
			}
			lightningMat.setFloat("uFlash", flash);
			lightningMat.setVector2("uBoltStart", boltStart);
			lightningMat.setVector2("uBoltEnd", boltEnd);

			// Globe
			globeMat.setFloat("uTime", elapsed);
			growth = Math.min(0.5, 0.3 + elapsed * 0.0017);
			globeMat.setFloat("uGrowth", growth);
			globeMesh.rotation.y = elapsed * 0.1;

			// Hypercane
			hypercaneMat.setFloat("uTime", elapsed);
			hypercaneMesh.rotation.y = elapsed * 0.3;
		};

		scene.registerBeforeRender(renderLoop);

		return () => {
			scene.unregisterBeforeRender(renderLoop);
			stormMesh.dispose();
			stormMat.dispose();
			lightningMesh.dispose();
			lightningMat.dispose();
			globeMesh.dispose();
			globeMat.dispose();
			hypercaneMesh.dispose();
			hypercaneMat.dispose();
		};
	}, [scene]);

	return null;
}

// ─── Public Component ────────────────────────────────────────────────────────

/**
 * Full-screen BabylonJS Canvas showing the storm globe.
 * Position behind the LandingScreen DOM overlay with a lower z-index.
 */
export function GlobeBackground() {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 100,
			}}
		>
			<Engine>
				<Scene onSceneReady={onGlobeSceneReady}>
					<GlobeSceneContent />
				</Scene>
			</Engine>
		</div>
	);
}
