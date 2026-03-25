/**
 * GlobeScene — BabylonJS storm globe for the landing page.
 *
 * Renders a slowly rotating ecumenopolis globe with storm atmosphere,
 * lightning bolts, and hypercane spiral via Reactylon Engine+Scene.
 * Purely decorative — no interactivity, no input, no game state.
 */

import { useEffect } from "react";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Effect } from "@babylonjs/core/Materials/effect";
import { Constants } from "@babylonjs/core/Engines/constants";
import { Tools } from "@babylonjs/core/Misc/tools";
import type { Scene as BScene } from "@babylonjs/core";
import { Engine } from "reactylon/web";
import { Scene, useScene } from "reactylon";
import {
	stormVertexShader,
	stormFragmentShader,
	lightningVertexShader,
	lightningFragmentShader,
	globeVertexShader,
	globeFragmentShader,
	hypercaneVertexShader,
	hypercaneFragmentShader,
} from "./title/shaders";

// ─── Register all shaders in BabylonJS Effect store ─────────────────────────

Effect.ShadersStore["stormVertexShader"] = stormVertexShader;
Effect.ShadersStore["stormFragmentShader"] = stormFragmentShader;
Effect.ShadersStore["lightningVertexShader"] = lightningVertexShader;
Effect.ShadersStore["lightningFragmentShader"] = lightningFragmentShader;
Effect.ShadersStore["globeVertexShader"] = globeVertexShader;
Effect.ShadersStore["globeFragmentShader"] = globeFragmentShader;
Effect.ShadersStore["hypercaneVertexShader"] = hypercaneVertexShader;
Effect.ShadersStore["hypercaneFragmentShader"] = hypercaneFragmentShader;

// ─── Scene setup ─────────────────────────────────────────────────────────────

function onSceneReady(scene: BScene) {
	scene.clearColor = new Color4(0.01, 0.01, 0.03, 1);
}

// ─── Inner scene content ─────────────────────────────────────────────────────

