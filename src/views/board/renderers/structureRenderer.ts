/**
 * structureRenderer — legacy Phaser board structures (walls, columns, GLBs).
 *
 * Structural edge rendering was removed with the labyrinth/depth systems.
 * `createStructureRenderer` is a no-op until title/board migration completes.
 */

import type { World } from "koota";
import type { Scene } from "three";
import type { GeneratedBoard } from "../../../board";

export function createStructureRenderer(
	_scene: Scene,
	_world: World,
	_board: GeneratedBoard,
): void {
	// Labyrinth wall/column placement removed — no structural edges to render.
}

export function updateStructures(_world: World, _board: GeneratedBoard): void {
	// No-op: structures were static labyrinth geometry.
}
