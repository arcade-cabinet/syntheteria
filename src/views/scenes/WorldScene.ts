/**
 * WorldScene — Scene3D for the isometric game board.
 *
 * Orchestrates all Phaser renderers: terrain, units, buildings, salvage,
 * structures, fog, highlights, territory, particles.
 * Handles camera (ortho isometric) and input (drag-pan, scroll-zoom, WASD).
 *
 * Pattern from poc-roboforming.html — proven working.
 * NO React — pure Phaser/Three.js.
 */

import { Scene3D } from "@enable3d/phaser-extension";
import * as THREE from "three";
import type { CameraControls } from "../../camera";
import { registerCameraControls, unregisterCameraControls } from "../../camera";
import { type GameBoardConfig, getBoardConfig } from "../createGame";
import { EventBus } from "../eventBus";
import { setupBoardInput } from "../input/boardInput";
import { setupWorldLighting } from "../lighting/worldLighting";
import { createBuildingRenderer } from "../renderers/buildingRenderer";
import {
	createCombatEffects,
	updateCombatEffects,
} from "../renderers/combatEffects";
import { createFogRenderer, updateFog } from "../renderers/fogRenderer";
import { createHighlightRenderer } from "../renderers/highlightRenderer";
import {
	createParticleRenderer,
	updateParticles,
} from "../renderers/particleRenderer";
import { createSalvageRenderer } from "../renderers/salvageRenderer";
import {
	createSpeechRenderer,
	updateSpeech,
} from "../renderers/speechRenderer";
import { createStructureRenderer } from "../renderers/structureRenderer";
import { buildTerrainMesh, TILE_SIZE } from "../renderers/terrainRenderer";
import {
	createTerritoryRenderer,
	updateTerritory,
} from "../renderers/territoryRenderer";
import { createUnitRenderer, updateUnits } from "../renderers/unitRenderer";

export class WorldScene extends Scene3D {
	private _camTarget = new THREE.Vector3();
	private _zoomLevel = 30;
	private _rotAngle = Math.PI / 4;
	private _isDragging = false;
	private _dragPrev = { x: 0, y: 0 };
	private _config: GameBoardConfig | null = null;

	constructor() {
		super({ key: "WorldScene" });
	}

	init(): void {
		this.accessThirdDimension({ usePhysics: false });
	}

	create(): void {
		this.third.warpSpeed("-ground", "-orbitControls");

		// Override enable3d's deprecated PCFSoftShadowMap default
		this.third.renderer.shadowMap.type = THREE.PCFShadowMap;

		const scene = this.third.scene;
		scene.background = new THREE.Color(0x050a0f);

		setupWorldLighting(scene);
		this.setupCamera();
		this.setupInput();

		const config = getBoardConfig();

		if (config) {
			this._config = config;
			const { world, board, boardConfig } = config;

			// Terrain
			const terrainGroup = buildTerrainMesh(board);
			scene.add(terrainGroup);

			// Center camera
			const centerX = (boardConfig.width * TILE_SIZE) / 2;
			const centerZ = (boardConfig.height * TILE_SIZE) / 2;
			this._camTarget.set(centerX, 0, centerZ);

			// Units, buildings, salvage, structures
			createUnitRenderer(scene, world);
			createBuildingRenderer(scene, world);
			createSalvageRenderer(scene, world);
			createStructureRenderer(scene, world, board);

			// Fog of war
			createFogRenderer(scene, world);

			// Overlays
			createHighlightRenderer(scene);
			createTerritoryRenderer(scene);
			updateTerritory(world, boardConfig.width, boardConfig.height);

			// Particles
			createParticleRenderer(scene);

			// Combat effects (floating damage numbers, hit flash)
			createCombatEffects(scene);

			// Speech bubbles above units
			createSpeechRenderer(scene);

			// Board input (raycasting, selection ring)
			setupBoardInput(
				this,
				scene,
				this.third.camera,
				boardConfig.width,
				boardConfig.height,
			);
		}

		// Register camera controls so App.tsx, Minimap, keyboard shortcuts
		// can call panTo/setZoom without knowing about Phaser
		this.registerCameraControls();

		// Listen for turn-advanced events from React
		EventBus.on("turn-advanced", () => this.onTurnAdvanced());

		EventBus.emit("scene-ready", this);
	}

	shutdown(): void {
		unregisterCameraControls();
		EventBus.off("turn-advanced");
	}