function GlobeSceneContent() {
	const scene = useScene();

	useEffect(() => {
		// Camera — fixed viewpoint, matching the old R3F setup
		const camera = new FreeCamera("landing-cam", new Vector3(0, 0, 10), scene);
		camera.fov = Tools.ToRadians(45);
		camera.minZ = 0.1;
		camera.maxZ = 100;
		// Disable all camera input — this is a decorative background
		camera.inputs.clear();

		// ─── Storm Clouds sphere (BackSide, radius 8 → diameter 16) ──────

		const stormSphere = MeshBuilder.CreateSphere(
			"storm",
			{ diameter: 16, segments: 64 },
			scene,
		);
		const stormMat = new ShaderMaterial(
			"stormMat",
			scene,
			{ vertex: "storm", fragment: "storm" },
			{
				attributes: ["position", "normal", "uv"],
				uniforms: [
					"worldViewProjection",
					"world",
					"uTime",
					"uColor1",
					"uColor2",
				],
			},
		);
		stormMat.backFaceCulling = false;
		stormMat.alpha = 0.85;
		stormMat.alphaMode = Constants.ALPHA_COMBINE;
		stormMat.setColor3("uColor1", new Color3(0.02, 0.03, 0.07));
		stormMat.setColor3("uColor2", new Color3(0.04, 0.08, 0.16));
		stormSphere.material = stormMat;

		// ─── Globe with Ecumenopolis (radius 2.5 → diameter 5) ───────────

		const globeSphere = MeshBuilder.CreateSphere(
			"globe",
			{ diameter: 5, segments: 64 },
			scene,
		);
		const globeMat = new ShaderMaterial(
			"globeMat",
			scene,
			{ vertex: "globe", fragment: "globe" },
			{
				attributes: ["position", "normal", "uv"],
				uniforms: ["worldViewProjection", "world", "uTime", "uGrowth"],
			},
		);
		globeMat.setFloat("uGrowth", 0.3);
		globeSphere.material = globeMat;

		// ─── Lightning plane (15x15, at z=2, additive) ───────────────────

		const lightningPlane = MeshBuilder.CreatePlane(
			"lightning",
			{ width: 15, height: 15 },
			scene,
		);
		lightningPlane.position.z = 2;
		const lightningMat = new ShaderMaterial(
			"lightningMat",
			scene,
			{ vertex: "lightning", fragment: "lightning" },
			{
				attributes: ["position", "normal", "uv"],
				uniforms: [
					"worldViewProjection",
					"uTime",
					"uFlash",
					"uBoltStart",
					"uBoltEnd",
				],
			},
		);
		lightningMat.alpha = 0.99; // enable alpha pipeline
		lightningMat.alphaMode = Constants.ALPHA_ADD;
		lightningMat.backFaceCulling = false;
		lightningMat.setFloat("uFlash", 0);
		lightningMat.setVector2("uBoltStart", { x: 0, y: 0.8 });
		lightningMat.setVector2("uBoltEnd", { x: 0, y: -0.8 });
		lightningPlane.material = lightningMat;

		// ─── Hypercane cylinder ──────────────────────────────────────────
		// Three.js CylinderGeometry(1, 1.5, 2, 64, 32, true) uses RADIUS
		// BabylonJS CreateCylinder uses DIAMETER, so multiply by 2
		// The mesh was also scaled by (3, 0.5, 3) in the R3F component.

		const hypercaneCylinder = MeshBuilder.CreateCylinder(
			"hypercane",
			{
				diameterTop: 2, // radiusTop 1 * 2
				diameterBottom: 3, // radiusBottom 1.5 * 2
				height: 2,
				tessellation: 64,
				subdivisions: 32,
			},
			scene,
		);
		hypercaneCylinder.scaling.set(3, 0.5, 3);
		const hypercaneMat = new ShaderMaterial(
			"hypercaneMat",
			scene,
			{ vertex: "hypercane", fragment: "hypercane" },
			{
				attributes: ["position", "normal", "uv"],
				uniforms: ["worldViewProjection", "world", "uTime"],
			},
		);
		hypercaneMat.backFaceCulling = false;
		hypercaneMat.alpha = 0.99;
		hypercaneMat.alphaMode = Constants.ALPHA_ADD;
		hypercaneCylinder.material = hypercaneMat;

		// ─── Animation loop ──────────────────────────────────────────────

		let flashIntensity = 0;
		let boltStartX = 0;
		let boltStartY = 0.8;
		let boltEndX = 0;
		let boltEndY = -0.8;
		const startTime = performance.now();
		let growthValue = 0.3;

		const renderCallback = () => {
			const time = (performance.now() - startTime) / 1000;

			// Storm clouds
			stormMat.setFloat("uTime", time);
			stormSphere.rotation.y = time * 0.02;

			// Globe
			globeMat.setFloat("uTime", time);
			growthValue = Math.min(0.5, 0.3 + time * 0.0017);
			globeMat.setFloat("uGrowth", growthValue);
			globeSphere.rotation.y = time * 0.1;

			// Lightning flashes — ~3% chance per frame
			if (Math.random() > 0.97) {
				flashIntensity = 1;
				const angle = Math.random() * Math.PI * 2;
				const radius = 0.6 + Math.random() * 0.3;
				boltStartX = Math.cos(angle) * radius;
				boltStartY = Math.sin(angle) * radius;
				boltEndX = Math.cos(angle + Math.PI) * (radius * 0.3);
				boltEndY = Math.sin(angle + Math.PI) * (radius * 0.3);
			} else {
				flashIntensity *= 0.85;
			}
			lightningMat.setFloat("uTime", time);
			lightningMat.setFloat("uFlash", flashIntensity);
			lightningMat.setVector2("uBoltStart", {
				x: boltStartX,
				y: boltStartY,
			});
			lightningMat.setVector2("uBoltEnd", { x: boltEndX, y: boltEndY });

			// Hypercane
			hypercaneMat.setFloat("uTime", time);
			hypercaneCylinder.rotation.y = time * 0.3;
		};

		scene.registerBeforeRender(renderCallback);

		return () => {
			scene.unregisterBeforeRender(renderCallback);
			stormSphere.dispose();
			stormMat.dispose();
			globeSphere.dispose();
			globeMat.dispose();
			lightningPlane.dispose();
			lightningMat.dispose();
			hypercaneCylinder.dispose();
			hypercaneMat.dispose();
			camera.dispose();
		};
	}, [scene]);

	return null;
}

// ─── Public Component ────────────────────────────────────────────────────────

/**
 * Full-screen BabylonJS canvas showing the storm globe.
 * Position behind the LandingScreen DOM overlay with a lower z-index.
 */
export function GlobeScene() {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 100,
			}}
		>
			<Engine>
				<Scene onSceneReady={onSceneReady}>
					<GlobeSceneContent />
				</Scene>
			</Engine>
		</div>
	);
}
