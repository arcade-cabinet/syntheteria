/**
 * boardInput — click-to-select and click-to-move via raycasting.
 *
 * Creates an invisible click plane and uses THREE.Raycaster to convert
 * pointer events into tile grid coordinates. Emits "tile-clicked" via
 * the views EventBus.
 *
 * Selection ring: a magenta ring mesh positioned at the clicked tile.
 */

import * as THREE from "three";
import { EventBus } from "../eventBus";
import { TILE_SIZE } from "../renderers/terrainRenderer";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let selectionRing: THREE.Mesh<
	THREE.RingGeometry,
	THREE.MeshBasicMaterial
> | null = null;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Drag detection threshold (pixels)
const DRAG_THRESHOLD = 6;
let pointerDownX = 0;
let pointerDownY = 0;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/**
 * Wire up raycasting-based tile picking and selection ring.
 *
 * @param phaserScene  Phaser.Scene that owns the pointer events
 * @param thirdScene   THREE.Scene where the click plane and ring live
 * @param camera       THREE.Camera used for raycasting
 * @param boardWidth   Board width in tiles
 * @param boardHeight  Board height in tiles
 */
export function setupBoardInput(
	phaserScene: Phaser.Scene,
	thirdScene: THREE.Scene,
	camera: THREE.Camera,
	boardWidth: number,
	boardHeight: number,
): void {
	// Invisible click plane at y = 0.1 — covers the full board
	const planeGeo = new THREE.PlaneGeometry(
		boardWidth * TILE_SIZE * 2,
		boardHeight * TILE_SIZE * 2,
	);
	planeGeo.rotateX(-Math.PI / 2);
	const planeMat = new THREE.MeshBasicMaterial({
		visible: false,
		side: THREE.DoubleSide,
	});
	const clickPlane = new THREE.Mesh(planeGeo, planeMat);
	clickPlane.position.set(
		(boardWidth * TILE_SIZE) / 2,
		0.1,
		(boardHeight * TILE_SIZE) / 2,
	);
	thirdScene.add(clickPlane);

	// Selection ring — magenta torus-like ring lying flat on the ground
	const ringGeo = new THREE.RingGeometry(0.7, 0.95, 24);
	ringGeo.rotateX(-Math.PI / 2);
	const ringMat = new THREE.MeshBasicMaterial({
		color: 0xff00ff,
		transparent: true,
		opacity: 0.8,
		depthWrite: false,
		side: THREE.DoubleSide,
	});
	selectionRing = new THREE.Mesh(ringGeo, ringMat);
	selectionRing.position.y = 0.15;
	selectionRing.visible = false;
	thirdScene.add(selectionRing);

	// --- Pointer events ---
	const canvas = phaserScene.game.canvas;

	const onPointerDown = (e: PointerEvent): void => {
		pointerDownX = e.clientX;
		pointerDownY = e.clientY;
	};

	const onPointerUp = (e: PointerEvent): void => {
		// Ignore drags
		const dx = e.clientX - pointerDownX;
		const dy = e.clientY - pointerDownY;
		if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) return;

		// Normalise pointer position to -1..1
		const rect = canvas.getBoundingClientRect();
		pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
		pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

		raycaster.setFromCamera(pointer, camera);
		const hits = raycaster.intersectObject(clickPlane);

		if (hits.length > 0) {
			const p = hits[0].point;
			const tileX = Math.floor(p.x / TILE_SIZE);
			const tileZ = Math.floor(p.z / TILE_SIZE);

			// Clamp to board bounds
			if (
				tileX >= 0 &&
				tileX < boardWidth &&
				tileZ >= 0 &&
				tileZ < boardHeight
			) {
				moveSelectionRing(tileX, tileZ);
				EventBus.emit("tile-clicked", tileX, tileZ);
			}
		}
	};

	canvas.addEventListener("pointerdown", onPointerDown);
	canvas.addEventListener("pointerup", onPointerUp);
}

// ---------------------------------------------------------------------------
// Selection ring control
// ---------------------------------------------------------------------------

/** Move the selection ring to the given tile coordinates. */
export function moveSelectionRing(x: number, z: number): void {
	if (!selectionRing) return;
	selectionRing.position.x = x * TILE_SIZE + TILE_SIZE / 2;
	selectionRing.position.z = z * TILE_SIZE + TILE_SIZE / 2;
	selectionRing.visible = true;
}

/** Hide the selection ring. */
export function hideSelectionRing(): void {
	if (!selectionRing) return;
	selectionRing.visible = false;
}
