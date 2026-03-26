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
import { Effect } from "@babylonjs/core/Materials/effect";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
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

// ─── Register shaders in BabylonJS ShadersStore ──────────────────────────────

Effect.ShadersStore.stormVertexShader = stormVertexShader;
Effect.ShadersStore.stormFragmentShader = stormFragmentShader;
Effect.ShadersStore.lightningVertexShader = lightningVertexShader;
Effect.ShadersStore.lightningFragmentShader = lightningFragmentShader;
Effect.ShadersStore.globeVertexShader = globeVertexShader;
Effect.ShadersStore.globeFragmentShader = globeFragmentShader;
Effect.ShadersStore.hypercaneVertexShader = hypercaneVertexShader;
Effect.ShadersStore.hypercaneFragmentShader = hypercaneFragmentShader;

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
		const stormMat = new ShaderMaterial("storm-mat", scene, "storm", {
			attributes: ["position", "normal", "uv"],
			uniforms: ["worldViewProjection", "world", "uTime", "uColor1", "uColor2"],
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
			"lightning",
			{
				attributes: ["position", "uv"],
				uniforms: [
					"worldViewProjection",
					"uTime",
					"uFlash",
					"uBoltStart",
					"uBoltEnd",
				],
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
		const globeMat = new ShaderMaterial("globe-mat", scene, "globe", {
			attributes: ["position", "normal", "uv"],
			uniforms: ["worldViewProjection", "world", "uTime", "uGrowth"],
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
			"hypercane",
			{
				attributes: ["position", "normal", "uv"],
				uniforms: ["worldViewProjection", "world", "uTime"],
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
