/**
 * InteractionSystem — connects selection state to the radial action menu
 * and dispatches action callbacks to the appropriate core loop systems.
 *
 * Listens to onSelectionChange from selectionState, looks up entity traits,
 * fetches available actions from the actionRegistry, and shows/hides
 * the RadialActionMenu. When the player picks an action, the corresponding
 * system function is called (harvest, grab, drop, place, etc.).
 */

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { onSelectionChange } from "../input/selectionState";
import type { RadialAction } from "../ui/RadialActionMenu";
import { getActionsForEntity } from "./actionRegistry";
import { getOccupiedSlots, placeCube } from "./cubePlacement";
import { getPlacementPreview, placeHeldCube } from "./cubeStacking";
import { getAllFurnaces, insertCubeIntoFurnace } from "./furnace";
import { dropCube, getCube, getHeldCube, grabCube, throwCube } from "./grabber";
import { startHarvesting } from "./harvesting";
import { getDeposit } from "./oreSpawner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MenuState {
	visible: boolean;
	actions: RadialAction[];
	entityId: string | null;
	entityTraits: string[];
	position: { x: number; y: number };
}

// ---------------------------------------------------------------------------
// Trait resolution helpers
// ---------------------------------------------------------------------------

/** Resolve entity traits from its ID by checking all system registries. */
function resolveEntityTraits(entityId: string): string[] {
	const traits: string[] = [];

	// Check ore deposits
	const deposit = getDeposit(entityId);
	if (deposit) {
		traits.push("OreDeposit");
		return traits;
	}

	// Check furnaces
	const furnaces = getAllFurnaces();
	for (const f of furnaces) {
		if (f.id === entityId) {
			traits.push("Furnace", "Hopper");
			return traits;
		}
	}

	// Check cubes in grabber registry
	const cube = getCube(entityId);
	if (cube) {
		traits.push("MaterialCube");
		for (const t of cube.traits) {
			if (!traits.includes(t)) {
				traits.push(t);
			}
		}
		return traits;
	}

	return traits;
}

// ---------------------------------------------------------------------------
// Temp vectors
// ---------------------------------------------------------------------------

const _playerPos = new THREE.Vector3();
const _playerDir = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Exported state for external consumption
// ---------------------------------------------------------------------------

let menuState: MenuState = {
	visible: false,
	actions: [],
	entityId: null,
	entityTraits: [],
	position: { x: 0, y: 0 },
};

const menuListeners = new Set<() => void>();

/** Get the current menu state. */
export function getMenuState(): MenuState {
	return menuState;
}

/** Subscribe to menu state changes. Returns unsubscribe function. */
export function subscribeMenu(callback: () => void): () => void {
	menuListeners.add(callback);
	return () => {
		menuListeners.delete(callback);
	};
}

function notifyMenu(): void {
	for (const cb of menuListeners) {
		cb();
	}
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InteractionSystem() {
	const { camera } = useThree();

	useEffect(() => {
		const unsubscribe = onSelectionChange(({ newId }) => {
			if (newId === null) {
				// Clear menu
				menuState = {
					visible: false,
					actions: [],
					entityId: null,
					entityTraits: [],
					position: { x: 0, y: 0 },
				};
				notifyMenu();
				return;
			}

			// Resolve traits for the selected entity
			const traits = resolveEntityTraits(newId);
			if (traits.length === 0) {
				// Unknown entity type — no actions available
				menuState = {
					visible: false,
					actions: [],
					entityId: newId,
					entityTraits: [],
					position: { x: 0, y: 0 },
				};
				notifyMenu();
				return;
			}

			// Get available actions
			const actions = getActionsForEntity(traits);
			if (actions.length === 0) {
				menuState = {
					visible: false,
					actions: [],
					entityId: newId,
					entityTraits: traits,
					position: { x: 0, y: 0 },
				};
				notifyMenu();
				return;
			}

			// Show menu at screen center (crosshair position)
			menuState = {
				visible: true,
				actions,
				entityId: newId,
				entityTraits: traits,
				position: {
					x: window.innerWidth / 2,
					y: window.innerHeight / 2,
				},
			};
			notifyMenu();
		});

		return unsubscribe;
	}, []);

	// Handle action dispatch — called from the HUD layer
	useEffect(() => {
		const handleAction = (e: Event) => {
			const detail = (e as CustomEvent<{ actionId: string }>).detail;
			if (!detail?.actionId || !menuState.entityId) return;

			camera.getWorldPosition(_playerPos);
			camera.getWorldDirection(_playerDir);

			const playerPos = {
				x: _playerPos.x,
				y: _playerPos.y,
				z: _playerPos.z,
			};

			const playerDir = {
				x: _playerDir.x,
				y: _playerDir.y,
				z: _playerDir.z,
			};

			const entityId = menuState.entityId;

			switch (detail.actionId) {
				case "harvest": {
					const deposit = getDeposit(entityId);
					if (deposit) {
						startHarvesting(entityId, playerPos, () => deposit.position);
					}
					break;
				}
				case "grab": {
					grabCube(entityId, playerPos);
					break;
				}
				case "drop": {
					const dropPos = {
						x: _playerPos.x + _playerDir.x * 1.5,
						y: 0.25,
						z: _playerPos.z + _playerDir.z * 1.5,
					};
					dropCube(dropPos);
					break;
				}
				case "throw": {
					throwCube(playerDir, 10);
					break;
				}
				case "insert": {
					// Insert held cube into furnace hopper
					const heldId = getHeldCube();
					if (heldId) {
						const cube = getCube(heldId);
						if (cube) {
							insertCubeIntoFurnace(entityId, heldId, cube.material);
						}
					}
					break;
				}
				case "place": {
					// Place held cube at a grid position
					const occupied = getOccupiedSlots();
					const preview = getPlacementPreview(
						{
							point: {
								x: _playerPos.x + _playerDir.x * 2,
								y: 0,
								z: _playerPos.z + _playerDir.z * 2,
							},
							normal: { x: 0, y: 1, z: 0 },
						},
						occupied,
					);
					if (preview) {
						placeHeldCube(
							preview,
							getHeldCube,
							(pos) => dropCube(pos),
							placeCube,
							getCube,
						);
					}
					break;
				}
				default:
					break;
			}

			// Dismiss menu after action
			menuState = {
				visible: false,
				actions: [],
				entityId: null,
				entityTraits: [],
				position: { x: 0, y: 0 },
			};
			notifyMenu();
		};

		window.addEventListener("coreloop:action", handleAction);
		return () => {
			window.removeEventListener("coreloop:action", handleAction);
		};
	}, [camera]);

	return null;
}
