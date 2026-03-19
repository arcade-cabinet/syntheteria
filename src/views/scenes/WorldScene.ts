/**
 * WorldScene — Scene3D for the isometric game board.
 *
 * This is the main Phaser scene that renders terrain, units, buildings,
 * fog of war, and handles camera/input. Uses enable3d's Scene3D for
 * Three.js integration.
 *
 * Pattern from poc-roboforming.html — proven working.
 */

import { Scene3D } from "@enable3d/phaser-extension";
import * as THREE from "three";
import type { GameBoardConfig } from "../createGame";
import { EventBus } from "../eventBus";
import { setupWorldLighting } from "../lighting/worldLighting";

export class WorldScene extends Scene3D {
	private _camTarget = new THREE.Vector3();
	private _camOffset = new THREE.Vector3();
	private _zoomLevel = 30;
	private _rotAngle = Math.PI / 4;
	private _isDragging = false;
	private _dragPrev = { x: 0, y: 0 };

	constructor() {
		super({ key: "WorldScene" });
	}

	init(): void {
		this.accessThirdDimension({ maxSubSteps: 1, fixedTimeStep: 1 / 60 });
	}

	create(): void {
		// Disable default enable3d ground and orbit controls
		this.third.warpSpeed("-ground", "-orbitControls");

		const scene = this.third.scene;
		scene.background = new THREE.Color(0x050a0f);

		// Lighting from POC recipe
		setupWorldLighting(scene);

		// Orthographic isometric camera
		this.setupCamera();

		// Input: drag-pan, scroll-zoom
		this.setupInput();

		// Read board config from registry
		const config = this.registry.get("boardConfig") as
			| GameBoardConfig
			| undefined;
		if (config) {
			this.buildTerrain(config);
		}

		// Notify React that the scene is ready
		EventBus.emit("scene-ready", this);
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

		// Initial isometric position
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
		this._camOffset = cam.position.clone().sub(this._camTarget);
	}

	private updateCamera(): void {
		const cam = this.third.camera;
		if (!cam || !("isOrthographicCamera" in cam)) return;
		const orthoCam = cam as THREE.OrthographicCamera;

		// WASD rotation/zoom
		if (this.input.keyboard) {
			const left = this.input.keyboard.addKey("A");
			const right = this.input.keyboard.addKey("D");
			const zoomIn = this.input.keyboard.addKey("W");
			const zoomOut = this.input.keyboard.addKey("S");
			if (left.isDown) this._rotAngle += 0.015;
			if (right.isDown) this._rotAngle -= 0.015;
			if (zoomIn.isDown)
				this._zoomLevel = Math.max(10, this._zoomLevel - 0.5);
			if (zoomOut.isDown)
				this._zoomLevel = Math.min(60, this._zoomLevel + 0.5);
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
			this._camTarget.x +
				dist * Math.cos(tilt) * Math.sin(this._rotAngle),
			dist * Math.sin(tilt),
			this._camTarget.z +
				dist * Math.cos(tilt) * Math.cos(this._rotAngle),
		);
		orthoCam.lookAt(this._camTarget);
	}

	// ---- Input ----

	private setupInput(): void {
		// Drag to pan
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

		// Scroll to zoom
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

	// ---- Terrain ----

	private buildTerrain(_config: GameBoardConfig): void {
		// TODO: Build vertex-colored terrain mesh from board data
		// For now, placeholder grid to verify the pipeline works
		const gridHelper = new THREE.GridHelper(60, 30, 0x004444, 0x002222);
		this.third.scene.add(gridHelper);
	}

	// ---- Update Loop ----

	update(_time: number, _delta: number): void {
		this.updateCamera();
	}
}
