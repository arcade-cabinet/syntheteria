/**
 * InputHandler — mouse-first input for the BabylonJS game scene.
 *
 * Registers pointer observers on the BabylonJS scene and bridges them
 * to ECS selection/movement logic in src/input/selection.ts.
 *
 * Left click on unit        → select
 * Left click on terrain     → move selected unit(s) to ground point
 * Left click on enemy       → attack (move toward enemy for now)
 * Left click on nothing     → deselect
 * Left drag (>5px)          → box selection
 *
 * Returns a dispose function to remove the observer on cleanup.
 */

import {
	PointerEventTypes,
	type PointerInfo,
} from "@babylonjs/core/Events/pointerEvents";
import type { Scene } from "@babylonjs/core/scene";
import type { Entity } from "koota";
import { playSfx } from "../audio";
import { EntityId, Faction, Position, Unit } from "../ecs/traits";
import { world } from "../ecs/world";
import {
	boxSelect,
	deselectAll,
	getSelectedEntities,
	issueMoveTo,
	selectEntity,
} from "../input/selection";
import { getBaseEntityFromMesh } from "./BaseMarker";
import { type EntityRendererState, getEntityAtPoint } from "./EntityRenderer";
import { showMoveMarker } from "./MoveMarker";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Pixel threshold to distinguish click from drag. */
const DRAG_THRESHOLD = 5;

// ─── Entity lookup ──────────────────────────────────────────────────────────

/**
 * Find a Koota entity by its EntityId string value.
 * Returns null if no entity with that ID exists.
 */
function findEntityByIdString(entityIdStr: string): Entity | null {
	for (const entity of world.query(EntityId)) {
		if (entity.get(EntityId)!.value === entityIdStr) {
			return entity;
		}
	}
	return null;
}

/**
 * Check whether an entity belongs to an enemy faction.
 */
function isEnemy(entity: Entity): boolean {
	if (!entity.has(Faction)) return false;
	const faction = entity.get(Faction)!.value;
	return faction !== "player";
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Register pointer observers on the BabylonJS scene for click-to-select,
 * click-to-move, click-to-attack, and box selection.
 *
 * @param scene - The BabylonJS scene to attach input to.
 * @param getEntityState - Getter for the EntityRendererState (may not be ready immediately).
 * @returns A dispose function that removes the pointer observer.
 */
export function initInput(
	scene: Scene,
	getEntityState: () => EntityRendererState | null,
): () => void {
	// Track pointer-down position for click vs drag detection
	let pointerDownX = 0;
	let pointerDownY = 0;
	let isPointerDown = false;

	// ── Box selection DOM overlay ──
	let selectionBox: HTMLDivElement | null = null;

	function showSelectionBox(x1: number, y1: number, x2: number, y2: number) {
		if (!selectionBox) {
			selectionBox = document.createElement("div");
			selectionBox.style.cssText =
				"position:fixed;border:1px solid rgba(0,200,255,0.6);background:rgba(0,200,255,0.1);pointer-events:none;z-index:50;";
			document.body.appendChild(selectionBox);
		}
		const left = Math.min(x1, x2);
		const top = Math.min(y1, y2);
		const width = Math.abs(x2 - x1);
		const height = Math.abs(y2 - y1);
		selectionBox.style.left = `${left}px`;
		selectionBox.style.top = `${top}px`;
		selectionBox.style.width = `${width}px`;
		selectionBox.style.height = `${height}px`;
	}

	function hideSelectionBox() {
		if (selectionBox) {
			selectionBox.remove();
			selectionBox = null;
		}
	}

	const observer = scene.onPointerObservable.add((info: PointerInfo) => {
		// Only handle left mouse button (button 0)
		if (
			info.event.button !== 0 &&
			info.type !== PointerEventTypes.POINTERMOVE
		) {
			return;
		}

		switch (info.type) {
			case PointerEventTypes.POINTERDOWN: {
				if (info.event.button !== 0) return;
				pointerDownX = info.event.offsetX;
				pointerDownY = info.event.offsetY;
				isPointerDown = true;
				break;
			}

			case PointerEventTypes.POINTERMOVE: {
				if (!isPointerDown) return;
				const moveX = info.event.offsetX;
				const moveY = info.event.offsetY;
				const dx = moveX - pointerDownX;
				const dy = moveY - pointerDownY;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist > DRAG_THRESHOLD) {
					showSelectionBox(pointerDownX, pointerDownY, moveX, moveY);
				}
				break;
			}

			case PointerEventTypes.POINTERUP: {
				if (!isPointerDown) return;
				isPointerDown = false;
				hideSelectionBox();

				const upX = info.event.offsetX;
				const upY = info.event.offsetY;
				const dx = upX - pointerDownX;
				const dy = upY - pointerDownY;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist > DRAG_THRESHOLD) {
					// ── Box selection ──
					handleBoxSelect(scene, pointerDownX, pointerDownY, upX, upY);
				} else {
					// ── Click ──
					handleClick(scene, upX, upY, getEntityState);
				}
				break;
			}
		}
	});

	// Return cleanup function
	return () => {
		scene.onPointerObservable.remove(observer);
		hideSelectionBox();
	};
}