	private registerCameraControls(): void {
		const self = this;
		const controls: CameraControls = {
			panTo(x: number, z: number) {
				// Convert from old TILE_SIZE_M coords to new TILE_SIZE coords
				self._camTarget.x = x;
				self._camTarget.z = z;
			},
			snapTo(x: number, z: number) {
				self._camTarget.x = x;
				self._camTarget.z = z;
			},
			setZoom(distance: number) {
				self._zoomLevel = Math.max(10, Math.min(60, distance));
			},
			reset(centerX: number, centerZ: number) {
				self._camTarget.set(centerX, 0, centerZ);
				self._zoomLevel = 30;
				self._rotAngle = Math.PI / 4;
			},
		};
		registerCameraControls(controls);
	}

	private onTurnAdvanced(): void {
		if (!this._config) return;
		const { world, boardConfig } = this._config;
		// Re-sync all renderers with updated ECS state
		updateFog(world);
		updateTerritory(world, boardConfig.width, boardConfig.height);
		// Units and buildings sync in update() loop already
	}

	// ---- Camera ----

	private setupCamera(): void {
		const aspect = this.scale.width / this.scale.height;
		const cam = new THREE.OrthographicCamera(
			-this._zoomLevel * aspect,
			this._zoomLevel * aspect,
			this._zoomLevel,
			-this._zoomLevel,
			0.1,
			500,
		);

		const dist = 80;
		const tilt = Math.PI / 5.2;
		cam.position.set(
			dist * Math.cos(tilt) * Math.sin(this._rotAngle),
			dist * Math.sin(tilt),
			dist * Math.cos(tilt) * Math.cos(this._rotAngle),
		);
		cam.lookAt(0, 0, 0);
		cam.updateProjectionMatrix();

		this.third.camera = cam;
	}

	private updateCamera(): void {
		const cam = this.third.camera;
		if (!cam || !("isOrthographicCamera" in cam)) return;
		const orthoCam = cam as THREE.OrthographicCamera;

		if (this.input.keyboard) {
			const left = this.input.keyboard.addKey("A");
			const right = this.input.keyboard.addKey("D");
			const zoomIn = this.input.keyboard.addKey("W");
			const zoomOut = this.input.keyboard.addKey("S");
			if (left.isDown) this._rotAngle += 0.015;
			if (right.isDown) this._rotAngle -= 0.015;
			if (zoomIn.isDown) this._zoomLevel = Math.max(10, this._zoomLevel - 0.5);
			if (zoomOut.isDown) this._zoomLevel = Math.min(60, this._zoomLevel + 0.5);
		}

		const aspect = this.scale.width / this.scale.height;
		orthoCam.left = -this._zoomLevel * aspect;
		orthoCam.right = this._zoomLevel * aspect;
		orthoCam.top = this._zoomLevel;
		orthoCam.bottom = -this._zoomLevel;
		orthoCam.updateProjectionMatrix();

		const dist = 80;
		const tilt = Math.PI / 5.2;
		orthoCam.position.set(
			this._camTarget.x + dist * Math.cos(tilt) * Math.sin(this._rotAngle),
			dist * Math.sin(tilt),
			this._camTarget.z + dist * Math.cos(tilt) * Math.cos(this._rotAngle),
		);
		orthoCam.lookAt(this._camTarget);
	}

	// ---- Input ----

	private setupInput(): void {
		this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
			this._isDragging = true;
			this._dragPrev.x = pointer.x;
			this._dragPrev.y = pointer.y;
		});

		this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
			if (!this._isDragging || !pointer.isDown) return;
			const dx = pointer.x - this._dragPrev.x;
			const dy = pointer.y - this._dragPrev.y;
			const panSpeed = 0.08 * (this._zoomLevel / 30);
			this._camTarget.x -= dx * panSpeed;
			this._camTarget.z -= dy * panSpeed;
			this._dragPrev.x = pointer.x;
			this._dragPrev.y = pointer.y;
		});

		this.input.on("pointerup", () => {
			this._isDragging = false;
		});

		this.input.on(
			"wheel",
			(
				_pointer: Phaser.Input.Pointer,
				_gameObjects: Phaser.GameObjects.GameObject[],
				_deltaX: number,
				deltaY: number,
			) => {
				this._zoomLevel = Math.max(
					10,
					Math.min(60, this._zoomLevel + deltaY * 0.02),
				);
			},
		);
	}

	// ---- Update Loop ----

	update(time: number, delta: number): void {
		this.updateCamera();

		if (this._config) {
			updateUnits(this._config.world, time, this.third.scene);
			updateFog(this._config.world);
			updateParticles(delta);
			updateCombatEffects(this._config.world, delta);
			updateSpeech(this._config.world, delta);
		}
	}
}