// ─── Click handler ──────────────────────────────────────────────────────────

function handleClick(
	scene: Scene,
	screenX: number,
	screenY: number,
	getEntityState: () => EntityRendererState | null,
): void {
	const entityState = getEntityState();

	// Try entity pick first (if renderer is ready)
	if (entityState) {
		const hitEntityId = getEntityAtPoint(entityState, scene, screenX, screenY);

		if (hitEntityId) {
			const entity = findEntityByIdString(hitEntityId);
			if (entity) {
				if (isEnemy(entity)) {
					// Clicked on an enemy — attack (move toward it for now)
					handleAttack(entity);
				} else {
					// Clicked on a friendly entity — select it
					selectEntity(entity);
					playSfx("unit_select");
				}
				return;
			}
		}
	}

	// Check if we clicked on a base marker
	{
		const pickResult = scene.pick(screenX, screenY);
		if (pickResult?.hit && pickResult.pickedMesh && entityState) {
			const baseEntityId = getBaseEntityFromMesh(
				entityState.baseMarkers,
				pickResult.pickedMesh.metadata,
			);
			if (baseEntityId) {
				// Dynamically import to avoid circular dependency
				import("../components/base/BasePanel")
					.then(({ selectBase }) => {
						selectBase(baseEntityId);
					})
					.catch(() => {
						// Non-fatal: base panel just won't open
						console.warn(
							"[InputHandler] Failed to import BasePanel for base click",
						);
					});
				return;
			}
		}
	}

	// No entity hit — try terrain pick for move command
	const selected = getSelectedEntities();
	if (selected.length > 0) {
		const pickResult = scene.pick(screenX, screenY);
		if (pickResult?.hit && pickResult.pickedPoint) {
			const worldX = pickResult.pickedPoint.x;
			const worldZ = pickResult.pickedPoint.z;

			// Issue move command to all selected units
			for (const entity of selected) {
				if (entity.has(Unit)) {
					issueMoveTo(entity, worldX, worldZ);
				}
			}

			// Show destination marker and play move SFX
			showMoveMarker(scene, worldX, worldZ);
			playSfx("unit_move");
			return;
		}
	}

	// Clicked on nothing — deselect all
	deselectAll();
}

// ─── Attack handler ─────────────────────────────────────────────────────────

/**
 * Handle attack command: move all selected units toward the enemy.
 * Actual combat damage is handled by the proximity-based combat system (Task 11).
 */
function handleAttack(targetEntity: Entity): void {
	const selected = getSelectedEntities();
	if (selected.length === 0) return;

	// Get the enemy's position
	if (!targetEntity.has(Position)) return;
	const targetPos = targetEntity.get(Position)!;

	// Move each selected player unit toward the enemy
	for (const entity of selected) {
		if (entity.has(Unit)) {
			issueMoveTo(entity, targetPos.x, targetPos.z);
		}
	}
}

// ─── Box selection handler ──────────────────────────────────────────────────

/**
 * Convert two screen corners to world ground positions and call boxSelect().
 */
function handleBoxSelect(
	scene: Scene,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): void {
	const pick1 = scene.pick(x1, y1);
	const pick2 = scene.pick(x2, y2);

	if (pick1?.hit && pick1.pickedPoint && pick2?.hit && pick2.pickedPoint) {
		boxSelect(
			pick1.pickedPoint.x,
			pick1.pickedPoint.z,
			pick2.pickedPoint.x,
			pick2.pickedPoint.z,
		);
	}
}
